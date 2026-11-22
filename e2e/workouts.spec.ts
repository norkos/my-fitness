import { expect, test } from '@playwright/test'
import { createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, pickExercise, recordRequests, unique } from './helpers'

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
})

test('logs a trainer workout, then pre-fills last-time values next time', async ({ page }) => {
  const bench = unique('Bench')
  const plank = unique('Plank')
  await createExercise(page, bench, 'weight_reps')
  await createExercise(page, plank, 'timed')

  // First workout, on an earlier date
  await page.getByTestId('new-workout').click()
  await expect(page.getByTestId('workout-form')).toBeVisible()
  await page.getByTestId('workout-date').fill('2026-01-10')
  await page.getByTestId('session-trainer').click()

  const benchEntry = await pickExercise(page, bench)
  await expect(benchEntry.getByTestId('entry-last')).toHaveText('No previous record')
  await expect(benchEntry.getByTestId('set-weightKg')).toHaveAttribute('inputmode', 'decimal')
  await expect(benchEntry.getByTestId('set-reps')).toHaveAttribute('inputmode', 'numeric')
  await benchEntry.getByTestId('set-weightKg').fill('50')
  await benchEntry.getByTestId('set-reps').fill('8')
  await benchEntry.getByTestId('set-add').click()
  await benchEntry.getByTestId('set-row').nth(1).getByTestId('set-reps').fill('6')

  const plankEntry = await pickExercise(page, plank)
  await plankEntry.getByTestId('set-durationS').fill('45')
  await expectNoHorizontalScroll(page)

  await page.getByTestId('workout-save').click()
  await expect(page.getByTestId('workout-view')).toBeVisible()
  await expect(page.getByTestId('workout-view-date')).toHaveText('Sat, 10 Jan 2026')
  await expect(page.getByTestId('session-badge')).toHaveText('Trainer')
  await expect(page.getByTestId('workout-view-entry').first()).toContainText('50kg x 8')
  await expect(page.getByTestId('workout-view-entry').first()).toContainText('50kg x 6')
  await expect(page.getByTestId('workout-view-entry').nth(1)).toContainText('45s')
  await expectNoHorizontalScroll(page)

  // Second workout (today): last time is shown and pre-filled
  await page.goto('/workouts/new')
  const again = await pickExercise(page, bench)
  await expect(again.getByTestId('entry-last')).toContainText('50kg x 8, 50kg x 6')
  await expect(again.getByTestId('set-row')).toHaveCount(2)
  await expect(again.getByTestId('set-row').nth(0).getByTestId('set-weightKg')).toHaveValue('50')
  await expect(again.getByTestId('set-row').nth(0).getByTestId('set-reps')).toHaveValue('8')
  await expect(again.getByTestId('set-row').nth(1).getByTestId('set-reps')).toHaveValue('6')
})

test('keeps entered data and highlights a missing value', async ({ page }) => {
  const bench = unique('Bench')
  await createExercise(page, bench, 'weight_reps')

  await page.goto('/workouts/new')
  await page.getByTestId('workout-save').click()
  await expect(page.getByTestId('workout-errors')).toContainText('Add at least one exercise')

  const entry = await pickExercise(page, bench)
  await entry.getByTestId('set-reps').fill('8')
  await page.getByTestId('workout-save').click()
  await expect(entry).toContainText('Weight is required')
  await expect(entry.getByTestId('set-reps')).toHaveValue('8')
  await expect(page).toHaveURL(/\/workouts\/new$/)
})

test('edits a set value, and deletes only after confirmation', async ({ page }) => {
  const squat = unique('Squat')
  const id = await createExercise(page, squat, 'weight_reps')
  const workoutId = await createWorkout(page, {
    date: '2026-02-01',
    sessionType: 'solo',
    exercises: [{ exerciseId: id, sets: [{ weightKg: 500, reps: 5 }] }],
  })

  await page.goto(`/workouts/${workoutId}`)
  await expect(page.getByTestId('workout-view-set')).toHaveText(/500kg x 5/)

  // Edit
  await page.getByTestId('workout-edit').click()
  const entry = page.getByTestId('workout-entry')
  await expect(entry.getByTestId('set-weightKg')).toHaveValue('500')
  await entry.getByTestId('set-weightKg').fill('50')
  await expectNoHorizontalScroll(page)
  await page.getByTestId('workout-save').click()
  await expect(page.getByTestId('workout-view-set')).toHaveText(/50kg x 5/)

  // Cancelled delete keeps it
  await page.getByTestId('workout-delete').click()
  await page.getByTestId('delete-cancel').click()
  await expect(page.getByTestId('workout-view')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('workout-view-set')).toHaveText(/50kg x 5/)

  // Confirmed delete removes it
  await page.getByTestId('workout-delete').click()
  await page.getByTestId('delete-confirm').click()
  await expect(page.getByTestId('home')).toBeVisible()
  const res = await page.request.get(`/api/workouts/${workoutId}`)
  expect(res.status()).toBe(404)
})

