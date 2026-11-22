// Runs the E2E suite against the production build with a throwaway database and test credentials,
// so the real .env and data are never touched. NUXT_* / NITRO_* variables inherited from the shell are
// ignored: only the settings below configure the server. Prints a short summary; Playwright's failure details
// are shown only for failing tests.
//   npm run test:e2e:local                      build, start, test, stop
//   npm run test:e2e:local -- --no-build        reuse the existing .output
//   npm run test:e2e:local -- e2e/import.spec.ts -g "rejects"   extra arguments go to Playwright
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { freePort, serverEnv, waitForHealth } from './lib/local-server.mjs'

const args = process.argv.slice(2)
const build = !args.includes('--no-build')
const playwrightArgs = args.filter(a => a !== '--no-build')
const USERNAME = 'e2e-user'
const PASSWORD = 'e2e-password-123'

/**
 * Runs npm without a shell: through npm's own JS entry point when started via `npm run` (no quoting issues with
 * paths such as "C:\Program Files"); otherwise a fixed `npm ...` command line, which never contains user input.
 */
function npm(args) {
  const cli = process.env.npm_execpath
  if (cli && cli.endsWith('.js')) return { cmd: process.execPath, args: [cli, ...args], shell: false }
  return { cmd: `npm ${args.join(' ')}`, args: [], shell: true }
}

function run({ cmd, args: cmdArgs, shell = false }, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, { shell, stdio: 'inherit', ...options })
    child.on('close', code => resolve(code ?? 1))
  })
}

if (build) {
  console.log('Building...')
  const code = await run(npm(['run', 'build']), { stdio: ['ignore', 'ignore', 'inherit'] })
  if (code !== 0) process.exit(code)
}
if (!existsSync('.output/server/index.mjs')) {
  console.error('No build found at .output/server/index.mjs; run without --no-build.')
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'my-fitness-e2e-'))
const port = await freePort()
const url = `http://127.0.0.1:${port}`
let serverLog = ''
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: serverEnv({
    NODE_ENV: 'production',
    PORT: String(port),
    HOST: '127.0.0.1',
    NUXT_APP_USERNAME: USERNAME,
    NUXT_APP_PASSWORD: PASSWORD,
    NUXT_APP_SECRET: 'e2e-secret-that-is-at-least-32-characters-long',
    NUXT_DATABASE_PATH: join(dir, 'fitness.db'),
    NUXT_SESSION_COOKIE_SECURE: 'false',
  }),
})
server.stdout.on('data', (d) => { serverLog += d })
server.stderr.on('data', (d) => { serverLog += d })

let exitCode = 1
try {
  if (!(await waitForHealth(url, server))) {
    console.error(`Server did not become healthy:\n${serverLog.slice(-4000)}`)
  }
  else {
    console.log(`Testing against ${url} with a fresh database...`)
    // Playwright's CLI run directly with node: no shell, so extra arguments (test names) pass through unquoted-safe.
    const playwright = { cmd: process.execPath, args: ['node_modules/@playwright/test/cli.js', 'test', '--reporter=line', ...playwrightArgs] }
    exitCode = await run(playwright, {
      env: { ...process.env, E2E_BASE_URL: url, E2E_USERNAME: USERNAME, E2E_PASSWORD: PASSWORD },
    })
  }
}
finally {
  // Stop the server before returning: on Windows a running server locks .output and breaks the next build.
  server.kill()
  await new Promise(r => (server.exitCode !== null ? r() : server.once('exit', r)))
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}
process.exit(exitCode)
