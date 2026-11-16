export const MAX_BODY_BYTES = 256 * 1024

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
/** Fetch metadata values a browser sends for requests made by this app itself (or typed by the user). */
const ALLOWED_FETCH_SITES = new Set(['same-origin', 'none'])

export interface ApiRequestInfo {
  method: string
  /** `Sec-Fetch-Site` header; set by browsers and not controllable by page scripts. */
  secFetchSite?: string | null
  /** `Origin` header; the fallback for browsers that predate fetch metadata. */
  origin?: string | null
  /** `Host` header of the request, compared with `Origin`. */
  host?: string | null
  contentType?: string | null
  contentLength?: string | null
  transferEncoding?: string | null
}

export interface GuardRejection {
  status: number
  message: string
}

const CROSS_SITE: GuardRejection = { status: 403, message: 'Cross-site requests are not allowed' }

/** True when the request is known to come from a page on another origin. */
function isCrossSite(req: ApiRequestInfo): boolean {
  const site = req.secFetchSite?.trim().toLowerCase()
  if (site) return !ALLOWED_FETCH_SITES.has(site)

  // Older browsers send no fetch metadata but do send Origin on cross-origin writes.
  // Non-browser clients send neither, and are allowed.
  const origin = req.origin?.trim()
  if (!origin) return false
  if (origin === 'null') return true
  try {
    return new URL(origin).host.toLowerCase() !== req.host?.trim().toLowerCase()
  }
  catch {
    return true
  }
}

/**
 * Rejects requests to the API that a browser could only have sent on behalf of another site (CSRF),
 * and bodies that are not JSON or are too large.
 */
export function checkApiRequest(req: ApiRequestInfo): GuardRejection | null {
  const method = req.method.toUpperCase()
  if (SAFE_METHODS.has(method)) return null

  if (isCrossSite(req)) return CROSS_SITE

  // Without a declared length the body could only be size-checked while streaming it,
  // and the body readers in use have no limit. Browsers always send a length for JSON bodies.
  if (req.transferEncoding) {
    return { status: 411, message: 'Content-Length is required' }
  }

  const length = Number(req.contentLength ?? 0)
  if (!Number.isFinite(length) || length < 0) {
    return { status: 400, message: 'Invalid Content-Length' }
  }
  if (length > MAX_BODY_BYTES) {
    return { status: 413, message: 'Request body is too large' }
  }

  if (length > 0) {
    const type = req.contentType?.split(';')[0]?.trim().toLowerCase()
    if (type !== 'application/json') {
      return { status: 415, message: 'Request body must be JSON' }
    }
  }
  return null
}

/** True for any path under /api, compared case-insensitively so no spelling can skip the checks. */
export function isApiPath(path: string): boolean {
  const lower = path.toLowerCase()
  return lower === '/api' || lower.startsWith('/api/')
}

/** Strips the query string from a raw request path without normalizing it. */
export function pathOnly(rawPath: string): string {
  const q = rawPath.indexOf('?')
  return q === -1 ? rawPath : rawPath.slice(0, q)
}
