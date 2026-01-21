#!/usr/bin/env node
/**
 * Standalone BPJS Proactive Message Scheduler
 *
 * This script runs independently of the Docker container.
 * It connects directly to NeonDB and sends proactive messages.
 *
 * Usage:
 *   node standalone-scheduler.js
 *
 * Setup on server:
 *   1. Copy this file to the server
 *   2. Install dependencies: npm install node-cron dotenv drizzle-orm pg
 *   3. Set DATABASE_URL and other env vars
 *   4. Add to crontab: 0 * * * * /path/to/standalone-scheduler.js
 */

const cron = require('node-cron');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log('📅 BPJS Proactive Message Scheduler');
console.log('=====================================');
console.log('Database:', dbUrl.replace(/:[^:@]+@/, ':****@'));
console.log('');

// Database client
const client = new Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

/**
 * Run the scheduler - check for members who need proactive messages
 */
async function runScheduler() {
  const startTime = Date.now();
  console.log('[' + new Date().toISOString() + '] 🔄 Running scheduler...');

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // TODO: Implement your proactive message logic here
    // Example queries you might need:

    // 1. Get members with upcoming payments
    // const members = await client.query(`
    //   SELECT * FROM bpjs_members
    //   WHERE payment_due_date <= CURRENT_DATE + INTERVAL '7 days'
    //     AND last_reminder_sent IS NULL
    // `);

    // 2. Get member behavioral segmentation
    // const segmentations = await client.query(`
    //   SELECT * FROM customer_strategies
    //   WHERE member_id = $1
    // `, [memberId]);

    // 3. Check if knowledge base has relevant entries
    // const knowledge = await client.query(`
    //   SELECT * FROM pandawa_knowledge_base
    //   WHERE $1 = ANY(keywords)
    //   LIMIT 5
    // `, [searchTerm]);

    // 4. Insert proactive message into conversations
    // await client.query(`
    //   INSERT INTO messages (conversation_id, direction, content, status)
    //   VALUES ($1, 'outbound', $2, 'pending')
    // `, [conversationId, messageContent]);

    console.log('✅ Scheduler completed');
    console.log('   Members processed: 0');
    console.log('   Messages queued: 0');
    console.log('   Duration:', (Date.now() - startTime), 'ms');

  } catch (error) {
    console.error('❌ Scheduler error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
    console.log('✅ Database connection closed\n');
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon');

  if (isDaemon) {
    console.log('Mode: DAEMON (continuous execution)');
    console.log('Schedule: Every hour at minute 0');
    console.log('Press Ctrl+C to stop\n');

    // Run immediately on start
    await runScheduler();

    // Schedule to run every hour
    cron.schedule('0 * * * *', async () => {
      console.log('\n[' + new Date().toISOString() + '] ⏰ Scheduled task triggered');
      await runScheduler();
    });

    // Keep process running
    console.log('✅ Scheduler daemon is running. Waiting for next scheduled run...\n');

  } else {
    console.log('Mode: SINGLE RUN');
    console.log('Use --daemon flag for continuous execution\n');
    await runScheduler();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
  client.end().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  client.end().then(() => process.exit(0));
});

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
