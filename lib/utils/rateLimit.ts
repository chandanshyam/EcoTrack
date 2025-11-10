// Rate Limiting Utility for API Protection
// Uses in-memory store - for distributed deployments, consider Redis

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max unique tokens per interval
}

interface RateLimitStore {
  [key: string]: number[]
}

export class RateLimiter {
  private store: RateLimitStore = {}
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = { interval: 60000, uniqueTokenPerInterval: 500 }) {
    this.config = config

    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  check(identifier: string, limit: number): { success: boolean; remaining: number; reset: number } {
    const now = Date.now()
    const windowStart = now - this.config.interval

    // Initialize or get existing timestamps for this identifier
    if (!this.store[identifier]) {
      this.store[identifier] = []
    }

    // Remove timestamps outside the current window
    this.store[identifier] = this.store[identifier].filter(timestamp => timestamp > windowStart)

    // Check if limit exceeded
    const currentCount = this.store[identifier].length
    const success = currentCount < limit

    if (success) {
      this.store[identifier].push(now)
    }

    return {
      success,
      remaining: Math.max(0, limit - currentCount - (success ? 1 : 0)),
      reset: windowStart + this.config.interval,
    }
  }

  private cleanup() {
    const now = Date.now()
    const windowStart = now - this.config.interval

    for (const identifier in this.store) {
      this.store[identifier] = this.store[identifier].filter(timestamp => timestamp > windowStart)

      // Remove identifier if no timestamps left
      if (this.store[identifier].length === 0) {
        delete this.store[identifier]
      }
    }
  }

  reset(identifier: string) {
    delete this.store[identifier]
  }

  getStats() {
    return {
      totalIdentifiers: Object.keys(this.store).length,
      totalRequests: Object.values(this.store).reduce((sum, timestamps) => sum + timestamps.length, 0),
    }
  }
}

// Global rate limiter instances
export const globalRateLimiter = new RateLimiter({
  interval: 60000, // 1 minute
  uniqueTokenPerInterval: 500,
})

export const apiRateLimiter = new RateLimiter({
  interval: 60000, // 1 minute
  uniqueTokenPerInterval: 1000,
})

// Helper function to get client identifier
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (Cloud Run, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')

  const ip = cfIp || realIp || forwarded?.split(',')[0] || 'unknown'

  // For authenticated requests, could also include user ID
  return ip.trim()
}

// Rate limit middleware wrapper
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  limit: number = 60
) {
  return async (request: Request): Promise<Response> => {
    const identifier = getClientIdentifier(request)
    const result = apiRateLimiter.check(identifier, limit)

    // Add rate limit headers
    const headers = new Headers()
    headers.set('X-RateLimit-Limit', limit.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString())

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers),
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Call the actual handler
    const response = await handler(request)

    // Add rate limit headers to successful response
    const newResponse = new Response(response.body, response)
    headers.forEach((value, key) => newResponse.headers.set(key, value))

    return newResponse
  }
}

// Sliding window rate limiter for more precise control
export class SlidingWindowRateLimiter {
  private windows: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(private windowMs: number = 60000) {
    // Clean up expired windows every minute
    setInterval(() => this.cleanupExpired(), 60000)
  }

  async check(key: string, maxRequests: number): Promise<boolean> {
    const now = Date.now()
    const window = this.windows.get(key)

    if (!window || now >= window.resetTime) {
      // Create new window
      this.windows.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return true
    }

    if (window.count >= maxRequests) {
      return false
    }

    window.count++
    return true
  }

  private cleanupExpired() {
    const now = Date.now()
    for (const [key, window] of this.windows.entries()) {
      if (now >= window.resetTime) {
        this.windows.delete(key)
      }
    }
  }
}
