import { describe, expect, it } from 'vitest'
import { checkApiRequest, isApiPath, MAX_BODY_BYTES, pathOnly } from '../../server/lib/request-guard'

const json = { contentType: 'application/json', contentLength: '20' }

describe('checkApiRequest', () => {
  it('allows safe methods regardless of origin', () => {
    expect(checkApiRequest({ method: 'GET', secFetchSite: 'cross-site' })).toBeNull()
    expect(checkApiRequest({ method: 'head' })).toBeNull()
  })

  it('allows same-origin and non-browser JSON writes', () => {
    expect(checkApiRequest({ method: 'POST', secFetchSite: 'same-origin', ...json })).toBeNull()
    expect(checkApiRequest({ method: 'POST', ...json })).toBeNull()
    expect(checkApiRequest({ method: 'PUT', secFetchSite: 'none', ...json })).toBeNull()
  })

  it.each(['cross-site', 'same-site', 'Cross-Site'])('rejects writes with Sec-Fetch-Site: %s', (site) => {
    expect(checkApiRequest({ method: 'POST', secFetchSite: site, ...json })).toEqual({ status: 403, message: 'Cross-site requests are not allowed' })
    expect(checkApiRequest({ method: 'DELETE', secFetchSite: site })?.status).toBe(403)
  })

  it('rejects non-JSON bodies, including form posts', () => {
    expect(checkApiRequest({ method: 'POST', contentType: 'application/x-www-form-urlencoded', contentLength: '10' })?.status).toBe(415)
    expect(checkApiRequest({ method: 'POST', contentLength: '10' })?.status).toBe(415)
  })

  it('accepts JSON with a charset and writes without a body', () => {
    expect(checkApiRequest({ method: 'PATCH', contentType: 'application/json; charset=utf-8', contentLength: '5' })).toBeNull()
    expect(checkApiRequest({ method: 'DELETE' })).toBeNull()
    expect(checkApiRequest({ method: 'POST', contentLength: '0' })).toBeNull()
  })

  it('rejects bodies without a declared length, whatever their type', () => {
    const chunked = { method: 'POST', transferEncoding: 'chunked' }
    expect(checkApiRequest({ ...chunked, contentType: 'application/json' })).toEqual({ status: 411, message: 'Content-Length is required' })
    expect(checkApiRequest({ ...chunked, contentType: 'text/plain' })?.status).toBe(411)
  })

  it('rejects an invalid Content-Length', () => {
    expect(checkApiRequest({ method: 'POST', ...json, contentLength: 'abc' })?.status).toBe(400)
    expect(checkApiRequest({ method: 'POST', ...json, contentLength: '-1' })?.status).toBe(400)
  })

  describe('Origin fallback for browsers without fetch metadata', () => {
    const host = 'fit.example.com'

    it('allows writes from the same origin', () => {
      expect(checkApiRequest({ method: 'POST', origin: 'https://fit.example.com', host, ...json })).toBeNull()
      expect(checkApiRequest({ method: 'POST', origin: 'http://localhost:3000', host: 'localhost:3000' })).toBeNull()
    })

    it.each(['https://evil.example', 'https://fit.example.com.evil.example', 'null', 'not a url'])('rejects a bodyless write from Origin %s', (origin) => {
      expect(checkApiRequest({ method: 'POST', origin, host })?.status).toBe(403)
    })

    it('prefers Sec-Fetch-Site when both are present', () => {
      expect(checkApiRequest({ method: 'POST', secFetchSite: 'same-origin', origin: 'https://other.example', host })).toBeNull()
    })
  })

  it('rejects oversized bodies', () => {
    expect(checkApiRequest({ method: 'POST', contentType: 'application/json', contentLength: String(MAX_BODY_BYTES + 1) }))
      .toEqual({ status: 413, message: 'Request body is too large' })
  })
})

describe('path helpers', () => {
  it.each([['/api/workouts', true], ['/API/workouts', true], ['/api', true], ['/apiary', false], ['/workouts', false]])('isApiPath(%s) -> %s', (path, expected) => {
    expect(isApiPath(path)).toBe(expected)
  })

  it('strips only the query string', () => {
    expect(pathOnly('/api/health?x=1')).toBe('/api/health')
    expect(pathOnly('/api/health/../workouts')).toBe('/api/health/../workouts')
  })
})
