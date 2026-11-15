import { expect, test } from '@playwright/test'
import { createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, unique } from './helpers'

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
})

test('shows an empty state for an exercise without history', async ({ page }) => {
  const id = await createExercise(page, unique('Unused'), 'timed')
  await page.goto(`/exercises/${id}`)
  await expect(page.getByTestId('progress-empty')).toBeVisible()
  await expect(page.getByTestId('progress-chart')).toHaveCount(0)
})

test('shows a single value without a chart', async ({ page }) => {
  const id = await createExercise(page, unique('Once'), 'bodyweight')
  await createWorkout(page, { date: '2026-04-01', sessionType: 'solo', exercises: [{ exerciseId: id, sets: [{ reps: 6 }, { reps: 8 }] }] })
  await page.goto(`/exercises/${id}`)
  await expect(page.getByTestId('progress-latest')).toHaveText('8 reps')
  await expect(page.getByTestId('progress-single')).toBeVisible()
  await expect(page.getByTestId('progress-history-item')).toHaveCount(1)
})

test('charts several workouts and lists history newest first', async ({ page }) => {
  const name = unique('Bench')
  const id = await createExercise(page, name, 'weight_reps')
  for (const [date, weight, sessionType] of [['2026-05-01', 45, 'solo'], ['2026-05-12', 55, 'trainer'], ['2026-05-05', 50, 'solo']] as const) {
    await createWorkout(page, { date, sessionType, exercises: [{ exerciseId: id, sets: [{ weightKg: weight, reps: 8 }, { weightKg: weight, reps: 6 }] }] })
  }

  // Reached from the exercises list
  await page.getByTestId('nav-exercises').click()
  await page.getByTestId('exercise-item').filter({ hasText: name }).getByTestId('exercise-link').click()

  await expect(page.getByTestId('progress-title')).toHaveText(name)
  await expect(page.getByTestId('progress-latest')).toHaveText('55kg x 8')
  const chart = page.getByTestId('progress-chart')
  await expect(chart).toHaveAttribute('data-points', '3')
  await expect(chart.locator('canvas')).toBeVisible()

  const history = page.getByTestId('progress-history-item')
  await expect(history).toHaveCount(3)
  await expect(history.nth(0)).toContainText('12 May 2026')
  await expect(history.nth(0)).toContainText('Trainer')
  await expect(history.nth(0)).toContainText('55kg x 8, 55kg x 6')
  await expect(history.nth(2)).toContainText('1 May 2026')
  await expectNoHorizontalScroll(page)
})

test('opens progress from an exercise in a workout view', async ({ page }) => {
  const name = unique('Plank')
  const id = await createExercise(page, name, 'timed')
  const workoutId = await createWorkout(page, { date: '2026-06-01', sessionType: 'solo', exercises: [{ exerciseId: id, sets: [{ durationS: 60 }] }] })
  await page.goto(`/workouts/${workoutId}`)
  await page.getByTestId('workout-view-exercise').click()
  await expect(page.getByTestId('progress-title')).toHaveText(name)
  await expect(page.getByTestId('progress-latest')).toHaveText('1:00')
})
