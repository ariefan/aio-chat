import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { knowledgeDocuments, documentEmbeddings } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { indexDocument } from '@/lib/ai/rag-service'

// POST /api/knowledge/index - Index published documents for RAG search
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, forceReindex = false, indexAll = false } = body

    let results = {
      indexed: 0,
      failed: 0,
      errors: [] as string[]
    }

    if (indexAll) {
      // Index all published documents
      const publishedDocuments = await db
        .select({
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title,
          content: knowledgeDocuments.content,
          status: knowledgeDocuments.status,
          updatedAt: knowledgeDocuments.updatedAt,
        })
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.status, 'published'))

      console.log(`Found ${publishedDocuments.length} published documents to index`)

      for (const document of publishedDocuments) {
        try {
          // Check if already indexed (unless forcing reindex)
          if (!forceReindex) {
            const existingEmbeddings = await db
              .select()
              .from(documentEmbeddings)
              .where(eq(documentEmbeddings.documentId, document.id))
              .limit(1)

            if (existingEmbeddings.length > 0) {
              console.log(`Skipping already indexed document: ${document.title}`)
              continue
            }
          }

          await indexDocument(document.id, document.content, forceReindex)
          results.indexed++
          console.log(`Successfully indexed document: ${document.title}`)

        } catch (error) {
          results.failed++
          const errorMsg = `Failed to index document "${document.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
          results.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Indexing completed: ${results.indexed} documents indexed, ${results.failed} failed`,
        results,
      })

    } else if (documentId) {
      // Index specific document
      const [document] = await db
        .select({
          id: knowledgeDocuments.id,
          title: knowledgeDocuments.title,
          content: knowledgeDocuments.content,
          status: knowledgeDocuments.status,
        })
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, documentId))
        .limit(1)

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }

      if (document.status !== 'published') {
        return NextResponse.json(
          { error: 'Only published documents can be indexed' },
          { status: 400 }
        )
      }

      try {
        await indexDocument(documentId, document.content, forceReindex)
        results.indexed++

        return NextResponse.json({
          success: true,
          message: `Successfully indexed document: ${document.title}`,
          results,
        })

      } catch (error) {
        results.failed++
        const errorMsg = `Failed to index document "${document.title}": ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)

        return NextResponse.json(
          {
            success: false,
            error: errorMsg,
            results,
          },
          { status: 500 }
        )
      }

    } else {
      return NextResponse.json(
        { error: 'Either documentId or indexAll must be provided' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Knowledge indexing error:', error)
    return NextResponse.json(
      {
        error: 'Failed to index knowledge base',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/knowledge/index - Get indexing status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get indexing statistics
    const publishedCount = await db
      .select({ count: knowledgeDocuments.id })
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.status, 'published'))

    const indexedDocuments = await db
      .select({ documentId: documentEmbeddings.documentId })
      .from(documentEmbeddings)
      .groupBy(documentEmbeddings.documentId)

    const totalEmbeddings = await db
      .select({ count: documentEmbeddings.id })
      .from(documentEmbeddings)

    const unindexedDocuments = await db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        updatedAt: knowledgeDocuments.updatedAt,
      })
      .from(knowledgeDocuments)
      .leftJoin(
        documentEmbeddings,
        eq(knowledgeDocuments.id, documentEmbeddings.documentId)
      )
      .where(
        and(
          eq(knowledgeDocuments.status, 'published'),
          sql`${documentEmbeddings.documentId} IS NULL`
        )
      )
      .limit(10)

    return NextResponse.json({
      statistics: {
        publishedDocuments: publishedCount.length,
        indexedDocuments: indexedDocuments.length,
        totalEmbeddings: totalEmbeddings.length,
        unindexedDocuments: publishedCount.length - indexedDocuments.length,
      },
      unindexedSample: unindexedDocuments,
      indexRate: publishedCount.length > 0
        ? Math.round((indexedDocuments.length / publishedCount.length) * 100)
        : 0,
    })

  } catch (error) {
    console.error('Failed to get indexing status:', error)
    return NextResponse.json(
      { error: 'Failed to get indexing status' },
      { status: 500 }
    )
  }
}