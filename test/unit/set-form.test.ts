import { describe, expect, it } from 'vitest'
import { EXERCISE_KINDS, fieldsForKind } from '../../shared/kinds'
import { fieldHeader, gymFieldsForKind } from '../../shared/set-form'

describe('gym set grid headers', () => {
  it.each([
    ['weight_reps', ['KG', 'REPS']],
    ['bodyweight', ['+KG', 'REPS']],
    ['timed', ['S']],
    ['cardio', ['MIN', 'M']],
  ] as const)('%s headers', (kind, headers) => {
    expect(gymFieldsForKind(kind).map(f => fieldHeader(kind, f))).toEqual(headers)
  })

  it('puts weight before reps only in gym mode', () => {
    expect(fieldsForKind('bodyweight')).toEqual(['reps', 'weightKg'])
    expect(gymFieldsForKind('bodyweight')).toEqual(['weightKg', 'reps'])
  })

  it('keeps the same fields for every kind', () => {
    for (const kind of EXERCISE_KINDS) {
      expect([...gymFieldsForKind(kind)].sort()).toEqual([...fieldsForKind(kind)].sort())
    }
  })
})
