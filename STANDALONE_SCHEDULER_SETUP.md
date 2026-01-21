# Standalone Scheduler Setup Guide

## 🎯 What This Does

Runs the BPJS proactive message scheduler **outside of Docker**, directly on your Dokploy server.

**Advantages:**
- ✅ Zero risk to your working web app
- ✅ Uses the same database (NeonDB)
- ✅ Runs TypeScript/JavaScript directly
- ✅ Easy to debug and monitor
- ✅ Can be started/stopped anytime
- ✅ Works TODAY (no deployment issues)

---

## 📋 Step-by-Step Setup

### Step 1: Connect to Your Server

```bash
ssh root@194.31.53.215
```

### Step 2: Create Scheduler Directory

```bash
mkdir -p /opt/bpjs-scheduler
cd /opt/bpjs-scheduler
```

### Step 3: Create package.json

```bash
cat > package.json <<'EOF'
{
  "name": "bpjs-scheduler",
  "version": "1.0.0",
  "description": "BPJS Proactive Message Scheduler",
  "main": "standalone-scheduler.js",
  "scripts": {
    "start": "node standalone-scheduler.js --daemon",
    "run": "node standalone-scheduler.js"
  },
  "dependencies": {
    "node-cron": "^3.0.3",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1"
  }
}
EOF
```

### Step 4: Create Environment File

```bash
cat > .env <<'EOF'
DATABASE_URL=postgresql://neondb_owner:npg_TDWkVJGyEp94@ep-autumn-wildflower-a1rqhzux-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
TZ=Asia/Jakarta
EOF
```

### Step 5: Copy Scheduler Script

**Copy the content of** `apps/web/src/lib/scheduler/standalone-scheduler.js` **from your local machine to the server:**

```bash
# On your LOCAL machine:
cat apps/web/src/lib/scheduler/standalone-scheduler.js | ssh root@194.31.53.215 'cat > /opt/bpjs-scheduler/standalone-scheduler.js'
```

### Step 6: Install Dependencies

```bash
# On the server
cd /opt/bpjs-scheduler
npm install
```

### Step 7: Test Run

```bash
# Test single execution
npm run run

# If successful, you should see:
# ✅ Connected to database
# ✅ Scheduler completed
```

### Step 8: Set Up Cron Job

```bash
# Edit crontab
crontab -e

# Add this line to run every hour at minute 0:
0 * * * * cd /opt/bpjs-scheduler && npm run run >> /var/log/bpjs-scheduler.log 2>&1

# Save and exit
```

### Step 9: Monitor Logs

```bash
# View scheduler logs
tail -f /var/log/bpjs-scheduler.log

# Or check recent runs
tail -n 50 /var/log/bpjs-scheduler.log
```

---

## 🔧 Optional: Run as Daemon (Instead of Cron)

If you prefer a continuously running process:

```bash
# Create systemd service
cat > /etc/systemd/system/bpjs-scheduler.service <<'EOF'
[Unit]
Description=BPJS Proactive Message Scheduler
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/bpjs-scheduler
ExecStart=/usr/bin/node standalone-scheduler.js --daemon
Restart=always
EnvironmentFile=/opt/bpjs-scheduler/.env

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable bpjs-scheduler
systemctl start bpjs-scheduler

# Check status
systemctl status bpjs-scheduler

# View logs
journalctl -u bpjs-scheduler -f
```

---

## ✅ Verification

After setup, verify it's working:

```bash
# Check last execution
grep "✅ Scheduler completed" /var/log/bpjs-scheduler.log | tail -5

# Check for errors
grep "❌" /var/log/bpjs-scheduler.log | tail -10

# View cron schedule
crontab -l | grep bpjs
```

---

## 📊 Next Steps

Once the scheduler is running, you need to **implement the actual proactive message logic** in `standalone-scheduler.js`:

1. Query BPJS members with upcoming payment due dates
2. Check their behavioral segmentation (PANDAWA personas)
3. Generate personalized messages based on knowledge base
4. Insert messages into the `messages` table with `direction='outbound'`
5. Your existing webhook handlers will pick up and send them

---

## 🛑 Stopping the Scheduler

```bash
# If using cron:
crontab -e
# Remove the bpjs-scheduler line

# If using systemd:
systemctl stop bpjs-scheduler
systemctl disable bpjs-scheduler

# Kill running process:
pkill -f standalone-scheduler.js
```

---

## 📞 Troubleshooting

### "Cannot find module 'node-cron'"
```bash
cd /opt/bpjs-scheduler
npm install
```

### "Connection refused" to database
```bash
# Check DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
psql "$DATABASE_URL" -c "SELECT 1"
```

### Scheduler not running
```bash
# Check if cron is active
systemctl status cron

# Check cron logs
grep CRON /var/log/syslog | tail -20
```

---

**Generated:** 2026-01-20
**Status:** ✅ Ready to deploy
