/**
 * Twilio WhatsApp Adapter
 * Handles incoming/outgoing messages via Twilio WhatsApp API
 */

import { db } from '@/db'
import { users, conversations, messages } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { handleJennyMessage, type JennyChatMessage } from '@/lib/ai/jenny-ai'

// Twilio webhook payload types
export interface TwilioWhatsAppMessage {
  MessageSid: string
  AccountSid: string
  MessagingServiceSid?: string
  From: string  // whatsapp:+1234567890
  To: string    // whatsapp:+0987654321
  Body: string
  NumMedia: string
  MediaContentType0?: string
  MediaUrl0?: string
  ProfileName?: string
  WaId?: string  // WhatsApp ID (phone number without +)
}

export class TwilioWhatsAppAdapter {
  private accountSid: string
  private authToken: string
  private fromNumber: string  // whatsapp:+14155238886

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid
    this.authToken = authToken
    this.fromNumber = fromNumber.startsWith('whatsapp:')
      ? fromNumber
      : `whatsapp:${fromNumber}`
  }

  /**
   * Send a text message via Twilio
   */
  async sendMessage(to: string, body: string): Promise<{ sid: string }> {
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`

    const formData = new URLSearchParams()
    formData.append('From', this.fromNumber)
    formData.append('To', toNumber)
    formData.append('Body', body)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Twilio API error:', error)
      throw new Error(`Twilio API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('Twilio message sent:', data.sid)
    return { sid: data.sid }
  }

  /**
   * Send a media message via Twilio
   */
  async sendMedia(to: string, mediaUrl: string, caption?: string): Promise<{ sid: string }> {
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`

    const formData = new URLSearchParams()
    formData.append('From', this.fromNumber)
    formData.append('To', toNumber)
    formData.append('MediaUrl', mediaUrl)
    if (caption) {
      formData.append('Body', caption)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Twilio media error:', error)
      throw new Error(`Twilio API error: ${response.status}`)
    }

    const data = await response.json()
    return { sid: data.sid }
  }

  /**
   * Handle incoming webhook message from Twilio
   */
  async handleIncomingMessage(message: TwilioWhatsAppMessage): Promise<string> {
    try {
      // Extract phone number from WhatsApp format (whatsapp:+1234567890 -> +1234567890)
      const phoneNumber = message.From.replace('whatsapp:', '')
      const waId = message.WaId || phoneNumber.replace('+', '')
      const userName = message.ProfileName || `WhatsApp User ${waId}`

      console.log(`Received Twilio WhatsApp message from ${userName} (${phoneNumber}): ${message.Body}`)

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
        const [newUser] = await db.insert(users).values({
          platformId: waId,
          platformType: 'whatsapp',
          status: 'pending',
          name: userName,
          phone: phoneNumber,
          metadata: {
            waId,
            profileName: message.ProfileName,
            provider: 'twilio',
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
          lastMessageAt: new Date(),
        }).returning()
        conversationData = newConversation!
      }

      // Determine message type
      let messageType = 'text'
      let content = message.Body || ''
      let metadata: any = {
        messageSid: message.MessageSid,
        provider: 'twilio',
      }

      // Handle media messages
      const numMedia = parseInt(message.NumMedia || '0')
      if (numMedia > 0 && message.MediaUrl0) {
        messageType = message.MediaContentType0?.startsWith('image/') ? 'image'
          : message.MediaContentType0?.startsWith('video/') ? 'video'
          : message.MediaContentType0?.startsWith('audio/') ? 'audio'
          : 'document'

        metadata.mediaUrl = message.MediaUrl0
        metadata.mediaType = message.MediaContentType0

        if (!content) {
          content = `[${messageType} received]`
        }
      }

      // Store inbound message
      await db.insert(messages).values({
        conversationId: conversationData.id,
        platformId: message.MessageSid,
        direction: 'inbound',
        content,
        messageType,
        metadata,
        sentAt: new Date(),
      })

      // Update conversation
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationData.id))

      // Get conversation history
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
      console.log(`Processing Twilio WhatsApp message through RICH AI for ${userName}`)
      const richResult = await handleJennyMessage(
        content,
        userData.id,
        'whatsapp',
        conversationHistory
      )

      // Send AI response via Twilio
      const sendResult = await this.sendMessage(message.From, richResult.response)

      // Store outbound message
      await db.insert(messages).values({
        conversationId: conversationData.id,
        platformId: sendResult.sid,
        direction: 'outbound',
        content: richResult.response,
        messageType: 'text',
        metadata: {
          ai: true,
          verified: richResult.verified,
          provider: 'twilio',
          memberInfo: richResult.memberInfo ? {
            bpjsId: richResult.memberInfo.bpjsId,
            name: richResult.memberInfo.name,
          } : null,
        },
        sentAt: new Date(),
      })

      console.log(`RICH AI responded to ${userName} via Twilio WhatsApp (verified: ${richResult.verified})`)

      // Return TwiML response (empty is fine, we already sent the message)
      return richResult.response

    } catch (error) {
      console.error('Failed to handle Twilio WhatsApp message:', error)

      // Try to send error message
      try {
        await this.sendMessage(
          message.From,
          'Mohon maaf, sistem sedang mengalami gangguan. Silakan coba beberapa saat lagi.'
        )
      } catch (sendError) {
        console.error('Failed to send error message:', sendError)
      }

      return 'Error processing message'
    }
  }

  /**
   * Validate Twilio webhook signature
   */
  static validateSignature(
    signature: string,
    url: string,
    params: Record<string, string>,
    authToken: string
  ): boolean {
    const crypto = require('crypto')

    // Build the string to sign
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('')

    const data = url + sortedParams
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')

    return signature === expectedSignature
  }
}

// Singleton instance
let twilioAdapter: TwilioWhatsAppAdapter | null = null

export function getTwilioWhatsAppAdapter(): TwilioWhatsAppAdapter {
  if (!twilioAdapter) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER are required')
    }

    twilioAdapter = new TwilioWhatsAppAdapter(accountSid, authToken, fromNumber)
  }
  return twilioAdapter
}
