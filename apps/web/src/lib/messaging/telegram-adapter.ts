import TelegramBot from 'node-telegram-bot-api'
import { db } from '@/db'
import { users, conversations, messages } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export interface TelegramMessage {
  message_id: number
  from: {
    id: number
    is_bot: boolean
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
  }
  chat: {
    id: number
    first_name?: string
    last_name?: string
    username?: string
    type: 'private' | 'group' | 'supergroup' | 'channel'
  }
  date: number
  text?: string
  photo?: Array<{
    file_id: string
    file_unique_id: string
    file_size: number
    width: number
    height: number
    file_path?: string
  }>
  document?: {
    file_id: string
    file_unique_id: string
    file_name?: string
    mime_type?: string
    file_size: number
    file_path?: string
  }
  audio?: {
    file_id: string
    file_unique_id: string
    duration: number
    performer?: string
    title?: string
    file_name?: string
    mime_type?: string
    file_size: number
    file_path?: string
  }
  video?: {
    file_id: string
    file_unique_id: string
    width: number
    height: number
    duration: number
    thumb?: {
      file_id: string
      file_unique_id: string
      width: number
      height: number
      file_size: number
    }
    file_name?: string
    mime_type?: string
    file_size: number
    file_path?: string
  }
  voice?: {
    file_id: string
    file_unique_id: string
    duration: number
    mime_type?: string
    file_size: number
    file_path?: string
  }
}

export class TelegramAdapter {
  private bot: TelegramBot
  private token: string

  constructor(token: string) {
    this.token = token
    this.bot = new TelegramBot(token, { polling: false })
  }

  async sendMessage(chatId: number, text: string, options?: any) {
    try {
      return await this.bot.sendMessage(chatId, text, options)
    } catch (error) {
      console.error('Failed to send Telegram message:', error)
      throw error
    }
  }

  async sendPhoto(chatId: number, photo: string, caption?: string, options?: any) {
    try {
      return await this.bot.sendPhoto(chatId, photo, { caption, ...options })
    } catch (error) {
      console.error('Failed to send Telegram photo:', error)
      throw error
    }
  }

  async sendDocument(chatId: number, document: string, caption?: string, options?: any) {
    try {
      return await this.bot.sendDocument(chatId, document, { caption, ...options })
    } catch (error) {
      console.error('Failed to send Telegram document:', error)
      throw error
    }
  }

