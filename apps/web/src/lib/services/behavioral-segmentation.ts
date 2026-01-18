import { db } from '@/db'
import {
  bpjsMembers,
  behavioralSegmentations,
  behavioralPersonas,
  bpjsDebts,
  bpjsPayments,
  customerStrategies
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

/**
 * Segmentation Result Interface
 * Contains the complete classification result for a member
 */
export interface SegmentationResult {
  memberId: string
  personaCode: string
  personaName: string
  confidenceScore: number
  paymentProbability: number
  painPoints: string[]
  motivators: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendedStrategy: string
  classificationMethod: string
  classifiedAt: Date
  validUntil: Date
  metadata?: Record<string, any>
}

/**
 * Member Data Interface
 * Contains all relevant data for classification
 */
interface MemberData {
  id: string
  name: string
  credibilityScore: number
  totalArrears: number
  arrearsMonths: number
  brokenPromises: number
  paymentHistory: any[]
  registrationDate: Date
  lastPaymentDate?: Date
  averagePaymentAmount: number
}

/**
 * Classify a member's behavior based on their payment history and other factors
 *
 * @param memberId - UUID of the BPJS member
 * @returns SegmentationResult with persona and recommendations
 */
export async function classifyMemberBehavior(
  memberId: string
): Promise<SegmentationResult> {
  try {
    console.log(`🔍 Classifying member behavior for: ${memberId}`)

    // 1. Fetch member data
    const memberData = await fetchMemberData(memberId)
    if (!memberData) {
      throw new Error(`Member not found: ${memberId}`)
    }

    // 2. Apply classification rules
    const classification = applyClassificationRules(memberData)

    // 3. Generate recommendations
    const segmentation: SegmentationResult = {
      memberId: memberData.id,
      personaCode: classification.personaCode,
      personaName: classification.personaName,
      confidenceScore: classification.confidenceScore,
      paymentProbability: classification.paymentProbability,
      painPoints: classification.painPoints,
      motivators: classification.motivators,
      riskLevel: classification.riskLevel,
      recommendedStrategy: classification.recommendedStrategy,
      classificationMethod: 'rule-based-v1',
      classifiedAt: new Date(),
      validUntil: calculateValidUntil(classification.personaCode),
      metadata: {
        credibilityScore: memberData.credibilityScore,
        arrearsMonths: memberData.arrearsMonths,
        totalArrears: memberData.totalArrears,
        brokenPromises: memberData.brokenPromises,
        averagePaymentAmount: memberData.averagePaymentAmount
      }
    }

    // 4. Save to database
    await saveSegmentation(segmentation)

    // 5. Generate and save strategy
    await generateCustomerStrategy(memberData, segmentation)

    console.log(`✅ Classified ${memberId} as ${segmentation.personaCode} (${segmentation.personaName})`)

    return segmentation

  } catch (error: any) {
    console.error(`❌ Error classifying member ${memberId}:`, error)
    throw error
  }
}

/**
 * Fetch comprehensive member data for classification
 */
async function fetchMemberData(memberId: string): Promise<MemberData | null> {
  try {
    // Fetch member basic info
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.id, memberId))
      .limit(1)

    if (!member) return null

    // Fetch debt data
    const memberDebts = await db
      .select()
      .from(bpjsDebts)
      .where(eq(bpjsDebts.memberId, memberId))

    const totalArrears = memberDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0)

    // Fetch payment history
    const paymentHistory = await db
      .select()
      .from(bpjsPayments)
      .where(eq(bpjsPayments.memberId, memberId))
      .orderBy(desc(bpjsPayments.paidAt))
      .limit(12)

    const lastPaymentDate = paymentHistory[0]?.paidAt
    const averagePaymentAmount = paymentHistory.length > 0
      ? paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0) / paymentHistory.length
      : 0

    // Calculate broken promises from lastPromiseStatus
    const brokenPromises = member.lastPromiseStatus === 'broken' ? (member.lastPromiseDaysOverdue || 0) > 0 ? 1 : 0 : 0

    return {
      id: member.id,
      name: member.name || 'Unknown',
      credibilityScore: member.credibilityScore || 0.5,
      totalArrears: member.totalArrears || totalArrears,
      arrearsMonths: member.arrearsMonths || 0,
      brokenPromises,
      paymentHistory,
      registrationDate: member.createdAt,
      lastPaymentDate: member.lastPaymentDate || lastPaymentDate || undefined,
      averagePaymentAmount
    }

  } catch (error) {
    console.error('Error fetching member data:', error)
    return null
  }
}

