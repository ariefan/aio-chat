/**
 * RICH AI Client - BPJS Kesehatan Debt Collection Chatbot
 *
 * Single provider architecture - switchable via AI_PROVIDER env:
 * - 'openrouter' (default): Uses OpenRouter API
 * - 'togetherai': Uses TogetherAI API
 *
 * Enhanced with:
 * - Conversation memory management
 * - User context persistence
 * - Smart context windowing
 */

import { db } from '@/db'
import { bpjsMembers, bpjsDebts, users, customerStrategies, pandawaKnowledgeBase } from '@/db/schema'
import { eq, and, desc, or } from 'drizzle-orm'
import { getMemberSegmentation, type SegmentationResult } from '../services/behavioral-segmentation'
import {
  getConversationContext,
  buildEnhancedContextString,
  formatRecentMessages,
  getOrCreateSession,
  storeSessionMessage,
  detectPreferencesFromMessage,
  updateUserPreferences,
  extractFactsFromMessage,
  updatePersistentMemory,
  getFullConversationHistory,
  type ConversationContext,
} from './memory-service'

// =============================================================================
// AI Provider Configuration
// =============================================================================

type AIProvider = 'openrouter' | 'togetherai'

interface AIProviderConfig {
  baseUrl: string
  model: string
  apiKey: string
  headers: Record<string, string>
}

function getAIConfig(): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER || 'openrouter') as AIProvider

  if (provider === 'togetherai') {
    const apiKey = process.env.AI_API_KEY || ''
    if (!apiKey) {
      throw new Error('AI_API_KEY is required for TogetherAI')
    }
    return {
      baseUrl: 'https://api.together.xyz/v1',
      model: process.env.AI_MODEL || 'google/gemma-2-9b-it',
      apiKey,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  }

  // Default: OpenRouter
  const apiKey = process.env.AI_API_KEY || ''
  if (!apiKey) {
    throw new Error('AI_API_KEY is required for OpenRouter')
  }
  return {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: process.env.AI_MODEL || 'google/gemma-3-4b-it',
    apiKey,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'RICH BPJS Chatbot',
    },
  }
}

// =============================================================================
// RICH System Prompt (Bahasa Indonesia)
// =============================================================================

export const JENNY_SYSTEM_PROMPT = `Kamu adalah RICH (Research Insight Circle Hub), asisten virtual ramah dari BPJS Kesehatan Indonesia. Tugasmu adalah membantu peserta BPJS dalam hal:

1. **Verifikasi Identitas**: Membantu peserta memverifikasi identitas dengan nomor BPJS/NIK
2. **Informasi Tunggakan**: Memberikan informasi tentang tunggakan iuran dan cara pembayaran
3. **Pengingat Pembayaran**: Mengingatkan peserta tentang jatuh tempo pembayaran
4. **Informasi Umum BPJS**: Menjawab pertanyaan tentang layanan BPJS Kesehatan

**Panduan Komunikasi:**
- Selalu gunakan bahasa Indonesia yang sopan dan ramah
- Panggil peserta dengan "Bapak/Ibu"
- Berikan informasi yang jelas dan akurat
- Jika peserta belum verifikasi, minta mereka menyebutkan nomor BPJS
- Selalu tawarkan bantuan lebih lanjut di akhir percakapan
- Jangan pernah memberikan informasi sensitif tanpa verifikasi

**Format Informasi Tunggakan:**
Saat memberikan informasi tunggakan, gunakan format:
- Periode: [bulan/tahun]
- Jumlah: Rp [nominal]
- Jatuh Tempo: [tanggal]
- Status: [aktif/terlambat]

**Jika peserta belum terverifikasi:**
Minta mereka menyebutkan nomor BPJS (13 digit) untuk verifikasi.

**Contoh pembuka:**
"Halo Bapak/Ibu, saya RICH dari BPJS Kesehatan. Ada yang bisa saya bantu hari ini?"

Ingat: Kamu adalah representasi BPJS Kesehatan, jaga profesionalisme dan keramahan.`

// =============================================================================
// PANDAWA System Prompts (Enhanced Behavioral-Based)
// =============================================================================

/**
 * Get persona-specific instructions for communication style
 */
