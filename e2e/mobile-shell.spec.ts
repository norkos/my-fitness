import { expect, test, type Page } from '@playwright/test'
import { createDraft, createExercise, createWorkout, expectNoHorizontalScroll, loginAndWaitForHome, unique } from './helpers'

/** Every visible button, link and checkbox must be at least 44px high (one-handed use on a phone). */
async function expectTouchTargets(page: Page) {
  const small = await page.evaluate(() => {
    const selector = 'button, a[href], [role="checkbox"], [role="radio"], [role="tab"], input[type="checkbox"]'
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => {
        const style = getComputedStyle(el)
        const box = el.getBoundingClientRect()
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && !el.closest('[aria-hidden="true"]')
      })
      .filter(el => el.getBoundingClientRect().height < 44)
      .map(el => `${el.tagName.toLowerCase()}[${el.dataset.testid ?? el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30)}] ${Math.round(el.getBoundingClientRect().height)}px`)
  })
  expect(small, 'controls smaller than 44px').toEqual([])
}

async function planOneExercise(page: Page) {
  const name = unique('Squat')
  const exerciseId = await createExercise(page, name, 'weight_reps')
  const id = await createDraft(page, { date: '2032-06-14', sessionType: 'solo', exercises: [{ exerciseId, sets: [{ weightKg: 60, reps: 5 }] }] })
  return { id, exerciseId, name }
}

