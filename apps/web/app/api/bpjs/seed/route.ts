import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsMembers, bpjsDebts } from '@/db/schema'

// Monthly contribution rates by class (in IDR)
const CONTRIBUTION_RATES: Record<string, number> = {
  '1': 150000,
  '2': 100000,
  '3': 42000,
}

// 10 dummy BPJS members for testing the proactive scheduler
const dummyMembers = [
  {
    bpjsId: '0001111111111',
    name: 'Andi Pratama',
    nik: '3201111111110001',
    phone: '081111111111',
    email: 'andi.pratama@test.com',
    address: 'Jl. Kebon Jeruk No. 1, Jakarta Barat',
    memberClass: '1',
    status: 'active' as const,
  },
  {
    bpjsId: '0002222222222',
    name: 'Rina Susanti',
    nik: '3201111111110002',
    phone: '081222222222',
    email: 'rina.susanti@test.com',
    address: 'Jl. Pluit Raya No. 22, Jakarta Utara',
    memberClass: '2',
    status: 'active' as const,
  },
  {
    bpjsId: '0003333333333',
    name: 'Hendra Gunawan',
    nik: '3201111111110003',
    phone: '081333333333',
    email: 'hendra.gunawan@test.com',
    address: 'Jl. Tebet Raya No. 33, Jakarta Selatan',
    memberClass: '3',
    status: 'active' as const,
  },
  {
    bpjsId: '0004444444444',
    name: 'Maya Putri',
    nik: '3201111111110004',
    phone: '081444444444',
    email: 'maya.putri@test.com',
    address: 'Jl. Cikini Raya No. 44, Jakarta Pusat',
    memberClass: '1',
    status: 'active' as const,
  },
  {
    bpjsId: '0005555555555',
    name: 'Dedi Kurniawan',
    nik: '3201111111110005',
    phone: '081555555555',
    email: 'dedi.kurniawan@test.com',
    address: 'Jl. Dago No. 55, Bandung',
    memberClass: '2',
    status: 'active' as const,
  },
  {
    bpjsId: '0006666666666',
    name: 'Sari Indah',
    nik: '3201111111110006',
    phone: '081666666666',
    email: 'sari.indah@test.com',
    address: 'Jl. Malioboro No. 66, Yogyakarta',
    memberClass: '3',
    status: 'active' as const,
  },
  {
    bpjsId: '0007777777777',
    name: 'Rizky Firmansyah',
    nik: '3201111111110007',
    phone: '081777777777',
    email: 'rizky.firmansyah@test.com',
    address: 'Jl. Pemuda No. 77, Surabaya',
    memberClass: '1',
    status: 'active' as const,
  },
  {
    bpjsId: '0008888888888',
    name: 'Wulan Sari',
    nik: '3201111111110008',
    phone: '081888888888',
    email: 'wulan.sari@test.com',
    address: 'Jl. A. Yani No. 88, Semarang',
    memberClass: '2',
    status: 'active' as const,
  },
  {
    bpjsId: '0009999999999',
    name: 'Bayu Setiawan',
    nik: '3201111111110009',
    phone: '081999999999',
    email: 'bayu.setiawan@test.com',
    address: 'Jl. Sudirman No. 99, Medan',
    memberClass: '3',
    status: 'active' as const,
  },
  {
    bpjsId: '0001010101010',
    name: 'Fitri Handayani',
    nik: '3201111111110010',
    phone: '081010101010',
    email: 'fitri.handayani@test.com',
    address: 'Jl. Gatot Subroto No. 10, Makassar',
    memberClass: '1',
    status: 'active' as const,
  },
]

// Generate debts with specific due dates for testing the scheduler
function generateTestDebts(memberId: string, memberClass: string, memberIndex: number) {
  const debts = []
  const now = new Date()
  const rate = CONTRIBUTION_RATES[memberClass] ?? CONTRIBUTION_RATES['3']!

  // Different due dates for testing scheduler triggers:
  // Members 0-2: Due in 7 days (reminder_7d)
  // Members 3-5: Due in 3 days (reminder_3d)
  // Members 6-7: Due in 1 day (reminder_1d)
  // Members 8-9: Already overdue (overdue reminder)

  let daysOffset: number
  let status: 'active' | 'overdue' = 'active'

  if (memberIndex <= 2) {
    daysOffset = 7 // Due in 7 days
  } else if (memberIndex <= 5) {
    daysOffset = 3 // Due in 3 days
  } else if (memberIndex <= 7) {
    daysOffset = 1 // Due in 1 day
  } else {
    daysOffset = -3 // Overdue by 3 days
    status = 'overdue'
  }

  const dueDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000)
  const currentMonth = dueDate.getMonth() + 1
  const currentYear = dueDate.getFullYear()

  debts.push({
    memberId,
    periodMonth: currentMonth,
    periodYear: currentYear,
    amount: rate,
    dueDate,
    status,
    lateFee: status === 'overdue' ? Math.round(rate * 0.025) : 0,
    description: `Iuran BPJS bulan ${currentMonth}/${currentYear}${status === 'overdue' ? ' (TUNGGAKAN)' : ''}`,
  })

  return debts
}

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Seeding BPJS test data...')

    const insertedMembers = []

    for (let i = 0; i < dummyMembers.length; i++) {
      const member = dummyMembers[i]!

      // Insert member (skip if already exists)
      const [inserted] = await db
        .insert(bpjsMembers)
        .values({
          ...member,
          registeredAt: new Date(),
        })
        .onConflictDoNothing()
        .returning()

      if (inserted) {
        insertedMembers.push({ ...inserted, index: i })
        console.log(`  ✅ Added member: ${member.name} (${member.bpjsId})`)
      }
    }

    // Generate debts for each member
    let totalDebts = 0
    for (const member of insertedMembers) {
      const debts = generateTestDebts(member.id, member.memberClass || '3', member.index)

      for (const debt of debts) {
        await db.insert(bpjsDebts).values(debt)
        totalDebts++
      }

      console.log(`  💵 Generated ${debts.length} debt(s) for ${member.name}`)
    }

    console.log('✅ BPJS test data seeded successfully!')

    return NextResponse.json({
      success: true,
      message: 'BPJS test data seeded successfully',
      data: {
        membersCreated: insertedMembers.length,
        debtsCreated: totalDebts,
        dueDateDistribution: {
          'Due in 7 days (reminder_7d)': 'Members 1-3',
          'Due in 3 days (reminder_3d)': 'Members 4-6',
          'Due in 1 day (reminder_1d)': 'Members 7-8',
          'Overdue (overdue reminder)': 'Members 9-10',
        },
      },
    })
  } catch (error) {
    console.error('❌ Failed to seed BPJS data:', error)
    return NextResponse.json(
      {
        error: 'Failed to seed BPJS data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to seed 10 dummy BPJS members with debts',
    dueDateDistribution: {
      'Members 1-3': 'Due in 7 days - triggers reminder_7d',
      'Members 4-6': 'Due in 3 days - triggers reminder_3d',
      'Members 7-8': 'Due in 1 day - triggers reminder_1d',
      'Members 9-10': 'Overdue by 3 days - triggers overdue reminder',
    },
  })
}
