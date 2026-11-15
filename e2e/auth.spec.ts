import { expect, test } from '@playwright/test'
import { login, loginAndWaitForHome, PASSWORD, USERNAME } from './helpers'

test('redirects to login when not logged in', async ({ page }) => {
  await page.goto('/exercises')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByTestId('login-form')).toBeVisible()
})

test('shows a generic error for a wrong password', async ({ page }) => {
  await login(page, USERNAME, `${PASSWORD}-wrong`)
  await expect(page.getByTestId('login-error')).toContainText('Invalid username or password')
  await expect(page).toHaveURL(/\/login$/)
})

test('logs in, survives a reload, and logs out', async ({ page }) => {
  await loginAndWaitForHome(page)
  await expect(page).toHaveURL(/\/$/)

  await page.reload()
  await expect(page.getByTestId('home')).toBeVisible()

  await page.getByTestId('logout').click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
})
