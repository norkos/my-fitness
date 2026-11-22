import { describe, expect, it } from 'vitest'
import { parsePositiveId } from '../../shared/ids'

describe('parsePositiveId', () => {
  it('accepts a positive integer string', () => {
    expect(parsePositiveId('42')).toBe(42)
  })

  it('accepts a positive integer number', () => {
    expect(parsePositiveId(42)).toBe(42)
  })

  it('takes the first item of an array', () => {
    expect(parsePositiveId(['7', '8'])).toBe(7)
  })

  it('accepts the largest safe integer', () => {
    expect(parsePositiveId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)
  })

  it.each(['..', 'abc', '0', '-3', '1.5', '1e2', ' 42 ', '0x10', '', undefined, null, 0, -3, 1.5, [], {}])(
    'rejects %j',
    (value) => {
      expect(parsePositiveId(value)).toBeUndefined()
    },
  )

  it('rejects a value above MAX_SAFE_INTEGER', () => {
    expect(parsePositiveId('9007199254740993')).toBeUndefined()
    expect(parsePositiveId(Number.MAX_SAFE_INTEGER + 2)).toBeUndefined()
  })
})
