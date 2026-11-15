import { describe, expect, it } from 'vitest'
import { DEFAULT_DATABASE_PATH, findConfigProblems, readServerConfig } from '../../server/lib/config'

const valid = {
  NUXT_APP_USERNAME: 'me',
  NUXT_APP_PASSWORD: 'super-secret-password',
  NUXT_APP_SECRET: 'x'.repeat(40),
  NUXT_DATABASE_PATH: '/data/fitness.db',
}

describe('findConfigProblems', () => {
  it('accepts a complete configuration', () => {
    expect(findConfigProblems(valid)).toEqual([])
  })

  it.each(['NUXT_APP_USERNAME', 'NUXT_APP_PASSWORD', 'NUXT_APP_SECRET'])('reports missing %s', (key) => {
    const problems = findConfigProblems({ ...valid, [key]: undefined })
    expect(problems).toContain(`${key} is not set`)
  })

  it('treats blank values as missing', () => {
    expect(findConfigProblems({ ...valid, NUXT_APP_USERNAME: '   ' })).toContain('NUXT_APP_USERNAME is not set')
  })

  it('rejects a short secret without revealing it', () => {
    const problems = findConfigProblems({ ...valid, NUXT_APP_SECRET: 'short-secret' })
    expect(problems).toEqual(['NUXT_APP_SECRET must be at least 32 characters'])
    expect(problems.join(' ')).not.toContain('short-secret')
  })

  it('never includes values in messages', () => {
    const problems = findConfigProblems({ NUXT_APP_PASSWORD: 'hunter2' })
    expect(problems.join(' ')).not.toContain('hunter2')
  })
})

describe('readServerConfig', () => {
  it('returns the parsed configuration', () => {
    expect(readServerConfig(valid)).toEqual({
      username: 'me',
      password: 'super-secret-password',
      databasePath: '/data/fitness.db',
      trustedProxy: 'none',
    })
  })

  it('reads the trusted proxy mode, case-insensitively', () => {
    expect(readServerConfig({ ...valid, NUXT_TRUSTED_PROXY: 'Cloudflare' }).trustedProxy).toBe('cloudflare')
    expect(readServerConfig({ ...valid, NUXT_TRUSTED_PROXY: '' }).trustedProxy).toBe('none')
  })

  it('rejects an unknown trusted proxy mode', () => {
    expect(findConfigProblems({ ...valid, NUXT_TRUSTED_PROXY: 'everything' }))
      .toEqual(['NUXT_TRUSTED_PROXY must be one of: none, cloudflare, generic'])
  })

  it('defaults the database path', () => {
    expect(readServerConfig({ ...valid, NUXT_DATABASE_PATH: undefined }).databasePath).toBe(DEFAULT_DATABASE_PATH)
  })

  it('throws on invalid configuration', () => {
    expect(() => readServerConfig({ ...valid, NUXT_APP_PASSWORD: '' })).toThrow(/NUXT_APP_PASSWORD is not set/)
  })
})
