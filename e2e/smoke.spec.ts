import { expect, test } from '@playwright/test'

test('app loads', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveTitle(/My Fitness/)
  await expect(page.getByTestId('login-form')).toBeVisible()
})
