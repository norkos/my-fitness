import { expect, test, type Page } from '@playwright/test'
import type { WorkoutDetail, WorkoutSummary } from '../shared/workouts'
import { createDraft, createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, pickExercise, unique } from './helpers'

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
})

test('plans a workout by hand, edits it the evening before and deletes it', async ({ page }) => {
  // A day unique to this run, so reruns against the same database don't collide.
  const day = 10 + Math.floor(Math.random() * 18)
  const first = { iso: `2031-03-${day}`, label: `${day} Mar 2031` }
  const second = { iso: `2031-03-${day + 1}`, label: `${day + 1} Mar 2031` }
  const bench = unique('Bench')
  const plank = unique('Plank')
  await createExercise(page, bench, 'weight_reps')
  await createExercise(page, plank, 'timed')

  await page.getByTestId('new-draft').click()
  await expect(page.getByTestId('workout-form')).toBeVisible()
  await page.getByTestId('workout-date').fill(first.iso)
  // A planned set may leave the weight empty
  const benchEntry = await pickExercise(page, bench)
  await benchEntry.getByTestId('set-reps').fill('12')
  await benchEntry.getByTestId('set-add').click()
  const plankEntry = await pickExercise(page, plank)
  await plankEntry.getByTestId('set-durationS').fill('45')
  await expectNoHorizontalScroll(page)
  await page.getByTestId('workout-save').click()

  await expect(page.getByTestId('home')).toBeVisible()
  const item = page.getByTestId('planned-item').filter({ hasText: first.label })
  await expect(item).toContainText('2 exercises')
  await expect(page.getByTestId('workout-item').filter({ hasText: first.label })).toHaveCount(0)

  // Change it: drop the plank, move the date
  await item.click()
  await expect(page.getByTestId('planned-badge')).toBeVisible()
  await expect(page.getByTestId('start-gym')).toBeVisible()
  await expect(page.getByTestId('set-row')).toHaveCount(3)
  await expect(page.getByTestId('set-weightKg').first()).toHaveValue('')
  await page.getByTestId('workout-entry').filter({ hasText: plank }).getByTestId('entry-remove').click()
  await page.getByTestId('workout-date').fill(second.iso)
  await page.getByTestId('workout-save').click()

  const moved = page.getByTestId('planned-item').filter({ hasText: second.label })
  await expect(moved).toContainText('1 exercise')
  await expect(page.getByTestId('planned-item').filter({ hasText: first.label })).toHaveCount(0)

  // Opening a draft's address directly shows its editor, not an empty workout view
  await moved.click()
  await expect(page).toHaveURL(/\/workouts\/\d+\/edit$/)
  const editUrl = page.url()
  await page.goto(editUrl.replace(/\/edit$/, ''))
  await expect(page).toHaveURL(editUrl)

  // Delete: cancel once, then confirm
  await page.getByTestId('workout-delete').click()
  await page.getByTestId('delete-cancel').click()
  await expect(page.getByTestId('planned-badge')).toBeVisible()
  await page.getByTestId('workout-delete').click()
  await page.getByTestId('delete-confirm').click()
  await expect(page.getByTestId('home')).toBeVisible()
  await expect(page.getByTestId('planned-item').filter({ hasText: second.label })).toHaveCount(0)
})

test('defaults a new plan to tomorrow', async ({ page }) => {
  await page.getByTestId('new-draft').click()
  const tomorrow = await page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  await expect(page.getByTestId('workout-date')).toHaveValue(tomorrow)
})

/** Ids of the drafts that contain the given exercise, read through the API. */
async function draftsWith(page: Page, exerciseId: number): Promise<number[]> {
  const list: WorkoutSummary[] = await (await page.request.get('/api/workouts')).json()
  const found: number[] = []
  for (const w of list.filter(w => w.status === 'draft')) {
    const detail: WorkoutDetail = await (await page.request.get(`/api/workouts/${w.id}`)).json()
    if (detail.exercises.some(e => e.exerciseId === exerciseId)) found.push(w.id)
  }
  return found
}

