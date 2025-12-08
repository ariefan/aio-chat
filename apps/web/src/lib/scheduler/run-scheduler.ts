/**
 * Scheduler Runner - Run proactive message scheduler
 *
 * Can be called via cron job or manually
 */

import { runScheduler } from './proactive-scheduler'

async function main() {
  console.log('🚀 Starting proactive message scheduler...')
  console.log(`   Time: ${new Date().toISOString()}`)

  try {
    const result = await runScheduler()
    console.log('\n📊 Scheduler Results:')
    console.log(`   Generated: ${result.generated} reminders`)
    console.log(`   Sent: ${result.sent} messages`)
    console.log('\n✅ Scheduler completed successfully!')

  } catch (error) {
    console.error('\n❌ Scheduler failed:', error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
