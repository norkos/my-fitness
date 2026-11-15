import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, type TestApp } from './helpers/app'

/** Every data endpoint. Keep in sync with server/api when adding routes. */
export const DATA_ENDPOINTS: Array<[method: string, path: string]> = [
  ['GET', '/api/exercises'],
  ['POST', '/api/exercises'],
  ['PATCH', '/api/exercises/1'],
  ['GET', '/api/exercises/1/last'],
  ['GET', '/api/exercises/1/progress'],
  ['GET', '/api/workouts'],
  ['POST', '/api/workouts'],
  ['GET', '/api/workouts/1'],
  ['PUT', '/api/workouts/1'],
  ['DELETE', '/api/workouts/1'],
  ['POST', '/api/auth/logout'],
]

describe('protected API', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app?.stop()
  })

  it.each(DATA_ENDPOINTS)('%s %s returns 401 without a session', async (method, path) => {
    const res = await app.request(path, { method, body: method === 'GET' || method === 'DELETE' ? undefined : {} })
    expect(res.status).toBe(401)
    expect(JSON.stringify(res.body)).not.toMatch(/"(sets|workouts|exercises)"/)
  })

  it('rejects a forged cookie', async () => {
    const res = await app.request('/api/workouts', { cookie: 'nuxt-auth-session=forged-value' })
    expect(res.status).toBe(401)
  })

  it('leaves the health endpoint public', async () => {
    expect((await app.request('/api/health')).status).toBe(200)
  })
})
