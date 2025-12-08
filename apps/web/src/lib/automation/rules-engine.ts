import { db } from '@/db'
import {
  automationRules,
  automationExecutions,
  automationSchedules,
  users,
  conversations,
  messages,
  operators,
  messageTemplates
} from '@/db/schema'
import { eq, and, desc, lt, gte, sql } from 'drizzle-orm'
import cron from 'node-cron'
import { performRAGSearch } from '@/lib/ai/rag-service'
import { getTelegramAdapter } from '@/lib/messaging/telegram-adapter'

// Types for automation system
export interface TriggerContext {
  type: string
  data: any
  userId?: string
  conversationId?: string
  messageId?: string
  timestamp: Date
}

export interface AutomationAction {
  type: string
  config: Record<string, any>
  delay?: number // Delay in seconds before executing
}

export interface RuleMatch {
  ruleId: string
  ruleName: string
  priority: number
  actions: AutomationAction[]
  conditions?: Record<string, any>
}

export interface ExecutionResult {
  success: boolean
  action: AutomationAction
  result?: any
  error?: string
  executionTime: number
}

// Action handler registry
const actionHandlers = new Map<string, ActionHandler>()

interface ActionHandler {
  execute: (action: AutomationAction, context: TriggerContext) => Promise<ExecutionResult>
}

/**
 * Core Automation Rules Engine
 */
export class AutomationRulesEngine {
  private isRunning = false
  private scheduleJobs: Map<string, cron.ScheduledTask> = new Map()

  constructor() {
    this.registerDefaultHandlers()
  }

  /**
   * Start the automation engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🤖 Automation engine is already running')
      return
    }

    console.log('🚀 Starting automation rules engine...')

    // Start processing scheduled rules
    await this.startScheduledRules()

    this.isRunning = true
    console.log('✅ Automation rules engine started successfully')
  }

  /**
   * Stop the automation engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('🛑 Stopping automation rules engine...')

    // Stop all scheduled jobs
    for (const [ruleId, job] of this.scheduleJobs) {
      job.stop()
    }
    this.scheduleJobs.clear()

    this.isRunning = false
    console.log('✅ Automation rules engine stopped')
  }

  /**
   * Process a trigger event and find matching rules
   */
  async processTrigger(context: TriggerContext): Promise<ExecutionResult[]> {
    if (!this.isRunning) {
      return []
    }

    const startTime = Date.now()
    console.log(`🔍 Processing trigger: ${context.type}`)

    try {
      // Find matching rules
      const matchingRules = await this.findMatchingRules(context)
      console.log(`📋 Found ${matchingRules.length} matching rules`)

      const results: ExecutionResult[] = []

      // Sort by priority (higher priority first)
      matchingRules.sort((a, b) => b.priority - a.priority)

      // Execute actions for each matching rule
      for (const match of matchingRules) {
        console.log(`⚡ Executing rule: ${match.ruleName}`)

        // Check cooldown
        if (!(await this.checkCooldown(match.ruleId, match.ruleName))) {
          console.log(`⏰ Rule ${match.ruleName} is in cooldown period`)
          continue
        }

        const ruleResults = await this.executeActions(match.actions, context)
        results.push(...ruleResults)

        // Update rule execution stats
        await this.updateRuleExecution(match.ruleId, ruleResults.every(r => r.success))

        // Log execution
        await this.logExecution(match.ruleId, context, ruleResults)
      }

      const processingTime = Date.now() - startTime
      console.log(`✅ Trigger processed in ${processingTime}ms`)

      return results

    } catch (error) {
      console.error('❌ Error processing trigger:', error)
      throw error
    }
  }

