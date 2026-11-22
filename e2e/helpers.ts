import { expect, type Page } from '@playwright/test'

export const USERNAME = process.env.E2E_USERNAME ?? 'e2e-user'
export const PASSWORD = process.env.E2E_PASSWORD ?? 'e2e-password-123'

export async function login(page: Page, username = USERNAME, password = PASSWORD) {
  await page.goto('/login')
  await page.getByTestId('login-username').fill(username)
  await page.getByTestId('login-password').fill(password)
  await page.getByTestId('login-submit').click()
}

export async function loginAndWaitForHome(page: Page) {
  await login(page)
  await expect(page.getByTestId('home')).toBeVisible()
}

/** A name unique to this run, so tests sharing one database don't collide. */
export function unique(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}

/** Creates an exercise through the API using the page's logged-in session. */
export async function createExercise(page: Page, name: string, kind: string): Promise<number> {
  const res = await page.request.post('/api/exercises', { data: { name, kind } })
  expect(res.status()).toBe(201)
  return (await res.json()).id
}

export async function createWorkout(page: Page, body: unknown): Promise<number> {
  const res = await page.request.post('/api/workouts', { data: body })
  expect(res.status()).toBe(201)
  return (await res.json()).id
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

/** Adds an exercise in the workout form and returns its entry card. */
export async function pickExercise(page: Page, name: string) {
  await page.getByTestId('exercise-picker').selectOption({ label: name })
  const entry = page.getByTestId('workout-entry').filter({ has: page.getByTestId('entry-name').getByText(name, { exact: true }) })
  await expect(entry).toBeVisible()
  return entry
}

/** Creates a planned workout through the API. */
export async function createDraft(page: Page, body: Record<string, unknown>): Promise<number> {
  return createWorkout(page, { ...body, status: 'draft' })
}

/** Selects a tab on the home screen; the tab label also shows a count, e.g. "History 3". */
export async function openHomeTab(page: Page, name: 'Planned' | 'History') {
  const tab = page.getByRole('tab', { name: new RegExp(`^${name}`) })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

/** Records the paths of the page's fetch/XHR requests that match, to check that none were made. */
export function recordRequests(page: Page, matches: (path: string) => boolean): string[] {
  const seen: string[] = []
  page.on('request', (request) => {
    if (!['fetch', 'xhr'].includes(request.resourceType())) return
    const path = new URL(request.url()).pathname
    if (matches(path)) seen.push(path)
  })
  return seen
}
