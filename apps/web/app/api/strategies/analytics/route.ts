import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { customerStrategies, behavioralSegmentations, bpjsMembers } from '@/db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'

// GET /api/strategies/analytics - Strategy performance metrics
export async function GET(request: NextRequest) {
  try {
    // Get persona distribution
    const personaDistribution = await db
      .select({
        personaCode: behavioralSegmentations.personaCode,
        count: sql<number>`COUNT(*)`.mapWith(Number)
      })
      .from(behavioralSegmentations)
      .groupBy(behavioralSegmentations.personaCode)

    // Get risk level distribution
    const riskDistribution = await db
      .select({
        riskLevel: behavioralSegmentations.riskLevel,
        count: sql<number>`COUNT(*)`.mapWith(Number)
      })
      .from(behavioralSegmentations)
      .where(
        eq(behavioralSegmentations.classifiedAt,
          sql`(
            SELECT MAX(classified_at)
            FROM aio_chat_behavioral_segmentations b2
            WHERE b2.member_id = aio_chat_behavioral_segmentations.member_id
          )`
        )
      )
      .groupBy(behavioralSegmentations.riskLevel)

    // Get active strategies by approach type
    const strategiesByApproach = await db
      .select({
        approach: customerStrategies.approach,
        count: sql<number>`COUNT(*)`.mapWith(Number)
      })
      .from(customerStrategies)
      .where(eq(customerStrategies.isActive, true))
      .groupBy(customerStrategies.approach)

    // Get average confidence scores by persona
    const avgConfidenceByPersona = await db
      .select({
        personaCode: behavioralSegmentations.personaCode,
        avgConfidence: sql<number>`AVG(confidence_score)`.mapWith(Number),
        avgPaymentProbability: sql<number>`AVG(payment_probability)`.mapWith(Number)
      })
      .from(behavioralSegmentations)
      .where(
        eq(behavioralSegmentations.classifiedAt,
          sql`(
            SELECT MAX(classified_at)
            FROM aio_chat_behavioral_segmentations b2
            WHERE b2.member_id = aio_chat_behavioral_segmentations.member_id
          )`
        )
      )
      .groupBy(behavioralSegmentations.personaCode)

    // Total members with segmentation
    const [totalSegmented] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT member_id)`.mapWith(Number)
      })
      .from(behavioralSegmentations)

    // Total members
    const [totalMembers] = await db
      .select({
        count: sql<number>`COUNT(*)`.mapWith(Number)
      })
      .from(bpjsMembers)
      .where(eq(bpjsMembers.status, 'active'))

    // Calculate coverage percentage
    const totalMembersCount = totalMembers?.count || 0
    const totalSegmentedCount = totalSegmented?.count || 0
    const coveragePercentage = totalMembersCount > 0
      ? (totalSegmentedCount / totalMembersCount) * 100
      : 0

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalMembers: totalMembersCount,
          totalSegmented: totalSegmentedCount,
          coveragePercentage: Math.round(coveragePercentage * 10) / 10
        },
        personaDistribution: personaDistribution.map(p => ({
          personaCode: p.personaCode,
          count: p.count,
          percentage: totalSegmentedCount > 0
            ? Math.round((p.count / totalSegmentedCount) * 1000) / 10
            : 0
        })),
        riskDistribution: riskDistribution.map(r => ({
          riskLevel: r.riskLevel,
          count: r.count
        })),
        strategiesByApproach: strategiesByApproach.map(s => ({
          approach: s.approach,
          count: s.count
        })),
        avgConfidenceByPersona: avgConfidenceByPersona.map(a => ({
          personaCode: a.personaCode,
          avgConfidence: Math.round(a.avgConfidence * 100) / 100,
          avgPaymentProbability: Math.round(a.avgPaymentProbability * 100) / 100
        }))
      }
    })

  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
