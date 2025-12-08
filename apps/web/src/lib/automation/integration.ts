import { automationEngine, TriggerContext } from './rules-engine'

/**
 * Integration layer for connecting automation engine with messaging systems
 */

export class AutomationIntegration {

  /**
   * Process incoming message through automation engine
   */
  async processIncomingMessage(data: {
    message: string
    userId: string
    conversationId: string
    messageId: string
    platformType: string
    userName?: string
  }) {
    const context: TriggerContext = {
      type: 'keyword', // Default trigger type for messages
      data: {
        message: data.message,
        platform: data.platformType,
        userName: data.userName,
      },
      userId: data.userId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      timestamp: new Date(),
    }

    try {
      const results = await automationEngine.processTrigger(context)
      console.log(`🤖 Automation processed message: ${results.length} rules executed`)
      return results
    } catch (error) {
      console.error('❌ Automation processing failed:', error)
      return []
    }
  }

  /**
   * Trigger automation for user status change
   */
  async processUserStatusChange(data: {
    userId: string
    conversationId?: string
    oldStatus: string
    newStatus: string
  }) {
    const context: TriggerContext = {
      type: 'user_status',
      data: {
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        currentStatus: data.newStatus,
      },
      userId: data.userId,
      conversationId: data.conversationId,
      timestamp: new Date(),
    }

    try {
      const results = await automationEngine.processTrigger(context)
      console.log(`👤 User status change processed: ${results.length} rules executed`)
      return results
    } catch (error) {
      console.error('❌ User status automation failed:', error)
      return []
    }
  }

  /**
   * Trigger automation for conversation inactivity
   */
  async processConversationInactivity(data: {
    userId: string
    conversationId: string
    inactiveMinutes: number
  }) {
    const context: TriggerContext = {
      type: 'conversation_inactive',
      data: {
        inactiveMinutes: data.inactiveMinutes,
      },
      userId: data.userId,
      conversationId: data.conversationId,
      timestamp: new Date(),
    }

    try {
      const results = await automationEngine.processTrigger(context)
      console.log(`⏰ Conversation inactivity processed: ${results.length} rules executed`)
      return results
    } catch (error) {
      console.error('❌ Inactivity automation failed:', error)
      return []
    }
  }

  /**
   * Trigger automation for escalation request
   */
  async processEscalation(data: {
    userId: string
    conversationId: string
    reason: string
    priority: 'low' | 'medium' | 'high'
  }) {
    const context: TriggerContext = {
      type: 'escalation',
      data: {
        reason: data.reason,
        priority: data.priority,
      },
      userId: data.userId,
      conversationId: data.conversationId,
      timestamp: new Date(),
    }

    try {
      const results = await automationEngine.processTrigger(context)
      console.log(`🚨 Escalation processed: ${results.length} rules executed`)
      return results
    } catch (error) {
      console.error('❌ Escalation automation failed:', error)
      return []
    }
  }

  /**
   * Trigger automation for custom events
   */
  async processCustomEvent(data: {
    eventType: string
    userId?: string
    conversationId?: string
    eventData: any
  }) {
    const context: TriggerContext = {
      type: 'custom_event',
      data: {
        eventType: data.eventType,
        ...data.eventData,
      },
      userId: data.userId,
      conversationId: data.conversationId,
      timestamp: new Date(),
    }

    try {
      const results = await automationEngine.processTrigger(context)
      console.log(`🎯 Custom event processed: ${results.length} rules executed`)
      return results
    } catch (error) {
      console.error('❌ Custom event automation failed:', error)
      return []
    }
  }
}

// Singleton instance
export const automationIntegration = new AutomationIntegration()

// Helper function to check message count triggers
export async function checkMessageCountTriggers(conversationId: string, messageCount: number) {
  const context: TriggerContext = {
    type: 'message_count',
    data: {
      messageCount,
      conversationId,
    },
    conversationId,
    timestamp: new Date(),
  }

  try {
    const results = await automationEngine.processTrigger(context)
    console.log(`📊 Message count trigger processed: ${results.length} rules executed`)
    return results
  } catch (error) {
    console.error('❌ Message count automation failed:', error)
    return []
  }
}

// Helper function to trigger scheduled automations
export async function triggerScheduledAutomation(ruleId: string) {
  const context: TriggerContext = {
    type: 'scheduled_execution',
    data: {
      ruleId,
      triggeredBy: 'scheduler',
    },
    timestamp: new Date(),
  }

  try {
    const results = await automationEngine.processTrigger(context)
    console.log(`⏰ Scheduled automation triggered: ${results.length} rules executed`)
    return results
  } catch (error) {
    console.error('❌ Scheduled automation failed:', error)
    return []
  }
}