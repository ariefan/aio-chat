import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsMembers, bpjsDebts, users } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'

// GET - Fetch full member data for simulation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch member with user data
    const member = await db.query.bpjsMembers.findFirst({
      where: eq(bpjsMembers.id, id),
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Fetch user data if linked
    let userData = null
    if (member.userId) {
      userData = await db.query.users.findFirst({
        where: eq(users.id, member.userId),
      })
    }

    // Fetch debts for arrears calculation
    const debts = await db.query.bpjsDebts.findMany({
      where: eq(bpjsDebts.memberId, id),
      orderBy: [desc(bpjsDebts.periodYear), desc(bpjsDebts.periodMonth)],
    })

    // Calculate billing info from debts
    const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'overdue')
    const totalArrears = activeDebts.reduce((sum, d) => sum + d.amount - (d.paidAmount || 0), 0)
    const arrearsMonths = activeDebts.map(d => `${d.periodMonth}/${d.periodYear}`)

    // Build simulation data structure
    const simulationData = {
      id: member.id,
      pesertaProfile: {
        nokapst_masked: `****${member.bpjsId.slice(-4)}`,
        bpjsId: member.bpjsId,
        nik: member.nik,
        name: member.name,
        status_kepesertaan: member.status || 'active',
        kelas_rawat: member.memberClass || '3',
        pekerjaan: member.occupation || 'Tidak diketahui',
        jumlah_tanggungan: member.dependents || 1,
        phone: member.phone,
        email: member.email,
        address: member.address,
      },
      billingInfo: {
        total_tunggakan: member.totalArrears || totalArrears,
        bulan_menunggak: arrearsMonths.length > 0 ? arrearsMonths : ['Tidak ada'],
        durasi_bulan: member.arrearsMonths || activeDebts.length,
        last_payment_date: member.lastPaymentDate?.toISOString().split('T')[0] || 'Belum pernah',
        last_payment_method: member.lastPaymentMethod || 'N/A',
      },
      claimHistory: {
        last_claim: {
          date: member.lastClaimDate?.toISOString().split('T')[0] || null,
          type: member.lastClaimType || null,
          diagnosis: member.lastClaimDiagnosis || null,
          hospital: member.lastClaimHospital || null,
          claim_amount: member.lastClaimAmount || 0,
        },
      },
      interactionHistory: {
        last_contact: {
          agent_name: member.lastContactAgent || 'Belum ada',
          date: member.lastContactDate?.toISOString().split('T')[0] || 'Belum ada',
          channel: member.lastContactChannel || 'N/A',
          outcome: member.lastContactOutcome || 'N/A',
          alasan_tunggak: member.arrearsReason || 'Belum ada informasi',
        },
      },
      paymentCommitmentHistory: {
        credibility_score: member.credibilityScore || 0.5,
        last_promise: {
          promised_date: member.lastPromiseDate?.toISOString().split('T')[0] || null,
          status: member.lastPromiseStatus || 'none',
          days_overdue: member.lastPromiseDaysOverdue || 0,
        },
      },
      strategy: {
        approach: member.strategyApproach || 'Gentle Reminder + Claim Data Trigger',
        urgency: member.strategyUrgency || 'medium',
        tone: member.strategyTone || 'empathetic',
      },
      user: userData,
      debts: debts,
    }

    return NextResponse.json(simulationData)
  } catch (error) {
    console.error('Failed to fetch member:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member' },
      { status: 500 }
    )
  }
}

// PUT - Update simulation fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    await db
      .update(bpjsMembers)
      .set({
        totalArrears: body.totalArrears,
        arrearsMonths: body.arrearsMonths,
        lastPaymentDate: body.lastPaymentDate ? new Date(body.lastPaymentDate) : null,
        lastPaymentMethod: body.lastPaymentMethod,
        lastClaimDate: body.lastClaimDate ? new Date(body.lastClaimDate) : null,
        lastClaimType: body.lastClaimType,
        lastClaimDiagnosis: body.lastClaimDiagnosis,
        lastClaimHospital: body.lastClaimHospital,
        lastClaimAmount: body.lastClaimAmount,
        lastContactAgent: body.lastContactAgent,
        lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null,
        lastContactChannel: body.lastContactChannel,
        lastContactOutcome: body.lastContactOutcome,
        arrearsReason: body.arrearsReason,
        credibilityScore: body.credibilityScore,
        lastPromiseDate: body.lastPromiseDate ? new Date(body.lastPromiseDate) : null,
        lastPromiseStatus: body.lastPromiseStatus,
        lastPromiseDaysOverdue: body.lastPromiseDaysOverdue,
        strategyApproach: body.strategyApproach,
        strategyUrgency: body.strategyUrgency,
        strategyTone: body.strategyTone,
        occupation: body.occupation,
        dependents: body.dependents,
        updatedAt: new Date(),
      })
      .where(eq(bpjsMembers.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update member:', error)
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    )
  }
}
