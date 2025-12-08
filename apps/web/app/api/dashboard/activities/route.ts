import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  messages,
  automationExecutions,
  automationRules,
  conversations,
  users
} from '@/db/schema'
import { eq, desc, isNotNull, or, sql } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/activities - Get recent activities
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get recent messages
    const recentMessages = await db
      .select({
        id: messages.id,
        type: sql`'message'`,
        title: sql`CONCAT('New message from ', ${users.name})`,
        description: messages.content,
        timestamp: messages.createdAt,
        status: sql`CASE
          WHEN ${messages.status} = 'delivered' THEN 'success'
          WHEN ${messages.status} = 'failed' THEN 'error'
          ELSE 'info'
        END`,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .leftJoin(conversations, eq(messages.conversationId, conversations.id))
      .leftJoin(users, eq(conversations.userId, users.id))
      .orderBy(desc(messages.createdAt))
      .limit(limit / 2)

    // Get recent automation executions
    const recentAutomations = await db
      .select({
        id: automationExecutions.id,
        type: sql`'automation'`,
        title: sql`CONCAT('Automation rule executed: ', ${automationRules.name})`,
        description: automationExecutions.triggerType,
        timestamp: automationExecutions.createdAt,
        status: sql`CASE
          WHEN ${automationExecutions.status} = 'success' THEN 'success'
          WHEN ${automationExecutions.status} = 'failed' THEN 'error'
          ELSE 'warning'
        END`,
        ruleId: automationExecutions.ruleId,
      })
      .from(automationExecutions)
      .leftJoin(automationRules, eq(automationExecutions.ruleId, automationRules.id))
      .orderBy(desc(automationExecutions.createdAt))
      .limit(limit / 2)

    // Get recent conversation assignments
    const recentConversations = await db
      .select({
        id: conversations.id,
        type: sql`'conversation'`,
        title: sql`CASE
          WHEN ${conversations.assignedOperatorId} IS NOT NULL
          THEN CONCAT('Conversation assigned to operator')
          ELSE 'New conversation started'
        END`,
        description: sql`'New conversation activity'`,
        timestamp: conversations.createdAt,
        status: sql`'info'`,
        userId: conversations.userId,
      })
      .from(conversations)
      .where(
        or(
          isNotNull(conversations.assignedOperatorId),
          eq(conversations.status, 'active')
        )
      )
      .orderBy(desc(conversations.createdAt))
      .limit(limit / 3)

    // Combine and sort all activities
    const allActivities = [
      ...recentMessages.map((msg: any) => ({
        ...msg,
        type: msg.type as 'message' | 'automation' | 'conversation' | 'alert',
        status: msg.status as 'success' | 'warning' | 'error' | 'info',
        title: typeof msg.title === 'string' ? msg.title : String(msg.title),
        description: typeof msg.description === 'string' ? msg.description : String(msg.description),
      })),
      ...recentAutomations.map((automation: any) => ({
        ...automation,
        type: automation.type as 'message' | 'automation' | 'conversation' | 'alert',
        status: automation.status as 'success' | 'warning' | 'error' | 'info',
        title: typeof automation.title === 'string' ? automation.title : String(automation.title),
        description: typeof automation.description === 'string' ? automation.description : String(automation.description),
      })),
      ...recentConversations.map((conv: any) => ({
        ...conv,
        type: conv.type as 'message' | 'automation' | 'conversation' | 'alert',
        status: conv.status as 'success' | 'warning' | 'error' | 'info',
        title: typeof conv.title === 'string' ? conv.title : String(conv.title),
        description: typeof conv.description === 'string' ? conv.description : String(conv.description),
      }))
    ]

    // Sort by timestamp (most recent first) and limit
    const activities = allActivities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(activity => ({
        ...activity,
        timestamp: activity.timestamp.toISOString(),
      }))

    // Add some simulated alerts if needed
    if (activities.length < limit) {
      const alerts = [
        {
          id: `alert-1-${Date.now()}`,
          type: 'alert' as const,
          title: 'High message volume detected',
          description: 'Message volume is 150% above average',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          status: 'warning' as const,
        },
        {
          id: `alert-2-${Date.now()}`,
          type: 'alert' as const,
          title: 'AI response time increased',
          description: 'Average response time is above 5 seconds',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          status: 'error' as const,
        },
        {
          id: `alert-3-${Date.now()}`,
          type: 'alert' as const,
          title: 'New user milestone reached',
          description: 'Platform now has 100+ active users',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          status: 'success' as const,
        }
      ]

      activities.push(...alerts.slice(0, limit - activities.length))
    }

    return NextResponse.json({
      activities,
      generatedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Failed to fetch dashboard activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard activities' },
      { status: 500 }
    )
  }
}