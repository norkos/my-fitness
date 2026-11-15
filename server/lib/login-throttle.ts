export interface ThrottleOptions {
  /** Failed attempts allowed within the window before blocking. */
  maxFailures: number
  windowMs: number
  /** How long a client stays blocked once over the limit. */
  blockMs: number
}

interface Entry {
  failures: number
  windowStart: number
  blockedUntil: number
}

export const DEFAULT_THROTTLE: ThrottleOptions = {
  maxFailures: 5,
  windowMs: 15 * 60_000,
  blockMs: 15 * 60_000,
}

/** In-memory limiter for failed logins; sufficient for a single app instance. */
export class LoginThrottle {
  private entries = new Map<string, Entry>()

  constructor(
    private readonly options: ThrottleOptions = DEFAULT_THROTTLE,
    private readonly now: () => number = Date.now,
  ) {}

  /** Milliseconds until the client may try again, or 0 if allowed now. */
  retryAfter(key: string): number {
    const entry = this.entries.get(key)
    if (!entry) return 0
    return Math.max(0, entry.blockedUntil - this.now())
  }

  recordFailure(key: string): void {
    const t = this.now()
    const entry = this.entries.get(key)
    if (!entry || t - entry.windowStart > this.options.windowMs) {
      this.entries.set(key, { failures: 1, windowStart: t, blockedUntil: 0 })
      return
    }
    entry.failures += 1
    if (entry.failures >= this.options.maxFailures) {
      entry.blockedUntil = t + this.options.blockMs
    }
  }

  recordSuccess(key: string): void {
    this.entries.delete(key)
  }
}
