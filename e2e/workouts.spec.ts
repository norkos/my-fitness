import { expect, test, type Page } from '@playwright/test'
import { createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, unique } from './helpers'

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
})

async function pickExercise(page: Page, name: string) {
  await page.getByTestId('exercise-picker').selectOption({ label: name })
  const entry = page.getByTestId('workout-entry').filter({ has: page.getByTestId('entry-name').getByText(name, { exact: true }) })
  await expect(entry).toBeVisible()
  return entry
}

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
