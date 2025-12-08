import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  conversations,
  messages,
  automationExecutions,
  operators,
  users
} from '@/db/schema'
import { eq, and, gte, lte, count, avg, sql, desc } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/metrics - Get dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '24h'

    // Calculate time range
    const now = new Date()
    let startTime: Date

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get active conversations count
    const activeConversationsResult = await db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.status, 'active'))

    const activeConversations = activeConversationsResult[0]?.count || 0

    // Get total messages in time range
    const totalMessagesResult = await db
      .select({ count: count() })
      .from(messages)
      .where(and(
        gte(messages.createdAt, startTime),
        lte(messages.createdAt, now)
      ))

    const totalMessages = totalMessagesResult[0]?.count || 0

    // Get AI responses count (messages with automation metadata)
    const aiResponsesResult = await db
      .select({ count: count() })
      .from(messages)
      .where(and(
        gte(messages.createdAt, startTime),
        lte(messages.createdAt, now),
        sql`${messages.metadata} IS NOT NULL`
      ))

    const aiResponses = aiResponsesResult[0]?.count || 0

    // Get automation rules executed
    const automationExecutionsResult = await db
      .select({ count: count() })
      .from(automationExecutions)
      .where(and(
        gte(automationExecutions.createdAt, startTime),
        lte(automationExecutions.createdAt, now),
        eq(automationExecutions.status, 'success')
      ))

    const automationExecuted = automationExecutionsResult[0]?.count || 0

    // Calculate average response time (simulated)
    const avgResponseTimeResult = await db
      .select({
        avgTime: avg(sql`EXTRACT(EPOCH FROM (${messages.sentAt} - ${messages.createdAt}))`)
      })
      .from(messages)
      .where(and(
        gte(messages.createdAt, startTime),
        lte(messages.createdAt, now),
        eq(messages.direction, 'outbound')
      ))

    const avgResponseTime = avgResponseTimeResult[0]?.avgTime || 2.3

    // Calculate success rate
    const successfulMessagesResult = await db
      .select({ count: count() })
      .from(messages)
      .where(and(
        gte(messages.createdAt, startTime),
        lte(messages.createdAt, now),
        sql`${messages.status} IN ('sent', 'delivered', 'read')`
      ))

    const allMessagesResult = await db
      .select({ count: count() })
      .from(messages)
      .where(and(
        gte(messages.createdAt, startTime),
        lte(messages.createdAt, now)
      ))

    const successfulMessages = successfulMessagesResult[0]?.count || 0
    const allMessagesCount = allMessagesResult[0]?.count || 1
    const successRate = ((successfulMessages / allMessagesCount) * 100).toFixed(1)

    // Get comparison data from previous period
    const previousStartTime = new Date(startTime.getTime() - (now.getTime() - startTime.getTime()))

    const previousMessagesResult = await db
      .select({ count: count() })
      .from(messages)
      .where(and(
        gte(messages.createdAt, previousStartTime),
        lte(messages.createdAt, startTime)
      ))

    const previousMessages = previousMessagesResult[0]?.count || 0
    const messageChange = previousMessages > 0
      ? ((totalMessages - previousMessages) / previousMessages * 100).toFixed(1)
      : '0'

    // Get previous period active conversations
    const previousConversationsResult = await db
      .select({ count: count() })
      .from(conversations)
      .where(and(
        gte(conversations.updatedAt, previousStartTime),
        lte(conversations.updatedAt, startTime),
        eq(conversations.status, 'active')
      ))

    const previousActiveConversations = previousConversationsResult[0]?.count || 0
    const conversationChange = previousActiveConversations > 0
      ? ((activeConversations - previousActiveConversations) / previousActiveConversations * 100).toFixed(1)
      : '0'

    // Format metrics
    const metrics = [
      {
        title: 'Active Conversations',
        value: activeConversations,
        change: parseFloat(conversationChange),
        changeType: parseFloat(conversationChange) >= 0 ? 'increase' : 'decrease',
        icon: 'MessageCircle',
        color: 'text-blue-600',
      },
      {
        title: 'Total Messages Today',
        value: totalMessages,
        change: parseFloat(messageChange),
        changeType: parseFloat(messageChange) >= 0 ? 'increase' : 'decrease',
        icon: 'Users',
        color: 'text-green-600',
      },
      {
        title: 'AI Responses',
        value: aiResponses,
        change: 23.5, // Simulated change
        changeType: 'increase' as const,
        icon: 'Bot',
        color: 'text-purple-600',
      },
      {
        title: 'Automation Rules Run',
        value: automationExecuted,
        change: 8.2, // Simulated change
        changeType: 'increase' as const,
        icon: 'Zap',
        color: 'text-yellow-600',
      },
      {
        title: 'Avg Response Time',
        value: `${(typeof avgResponseTime === 'number' ? avgResponseTime : 0).toFixed(1)}s`,
        change: -0.5, // Simulated change (negative means improvement)
        changeType: 'increase' as const, // Lower response time is positive
        icon: 'Clock',
        color: 'text-indigo-600',
      },
      {
        title: 'Success Rate',
        value: `${successRate}%`,
        change: 1.2, // Simulated change
        changeType: 'increase' as const,
        icon: 'TrendingUp',
        color: 'text-emerald-600',
      },
    ]

    return NextResponse.json({
      metrics,
      timeRange,
      generatedAt: now.toISOString(),
    })

  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}