  async handleIncomingMessage(message: TelegramMessage) {
    try {
      // Only handle private messages for POC
      if (message.chat.type !== 'private') {
        console.log('Ignoring non-private message')
        return
      }

      // Extract user information
      const telegramId = message.chat.id.toString()
      const userName = `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}`
      const username = message.from.username

      // Find or create user
      let userData!: typeof users.$inferSelect
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.platformId, telegramId), eq(users.platformType, 'telegram')))
        .limit(1)

      if (existingUser) {
        userData = existingUser
      } else {
        // Create new user
        const [newUser] = await db.insert(users).values({
          platformId: telegramId,
          platformType: 'telegram',
          status: 'pending',
          name: userName || `Telegram User ${message.from.id}`,
          metadata: {
            telegramUserId: message.from.id,
            username,
            firstName: message.from.first_name,
            lastName: message.from.last_name,
            languageCode: message.from.language_code,
          },
        }).returning()
        userData = newUser!
      }

      // Find or create conversation
      let conversationData!: typeof conversations.$inferSelect
      const [existingConversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userData.id))
        .limit(1)

      if (existingConversation) {
        conversationData = existingConversation
      } else {
        const [newConversation] = await db.insert(conversations).values({
          userId: userData.id,
          status: 'active',
          lastMessageAt: new Date(message.date * 1000),
        }).returning()
        conversationData = newConversation!
      }

      // Determine message type and content
      let messageType = 'text'
      let content = ''
      let metadata: any = {}

      if (message.text) {
        messageType = 'text'
        content = message.text
      } else if (message.photo) {
        const lastPhoto = message.photo[message.photo.length - 1]
        if (lastPhoto) {
          messageType = 'image'
          content = `Photo: ${lastPhoto.file_id}`
          metadata = {
            fileId: lastPhoto.file_id,
            fileSize: lastPhoto.file_size || 0,
            width: lastPhoto.width || 0,
            height: lastPhoto.height || 0,
          }
        }
      } else if (message.document) {
        messageType = 'document'
        content = `Document: ${message.document.file_name || 'Untitled'}`
        metadata = {
          fileId: message.document.file_id,
          fileName: message.document.file_name,
          mimeType: message.document.mime_type,
          fileSize: message.document.file_size,
        }
      } else if (message.audio) {
        messageType = 'audio'
        content = `Audio: ${message.audio.title || 'Untitled'}`
        metadata = {
          fileId: message.audio.file_id,
          duration: message.audio.duration,
          performer: message.audio.performer,
          title: message.audio.title,
          mimeType: message.audio.mime_type,
          fileSize: message.audio.file_size,
        }
      } else if (message.video) {
        messageType = 'video'
        content = `Video`
        metadata = {
          fileId: message.video.file_id,
          duration: message.video.duration,
          width: message.video.width,
          height: message.video.height,
          fileName: message.video.file_name,
          mimeType: message.video.mime_type,
          fileSize: message.video.file_size,
        }
      } else if (message.voice) {
        messageType = 'audio'
        content = `Voice message`
        metadata = {
          fileId: message.voice.file_id,
          duration: message.voice.duration,
          mimeType: message.voice.mime_type,
          fileSize: message.voice.file_size,
        }
      }

      // Store message in database
      const [insertedMessage] = await db.insert(messages).values({
        conversationId: conversationData.id,
        platformId: message.message_id.toString(),
        direction: 'inbound',
        content,
        messageType,
        metadata,
        sentAt: new Date(message.date * 1000),
      }).returning()

      // Update conversation last message time
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(message.date * 1000),
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationData.id))

      console.log(`Stored Telegram message from ${userName}: ${content}`)

      // Process message through automation engine
      const { automationIntegration } = await import('@/lib/automation/integration')
      const automationResults = await automationIntegration.processIncomingMessage({
        message: content,
        userId: userData.id,
        conversationId: conversationData.id,
        messageId: insertedMessage?.id || '',
        platformType: 'telegram',
        userName,
      })

      // Only send auto-reply if no automation rules were executed
      if (automationResults.length === 0) {
        if (userData.status === 'pending') {
          await this.sendMessage(
            message.chat.id,
            `Hello ${userName}! 👋\n\nThank you for contacting AIO-CHAT.\n\nI can help you with:\n• Policy information\n• Payment status\n• General inquiries\n\nPlease let me know how I can assist you today!`
          )
        } else if (userData.status === 'verified' || userData.status === 'active') {
          // Simple acknowledgment for verified users
          await this.sendMessage(
            message.chat.id,
            `✅ Message received: "${content}"\n\nI'll get back to you shortly with the information you need.`
          )
        }
      } else {
        console.log(`🤖 Automation executed ${automationResults.length} actions for message from ${userName}`)
      }

    } catch (error) {
      console.error('Failed to handle Telegram message:', error)
      // Try to send error message back to user
      try {
        await this.sendMessage(
          message.chat.id,
          '⚠️ Sorry, I encountered an error processing your message. Please try again later.'
        )
      } catch (sendError) {
        console.error('Failed to send error message:', sendError)
      }
    }
  }

  getFileUrl(fileId: string): string {
    return `https://api.telegram.org/file/bot${this.token}/${fileId}`
  }

  getBotInfo() {
    return this.bot.getMe()
  }
}

// Singleton instance
let telegramAdapter: TelegramAdapter | null = null

export function getTelegramAdapter(): TelegramAdapter {
  if (!telegramAdapter) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required')
    }
    telegramAdapter = new TelegramAdapter(token)
  }
  return telegramAdapter
}