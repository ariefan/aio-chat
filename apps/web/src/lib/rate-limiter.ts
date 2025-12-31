/**
 * Rate Limiter - Protects APIs from abuse
 *
 * Uses in-memory store for POC. For production, use Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimiterConfig {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Max requests per window
  keyPrefix?: string    // Prefix for keys
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check if request should be rate limited
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimiterConfig
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const key = `${config.keyPrefix || 'rl'}:${identifier}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)

  // Create new entry or reset if expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Webhook endpoints - generous limits for platform callbacks
  webhook: {
    windowMs: 60 * 1000,    // 1 minute
    maxRequests: 100,       // 100 requests per minute
    keyPrefix: 'webhook',
  },

  // API endpoints - moderate limits
  api: {
    windowMs: 60 * 1000,    // 1 minute
    maxRequests: 60,        // 60 requests per minute (1/sec avg)
    keyPrefix: 'api',
  },

  // Auth endpoints - strict limits to prevent brute force
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,          // 10 attempts per 15 minutes
    keyPrefix: 'auth',
  },

  // BPJS verification - prevent enumeration attacks
  verification: {
    windowMs: 60 * 1000,    // 1 minute
    maxRequests: 5,         // 5 verification attempts per minute
    keyPrefix: 'verify',
  },

  // AI chat - expensive operation
  aiChat: {
    windowMs: 60 * 1000,    // 1 minute
    maxRequests: 20,        // 20 AI requests per minute
    keyPrefix: 'ai',
  },

  // Proactive scheduler - very limited
  scheduler: {
    windowMs: 60 * 1000,    // 1 minute
    maxRequests: 5,         // 5 scheduler triggers per minute
    keyPrefix: 'scheduler',
  },
} as const

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a hash of user-agent + other headers
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  return `anon:${simpleHash(userAgent + acceptLanguage)}`
}

/**
 * Simple hash function for anonymous client identification
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: {
  remaining: number
  resetAt: number
  retryAfter?: number
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  }

  if (result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString()
  }

  return headers
}

/**
 * Rate limit error response
 */
export function rateLimitExceededResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}
