import { isDatabaseHealthy } from '../db/client'

export default defineEventHandler((event) => {
  if (!isDatabaseHealthy(getDatabaseHandle())) {
    setResponseStatus(event, 503)
    return { ok: false }
  }
  return { ok: true }
})
