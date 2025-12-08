import { db } from '@/db'
import { conversations, users, operators } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { ExecutionResult, AutomationAction, TriggerContext } from '../rules-engine'

export class AssignToOperatorHandler {
  async execute(action: AutomationAction, context: TriggerContext): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const config = action.config
      let operatorId = config.operatorId

      // Find operator by criteria if not specified
      if (!operatorId) {
        operatorId = await this.findOperator(config)
      }

      if (!operatorId) {
        throw new Error('No suitable operator found for assignment')
      }

      // Get operator details
      const [operator] = await db
        .select()
        .from(operators)
        .where(eq(operators.id, operatorId))
        .limit(1)

      if (!operator) {
        throw new Error(`Operator not found: ${operatorId}`)
      }

      // Update conversation with assigned operator
      if (context.conversationId) {
        await db
          .update(conversations)
          .set({
            assignedOperatorId: operatorId,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, context.conversationId))
      }

      // Could also send notification to operator here
      await this.notifyOperator(operator, context)

      return {
        success: true,
        action,
        result: {
          operatorId: operator.id,
          operatorName: operator.name,
          operatorEmail: operator.email,
          assignedAt: new Date().toISOString(),
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

  private async findOperator(config: Record<string, any>): Promise<string | null> {
    const criteria = config.assignmentCriteria || 'least_busy'

    switch (criteria) {
      case 'least_busy':
        return this.findLeastBusyOperator(config)

      case 'round_robin':
        return this.findRoundRobinOperator(config)

      case 'by_role':
        return this.findOperatorByRole(config)

      case 'by_availability':
        return this.findAvailableOperator(config)

      default:
        return config.operatorId || null
    }
  }

  private async findLeastBusyOperator(config: Record<string, any>): Promise<string | null> {
    // Find operator with least active conversations
    const result = await db
      .select({
        operatorId: operators.id,
        activeConversations: sql<number>`COUNT(DISTINCT c.id)::int`,
      })
      .from(operators)
      .leftJoin(conversations, and(
        eq(conversations.assignedOperatorId, operators.id),
        eq(conversations.status, 'active')
      ))
      .where(eq(operators.isActive, true))
      .groupBy(operators.id)
      .orderBy(sql`active_conversations`)
      .limit(1)

    return result[0]?.operatorId || null
  }

  private async findRoundRobinOperator(config: Record<string, any>): Promise<string | null> {
    // Implement round-robin logic based on assignment history
    const activeOperators = await db
      .select()
      .from(operators)
      .where(eq(operators.isActive, true))
      .orderBy(operators.createdAt)
      .limit(10)

    // Simple round-robin: cycle through active operators
    // In production, this should track last assignment per operator
    const currentIndex = Math.floor(Date.now() / 1000) % activeOperators.length
    return activeOperators[currentIndex]?.id || null
  }

  private async findOperatorByRole(config: Record<string, any>): Promise<string | null> {
    const requiredRole = config.role || 'operator'

    const [operator] = await db
      .select()
      .from(operators)
      .where(and(
        eq(operators.role, requiredRole),
        eq(operators.isActive, true)
      ))
      .orderBy(operators.createdAt)
      .limit(1)

    return operator?.id || null
  }

  private async findAvailableOperator(config: Record<string, any>): Promise<string | null> {
    // Find operators who haven't been assigned recently
    const recentAssignments = new Date(Date.now() - (config.maxRecentAssignmentsMinutes || 30) * 60 * 1000)

    const result = await db
      .select({
        operatorId: operators.id,
        recentAssignmentCount: sql<number>`COUNT(DISTINCT c.id)::int`,
      })
      .from(operators)
      .leftJoin(conversations, and(
        eq(conversations.assignedOperatorId, operators.id),
        sql`${conversations.updatedAt} >= ${recentAssignments}`
      ))
      .where(eq(operators.isActive, true))
      .groupBy(operators.id)
      .orderBy(sql`recent_assignment_count`)
      .limit(1)

    return result[0]?.operatorId || null
  }

  private async notifyOperator(operator: any, context: TriggerContext): Promise<void> {
    // Send notification to operator (email, in-app, etc.)
    // This could integrate with notification systems
    console.log(`📧 Notifying operator ${operator.name} about new assignment`)

    // In a real implementation, this might:
    // - Send an email notification
    // - Create an in-app notification
    // - Send a Slack message
    // - Trigger a webhook
  }
}