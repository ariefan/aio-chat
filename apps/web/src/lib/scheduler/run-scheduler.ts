/**
 * Scheduler Runner - Run proactive message scheduler
 *
 * Can be called via cron job or as continuous service
 *
 * Usage:
 *   pnpm scheduler:run          # Run once and exit
 *   pnpm scheduler:run --daemon # Run continuously with node-cron
 */

import cron from 'node-cron'
import { runScheduler } from './proactive-scheduler'

const isDaemonMode = process.argv.includes('--daemon')

async function runOnce() {
  console.log('🚀 Running proactive message scheduler...')
  console.log(`   Time: ${new Date().toISOString()}`)

  try {
    const result = await runScheduler()
    console.log('\n📊 Scheduler Results:')
    console.log(`   Generated: ${result.generated} reminders`)
    console.log(`   Sent: ${result.sent} messages`)
    console.log('✅ Scheduler completed successfully!')
    return result

  } catch (error) {
    console.error('\n❌ Scheduler failed:', error)
    throw error
  }
}

async function startDaemon() {
  console.log('🔄 Starting scheduler daemon...')
  console.log('   Schedule: Every hour at minute 0 (0 * * * *)')
  console.log('   Press Ctrl+C to stop')

  // Run immediately on startup
  try {
    await runOnce()
  } catch (e) {
    console.error('Initial run failed, will retry at next schedule')
  }

  // Schedule to run every hour
  cron.schedule('0 * * * *', async () => {
    console.log(`\n⏰ Scheduled run at ${new Date().toISOString()}`)
    try {
      await runOnce()
    } catch (error) {
      console.error('Scheduled run failed:', error)
    }
  })

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down scheduler daemon...')
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n👋 Received SIGTERM, shutting down...')
    process.exit(0)
  })
}

if (isDaemonMode) {
  startDaemon()
} else {
  runOnce()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
