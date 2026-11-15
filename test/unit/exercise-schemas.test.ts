import { describe, expect, it } from 'vitest'
import { createExerciseSchema, exerciseNameKey, updateExerciseSchema } from '../../shared/exercises'
import { EXERCISE_KINDS, fieldsForKind, KIND_DEFINITIONS } from '../../shared/kinds'
import { toFieldErrors } from '../../shared/validation'

describe('exercise kinds', () => {
  it('defines exactly the four kinds', () => {
    expect([...EXERCISE_KINDS]).toEqual(['weight_reps', 'bodyweight', 'timed', 'cardio'])
  })

  it('weight x reps requires weight and reps', () => {
    expect(KIND_DEFINITIONS.weight_reps.required).toEqual(['weightKg', 'reps'])
    expect(KIND_DEFINITIONS.weight_reps.optional).toEqual([])
  })

  it('bodyweight requires reps with optional added weight', () => {
    expect(KIND_DEFINITIONS.bodyweight.required).toEqual(['reps'])
    expect(KIND_DEFINITIONS.bodyweight.optional).toEqual(['weightKg'])
  })

  it('timed requires only a duration', () => {
    expect(fieldsForKind('timed')).toEqual(['durationS'])
  })

  it('cardio requires a duration with optional distance', () => {
    expect(fieldsForKind('cardio')).toEqual(['durationS', 'distanceM'])
  })
})

describe('exerciseNameKey', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(exerciseNameKey(' bench PRESS ')).toBe(exerciseNameKey('Bench press'))
  })
})

describe('createExerciseSchema', () => {
  it('trims the name', () => {
    expect(createExerciseSchema.parse({ name: '  Plank ', kind: 'timed' })).toEqual({ name: 'Plank', kind: 'timed' })
  })

  it('rejects a blank name and an unknown kind', () => {
    const result = createExerciseSchema.safeParse({ name: '   ', kind: 'yoga' })
    expect(result.success).toBe(false)
    const errors = toFieldErrors(result.error!)
    expect(errors.name).toBe('Name is required')
    expect(errors.kind).toBe('Choose a valid kind')
  })

  it('rejects a missing name and an overly long name', () => {
    expect(createExerciseSchema.safeParse({ kind: 'timed' }).success).toBe(false)
    expect(createExerciseSchema.safeParse({ name: 'x'.repeat(81), kind: 'timed' }).success).toBe(false)
  })
})

describe('updateExerciseSchema', () => {
  it('accepts a name or a kind', () => {
    expect(updateExerciseSchema.safeParse({ name: 'New' }).success).toBe(true)
    expect(updateExerciseSchema.safeParse({ kind: 'cardio' }).success).toBe(true)
  })

  it('rejects an empty update', () => {
    const result = updateExerciseSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(toFieldErrors(result.error!)).toEqual({ _: 'Nothing to update' })
  })
})
