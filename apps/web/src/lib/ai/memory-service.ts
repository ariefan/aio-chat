/**
 * Chatbot Memory Service - Enhanced Context Management
 *
 * This service provides:
 * 1. Conversation summarization for long chats
 * 2. User context/preferences persistence
 * 3. Smart context windowing
 * 4. RAG integration for knowledge retrieval
 * 5. PERSISTENT USER MEMORY - Facts that survive session expiry
 */

import { db } from '@/db'
import { aiChatSessions, aiMessages, users, bpjsMembers, bpjsDebts, messages, conversations } from '@/db/schema'
import { eq, and, desc, sql, or } from 'drizzle-orm'

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationContext {
  userId: string
  platformType: 'telegram' | 'whatsapp'
  summary?: string
  recentMessages: MessageHistoryItem[]
  userProfile?: UserProfile
  bpjsMemberInfo?: BpjsMemberProfile
  lastInteractionAt?: Date
}

export interface MessageHistoryItem {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface UserProfile {
  id: string
  name?: string
  phone?: string
  status: string
  verifiedAt?: Date
  preferences?: Record<string, unknown>
  persistentMemory?: PersistentMemory
}

/**
 * Persistent Memory - Facts about a user that survive across sessions
 * Stored in user.metadata.memory
 */
export interface PersistentMemory {
  // Key facts extracted from conversations
  facts: string[]
  // Last known payment status
  lastPaymentInfo?: {
    date: string
    amount: number
    method: string
  }
  // User's stated reasons for debt (if any)
  debtReasons?: string[]
  // Promises made by user
  promises?: {
    date: string
    promisedPaymentDate: string
    fulfilled: boolean
  }[]
  // Communication preferences
  preferredContactTime?: string
  preferredLanguage?: 'id' | 'en'
  formalityLevel?: 'formal' | 'casual'
  // Sentiment tracking
  lastSentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated'
  // Important notes from operator
  operatorNotes?: string[]
  // Last updated
  updatedAt: string
}

export interface BpjsMemberProfile {
  bpjsId: string
  name: string
  memberClass: string
  status: string
  hasDebt: boolean
  totalDebt: number
}

export interface MemoryConfig {
  maxRecentMessages: number
  summarizeAfterMessages: number
  contextWindowTokens: number
}

const DEFAULT_CONFIG: MemoryConfig = {
  maxRecentMessages: 15,        // Keep last 15 messages in active context
  summarizeAfterMessages: 20,   // Summarize after 20 messages
  contextWindowTokens: 2000,    // Max tokens for context window
}

// =============================================================================
// CONTEXT MANAGEMENT
// =============================================================================

/**
 * Get or create conversation context for a user
 */
export async function getConversationContext(
  userId: string,
  platformType: 'telegram' | 'whatsapp',
  config: Partial<MemoryConfig> = {}
): Promise<ConversationContext> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Get user profile
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  // Get linked BPJS member if verified
  let bpjsMemberInfo: BpjsMemberProfile | undefined
  if (user?.status === 'verified' || user?.status === 'active') {
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.userId, userId))
      .limit(1)

    if (member) {
      // Get total debt from related debts
      // Calculate total debt from bpjs_debts table
      const debts = await db
        .select({
          amount: bpjsDebts.amount,
          paidAmount: bpjsDebts.paidAmount,
          lateFee: bpjsDebts.lateFee,
        })
        .from(bpjsDebts)
        .where(
          and(
            eq(bpjsDebts.memberId, member.id),
            sql`${bpjsDebts.status} IN ('active', 'overdue')`
          )
        )

      const totalDebt = debts.reduce((sum, d) => {
        return sum + (d.amount - (d.paidAmount || 0) + (d.lateFee || 0))
      }, 0)

      bpjsMemberInfo = {
        bpjsId: member.bpjsId,
        name: member.name,
        memberClass: member.memberClass || '3',
        status: member.status || 'active',
        hasDebt: totalDebt > 0,
        totalDebt,
      }
    }
  }

  // Get active AI session
  const [session] = await db
    .select()
    .from(aiChatSessions)
    .where(
      and(
        eq(aiChatSessions.userId, userId),
        eq(aiChatSessions.platformType, platformType),
        sql`${aiChatSessions.endedAt} IS NULL`
      )
    )
    .orderBy(desc(aiChatSessions.lastMessageAt))
    .limit(1)

  // Get recent messages from session
  let recentMessages: MessageHistoryItem[] = []
  let summary: string | undefined

  if (session) {
    // Get conversation summary from session context
    const sessionContext = session.context as Record<string, unknown> | null
    summary = sessionContext?.summary as string | undefined

    // Get recent messages
    const messages = await db
      .select({
        role: aiMessages.role,
        content: aiMessages.content,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, session.id))
      .orderBy(desc(aiMessages.createdAt))
      .limit(cfg.maxRecentMessages)

    recentMessages = messages
      .reverse() // Oldest first
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.createdAt,
      }))
  }

  // Get persistent memory
  const metadata = user?.metadata as Record<string, unknown> | null
  const persistentMemory = (metadata?.memory as PersistentMemory) || undefined

  return {
    userId,
    platformType,
    summary,
    recentMessages,
    userProfile: user ? {
      id: user.id,
      name: user.name ?? undefined,
      phone: user.phone ?? undefined,
      status: user.status || 'pending',
      verifiedAt: user.verifiedAt ?? undefined,
      preferences: metadata?.preferences as Record<string, unknown> | undefined,
      persistentMemory,
    } : undefined,
    bpjsMemberInfo,
    lastInteractionAt: session?.lastMessageAt ?? undefined,
  }
}

