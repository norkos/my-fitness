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
