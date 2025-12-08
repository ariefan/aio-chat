import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsMembers, bpjsDebts } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

// GET - List all BPJS members
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const search = searchParams.get('search') || ''

    const query = db.select().from(bpjsMembers)

    const whereClause = search
      ? sql`${bpjsMembers.name} ILIKE ${'%' + search + '%'} OR ${bpjsMembers.bpjsId} ILIKE ${'%' + search + '%'}`
      : undefined

    const members = whereClause
      ? await query.where(whereClause).orderBy(desc(bpjsMembers.createdAt)).limit(limit).offset(offset)
      : await query.orderBy(desc(bpjsMembers.createdAt)).limit(limit).offset(offset)

    // Get debt summary for each member
    const membersWithDebt = await Promise.all(
      members.map(async (member) => {
        const debts = await db
          .select()
          .from(bpjsDebts)
          .where(eq(bpjsDebts.memberId, member.id))

        const totalDebt = debts
          .filter(d => d.status === 'active' || d.status === 'overdue')
          .reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)) + (d.lateFee || 0), 0)

        const overdueCount = debts.filter(d => d.status === 'overdue').length

        return {
          ...member,
          totalDebt,
          overdueCount,
          debtCount: debts.length,
        }
      })
    )

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bpjsMembers)

    return NextResponse.json({
      members: membersWithDebt,
      total: countResult?.count || 0,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Failed to fetch BPJS members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}

// POST - Create new BPJS member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      bpjsId,
      name,
      nik,
      phone,
      email,
      address,
      memberClass = '3',
      status = 'active',
    } = body

    if (!bpjsId || !name || !nik) {
      return NextResponse.json(
        { error: 'bpjsId, name, and nik are required' },
        { status: 400 }
      )
    }

    // Check if bpjsId already exists
    const existing = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.bpjsId, bpjsId))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'BPJS ID already exists' },
        { status: 409 }
      )
    }

    const [newMember] = await db
      .insert(bpjsMembers)
      .values({
        bpjsId,
        name,
        nik,
        phone,
        email,
        address,
        memberClass,
        status,
        registeredAt: new Date(),
      })
      .returning()

    return NextResponse.json(newMember, { status: 201 })

  } catch (error) {
    console.error('Failed to create BPJS member:', error)
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    )
  }
}
