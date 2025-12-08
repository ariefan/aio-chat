import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { bpjsMembers } from '@/db/schema'

interface CsvRow {
  bpjsId: string
  nik: string
  name: string
  phone?: string
  email?: string
  address?: string
  memberClass?: string
  status?: string
}

// POST - Import members from CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data } = body as { data: CsvRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const row of data) {
      try {
        // Validate required fields
        if (!row.bpjsId || !row.nik || !row.name) {
          results.failed++
          results.errors.push(`Row missing required fields: bpjsId=${row.bpjsId}, nik=${row.nik}, name=${row.name}`)
          continue
        }

        // Check if member already exists
        const existing = await db.query.bpjsMembers.findFirst({
          where: (members, { eq }) => eq(members.bpjsId, row.bpjsId)
        })

        if (existing) {
          // Update existing member
          await db
            .update(bpjsMembers)
            .set({
              name: row.name,
              nik: row.nik,
              phone: row.phone || null,
              email: row.email || null,
              address: row.address || null,
              memberClass: row.memberClass || '3',
              status: (row.status as any) || 'active',
              updatedAt: new Date()
            })
            .where((members, { eq }) => eq(members.bpjsId, row.bpjsId))

          results.success++
        } else {
          // Insert new member
          await db
            .insert(bpjsMembers)
            .values({
              bpjsId: row.bpjsId,
              nik: row.nik,
              name: row.name,
              phone: row.phone || null,
              email: row.email || null,
              address: row.address || null,
              memberClass: row.memberClass || '3',
              status: (row.status as any) || 'active'
            })

          results.success++
        }
      } catch (err: any) {
        results.failed++
        results.errors.push(`Error for bpjsId ${row.bpjsId}: ${err.message}`)
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.success} success, ${results.failed} failed`,
      ...results
    })

  } catch (error) {
    console.error('Failed to import members:', error)
    return NextResponse.json(
      { error: 'Failed to import members' },
      { status: 500 }
    )
  }
}
