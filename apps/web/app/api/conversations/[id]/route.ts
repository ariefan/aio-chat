import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { conversations, users, messages } from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/conversations/[id] - Get a specific conversation with threaded messages
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = id

    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    // Soft delete functionality removed - no deletedAt column exists

    // Get conversation with user details
    const [conversation] = await db
      .select({
        id: conversations.id,
        userId: conversations.userId,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userPlatformType: users.platformType,
        userPlatformId: users.platformId,
        userStatus: users.status,
        userMetadata: users.metadata,
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.userId, users.id))
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Build messages query
    const messagesQuery = db
      .select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        direction: messages.direction,
        status: messages.status,
        sentAt: messages.sentAt,
        metadata: messages.metadata,
        platformId: messages.platformId,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.sentAt))
      .limit(limit)
      .offset(offset)

    const messageList = await messagesQuery

    // Get total count for pagination
    const countQuery = db.select({ count: messages.id }).from(messages)
      .where(eq(messages.conversationId, conversationId))

    const totalCount = await countQuery

    // Get conversation statistics
    const [stats] = await db
      .select({
        totalMessages: sql`COUNT(*)::int`,
        inboundMessages: sql`COUNT(CASE WHEN direction = 'inbound' THEN 1 END)::int`,
        outboundMessages: sql`COUNT(CASE WHEN direction = 'outbound' THEN 1 END)::int`,
        lastInboundAt: sql`MAX(CASE WHEN direction = 'inbound' THEN sent_at END)`,
        lastOutboundAt: sql`MAX(CASE WHEN direction = 'outbound' THEN sent_at END)`,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))

    // Process messages into threaded view
    const threadedMessages = processMessageThreads(messageList)

    return NextResponse.json({
      conversation,
      messages: threadedMessages,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
      stats: {
        totalMessages: stats?.totalMessages || 0,
        inboundMessages: stats?.inboundMessages || 0,
        outboundMessages: stats?.outboundMessages || 0,
        lastInboundAt: stats?.lastInboundAt,
        lastOutboundAt: stats?.lastOutboundAt,
      },
    })

  } catch (error) {
    console.error('Failed to fetch conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// PUT /api/conversations/[id] - Update a conversation
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = id

    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status, metadata } = body

    // Verify conversation exists
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = { updatedAt: new Date() }
    if (status !== undefined) updateData.status = status
    if (metadata !== undefined) updateData.metadata = metadata

    // Update conversation
    const [updatedConversation] = await db
      .update(conversations)
      .set(updateData)
      .where(eq(conversations.id, conversationId))
      .returning()

    return NextResponse.json(updatedConversation)

  } catch (error) {
    console.error('Failed to update conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

// DELETE /api/conversations/[id] - Soft delete a conversation and its messages
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const conversationId = id

    if (!conversationId || conversationId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      )
    }

    // Verify conversation exists
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!existingConversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Delete all messages in the conversation
    await db
      .delete(messages)
      .where(eq(messages.conversationId, conversationId))

    // Delete the conversation
    const [deletedConversation] = await db
      .delete(conversations)
      .where(eq(conversations.id, conversationId))
      .returning()

    return NextResponse.json({
      message: 'Conversation deleted successfully',
      id: deletedConversation?.id || conversationId
    })

  } catch (error) {
    console.error('Failed to delete conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

// Helper function to process messages into threaded view
function processMessageThreads(messageList: any[]) {
  // Sort messages by date (oldest first for threading)
  const sortedMessages = [...messageList].reverse()

  // Group messages by time proximity (within 5 minutes)
  const threads = []
  let currentThread = null

  for (const message of sortedMessages) {
    const messageTime = new Date(message.sentAt).getTime()

    if (!currentThread) {
      // Start new thread
      currentThread = {
        id: `thread-${message.id}`,
        messages: [message],
        startTime: messageTime,
        endTime: messageTime,
      }
    } else {
      // Check if message is within 5 minutes of last message in thread
      const timeDiff = messageTime - currentThread.endTime
      const fiveMinutes = 5 * 60 * 1000

      if (timeDiff <= fiveMinutes) {
        // Add to existing thread
        currentThread.messages.push(message)
        currentThread.endTime = messageTime
      } else {
        // Save current thread and start new one
        threads.push(currentThread)
        currentThread = {
          id: `thread-${message.id}`,
          messages: [message],
          startTime: messageTime,
          endTime: messageTime,
        }
      }
    }
  }

  // Add the last thread if it exists
  if (currentThread) {
    threads.push(currentThread)
  }

  return threads
}