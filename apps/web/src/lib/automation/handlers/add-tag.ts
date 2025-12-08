import { db } from '@/db'
import { users, conversations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ExecutionResult, AutomationAction, TriggerContext } from '../rules-engine'

export class AddTagHandler {
  async execute(action: AutomationAction, context: TriggerContext): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const config = action.config
      const tagsToAdd = config.tags || []

      if (!Array.isArray(tagsToAdd) || tagsToAdd.length === 0) {
        throw new Error('Tags array is required for add_tag action')
      }

      let targetId = config.userId || context.userId
      let targetType = 'user'

      // Determine target type and ID
      if (config.conversationId || context.conversationId) {
        targetId = config.conversationId || context.conversationId
        targetType = 'conversation'
      } else if (targetId) {
        targetType = 'user'
      } else {
        throw new Error('Either userId or conversationId must be provided')
      }

      // Get current metadata
      let currentMetadata: any = {}

      if (targetType === 'user') {
        const [user] = await db
          .select({ metadata: users.metadata })
          .from(users)
          .where(eq(users.id, targetId))
          .limit(1)

        if (!user) {
          throw new Error(`User not found: ${targetId}`)
        }

        currentMetadata = user.metadata || {}
      } else {
        const [conversation] = await db
          .select({ metadata: conversations.metadata })
          .from(conversations)
          .where(eq(conversations.id, targetId))
          .limit(1)

        if (!conversation) {
          throw new Error(`Conversation not found: ${targetId}`)
        }

        currentMetadata = conversation.metadata || {}
      }

      // Get existing tags
      const existingTags = currentMetadata.tags ? (Array.isArray(currentMetadata.tags) ? currentMetadata.tags : currentMetadata.tags.split(',').map((t: string) => t.trim())) : []

      // Add new tags (avoid duplicates)
      const newTags = [...new Set([...existingTags, ...tagsToAdd])]

      // Update metadata
      const updatedMetadata = {
        ...currentMetadata,
        tags: newTags,
        lastTaggedBy: 'automation',
        lastTaggedAt: new Date().toISOString(),
        taggingRuleId: context.data.ruleId,
      }

      // Update the appropriate entity
      if (targetType === 'user') {
        await db
          .update(users)
          .set({
            metadata: updatedMetadata,
            updatedAt: new Date(),
          })
          .where(eq(users.id, targetId))
      } else {
        await db
          .update(conversations)
          .set({
            metadata: updatedMetadata,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, targetId))
      }

      const addedTags = tagsToAdd.filter(tag => !existingTags.includes(tag))

      return {
        success: true,
        action,
        result: {
          targetType,
          targetId,
          existingTags,
          addedTags,
          allTags: newTags,
          totalTags: newTags.length,
        },
        executionTime: Date.now() - startTime,
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