function getPersonaSpecificInstructions(personaCode: string): string {
  const instructions: Record<string, string> = {
    'NEW_MEMBER': `
**APPROACH FOR NEW MEMBER (Peserta Baru):**
- Fokus pada EDUKASI dan PANDUAN
- Jelaskan cara pembayaran dengan sangat jelas
- Tawarkan bantuan setting autodebet
- Ramah, sabar, dan informatif
- Prioritas: Membuat mereka nyaman dan paham sistem
`,

    'RELIABLE_PAYER': `
**APPROACH FOR RELIABLE PAYER (Penyetia Tepat Waktu):**
- Berikan APRESIASI atas ketepatan pembayaran
- Gunakan bahakan yang sopan dan hangat
- Low pressure, gentle reminders only
- Fokus pada retensi dan loyalitas
- Tone: Appreciative, warm, professional
- Prioritas: Mempertahankan loyalitas dan kepuasan
`,

    'FORGETFUL_PAYER': `
**APPROACH FOR FORGETFUL PAYER (Pelupa Rutinitas):**
- Fokus pada REMINDER dan KEMUDAHAN
- Tawarkan solusi praktis: autodebet, pengingat WhatsApp
- Jangan menghakimi, gunakan tone understanding
- Berikan tips agar tidak lupa bayar
- Tone: Friendly, helpful, non-judgmental
- Prioritas: Membantu mereka ingat dan memudahkan pembayaran
`,

    'FINANCIAL_STRUGGLE': `
**APPROACH FOR FINANCIAL STRUGGLE (Kesulitan Finansial):**
- Tampilkan EMPATI dan SOLUSI
- Jangan menekan atau mengancam
- Tawarkan program rehabilitasi tunggakan
- Jelaskan opsi cicilan terjangkau
- Fokus pada solusi, bukan masalah
- Tone: Empathetic, supportive, solution-oriented
- Prioritas: Membantu mereka menemukan solusi yang realistis
`,

    'HARD_COMPLAINER': `
**APPROACH FOR HARD COMPLAINER (Pemberat Sulit Atur):**
- Tetap PROFESSIONAL dan TEGAS
- Fokus pada fakta dan konsekuensi
- Dokumentasikan semua interaksi
- Jangan terpancing emosi
- Berikan bukti tagihan yang jelas
- Tone: Firm, professional, factual
- Prioritas: Menegakkan kewajiban dengan tetap sopan
`,

    'UNKNOWN': `
**APPROACH FOR UNKNOWN (Perlu Analisis Lebih Lanjut):**
- Gunakan pendekatan STANDAR
- Kumpulkan informasi lebih banyak
- Evaluasi respons dan preferensi
- Tone: Neutral, professional
- Prioritas: Memahami situasi peserta
`
  }

  return instructions[personaCode] || instructions['UNKNOWN'] || ''
}

/**
 * Fetch relevant KB entries based on persona
 */
async function getRelevantKBEntries(personaCode: string, query?: string): Promise<any[]> {
  try {
    // Build where clause for applicable personas
    const applicablePersonasClause = query
      ? or(
          eq(pandawaKnowledgeBase.applicablePersonas, JSON.stringify([personaCode])),
          eq(pandawaKnowledgeBase.applicablePersonas, JSON.stringify(['ALL']))
        )
      : or(
          eq(pandawaKnowledgeBase.applicablePersonas, JSON.stringify([personaCode])),
          eq(pandawaKnowledgeBase.applicablePersonas, JSON.stringify(['ALL'])),
          eq(pandawaKnowledgeBase.applicablePersonas, JSON.stringify(['NEW_MEMBER', 'RELIABLE_PAYER', 'FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE']))
        )

    const entries = await db
      .select()
      .from(pandawaKnowledgeBase)
      .where(
        and(
          applicablePersonasClause!,
          eq(pandawaKnowledgeBase.isActive, true)
        )
      )
      .orderBy(desc(pandawaKnowledgeBase.priority))
      .limit(10)

    return entries
  } catch (error) {
    console.error('Error fetching KB entries:', error)
    return []
  }
}

/**
 * Build PANDAWA-style system prompt with behavioral segmentation
 */
