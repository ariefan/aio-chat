import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ExecutionResult, AutomationAction, TriggerContext } from '../rules-engine'

export class ChangeUserStatusHandler {
  async execute(action: AutomationAction, context: TriggerContext): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const config = action.config
      const newStatus = config.status

      if (!newStatus) {
        throw new Error('Status is required for change_user_status action')
      }

      if (!context.userId) {
        throw new Error('User ID is required for changing user status')
      }

      // Validate status
      const validStatuses = ['pending', 'verified', 'active', 'inactive']
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}. Valid statuses: ${validStatuses.join(', ')}`)
      }

      // Update user status
      const [updatedUser] = await db
        .update(users)
        .set({
          status: newStatus,
          updatedAt: new Date(),
          ...(newStatus === 'verified' && { verifiedAt: new Date() }),
          metadata: {
            ...(config.metadata || {}),
            statusChangedBy: 'automation',
            statusChangedAt: new Date().toISOString(),
            previousStatus: context.data.currentStatus,
            ruleId: context.data.ruleId,
          }
        })
        .where(eq(users.id, context.userId))
        .returning()

      if (!updatedUser) {
        throw new Error(`User not found: ${context.userId}`)
      }

      // Log status change for audit trail
      if (config.logChange) {
        console.log(`🔄 User status changed: ${context.userId} -> ${newStatus}`)
      }

      return {
        success: true,
        action,
        result: {
          userId: context.userId,
          previousStatus: context.data.currentStatus,
          newStatus: updatedUser.status,
          changedAt: new Date().toISOString(),
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