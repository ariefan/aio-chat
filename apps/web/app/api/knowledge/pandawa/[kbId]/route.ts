import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { pandawaKnowledgeBase } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/knowledge/pandawa/:kbId - Get specific KB entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const { kbId } = await params

    const [entry] = await db
      .select()
      .from(pandawaKnowledgeBase)
      .where(eq(pandawaKnowledgeBase.kbId, kbId))
      .limit(1)

    if (!entry) {
      return NextResponse.json({
        success: false,
        error: 'KB entry not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: entry
    })

  } catch (error: any) {
    console.error('Error fetching KB entry:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// PUT /api/knowledge/pandawa/:kbId - Update KB entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const { kbId } = await params
    const body = await request.json()

    // Check if entry exists
    const [existing] = await db
      .select()
      .from(pandawaKnowledgeBase)
      .where(eq(pandawaKnowledgeBase.kbId, kbId))
      .limit(1)

    if (!existing) {
      return NextResponse.json({
        success: false,
        error: 'KB entry not found'
      }, { status: 404 })
    }

    // Update entry
    await db
      .update(pandawaKnowledgeBase)
      .set({
        title: body.title,
        summary: body.summary,
        detailContent: body.detailContent,
        faqs: body.faqs,
        keywords: body.keywords,
        priority: body.priority,
        applicablePersonas: body.applicablePersonas,
        lastVerified: new Date(),
        version: (existing.version || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(pandawaKnowledgeBase.kbId, kbId))

    // Fetch updated entry
    const [updated] = await db
      .select()
      .from(pandawaKnowledgeBase)
      .where(eq(pandawaKnowledgeBase.kbId, kbId))
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'KB entry updated successfully',
      data: updated
    })

  } catch (error: any) {
    console.error('Error updating KB entry:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// DELETE /api/knowledge/pandawa/:kbId - Delete KB entry (soft delete by setting isActive=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> }
) {
  try {
    const { kbId } = await params

    // Soft delete
    await db
      .update(pandawaKnowledgeBase)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(pandawaKnowledgeBase.kbId, kbId))

    return NextResponse.json({
      success: true,
      message: 'KB entry deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting KB entry:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