test.describe('phone (360px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await loginAndWaitForHome(page)
  })

  test('navigation sits in a bottom bar and follows the route', async ({ page }) => {
    const bottomNav = page.getByTestId('bottom-nav')
    await expect(bottomNav).toBeVisible()
    await expect(page.locator('header').getByTestId('nav-workouts')).toHaveCount(0)
    await expect(page.locator('header').getByTestId('logout')).toBeVisible()

    const box = await bottomNav.boundingBox()
    expect(box!.y + box!.height).toBeCloseTo(780, 0)

    await expect(bottomNav.getByTestId('nav-workouts')).toHaveAttribute('aria-current', 'page')
    await bottomNav.getByTestId('nav-exercises').click()
    await expect(page).toHaveURL(/\/exercises$/)
    await expect(bottomNav.getByTestId('nav-exercises')).toHaveAttribute('aria-current', 'page')
    await expect(bottomNav.getByTestId('nav-workouts')).not.toHaveAttribute('aria-current', 'page')

    const { id } = await planOneExercise(page)
    await page.goto(`/workouts/${id}/gym`)
    await expect(bottomNav.getByTestId('nav-workouts')).toHaveAttribute('aria-current', 'page')
  })

  test('delete confirmation opens as a bottom sheet and Escape returns focus', async ({ page }) => {
    const exerciseId = await createExercise(page, unique('Plank'), 'timed')
    const id = await createWorkout(page, { date: '2026-02-03', sessionType: 'solo', exercises: [{ exerciseId, sets: [{ durationS: 30 }] }] })
    await page.goto(`/workouts/${id}`)

    const opener = page.getByTestId('workout-delete')
    await opener.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByTestId('delete-confirm')).toBeVisible()
    // Poll: the sheet scales in over 200ms, so an early measurement is slightly smaller.
    await expect.poll(async () => {
      const box = (await dialog.boundingBox())!
      return [Math.round(box.width), Math.round(box.y + box.height)]
    }).toEqual([360, 780])

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('screens fit the width and have 44px touch targets', async ({ page }) => {
    const { id, exerciseId } = await planOneExercise(page)
    // A done workout gives the History tab a card to measure.
    await createWorkout(page, { date: '2026-02-04', sessionType: 'trainer', exercises: [{ exerciseId, sets: [{ weightKg: 40, reps: 8 }] }] })
    const screens = ['/', '/?tab=history', '/exercises', '/workouts/new', `/workouts/${id}/gym`]
    for (const path of screens) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalScroll(page)
      await expectTouchTargets(page)
    }
  })

  test('page heading and count row text is at least 12px', async ({ page }) => {
    // The draft gives home a planned list (and so a count row); Exercises has its catalog.
    const { id } = await planOneExercise(page)
    const screens: { path: string, countRows: number, rowText: string[] }[] = [
      { path: '/?tab=planned', countRows: 1, rowText: [] },
      // Exercises: each row's name and kind label
      { path: '/exercises', countRows: 1, rowText: ['[data-testid="exercise-item-name"]', '[data-testid^="kind-badge-"]'] },
      { path: `/workouts/${id}/gym`, countRows: 0, rowText: [] },
    ]
    for (const { path, countRows, rowText } of screens) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page.getByTestId('page-eyebrow')).toBeVisible()
      await expect(page.getByTestId('list-count')).toHaveCount(countRows)
      for (const selector of rowText) await expect(page.locator(selector).first()).toBeVisible()
      const sizes = await page.evaluate((rowText) => {
        const rows = [...document.querySelectorAll<HTMLElement>('[data-testid="list-count"]')]
        const elements = [
          document.querySelector<HTMLElement>('[data-testid="page-eyebrow"]')!,
          document.querySelector<HTMLElement>('[data-testid="page-subtitle"]')!,
          // Each count row: the count and its label
          ...rows.flatMap(el => [el, ...[...el.parentElement!.children] as HTMLElement[]]),
          ...rowText.flatMap(selector => [...document.querySelectorAll<HTMLElement>(selector)]),
        ]
        return elements.map(el => ({ text: el.textContent?.trim(), px: Number.parseFloat(getComputedStyle(el).fontSize) }))
      }, rowText)
      for (const { text, px } of sizes) expect(px, `${path}: "${text}"`).toBeGreaterThanOrEqual(12)
    }
  })

  test('gym set grid headers and last-time box text is at least 12px', async ({ page }) => {
    const { id } = await planOneExercise(page)
    await page.goto(`/workouts/${id}/gym`)
    await expect(page.getByTestId('gym-entry-last')).toBeVisible()
    await expect(page.getByTestId('gym-set-header')).toHaveCount(1)
    const sizes = await page.evaluate(() => {
      const elements = [
        ...document.querySelectorAll<HTMLElement>('[data-testid="gym-set-header"] > *'),
        ...document.querySelectorAll<HTMLElement>('[data-testid="gym-entry-last"], [data-testid="gym-entry-last"] *'),
      ].filter(el => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()))
      return elements.map(el => ({ text: el.textContent?.trim(), px: Number.parseFloat(getComputedStyle(el).fontSize) }))
    })
    expect(sizes.length, 'text found').toBeGreaterThan(0)
    for (const { text, px } of sizes) expect(px, `"${text}"`).toBeGreaterThanOrEqual(12)
  })

  test('home tabs and workout card text is at least 12px', async ({ page }) => {
    const { exerciseId } = await planOneExercise(page)
    await createWorkout(page, { date: '2026-02-05', sessionType: 'solo', exercises: [{ exerciseId, sets: [{ weightKg: 40, reps: 8 }] }] })
    const screens = [
      { path: '/?tab=planned', card: 'planned-item' },
      { path: '/?tab=history', card: 'workout-item' },
    ]
    for (const { path, card } of screens) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(page.getByTestId(card).first()).toBeVisible()
      const sizes = await page.evaluate(() => {
        const roots = [
          '[role="tab"]', // label and count badge
          '[data-testid="planned-item-count"]',
          '[data-testid="workout-item-count"]',
          '[data-testid="session-badge"]',
          '[data-testid="planned-item-edit"]',
          '[data-testid="planned-item-gym"]',
        ]
        // Every element that renders text of its own inside those pieces
        const elements = [...document.querySelectorAll<HTMLElement>(roots.join(','))]
          .flatMap(root => [root, ...root.querySelectorAll<HTMLElement>('*')])
          .filter(el => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()))
        return elements.map(el => ({ text: el.textContent?.trim(), px: Number.parseFloat(getComputedStyle(el).fontSize) }))
      })
      expect(sizes.length, `${path}: text found`).toBeGreaterThan(0)
      for (const { text, px } of sizes) expect(px, `${path}: "${text}"`).toBeGreaterThanOrEqual(12)
    }
  })

  test('the last item on the page scrolls clear of the bottom bar', async ({ page }) => {
    await page.goto('/exercises')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const mainBottom = await page.locator('main > *').last().evaluate(el => el.getBoundingClientRect().bottom)
    const navTop = (await page.getByTestId('bottom-nav').boundingBox())!.y
    expect(mainBottom).toBeLessThanOrEqual(navTop)
  })
})

test.describe('desktop (1024px)', () => {
  test('navigation sits in the header and there is no bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 })
    await loginAndWaitForHome(page)
    const header = page.locator('header')
    await expect(header.getByTestId('nav-workouts')).toBeVisible()
    await expect(header.getByTestId('nav-exercises')).toBeVisible()
    await expect(header.getByTestId('logout')).toBeVisible()
    await expect(page.getByTestId('bottom-nav')).toHaveCount(0)
  })
})
