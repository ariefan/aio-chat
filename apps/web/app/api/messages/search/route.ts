import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { messages, conversations, users } from '@/db/schema'
import { eq, and, desc, or, ilike, gte, lte } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/messages/search - Search messages with advanced filters
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      query = '',
      conversationId = null,
      messageType = null,
      direction = null,
      status = null,
      dateFrom = null,
      dateTo = null,
      page = 1,
      limit = 50,
    } = body

    const offset = (page - 1) * limit

    // Build query conditions
    const conditions = []

    // Add text search condition
    if (query.trim()) {
      conditions.push(ilike(messages.content, `%${query.trim()}%`))
    }

    // Add conversation filter
    if (conversationId) {
      conditions.push(eq(messages.conversationId, conversationId))
    }

    // Add message type filter
    if (messageType) {
      conditions.push(eq(messages.messageType, messageType))
    }

    // Add direction filter
    if (direction) {
      conditions.push(eq(messages.direction, direction))
    }

    // Add status filter
    if (status) {
      conditions.push(eq(messages.status, status))
    }

    // Add date range filters
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      conditions.push(gte(messages.sentAt, fromDate))
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      conditions.push(lte(messages.sentAt, toDate))
    }

    // Note: No soft delete functionality - deletedAt column doesn't exist

    // Build the base query
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
        userEmail: users.email,
        userPlatformType: users.platformType,
        userPlatformId: users.platformId,
      })
      .from(messages)
      .leftJoin(conversations, eq(messages.conversationId, conversations.id))
      .leftJoin(users, eq(conversations.userId, users.id))

    const messageList = await baseQuery
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(messages.sentAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const countQuery = db
      .select({ count: messages.id })
      .from(messages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    const totalCount = await countQuery

    // Generate search suggestions based on common terms
    const suggestions = await generateSearchSuggestions(query)

    return NextResponse.json({
      messages: messageList,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
      searchMeta: {
        query,
        filters: {
          conversationId,
          messageType,
          direction,
          status,
          dateFrom,
          dateTo,
        },
        resultCount: messageList.length,
        suggestions,
      },
    })

  } catch (error) {
    console.error('Failed to search messages:', error)
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    )
  }
}

// Helper function to generate search suggestions
async function generateSearchSuggestions(query: string) {
  if (!query.trim()) return []

  try {
    // Get common keywords from recent messages (last 100 messages)
    const recentMessages = await db
      .select({ content: messages.content })
      .from(messages)
            .orderBy(desc(messages.sentAt))
      .limit(100)

    // Extract words and find suggestions
    const words = recentMessages
      .flatMap(msg => msg.content.toLowerCase().split(/\s+/))
      .filter(word => word.length > 2 && !word.match(/^[^\w]+$/))

    const wordFrequency: Record<string, number> = {}
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1
    })

    // Find suggestions that start with the query
    const queryLower = query.toLowerCase()
    const suggestions = Object.entries(wordFrequency)
      .filter(([word]) => word.includes(queryLower))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)

    return suggestions

  } catch (error) {
    console.error('Failed to generate search suggestions:', error)
    return []
  }
}

