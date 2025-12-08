/**
 * Proactive Message Scheduler
 *
 * Handles sending due date reminders to BPJS members via Telegram/WhatsApp
 */

import { db } from '@/db'
import {
  bpjsMembers,
  bpjsDebts,
  proactiveMessages,
  users,
} from '@/db/schema'
import { eq, and, lte, gte, isNull, desc } from 'drizzle-orm'
import { getTelegramAdapter } from '@/lib/messaging/telegram-adapter'

// Message templates for different reminder types
const REMINDER_TEMPLATES = {
  reminder_7d: (name: string, amount: number, dueDate: string) =>
    `Halo Bapak/Ibu ${name},\n\n` +
    `Saya Jenny dari BPJS Kesehatan. Ini adalah pengingat bahwa iuran BPJS Anda sebesar *Rp ${amount.toLocaleString('id-ID')}* akan jatuh tempo pada *${dueDate}*.\n\n` +
    `Mohon segera lakukan pembayaran untuk menghindari denda keterlambatan.\n\n` +
    `Terima kasih atas perhatiannya. 🙏`,

  reminder_3d: (name: string, amount: number, dueDate: string) =>
    `Halo Bapak/Ibu ${name},\n\n` +
    `Pengingat: Iuran BPJS Anda sebesar *Rp ${amount.toLocaleString('id-ID')}* akan jatuh tempo dalam *3 hari* (${dueDate}).\n\n` +
    `Segera lakukan pembayaran melalui:\n` +
    `• Mobile Banking\n` +
    `• ATM\n` +
    `• Minimarket terdekat\n\n` +
    `Butuh bantuan? Ketik nomor BPJS Anda untuk informasi lebih lanjut.\n\n` +
    `Salam,\nJenny - BPJS Kesehatan`,

  reminder_1d: (name: string, amount: number, dueDate: string) =>
    `⚠️ *PENGINGAT PENTING*\n\n` +
    `Halo Bapak/Ibu ${name},\n\n` +
    `Iuran BPJS Anda sebesar *Rp ${amount.toLocaleString('id-ID')}* akan jatuh tempo *BESOK* (${dueDate}).\n\n` +
    `Mohon segera lakukan pembayaran untuk menghindari:\n` +
    `• Denda keterlambatan\n` +
    `• Penonaktifan kartu BPJS\n\n` +
    `Terima kasih.\n\nJenny - BPJS Kesehatan`,

  overdue: (name: string, amount: number, daysOverdue: number) =>
    `⛔ *TUNGGAKAN BPJS*\n\n` +
    `Halo Bapak/Ibu ${name},\n\n` +
    `Iuran BPJS Anda sebesar *Rp ${amount.toLocaleString('id-ID')}* telah *melewati jatuh tempo ${daysOverdue} hari*.\n\n` +
    `Mohon segera lakukan pembayaran untuk mengaktifkan kembali layanan BPJS Kesehatan Anda.\n\n` +
    `Ketik nomor BPJS Anda untuk melihat total tunggakan dan cara pembayaran.\n\n` +
    `Jenny - BPJS Kesehatan`,
}

/**
 * Generate proactive messages for upcoming due dates
 */
export async function generateDueReminders(): Promise<number> {
  const now = new Date()
  let generatedCount = 0

  try {
    // Get all active debts with due dates in the next 7 days
    const upcomingDebts = await db
      .select({
        debt: bpjsDebts,
        member: bpjsMembers,
      })
      .from(bpjsDebts)
      .innerJoin(bpjsMembers, eq(bpjsDebts.memberId, bpjsMembers.id))
      .where(
        and(
          eq(bpjsDebts.status, 'active'),
          lte(bpjsDebts.dueDate, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
          gte(bpjsDebts.dueDate, now)
        )
      )

    for (const { debt, member } of upcomingDebts) {
      // Calculate days until due
      const dueDate = new Date(debt.dueDate)
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

      // Determine message type
      let messageType: string | null = null
      if (daysUntilDue === 7) messageType = 'reminder_7d'
      else if (daysUntilDue === 3) messageType = 'reminder_3d'
      else if (daysUntilDue === 1) messageType = 'reminder_1d'

      if (!messageType) continue

      // Check if this reminder already exists
      const existingReminder = await db
        .select()
        .from(proactiveMessages)
        .where(
          and(
            eq(proactiveMessages.memberId, member.id),
            eq(proactiveMessages.messageType, messageType)
          )
        )
        .limit(1)

      if (existingReminder.length > 0) continue

      // Generate message content
      const template = REMINDER_TEMPLATES[messageType as keyof typeof REMINDER_TEMPLATES]
      const dueDateStr = dueDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const content = template(member.name, debt.amount, dueDateStr)

      // Schedule message
      const scheduledAt = new Date()
      scheduledAt.setHours(9, 0, 0, 0) // Schedule for 9 AM

      await db.insert(proactiveMessages).values({
        memberId: member.id,
        userId: member.userId,
        messageType,
        scheduledAt,
        content,
        status: 'pending',
        metadata: {
          debtId: debt.id,
          daysUntilDue,
          amount: debt.amount,
        },
      })

      generatedCount++
    }

    // Generate overdue reminders
    const overdueDebts = await db
      .select({
        debt: bpjsDebts,
        member: bpjsMembers,
      })
      .from(bpjsDebts)
      .innerJoin(bpjsMembers, eq(bpjsDebts.memberId, bpjsMembers.id))
      .where(
        and(
          eq(bpjsDebts.status, 'active'),
          lte(bpjsDebts.dueDate, now)
        )
      )

    for (const { debt, member } of overdueDebts) {
      const dueDate = new Date(debt.dueDate)
      const daysOverdue = Math.ceil((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))

      // Only send overdue reminder every 3 days
      if (daysOverdue % 3 !== 0) continue

      const messageType = 'overdue'

      // Check if we already sent this reminder recently
      const recentReminder = await db
        .select()
        .from(proactiveMessages)
        .where(
          and(
            eq(proactiveMessages.memberId, member.id),
            eq(proactiveMessages.messageType, messageType),
            gte(proactiveMessages.createdAt, new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000))
          )
        )
        .limit(1)

      if (recentReminder.length > 0) continue

      // Mark debt as overdue
      await db
        .update(bpjsDebts)
        .set({ status: 'overdue', updatedAt: new Date() })
        .where(eq(bpjsDebts.id, debt.id))

      const content = REMINDER_TEMPLATES.overdue(member.name, debt.amount, daysOverdue)

      await db.insert(proactiveMessages).values({
        memberId: member.id,
        userId: member.userId,
        messageType,
        scheduledAt: new Date(),
        content,
        status: 'pending',
        metadata: {
          debtId: debt.id,
          daysOverdue,
          amount: debt.amount,
        },
      })

      generatedCount++
    }

    console.log(`📅 Generated ${generatedCount} proactive reminders`)
    return generatedCount

  } catch (error) {
    console.error('Failed to generate due reminders:', error)
    throw error
  }
}

