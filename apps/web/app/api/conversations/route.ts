import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { conversations, users, messages } from '@/db/schema'
import { eq, desc, asc, and } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/conversations - Get all conversations with message threading
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const includeLastMessage = searchParams.get('includeLastMessage') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build base query
    let query = db
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
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.userId, users.id))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset)

    // Apply filters
    const conditions = []
    if (status) {
      conditions.push(eq(conversations.status, status as any))
    }
    if (userId) {
      conditions.push(eq(conversations.userId, userId))
    }

    const conversationList = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query
    )

    // Include last message for each conversation if requested
    if (includeLastMessage) {
      for (const conversation of conversationList) {
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.sentAt))
          .limit(1)

        // @ts-ignore - adding lastMessage to conversation object
        conversation.lastMessage = lastMessage || null
      }
    }

    // Get total count for pagination
    const totalCount = await (conditions.length > 0
      ? db.select({ count: conversations.id }).from(conversations).where(and(...conditions))
      : db.select({ count: conversations.id }).from(conversations)
    )

    return NextResponse.json({
      conversations: conversationList,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
    })

  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, status = 'active' } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Check if conversation already exists for this user
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .limit(1)

    if (existingConversation) {
      return NextResponse.json(existingConversation, { status: 200 })
    }

    // Verify user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create new conversation
    const [newConversation] = await db.insert(conversations).values({
      userId,
      status,
      lastMessageAt: new Date(),
    }).returning()

    return NextResponse.json(newConversation, { status: 201 })

  } catch (error) {
    console.error('Failed to create conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}