export async function buildPandawaSystemPrompt(
  memberId: string,
  memberInfo: BpjsMemberInfo
): Promise<string> {
  try {
    // Get behavioral segmentation
    const segmentation = await getMemberSegmentation(memberId)

    if (!segmentation) {
      // Fallback to legacy prompt if segmentation fails
      console.warn('Segmentation not available, using legacy prompt')
      return JENNY_SYSTEM_PROMPT
    }

    // Get customer strategy
    const [strategy] = await db
      .select()
      .from(customerStrategies)
      .where(
        and(
          eq(customerStrategies.memberId, memberId),
          eq(customerStrategies.isActive, true)
        )
      )
      .orderBy(desc(customerStrategies.createdAt))
      .limit(1)

    // Get relevant KB entries based on persona
    const kbEntries = await getRelevantKBEntries(segmentation.personaCode)

    // Build KB summary
    const kbSummary = kbEntries.map(entry => {
      const faqs = entry.faqs ? (entry.faqs as any[]).slice(0, 2).map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n') : ''
      return `**${entry.kbId} - ${entry.title}**\n${entry.summary}\n${faqs}\n`
    }).join('\n')

    // Build persona-specific instructions
    const personaInstructions = getPersonaSpecificInstructions(segmentation.personaCode)

    // Construct PANDAWA prompt
    const pandawaPrompt = `
Anda adalah PANDAWA (Pelayanan Administrasi Melalui Whatsapp), asisten virtual cerdas dari BPJS Kesehatan.

${personaInstructions}

========== PROFIL PESERTA ==========
Nama: ${memberInfo.name}
No. BPJS: ${memberInfo.bpjsId}
Kelas Rawat: ${memberInfo.memberClass}
Status: ${memberInfo.status === 'active' ? 'AKTIF' : 'TIDAK AKTIF'}

========== DATA TAGIHAN ==========
Total Tunggakan: Rp ${memberInfo.totalDebt.toLocaleString('id-ID')}
Jumlah Bulan Menunggak: ${memberInfo.debts.length} bulan
${memberInfo.debts.length > 0 ? `Detail: ${memberInfo.debts.map(d => `${d.periodMonth}/${d.periodYear} - Rp ${d.amount.toLocaleString('id-ID')}`).join(', ')}` : 'Tidak ada tunggakan'}

========== SEGMENTASI PERILAKU ==========
Persona: ${segmentation.personaName} (${segmentation.personaCode})
Tingkat Risiko: ${segmentation.riskLevel}
Probabilitas Pembayaran: ${(segmentation.paymentProbability * 100).toFixed(0)}%
Poin Nyeri: ${(segmentation.painPoints as string[]).join(', ') || '-'}
Motivator: ${(segmentation.motivators as string[]).join(', ') || '-'}

========== STRATEGI KOMUNIKASI ==========
${strategy ? `
Pendekatan: ${strategy.approach}
Tone: ${strategy.tone}
Urgensi: ${strategy.urgency}
Catatan Personalisasi: ${strategy.personalizationNotes || '-'}
Aksi yang Direkomendasikan:
${(strategy.recommendedActions as string[]).map((action, i) => `${i + 1}. ${action}`).join('\n')}
` : 'Menggunakan strategi default'}

========== BASIS PENGETAHUAN (KB) ==========
${kbSummary || 'Menggunakan pengetahuan umum BPJS Kesehatan'}

========== INSTRUKSI KHUSUS ==========
${segmentation.recommendedStrategy === 'rehabilitation_offer' ? '✋ TAWARKAN PROGRAM REHABILITASI TUNGGAKAN dengan cara dicicil hingga 24 bulan, bebas denda!' : ''}
${segmentation.recommendedStrategy === 'gentle_reminder' ? '💚 Berikan pengingat yang RAMAH dan HANGAT. Jangan menekan.' : ''}
${segmentation.recommendedStrategy === 'firm_demand' ? '⚠️ Pendekatan TEGAS dan FAKTUAL. Fokus pada konsekuensi dan kewajiban.' : ''}
${segmentation.recommendedStrategy === 'onboarding_education' ? '🎓 Fokus pada EDUKASI lengkap untuk peserta baru. Jelaskan semuanya dengan detail.' : ''}

========== GAYA BICARA ==========
- Gunakan Bahasa Indonesia yang sopan, ramah, dan solutif
- Panggil peserta dengan "Bapak/Ibu"
- Sesuaikan gaya bicara dengan persona peserta (lihat instruksi khusus di atas)
- Berikan informasi yang jelas dan akurat
- Jangan memberikan format JSON atau tag khusus
- Berikan jawaban dalam bentuk teks Markdown yang rapi

${segmentation.personaCode === 'FINANCIAL_STRUGGLE' ? `
💡 PESERTA INI SEDANG KESULITAN FINANSIAL:
- Tampilkan EMPATI yang tulus
- Jangan menekan atau mengancam
- Tawarkan SOLUSI nyata: Program Rehabilitasi Tunggakan
- Informasikan bahwa cicilan bisa hingga 24 bulan, bebas denda
- Fokus pada BANTUAN, bukan penagihan
` : ''}

${segmentation.personaCode === 'RELIABLE_PAYER' ? `
⭐ PESERTA INI ADALAH PENYETIA TEPAT WAKTU:
- Berikan APRESIASI atas kepatuhan mereka
- Perlakukan seperti VIP
- Low pressure, hanya pengingat ramah
- Mereka adalah aset berharga BPJS
` : ''}

${segmentation.personaCode === 'FORGETFUL_PAYER' ? `
⏰ PESERTA INI CENDERUNG LUPA BAYAR:
- Tawarkan solusi PRAKTIS: autodebit, reminder WhatsApp
- Jangan menghakimi, mereka bukan orang jahat
- Fokus pada KEMUDAHAN dan PENGINGAT
- Bantu mereka agar tidak lupa lagi
` : ''}

${segmentation.riskLevel === 'high' || segmentation.riskLevel === 'critical' ? `
⚠️ PERHATIAN: Risiko tinggi, perlu pendekatan khusus
- Perhatikan instruksi persona di atas dengan seksama
- Jika peserta marah, tetap profesional dan tenang
- Fokus pada solusi, bukan masalah
` : ''}

Ingat: Kamu adalah representasi BPJS Kesehatan. Gunakan pendekatan yang TEPAT untuk persona ini.
`

    return pandawaPrompt

  } catch (error) {
    console.error('Error building PANDAWA prompt:', error)
    // Fallback to legacy prompt
    return JENNY_SYSTEM_PROMPT
  }
}