/**
 * Build context string for AI prompt
 */
export function buildContextString(context: ConversationContext): string {
  const parts: string[] = []

  // Add user profile context
  if (context.userProfile) {
    const profile = context.userProfile
    parts.push(`[PROFIL PENGGUNA]`)
    if (profile.name) parts.push(`Nama: ${profile.name}`)
    parts.push(`Status: ${profile.status === 'verified' ? 'Terverifikasi' : 'Belum Terverifikasi'}`)
  }

  // Add BPJS member context (CRITICAL for personalization)
  if (context.bpjsMemberInfo) {
    const member = context.bpjsMemberInfo
    parts.push(`\n[DATA PESERTA BPJS]`)
    parts.push(`Nama: ${member.name}`)
    parts.push(`No. BPJS: ${member.bpjsId}`)
    parts.push(`Kelas: ${member.memberClass}`)
    parts.push(`Status Kepesertaan: ${member.status === 'active' ? 'Aktif' : 'Tidak Aktif'}`)
    if (member.hasDebt) {
      parts.push(`Total Tunggakan: Rp ${member.totalDebt.toLocaleString('id-ID')}`)
    } else {
      parts.push(`Tunggakan: Tidak ada`)
    }
  }

  // Add conversation summary if exists
  if (context.summary) {
    parts.push(`\n[RINGKASAN PERCAKAPAN SEBELUMNYA]`)
    parts.push(context.summary)
  }

  return parts.join('\n')
}

/**
 * Format recent messages for AI context
 */
export function formatRecentMessages(
  messages: MessageHistoryItem[],
  maxTokenEstimate: number = 1500
): { role: 'user' | 'assistant'; content: string }[] {
  // Rough token estimate: 1 token ≈ 4 chars for Indonesian
  let totalChars = 0
  const maxChars = maxTokenEstimate * 4
  const result: { role: 'user' | 'assistant'; content: string }[] = []

  // Work backwards from most recent
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!
    if (totalChars + msg.content.length > maxChars) break

    result.unshift({ role: msg.role, content: msg.content })
    totalChars += msg.content.length
  }

  return result
}

// =============================================================================
// CONVERSATION SUMMARIZATION
// =============================================================================

/**
 * Generate a summary of conversation history
 * Uses the AI provider to create a concise summary
 */
