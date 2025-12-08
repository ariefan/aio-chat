import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { knowledgeDocuments, operators } from '@/db/schema'
import { eq, and, ilike, desc, or } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { indexDocument } from '@/lib/ai/rag-service'

// GET /api/knowledge/documents - Get all knowledge documents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Apply filters
    const conditions = []
    if (status) {
      conditions.push(eq(knowledgeDocuments.status, status as any))
    }
    if (type) {
      conditions.push(eq(knowledgeDocuments.type, type as any))
    }
    if (category) {
      conditions.push(eq(knowledgeDocuments.category, category))
    }
    if (search) {
      conditions.push(
        or(
          ilike(knowledgeDocuments.title, `%${search}%`),
          ilike(knowledgeDocuments.content, `%${search}%`),
          ilike(knowledgeDocuments.tags, `%${search}%`)
        )
      )
    }

    // Build query with filters
    const baseQuery = db
      .select({
        id: knowledgeDocuments.id,
        title: knowledgeDocuments.title,
        type: knowledgeDocuments.type,
        status: knowledgeDocuments.status,
        category: knowledgeDocuments.category,
        tags: knowledgeDocuments.tags,
        createdAt: knowledgeDocuments.createdAt,
        updatedAt: knowledgeDocuments.updatedAt,
        publishedAt: knowledgeDocuments.publishedAt,
        createdByName: operators.name,
        createdByEmail: operators.email,
      })
      .from(knowledgeDocuments)
      .leftJoin(operators, eq(knowledgeDocuments.createdById, operators.id))

    const documents = await baseQuery
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(knowledgeDocuments.updatedAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const countQuery = db
      .select({ count: knowledgeDocuments.id })
      .from(knowledgeDocuments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const totalCount = await countQuery

    return NextResponse.json({
      documents,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
    })

  } catch (error) {
    console.error('Failed to fetch knowledge documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge documents' },
      { status: 500 }
    )
  }
}

// POST /api/knowledge/documents - Create a new knowledge document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      content,
      type = 'general',
      status = 'draft',
      category,
      tags,
      metadata = {},
      autoIndex = status === 'published'
    } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Create document
    const [newDocument] = await db.insert(knowledgeDocuments).values({
      title,
      content,
      type,
      status,
      category,
      tags,
      metadata,
      createdById: session.user.id,
      publishedAt: status === 'published' ? new Date() : null,
    }).returning()

    // Auto-index if published and requested
    if (autoIndex && status === 'published' && newDocument) {
      try {
        await indexDocument(newDocument.id, content, false)
        console.log(`Auto-indexed new document: ${newDocument.id}`)
      } catch (indexError) {
        console.error('Failed to auto-index document:', indexError)
        // Don't fail the creation if indexing fails
      }
    }

    return NextResponse.json({
      document: newDocument,
      indexed: autoIndex && status === 'published',
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create knowledge document:', error)
    return NextResponse.json(
      { error: 'Failed to create knowledge document' },
      { status: 500 }
    )
  }
}