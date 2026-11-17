import { expect, test, type Page } from '@playwright/test'
import { createDraft, createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, unique } from './helpers'

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
})

interface Plan {
  id: number
  bench: string
  plank: string
  /** The draft's date as the app shows it, e.g. "14 Jul 2031". */
  dateLabel: string
}

// Same format as the app's dates (en-GB writes September as "Sept").
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const usedDates = new Set<string>()

/** A date in the second half of 2031 not used by another plan in this run, so lists can be filtered by it. */
function uniqueDate() {
  for (;;) {
    const month = 7 + Math.floor(Math.random() * 6)
    const day = 1 + Math.floor(Math.random() * 28)
    const iso = `2031-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (usedDates.has(iso)) continue
    usedDates.add(iso)
    return { iso, label: dayMonthYear.format(new Date(`${iso}T00:00:00Z`)) }
  }
}

/** A draft with a weight x reps exercise (3 x 12 at 12.5 kg, with a video) and a timed one (3 x 45 s). */
async function planWorkout(page: Page): Promise<Plan> {
  const bench = unique('Wyciskanie')
  const plank = unique('Deska')
  const benchId = await createExercise(page, bench, 'weight_reps')
  const plankId = await createExercise(page, plank, 'timed')
  expect((await page.request.patch(`/api/exercises/${benchId}`, { data: { videoUrl: 'https://example.com/videos/dumbbell-press' } })).status()).toBe(200)
  const date = uniqueDate()
  const id = await createDraft(page, {
    date: date.iso,
    sessionType: 'trainer',
    exercises: [
      { exerciseId: benchId, sets: Array.from({ length: 3 }, () => ({ weightKg: 12.5, reps: 12 })) },
      { exerciseId: plankId, sets: Array.from({ length: 3 }, () => ({ durationS: 45 })) },
    ],
  })
  return { id, bench, plank, dateLabel: date.label }
}

const entry = (page: Page, name: string) => page.getByTestId('gym-entry').filter({ has: page.getByTestId('gym-entry-name').getByText(name, { exact: true }) })
const saved = (page: Page) => expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved')

test('ticks a set with changed values, saves it at once and keeps it after a reload', async ({ page }) => {
  const plan = await planWorkout(page)
  await page.goto(`/workouts/${plan.id}/edit`)
  await page.getByTestId('start-gym').click()
  await expect(page.getByTestId('gym-mode')).toBeVisible()

  const bench = entry(page, plan.bench)
  await expect(bench.getByTestId('gym-set')).toHaveCount(3)
  await expect(bench.getByTestId('video-link')).toHaveAttribute('href', 'https://example.com/videos/dumbbell-press')
  await expect(entry(page, plan.plank).getByTestId('video-link')).toHaveCount(0)
  await expect(bench.getByTestId('gym-entry-last')).toHaveText('No previous record')
  await expect(bench.getByTestId('gym-set-weightKg').first()).toHaveAttribute('inputmode', 'decimal')
  await expect(bench.getByTestId('gym-set-reps').first()).toHaveAttribute('inputmode', 'numeric')
  await expectNoHorizontalScroll(page)

  const first = bench.getByTestId('gym-set').first()
  await first.getByTestId('gym-set-reps').fill('10')
  await first.getByTestId('gym-set-done').click()
  await expect(first).toHaveAttribute('data-done', 'true')
  await saved(page)

  await page.reload()
  const reloaded = entry(page, plan.bench).getByTestId('gym-set').first()
  await expect(reloaded).toHaveAttribute('data-done', 'true')
  await expect(reloaded.getByTestId('gym-set-reps')).toHaveValue('10')
  await expect(reloaded.getByTestId('gym-set-weightKg')).toHaveValue('12.5')
  await expect(entry(page, plan.bench).getByTestId('gym-set').nth(1)).toHaveAttribute('data-done', 'false')
})

test('shows a change as not saved while offline and saves it once the connection is back', async ({ page }) => {
  const plan = await planWorkout(page)
  await page.goto(`/workouts/${plan.id}/gym`)
  await saved(page)

  await page.route('**/api/workouts/*', route => (route.request().method() === 'PUT' ? route.abort('internetdisconnected') : route.continue()))
  await entry(page, plan.plank).getByTestId('gym-set-done').first().click()
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'retrying')
  await expect(page.getByTestId('save-status')).toContainText('Not saved')

  await page.unroute('**/api/workouts/*')
  await saved(page)
  await page.reload()
  await expect(entry(page, plan.plank).getByTestId('gym-set').first()).toHaveAttribute('data-done', 'true')
})

test('refuses a change after the plan was finished elsewhere and says why', async ({ page }) => {
  const plan = await planWorkout(page)
  await page.goto(`/workouts/${plan.id}/gym`)
  await entry(page, plan.bench).getByTestId('gym-set-done').first().click()
  await saved(page)

  // Finished in another tab while this one stays open
  expect((await page.request.post(`/api/workouts/${plan.id}/finish`)).status()).toBe(200)
  await entry(page, plan.bench).getByTestId('gym-set-done').nth(1).click()
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'rejected')
  await expect(page.getByTestId('save-status')).toHaveText('Not saved: This workout has already been finished')

  const stored = await (await page.request.get(`/api/workouts/${plan.id}`)).json()
  expect(stored.exercises.map((e: { sets: unknown[] }) => e.sets.length)).toEqual([1])
  // Leaving now asks first because the change is not saved; accept to leave.
  page.once('dialog', dialog => dialog.accept())
  await page.getByTestId('nav-workouts').click()
  await expect(page.getByTestId('home')).toBeVisible()
})

test('swaps an exercise in place, keeping planned sets for the same kind', async ({ page }) => {
  const plan = await planWorkout(page)
  const tag = unique('Rozpietki')
  const recent = `${tag} maszyna`
  const older = `${tag} linki`
  const never = `${tag} nowe`
  const recentId = await createExercise(page, recent, 'weight_reps')
  const olderId = await createExercise(page, older, 'weight_reps')
  await createExercise(page, never, 'weight_reps')
  await createWorkout(page, { date: '2031-05-10', sessionType: 'solo', exercises: [{ exerciseId: olderId, sets: [{ weightKg: 10, reps: 10 }] }] })
  await createWorkout(page, { date: '2031-05-15', sessionType: 'solo', exercises: [{ exerciseId: recentId, sets: [{ weightKg: 8, reps: 15 }] }] })

  await page.goto(`/workouts/${plan.id}/gym`)
  await entry(page, plan.bench).getByTestId('gym-swap').click()
  await page.getByTestId('swap-search').fill(tag.toLowerCase())
  await expect(page.getByTestId('swap-option-name')).toHaveText([recent, older, never])
  await page.getByTestId('swap-option').filter({ hasText: recent }).click()

  // Same position, same planned sets
  await expect(page.getByTestId('gym-entry-name').first()).toHaveText(recent)
  const swapped = entry(page, recent)
  await expect(swapped.getByTestId('gym-set')).toHaveCount(3)
  await expect(swapped.getByTestId('gym-set-weightKg').first()).toHaveValue('12.5')
  await expect(swapped.getByTestId('gym-entry-last')).toContainText('8kg x 15')
  await saved(page)
  await page.reload()
  await expect(page.getByTestId('gym-entry-name').first()).toHaveText(recent)
})

test('swaps to another kind using last-time values, after confirming done sets', async ({ page }) => {
  const plan = await planWorkout(page)
  const rows = unique('Wioslowanie')
  const rowsId = await createExercise(page, rows, 'weight_reps')
  await createWorkout(page, { date: '2031-05-01', sessionType: 'solo', exercises: [{ exerciseId: rowsId, sets: [{ weightKg: 40, reps: 10 }, { weightKg: 40, reps: 8 }] }] })

  await page.goto(`/workouts/${plan.id}/gym`)
  await entry(page, plan.plank).getByTestId('gym-set-done').first().click()
  await entry(page, plan.plank).getByTestId('gym-swap').click()
  await page.getByTestId('swap-search').fill(rows)
  await page.getByTestId('swap-option').first().click()
  await expect(page.getByTestId('swap-confirm')).toBeVisible()
  await page.getByTestId('swap-confirm-ok').click()

  await expect(page.getByTestId('gym-entry-name').nth(1)).toHaveText(rows)
  const swapped = entry(page, rows)
  await expect(swapped.getByTestId('gym-set')).toHaveCount(2)
  await expect(swapped.getByTestId('gym-set-weightKg').first()).toHaveValue('40')
  await expect(swapped.getByTestId('gym-set-reps').nth(1)).toHaveValue('8')
  await expect(swapped.getByTestId('gym-set').first()).toHaveAttribute('data-done', 'false')
})

test('finishes a partly done plan into a workout with only the done sets', async ({ page }) => {
  const plan = await planWorkout(page)
  await page.goto(`/workouts/${plan.id}/gym`)
  await expect(page.getByTestId('gym-finish')).toBeDisabled()

  const bench = entry(page, plan.bench)
  await bench.getByTestId('gym-set').nth(0).getByTestId('gym-set-done').click()
  await bench.getByTestId('gym-set').nth(1).getByTestId('gym-set-reps').fill('10')
  await bench.getByTestId('gym-set').nth(1).getByTestId('gym-set-done').click()
  await expect(page.getByTestId('gym-finish')).toContainText('2 sets done')
  await page.getByTestId('gym-finish').click()

  await expect(page.getByTestId('workout-view')).toBeVisible()
  await expect(page.getByTestId('workout-view-entry')).toHaveCount(1)
  await expect(page.getByTestId('workout-view-set')).toHaveText([/12\.5kg x 12/, /12\.5kg x 10/])

  // The finished workout counts as history in the exercise's progress
  await page.getByTestId('workout-view-exercise').click()
  await expect(page.getByTestId('progress-title')).toHaveText(plan.bench)
  await expect(page.getByTestId('progress-latest')).toHaveText('12.5kg x 12')
  await expect(page.getByTestId('progress-history-item')).toHaveCount(1)

  await page.getByTestId('nav-workouts').click()
  // Matched by link rather than date: reruns against the same database leave other plans behind.
  const history = page.getByTestId('workout-item').filter({ has: page.locator(`a[href="/workouts/${plan.id}"]`) })
  await expect(history).toContainText(plan.dateLabel)
  await expect(page.getByTestId('planned-item').filter({ has: page.locator(`a[href="/workouts/${plan.id}/edit"]`) })).toHaveCount(0)
})

test('refuses to finish while a done set misses a value', async ({ page }) => {
  const plan = await planWorkout(page)
  await page.goto(`/workouts/${plan.id}/gym`)
  const first = entry(page, plan.bench).getByTestId('gym-set').first()
  await first.getByTestId('gym-set-weightKg').fill('')
  await first.getByTestId('gym-set-done').click()
  await saved(page)
  await page.getByTestId('gym-finish').click()
  await expect(page.getByTestId('gym-finish-error')).toContainText('missing values')
  await expect(first).toContainText('Weight is required')
  await expect(page.getByTestId('gym-mode')).toBeVisible()
})
