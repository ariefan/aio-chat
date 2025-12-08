import { ExecutionResult, AutomationAction, TriggerContext } from '../rules-engine'

export class DelayHandler {
  async execute(action: AutomationAction, context: TriggerContext): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      const delaySeconds = action.config.seconds || action.config.delay || 0

      if (delaySeconds <= 0) {
        return {
          success: true,
          action,
          result: {
            message: 'No delay applied (delay time was 0 or negative)',
            actualDelaySeconds: 0,
          },
          executionTime: Date.now() - startTime,
        }
      }

      // Apply delay
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000))

      return {
        success: true,
        action,
        result: {
          message: `Delay applied successfully`,
          requestedDelaySeconds: delaySeconds,
          actualDelaySeconds: delaySeconds,
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