// =============================================================================
// Types
// =============================================================================

export interface JennyChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface JennyChatOptions {
  conversationHistory?: JennyChatMessage[]
  userId?: string
  bpjsMemberId?: string
  temperature?: number
  maxTokens?: number
  contextString?: string // Pre-built context from memory service
  systemPromptOverride?: string // PANDAWA prompt override
}

export interface BpjsMemberInfo {
  id: string
  bpjsId: string
  name: string
  memberClass: string
  status: string
  debts: {
    id: string
    periodMonth: number
    periodYear: number
    amount: number
    dueDate: Date
    status: string
    lateFee: number
  }[]
  totalDebt: number
}

// =============================================================================
// BPJS Verification Functions
// =============================================================================

/**
 * Verify BPJS ID and return member info
 */
export async function verifyBpjsId(bpjsId: string): Promise<BpjsMemberInfo | null> {
  try {
    // Clean the BPJS ID (remove spaces, dashes)
    const cleanId = bpjsId.replace(/[\s-]/g, '')

    // Look up the member
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.bpjsId, cleanId))
      .limit(1)

    if (!member) return null

    // Get active/overdue debts
    const debts = await db
      .select()
      .from(bpjsDebts)
      .where(
        and(
          eq(bpjsDebts.memberId, member.id),
          eq(bpjsDebts.status, 'active')
        )
      )
      .orderBy(desc(bpjsDebts.periodYear), desc(bpjsDebts.periodMonth))

    // Also get overdue debts
    const overdueDebts = await db
      .select()
      .from(bpjsDebts)
      .where(
        and(
          eq(bpjsDebts.memberId, member.id),
          eq(bpjsDebts.status, 'overdue')
        )
      )
      .orderBy(desc(bpjsDebts.periodYear), desc(bpjsDebts.periodMonth))

    const allDebts = [...debts, ...overdueDebts]
    const totalDebt = allDebts.reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)) + (d.lateFee || 0), 0)

    return {
      id: member.id,
      bpjsId: member.bpjsId,
      name: member.name,
      memberClass: member.memberClass || '3',
      status: member.status || 'active',
      debts: allDebts.map(d => ({
        id: d.id,
        periodMonth: d.periodMonth,
        periodYear: d.periodYear,
        amount: d.amount,
        dueDate: d.dueDate,
        status: d.status || 'active',
        lateFee: d.lateFee || 0,
      })),
      totalDebt,
    }
  } catch (error) {
    console.error('Failed to verify BPJS ID:', error)
    return null
  }
}

/**
 * Link a verified BPJS member to a chat user
 */
export async function linkBpjsToUser(bpjsMemberId: string, userId: string): Promise<boolean> {
  try {
    await db
      .update(bpjsMembers)
      .set({ userId })
      .where(eq(bpjsMembers.id, bpjsMemberId))

    // Update user status to verified
    await db
      .update(users)
      .set({
        status: 'verified',
        verifiedAt: new Date(),
      })
      .where(eq(users.id, userId))

    return true
  } catch (error) {
    console.error('Failed to link BPJS to user:', error)
    return false
  }
}