  /**
   * Find rules that match the trigger context
   */
  private async findMatchingRules(context: TriggerContext): Promise<RuleMatch[]> {
    const activeRules = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.status, 'active'))
      .orderBy(desc(automationRules.priority))

    const matches: RuleMatch[] = []

    for (const rule of activeRules) {
      if (await this.matchesTrigger(rule, context) && await this.matchesConditions(rule, context)) {
        matches.push({
          ruleId: rule.id,
          ruleName: rule.name,
          priority: rule.priority || 0,
          actions: rule.actions as AutomationAction[],
          conditions: rule.conditions as Record<string, any> || undefined
        })
      }
    }

    return matches
  }

  /**
   * Check if rule trigger matches the context
   */
  private async matchesTrigger(rule: any, context: TriggerContext): Promise<boolean> {
    const triggerConfig = rule.triggerConfig as Record<string, any>

    switch (rule.triggerType) {
      case 'keyword':
        return this.matchesKeywordTrigger(triggerConfig, context)

      case 'time_based':
        return this.matchesTimeBasedTrigger(triggerConfig, context)

      case 'message_count':
        return this.matchesMessageCountTrigger(triggerConfig, context)

      case 'user_status':
        return this.matchesUserStatusTrigger(triggerConfig, context)

      case 'conversation_inactive':
        return this.matchesConversationInactiveTrigger(triggerConfig, context)

      case 'escalation':
        return this.matchesEscalationTrigger(triggerConfig, context)

      case 'custom_event':
        return this.matchesCustomEventTrigger(triggerConfig, context)

      default:
        return false
    }
  }

  /**
   * Check if additional conditions are met
   */
  private async matchesConditions(rule: any, context: TriggerContext): Promise<boolean> {
    if (!rule.conditions) {
      return true
    }

    // Implement condition matching logic
    // This can include business hours, user segmentation, etc.
    return true // Simplified for now
  }

  /**
   * Execute actions for a rule
   */
  private async executeActions(actions: AutomationAction[], context: TriggerContext): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []

    for (const action of actions) {
      const startTime = Date.now()

      try {
        const handler = actionHandlers.get(action.type)
        if (!handler) {
          throw new Error(`No handler found for action type: ${action.type}`)
        }

        // Apply delay if specified
        if (action.delay && action.delay > 0) {
          await this.delay(action.delay * 1000)
        }

        const result = await handler.execute(action, context)
        results.push(result)

      } catch (error) {
        results.push({
          success: false,
          action,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: Date.now() - startTime
        })
      }
    }

    return results
  }

  /**
   * Trigger type matchers
   */
  private matchesKeywordTrigger(config: Record<string, any>, context: TriggerContext): boolean {
    const keywords = config.keywords as string[]
    const message = context.data.message || ''

    return keywords.some(keyword =>
      message.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  private matchesTimeBasedTrigger(config: Record<string, any>, context: TriggerContext): boolean {
    const now = new Date()
    const triggerTime = new Date(config.time)

    return Math.abs(now.getTime() - triggerTime.getTime()) < 60000 // Within 1 minute
  }

  private async matchesMessageCountTrigger(config: Record<string, any>, context: TriggerContext): Promise<boolean> {
    if (!context.conversationId) {
      return false
    }

    const messageCount = await db
      .select({ count: messages.id })
      .from(messages)
      .where(eq(messages.conversationId, context.conversationId))

    const count = messageCount.length
    const operator = config.operator || '>'
    const value = config.value || 0

    switch (operator) {
      case '>': return count > value
      case '>=': return count >= value
      case '<': return count < value
      case '<=': return count <= value
      case '=': return count === value
      default: return false
    }
  }

  private async matchesUserStatusTrigger(config: Record<string, any>, context: TriggerContext): Promise<boolean> {
    if (!context.userId) {
      return false
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, context.userId))
      .limit(1)

    if (!user) {
      return false
    }

    return user.status === config.status
  }

  private async matchesConversationInactiveTrigger(config: Record<string, any>, context: TriggerContext): Promise<boolean> {
    if (!context.conversationId) {
      return false
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, context.conversationId))
      .limit(1)

    if (!conversation || !conversation.lastMessageAt) {
      return false
    }

    const inactiveMinutes = (Date.now() - conversation.lastMessageAt.getTime()) / (1000 * 60)
    return inactiveMinutes >= (config.inactiveMinutes || 30)
  }

  private matchesEscalationTrigger(config: Record<string, any>, context: TriggerContext): boolean {
    // Implementation for escalation triggers
    return context.type === 'escalation_needed'
  }

  private matchesCustomEventTrigger(config: Record<string, any>, context: TriggerContext): boolean {
    return context.type === config.eventType &&
           this.matchesEventData(config.eventData, context.data)
  }

  private matchesEventData(expected: any, actual: any): boolean {
    // Simple object matching - can be enhanced
    return JSON.stringify(expected) === JSON.stringify(actual)
  }

  /**
   * Schedule management
   */
  private async startScheduledRules(): Promise<void> {
    const scheduledRules = await db
      .select({
        rule: automationRules,
        schedule: automationSchedules,
      })
      .from(automationSchedules)
      .innerJoin(automationRules, eq(automationSchedules.ruleId, automationRules.id))
      .where(and(
        eq(automationRules.status, 'active'),
        eq(automationSchedules.isActive, true)
      ))

    for (const { rule, schedule } of scheduledRules) {
      this.scheduleRule(rule, schedule)
    }
  }

  private scheduleRule(rule: any, schedule: any): void {
    const job = cron.schedule(schedule.scheduleExpression, async () => {
      console.log(`⏰ Executing scheduled rule: ${rule.name}`)

      const context: TriggerContext = {
        type: 'scheduled_execution',
        data: { scheduleId: schedule.id },
        timestamp: new Date()
      }

      await this.processTrigger(context)

      // Update schedule
      await db
        .update(automationSchedules)
        .set({
          lastRunAt: new Date(),
          runCount: schedule.runCount + 1,
          updatedAt: new Date()
        })
        .where(eq(automationSchedules.id, schedule.id))

    }, { scheduled: false })

    this.scheduleJobs.set(rule.id, job)
    job.start()
  }

  /**
   * Utility methods
   */
  private async checkCooldown(ruleId: string, ruleName: string): Promise<boolean> {
    const [rule] = await db
      .select({ cooldownMinutes: automationRules.cooldownMinutes, lastExecutedAt: automationRules.lastExecutedAt })
      .from(automationRules)
      .where(eq(automationRules.id, ruleId))
      .limit(1)

    if (!rule || !rule.cooldownMinutes || !rule.lastExecutedAt) {
      return true
    }

    const cooldownMs = rule.cooldownMinutes * 60 * 1000
    const timeSinceLastExecution = Date.now() - rule.lastExecutedAt.getTime()

    return timeSinceLastExecution >= cooldownMs
  }

  private async updateRuleExecution(ruleId: string, success: boolean): Promise<void> {
    await db
      .update(automationRules)
      .set({
        executionCount: sql`${automationRules.executionCount} + 1`,
        lastExecutedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(automationRules.id, ruleId))
  }

  private async logExecution(ruleId: string, context: TriggerContext, results: ExecutionResult[]): Promise<void> {
    await db.insert(automationExecutions).values({
      ruleId: ruleId || '', // Ensure it's not undefined
      triggerType: context.type as any, // Cast for enum compatibility
      triggerData: context.data,
      executedActions: results.map(r => r.action),
      results: results.map(r => ({
        success: r.success,
        result: r.result,
        error: r.error,
        executionTime: r.executionTime
      })),
      status: results.every(r => r.success) ? 'success' : 'partial',
      errorMessage: results.find(r => !r.success)?.error,
      executionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
      userId: context.userId,
      conversationId: context.conversationId,
      messageId: context.messageId,
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private registerDefaultHandlers(): void {
    // Register all action handlers
    actionHandlers.set('send_message', new SendMessageHandler())
    actionHandlers.set('ai_response', new AIResponseHandler())
    actionHandlers.set('assign_to_operator', new AssignToOperatorHandler())
    actionHandlers.set('change_user_status', new ChangeUserStatusHandler())
    actionHandlers.set('add_tag', new AddTagHandler())
    actionHandlers.set('delay', new DelayHandler())
    // Add more handlers as needed
  }
}

// Global instance
export const automationEngine = new AutomationRulesEngine()

// Import handler classes (will be implemented next)
import { SendMessageHandler } from './handlers/send-message'
import { AIResponseHandler } from './handlers/ai-response'
import { AssignToOperatorHandler } from './handlers/assign-operator'
import { ChangeUserStatusHandler } from './handlers/change-user-status'
import { AddTagHandler } from './handlers/add-tag'
import { DelayHandler } from './handlers/delay'