import { NextRequest, NextResponse } from 'next/server'
import { classifyMemberBehavior, reclassifyAllMembers, overrideMemberSegmentation } from '@/lib/services/behavioral-segmentation'

// POST /api/members/segment - Classify a single member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({
        success: false,
        error: 'memberId is required'
      }, { status: 400 })
    }

    console.log(`📊 Classifying member: ${memberId}`)
    const result = await classifyMemberBehavior(memberId)

    return NextResponse.json({
      success: true,
      message: 'Member classified successfully',
      data: result
    })

  } catch (error: any) {
    console.error('Error classifying member:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// POST /api/members/segment/bulk - Bulk classify all active members
export async function BULK(request: NextRequest) {
  try {
    console.log('🔄 Starting bulk member classification...')

    const result = await reclassifyAllMembers()

    return NextResponse.json({
      success: true,
      message: `Bulk classification completed: ${result.classified} classified, ${result.errors} errors`,
      data: result
    })

  } catch (error: any) {
    console.error('Error during bulk classification:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
