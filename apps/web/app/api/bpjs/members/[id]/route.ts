import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsMembers, bpjsDebts } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET - Get single member with debts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.id, id))
      .limit(1)

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Get all debts
    const debts = await db
      .select()
      .from(bpjsDebts)
      .where(eq(bpjsDebts.memberId, id))
      .orderBy(desc(bpjsDebts.periodYear), desc(bpjsDebts.periodMonth))

    const totalDebt = debts
      .filter(d => d.status === 'active' || d.status === 'overdue')
      .reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)) + (d.lateFee || 0), 0)

    return NextResponse.json({
      ...member,
      debts,
      totalDebt,
    })

  } catch (error) {
    console.error('Failed to fetch member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    )
  }
}

// PUT - Update member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      name,
      phone,
      email,
      address,
      memberClass,
      status,
    } = body

    const [updated] = await db
      .update(bpjsMembers)
      .set({
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(memberClass && { memberClass }),
        ...(status && { status }),
        updatedAt: new Date(),
      })
      .where(eq(bpjsMembers.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)

  } catch (error) {
    console.error('Failed to update member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}

// DELETE - Delete member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [deleted] = await db
      .delete(bpjsMembers)
      .where(eq(bpjsMembers.id, id))
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete member:', error)
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    )
  }
}
