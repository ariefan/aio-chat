import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { knowledgeDocuments, documentEmbeddings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { indexDocument } from '@/lib/ai/rag-service'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/knowledge/documents/[id] - Get a specific knowledge document
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const [document] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id))
      .limit(1)

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ document })

  } catch (error) {
    console.error('Failed to fetch knowledge document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge document' },
      { status: 500 }
    )
  }
}

// PUT /api/knowledge/documents/[id] - Update a knowledge document
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      title,
      content,
      type,
      status,
      category,
      tags,
      metadata,
      reindex = false
    } = body

    // Verify document exists
    const [existingDocument] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id))
      .limit(1)

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = { updatedAt: new Date() }
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (type !== undefined) updateData.type = type
    if (status !== undefined) {
      updateData.status = status
      if (status === 'published' && !existingDocument.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags
    if (metadata !== undefined) updateData.metadata = metadata

    // Update document
    const [updatedDocument] = await db
      .update(knowledgeDocuments)
      .set(updateData)
      .where(eq(knowledgeDocuments.id, id))
      .returning()

    // Reindex if requested or if content was updated
    if (reindex || content !== undefined) {
      try {
        if (content !== undefined) {
          await indexDocument(id, content, true) // Regenerate embeddings
        } else {
          await indexDocument(id, existingDocument.content, true)
        }
        console.log(`Re-indexed document: ${id}`)
      } catch (indexError) {
        console.error('Failed to re-index document:', indexError)
        // Don't fail the update if indexing fails
      }
    }

    return NextResponse.json({
      document: updatedDocument,
      reindexed: reindex || content !== undefined,
    })

  } catch (error) {
    console.error('Failed to update knowledge document:', error)
    return NextResponse.json(
      { error: 'Failed to update knowledge document' },
      { status: 500 }
    )
  }
}

// DELETE /api/knowledge/documents/[id] - Delete a knowledge document
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify document exists
    const [existingDocument] = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id))
      .limit(1)

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Delete document embeddings first (cascade should handle this, but being explicit)
    await db
      .delete(documentEmbeddings)
      .where(eq(documentEmbeddings.documentId, id))

    // Delete the document
    await db
      .delete(knowledgeDocuments)
      .where(eq(knowledgeDocuments.id, id))

    return NextResponse.json({
      message: 'Knowledge document deleted successfully',
      id,
    })

  } catch (error) {
    console.error('Failed to delete knowledge document:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge document' },
      { status: 500 }
    )
  }
}