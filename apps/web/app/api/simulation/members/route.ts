import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsMembers, users } from '@/db/schema'
import { ilike, or, eq } from 'drizzle-orm'

// GET - Fetch members for dropdown with search
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = db
      .select({
        id: bpjsMembers.id,
        bpjsId: bpjsMembers.bpjsId,
        name: bpjsMembers.name,
        nik: bpjsMembers.nik,
        phone: bpjsMembers.phone,
        email: bpjsMembers.email,
        memberClass: bpjsMembers.memberClass,
        status: bpjsMembers.status,
        userId: bpjsMembers.userId,
        // Simulation fields
        totalArrears: bpjsMembers.totalArrears,
        arrearsMonths: bpjsMembers.arrearsMonths,
        credibilityScore: bpjsMembers.credibilityScore,
        strategyApproach: bpjsMembers.strategyApproach,
        strategyUrgency: bpjsMembers.strategyUrgency,
        occupation: bpjsMembers.occupation,
        dependents: bpjsMembers.dependents,
      })
      .from(bpjsMembers)
      .leftJoin(users, eq(bpjsMembers.userId, users.id))

    if (search) {
      query = query.where(
        or(
          ilike(bpjsMembers.name, `%${search}%`),
          ilike(bpjsMembers.bpjsId, `%${search}%`),
          ilike(bpjsMembers.nik, `%${search}%`)
        )
      ) as typeof query
    }

    const members = await query.limit(limit)

    return NextResponse.json(members)
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
