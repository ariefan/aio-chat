import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  automationRules,
  operators,
  automationExecutions,
  automationSchedules
} from '@/db/schema'
import { eq, and, desc, ilike, or } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { automationEngine } from '@/lib/automation/rules-engine'

// GET /api/automation/rules - Get all automation rules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const triggerType = searchParams.get('triggerType')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = db
      .select({
        id: automationRules.id,
        name: automationRules.name,
        description: automationRules.description,
        status: automationRules.status,
        triggerType: automationRules.triggerType,
        priority: automationRules.priority,
        executionCount: automationRules.executionCount,
        lastExecutedAt: automationRules.lastExecutedAt,
        cooldownMinutes: automationRules.cooldownMinutes,
        tags: automationRules.tags,
        createdAt: automationRules.createdAt,
        updatedAt: automationRules.updatedAt,
        createdByName: operators.name,
        createdByEmail: operators.email,
      })
      .from(automationRules)
      .leftJoin(operators, eq(automationRules.createdBy, operators.id))
      .orderBy(desc(automationRules.updatedAt))
      .limit(limit)
      .offset(offset)

    // Apply filters
    const conditions = []
    if (status) {
      conditions.push(eq(automationRules.status, status as any))
    }
    if (triggerType) {
      conditions.push(eq(automationRules.triggerType, triggerType as any))
    }
    if (search) {
      conditions.push(
        or(
          ilike(automationRules.name, `%${search}%`),
          ilike(automationRules.description, `%${search}%`),
          ilike(automationRules.tags, `%${search}%`)
        )
      )
    }

    const rules = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query
    )

    // Get total count for pagination
    const totalCount = await (conditions.length > 0
      ? db.select({ count: automationRules.id }).from(automationRules).where(and(...conditions))
      : db.select({ count: automationRules.id }).from(automationRules)
    )

    return NextResponse.json({
      rules,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
      },
    })

  } catch (error) {
    console.error('Failed to fetch automation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    )
  }
}

// POST /api/automation/rules - Create a new automation rule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      actions,
      conditions,
      priority = 0,
      maxExecutions,
      cooldownMinutes = 0,
      tags,
      metadata = {},
      status = 'draft'
    } = body

    // Validate required fields
    if (!name || !triggerType || !triggerConfig || !actions) {
      return NextResponse.json(
        { error: 'name, triggerType, triggerConfig, and actions are required' },
        { status: 400 }
      )
    }

    // Validate actions
    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'actions must be a non-empty array' },
        { status: 400 }
      )
    }

    // Create rule
    const [newRule] = await db.insert(automationRules).values({
      name,
      description,
      status,
      triggerType,
      triggerConfig,
      actions,
      conditions,
      priority,
      maxExecutions,
      cooldownMinutes,
      tags,
      metadata,
      createdBy: session.user.id,
    }).returning()

    // If rule is active and has time-based trigger, create schedule
    if (status === 'active' && triggerType === 'time_based' && newRule) {
      await db.insert(automationSchedules).values({
        ruleId: newRule.id,
        scheduleType: 'cron',
        scheduleExpression: triggerConfig.cronExpression,
        nextRunAt: new Date(triggerConfig.nextRun),
      })
    }

    return NextResponse.json({
      rule: newRule,
      message: 'Automation rule created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 }
    )
  }
}