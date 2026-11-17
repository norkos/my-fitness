import { expect, test } from '@playwright/test'
import { createDraft, createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, unique } from './helpers'

// Spec files run alphabetically against one fresh database. This file must run before any
// file that logs workouts (progress.spec.ts, workouts.spec.ts) for the empty state check.
test('shows an empty state, then lists workouts newest first', async ({ page }) => {
  await loginAndWaitForHome(page)
  await expect(page.getByTestId('workouts-empty')).toBeVisible()
  await expect(page.getByTestId('planned')).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  const plank = await createExercise(page, unique('Plank'), 'timed')
  const rowing = await createExercise(page, unique('Rowing'), 'cardio')
  await createWorkout(page, { date: '2026-03-01', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: 30 }] }] })
  await createWorkout(page, {
    date: '2026-03-08',
    sessionType: 'trainer',
    exercises: [
      { exerciseId: plank, sets: [{ durationS: 45 }] },
      { exerciseId: rowing, sets: [{ durationS: 600, distanceM: 2000 }] },
    ],
  })
  await createWorkout(page, { date: '2026-03-04', sessionType: 'solo', exercises: [{ exerciseId: rowing, sets: [{ durationS: 300 }] }] })

  await page.reload()
  const items = page.getByTestId('workout-item')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('8 Mar 2026')
  await expect(items.nth(0)).toContainText('Trainer')
  await expect(items.nth(0)).toContainText('2 exercises')
  await expect(items.nth(1)).toContainText('4 Mar 2026')
  await expect(items.nth(1)).toContainText('Solo')
  await expect(items.nth(2)).toContainText('1 Mar 2026')
  await expect(items.nth(2)).toContainText('1 exercise')
  await expectNoHorizontalScroll(page)
})

test('shows drafts under Planned, soonest first, and keeps them out of the history', async ({ page }) => {
  await loginAndWaitForHome(page)
  const historyCount = await page.getByTestId('workout-item').count()

  const plank = await createExercise(page, unique('Plank'), 'timed')
  const later = await createDraft(page, { date: '2026-12-05', sessionType: 'trainer', exercises: [{ exerciseId: plank, sets: [{ durationS: 45 }] }] })
  const sooner = await createDraft(page, { date: '2026-12-01', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: 30 }] }] })

  await page.reload()
  const planned = page.getByTestId('planned-item')
  await expect(planned).toHaveCount(2)
  await expect(planned.nth(0)).toContainText('1 Dec 2026')
  await expect(planned.nth(0)).toContainText('Solo')
  await expect(planned.nth(1)).toContainText('5 Dec 2026')
  await expect(planned.nth(1)).toContainText('Trainer')
  await expect(page.getByTestId('workout-item')).toHaveCount(historyCount)
  await expectNoHorizontalScroll(page)

  for (const id of [later, sooner]) expect((await page.request.delete(`/api/workouts/${id}`)).status()).toBe(204)
})
