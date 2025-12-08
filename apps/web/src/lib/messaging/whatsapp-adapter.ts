/**
 * WhatsApp Cloud API Adapter
 * Handles incoming/outgoing messages via Meta's WhatsApp Business API
 */

import { db } from '@/db'
import { users, conversations, messages } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { handleJennyMessage, type JennyChatMessage } from '@/lib/ai/jenny-ai'

// WhatsApp Cloud API Types
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account'
  entry: WhatsAppEntry[]
}

export interface WhatsAppEntry {
  id: string
  changes: WhatsAppChange[]
}

export interface WhatsAppChange {
  value: {
    messaging_product: 'whatsapp'
    metadata: {
      display_phone_number: string
      phone_number_id: string
    }
    contacts?: WhatsAppContact[]
    messages?: WhatsAppMessage[]
    statuses?: WhatsAppStatus[]
  }
  field: string
}

export interface WhatsAppContact {
  profile: {
    name: string
  }
  wa_id: string
}

export interface WhatsAppMessage {
  from: string
  id: string
  timestamp: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive' | 'button' | 'reaction'
  text?: {
    body: string
  }
  image?: WhatsAppMedia
  audio?: WhatsAppMedia
  video?: WhatsAppMedia
  document?: WhatsAppMedia & {
    filename?: string
  }
  location?: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
  button?: {
    text: string
    payload: string
  }
  interactive?: {
    type: string
    button_reply?: {
      id: string
      title: string
    }
    list_reply?: {
      id: string
      title: string
      description?: string
    }
  }
}

export interface WhatsAppMedia {
  id: string
  mime_type?: string
  sha256?: string
  caption?: string
}

export interface WhatsAppStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: Array<{
    code: number
    title: string
    message: string
  }>
}

