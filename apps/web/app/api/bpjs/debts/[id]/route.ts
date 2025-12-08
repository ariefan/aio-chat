import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsDebts, bpjsPayments } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET - Get single debt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [debt] = await db
      .select()
      .from(bpjsDebts)
      .where(eq(bpjsDebts.id, id))
      .limit(1)

    if (!debt) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(debt)

  } catch (error) {
    console.error('Failed to fetch debt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch debt' },
      { status: 500 }
    )
  }
}

// PUT - Update debt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      amount,
      dueDate,
      paidAmount,
      status,
      lateFee,
      description,
    } = body

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    }

    if (amount !== undefined) updateData.amount = amount
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate)
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount
    if (status !== undefined) updateData.status = status
    if (lateFee !== undefined) updateData.lateFee = lateFee
    if (description !== undefined) updateData.description = description

    // If marking as paid, set paidAt
    if (status === 'paid' && !updateData.paidAt) {
      updateData.paidAt = new Date()
    }

    const [updated] = await db
      .update(bpjsDebts)
      .set(updateData)
      .where(eq(bpjsDebts.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updated)

  } catch (error) {
    console.error('Failed to update debt:', error)
    return NextResponse.json(
      { error: 'Failed to update debt' },
      { status: 500 }
    )
  }
}

// DELETE - Delete debt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [deleted] = await db
      .delete(bpjsDebts)
      .where(eq(bpjsDebts.id, id))
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete debt:', error)
    return NextResponse.json(
      { error: 'Failed to delete debt' },
      { status: 500 }
    )
  }
}

// POST - Record a payment for this debt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { amount, paymentMethod, paymentRef } = body

    if (!amount) {
      return NextResponse.json(
        { error: 'amount is required' },
        { status: 400 }
      )
    }

    // Get the debt
    const [debt] = await db
      .select()
      .from(bpjsDebts)
      .where(eq(bpjsDebts.id, id))
      .limit(1)

    if (!debt) {
      return NextResponse.json(
        { error: 'Debt not found' },
        { status: 404 }
      )
    }

    // Record payment
    const [payment] = await db
      .insert(bpjsPayments)
      .values({
        debtId: id,
        memberId: debt.memberId,
        amount,
        paymentMethod,
        paymentRef,
        status: 'success',
        paidAt: new Date(),
      })
      .returning()

    // Update debt
    const newPaidAmount = (debt.paidAmount || 0) + amount
    const totalDue = debt.amount + (debt.lateFee || 0)
    const newStatus = newPaidAmount >= totalDue ? 'paid' : 'partial'

    await db
      .update(bpjsDebts)
      .set({
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : debt.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(bpjsDebts.id, id))

    return NextResponse.json({
      payment,
      debtStatus: newStatus,
      totalPaid: newPaidAmount,
    })

  } catch (error) {
    console.error('Failed to record payment:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
