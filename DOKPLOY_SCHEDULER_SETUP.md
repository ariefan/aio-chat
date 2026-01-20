# Dokploy Scheduler Setup Guide

## Overview

Your AIO-CHAT POC includes a **Proactive Message Scheduler** that automatically sends BPJS payment reminders via Telegram/WhatsApp.

## What the Scheduler Does

- **Generates Reminders**: Creates messages for 7d, 3d, 1d before due date
- **Sends Messages**: Delivers via Telegram/WhatsApp adapters
- **Overdue Handling**: Marks debts overdue, sends follow-ups every 3 days
- **Retry Logic**: Up to 3 retries before marking as failed
- **Duplicate Prevention**: Won't send same reminder twice

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DOKPLOY SERVER                           │
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                   │
│  │  AIO-CHAT    │         │  SCHEDULER   │                   │
│  │   (Next.js)  │         │   (Daemon)   │                   │
│  │              │         │              │                   │
│  │  Port: 3000  │         │  Cron: 0 * * *│                   │
│  └──────────────┘         └──────────────┘                   │
│         │                         │                            │
│         └──────────┬──────────────┘                            │
│                    ▼                                         │
│         ┌──────────────────┐                                  │
│         │   PostgreSQL     │                                  │
│         │   (NeonDB)       │                                  │
│         └──────────────────┘                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Separate Service (RECOMMENDED for Dokploy)

Create a separate application in Dokploy for the scheduler:

#### A. Deploy Main Application
1. Go to Dokploy Dashboard
2. Create new application: `aio-chat-app`
3. Set environment variables:
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=https://your-domain.com
   ```
4. Deploy

#### B. Deploy Scheduler Service
1. Create new application: `aio-chat-scheduler`
2. Set environment variables:
   ```
   DATABASE_URL=postgresql://... (same as app)
   SCHEDULER_MODE=daemon
   TELEGRAM_BOT_TOKEN=your-telegram-token
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_WHATSAPP_FROM=your-whatsapp-number
   ```
3. Command: `pnpm scheduler:daemon`
4. Deploy

### Option 2: Single Service with Cron (Simple)

Use Dokploy's built-in cron job feature:

1. Deploy main application with scheduler script
2. In Dokploy Dashboard → Application → Settings
3. Add Cron Job:
   - Schedule: `0 * * * *` (Every hour)
   - Command: `pnpm scheduler:run`
   - Working Directory: `/app/apps/web`

### Option 3: Docker Compose (Self-Hosted)

Your `docker-compose.yml` already has the scheduler configured:

```bash
# Start all services including scheduler
docker-compose up -d

# View scheduler logs
docker-compose logs -f scheduler

# Restart scheduler
docker-compose restart scheduler
```

## Environment Variables

### Required for Scheduler:
- `DATABASE_URL` - PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (optional)
- `TWILIO_ACCOUNT_SID` - Twilio account SID (optional)
- `TWILIO_AUTH_TOKEN` - Twilio auth token (optional)
- `TWILIO_WHATSAPP_FROM` - Twilio WhatsApp number (optional)

### Optional:
- `SCHEDULER_MODE` - Set to `daemon` to run as daemon (via docker-entrypoint)
- `LOG_LEVEL` - Set to `debug` for verbose logs

## Testing the Scheduler

### 1. Seed Test Data
```bash
# Go to: http://your-domain.com/dashboard/settings
# Click: "Seed BPJS Data"
```

This creates 10 BPJS members with different due dates:
- 3 members: Due in 7 days
- 3 members: Due in 3 days
- 2 members: Due in 1 day
- 2 members: Already overdue

### 2. Run Scheduler Manually
```bash
# SSH into your Dokploy server
ssh root@194.31.53.215

# Find the scheduler container
docker ps | grep scheduler

# Run scheduler once
docker exec -it <container-id> pnpm scheduler:run
```

### 3. Check Proaktif Page
```bash
# Go to: http://your-domain.com/dashboard/proactive
# See queued and sent messages
```

## Monitoring

### View Scheduler Logs
```bash
# Docker logs
docker logs -f aio-chat-scheduler

# Or via Dokploy Dashboard
# Application → Logs → Select scheduler service
```

### Check Database
```sql
-- Check pending messages
SELECT * FROM proactive_messages WHERE status = 'pending';

-- Check sent messages
SELECT * FROM proactive_messages WHERE status = 'sent';

-- Check failed messages
SELECT * FROM proactive_messages WHERE status = 'failed';
```

### Monitor Cron Execution
```bash
# Check last run time
SELECT MAX(scheduled_at) FROM proactive_messages;

# Count messages by type
SELECT message_type, status, COUNT(*)
FROM proactive_messages
GROUP BY message_type, status;
```

## Troubleshooting

### Scheduler Not Running
1. Check container status: `docker ps | grep scheduler`
2. Check logs: `docker logs aio-chat-scheduler`
3. Verify DATABASE_URL is correct
4. Ensure PostgreSQL is accessible

### Messages Not Sending
1. Check adapters are configured (Telegram/Twilio)
2. Check users have linked platform IDs
3. Check message status in database
4. View scheduler logs for errors

### Duplicate Messages
1. Check if multiple scheduler instances running
2. Verify `onConflictDoNothing()` is working
3. Check message uniqueness constraints

## Best Practices

### 1. Run Scheduler as Separate Service
- Easier to monitor and restart
- Doesn't affect main application
- Can scale independently

### 2. Use Environment-Specific Configuration
- Development: Run scheduler manually on demand
- Staging: Run every hour for testing
- Production: Run every hour, monitor closely

### 3. Set Up Alerts
- Monitor failed messages
- Track delivery rates
- Alert on high error rates

### 4. Regular Maintenance
- Clean up old sent messages
- Archive logs periodically
- Update message templates

## Next Steps

1. ✅ Deploy scheduler service on Dokploy
2. ✅ Configure Telegram/Twilio adapters
3. ✅ Seed test data
4. ✅ Run scheduler manually to test
5. ✅ Enable cron/daemon mode
6. ✅ Monitor logs and message delivery

## Files Modified

- `docker-entrypoint.sh` - Added SCHEDULER_MODE support
- `docker-compose.yml` - Already has scheduler service configured
- `src/lib/scheduler/proactive-scheduler.ts` - Core scheduler logic
- `src/lib/scheduler/run-scheduler.ts` - Scheduler runner script

## Support

For issues or questions:
- Check logs: `docker logs aio-chat-scheduler`
- Check Proaktif page in dashboard
- Review database: `proactive_messages` table
