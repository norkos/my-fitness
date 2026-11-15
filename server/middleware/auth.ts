const PUBLIC_API_ROUTES = new Set(['/api/auth/login', '/api/health', '/api/_auth/session'])

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/') || PUBLIC_API_ROUTES.has(path)) return
  await requireUserSession(event, { status: 401, message: 'Not logged in' })
})