/**
 * Send pending proactive messages
 */
export async function sendPendingMessages(): Promise<number> {
  let sentCount = 0

  try {
    // Get pending messages that are due to be sent
    const pendingMessages = await db
      .select({
        message: proactiveMessages,
        member: bpjsMembers,
        user: users,
      })
      .from(proactiveMessages)
      .innerJoin(bpjsMembers, eq(proactiveMessages.memberId, bpjsMembers.id))
      .leftJoin(users, eq(proactiveMessages.userId, users.id))
      .where(
        and(
          eq(proactiveMessages.status, 'pending'),
          lte(proactiveMessages.scheduledAt, new Date())
        )
      )
      .limit(50) // Process in batches

    const telegramAdapter = getTelegramAdapter()

    for (const { message, member, user } of pendingMessages) {
      try {
        // Only send if user is linked via Telegram
        if (!user || user.platformType !== 'telegram') {
          console.log(`⏭️ Skipping message for ${member.name} - no Telegram user linked`)
          continue
        }

        // Send message via Telegram
        const chatId = parseInt(user.platformId, 10)
        await telegramAdapter.sendMessage(chatId, message.content, { parse_mode: 'Markdown' })

        // Update message status
        await db
          .update(proactiveMessages)
          .set({
            status: 'sent',
            sentAt: new Date(),
          })
          .where(eq(proactiveMessages.id, message.id))

        sentCount++
        console.log(`✅ Sent proactive message to ${member.name}`)

      } catch (sendError) {
        console.error(`Failed to send message to ${member.name}:`, sendError)

        // Increment retry count
        const newRetryCount = (message.retryCount || 0) + 1
        const status = newRetryCount >= 3 ? 'failed' : 'pending'

        await db
          .update(proactiveMessages)
          .set({
            status,
            retryCount: newRetryCount,
            metadata: {
              ...(message.metadata as object || {}),
              lastError: sendError instanceof Error ? sendError.message : 'Unknown error',
            },
          })
          .where(eq(proactiveMessages.id, message.id))
      }
    }

    console.log(`📤 Sent ${sentCount} proactive messages`)
    return sentCount

  } catch (error) {
    console.error('Failed to send pending messages:', error)
    throw error
  }
}

/**
 * Run scheduler (called by cron job)
 */
export async function runScheduler(): Promise<{
  generated: number
  sent: number
}> {
  console.log('🕐 Running proactive message scheduler...')

  const generated = await generateDueReminders()
  const sent = await sendPendingMessages()

  return { generated, sent }
}

/**
 * Manually trigger proactive message for testing
 */
export async function triggerProactiveMessage(
  memberId: string,
  messageType: 'reminder_7d' | 'reminder_3d' | 'reminder_1d' | 'overdue'
): Promise<boolean> {
  try {
    const [member] = await db
      .select()
      .from(bpjsMembers)
      .where(eq(bpjsMembers.id, memberId))
      .limit(1)

    if (!member) {
      throw new Error('Member not found')
    }

    // Get latest debt
    const [debt] = await db
      .select()
      .from(bpjsDebts)
      .where(eq(bpjsDebts.memberId, memberId))
      .orderBy(desc(bpjsDebts.dueDate))
      .limit(1)

    if (!debt) {
      throw new Error('No debt found for member')
    }

    const template = REMINDER_TEMPLATES[messageType]
    const dueDate = new Date(debt.dueDate)
    const dueDateStr = dueDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let content: string
    if (messageType === 'overdue') {
      const daysOverdue = Math.ceil((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
      content = template(member.name, debt.amount, daysOverdue)
    } else {
      content = template(member.name, debt.amount, dueDateStr)
    }

    // Create immediate message
    await db.insert(proactiveMessages).values({
      memberId: member.id,
      userId: member.userId,
      messageType,
      scheduledAt: new Date(),
      content,
      status: 'pending',
      metadata: {
        debtId: debt.id,
        manual: true,
      },
    })

    // Send immediately
    await sendPendingMessages()

    return true

  } catch (error) {
    console.error('Failed to trigger proactive message:', error)
    return false
  }
}
