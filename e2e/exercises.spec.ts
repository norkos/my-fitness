import { expect, test } from '@playwright/test'
import { loginAndWaitForHome, unique } from './helpers'

const KINDS = [
  ['weight_reps', 'Weight x reps'],
  ['bodyweight', 'Bodyweight'],
  ['timed', 'Timed'],
  ['cardio', 'Cardio'],
] as const

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
  await page.getByTestId('nav-exercises').click()
  await expect(page.getByTestId('exercise-create-form')).toBeVisible()
})

async function addExercise(page: import('@playwright/test').Page, name: string, kind: string) {
  await page.getByTestId('exercise-name').fill(name)
  await page.getByTestId(`kind-${kind}`).click()
  await page.getByTestId('exercise-create').click()
}

test('creates one exercise of each kind, rejects a duplicate and renames one', async ({ page }) => {
  const names = KINDS.map(([kind]) => unique(`Ex ${kind}`))

  for (const [i, [kind, label]] of KINDS.entries()) {
    await addExercise(page, names[i]!, kind)
    const item = page.getByTestId('exercise-item').filter({ hasText: names[i]! })
    await expect(item).toBeVisible()
    await expect(item).toContainText(label)
  }

  // Duplicate, differing only by case and whitespace
  await addExercise(page, `  ${names[0]!.toUpperCase()} `, 'timed')
  await expect(page.getByTestId('exercise-create-form')).toContainText('An exercise with this name already exists')

  // Rename
  const renamed = `${names[1]} renamed`
  await page.getByTestId('exercise-item').filter({ hasText: names[1]! }).getByTestId('exercise-edit').click()
  await page.getByTestId('exercise-edit-name').fill(renamed)
  await page.getByTestId('exercise-edit-save').click()
  await expect(page.getByTestId('exercise-item').filter({ hasText: renamed })).toBeVisible()

  // Tapping an exercise opens its progress view
  await page.getByTestId('exercise-item').filter({ hasText: renamed }).getByTestId('exercise-link').click()
  await expect(page.getByTestId('progress-title')).toHaveText(renamed)
})

test('requires a kind and a name', async ({ page }) => {
  await page.getByTestId('exercise-name').fill(unique('No kind'))
  await page.getByTestId('exercise-create').click()
  await expect(page.getByTestId('exercise-create-form')).toContainText('Choose a kind')

  await page.getByTestId('exercise-name').fill('   ')
  await page.getByTestId('kind-timed').click()
  await page.getByTestId('exercise-create').click()
  await expect(page.getByTestId('exercise-create-form')).toContainText('Name is required')
})

test('adds a video link that opens in a new tab and rejects an unsafe one', async ({ page, context }) => {
  const name = unique('Plank')
  await addExercise(page, name, 'timed')
  const item = page.getByTestId('exercise-item').filter({ hasText: name })
  await expect(item.getByTestId('video-link')).toHaveCount(0)

  await item.getByTestId('exercise-edit').click()
  await page.getByTestId('exercise-edit-video').fill('javascript:alert(1)')
  await page.getByTestId('exercise-edit-save').click()
  await expect(page.getByTestId('exercise-edit-form')).toContainText('Enter an https:// link')

  const url = 'https://example.com/videos/plank'
  await page.getByTestId('exercise-edit-video').fill(url)
  await page.getByTestId('exercise-edit-save').click()
  const link = item.getByTestId('video-link')
  await expect(link).toHaveAttribute('href', url)
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer')

  // Don't load YouTube in tests: answer the request locally and just check a new tab opens.
  await context.route('https://example.com/**', route => route.fulfill({ status: 200, body: 'video' }))
  const [popup] = await Promise.all([context.waitForEvent('page'), link.click()])
  await expect(popup).toHaveURL(url)
  await popup.close()
  await expect(page.getByTestId('exercise-list')).toBeVisible()
})
