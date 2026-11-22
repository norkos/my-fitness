import { expect, test, type Page } from '@playwright/test'
import { createDraft, createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, openHomeTab, unique } from './helpers'

const tab = (page: Page, name: 'Planned' | 'History') => page.getByRole('tab', { name: new RegExp(`^${name}`) })

async function counts(page: Page) {
  const list: Array<{ status: string }> = await (await page.request.get('/api/workouts')).json()
  return { planned: list.filter(w => w.status === 'draft').length, history: list.filter(w => w.status === 'done').length }
}

// Spec files run alphabetically against one fresh database. This file must run before any
// file that logs workouts (progress.spec.ts, workouts.spec.ts) for the empty state check.
test('opens on History without drafts, with an empty state, then lists workouts newest first', async ({ page }) => {
  await loginAndWaitForHome(page)
  await expect(tab(page, 'History')).toHaveAttribute('aria-selected', 'true')
  await expect(tab(page, 'Planned')).toHaveText(/Planned\s*0/)
  await expect(page.getByTestId('workouts-empty')).toBeVisible()
  await expect(page.getByTestId('workouts-empty')).toContainText('Completed workouts will appear here')
  await expect(page.getByTestId('planned')).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  await openHomeTab(page, 'Planned')
  await expect(page.getByTestId('planned-empty')).toBeVisible()

  const plank = await createExercise(page, unique('Plank'), 'timed')
  const rowing = await createExercise(page, unique('Rowing'), 'cardio')
  await createWorkout(page, { date: '2026-03-01', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: 30 }] }] })
  await createWorkout(page, {
    date: '2026-03-08',
    sessionType: 'trainer',
    exercises: [
      { exerciseId: plank, sets: [{ durationS: 45 }, { durationS: 40 }] },
      { exerciseId: rowing, sets: [{ durationS: 600, distanceM: 2000 }] },
    ],
  })
  await createWorkout(page, { date: '2026-03-04', sessionType: 'solo', exercises: [{ exerciseId: rowing, sets: [{ durationS: 300 }] }] })

  await page.goto('/')
  await expect(tab(page, 'History')).toHaveAttribute('aria-selected', 'true')
  await expect(tab(page, 'History')).toHaveText(/History\s*3/)
  const items = page.getByTestId('workout-item')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('8 Mar 2026')
  await expect(items.nth(0)).toContainText('Trainer')
  await expect(items.nth(0).getByTestId('workout-item-count')).toHaveText('2 exercises · 3 sets')
  await expect(items.nth(1)).toContainText('4 Mar 2026')
  await expect(items.nth(1)).toContainText('Solo')
  await expect(items.nth(2)).toContainText('1 Mar 2026')
  await expect(items.nth(2).getByTestId('workout-item-count')).toHaveText('1 exercise · 1 set')
  await expectNoHorizontalScroll(page)
})

test('opens on Planned with drafts, soonest first, previewing exercises', async ({ page }) => {
  await loginAndWaitForHome(page)
  const names = ['Bench Press', 'Squat', 'Plank', 'Rowing'].map(unique)
  const [bench, squat, plank, rowing] = await Promise.all([
    createExercise(page, names[0]!, 'weight_reps'),
    createExercise(page, names[1]!, 'weight_reps'),
    createExercise(page, names[2]!, 'timed'),
    createExercise(page, names[3]!, 'cardio'),
  ])
  const later = await createDraft(page, {
    date: '2031-12-05',
    sessionType: 'trainer',
    exercises: [
      { exerciseId: bench!, sets: [{ weightKg: 50, reps: 8 }, { weightKg: 50, reps: 8 }] },
      { exerciseId: squat!, sets: [{ weightKg: 60, reps: 5 }] },
      { exerciseId: plank!, sets: [{ durationS: 45 }] },
      { exerciseId: rowing!, sets: [{ durationS: 600 }] },
    ],
  })
  const sooner = await createDraft(page, { date: '2031-12-01', sessionType: 'solo', exercises: [{ exerciseId: plank!, sets: [{ durationS: 30 }] }] })
  try {
    await expectPlannedTab(page, later, sooner, names)
  }
  finally {
    for (const id of [later, sooner]) await page.request.delete(`/api/workouts/${id}`)
  }
})

async function expectPlannedTab(page: Page, later: number, sooner: number, names: string[]) {
  const expected = await counts(page)

  await page.goto('/')
  await expect(tab(page, 'Planned')).toHaveAttribute('aria-selected', 'true')
  await expect(tab(page, 'Planned')).toHaveText(new RegExp(`Planned\\s*${expected.planned}`))
  await expect(tab(page, 'History')).toHaveText(new RegExp(`History\\s*${expected.history}`))

  const soonerCard = page.getByTestId('planned-item').filter({ has: page.locator(`a[href="/workouts/${sooner}/edit"]`) })
  const laterCard = page.getByTestId('planned-item').filter({ has: page.locator(`a[href="/workouts/${later}/edit"]`) })
  await expect(soonerCard).toContainText('1 Dec 2031')
  await expect(soonerCard).toContainText('Solo')
  await expect(laterCard).toContainText('5 Dec 2031')
  await expect(laterCard).toContainText('Trainer')
  await expect(laterCard.getByTestId('planned-item-count')).toHaveText('4 exercises · 5 sets')
  await expect(laterCard.getByTestId('planned-item-preview').locator('li')).toHaveText([names[0]!, names[1]!, names[2]!, '+1 more'])
  // Soonest first
  const order = await page.getByTestId('planned-item-edit').evaluateAll(links => links.map(a => a.getAttribute('href')))
  expect(order.indexOf(`/workouts/${sooner}/edit`)).toBeGreaterThanOrEqual(0)
  expect(order.indexOf(`/workouts/${sooner}/edit`)).toBeLessThan(order.indexOf(`/workouts/${later}/edit`))
  await expectNoHorizontalScroll(page)

  // Drafts stay out of the history
  await openHomeTab(page, 'History')
  await expect(page).toHaveURL(/\?tab=history$/)
  await expect(page.getByTestId('workout-item')).toHaveCount(expected.history)

  // Start in gym opens gym mode for that draft
  await openHomeTab(page, 'Planned')
  await soonerCard.getByTestId('planned-item-gym').click()
  await expect(page).toHaveURL(new RegExp(`/workouts/${sooner}/gym$`))
}

test('Back from a workout keeps the History tab selected', async ({ page }) => {
  await loginAndWaitForHome(page)
  const plank = await createExercise(page, unique('Plank'), 'timed')
  // A draft makes Planned the default tab; the done workout gives History a row to open.
  const draft = await createDraft(page, { date: '2031-11-01', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: 30 }] }] })
  const done = await createWorkout(page, { date: '2026-02-10', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: 30 }] }] })
  try {
    await page.goto('/')
    await expect(tab(page, 'Planned')).toHaveAttribute('aria-selected', 'true')
    await openHomeTab(page, 'History')
    await page.locator(`a[href="/workouts/${done}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/workouts/${done}$`))
    await page.goBack()
    await expect(page.getByTestId('home')).toBeVisible()
    await expect(tab(page, 'History')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(`a[href="/workouts/${done}"]`)).toBeVisible()
  }
  finally {
    for (const id of [draft, done]) await page.request.delete(`/api/workouts/${id}`)
  }
})
