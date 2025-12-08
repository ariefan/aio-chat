/**
 * Jenny AI Client - BPJS Kesehatan Debt Collection Chatbot
 *
 * Uses OpenRouter API with google/gemma-3-4b-it model
 * Fallback to TogetherAI if configured
 */

import { db } from '@/db'
import { bpjsMembers, bpjsDebts, users } from '@/db/schema'
import { eq, and, desc, gte, lte } from 'drizzle-orm'

// AI Provider configuration
type AIProvider = 'openrouter' | 'togetherai'

const AI_CONFIG = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL || 'google/gemma-3-4b-it',
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  togetherai: {
    baseUrl: 'https://api.together.xyz/v1',
    model: process.env.TOGETHERAI_MODEL || 'google/gemma-2-9b-it',
    apiKey: process.env.TOGETHERAI_API_KEY,
  },
}

// Get the active provider
function getProvider(): AIProvider {
  if (AI_CONFIG.openrouter.apiKey) return 'openrouter'
  if (AI_CONFIG.togetherai.apiKey) return 'togetherai'
  throw new Error('No AI API key configured. Set OPENROUTER_API_KEY or TOGETHERAI_API_KEY')
}

// Jenny's system prompt - Bahasa Indonesia
export const JENNY_SYSTEM_PROMPT = `Kamu adalah Jenny, asisten virtual ramah dari BPJS Kesehatan Indonesia. Tugasmu adalah membantu peserta BPJS dalam hal:

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
"Halo Bapak/Ibu, saya Jenny dari BPJS Kesehatan. Ada yang bisa saya bantu hari ini?"

Ingat: Kamu adalah representasi BPJS Kesehatan, jaga profesionalisme dan keramahan.`

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
  return match ? match[1] : null
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

/**
 * Generate chat completion using OpenRouter/TogetherAI
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
  const provider = getProvider()
  const config = AI_CONFIG[provider]

  const {
    conversationHistory = [],
    temperature = 0.7,
    maxTokens = 1024,
  } = options

  try {
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

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: JENNY_SYSTEM_PROMPT + contextMessage },
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        ...(provider === 'openrouter' && {
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'Jenny BPJS Chatbot',
        }),
      },
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
}> {
  // Check if user is already verified
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const isVerified = user?.status === 'verified' || user?.status === 'active'

  // If verified, check for linked BPJS member
  let existingMemberInfo: BpjsMemberInfo | null = null
  if (isVerified) {
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.userId, userId))
      .limit(1)

    if (member) {
      existingMemberInfo = await verifyBpjsId(member.bpjsId)
    }
  }

  // Generate response
  const result = await generateJennyResponse(message, {
    conversationHistory,
    userId,
    bpjsMemberId: existingMemberInfo?.id,
  })

  // If new member verified, link to user
  if (result.memberInfo && !isVerified) {
    await linkBpjsToUser(result.memberInfo.id, userId)
  }

  return {
    response: result.response,
    memberInfo: result.memberInfo || existingMemberInfo || undefined,
    verified: isVerified || !!result.memberInfo,
  }
}
