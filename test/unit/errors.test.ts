import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { parseId, parseInput, ServiceError } from '../../server/lib/errors'

describe('parseInput', () => {
  const schema = z.object({ n: z.number({ error: 'n must be a number' }) })

  it('returns parsed data', () => {
    expect(parseInput(schema, { n: 1 })).toEqual({ n: 1 })
  })

  it('throws a validation error with field messages', () => {
    try {
      parseInput(schema, { n: 'x' })
      throw new Error('should have thrown')
    }
    catch (e) {
      expect(e).toBeInstanceOf(ServiceError)
      expect((e as ServiceError).status).toBe(400)
      expect((e as ServiceError).fieldErrors).toEqual({ n: 'n must be a number' })
    }
  })
})

describe('parseId', () => {
  it('accepts positive integers', () => {
    expect(parseId('42')).toBe(42)
  })

  it.each(['0', '-1', '1.5', 'abc', undefined])('treats %s as not found', (value) => {
    expect(() => parseId(value, 'Workout')).toThrow('Workout not found')
  })
})
