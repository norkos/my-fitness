import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, inlineScriptHashes } from '../../server/lib/csp'

const sha = (s: string) => `sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}`

describe('inlineScriptHashes', () => {
  it('hashes executable inline scripts, including import maps', () => {
    const html = '<script type="importmap">{"imports":{}}</script><script>window.a=1</script>'
    expect(inlineScriptHashes(html)).toEqual([sha('{"imports":{}}'), sha('window.a=1')])
  })

  it('skips external scripts and JSON data blocks, and de-duplicates', () => {
    const html = [
      '<script type="module" src="/_nuxt/a.js" crossorigin></script>',
      '<script type="application/json" id="__NUXT_DATA__">[1]</script>',
      '<script>x()</script><script>x()</script>',
    ].join('')
    expect(inlineScriptHashes(html)).toEqual([sha('x()')])
  })
})

describe('contentSecurityPolicy', () => {
  it('never allows unsafe-inline scripts', () => {
    expect(contentSecurityPolicy()).toContain(`script-src 'self';`)
    expect(contentSecurityPolicy(['sha256-abc'])).toContain(`script-src 'self' 'sha256-abc';`)
    expect(contentSecurityPolicy(['sha256-abc'])).not.toMatch(/script-src[^;]*unsafe-inline/)
  })
})
