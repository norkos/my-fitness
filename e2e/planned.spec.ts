import { expect, test } from '@playwright/test'
import { createExercise, expectNoHorizontalScroll, loginAndWaitForHome, pickExercise, unique } from './helpers'

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
