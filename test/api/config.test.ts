import { describe, expect, it } from 'vitest'
import { runAppExpectingExit, startApp } from './helpers/app'

describe('startup configuration', () => {
  it.each(['NUXT_APP_USERNAME', 'NUXT_APP_PASSWORD', 'NUXT_APP_SECRET'])('refuses to start without %s', async (key) => {
    const { code, output } = await runAppExpectingExit({ [key]: undefined })
    expect(code).toBe(1)
    expect(output).toContain(`${key} is not set`)
  })

  it('refuses to start with an unknown NUXT_TRUSTED_PROXY', async () => {
    const { code, output } = await runAppExpectingExit({ NUXT_TRUSTED_PROXY: 'everyone' })
    expect(code).toBe(1)
    expect(output).toContain('NUXT_TRUSTED_PROXY must be one of: none, cloudflare, generic')
  })

  it('does not print secret values when refusing to start', async () => {
    const { code, output } = await runAppExpectingExit({ NUXT_APP_SECRET: 'too-short', NUXT_APP_PASSWORD: 'visible-password' })
    expect(code).toBe(1)
    expect(output).not.toContain('too-short')
    expect(output).not.toContain('visible-password')
  })

  it('starts and listens on the configured port when configuration is complete', async () => {
    const app = await startApp()
    try {
      expect(new URL(app.url).port).not.toBe('')
      const res = await app.request('/api/health')
      expect(res.status).toBe(200)
    }
    finally {
      await app.stop()
    }
  })
})