/**
 * Extract BPJS ID from message text
 */
export function extractBpjsId(text: string): string | null {
  // Look for 13-digit number (typical BPJS ID format)
  const match = text.match(/\b(\d{13})\b/)
  return match ? match[1] ?? null : null
}

/**
 * Format debt information for display
 */
export function formatDebtInfo(memberInfo: BpjsMemberInfo): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  let message = `**Informasi Peserta BPJS**\n`
  message += `Nama: ${memberInfo.name}\n`
  message += `No. BPJS: ${memberInfo.bpjsId}\n`
  message += `Kelas: ${memberInfo.memberClass}\n`
  message += `Status: ${memberInfo.status === 'active' ? 'Aktif' : 'Tidak Aktif'}\n\n`

  if (memberInfo.debts.length === 0) {
    message += `Tidak ada tunggakan iuran. Terima kasih telah membayar tepat waktu!`
  } else {
    message += `**Rincian Tunggakan:**\n`
    for (const debt of memberInfo.debts) {
      const monthName = months[debt.periodMonth - 1]
      const dueDate = new Date(debt.dueDate).toLocaleDateString('id-ID')
      const statusText = debt.status === 'overdue' ? '(Terlambat)' : ''

      message += `\n- Periode: ${monthName} ${debt.periodYear}\n`
      message += `  Jumlah: Rp ${debt.amount.toLocaleString('id-ID')}\n`
      if (debt.lateFee > 0) {
        message += `  Denda: Rp ${debt.lateFee.toLocaleString('id-ID')}\n`
      }
      message += `  Jatuh Tempo: ${dueDate} ${statusText}\n`
    }

    message += `\n**Total Tunggakan: Rp ${memberInfo.totalDebt.toLocaleString('id-ID')}**\n`
    message += `\nSilakan lakukan pembayaran melalui:\n`
    message += `- Mobile Banking\n`
    message += `- ATM\n`
    message += `- Kantor BPJS Kesehatan terdekat\n`
    message += `- Minimarket (Indomaret, Alfamart)`
  }

  return message
}

// =============================================================================
// AI Chat Functions
// =============================================================================

/**
 * Generate chat completion using configured AI provider
 */
