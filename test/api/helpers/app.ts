import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export const TEST_USERNAME = 'test-user'
export const TEST_PASSWORD = 'test-password-123'
const TEST_SECRET = 'test-secret-that-is-at-least-32-characters-long'

const serverEntry = resolve(process.cwd(), '.output/server/index.mjs')

export interface ApiResponse<T = any> {
  status: number
  headers: Headers
  body: T
}

export interface TestApp {
  url: string
  dbPath: string
  logs: string[]
  request: <T = any>(path: string, init?: { method?: string, body?: unknown, cookie?: string, headers?: Record<string, string> }) => Promise<ApiResponse<T>>
  login: (username?: string, password?: string) => Promise<string>
  stop: () => Promise<void>
}

function baseEnv(dbPath: string, port: number, overrides: Record<string, string | undefined>) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    HOST: '127.0.0.1',
    NUXT_APP_USERNAME: TEST_USERNAME,
    NUXT_APP_PASSWORD: TEST_PASSWORD,
    NUXT_APP_SECRET: TEST_SECRET,
    NUXT_DATABASE_PATH: dbPath,
    NUXT_SESSION_COOKIE_SECURE: 'false',
    ...overrides,
  }
  for (const key of Object.keys(env)) {
    if (env[key] === undefined) delete env[key]
  }
  return env
}

async function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', rej)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      const port = typeof address === 'object' && address ? address.port : 0
      srv.close(() => res(port))
    })
  })
}

function assertBuilt() {
  if (!existsSync(serverEntry)) {
    throw new Error('Built server not found at .output/server/index.mjs. Run `npm run build` before API tests.')
  }
}

export function tempDbPath(): { dir: string, dbPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'my-fitness-test-'))
  return { dir, dbPath: join(dir, 'nested', 'fitness.db') }
}

export async function startApp(options: { env?: Record<string, string | undefined>, dbPath?: string } = {}): Promise<TestApp> {
  assertBuilt()
  const tmp = options.dbPath ? undefined : tempDbPath()
  const dbPath = options.dbPath ?? tmp!.dbPath
  const port = await freePort()
  const url = `http://127.0.0.1:${port}`
  const logs: string[] = []

  const child: ChildProcess = spawn(process.execPath, [serverEntry], {
    env: baseEnv(dbPath, port, options.env ?? {}),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout?.on('data', d => logs.push(String(d)))
  child.stderr?.on('data', d => logs.push(String(d)))

  let exited = false
  child.on('exit', () => {
    exited = true
  })

  const deadline = Date.now() + 30_000
  while (true) {
    if (exited) throw new Error(`Server exited during startup:\n${logs.join('')}`)
    try {
      const res = await fetch(`${url}/api/health`)
      if (res.status === 200) break
    }
    catch {
      // not listening yet
    }
    if (Date.now() > deadline) {
      child.kill()
      throw new Error(`Server did not become healthy in time:\n${logs.join('')}`)
    }
    await new Promise(r => setTimeout(r, 100))
  }

  const request: TestApp['request'] = async (path, init = {}) => {
    const headers: Record<string, string> = { ...init.headers }
    if (init.body !== undefined) headers['content-type'] = 'application/json'
    if (init.cookie) headers.cookie = init.cookie
    const res = await fetch(`${url}${path}`, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      redirect: 'manual',
    })
    const text = await res.text()
    let body: any = text
    try {
      body = text ? JSON.parse(text) : undefined
    }
    catch {
      // keep text
    }
    return { status: res.status, headers: res.headers, body }
  }

  const login: TestApp['login'] = async (username = TEST_USERNAME, password = TEST_PASSWORD) => {
    const res = await request('/api/auth/login', { method: 'POST', body: { username, password } })
    if (res.status !== 200) throw new Error(`Login failed with ${res.status}`)
    const setCookie = res.headers.getSetCookie()
    return setCookie.map(c => c.split(';')[0]).join('; ')
  }

  const stop = async () => {
    if (!exited) {
      await new Promise<void>((res) => {
        child.once('exit', () => res())
        child.kill()
      })
    }
    if (tmp) rmSync(tmp.dir, { recursive: true, force: true })
  }

  return { url, dbPath, logs, request, login, stop }
}

/** Runs the server expecting it to exit on its own (e.g. invalid config). */
export async function runAppExpectingExit(env: Record<string, string | undefined>): Promise<{ code: number | null, output: string }> {
  assertBuilt()
  const { dir, dbPath } = tempDbPath()
  const port = await freePort()
  const child = spawn(process.execPath, [serverEntry], {
    env: baseEnv(dbPath, port, env),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', d => (output += String(d)))
  child.stderr.on('data', d => (output += String(d)))
  const code = await new Promise<number | null>((res) => {
    const timer = setTimeout(() => {
      child.kill()
      res(null)
    }, 15_000)
    child.on('exit', (c) => {
      clearTimeout(timer)
      res(c)
    })
  })
  rmSync(dir, { recursive: true, force: true })
  return { code, output }
}
