import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { customerStrategies, bpjsMembers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { classifyMemberBehavior } from '@/lib/services/behavioral-segmentation'

// GET /api/members/:id/strategy - Get member strategy
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify member exists
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.id, id))
      .limit(1)

    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'Member not found'
      }, { status: 404 })
    }

    // Get latest active strategy
    const [strategy] = await db
      .select()
      .from(customerStrategies)
      .where(
        eq(customerStrategies.memberId, id)
      )
      .orderBy(desc(customerStrategies.createdAt))
      .limit(1)

    if (!strategy) {
      return NextResponse.json({
        success: false,
        error: 'No strategy found for this member'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: strategy
    })

  } catch (error: any) {
    console.error('Error getting member strategy:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST /api/members/:id/strategy - Generate new strategy
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify member exists
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.id, id))
      .limit(1)

    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'Member not found'
      }, { status: 404 })
    }

    console.log(`🎯 Generating new strategy for member: ${id}`)
    const segmentation = await classifyMemberBehavior(id)

    // Get the newly created strategy
    const [strategy] = await db
      .select()
      .from(customerStrategies)
      .where(eq(customerStrategies.memberId, id))
      .orderBy(desc(customerStrategies.createdAt))
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Strategy generated successfully',
      data: strategy
    })

  } catch (error: any) {
    console.error('Error generating strategy:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// PUT /api/members/:id/strategy - Update strategy
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verify member exists
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.id, id))
      .limit(1)

    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'Member not found'
      }, { status: 404 })
    }

    // Deactivate existing strategies
    await db
      .update(customerStrategies)
      .set({ isActive: false })
      .where(eq(customerStrategies.memberId, id))

    // Create new strategy with provided data
    await db.insert(customerStrategies).values({
      memberId: id,
      approach: body.approach,
      tone: body.tone,
      urgency: body.urgency,
      recommendedActions: body.recommendedActions,
      personalizationNotes: body.personalizationNotes,
      effectivePeriodStart: new Date(),
      effectivePeriodEnd: body.effectivePeriodEnd || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      strategySource: 'manual_update',
      priority: body.priority || 5,
      isActive: true
    })

    // Fetch the newly created strategy
    const [strategy] = await db
      .select()
      .from(customerStrategies)
      .where(eq(customerStrategies.memberId, id))
      .orderBy(desc(customerStrategies.createdAt))
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Strategy updated successfully',
      data: strategy
    })

  } catch (error: any) {
    console.error('Error updating strategy:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