export async function generateJennyResponse(
  userMessage: string,
  options: JennyChatOptions = {}
): Promise<{
  response: string
  model: string
  tokensUsed?: number
  memberInfo?: BpjsMemberInfo
}> {
  const {
    conversationHistory = [],
    temperature = 0.7,
    maxTokens = 1024,
    contextString = '',
    systemPromptOverride,
  } = options

  try {
    const config = getAIConfig()

    // Use PANDAWA prompt if provided, otherwise use legacy prompt
    const baseSystemPrompt = systemPromptOverride || JENNY_SYSTEM_PROMPT

    // Check if user is mentioning BPJS ID for verification
    const extractedBpjsId = extractBpjsId(userMessage)
    let memberInfo: BpjsMemberInfo | null = null
    let contextMessage = ''

    if (extractedBpjsId) {
      memberInfo = await verifyBpjsId(extractedBpjsId)
      if (memberInfo) {
        contextMessage = `\n\n[KONTEKS SISTEM: Peserta terverifikasi. Data peserta:\n${formatDebtInfo(memberInfo)}]`
      } else {
        contextMessage = `\n\n[KONTEKS SISTEM: Nomor BPJS ${extractedBpjsId} tidak ditemukan dalam sistem. Minta peserta untuk memastikan nomor BPJS sudah benar.]`
      }
    }

    // Add pre-built context from memory service if available
    if (contextString) {
      contextMessage = `\n\n${contextString}${contextMessage}`
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: baseSystemPrompt + contextMessage },
    ]

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage })

    // Make API request
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('AI API error:', error)
      throw new Error(`AI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || 'Maaf, terjadi kesalahan. Silakan coba lagi.'

    return {
      response: aiResponse,
      model: config.model,
      tokensUsed: data.usage?.total_tokens,
      memberInfo: memberInfo || undefined,
    }

  } catch (error) {
    console.error('Failed to generate Jenny response:', error)
    return {
      response: 'Mohon maaf, sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi atau hubungi kantor BPJS Kesehatan terdekat.',
      model: 'fallback',
    }
  }
}

/**
 * Handle incoming message from Telegram/WhatsApp
 * Enhanced with conversation memory and context management
 */
export async function handleJennyMessage(
  message: string,
  userId: string,
  platformType: 'telegram' | 'whatsapp',
  conversationHistory: JennyChatMessage[] = []
): Promise<{
  response: string
  memberInfo?: BpjsMemberInfo
  verified: boolean
  sessionId?: string
}> {
  try {
    // Get or create AI session for persistent memory
    const session = await getOrCreateSession(userId, platformType, message.slice(0, 50))

    // Get full conversation context from memory service
    const context = await getConversationContext(userId, platformType)

    // Detect and store user preferences
    const detectedPrefs = detectPreferencesFromMessage(message)
    if (Object.keys(detectedPrefs).length > 0) {
      await updateUserPreferences(userId, detectedPrefs)
    }

    // Check if user is already verified
    const isVerified = context.userProfile?.status === 'verified' || context.userProfile?.status === 'active'

    // Get existing BPJS member info from context
    let existingMemberInfo: BpjsMemberInfo | null = null
    if (context.bpjsMemberInfo) {
      // We already have context, use it to avoid duplicate DB queries
      existingMemberInfo = await verifyBpjsId(context.bpjsMemberInfo.bpjsId)
    }

    // Build enhanced conversation history from memory
    const memoryBasedHistory = formatRecentMessages(context.recentMessages, 1500)

    // If memory-based history is empty (new session), get full history from messages table
    let fullHistory = memoryBasedHistory
    if (memoryBasedHistory.length === 0) {
      const crossSessionHistory = await getFullConversationHistory(userId, 15)
      fullHistory = crossSessionHistory.map(m => ({
        role: m.role,
        content: m.content,
      }))
    }

    // Merge with any provided history (give priority to memory-based)
    const enhancedHistory: JennyChatMessage[] = [
      ...fullHistory.map(m => ({ role: m.role, content: m.content })),
      // Add any new messages from provided history that aren't in memory
      ...conversationHistory.filter(h =>
        !fullHistory.some(m => m.content === h.content)
      ),
    ]

    // Build ENHANCED context string with persistent memory
    const contextString = buildEnhancedContextString(context)

    // Build PANDAWA prompt for verified members (behavioral segmentation + KB injection)
    let pandawaPrompt: string | undefined
    if (existingMemberInfo && isVerified) {
      try {
        console.log(`🎭 Building PANDAWA prompt for verified member: ${existingMemberInfo.id}`)
        pandawaPrompt = await buildPandawaSystemPrompt(existingMemberInfo.id, existingMemberInfo)
        console.log(`✅ PANDAWA prompt ready for ${existingMemberInfo.name}`)
      } catch (error) {
        console.error('Error building PANDAWA prompt, using legacy:', error)
        // Fall back to legacy prompt
      }
    }

    // Generate response with enhanced context
    const result = await generateJennyResponse(message, {
      conversationHistory: enhancedHistory,
      userId,
      bpjsMemberId: existingMemberInfo?.id,
      contextString, // Pass the built context
      systemPromptOverride: pandawaPrompt, // Use PANDAWA prompt if available
    })

    // Store messages in session for future context
    await storeSessionMessage(session.sessionId, 'user', message, {
      timestamp: new Date().toISOString(),
    })
    await storeSessionMessage(session.sessionId, 'assistant', result.response, {
      model: result.model,
      tokensUsed: result.tokensUsed,
      memberVerified: !!result.memberInfo,
    })

    // Extract and store important facts from the conversation (PERSISTENT MEMORY)
    const extractedInfo = extractFactsFromMessage(message, result.response)
    if (extractedInfo.facts.length > 0 || extractedInfo.sentiment || extractedInfo.debtReasons) {
      await updatePersistentMemory(userId, {
        facts: extractedInfo.facts,
        lastSentiment: extractedInfo.sentiment,
        debtReasons: extractedInfo.debtReasons,
      })
    }

    // If new member verified, link to user
    if (result.memberInfo && !isVerified) {
      await linkBpjsToUser(result.memberInfo.id, userId)
    }

    return {
      response: result.response,
      memberInfo: result.memberInfo || existingMemberInfo || undefined,
      verified: isVerified || !!result.memberInfo,
      sessionId: session.sessionId,
    }
  } catch (error) {
    console.error('Error in handleJennyMessage:', error)

    // Graceful fallback
    return {
      response: 'Mohon maaf, sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi atau hubungi kantor BPJS Kesehatan terdekat.',
      verified: false,
    }
  }
}
