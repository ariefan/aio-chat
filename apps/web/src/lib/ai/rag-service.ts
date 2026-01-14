import { db } from '@/db'
import {
  knowledgeDocuments,
  documentEmbeddings,
  aiChatSessions,
  aiMessages,
  ragSearchLogs,
  users,
  appSettings,
  KnowledgeDocument,
  DocumentEmbedding
} from '@/db'
import { eq, and, ilike, desc, or, sql } from 'drizzle-orm'
import {
  generateEmbeddings,
  generateChatCompletion,
  cosineSimilarity,
  type RetrievedDocument,
  type ChatMessage,
  type ChatCompletionOptions
} from './openai-client'

/**
 * Get AI model setting from database
 */
async function getAIModel(): Promise<string> {
  try {
    const [modelSetting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'ai.model'))
      .limit(1)

    return modelSetting?.value || 'gpt-4o-mini' // Default fallback
  } catch (error) {
    console.error('Failed to fetch AI model setting:', error)
    return 'gpt-4o-mini' // Fallback to default
  }
}

export interface RAGSearchOptions {
  maxResults?: number
  minRelevanceScore?: number
  documentTypes?: string[]
  categories?: string[]
  includeDrafts?: boolean
}

export interface RAGResult {
  answer: string
  retrievedDocuments: RetrievedDocument[]
  sessionId: string
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
  processingTime: number
  model: string
}

export interface DocumentChunk {
  documentId: string
  chunkIndex: number
  text: string
  embedding: number[]
}

/**
 * Split text into chunks for embedding generation
 */
function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = []

  if (text.length <= maxChunkSize) {
    return [text]
  }

  let start = 0
  while (start < text.length) {
    let end = Math.min(start + maxChunkSize, text.length)

    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastSentenceEnd = Math.max(
        text.lastIndexOf('.', end),
        text.lastIndexOf('!', end),
        text.lastIndexOf('?', end),
        text.lastIndexOf('\n', end)
      )

      if (lastSentenceEnd > start) {
        end = lastSentenceEnd + 1
      }
    }

    chunks.push(text.slice(start, end).trim())

    start = Math.max(end - overlap, start)
  }

  return chunks.filter(chunk => chunk.length > 50) // Filter out very small chunks
}

/**
 * Index a document for RAG search
 */
