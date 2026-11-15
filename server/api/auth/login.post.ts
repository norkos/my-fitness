import { INVALID_CREDENTIALS_MESSAGE, loginSchema, SESSION_MAX_AGE_SECONDS } from '../../../shared/auth'
import { resolveClientKey } from '../../lib/client-ip'
import { readServerConfig } from '../../lib/config'
import { credentialsMatch } from '../../lib/credentials'

export default defineEventHandler(async (event) => {
  const config = readServerConfig(process.env)
  const clientKey = resolveClientKey(config.trustedProxy, {
    socketAddress: getRequestIP(event),
    cfConnectingIp: getRequestHeader(event, 'cf-connecting-ip'),
    xForwardedFor: getRequestHeader(event, 'x-forwarded-for'),
  })

  const retryAfterMs = loginThrottle.retryAfter(clientKey)
  if (retryAfterMs > 0) {
    setResponseHeader(event, 'Retry-After', Math.ceil(retryAfterMs / 1000))
    throw createError({ status: 429, message: 'Too many failed attempts. Try again later.' })
  }

  const parsed = loginSchema.safeParse(await readBody(event).catch(() => undefined))
  if (!parsed.success) {
    throw createError({ status: 400, message: INVALID_CREDENTIALS_MESSAGE })
  }

  if (!credentialsMatch(parsed.data, config)) {
    loginThrottle.recordFailure(clientKey)
    throw createError({ status: 401, message: INVALID_CREDENTIALS_MESSAGE })
  }

  loginThrottle.recordSuccess(clientKey)
  await replaceUserSession(
    event,
    { user: { username: config.username }, loggedInAt: new Date().toISOString() },
    { maxAge: SESSION_MAX_AGE_SECONDS },
  )
  return { ok: true }
})
