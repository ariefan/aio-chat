import { performRAGSearch } from '@/lib/ai/rag-service'
import { db } from '@/db'
import { users, conversations, messages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTelegramAdapter } from '@/lib/messaging/telegram-adapter'
import { ExecutionResult, AutomationAction, TriggerContext } from '../rules-engine'

export class AIResponseHandler {
  async execute(action: AutomationAction, context: TriggerContext): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const config = action.config

      // Get user information
      if (!context.userId) {
        throw new Error('User ID is required for AI responses')
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, context.userId))
        .limit(1)

      if (!user) {
        throw new Error(`User not found: ${context.userId}`)
      }

      // Prepare user message for AI
      const userMessage = config.userMessage || context.data.message || 'Please provide assistance.'

      // Generate AI response using RAG
      const ragResult = await performRAGSearch(
        userMessage,
        context.userId,
        user.platformType,
        {
          maxResults: config.maxResults || 3,
          minRelevanceScore: config.minRelevanceScore || 0.7,
          documentTypes: config.documentTypes || [],
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 500,
        }
      )

      // Send AI response via appropriate platform
      if (user.platformType === 'telegram' && user.platformId) {
        const telegramAdapter = getTelegramAdapter()
        const chatId = parseInt(user.platformId)

        await telegramAdapter.sendMessage(chatId, ragResult.answer, {
          parse_mode: 'Markdown',
        })

        // Store AI response in database
        if (context.conversationId) {
          await db.insert(messages).values({
            conversationId: context.conversationId,
            platformId: Date.now().toString(),
            direction: 'outbound',
            content: ragResult.answer,
            messageType: 'text',
            status: 'sent',
            metadata: {
              automation: true,
              aiGenerated: true,
              ragUsed: true,
              retrievedDocuments: ragResult.retrievedDocuments.length,
              sessionId: ragResult.sessionId,
              model: ragResult.model,
              tokenUsage: ragResult.tokenUsage,
              processingTime: ragResult.processingTime,
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
            aiResponse: ragResult.answer,
            retrievedDocuments: ragResult.retrievedDocuments.length,
            processingTime: ragResult.processingTime,
            model: ragResult.model,
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
}