export async function indexDocument(
  documentId: string,
  content: string,
  regenerateEmbeddings: boolean = false
): Promise<void> {
  try {
    // Check if embeddings already exist
    if (!regenerateEmbeddings) {
      const existingEmbeddings = await db
        .select()
        .from(documentEmbeddings)
        .where(eq(documentEmbeddings.documentId, documentId))
        .limit(1)

      if (existingEmbeddings.length > 0) {
        console.log(`Document ${documentId} already indexed`)
        return
      }
    }

    // Remove existing embeddings if regenerating
    if (regenerateEmbeddings) {
      await db
        .delete(documentEmbeddings)
        .where(eq(documentEmbeddings.documentId, documentId))
    }

    // Split content into chunks
    const chunks = chunkText(content)
    console.log(`Splitting document into ${chunks.length} chunks`)

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map((chunk, index) => chunk)
    const embeddingResults = await generateEmbeddings(chunkTexts)

    // Store embeddings in database
    for (let i = 0; i < chunks.length; i++) {
      const embeddingResult = embeddingResults[i]
      if (!embeddingResult) {
        throw new Error(`Failed to generate embedding for chunk ${i}`)
      }

      await db.insert(documentEmbeddings).values({
        documentId: documentId || '',
        chunkIndex: i,
        chunkText: chunks[i],
        embedding: embeddingResult.embedding,
        embeddingModel: 'text-embedding-3-small',
        tokenCount: embeddingResult.tokenCount,
      } as any)
    }

    console.log(`Successfully indexed document ${documentId} with ${chunks.length} chunks`)
  } catch (error) {
    console.error('Failed to index document:', error)
    throw new Error(`Document indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Search for relevant documents using vector similarity
 */
export async function searchDocuments(
  query: string,
  options: RAGSearchOptions = {}
): Promise<RetrievedDocument[]> {
  const {
    maxResults = 5,
    minRelevanceScore = 0.7,
    documentTypes = [],
    categories = [],
    includeDrafts = false,
  } = options

  const startTime = Date.now()

  try {
    // Generate embedding for the query
    const queryEmbeddingResult = await generateEmbeddings([query])
    const firstResult = queryEmbeddingResult[0]
    if (!firstResult) {
      throw new Error('Failed to generate embedding for query')
    }
    const queryEmbedding = firstResult.embedding

    // Apply filters
    const conditions = []
    if (!includeDrafts) {
      conditions.push(eq(knowledgeDocuments.status, 'published'))
    }
    if (documentTypes.length > 0) {
      conditions.push(sql`${knowledgeDocuments.type} = ANY(${JSON.stringify(documentTypes)})`)
    }
    if (categories.length > 0) {
      conditions.push(sql`${knowledgeDocuments.category} = ANY(${JSON.stringify(categories)})`)
    }

    // Get all document embeddings with filters
    const baseQuery = db
      .select({
        id: documentEmbeddings.id,
        documentId: documentEmbeddings.documentId,
        chunkIndex: documentEmbeddings.chunkIndex,
        chunkText: documentEmbeddings.chunkText,
        embedding: documentEmbeddings.embedding,
        documentTitle: knowledgeDocuments.title,
        documentType: knowledgeDocuments.type,
        documentStatus: knowledgeDocuments.status,
        documentCategory: knowledgeDocuments.category,
        documentMetadata: knowledgeDocuments.metadata,
      })
      .from(documentEmbeddings)
      .leftJoin(knowledgeDocuments, eq(documentEmbeddings.documentId, knowledgeDocuments.id))

    const allEmbeddings = await baseQuery
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    // Calculate similarity scores
    const scoredResults = allEmbeddings.map(embedding => {
      const similarity = cosineSimilarity(queryEmbedding, embedding.embedding as number[])
      return {
        id: embedding.documentId,
        title: embedding.documentTitle || 'Untitled',
        content: embedding.chunkText,
        relevanceScore: similarity,
        metadata: {
          ...(embedding.documentMetadata || {}),
          chunkIndex: embedding.chunkIndex,
          documentType: embedding.documentType,
          documentCategory: embedding.documentCategory,
        },
      }
    })

    // Filter by relevance score and sort
    const relevantResults = scoredResults
      .filter(result => result.relevanceScore >= minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)

    // Group by document ID to avoid multiple chunks from same document
    const documentGroups = new Map<string, RetrievedDocument>()

    for (const result of relevantResults) {
      if (!documentGroups.has(result.id) || documentGroups.get(result.id)!.relevanceScore < result.relevanceScore) {
        documentGroups.set(result.id, result)
      }
    }

    const finalResults = Array.from(documentGroups.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)

    console.log(`Found ${finalResults.length} relevant documents in ${Date.now() - startTime}ms`)
    return finalResults

  } catch (error) {
    console.error('Failed to search documents:', error)
    throw new Error(`Document search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Perform RAG search and generate response
 */
export async function performRAGSearch(
  query: string,
  userId: string,
  platformType: string,
  options: ChatCompletionOptions & RAGSearchOptions = {}
): Promise<RAGResult> {
  const startTime = Date.now()
  let sessionId: string | null = null

  try {
    // Get AI model from database
    const aiModel = await getAIModel()

    // Get or create AI chat session
    const sessionQuery = await db
      .select()
      .from(aiChatSessions)
      .where(
        and(
          eq(aiChatSessions.userId, userId),
          eq(aiChatSessions.platformType, platformType as any),
          sql`${aiChatSessions.endedAt} IS NULL`
        )
      )
      .orderBy(desc(aiChatSessions.lastMessageAt))
      .limit(1)

    let aiSession = sessionQuery[0]

    if (!aiSession) {
      // Create new session
      const [newSession] = await db.insert(aiChatSessions).values({
        userId,
        platformType: platformType as any,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: query.slice(0, 50),
        startedAt: new Date(),
        lastMessageAt: new Date(),
      }).returning()
      aiSession = newSession
    }

    if (!aiSession) {
      throw new Error('Failed to create AI session')
    }

    sessionId = aiSession.sessionId

    // Get conversation history
    const historyQuery = await db
      .select({
        role: aiMessages.role,
        content: aiMessages.content,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, aiSession.id))
      .orderBy(aiMessages.createdAt)
      .limit(10)

    const conversationHistory: ChatMessage[] = historyQuery.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.createdAt,
    }))

    // Search for relevant documents
    const retrievedDocuments = await searchDocuments(query, options)

    // Log the search
    const searchLog = await db.insert(ragSearchLogs).values({
      sessionId: aiSession!.id,
      query,
      searchResults: {
        documentCount: retrievedDocuments.length,
        maxScore: retrievedDocuments.length > 0 ? retrievedDocuments[0]!.relevanceScore : 0,
      },
      retrievedDocumentIds: retrievedDocuments.map(doc => doc.id),
      relevanceScore: retrievedDocuments.reduce((acc, doc) => {
        acc[doc.id] = doc.relevanceScore
        return acc
      }, {} as Record<string, number>),
      processingTime: Date.now() - startTime,
      responseGenerated: false,
    }).returning()

    // Prepare retrieved context
    const retrievedContext = retrievedDocuments.map(doc =>
      `Document: ${doc.title}\nContent: ${doc.content}`
    )

    // Generate AI response with model from database
    const completionResult = await generateChatCompletion(query, {
      ...options,
      model: aiModel, // Use model from database
      conversationHistory,
      retrievedContext,
    })

    // Store user message
    await db.insert(aiMessages).values({
      sessionId: aiSession!.id,
      role: 'user',
      content: query,
      tokenCount: 0, // Will be updated if needed
      metadata: { searchLogId: searchLog[0]!.id },
    })

    // Store AI response
    await db.insert(aiMessages).values({
      sessionId: aiSession!.id,
      role: 'assistant',
      content: completionResult.response,
      tokenCount: completionResult.tokenUsage.completion,
      modelUsed: completionResult.model,
      retrievedDocuments: retrievedDocuments.map(doc => ({
        id: doc.id,
        title: doc.title,
        relevanceScore: doc.relevanceScore,
      })),
    })

    // Update session
    await db
      .update(aiChatSessions)
      .set({
        lastMessageAt: new Date(),
        context: {
          lastQuery: query,
          documentCount: retrievedDocuments.length,
        },
      })
      .where(eq(aiChatSessions.id, aiSession.id))

    // Update search log
    await db
      .update(ragSearchLogs)
      .set({
        responseGenerated: true,
        processingTime: Date.now() - startTime,
      })
      .where(eq(ragSearchLogs.id, searchLog[0]!.id))

    const processingTime = Date.now() - startTime

    console.log(`RAG search completed in ${processingTime}ms for session ${sessionId}`)

    return {
      answer: completionResult.response,
      retrievedDocuments,
      sessionId: sessionId,
      tokenUsage: completionResult.tokenUsage,
      processingTime,
      model: completionResult.model,
    }

  } catch (error) {
    console.error('RAG search failed:', error)

    // Log failed search
    if (sessionId) {
      const sessionQuery = await db
        .select()
        .from(aiChatSessions)
        .where(eq(aiChatSessions.sessionId, sessionId))
        .limit(1)

      if (sessionQuery[0]) {
        await db.insert(ragSearchLogs).values({
          sessionId: sessionQuery[0].id,
          query,
          searchResults: { error: error instanceof Error ? error.message : 'Unknown error' },
          retrievedDocumentIds: [],
          responseGenerated: false,
          processingTime: Date.now() - startTime,
        })
      }
    }

    throw new Error(`RAG search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Add feedback for RAG search results
 */
export async function addSearchFeedback(
  sessionId: string,
  feedback: number // 1-5 rating
): Promise<void> {
  try {
    const sessionQuery = await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.sessionId, sessionId))
      .limit(1)

    const session = sessionQuery[0]
    if (!session) {
      throw new Error('Session not found')
    }

    // Get the most recent search log for this session
    const recentLog = await db
      .select()
      .from(ragSearchLogs)
      .where(eq(ragSearchLogs.sessionId, session.id))
      .orderBy(desc(ragSearchLogs.createdAt))
      .limit(1)

    if (recentLog.length > 0) {
      await db
        .update(ragSearchLogs)
        .set({ userFeedback: feedback })
        .where(eq(ragSearchLogs.id, recentLog[0]!.id))
    }

  } catch (error) {
    console.error('Failed to add search feedback:', error)
    throw new Error(`Failed to add feedback: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}