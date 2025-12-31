import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { proactiveMessages, bpjsMembers } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import {
  runScheduler,
  triggerProactiveMessage,
  sendPendingMessages,
} from '@/lib/scheduler/proactive-scheduler'
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitExceededResponse,
} from '@/lib/rate-limiter'

// GET - List proactive messages
export async function GET(request: NextRequest) {
  // Rate limiting - use API limits for read operations
  const clientId = getClientIdentifier(request)
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitExceededResponse(rateCheck.retryAfter!)
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const conditions = []
    if (status) {
      conditions.push(eq(proactiveMessages.status, status))
    }

    const messages = await db
      .select({
        message: proactiveMessages,
        member: bpjsMembers,
      })
      .from(proactiveMessages)
      .innerJoin(bpjsMembers, eq(proactiveMessages.memberId, bpjsMembers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(proactiveMessages.scheduledAt))
      .limit(limit)

    const formattedMessages = messages.map(({ message, member }) => ({
      ...message,
      memberName: member.name,
      memberBpjsId: member.bpjsId,
    }))

    return NextResponse.json({
      messages: formattedMessages,
    })

  } catch (error) {
    console.error('Failed to fetch proactive messages:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// POST - Trigger proactive message or run scheduler
export async function POST(request: NextRequest) {
  // Rate limiting - scheduler operations are expensive, use strict limits
  const clientId = getClientIdentifier(request)
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.scheduler)
  if (!rateCheck.allowed) {
    return rateLimitExceededResponse(rateCheck.retryAfter!)
  }

  try {
    const body = await request.json()
    const { action, memberId, messageType } = body

    if (action === 'run_scheduler') {
      // Run the full scheduler
      const result = await runScheduler()
      return NextResponse.json({
        success: true,
        action: 'run_scheduler',
        ...result,
      })
    }

    if (action === 'send_pending') {
      // Send all pending messages
      const sent = await sendPendingMessages()
      return NextResponse.json({
        success: true,
        action: 'send_pending',
        sent,
      })
    }

    if (action === 'trigger') {
      // Trigger specific message
      if (!memberId || !messageType) {
        return NextResponse.json(
          { error: 'memberId and messageType are required for trigger action' },
          { status: 400 }
        )
      }

      const success = await triggerProactiveMessage(memberId, messageType)
      return NextResponse.json({
        success,
        action: 'trigger',
        memberId,
        messageType,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: run_scheduler, send_pending, or trigger' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Failed to process proactive action:', error)
    return NextResponse.json(
      {
        error: 'Failed to process action',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
