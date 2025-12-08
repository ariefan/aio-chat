import { db } from '@/db'
import { messages, messageTemplates, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTelegramAdapter } from '@/lib/messaging/telegram-adapter'
import { ExecutionResult, AutomationAction, TriggerContext } from '../rules-engine'

export class SendMessageHandler {
  async execute(action: AutomationAction, context: TriggerContext): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const config = action.config
      let messageContent = config.message

      // If using template, resolve it
      if (config.templateId) {
        const [template] = await db
          .select()
          .from(messageTemplates)
          .where(eq(messageTemplates.id, config.templateId))
          .limit(1)

        if (!template) {
          throw new Error(`Template not found: ${config.templateId}`)
        }

        messageContent = await this.resolveTemplate(template.content, context)
      }

      // Get user platform information
      if (!context.userId) {
        throw new Error('User ID is required for sending messages')
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, context.userId))
        .limit(1)

      if (!user) {
        throw new Error(`User not found: ${context.userId}`)
      }

      // Send message based on platform
      if (user.platformType === 'telegram' && user.platformId) {
        const telegramAdapter = getTelegramAdapter()
        const chatId = parseInt(user.platformId)

        await telegramAdapter.sendMessage(chatId, messageContent, {
          parse_mode: config.parseMode || undefined,
        })

        // Store message in database
        if (context.conversationId) {
          await db.insert(messages).values({
            conversationId: context.conversationId,
            platformId: Date.now().toString(), // Generate platform ID
            direction: 'outbound',
            content: messageContent,
            messageType: 'text',
            status: 'sent',
            metadata: {
              automation: true,
              ruleId: context.data.ruleId,
              templateId: config.templateId,
            },
            sentAt: new Date(),
          })
        }

        return {
          success: true,
          action,
          result: {
            platform: 'telegram',
            chatId,
            message: messageContent,
          },
          executionTime: Date.now() - startTime,
        }
      } else {
        throw new Error(`Unsupported platform: ${user.platformType}`)
      }

    } catch (error) {
      return {
        success: false,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      }
    }
  }

  private async resolveTemplate(templateContent: string, context: TriggerContext): Promise<string> {
    let resolvedContent = templateContent

    // Replace common variables
    const variables = {
      user_name: context.data.userName || 'there',
      message_content: context.data.message || '',
      conversation_id: context.conversationId || '',
      current_time: new Date().toLocaleString(),
      platform: context.data.platform || 'Unknown',
    }

    for (const [key, value] of Object.entries(variables)) {
      resolvedContent = resolvedContent.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value))
    }

    // Replace custom variables from context
    if (context.data.variables) {
      for (const [key, value] of Object.entries(context.data.variables)) {
        resolvedContent = resolvedContent.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value))
      }
    }

    return resolvedContent
  }
}