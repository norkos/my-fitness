import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startApp, type TestApp } from './helpers/app'

describe('API test harness', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app?.stop()
  })

  it('serves the app shell', async () => {
    const res = await fetch(`${app.url}/`)
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('__nuxt')
  })
})
