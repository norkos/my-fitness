export interface ThrottleOptions {
  /** Failed attempts allowed within the window before blocking. */
  maxFailures: number
  windowMs: number
  /** How long a client stays blocked once over the limit. */
  blockMs: number
  /** Number of tracked clients above which stale entries are pruned. */
  pruneAbove: number
  /** Minimum time between two prune passes, so a flood of new clients cannot make every request scan the map. */
  pruneIntervalMs: number
  /** Hard cap on tracked clients; the oldest windows are evicted first when it is exceeded. */
  maxEntries: number
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
  pruneAbove: 1000,
  pruneIntervalMs: 60_000,
  maxEntries: 10_000,
}

/** In-memory limiter for failed logins; sufficient for a single app instance. */
export class LoginThrottle {
  /** Insertion order is the order windows started in, so the first key is always the oldest. */
  private entries = new Map<string, Entry>()
  private lastPrune = Number.NEGATIVE_INFINITY

  constructor(
    private readonly options: ThrottleOptions = DEFAULT_THROTTLE,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    return this.entries.size
  }

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
      // Re-insert so the map stays ordered by window start.
      this.entries.delete(key)
      this.entries.set(key, { failures: 1, windowStart: t, blockedUntil: 0 })
      this.limitSize(t)
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

  private limitSize(t: number): void {
    if (this.entries.size > this.options.pruneAbove && t - this.lastPrune >= this.options.pruneIntervalMs) {
      this.lastPrune = t
      this.prune(t)
    }
    // Evicting the oldest window costs O(1) per entry, keeping memory bounded under a flood of new clients.
    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next().value as string
      this.entries.delete(oldest)
    }
  }

  /** Drops entries whose window has passed and that are no longer blocked. */
  private prune(t: number): void {
    for (const [key, entry] of this.entries) {
      if (t - entry.windowStart > this.options.windowMs && entry.blockedUntil <= t) this.entries.delete(key)
    }
  }
}
