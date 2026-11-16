import { checkApiRequest, isApiPath, pathOnly } from '../lib/request-guard'

const PUBLIC_API_ROUTES = new Set(['/api/auth/login', '/api/health', '/api/_auth/session'])

export default defineEventHandler(async (event) => {
  // The raw path is what the router matches; only exact matches count as public.
  const path = pathOnly(event.path)
  if (!isApiPath(path)) return

  const rejection = checkApiRequest({
    method: event.method,
    secFetchSite: getRequestHeader(event, 'sec-fetch-site'),
    origin: getRequestHeader(event, 'origin'),
    host: getRequestHeader(event, 'host'),
    contentType: getRequestHeader(event, 'content-type'),
    contentLength: getRequestHeader(event, 'content-length'),
    transferEncoding: getRequestHeader(event, 'transfer-encoding'),
  })
  if (rejection) throw createError({ status: rejection.status, message: rejection.message })

  if (PUBLIC_API_ROUTES.has(path)) return
  await requireUserSession(event, { status: 401, message: 'Not logged in' })
})
