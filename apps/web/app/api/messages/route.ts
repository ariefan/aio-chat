import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { messages, conversations, users } from '@/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/messages - Get messages with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build base query
    const baseQuery = db
      .select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        direction: messages.direction,
        status: messages.status,
        sentAt: messages.sentAt,
        metadata: messages.metadata,
        conversationId: messages.conversationId,
        platformId: messages.platformId,
        userName: users.name,
        userPlatformType: users.platformType,
      })
      .from(messages)
      .leftJoin(conversations, eq(messages.conversationId, conversations.id))
      .leftJoin(users, eq(conversations.userId, users.id))

    const messageList = await baseQuery
      .where(conversationId ? eq(messages.conversationId, conversationId) : undefined)
      .orderBy(desc(messages.sentAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const countQuery = db
      .select({ count: messages.id })
      .from(messages)
      .where(conversationId ? eq(messages.conversationId, conversationId) : undefined)

    const totalCount = await countQuery

    return NextResponse.json({
      messages: messageList,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
    })

  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/messages - Create a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, content, messageType = 'text', direction = 'outbound', metadata = {} } = body

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: 'conversationId and content are required' },
        { status: 400 }
      )
    }

    // Verify conversation exists and user has access
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Create message
    const [newMessage] = await db.insert(messages).values({
      conversationId,
      content,
      messageType: messageType as any,
      direction: direction as any,
      status: 'sent' as any,
      metadata,
      sentAt: new Date(),
    }).returning()

    // Update conversation last message time
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))

    return NextResponse.json(newMessage, { status: 201 })

  } catch (error) {
    console.error('Failed to create message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}