export class WhatsAppAdapter {
  private phoneNumberId: string
  private accessToken: string
  private apiVersion: string = 'v24.0'
  private baseUrl: string

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId
    this.accessToken = accessToken
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`
  }

  /**
   * Send a text message
   */
  async sendMessage(to: string, text: string): Promise<{ message_id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('WhatsApp API error:', error)
        throw new Error(`WhatsApp API error: ${response.status}`)
      }

      const data = await response.json()
      return { message_id: data.messages?.[0]?.id || 'unknown' }
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
      throw error
    }
  }

  /**
   * Send a template message (required for initiating conversations)
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'id',
    components?: any[]
  ): Promise<{ message_id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('WhatsApp template error:', error)
        throw new Error(`WhatsApp template error: ${response.status}`)
      }

      const data = await response.json()
      return { message_id: data.messages?.[0]?.id || 'unknown' }
    } catch (error) {
      console.error('Failed to send WhatsApp template:', error)
      throw error
    }
  }

  /**
   * Send an image message
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<{ message_id: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'image',
          image: {
            link: imageUrl,
            caption,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`WhatsApp API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return { message_id: data.messages?.[0]?.id || 'unknown' }
    } catch (error) {
      console.error('Failed to send WhatsApp image:', error)
      throw error
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      })
    } catch (error) {
      console.error('Failed to mark message as read:', error)
    }
  }

  /**
   * Handle incoming webhook message
   */
  async handleIncomingMessage(
    message: WhatsAppMessage,
    contact: WhatsAppContact
  ): Promise<void> {
    try {
      const waId = message.from
      const userName = contact.profile.name || `WhatsApp User ${waId}`

      // Find or create user
      let userData!: typeof users.$inferSelect
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.platformId, waId), eq(users.platformType, 'whatsapp')))
        .limit(1)

      if (existingUser) {
        userData = existingUser
      } else {
        // Create new user
        const [newUser] = await db.insert(users).values({
          platformId: waId,
          platformType: 'whatsapp',
          status: 'pending',
          name: userName,
          phone: waId,
          metadata: {
            waId,
            profileName: contact.profile.name,
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
          lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
        }).returning()
        conversationData = newConversation!
      }

      // Extract message content based on type
      let messageType = 'text'
      let content = ''
      let metadata: any = {}

      switch (message.type) {
        case 'text':
          messageType = 'text'
          content = message.text?.body || ''
          break
        case 'image':
          messageType = 'image'
          content = message.image?.caption || 'Image received'
          metadata = {
            mediaId: message.image?.id,
            mimeType: message.image?.mime_type,
          }
          break
        case 'audio':
          messageType = 'audio'
          content = 'Audio message received'
          metadata = {
            mediaId: message.audio?.id,
            mimeType: message.audio?.mime_type,
          }
          break
        case 'video':
          messageType = 'video'
          content = message.video?.caption || 'Video received'
          metadata = {
            mediaId: message.video?.id,
            mimeType: message.video?.mime_type,
          }
          break
        case 'document':
          messageType = 'document'
          content = `Document: ${message.document?.filename || 'Untitled'}`
          metadata = {
            mediaId: message.document?.id,
            filename: message.document?.filename,
            mimeType: message.document?.mime_type,
          }
          break
        case 'location':
          messageType = 'location'
          content = `Location: ${message.location?.name || message.location?.address || 'Unknown'}`
          metadata = {
            latitude: message.location?.latitude,
            longitude: message.location?.longitude,
            name: message.location?.name,
            address: message.location?.address,
          }
          break
        case 'button':
          messageType = 'text'
          content = message.button?.text || ''
          metadata = { buttonPayload: message.button?.payload }
          break
        case 'interactive':
          messageType = 'text'
          content = message.interactive?.button_reply?.title ||
                   message.interactive?.list_reply?.title || ''
          metadata = {
            interactiveType: message.interactive?.type,
            replyId: message.interactive?.button_reply?.id ||
                    message.interactive?.list_reply?.id,
          }
          break
        default:
          messageType = 'text'
          content = `[Unsupported message type: ${message.type}]`
      }

      // Store inbound message
      await db.insert(messages).values({
        conversationId: conversationData.id,
        platformId: message.id,
        direction: 'inbound',
        content,
        messageType,
        metadata,
        sentAt: new Date(parseInt(message.timestamp) * 1000),
      })

      // Update conversation last message time
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationData.id))

      console.log(`Stored WhatsApp message from ${userName}: ${content}`)

      // Mark as read
      await this.markAsRead(message.id)

      // Get conversation history for context
      const conversationHistory: JennyChatMessage[] = []
      try {
        const recentMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversationData.id))
          .orderBy(desc(messages.sentAt))
          .limit(10)

        for (const msg of recentMessages.reverse()) {
          conversationHistory.push({
            role: msg.direction === 'inbound' ? 'user' : 'assistant',
            content: msg.content,
          })
        }
      } catch (historyError) {
        console.error('Failed to fetch conversation history:', historyError)
      }

      // Process through RICH AI
      console.log(`Processing WhatsApp message through RICH AI for ${userName}`)
      const richResult = await handleJennyMessage(
        content,
        userData.id,
        'whatsapp',
        conversationHistory
      )

      // Send AI response
      const sendResult = await this.sendMessage(waId, richResult.response)

      // Store outbound message
      await db.insert(messages).values({
        conversationId: conversationData.id,
        platformId: sendResult.message_id,
        direction: 'outbound',
        content: richResult.response,
        messageType: 'text',
        metadata: {
          ai: true,
          verified: richResult.verified,
          memberInfo: richResult.memberInfo ? {
            bpjsId: richResult.memberInfo.bpjsId,
            name: richResult.memberInfo.name,
          } : null,
        },
        sentAt: new Date(),
      })

      console.log(`RICH AI responded to ${userName} via WhatsApp (verified: ${richResult.verified})`)

    } catch (error) {
      console.error('Failed to handle WhatsApp message:', error)
      // Try to send error message
      try {
        await this.sendMessage(
          message.from,
          'Mohon maaf, sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi.'
        )
      } catch (sendError) {
        console.error('Failed to send error message:', sendError)
      }
    }
  }

  /**
   * Handle message status updates
   */
  async handleStatusUpdate(status: WhatsAppStatus): Promise<void> {
    try {
      // Find the message by platform ID
      const [existingMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.platformId, status.id))
        .limit(1)

      if (existingMessage) {
        // Map WhatsApp status to our status
        const statusMap: Record<string, 'sent' | 'delivered' | 'read' | 'failed'> = {
          'sent': 'sent',
          'delivered': 'delivered',
          'read': 'read',
          'failed': 'failed',
        }

        await db
          .update(messages)
          .set({
            status: statusMap[status.status] || 'sent',
            metadata: {
              ...((existingMessage.metadata as object) || {}),
              statusTimestamp: status.timestamp,
              errors: status.errors,
            },
          })
          .where(eq(messages.id, existingMessage.id))

        console.log(`Updated message ${status.id} status to ${status.status}`)
      }
    } catch (error) {
      console.error('Failed to handle status update:', error)
    }
  }

  /**
   * Download media file from WhatsApp
   */
  async downloadMedia(mediaId: string): Promise<{ url: string; mimeType: string }> {
    try {
      // First, get the media URL
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get media URL: ${response.status}`)
      }

      const data = await response.json()
      return {
        url: data.url,
        mimeType: data.mime_type,
      }
    } catch (error) {
      console.error('Failed to download media:', error)
      throw error
    }
  }
}

// Singleton instance
let whatsappAdapter: WhatsAppAdapter | null = null

export function getWhatsAppAdapter(): WhatsAppAdapter {
  if (!whatsappAdapter) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN are required')
    }

    whatsappAdapter = new WhatsAppAdapter(phoneNumberId, accessToken)
  }
  return whatsappAdapter
}
