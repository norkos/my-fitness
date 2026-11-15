import { describe, expect, it } from 'vitest'
import { parseTrustedProxyMode, resolveClientKey } from '../../server/lib/client-ip'

const spoofed = { socketAddress: '10.0.0.5', cfConnectingIp: '1.1.1.1', xForwardedFor: '6.6.6.6, 7.7.7.7' }

describe('resolveClientKey', () => {
  it('none: uses the socket address and ignores forwarding headers', () => {
    expect(resolveClientKey('none', spoofed)).toBe('10.0.0.5')
  })

  it('none: falls back to "unknown" without a socket address', () => {
    expect(resolveClientKey('none', {})).toBe('unknown')
  })

  it('cloudflare: uses CF-Connecting-IP', () => {
    expect(resolveClientKey('cloudflare', spoofed)).toBe('1.1.1.1')
  })

  it('cloudflare: falls back to the socket address when the header is missing', () => {
    expect(resolveClientKey('cloudflare', { socketAddress: '10.0.0.5' })).toBe('10.0.0.5')
  })

  it('generic: uses the last X-Forwarded-For entry, ignoring client-supplied ones', () => {
    expect(resolveClientKey('generic', spoofed)).toBe('7.7.7.7')
    expect(resolveClientKey('generic', { ...spoofed, xForwardedFor: ' 7.7.7.7 ' })).toBe('7.7.7.7')
  })

  it('generic: falls back to the socket address when the header is missing or empty', () => {
    expect(resolveClientKey('generic', { socketAddress: '10.0.0.5', xForwardedFor: ' , ' })).toBe('10.0.0.5')
    expect(resolveClientKey('generic', { socketAddress: '10.0.0.5' })).toBe('10.0.0.5')
  })
})

describe('parseTrustedProxyMode', () => {
  it.each([[undefined, 'none'], ['', 'none'], [' none ', 'none'], ['CLOUDFLARE', 'cloudflare'], ['generic', 'generic'], ['all', undefined]])(
    '%s -> %s',
    (value, mode) => {
      expect(parseTrustedProxyMode(value)).toBe(mode)
    },
  )
})
