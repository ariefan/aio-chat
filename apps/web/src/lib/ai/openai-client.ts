import OpenAI from 'openai'

// Lazy-initialized OpenAI client (prevents build-time errors)
let _openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000, // 30 seconds timeout
    })
  }
  return _openaiClient
}

// Models configuration
export const AI_MODELS = {
  CHAT: 'gpt-4o-mini', // Fast, cost-effective for conversations
  EMBEDDING: 'text-embedding-3-small', // Best balance of performance and cost
  SMART_CHAT: 'gpt-4o', // For complex queries requiring higher reasoning
} as const

// System prompts for different contexts
export const SYSTEM_PROMPTS = {
  GENERAL_ASSISTANT: `You are an AI assistant for AIO-CHAT, a customer service platform. Your role is to help users with their inquiries in a friendly, professional, and helpful manner.

Key guidelines:
- Be conversational and natural
- Provide helpful, accurate information based on the knowledge provided
- If you don't know something, admit it and suggest alternatives
- Keep responses concise but informative
- Use appropriate tone for customer service

You have access to relevant knowledge base documents to help answer questions accurately.`,

  DEBT_COLLECTION: `You are an AI assistant specialized in debt collection communication. Your role is to help users understand their payment obligations and facilitate resolution while maintaining professionalism and compliance.

Key guidelines:
- Be empathetic but firm about payment obligations
- Explain payment options clearly
- Help users understand their rights and responsibilities
- Suggest practical solutions for payment difficulties
- Maintain confidentiality and professionalism
- Follow debt collection best practices

Use the provided knowledge base to give accurate information about policies, procedures, and options.`,

  POLICY_INFO: `You are an AI assistant that helps users understand company policies and procedures. Your role is to provide clear, accurate information about policies based on the knowledge base.

Key guidelines:
- Explain policies in simple, easy-to-understand terms
- Reference specific policy details when relevant
- Help users navigate complex procedures
- Suggest next steps or actions when appropriate
- Be thorough but keep explanations clear

Always base your answers on the provided knowledge base documents.`,
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
  metadata?: Record<string, any>
}

export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
  model: string
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  conversationHistory?: ChatMessage[]
  retrievedContext?: string[]
}

export interface RetrievedDocument {
  id: string
  title: string
  content: string
  relevanceScore: number
  metadata?: Record<string, any>
}

/**
 * Generate embeddings for text using OpenAI's embedding model
 */
export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  try {
    const response = await getOpenAIClient().embeddings.create({
      model: AI_MODELS.EMBEDDING,
      input: texts,
      encoding_format: 'float',
    })

    return response.data.map((item, index) => ({
      embedding: item.embedding,
      tokenCount: response.usage?.prompt_tokens || 0,
      model: AI_MODELS.EMBEDDING,
    }))
  } catch (error) {
    console.error('Failed to generate embeddings:', error)
    throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a single embedding for text
 */
export async function generateSingleEmbedding(text: string): Promise<EmbeddingResult> {
  const results = await generateEmbeddings([text])
  return results[0]!
}

/**
 * Generate chat completion with optional RAG context
 */
export async function generateChatCompletion(
  userMessage: string,
  options: ChatCompletionOptions = {}
): Promise<{
  response: string
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
  model: string
}> {
  const {
    model = AI_MODELS.CHAT,
    temperature = 0.7,
    maxTokens = 1000,
    systemPrompt = SYSTEM_PROMPTS.GENERAL_ASSISTANT,
    conversationHistory = [],
    retrievedContext = [],
  } = options

  try {
    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history (excluding system messages)
    conversationHistory
      .filter(msg => msg.role !== 'system')
      .forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      })

    // Add retrieved context if available
    if (retrievedContext.length > 0) {
      const contextText = retrievedContext
        .map((doc, index) => `[Context ${index + 1}]:\n${doc}`)
        .join('\n\n')

      messages.push({
        role: 'system',
        content: `Use the following context to help answer the user's question. The context contains relevant information from the knowledge base:\n\n${contextText}`,
      })
    }

    // Add the current user message
    messages.push({ role: 'user', content: userMessage })

    const response = await getOpenAIClient().chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    })

    const choice = response.choices?.[0]
    if (!choice?.message?.content) {
      throw new Error('No response generated')
    }

    return {
      response: choice.message.content,
      tokenUsage: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      model: response.model,
    }
  } catch (error) {
    console.error('Failed to generate chat completion:', error)
    throw new Error(`Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate streaming chat completion
 */
export async function generateStreamingChatCompletion(
  userMessage: string,
  onChunk: (chunk: string) => void,
  options: ChatCompletionOptions = {}
): Promise<void> {
  const {
    model = AI_MODELS.CHAT,
    temperature = 0.7,
    maxTokens = 1000,
    systemPrompt = SYSTEM_PROMPTS.GENERAL_ASSISTANT,
    conversationHistory = [],
    retrievedContext = [],
  } = options

  try {
    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Add conversation history
    conversationHistory
      .filter(msg => msg.role !== 'system')
      .forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      })

    // Add retrieved context if available
    if (retrievedContext.length > 0) {
      const contextText = retrievedContext
        .map((doc, index) => `[Context ${index + 1}]:\n${doc}`)
        .join('\n\n')

      messages.push({
        role: 'system',
        content: `Use the following context to help answer the user's question:\n\n${contextText}`,
      })
    }

    // Add the current user message
    messages.push({ role: 'user', content: userMessage })

    const stream = await getOpenAIClient().chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        onChunk(content)
      }
    }
  } catch (error) {
    console.error('Failed to generate streaming chat completion:', error)
    throw new Error(`Streaming chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must be the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!
    normA += vecA[i]! * vecA[i]!
    normB += vecB[i]! * vecB[i]!
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}

export default getOpenAIClient