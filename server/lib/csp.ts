import { createHash } from 'node:crypto'

/**
 * Content-Security-Policy for the app. Scripts are limited to same-origin files plus the exact inline
 * scripts the SPA shell ships (import map, color mode, runtime config), allowed by hash rather than
 * 'unsafe-inline'. Inline styles stay allowed: Nuxt UI and Chart.js set style attributes at runtime.
 */
export function contentSecurityPolicy(scriptHashes: string[] = []): string {
  const scriptSrc = ['\'self\'', ...scriptHashes.map(h => `'${h}'`)].join(' ')
  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ')
}

/** Script types the browser does not execute, so CSP does not apply to them. */
const DATA_BLOCK_TYPES = new Set(['application/json', 'application/ld+json'])

/** `sha256-...` sources for every executable inline <script> in an HTML document. */
export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>()
  for (const [, attrs = '', body = ''] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(attrs)) continue
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase()
    if (type && DATA_BLOCK_TYPES.has(type)) continue
    hashes.add(`sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`)
  }
  return [...hashes]
}
