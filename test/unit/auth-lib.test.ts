import { describe, expect, it } from 'vitest'
import { loginSchema } from '../../shared/auth'
import { credentialsMatch, safeEqual } from '../../server/lib/credentials'
import { LoginThrottle, type ThrottleOptions } from '../../server/lib/login-throttle'

describe('safeEqual', () => {
  it('matches equal strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
  })

  it('rejects different strings, including different lengths', () => {
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('credentialsMatch', () => {
  const expected = { username: 'me', password: 'p@ss' }

  it('accepts exact credentials', () => {
    expect(credentialsMatch({ username: 'me', password: 'p@ss' }, expected)).toBe(true)
  })

  it('rejects a wrong password or unknown user', () => {
    expect(credentialsMatch({ username: 'me', password: 'nope' }, expected)).toBe(false)
    expect(credentialsMatch({ username: 'you', password: 'p@ss' }, expected)).toBe(false)
  })

  it('is case sensitive', () => {
    expect(credentialsMatch({ username: 'ME', password: 'p@ss' }, expected)).toBe(false)
  })
})

describe('loginSchema', () => {
  it('trims the username', () => {
    expect(loginSchema.parse({ username: '  me ', password: 'x' }).username).toBe('me')
  })

  it('requires both fields', () => {
    expect(loginSchema.safeParse({ username: '', password: 'x' }).success).toBe(false)
    expect(loginSchema.safeParse({ username: 'me', password: '' }).success).toBe(false)
    expect(loginSchema.safeParse(undefined).success).toBe(false)
  })
})

describe('LoginThrottle', () => {
  function setup(overrides: Partial<ThrottleOptions> = {}) {
    let t = 0
    const options = { maxFailures: 3, windowMs: 1000, blockMs: 5000, pruneAbove: 3, pruneIntervalMs: 1000, maxEntries: 100, ...overrides }
    const throttle = new LoginThrottle(options, () => t)
    return { throttle, advance: (ms: number) => (t += ms) }
  }

  it('prunes stale entries once many clients are tracked, keeping blocked ones', () => {
    const { throttle, advance } = setup()
    for (let i = 0; i < 3; i++) throttle.recordFailure('blocked')
    throttle.recordFailure('a')
    throttle.recordFailure('b')
    advance(1500)
    throttle.recordFailure('c') // 4 entries > pruneAbove: stale 'a' and 'b' are dropped
    expect(throttle.size).toBe(2)
    expect(throttle.retryAfter('blocked')).toBeGreaterThan(0)
  })

  it('skips pruning inside the interval', () => {
    const { throttle, advance } = setup({ pruneIntervalMs: 10_000 })
    for (const key of ['a', 'b', 'c']) throttle.recordFailure(key)
    advance(1500)
    throttle.recordFailure('d') // first prune
    for (const key of ['e', 'f', 'g']) throttle.recordFailure(key)
    advance(1500)
    throttle.recordFailure('h') // e..g are stale, but the last prune was only 1500ms ago
    expect(throttle.size).toBe(5)
  })

  it('evicts the oldest clients once the hard cap is reached', () => {
    const { throttle, advance } = setup({ pruneAbove: 1000, maxEntries: 3 })
    for (const key of ['a', 'b', 'c']) {
      throttle.recordFailure(key)
      advance(1)
    }
    throttle.recordFailure('d')
    expect(throttle.size).toBe(3)
    for (let i = 0; i < 3; i++) throttle.recordFailure('b') // b is now blocked
    throttle.recordFailure('e') // evicts b, the oldest remaining window
    expect(throttle.size).toBe(3)
    expect(throttle.retryAfter('b')).toBe(0)
  })

  it('allows attempts below the limit', () => {
    const { throttle } = setup()
    throttle.recordFailure('ip')
    throttle.recordFailure('ip')
    expect(throttle.retryAfter('ip')).toBe(0)
  })

  it('blocks after reaching the limit and unblocks later', () => {
    const { throttle, advance } = setup()
    for (let i = 0; i < 3; i++) throttle.recordFailure('ip')
    expect(throttle.retryAfter('ip')).toBe(5000)
    advance(4000)
    expect(throttle.retryAfter('ip')).toBe(1000)
    advance(1000)
    expect(throttle.retryAfter('ip')).toBe(0)
  })

  it('starts a new window when failures are spread out', () => {
    const { throttle, advance } = setup()
    throttle.recordFailure('ip')
    throttle.recordFailure('ip')
    advance(1500)
    throttle.recordFailure('ip')
    expect(throttle.retryAfter('ip')).toBe(0)
  })

  it('resets on success and tracks clients separately', () => {
    const { throttle } = setup()
    throttle.recordFailure('a')
    throttle.recordFailure('a')
    throttle.recordSuccess('a')
    throttle.recordFailure('a')
    for (let i = 0; i < 3; i++) throttle.recordFailure('b')
    expect(throttle.retryAfter('a')).toBe(0)
    expect(throttle.retryAfter('b')).toBeGreaterThan(0)
    expect(throttle.retryAfter('unknown')).toBe(0)
  })
})
