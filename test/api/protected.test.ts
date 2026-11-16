import { readdirSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { join, relative, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, type TestApp } from './helpers/app'

const API_DIR = resolve(process.cwd(), 'server/api')
const PUBLIC_ROUTES = new Set(['POST /api/auth/login', 'GET /api/health'])

/** Every route defined in server/api, e.g. "PATCH /api/exercises/1" for exercises/[id].patch.ts. */
function discoverRoutes(): Array<[method: string, path: string]> {
  const files = readdirSync(API_DIR, { recursive: true, withFileTypes: true })
    .filter(f => f.isFile() && f.name.endsWith('.ts'))
    .map(f => relative(API_DIR, join(f.parentPath, f.name)).replaceAll('\\', '/'))

  return files.map((file) => {
    const match = /^(.*)\.(get|post|put|patch|delete)\.ts$/.exec(file)
    if (!match) throw new Error(`Route file without an HTTP method suffix: ${file}`)
    const path = `/api/${match[1]}`.replace(/\/index$/, '').replace(/\[[^\]]+\]/g, '1')
    return [match[2]!.toUpperCase(), path] as [string, string]
  })
}

/** GET with the path sent exactly as written; fetch would resolve dot segments before sending. */
function rawStatus(baseUrl: string, path: string): Promise<number> {
  return new Promise((res, rej) => {
    const req = httpRequest(`${baseUrl}/`, { path }, (r) => {
      r.resume()
      res(r.statusCode ?? 0)
    })
    req.on('error', rej)
    req.end()
  })
}

const routes = discoverRoutes()
const protectedRoutes = routes.filter(([method, path]) => !PUBLIC_ROUTES.has(`${method} ${path}`))

describe('protected API', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app?.stop()
  })

  it('discovers all route files, including the public ones', () => {
    expect(routes.length).toBeGreaterThanOrEqual(13)
    expect(routes).toContainEqual(['POST', '/api/auth/login'])
    expect(routes).toContainEqual(['GET', '/api/exercises/1'])
  })

  it.each(protectedRoutes)('%s %s returns 401 without a session', async (method, path) => {
    const res = await app.request(path, { method, body: method === 'GET' || method === 'DELETE' ? undefined : {} })
    expect(res.status).toBe(401)
    expect(JSON.stringify(res.body)).not.toMatch(/"(sets|workouts|exercises)"/)
  })

  it('also protects other spellings of API paths', async () => {
    for (const path of ['/api/workouts/', '/api//workouts', '/api/health/../workouts']) {
      expect(await rawStatus(app.url, path), path).toBe(401)
    }
  })

  it('rejects a forged cookie', async () => {
    const res = await app.request('/api/workouts', { cookie: 'nuxt-auth-session=forged-value' })
    expect(res.status).toBe(401)
  })

  it('leaves the health endpoint public', async () => {
    expect((await app.request('/api/health')).status).toBe(200)
  })
})
