import { describe, expect, it } from 'vitest'
import { loginSchema } from '../../shared/auth'
import { credentialsMatch, safeEqual } from '../../server/lib/credentials'
import { LoginThrottle } from '../../server/lib/login-throttle'

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
  function setup() {
    let t = 0
    const throttle = new LoginThrottle({ maxFailures: 3, windowMs: 1000, blockMs: 5000 }, () => t)
    return { throttle, advance: (ms: number) => (t += ms) }
  }

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
