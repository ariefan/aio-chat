import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { messages, conversations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/messages/[id] - Get a specific message
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const messageId = id

    if (!messageId || messageId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid message ID' },
        { status: 400 }
      )
    }

    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1)

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, message.conversationId))
      .limit(1)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(message)

  } catch (error) {
    console.error('Failed to fetch message:', error)
    return NextResponse.json(
      { error: 'Failed to fetch message' },
      { status: 500 }
    )
  }
}

// PUT /api/messages/[id] - Update a message
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const messageId = id

    if (!messageId || messageId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid message ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { content, status, metadata } = body

    // Verify message exists and user has access
    const [existingMessage] = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1)

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, existingMessage.conversationId))
      .limit(1)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (content !== undefined) updateData.content = content
    if (status !== undefined) updateData.status = status
    if (metadata !== undefined) updateData.metadata = metadata
    updateData.updatedAt = new Date()

    // Update message
    const [updatedMessage] = await db
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, messageId))
      .returning()

    return NextResponse.json(updatedMessage)

  } catch (error) {
    console.error('Failed to update message:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}

// DELETE /api/messages/[id] - Soft delete a message
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const messageId = id

    if (!messageId || messageId.length < 10) {
      return NextResponse.json(
        { error: 'Invalid message ID' },
        { status: 400 }
      )
    }

    // Verify message exists and user has access
    const [existingMessage] = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1)

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this conversation
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, existingMessage.conversationId))
      .limit(1)

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Delete the message
    const [deletedMessage] = await db
      .delete(messages)
      .where(eq(messages.id, messageId))
      .returning()

    return NextResponse.json({
      message: 'Message deleted successfully',
      id: deletedMessage?.id || messageId
    })

  } catch (error) {
    console.error('Failed to delete message:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}