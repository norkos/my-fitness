// Generates the README screenshots from the production build with a throwaway database and made-up data.
//   npm run build && node scripts/make-screenshots.mjs
// Never touches .env or ./data, and ignores NUXT_* / NITRO_* variables inherited from the shell:
// only the settings below configure the server. Output: docs/screenshots/*.png (phone-sized, 2x).
// Stops with a non-zero exit, before creating any data, when the server does not become healthy.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { freePort, serverEnv, waitForHealth } from './lib/local-server.mjs'

const USERNAME = 'demo'
const PASSWORD = 'demo-password-123'
const OUT = 'docs/screenshots'

const port = await freePort()
const url = `http://127.0.0.1:${port}`
const dir = mkdtempSync(join(tmpdir(), 'my-fitness-shots-'))
let serverLog = ''
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: serverEnv({
    NODE_ENV: 'production', PORT: String(port), HOST: '127.0.0.1',
    NUXT_APP_USERNAME: USERNAME, NUXT_APP_PASSWORD: PASSWORD,
    NUXT_APP_SECRET: 'demo-secret-that-is-at-least-32-characters-long',
    NUXT_DATABASE_PATH: join(dir, 'fitness.db'), NUXT_SESSION_COOKIE_SECURE: 'false',
  }),
})
server.stdout.on('data', (d) => { serverLog += d })
server.stderr.on('data', (d) => { serverLog += d })

async function stopServer() {
  server.kill()
  await new Promise(r => (server.exitCode !== null || server.signalCode !== null ? r() : server.once('exit', r)))
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}

// Another process may answer on the port if ours failed to start; never log in or create data then.
if (!(await waitForHealth(url, server))) {
  console.error(`Server did not become healthy:\n${serverLog.slice(-4000)}`)
  await stopServer()
  process.exit(1)
}

const iso = (offsetDays) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let browser
try {
  mkdirSync(OUT, { recursive: true })
  browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: url, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByTestId('login-username').fill(USERNAME)
  await page.getByTestId('login-password').fill(PASSWORD)
  await page.getByTestId('login-submit').click()
  await page.getByTestId('home').waitFor()

  const api = async (path, data) => {
    const res = await page.request.post(path, { data })
    if (res.status() !== 201) throw new Error(`${path} -> ${res.status()}`)
    return (await res.json()).id
  }
  const ex = {}
  for (const [name, kind, videoUrl] of [
    ['Bench press', 'weight_reps', 'https://example.com/videos/bench-press'],
    ['Back squat', 'weight_reps', 'https://example.com/videos/back-squat'],
    ['Romanian deadlift', 'weight_reps'],
    ['Pull-ups', 'bodyweight'],
    ['Plank', 'timed', 'https://example.com/videos/plank'],
    ['Rowing machine', 'cardio'],
    ['Overhead press', 'weight_reps'],
  ]) ex[name] = await api('/api/exercises', { name, kind, ...(videoUrl ? { videoUrl } : {}) })

  // Eight weeks of bench press progress, plus a few other sessions.
  const benchWeights = [60, 62.5, 62.5, 65, 67.5, 67.5, 70, 72.5]
  for (let w = 0; w < benchWeights.length; w++) {
    await api('/api/workouts', {
      date: iso(-7 * (benchWeights.length - w)), sessionType: w % 3 === 0 ? 'trainer' : 'solo',
      exercises: [
        { exerciseId: ex['Bench press'], sets: [{ weightKg: benchWeights[w], reps: 8 }, { weightKg: benchWeights[w], reps: 8 }, { weightKg: benchWeights[w], reps: 6 }] },
        { exerciseId: ex['Back squat'], sets: [{ weightKg: 80 + w * 2.5, reps: 6 }, { weightKg: 80 + w * 2.5, reps: 6 }] },
        { exerciseId: ex['Plank'], sets: [{ durationS: 45 + w * 5 }] },
      ],
    })
  }
  const plannedId = await api('/api/workouts', {
    status: 'draft', date: iso(1), sessionType: 'trainer',
    exercises: [
      { exerciseId: ex['Bench press'], sets: [{ weightKg: 72.5, reps: 8 }, { weightKg: 72.5, reps: 8 }, { weightKg: 72.5, reps: 6 }] },
      { exerciseId: ex['Back squat'], sets: [{ weightKg: 97.5, reps: 6 }, { weightKg: 97.5, reps: 6 }] },
      { exerciseId: ex['Pull-ups'], sets: [{ reps: 8 }, { reps: 7 }, { reps: 6 }] },
      { exerciseId: ex['Plank'], sets: [{ durationS: 90 }] },
    ],
  })
  await api('/api/workouts', {
    status: 'draft', date: iso(3), sessionType: 'solo',
    exercises: [
      { exerciseId: ex['Overhead press'], sets: [{ weightKg: 40, reps: 8 }, { weightKg: 40, reps: 8 }] },
      { exerciseId: ex['Romanian deadlift'], sets: [{ weightKg: 90, reps: 8 }, { weightKg: 90, reps: 8 }] },
    ],
  })

  const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${OUT}/${name}.png` }) }

  await page.goto('/')
  await page.getByTestId('planned').waitFor()
  await shot('home-planned')

  await page.getByRole('tab', { name: /^History/ }).click()
  await page.getByTestId('workout-list').waitFor()
  await shot('home-history')

  await page.goto(`/workouts/${plannedId}/gym`)
  await page.getByTestId('gym-mode').waitFor()
  const bench = page.getByTestId('gym-entry').first()
  await bench.getByTestId('gym-set-done').nth(0).click()
  await bench.getByTestId('gym-set-done').nth(1).click()
  await page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.getAttribute('data-status') === 'saved')
  await shot('gym-mode')

  await page.goto(`/exercises/${ex['Bench press']}`)
  await page.getByTestId('progress-chart').waitFor()
  await shot('progress')

  await page.goto('/exercises')
  await page.getByTestId('exercise-list').waitFor()
  await shot('exercises')

  console.log(`Screenshots written to ${OUT}`)
}
finally {
  await browser?.close()
  await stopServer()
}