export async function generateConversationSummary(
  messages: MessageHistoryItem[],
  existingSummary?: string
): Promise<string> {
  if (messages.length < 5) {
    return existingSummary || ''
  }

  // Format messages for summarization
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Peserta' : 'RICH'}: ${m.content}`)
    .join('\n')

  const prompt = existingSummary
    ? `Ringkasan sebelumnya:\n${existingSummary}\n\nPercakapan baru:\n${conversationText}\n\nBuat ringkasan gabungan yang mencakup poin-poin penting (maksimal 3 kalimat dalam Bahasa Indonesia):`
    : `Ringkas percakapan berikut dalam 2-3 kalimat, fokus pada poin penting dan konteks yang relevan untuk percakapan selanjutnya (dalam Bahasa Indonesia):\n\n${conversationText}`

  // Use the configured AI provider to generate summary
  // This will be called from jenny-ai.ts with the actual AI provider
  return prompt // Return the prompt - actual summarization done by caller
}

/**
 * Update session with new summary
 */
export async function updateSessionSummary(
  sessionId: string,
  summary: string
): Promise<void> {
  await db
    .update(aiChatSessions)
    .set({
      context: sql`
        COALESCE(${aiChatSessions.context}, '{}'::jsonb) ||
        jsonb_build_object('summary', ${summary}, 'summarizedAt', ${new Date().toISOString()})
      `,
    })
    .where(eq(aiChatSessions.id, sessionId))
}

// =============================================================================
// USER PREFERENCES
// =============================================================================

/**
 * Update user preferences based on conversation
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Record<string, unknown>
): Promise<void> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return

  const existingMetadata = (user.metadata as Record<string, unknown>) || {}
  const existingPrefs = (existingMetadata.preferences as Record<string, unknown>) || {}

  await db
    .update(users)
    .set({
      metadata: {
        ...existingMetadata,
        preferences: {
          ...existingPrefs,
          ...preferences,
          updatedAt: new Date().toISOString(),
        },
      },
    })
    .where(eq(users.id, userId))
}

/**
 * Extract user preferences from conversation
 * Called periodically to learn user preferences
 */
export function detectPreferencesFromMessage(message: string): Record<string, unknown> {
  const preferences: Record<string, unknown> = {}

  // Detect language preference
  const hasEnglish = /\b(hello|hi|thanks|please|how|what|when|where)\b/i.test(message)
  const hasIndonesian = /\b(halo|terima kasih|tolong|bagaimana|apa|kapan|dimana)\b/i.test(message)

  if (hasEnglish && !hasIndonesian) {
    preferences.preferredLanguage = 'en'
  } else if (hasIndonesian) {
    preferences.preferredLanguage = 'id'
  }

  // Detect formality preference
  const informal = /\b(gw|lu|gue|lo|dong|sih|nih)\b/i.test(message)
  if (informal) {
    preferences.formalityLevel = 'casual'
  }

  return preferences
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Get or create an AI session for a user
 */
export async function getOrCreateSession(
  userId: string,
  platformType: 'telegram' | 'whatsapp',
  title?: string
): Promise<{ id: string; sessionId: string; isNew: boolean }> {
  // Check for existing active session
  const [existingSession] = await db
    .select()
    .from(aiChatSessions)
    .where(
      and(
        eq(aiChatSessions.userId, userId),
        eq(aiChatSessions.platformType, platformType),
        sql`${aiChatSessions.endedAt} IS NULL`
      )
    )
    .orderBy(desc(aiChatSessions.lastMessageAt))
    .limit(1)

  if (existingSession) {
    // Check if session is stale (more than 24 hours)
    const lastMessage = existingSession.lastMessageAt
    const hoursSinceLastMessage = lastMessage
      ? (Date.now() - lastMessage.getTime()) / (1000 * 60 * 60)
      : 999

    if (hoursSinceLastMessage < 24) {
      return {
        id: existingSession.id,
        sessionId: existingSession.sessionId,
        isNew: false,
      }
    }

    // End stale session
    await db
      .update(aiChatSessions)
      .set({ endedAt: new Date() })
      .where(eq(aiChatSessions.id, existingSession.id))
  }

  // Create new session
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  const [newSession] = await db
    .insert(aiChatSessions)
    .values({
      userId,
      platformType,
      sessionId,
      title: title || 'Percakapan Baru',
      startedAt: new Date(),
      lastMessageAt: new Date(),
    })
    .returning()

  return {
    id: newSession!.id,
    sessionId: newSession!.sessionId,
    isNew: true,
  }
}

/**
 * Store a message in the session
 */
export async function storeSessionMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Find session by sessionId string
  const [session] = await db
    .select()
    .from(aiChatSessions)
    .where(eq(aiChatSessions.sessionId, sessionId))
    .limit(1)

  if (!session) {
    console.error(`Session not found: ${sessionId}`)
    return
  }

  await db.insert(aiMessages).values({
    sessionId: session.id,
    role,
    content,
    metadata,
  })

  // Update session last message time
  await db
    .update(aiChatSessions)
    .set({ lastMessageAt: new Date() })
    .where(eq(aiChatSessions.id, session.id))
}

