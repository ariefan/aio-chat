import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsDebts, bpjsMembers } from '@/db/schema'
import { eq, desc, sql, and } from 'drizzle-orm'

// GET - List all debts with member info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const memberId = searchParams.get('memberId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const conditions = []
    if (memberId) {
      conditions.push(eq(bpjsDebts.memberId, memberId))
    }
    if (status) {
      conditions.push(eq(bpjsDebts.status, status as any))
    }

    const debts = await db
      .select({
        debt: bpjsDebts,
        member: bpjsMembers,
      })
      .from(bpjsDebts)
      .innerJoin(bpjsMembers, eq(bpjsDebts.memberId, bpjsMembers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bpjsDebts.dueDate))
      .limit(limit)
      .offset(offset)

    const formattedDebts = debts.map(({ debt, member }) => ({
      ...debt,
      memberName: member.name,
      memberBpjsId: member.bpjsId,
      memberClass: member.memberClass,
    }))

    return NextResponse.json({
      debts: formattedDebts,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Failed to fetch debts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debts' },
      { status: 500 }
    )
  }
}

// POST - Create new debt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      memberId,
      periodMonth,
      periodYear,
      amount,
      dueDate,
      status = 'active',
      description,
    } = body

    if (!memberId || !periodMonth || !periodYear || !amount || !dueDate) {
      return NextResponse.json(
        { error: 'memberId, periodMonth, periodYear, amount, and dueDate are required' },
        { status: 400 }
      )
    }

    // Verify member exists
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.id, memberId))
      .limit(1)

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    const [newDebt] = await db
      .insert(bpjsDebts)
      .values({
        memberId,
        periodMonth,
        periodYear,
        amount,
        dueDate: new Date(dueDate),
        status,
        description,
      })
      .returning()

    return NextResponse.json(newDebt, { status: 201 })

  } catch (error) {
    console.error('Failed to create debt:', error)
    return NextResponse.json(
      { error: 'Failed to create debt' },
      { status: 500 }
    )
  }
}
