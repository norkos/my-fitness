import { expect, test, type Page } from '@playwright/test'
import { createExercise, expectNoHorizontalScroll, loginAndWaitForHome, unique } from './helpers'

const PLAN_PDF = 'e2e/fixtures/trainer-plan.pdf'

/** A valid one-page PDF with some text but no plan table. */
const NOT_A_PLAN_PDF = Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 20 100 Td (Invoice 123) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF
`)

/** Fails the test on any Content-Security-Policy violation, e.g. the pdf.js worker being blocked. */
function watchCsp(page: Page): string[] {
  const violations: string[] = []
  page.on('console', (msg) => {
    if (/content security policy/i.test(msg.text())) violations.push(msg.text())
  })
  page.on('pageerror', (err) => {
    if (/content security policy/i.test(err.message)) violations.push(err.message)
  })
  return violations
}

const tomorrowLabel = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

test.beforeEach(async ({ page }) => {
  await loginAndWaitForHome(page)
})

test('imports the trainer PDF into a draft, matching known exercises and linking one by hand', async ({ page }) => {
  const csp = watchCsp(page)
  // "Plank" is in the catalog (maybe from an earlier run), so the PDF row matches it.
  const plank = await page.request.post('/api/exercises', { data: { name: 'Plank', kind: 'timed' } })
  expect([201, 409]).toContain(plank.status())
  const sideLateralRaise = unique('Side lateral raise')
  await createExercise(page, sideLateralRaise, 'weight_reps')
  const plannedBefore = await page.getByTestId('planned-item').count()

  await page.getByTestId('import-plan').click()
  await expect(page.getByTestId('import-page')).toBeVisible()
  await page.getByTestId('import-file').setInputFiles(PLAN_PDF)

  const rows = page.getByTestId('import-row')
  await expect(rows).toHaveCount(8)
  await expect(page.getByTestId('import-row-name')).toHaveText([
    'Dumbbell bench press',
    'Bent-over dumbbell row',
    'Flat bench flyes',
    'Dumbbell lunges',
    'Lateral raise',
    'Dumbbell curl',
    'Plank',
    "Russian twist's",
  ])
  await expect(rows.nth(0).getByTestId('import-row-plan')).toHaveText('4 x 10 @ 12.5 kg')
  await expect(rows.nth(2).getByTestId('import-row-plan')).toHaveText('3 x 15 @ 6 kg')
  await expect(rows.nth(6).getByTestId('import-row-plan')).toHaveText('3 x 40s')
  await expect(rows.nth(6)).toHaveAttribute('data-match', 'matched')
  await expect(rows.nth(6).getByTestId('video-link')).toHaveAttribute('href', 'https://example.com/videos/plank')
  await expect(rows.nth(5).getByTestId('video-link')).toHaveCount(0)
  await expect(page.getByTestId('import-date')).toBeVisible()
  await expect(page.getByTestId('import-session-trainer')).toHaveAttribute('aria-checked', 'true')
  await expectNoHorizontalScroll(page)

  // Rows unknown to this database are proposed as new exercises with a guessed kind. On a rerun
  // against the same database they already exist and are matched instead.
  const lateral = rows.nth(4)
  if (await lateral.getAttribute('data-match') === 'new') {
    await expect(lateral.getByTestId('import-row-kind')).toHaveValue('weight_reps')
    await lateral.getByTestId('import-row-link').click()
    await lateral.getByTestId('import-row-exercise').selectOption({ label: sideLateralRaise })
  }
  const twist = rows.nth(7)
  if (await twist.getAttribute('data-match') === 'new') {
    await expect(twist.getByTestId('import-row-kind')).toHaveValue('timed')
  }

  await page.getByTestId('import-confirm').click()
  await expect(page.getByTestId('planned-badge')).toBeVisible()
  await expect(page.getByTestId('workout-entry')).toHaveCount(8)
  await expect(page.getByTestId('workout-entry').first().getByTestId('set-row')).toHaveCount(4)

  await page.getByTestId('nav-workouts').click()
  await expect(page.getByTestId('planned-item')).toHaveCount(plannedBefore + 1)
  await expect(page.getByTestId('planned-item').filter({ hasText: tomorrowLabel() }).filter({ hasText: '8 exercises' }).first()).toBeVisible()
  expect(csp).toEqual([])
})

test('rejects files that are not a plan and saves nothing when cancelled', async ({ page }) => {
  const plannedBefore = await page.getByTestId('planned-item').count()
  await page.getByTestId('import-plan').click()

  await page.getByTestId('import-file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('3 x 12') })
  await expect(page.getByTestId('import-error')).toHaveText('Choose a PDF file.')

  await page.getByTestId('import-file').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not really a pdf') })
  await expect(page.getByTestId('import-error')).toHaveText('This file is not a PDF.')

  await page.getByTestId('import-file').setInputFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: NOT_A_PLAN_PDF })
  await expect(page.getByTestId('import-error')).toHaveText('This file could not be read as a training plan.')
  await expect(page.getByTestId('import-review')).toHaveCount(0)

  await page.getByTestId('import-file').setInputFiles(PLAN_PDF)
  await expect(page.getByTestId('import-row')).toHaveCount(8)
  await page.getByTestId('import-cancel').click()
  await expect(page.getByTestId('home')).toBeVisible()
  await expect(page.getByTestId('planned-item')).toHaveCount(plannedBefore)
})
