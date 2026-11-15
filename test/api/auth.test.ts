import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, TEST_PASSWORD, TEST_USERNAME, type TestApp } from './helpers/app'

function sessionCookie(res: { headers: Headers }): string | undefined {
  return res.headers.getSetCookie().find(c => c.startsWith('nuxt-auth-session='))
}

describe('auth (local HTTP mode)', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app?.stop()
  })

  it('logs in with the configured credentials and sets a 30-day HTTP-only cookie', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST', body: { username: TEST_USERNAME, password: TEST_PASSWORD } })
    expect(res.status).toBe(200)
    const cookie = sessionCookie(res)!
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Max-Age=2592000/)
    expect(cookie).not.toMatch(/;\s*Secure/i)
  })

  it('rejects a wrong password with a generic message and no session', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST', body: { username: TEST_USERNAME, password: 'wrong' } })
    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid username or password')
    expect(sessionCookie(res)).toBeUndefined()
  })

  it('rejects an unknown username with the same message', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST', body: { username: 'someone-else', password: TEST_PASSWORD } })
    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid username or password')
  })

  it('rejects a malformed body', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST', body: { username: '' } })
    expect(res.status).toBe(400)
  })

  it('reports the session to the client and clears it on logout', async () => {
    const cookie = await app.login()
    const session = await app.request('/api/_auth/session', { cookie })
    expect(session.body.user).toEqual({ username: TEST_USERNAME })

    const logout = await app.request('/api/auth/logout', { method: 'POST', cookie })
    expect(logout.status).toBe(200)
    const cleared = sessionCookie(logout)!
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i)

    // The browser now sends the cleared cookie, so data requests are rejected.
    const after = await app.request('/api/exercises', { cookie: cleared.split(';')[0] })
    expect(after.status).toBe(401)
  })
})

describe('auth throttling', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app?.stop()
  })

  it('blocks a client after repeated failed logins', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/auth/login', { method: 'POST', body: { username: TEST_USERNAME, password: `bad-${i}` } })
      expect(res.status).toBe(401)
    }
    const blocked = await app.request('/api/auth/login', { method: 'POST', body: { username: TEST_USERNAME, password: TEST_PASSWORD } })
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBeTruthy()
  })
})

describe('auth throttling with forged forwarding headers', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app?.stop()
  })

  it('still blocks a client that changes X-Forwarded-For and CF-Connecting-IP on every attempt', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        body: { username: TEST_USERNAME, password: `bad-${i}` },
        headers: { 'x-forwarded-for': `203.0.113.${i}`, 'cf-connecting-ip': `198.51.100.${i}` },
      })
      expect(res.status).toBe(401)
    }
    const blocked = await app.request('/api/auth/login', {
      method: 'POST',
      body: { username: TEST_USERNAME, password: TEST_PASSWORD },
      headers: { 'x-forwarded-for': '203.0.113.99', 'cf-connecting-ip': '198.51.100.99' },
    })
    expect(blocked.status).toBe(429)
  })
})

describe('auth throttling behind Cloudflare', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp({ env: { NUXT_TRUSTED_PROXY: 'cloudflare' } })
  })

  afterAll(async () => {
    await app?.stop()
  })

  const attempt = (ip: string, password: string) => app.request('/api/auth/login', {
    method: 'POST',
    body: { username: TEST_USERNAME, password },
    headers: { 'cf-connecting-ip': ip, 'x-forwarded-for': '203.0.113.1' },
  })

  it('throttles per CF-Connecting-IP, so one attacker does not lock out the owner', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await attempt('198.51.100.7', `bad-${i}`)).status).toBe(401)
    }
    expect((await attempt('198.51.100.7', TEST_PASSWORD)).status).toBe(429)
    expect((await attempt('192.0.2.10', TEST_PASSWORD)).status).toBe(200)
  })
})

describe('auth (production mode)', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp({ env: { NUXT_SESSION_COOKIE_SECURE: undefined } })
  })

  afterAll(async () => {
    await app?.stop()
  })

  it('marks the session cookie Secure, HttpOnly and SameSite', async () => {
    const res = await app.request('/api/auth/login', { method: 'POST', body: { username: TEST_USERNAME, password: TEST_PASSWORD } })
    expect(res.status).toBe(200)
    const cookie = sessionCookie(res)!
    expect(cookie).toMatch(/;\s*Secure/i)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
  })
})