/**
 * Apply rule-based classification logic
 */
function applyClassificationRules(data: MemberData) {
  const {
    credibilityScore,
    arrearsMonths,
    totalArrears,
    brokenPromises,
    registrationDate,
    averagePaymentAmount
  } = data

  // Calculate membership age in months
  const membershipAgeMonths = Math.floor(
    (Date.now() - new Date(registrationDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  // ==================== RULES ====================

  // RULE 1: NEW_MEMBER
  // Newly registered members (less than 3 months)
  if (membershipAgeMonths < 3) {
    return {
      personaCode: 'NEW_MEMBER',
      personaName: 'Peserta Baru',
      confidenceScore: 0.95,
      paymentProbability: 0.7,
      painPoints: ['belum_terbiasa_bayar', 'butuh_informasi_cara_bayar'],
      motivators: ['kemudahan_pembayaran', 'autodebet', 'informasi_jelas'],
      riskLevel: 'low' as const,
      recommendedStrategy: 'onboarding_education'
    }
  }

  // RULE 2: RELIABLE_PAYER
  // High credibility score, consistent payments
  if (credibilityScore >= 0.8 && arrearsMonths <= 1) {
    return {
      personaCode: 'RELIABLE_PAYER',
      personaName: 'Penyetia Tepat Waktu',
      confidenceScore: 0.90,
      paymentProbability: 0.95,
      painPoints: ['kadang_lupa', 'sibuk'],
      motivators: ['apresiasi', 'kemudahan', 'prioritas_layanan'],
      riskLevel: 'low' as const,
      recommendedStrategy: 'gentle_reminder'
    }
  }

  // RULE 3: FORGETFUL_PAYER
  // Moderate credibility, small arrears, likely just forgetful
  if (
    credibilityScore >= 0.5 &&
    arrearsMonths <= 2 &&
    brokenPromises <= 1 &&
    averagePaymentAmount > 0
  ) {
    return {
      personaCode: 'FORGETFUL_PAYER',
      personaName: 'Pelupa Rutinitas',
      confidenceScore: 0.75,
      paymentProbability: 0.70,
      painPoints: ['lupa_bayar', 'sibuk', 'tidak_ada_pengingat'],
      motivators: ['autodebet', 'reminder_mendekati_jatuh_tempo', 'kemudahan'],
      riskLevel: 'low' as const,
      recommendedStrategy: 'gentle_reminder'
    }
  }

  // RULE 4: FINANCIAL_STRUGGLE
  // Large arrears, long period without payment
  if (
    arrearsMonths > 6 ||
    totalArrears > 500000 || // > Rp500.000 arrears
    (credibilityScore < 0.5 && arrearsMonths > 3)
  ) {
    return {
      personaCode: 'FINANCIAL_STRUGGLE',
      personaName: 'Kesulitan Finansial',
      confidenceScore: 0.70,
      paymentProbability: 0.40,
      painPoints: ['sulit_finansial', 'penghasilan_tidak_cukup', 'tunggakan_besar'],
      motivators: ['program_rehab', 'cicilan_tunggakan', 'solusi_terjangkau'],
      riskLevel: 'high' as const,
      recommendedStrategy: 'rehabilitation_offer'
    }
  }

  // RULE 5: HARD_COMPLAINER
  // Low credibility, many broken promises
  if (credibilityScore < 0.3 && brokenPromises > 2) {
    return {
      personaCode: 'HARD_COMPLAINER',
      personaName: 'Pemberat Sulit Atur',
      confidenceScore: 0.60,
      paymentProbability: 0.20,
      painPoints: ['keberatan_proses', 'sengketa_biaya', 'tidak_percaya'],
      motivators: ['bukti_transparansi', 'penyelesaian_sengketa', 'pendekatan_tegas'],
      riskLevel: 'critical' as const,
      recommendedStrategy: 'firm_demand'
    }
  }

  // RULE 6: MEDIUM_RISK (Between forgetful and struggle)
  // Moderate issues, needs attention
  if (
    credibilityScore >= 0.4 &&
    credibilityScore < 0.7 &&
    arrearsMonths >= 2 &&
    arrearsMonths <= 5
  ) {
    return {
      personaCode: 'FINANCIAL_STRUGGLE',
      personaName: 'Berisiko Sedang',
      confidenceScore: 0.65,
      paymentProbability: 0.55,
      painPoints: ['terlambat_rutin', 'mulai_menumpuk'],
      motivators: ['pengingat', 'kemudahan', 'opsi_cicilan'],
      riskLevel: 'medium' as const,
      recommendedStrategy: 'urgent_reminder'
    }
  }

  // DEFAULT: UNKNOWN
  // Fallback for unclear cases
  return {
    personaCode: 'UNKNOWN',
    personaName: 'Perlu Analisis Lebih Lanjut',
    confidenceScore: 0.30,
    paymentProbability: 0.50,
    painPoints: ['data_tidak_lengkap', 'perlu_evaluasi'],
    motivators: ['pendekatan_personal', 'evaluasi_komprehensif'],
    riskLevel: 'medium' as const,
    recommendedStrategy: 'investigation'
  }
}

/**
 * Calculate validity period for segmentation
 */
function calculateValidUntil(personaCode: string): Date {
  const now = new Date()

  // Different personas have different validity periods
  switch (personaCode) {
    case 'NEW_MEMBER':
      // New members change quickly - 1 month
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    case 'RELIABLE_PAYER':
      // Reliable members stable - 3 months
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    case 'FORGETFUL_PAYER':
      // Forgetful may change - 2 months
      return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    case 'FINANCIAL_STRUGGLE':
      // Financial situations can change - 1 month
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    case 'HARD_COMPLAINER':
      // Difficult cases need frequent review - 1 month
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    default:
      // Default - 2 months
      return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  }
}

/**
 * Save segmentation result to database
 */
async function saveSegmentation(segmentation: SegmentationResult): Promise<void> {
  try {
    // Insert new segmentation
    await db.insert(behavioralSegmentations).values({
      memberId: segmentation.memberId,
      personaCode: segmentation.personaCode as any,
      confidenceScore: segmentation.confidenceScore,
      paymentProbability: segmentation.paymentProbability,
      painPoints: segmentation.painPoints,
      motivators: segmentation.motivators,
      riskLevel: segmentation.riskLevel,
      classificationMethod: segmentation.classificationMethod,
      classifiedAt: segmentation.classifiedAt,
      validUntil: segmentation.validUntil,
      metadata: segmentation.metadata
    })

    console.log(`💾 Saved segmentation for member ${segmentation.memberId}`)
  } catch (error) {
    console.error('Error saving segmentation:', error)
    throw error
  }
}

/**
 * Generate customer strategy based on segmentation
 */
async function generateCustomerStrategy(
  memberData: MemberData,
  segmentation: SegmentationResult
): Promise<void> {
  try {
    const strategy = buildStrategy(segmentation.personaCode)

    // Insert new strategy
    await db.insert(customerStrategies).values({
      memberId: segmentation.memberId,
      approach: strategy.approach,
      tone: strategy.tone,
      urgency: strategy.urgency,
      recommendedActions: strategy.recommendedActions,
      personalizationNotes: strategy.personalizationNotes,
      effectivePeriodStart: new Date(),
      effectivePeriodEnd: segmentation.validUntil,
      strategySource: 'behavioral-segmentation-v1',
      priority: strategy.priority,
      isActive: true
    })

    console.log(`📋 Generated strategy for member ${segmentation.memberId}`)
  } catch (error) {
    console.error('Error generating strategy:', error)
    throw error
  }
}

/**
 * Build strategy based on persona code
 */
function buildStrategy(personaCode: string) {
  switch (personaCode) {
    case 'NEW_MEMBER':
      return {
        approach: 'educational_onboarding',
        tone: 'friendly_helpful',
        urgency: 'low',
        recommendedActions: [
          'send_welcome_message',
          'explain_payment_methods',
          'offer_autodebet_setup',
          'provide_faq_resources'
        ],
        personalizationNotes: 'Peserta baru, butuh panduan lengkap cara bayar dan manfaat BPJS',
        priority: 7
      }

    case 'RELIABLE_PAYER':
      return {
        approach: 'appreciation_retention',
        tone: 'empathetic_appreciative',
        urgency: 'low',
        recommendedActions: [
          'send_appreciation_message',
          'gentle_payment_reminder',
          'offer_premium_support',
          'provide_exclusive_benefits'
        ],
        personalizationNotes: 'Peserta setia, hargai ketepatan waktu mereka, berikan treatment khusus',
        priority: 5
      }

    case 'FORGETFUL_PAYER':
      return {
        approach: 'friendly_reminder',
        tone: 'friendly_understanding',
        urgency: 'medium',
        recommendedActions: [
          'send_friendly_reminder',
          'highlight_autodebet_benefits',
          'provide_payment_calendar',
          'offer_whatsapp_reminder_setup'
        ],
        personalizationNotes: 'Pelupa rutinitas, butuh pengingat dan kemudahan pembayaran',
        priority: 6
      }

    case 'FINANCIAL_STRUGGLE':
      return {
        approach: 'empathetic_solution',
        tone: 'empathetic_supportive',
        urgency: 'high',
        recommendedActions: [
          'offer_rehabilitation_program',
          'explain_installment_options',
          'provide_financial_counseling',
          'arrange_payment_plan'
        ],
        personalizationNotes: 'Kesulitan finansial, tawarkan program rehab dan solusi terjangkau',
        priority: 9
      }

    case 'HARD_COMPLAINER':
      return {
        approach: 'firm_professional',
        tone: 'firm_professional',
        urgency: 'critical',
        recommendedActions: [
          'clear_communication_of_obligations',
          'explain_consequences',
          'provide_evidence_of_debt',
          'formal_payment_demand'
        ],
        personalizationNotes: 'Sulit diatur, pendekatan tegas dan profesional, dokumen semua interaksi',
        priority: 10
      }

    default:
      return {
        approach: 'standard_collection',
        tone: 'neutral',
        urgency: 'medium',
        recommendedActions: [
          'send_payment_reminder',
          'provide_payment_options',
          'offer_assistance'
        ],
        personalizationNotes: 'Pendekatan standar, evaluasi lebih lanjut diperlukan',
        priority: 5
      }
  }
}

/**
 * Get member segmentation, auto-refresh if expired
 */
export async function getMemberSegmentation(memberId: string): Promise<SegmentationResult | null> {
  try {
    // Fetch latest segmentation
    const [segmentation] = await db
      .select()
      .from(behavioralSegmentations)
      .where(eq(behavioralSegmentations.memberId, memberId))
      .orderBy(desc(behavioralSegmentations.classifiedAt))
      .limit(1)

    // If no segmentation exists, create one
    if (!segmentation) {
      console.log(`No segmentation found for ${memberId}, creating new...`)
      return await classifyMemberBehavior(memberId)
    }

    // Check if segmentation is expired
    const now = new Date()
    const validUntil = new Date(segmentation.validUntil!)

    if (now > validUntil) {
      console.log(`Segmentation expired for ${memberId}, refreshing...`)
      return await classifyMemberBehavior(memberId)
    }

    // Return existing segmentation
    return {
      memberId: segmentation.memberId,
      personaCode: segmentation.personaCode,
      personaName: getPersonaName(segmentation.personaCode),
      confidenceScore: segmentation.confidenceScore || 0,
      paymentProbability: segmentation.paymentProbability || 0.5,
      painPoints: (segmentation.painPoints as any) || [],
      motivators: (segmentation.motivators as any) || [],
      riskLevel: segmentation.riskLevel as any || 'medium',
      recommendedStrategy: 'standard',
      classificationMethod: segmentation.classificationMethod || 'unknown',
      classifiedAt: segmentation.classifiedAt!,
      validUntil: segmentation.validUntil!,
      metadata: (segmentation.metadata as any) || {}
    }

  } catch (error: any) {
    console.error(`Error getting member segmentation:`, error)
    return null
  }
}

/**
 * Bulk reclassify all active members
 */
export async function reclassifyAllMembers(): Promise<{
  total: number
  classified: number
  errors: number
  errorsList: string[]
}> {
  console.log('🔄 Starting bulk member reclassification...')

  try {
    // Fetch all active members
    const members = await db
      .select({ id: bpjsMembers.id })
      .from(bpjsMembers)
      .where(eq(bpjsMembers.status, 'active'))

    console.log(`Found ${members.length} active members to classify`)

    let classified = 0
    let errors = 0
    const errorsList: string[] = []

    for (const member of members) {
      try {
        await classifyMemberBehavior(member.id)
        classified++
      } catch (error: any) {
        console.error(`Error classifying member ${member.id}:`, error)
        errors++
        errorsList.push(`${member.id}: ${error.message}`)
      }
    }

    console.log(`✅ Bulk classification completed: ${classified} classified, ${errors} errors`)

    return {
      total: members.length,
      classified,
      errors,
      errorsList
    }

  } catch (error: any) {
    console.error('Fatal error during bulk classification:', error)
    throw error
  }
}

/**
 * Helper: Get persona display name
 */
function getPersonaName(personaCode: string): string {
  const names: Record<string, string> = {
    'NEW_MEMBER': 'Peserta Baru',
    'RELIABLE_PAYER': 'Penyetia Tepat Waktu',
    'FORGETFUL_PAYER': 'Pelupa Rutinitas',
    'FINANCIAL_STRUGGLE': 'Kesulitan Finansial',
    'HARD_COMPLAINER': 'Pemberat Sulit Atur',
    'UNKNOWN': 'Perlu Analisis Lebih Lanjut'
  }
  return names[personaCode] || personaCode
}

/**
 * Manually override member segmentation
 */
export async function overrideMemberSegmentation(
  memberId: string,
  personaCode: string,
  notes?: string
): Promise<SegmentationResult> {
  try {
    // Fetch member data
    const memberData = await fetchMemberData(memberId)
    if (!memberData) {
      throw new Error(`Member not found: ${memberId}`)
    }

    // Create segmentation with manual override
    const segmentation: SegmentationResult = {
      memberId,
      personaCode,
      personaName: getPersonaName(personaCode),
      confidenceScore: 1.0, // Manual override = 100% confidence
      paymentProbability: 0.5, // Default
      painPoints: [],
      motivators: [],
      riskLevel: 'medium',
      recommendedStrategy: 'manual_override',
      classificationMethod: 'manual_override',
      classifiedAt: new Date(),
      validUntil: calculateValidUntil(personaCode),
      metadata: {
        manualOverride: true,
        overrideNotes: notes,
        originalPersona: null
      }
    }

    // Save to database
    await saveSegmentation(segmentation)

    // Generate new strategy
    await generateCustomerStrategy(memberData, segmentation)

    console.log(`✅ Manually overridden segmentation for ${memberId} to ${personaCode}`)

    return segmentation

  } catch (error) {
    console.error(`Error overriding segmentation for ${memberId}:`, error)
    throw error
  }
}
