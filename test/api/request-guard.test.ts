import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, TEST_PASSWORD, TEST_USERNAME, type TestApp } from './helpers/app'

describe('request guard and security headers', () => {
  let app: TestApp
  let cookie: string

  beforeAll(async () => {
    app = await startApp()
    cookie = await app.login()
  })

  afterAll(async () => {
    await app?.stop()
  })

  const raw = (path: string, init: RequestInit) => fetch(`${app.url}${path}`, { redirect: 'manual', ...init })

  it('rejects a cross-site write even with a valid session cookie', async () => {
    const res = await raw('/api/exercises', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
      body: JSON.stringify({ name: 'Evil', kind: 'timed' }),
    })
    expect(res.status).toBe(403)
    const list = await app.request('/api/exercises', { cookie })
    expect(list.body).toEqual([])
  })

  it('rejects a form-encoded login (login CSRF) and a form-encoded write', async () => {
    const login = await raw('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `username=${TEST_USERNAME}&password=${TEST_PASSWORD}`,
    })
    expect(login.status).toBe(415)

    const write = await raw('/api/exercises', {
      method: 'POST',
      headers: { cookie, 'content-type': 'text/plain' },
      body: JSON.stringify({ name: 'Plank', kind: 'timed' }),
    })
    expect(write.status).toBe(415)
  })

  it('rejects oversized bodies', async () => {
    const res = await raw('/api/exercises', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x'.repeat(300 * 1024), kind: 'timed' }),
    })
    expect(res.status).toBe(413)
  })

  it('rejects a chunked body without a length, before reading it', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ username: TEST_USERNAME, password: TEST_PASSWORD })))
        controller.close()
      },
    })
    const res = await raw('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      duplex: 'half',
    } as RequestInit)
    expect(res.status).toBe(411)
  })

  it('rejects a bodyless write from another Origin when fetch metadata is missing', async () => {
    const res = await raw('/api/auth/logout', { method: 'POST', headers: { cookie, origin: 'https://evil.example' } })
    expect(res.status).toBe(403)
    expect((await app.request('/api/exercises', { cookie })).status).toBe(200)
  })

  it('accepts same-origin JSON writes', async () => {
    const res = await raw('/api/exercises', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
      body: JSON.stringify({ name: 'Plank', kind: 'timed' }),
    })
    expect(res.status).toBe(201)
  })

  it.each(['/', '/api/health'])('sends security headers on %s', async (path) => {
    const res = await raw(path, {})
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('referrer-policy')).toBe('same-origin')
    expect(res.headers.get('content-security-policy')).toContain(`frame-ancestors 'none'`)
    expect(res.headers.get('strict-transport-security')).toBe('max-age=31536000')
    expect(res.headers.get('content-security-policy')).not.toMatch(/script-src[^;]*unsafe-inline/)
  })

  it('allows the inline scripts of an HTML page by hash', async () => {
    const res = await raw('/login', {})
    const csp = res.headers.get('content-security-policy') ?? ''
    const html = await res.text()
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/json)[^>]*>/g)]
    expect(inline.length).toBeGreaterThan(0)
    expect(csp.match(/'sha256-[^']+'/g)?.length).toBe(inline.length)
  })
})
