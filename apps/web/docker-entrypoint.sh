#!/bin/sh
# =============================================================================
# Docker Entrypoint Script
# =============================================================================
# Runs DB migrations before starting the application
# Can also run scheduler in daemon mode if SCHEDULER_MODE=daemon
# =============================================================================

set -e

echo "🚀 Starting AIO-CHAT..."

# Wait for database to be ready
if [ -n "$DATABASE_URL" ]; then
  echo "📊 Waiting for database connection..."

  # Extract host and port from DATABASE_URL
  # Format: postgresql://user:password@host:port/database
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

  # Default values
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}

  # For NeonDB and other cloud databases, skip TCP check and try direct connection
  # NeonDB poolers often don't respond to basic TCP tests but work fine with SSL
  if echo "$DATABASE_URL" | grep -q "neon.tech"; then
    echo "☁️  NeonDB detected - skipping TCP check (connection will be validated by app)"
  else
    MAX_RETRIES=30
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
      if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        echo "✅ Database is ready!"
        break
      fi

      RETRY_COUNT=$((RETRY_COUNT + 1))
      echo "   Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
      sleep 2
    done

    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "❌ Database connection timeout!"
      exit 1
    fi
  fi

  # Run database migrations
  if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "🔄 Running database migrations..."
    cd /app/apps/web
    npx drizzle-kit push --force || {
      echo "⚠️  Migration failed, but continuing..."
    }
    echo "✅ Migrations complete!"
  fi
fi

# =============================================================================
# SCHEDULER MODE - Run scheduler alongside web server
# =============================================================================
cd /app/apps/web

if [ "$SCHEDULER_MODE" = "daemon" ]; then
  echo "📅 Starting PROACTIVE MESSAGE SCHEDULER in daemon mode..."
  echo "   - Will run every hour at minute 0"
  # Start scheduler in background
  node src/lib/scheduler/scheduler-daemon.js > /tmp/scheduler.log 2>&1 &
  SCHEDULER_PID=$!
  echo "✅ Scheduler started (PID: $SCHEDULER_PID, logs in /tmp/scheduler.log)"
fi

# Start the application
echo "🚀 Starting application..."
exec "$@"
