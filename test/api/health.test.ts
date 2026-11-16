import { mkdirSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { freePort, startApp, tempDbPath } from './helpers/app'

describe('GET /api/health', () => {
  it('returns 200 without a session when the database is reachable', async () => {
    const app = await startApp()
    try {
      const res = await app.request('/api/health')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    }
    finally {
      await app.stop()
    }
  })

  it('returns 503 when the database cannot be opened', async () => {
    const { dir } = tempDbPath()
    // A directory where the database file should be makes opening it fail.
    const dbPath = join(dir, 'is-a-directory')
    mkdirSync(dbPath, { recursive: true })

    const port = await freePort()
    const child = spawn(process.execPath, [resolve(process.cwd(), '.output/server/index.mjs')], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(port),
        HOST: '127.0.0.1',
        NUXT_APP_USERNAME: 'u',
        NUXT_APP_PASSWORD: 'p',
        NUXT_APP_SECRET: 's'.repeat(40),
        NUXT_DATABASE_PATH: dbPath,
      },
      stdio: 'ignore',
    })
    try {
      let status = 0
      for (let i = 0; i < 100 && !status; i++) {
        try {
          status = (await fetch(`http://127.0.0.1:${port}/api/health`)).status
        }
        catch {
          await new Promise(r => setTimeout(r, 100))
        }
      }
      expect(status).toBe(503)
    }
    finally {
      child.kill()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