test('repeats a done workout as a draft with its achieved values', async ({ page }) => {
  const day = 10 + Math.floor(Math.random() * 18)
  const past = `2025-02-${day}`
  const planned = { iso: `2031-04-${day}`, label: `${day} Apr 2031` }
  const bench = unique('Bench')
  const plank = unique('Plank')
  const benchId = await createExercise(page, bench, 'weight_reps')
  const plankId = await createExercise(page, plank, 'timed')
  const sourceId = await createWorkout(page, {
    date: past,
    sessionType: 'trainer',
    exercises: [
      { exerciseId: benchId, sets: [{ weightKg: 50, reps: 8 }, { weightKg: 50, reps: 6 }] },
      { exerciseId: plankId, sets: [{ durationS: 45 }] },
    ],
  })

  await page.goto(`/workouts/${sourceId}`)
  await page.getByTestId('workout-repeat').click()
  await expect(page).toHaveURL(url => url.pathname === '/workouts/plan' && url.searchParams.get('from') === String(sourceId))
  await expect(page.getByTestId('workout-form')).toBeVisible()
  await expect(page.getByTestId('repeat-missing')).toHaveCount(0)

  // Pre-filled from the done workout: today, trainer, same exercises in order with the achieved values
  const today = await page.evaluate(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  await expect(page.getByTestId('workout-date')).toHaveValue(today)
  await expect(page.getByTestId('session-trainer')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('entry-name')).toHaveText([bench, plank])
  const benchEntry = page.getByTestId('workout-entry').filter({ hasText: bench })
  const [weights, reps] = [benchEntry.getByTestId('set-weightKg'), benchEntry.getByTestId('set-reps')]
  await expect(weights).toHaveCount(2)
  await expect(weights.nth(0)).toHaveValue('50')
  await expect(weights.nth(1)).toHaveValue('50')
  await expect(reps.nth(0)).toHaveValue('8')
  await expect(reps.nth(1)).toHaveValue('6')
  await expect(page.getByTestId('workout-entry').filter({ hasText: plank }).getByTestId('set-durationS')).toHaveValue('45')
  await expectNoHorizontalScroll(page)

  // Adjust before saving
  await page.getByTestId('workout-date').fill(planned.iso)
  await benchEntry.getByTestId('set-weightKg').first().fill('52.5')
  await page.getByTestId('workout-entry').filter({ hasText: plank }).getByTestId('entry-remove').click()
  await expect(page.getByTestId('workout-save')).toHaveText('Save plan')
  await page.getByTestId('workout-save').click()

  await expect(page.getByTestId('home')).toBeVisible()
  const drafts = await draftsWith(page, benchId)
  expect(drafts).toHaveLength(1)
  const draftId = drafts[0]!
  const item = page.getByTestId('planned-item').filter({ has: page.locator(`a[href="/workouts/${draftId}/edit"]`) })
  await expect(item).toContainText(planned.label)
  await expect(item).toContainText('1 exercise')
  await expect(item).toContainText('Trainer')

  const draft: WorkoutDetail = await (await page.request.get(`/api/workouts/${draftId}`)).json()
  expect(draft.status).toBe('draft')
  expect(draft.exercises.map(e => e.exerciseId)).toEqual([benchId])
  expect(draft.exercises[0]!.sets.map(s => [s.weightKg, s.reps, s.completed])).toEqual([[52.5, 8, false], [50, 6, false]])

  // The original stays as it was
  await page.goto(`/workouts/${sourceId}`)
  await expect(page.getByTestId('workout-view-set')).toHaveText([/50kg x 8/, /50kg x 6/, /45/])
  await page.request.delete(`/api/workouts/${draftId}`)
})

test('repeating stores nothing until saved, and a missing source falls back to an empty plan', async ({ page }) => {
  const bench = unique('Bench')
  const benchId = await createExercise(page, bench, 'weight_reps')
  const sourceId = await createWorkout(page, {
    date: '2025-01-15',
    sessionType: 'solo',
    exercises: [{ exerciseId: benchId, sets: [{ weightKg: 40, reps: 10 }] }],
  })

  await page.goto(`/workouts/${sourceId}`)
  await page.getByTestId('workout-repeat').click()
  await expect(page.getByTestId('entry-name')).toHaveText([bench])
  await page.getByRole('link', { name: 'Workouts' }).click()
  await expect(page.getByTestId('home')).toBeVisible()
  expect(await draftsWith(page, benchId)).toEqual([])

  // Drafts offer no repeat action
  const draftId = await createDraft(page, { date: '2031-05-01', sessionType: 'solo', exercises: [{ exerciseId: benchId, sets: [{ reps: 10 }] }] })
  await page.goto(`/workouts/${draftId}`)
  await expect(page.getByTestId('planned-badge')).toBeVisible()
  await expect(page.getByTestId('workout-repeat')).toHaveCount(0)
  // ...and asking to repeat one directly is treated like a missing source
  await page.goto(`/workouts/plan?from=${draftId}`)
  await expect(page.getByTestId('repeat-missing')).toBeVisible()
  await expect(page.getByTestId('workout-entry')).toHaveCount(0)
  await page.request.delete(`/api/workouts/${draftId}`)

  await page.goto('/workouts/plan?from=999999999')
  await expect(page.getByTestId('repeat-missing')).toBeVisible()
  await expect(page.getByTestId('workout-form')).toBeVisible()
  await expect(page.getByTestId('workout-entry')).toHaveCount(0)
})