// =============================================================================
// PERSISTENT USER MEMORY
// =============================================================================

/**
 * Get persistent memory for a user
 */
export async function getPersistentMemory(userId: string): Promise<PersistentMemory | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return null

  const metadata = user.metadata as Record<string, unknown> | null
  return (metadata?.memory as PersistentMemory) || null
}

/**
 * Update persistent memory for a user
 */
export async function updatePersistentMemory(
  userId: string,
  updates: Partial<PersistentMemory>
): Promise<void> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return

  const existingMetadata = (user.metadata as Record<string, unknown>) || {}
  const existingMemory = (existingMetadata.memory as PersistentMemory) || {
    facts: [],
    updatedAt: new Date().toISOString(),
  }

  // Merge updates with existing memory
  const updatedMemory: PersistentMemory = {
    ...existingMemory,
    ...updates,
    // Append facts instead of replacing
    facts: updates.facts
      ? [...new Set([...existingMemory.facts, ...updates.facts])]
      : existingMemory.facts,
    // Append debt reasons instead of replacing
    debtReasons: updates.debtReasons
      ? [...new Set([...(existingMemory.debtReasons || []), ...updates.debtReasons])]
      : existingMemory.debtReasons,
    updatedAt: new Date().toISOString(),
  }

  await db
    .update(users)
    .set({
      metadata: {
        ...existingMetadata,
        memory: updatedMemory,
      },
    })
    .where(eq(users.id, userId))
}

/**
 * Add a fact to user's persistent memory
 */
export async function addUserFact(userId: string, fact: string): Promise<void> {
  await updatePersistentMemory(userId, {
    facts: [fact],
  })
}

/**
 * Extract important facts from a conversation message
 * Called after each user message to learn persistent information
 */
export function extractFactsFromMessage(
  message: string,
  aiResponse: string
): { facts: string[]; sentiment?: PersistentMemory['lastSentiment']; debtReasons?: string[] } {
  const result: {
    facts: string[]
    sentiment?: PersistentMemory['lastSentiment']
    debtReasons?: string[]
  } = { facts: [] }

  const lowerMessage = message.toLowerCase()

  // Detect sentiment
  const negativeWords = ['marah', 'kesal', 'bosan', 'capek', 'susah', 'tidak bisa', 'gagal']
  const positiveWords = ['terima kasih', 'makasih', 'bagus', 'senang', 'baik']
  const frustratedWords = ['sudah bayar', 'kenapa masih', 'selalu', 'terus-terusan']

  if (frustratedWords.some(w => lowerMessage.includes(w))) {
    result.sentiment = 'frustrated'
  } else if (negativeWords.some(w => lowerMessage.includes(w))) {
    result.sentiment = 'negative'
  } else if (positiveWords.some(w => lowerMessage.includes(w))) {
    result.sentiment = 'positive'
  } else {
    result.sentiment = 'neutral'
  }

  // Detect debt reasons
  const debtReasonPatterns = [
    { pattern: /kena phk|di phk|kehilangan pekerjaan/i, reason: 'Kehilangan pekerjaan/PHK' },
    { pattern: /sakit|rumah sakit|opname/i, reason: 'Masalah kesehatan' },
    { pattern: /uang.*habis|tidak.*uang|belum.*gaji/i, reason: 'Kesulitan keuangan' },
    { pattern: /lupa|tidak.*ingat/i, reason: 'Lupa membayar' },
    { pattern: /usaha.*bangkrut|bisnis.*rugi/i, reason: 'Usaha/bisnis bermasalah' },
  ]

  for (const { pattern, reason } of debtReasonPatterns) {
    if (pattern.test(message)) {
      result.debtReasons = [reason]
      result.facts.push(`Alasan tunggakan: ${reason}`)
    }
  }

  // Detect payment promises
  const promisePattern = /akan bayar|janji bayar|besok bayar|minggu depan|bulan depan/i
  if (promisePattern.test(message)) {
    result.facts.push(`Berjanji akan membayar (${new Date().toLocaleDateString('id-ID')})`)
  }

  // Detect contact preferences
  if (/pagi|subuh/i.test(message)) {
    result.facts.push('Preferensi waktu kontak: pagi')
  } else if (/siang/i.test(message)) {
    result.facts.push('Preferensi waktu kontak: siang')
  } else if (/malam|sore/i.test(message)) {
    result.facts.push('Preferensi waktu kontak: sore/malam')
  }

  return result
}

