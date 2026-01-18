import { NextRequest, NextResponse } from 'next/server'
import { getMemberSegmentation, overrideMemberSegmentation } from '@/lib/services/behavioral-segmentation'
import { bpjsMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { db } from '@/db'

// GET /api/members/:id/segmentation - Get member segmentation
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

    // Get or create segmentation
    const segmentation = await getMemberSegmentation(id)

    if (!segmentation) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get segmentation'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: segmentation
    })

  } catch (error: any) {
    console.error('Error getting member segmentation:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// PUT /api/members/:id/segmentation - Manual override segmentation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { personaCode, notes } = body

    if (!personaCode) {
      return NextResponse.json({
        success: false,
        error: 'personaCode is required'
      }, { status: 400 })
    }

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

    console.log(`🎯 Manual override for member ${id} to persona ${personaCode}`)
    const segmentation = await overrideMemberSegmentation(id, personaCode, notes)

    return NextResponse.json({
      success: true,
      message: 'Segmentation overridden successfully',
      data: segmentation
    })

  } catch (error: any) {
    console.error('Error overriding segmentation:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
