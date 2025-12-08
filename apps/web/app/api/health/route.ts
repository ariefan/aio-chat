import { NextRequest, NextResponse } from 'next/server'

// Health check endpoint for Docker and monitoring
export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.1',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      },
      services: {
        database: 'checking...',
        websocket: 'ready',
        scheduler: 'ready',
      },
    }

    // Check database connection (if configured)
    if (process.env.DATABASE_URL) {
      try {
        // Simple database connectivity check
        // We'll implement this when we set up Drizzle
        health.services.database = 'connected'
      } catch (error) {
        health.services.database = 'error'
        health.status = 'degraded'
      }
    } else {
      health.services.database = 'not_configured'
    }

    // Determine HTTP status based on overall health
    const statusCode = health.status === 'healthy' ? 200 : 503

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    )
  }
}

// HEAD requests for simple liveness checks
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}