test('numbers exercise cards and opens progress over the editor without losing typed values', async ({ page }) => {
  const plank = unique('Plank')
  const squat = unique('Squat')
  await createExercise(page, plank, 'timed')
  const squatId = await createExercise(page, squat, 'weight_reps')
  expect((await page.request.patch(`/api/exercises/${squatId}`, { data: { videoUrl: 'https://example.com/videos/squat' } })).status()).toBe(200)
  const previous = await createWorkout(page, { date: '2026-01-05', sessionType: 'solo', exercises: [{ exerciseId: squatId, sets: [{ weightKg: 60, reps: 5 }] }] })

  await page.goto('/workouts/new')
  const plankEntry = await pickExercise(page, plank)
  await plankEntry.getByTestId('set-durationS').fill('45')
  const squatEntry = await pickExercise(page, squat)
  await expect(squatEntry.getByTestId('entry-number')).toHaveText('02')
  await expect(squatEntry.getByTestId('entry-name')).toHaveText(squat)
  await expect(squatEntry.getByTestId('kind-badge-weight_reps')).toBeVisible()
  await expect(squatEntry.getByTestId('entry-last')).toContainText('60kg x 5')
  await expect(squatEntry.getByTestId('video-link')).toHaveAttribute('href', 'https://example.com/videos/squat')
  await squatEntry.getByTestId('set-weightKg').first().fill('62.5')
  await expectNoHorizontalScroll(page)

  // Progress opens in a sheet over the editor; its history does not link away
  await squatEntry.getByTestId('entry-progress').click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toContainText(squat)
  await expect(sheet.getByTestId('progress-latest')).toHaveText('60kg x 5')
  await expect(sheet.getByTestId('progress-history-item')).toHaveCount(1)
  await expect(sheet.getByTestId('progress-history-item').locator('a')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(squatEntry.getByTestId('entry-progress')).toBeFocused()
  await expect(page).toHaveURL(/\/workouts\/new$/)
  await expect(plankEntry.getByTestId('set-durationS')).toHaveValue('45')
  await expect(squatEntry.getByTestId('set-weightKg').first()).toHaveValue('62.5')

  // A fractional rep count is highlighted and every typed value stays
  const reps = squatEntry.getByTestId('set-reps').first()
  await reps.fill('8.5')
  await page.getByTestId('workout-save').click()
  await expect(reps).toHaveAttribute('aria-invalid', 'true')
  await expect(squatEntry).toContainText('Reps must be a whole number')
  await expect(reps).toHaveValue('8.5')
  await expect(squatEntry.getByTestId('set-weightKg').first()).toHaveValue('62.5')
  await expect(plankEntry.getByTestId('set-durationS')).toHaveValue('45')
  await expect(page).toHaveURL(/\/workouts\/new$/)

  expect((await page.request.delete(`/api/workouts/${previous}`)).status()).toBe(204)
})

test('shows "Workout not found" for a malformed or unknown address', async ({ page }) => {
  const requests = recordRequests(page, path => path.startsWith('/api/workouts/'))
  // `..%2Fexercises` is a path-like id that must not reach another endpoint.
  for (const id of ['abc', '..%2Fexercises']) {
    for (const address of [`/workouts/${id}`, `/workouts/${id}/edit`, `/workouts/${id}/gym`]) {
      await page.goto(address)
      await expect(page.getByText('Workout not found')).toBeVisible()
    }
  }
  expect(requests).toEqual([])

  await page.goto('/workouts/999999999')
  await expect(page.getByText('Workout not found')).toBeVisible()
})
