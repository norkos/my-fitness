import { expect, test, type Page } from '@playwright/test'
import { createExercise, expectNoHorizontalScroll, loginAndWaitForHome, unique } from './helpers'

const KINDS = [
  ['weight_reps', 'Weight x reps'],
  ['bodyweight', 'Bodyweight'],
  ['timed', 'Timed'],
  ['cardio', 'Cardio'],
] as const

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
  await page.getByTestId('nav-exercises').click()
  await expect(page.getByTestId('exercises')).toBeVisible()
})

/** Opens the Add exercise dialog and submits it; the dialog stays open on errors. */
async function addExercise(page: Page, name: string, kind: string, videoUrl?: string) {
  await page.getByTestId('exercise-add').click()
  await expect(page.getByTestId('exercise-create-form')).toBeVisible()
  await page.getByTestId('exercise-name').fill(name)
  await page.getByTestId(`kind-${kind}`).click()
  if (videoUrl) await page.getByTestId('exercise-create-video').fill(videoUrl)
  await page.getByTestId('exercise-create').click()
}

const dialog = (page: Page) => page.getByRole('dialog')

test('creates one exercise of each kind, rejects a duplicate and renames one', async ({ page }) => {
  const names = KINDS.map(([kind]) => unique(`Ex ${kind}`))

  for (const [i, [kind, label]] of KINDS.entries()) {
    await addExercise(page, names[i]!, kind)
    await expect(dialog(page)).toBeHidden()
    const item = page.getByTestId('exercise-item').filter({ hasText: names[i]! })
    await expect(item).toBeVisible()
    await expect(item).toContainText(label)
  }

  // Duplicate, differing only by case and whitespace
  await addExercise(page, `  ${names[0]!.toUpperCase()} `, 'timed')
  await expect(page.getByTestId('exercise-create-form')).toContainText('An exercise with this name already exists')
  await expect(page.getByTestId('exercise-name')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByTestId('exercise-name')).toHaveValue(`  ${names[0]!.toUpperCase()} `)
  await expect(page.getByTestId('kind-timed')).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()

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
  await page.getByTestId('exercise-add').click()
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
  await expect(dialog(page)).toBeHidden()
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

test('adds an exercise with a video link from the dialog', async ({ page }) => {
  const name = unique('Goblet Squat')
  const url = 'https://example.com/videos/goblet'
  await addExercise(page, name, 'weight_reps', url)
  await expect(dialog(page)).toBeHidden()
  const item = page.getByTestId('exercise-item').filter({ hasText: name })
  await expect(item).toBeVisible()
  await expect(item.getByTestId('video-link')).toHaveAttribute('href', url)
  await expect(item.getByTestId('exercise-link')).toHaveAttribute('href', /\/exercises\/\d+$/)
})

test('filters the list by name, ignoring case, and clears the search', async ({ page }) => {
  const bench = unique('Bench Press')
  const incline = unique('Incline Bench Press')
  const squat = unique('Squat')
  for (const [name, kind] of [[bench, 'weight_reps'], [incline, 'weight_reps'], [squat, 'weight_reps']] as const) {
    await createExercise(page, name, kind)
  }
  await page.reload()
  await expect(page.getByTestId('exercise-item').filter({ hasText: squat })).toBeVisible()
  const total = await page.getByTestId('exercise-item').count()
  await expect(page.getByTestId('exercise-count')).toHaveText(`${total} exercises`)

  const search = page.getByTestId('exercise-search')
  await search.fill('bench')
  const names = page.getByTestId('exercise-item-name')
  await expect(names.filter({ hasText: bench })).toBeVisible()
  await expect(names.filter({ hasText: incline })).toBeVisible()
  await expect(names.filter({ hasText: squat })).toHaveCount(0)
  for (const shown of await names.allTextContents()) expect(shown.toLowerCase()).toContain('bench')
  await expect(page.getByTestId('exercise-count')).toHaveText(`${await names.count()} exercises`)

  await search.fill('zzz')
  await expect(page.getByTestId('exercises-no-match')).toContainText('No exercises match')
  await expect(page.getByTestId('exercise-list')).toHaveCount(0)
  await page.getByTestId('exercise-search-reset').click()
  await expect(search).toHaveValue('')
  await expect(page.getByTestId('exercise-item')).toHaveCount(total)

  await search.fill('SQUAT')
  await expect(names.filter({ hasText: squat })).toBeVisible()
  await page.getByTestId('exercise-search-clear').click()
  await expect(page.getByTestId('exercise-item')).toHaveCount(total)
})

test('a long name with a video link fits a 360px row', async ({ page }) => {
  const name = unique('Single-arm dumbbell Romanian deadlift on an incline bench')
  const id = await createExercise(page, name, 'weight_reps')
  expect((await page.request.patch(`/api/exercises/${id}`, { data: { videoUrl: 'https://example.com/videos/long' } })).status()).toBe(200)
  await page.setViewportSize({ width: 360, height: 780 })
  await page.reload()
  const item = page.getByTestId('exercise-item').filter({ hasText: name })
  await expect(item.getByTestId('exercise-item-name')).toHaveText(name)
  await item.scrollIntoViewIfNeeded()
  for (const action of ['video-link', 'exercise-link', 'exercise-edit']) {
    await expect(item.getByTestId(action)).toBeInViewport()
    const box = (await item.getByTestId(action).boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(360)
  }
  await expectNoHorizontalScroll(page)
})

test('opens with the page heading, eyebrow and subtitle', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Exercises', exact: true })).toBeVisible()
  await expect(page.getByTestId('page-eyebrow')).toHaveText('YOUR EXERCISE LIBRARY')
  await expect(page.getByTestId('page-subtitle')).toHaveText('Your movements, last time\'s numbers, and progress.')
  await expect(page.getByTestId('exercise-add')).toBeVisible()
})

test('the count row follows the search, singular for one match', async ({ page }) => {
  // A shared suffix keeps the search clear of exercises other tests created in the same database.
  const tag = unique('').trim()
  for (const [name, kind] of [[`Bench press ${tag}`, 'weight_reps'], [`Back squat ${tag}`, 'weight_reps'], [`Plank ${tag}`, 'timed']] as const) {
    await createExercise(page, name, kind)
  }
  await page.reload()
  const row = page.getByTestId('list-count')
  await expect(page.getByTestId('exercises')).toContainText('YOUR EXERCISES')

  await page.getByTestId('exercise-search').fill(`squat ${tag}`)
  await expect(page.getByTestId('exercise-item')).toHaveCount(1)
  await expect(row).toHaveText('1 exercise')
  await expect(page.getByTestId('exercise-count')).toHaveText('1 exercise')

  await page.getByTestId('exercise-search').fill(tag)
  await expect(row).toHaveText('3 exercises')

  await page.getByTestId('exercise-search').fill(`zzz ${tag}`)
  await expect(page.getByTestId('exercises-no-match')).toBeVisible()
  await expect(row).toHaveCount(0)
})