// =============================================================================
// CROSS-SESSION CONTEXT RETRIEVAL
// =============================================================================

/**
 * Get conversation history from all sources (across sessions)
 * This provides context even when AI session has expired
 */
export async function getFullConversationHistory(
  userId: string,
  limit: number = 20
): Promise<MessageHistoryItem[]> {
  // First, try to find the user's conversation
  const [userConv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .limit(1)

  if (!userConv) return []

  // Get messages from the messages table (platform messages)
  const platformMessages = await db
    .select({
      content: messages.content,
      direction: messages.direction,
      sentAt: messages.sentAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, userConv.id))
    .orderBy(desc(messages.sentAt))
    .limit(limit)

  return platformMessages
    .reverse()
    .filter(m => m.content && m.sentAt)
    .map(m => ({
      role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
      content: m.content,
      timestamp: m.sentAt!,
    }))
}

/**
 * Build comprehensive context string including persistent memory
 */
export function buildEnhancedContextString(context: ConversationContext): string {
  const parts: string[] = []

  // Add user profile context
  if (context.userProfile) {
    const profile = context.userProfile
    parts.push(`[PROFIL PENGGUNA]`)
    if (profile.name) parts.push(`Nama: ${profile.name}`)
    parts.push(`Status: ${profile.status === 'verified' ? 'Terverifikasi' : 'Belum Terverifikasi'}`)

    // Add persistent memory if available
    if (profile.persistentMemory) {
      const mem = profile.persistentMemory

      if (mem.facts.length > 0) {
        parts.push(`\n[INFORMASI PENTING YANG DIINGAT]`)
        mem.facts.slice(-5).forEach(f => parts.push(`• ${f}`))
      }

      if (mem.debtReasons && mem.debtReasons.length > 0) {
        parts.push(`Alasan tunggakan yang pernah disebutkan: ${mem.debtReasons.join(', ')}`)
      }

      if (mem.lastSentiment) {
        const sentimentMap = {
          positive: 'positif',
          neutral: 'netral',
          negative: 'negatif',
          frustrated: 'frustrasi'
        }
        parts.push(`Suasana hati terakhir: ${sentimentMap[mem.lastSentiment]}`)
      }

      if (mem.formalityLevel === 'casual') {
        parts.push(`Catatan: Peserta ini lebih nyaman dengan bahasa santai`)
      }
    }
  }

  // Add BPJS member context (CRITICAL for personalization)
  if (context.bpjsMemberInfo) {
    const member = context.bpjsMemberInfo
    parts.push(`\n[DATA PESERTA BPJS]`)
    parts.push(`Nama: ${member.name}`)
    parts.push(`No. BPJS: ${member.bpjsId}`)
    parts.push(`Kelas: ${member.memberClass}`)
    parts.push(`Status Kepesertaan: ${member.status === 'active' ? 'Aktif' : 'Tidak Aktif'}`)
    if (member.hasDebt) {
      parts.push(`Total Tunggakan: Rp ${member.totalDebt.toLocaleString('id-ID')}`)
    } else {
      parts.push(`Tunggakan: Tidak ada`)
    }
  }

  // Add conversation summary if exists
  if (context.summary) {
    parts.push(`\n[RINGKASAN PERCAKAPAN SEBELUMNYA]`)
    parts.push(context.summary)
  }

  return parts.join('\n')
}
