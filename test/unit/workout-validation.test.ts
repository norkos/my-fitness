import { describe, expect, it } from 'vitest'
import type { ExerciseKind } from '../../shared/kinds'
import { isValidIsoDate, validateWorkout } from '../../shared/workouts'

const KINDS: Record<number, ExerciseKind> = { 1: 'weight_reps', 2: 'bodyweight', 3: 'timed', 4: 'cardio' }
const kindOf = (id: number) => KINDS[id]

function workout(exercises: unknown, extra: Record<string, unknown> = {}) {
  return { date: '2026-11-15', sessionType: 'trainer', exercises, ...extra }
}

function errorsOf(input: unknown) {
  const result = validateWorkout(input, kindOf)
  if (result.success) throw new Error('expected validation to fail')
  return result.fieldErrors
}

describe('validateWorkout: valid input', () => {
  it('accepts a trainer session with sets for every kind', () => {
    const result = validateWorkout(workout([
      { exerciseId: 1, sets: [{ weightKg: 50, reps: 8 }, { weightKg: 52.5, reps: 6 }] },
      { exerciseId: 2, sets: [{ reps: 8 }, { reps: 6, weightKg: 10 }] },
      { exerciseId: 3, sets: [{ durationS: 45 }] },
      { exerciseId: 4, sets: [{ durationS: 600, distanceM: 2000 }, { durationS: 300 }] },
    ]), kindOf)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.exercises[0]!.sets[1]).toEqual({ weightKg: 52.5, reps: 6, durationS: null, distanceM: null })
    expect(result.data.exercises[3]!.sets[1]).toEqual({ weightKg: null, reps: null, durationS: 300, distanceM: null })
  })

  it('drops values the kind does not record', () => {
    const result = validateWorkout(workout([{ exerciseId: 3, sets: [{ durationS: 30, reps: 5, weightKg: 10 }] }]), kindOf)
    expect(result.success && result.data.exercises[0]!.sets[0]).toEqual({ weightKg: null, reps: null, durationS: 30, distanceM: null })
  })

  it('accepts zero as a value', () => {
    expect(validateWorkout(workout([{ exerciseId: 1, sets: [{ weightKg: 0, reps: 10 }] }]), kindOf).success).toBe(true)
  })
})

describe('validateWorkout: rejections', () => {
  it('requires at least one exercise', () => {
    expect(errorsOf(workout([]))).toEqual({ exercises: 'Add at least one exercise' })
  })

  it('requires at least one set per exercise', () => {
    expect(errorsOf(workout([{ exerciseId: 1, sets: [] }]))).toEqual({ 'exercises.0.sets': 'Add at least one set' })
  })

  it('requires weight and reps for weight x reps', () => {
    expect(errorsOf(workout([{ exerciseId: 1, sets: [{ reps: 8 }] }]))).toEqual({ 'exercises.0.sets.0.weightKg': 'Weight is required' })
  })

  it('requires reps for bodyweight, duration for timed and cardio', () => {
    const errors = errorsOf(workout([
      { exerciseId: 2, sets: [{ weightKg: 5 }] },
      { exerciseId: 3, sets: [{}] },
      { exerciseId: 4, sets: [{ distanceM: 100, durationS: null }] },
    ]))
    expect(errors).toEqual({
      'exercises.0.sets.0.reps': 'Reps is required',
      'exercises.1.sets.0.durationS': 'Duration is required',
      'exercises.2.sets.0.durationS': 'Duration is required',
    })
  })

  it('rejects negative values', () => {
    expect(errorsOf(workout([{ exerciseId: 2, sets: [{ reps: -5 }] }]))).toEqual({ 'exercises.0.sets.0.reps': 'Reps cannot be negative' })
  })

  it('rejects non-numeric values', () => {
    expect(errorsOf(workout([{ exerciseId: 1, sets: [{ weightKg: 'fifty', reps: 8 }] }]))).toEqual({ 'exercises.0.sets.0.weightKg': 'Weight must be a number' })
  })

  it('requires whole numbers for reps, seconds and meters', () => {
    const errors = errorsOf(workout([{ exerciseId: 4, sets: [{ durationS: 10.5, distanceM: 1.2 }] }]))
    expect(errors['exercises.0.sets.0.durationS']).toBe('Duration must be a whole number')
    expect(errors['exercises.0.sets.0.distanceM']).toBe('Distance must be a whole number')
  })

  it('rejects absurdly large values', () => {
    expect(errorsOf(workout([{ exerciseId: 1, sets: [{ weightKg: 5000, reps: 1 }] }]))['exercises.0.sets.0.weightKg']).toBe('Weight is too large')
  })

  it('rejects unknown and duplicated exercises', () => {
    expect(errorsOf(workout([{ exerciseId: 99, sets: [{ reps: 1 }] }]))).toEqual({ 'exercises.0.exerciseId': 'This exercise does not exist' })
    expect(errorsOf(workout([
      { exerciseId: 3, sets: [{ durationS: 1 }] },
      { exerciseId: 3, sets: [{ durationS: 2 }] },
    ]))['exercises.1.exerciseId']).toMatch(/already in the workout/)
  })

  it('validates date and session type', () => {
    const errors = errorsOf(workout([{ exerciseId: 3, sets: [{ durationS: 1 }] }], { date: '2026-02-30', sessionType: 'group' }))
    expect(errors.date).toBe('Enter a valid date')
    expect(errors.sessionType).toBe('Choose solo or trainer')
  })

  it('caps the number of exercises and sets', () => {
    const manySets = Array.from({ length: 31 }, () => ({ durationS: 10 }))
    expect(errorsOf(workout([{ exerciseId: 3, sets: manySets }]))['exercises.0.sets']).toBe('At most 30 sets per exercise')
    const manyExercises = Array.from({ length: 31 }, () => ({ exerciseId: 3, sets: [{ durationS: 1 }] }))
    expect(errorsOf(workout(manyExercises)).exercises).toBe('At most 30 exercises per workout')
  })

  it('rejects a missing body', () => {
    expect(validateWorkout(undefined, kindOf).success).toBe(false)
  })
})

describe('isValidIsoDate', () => {
  it.each([['2026-11-15', true], ['2024-02-29', true], ['2026-02-29', false], ['15-11-2026', false], ['2026-1-5', false]])('%s -> %s', (value, ok) => {
    expect(isValidIsoDate(value)).toBe(ok)
  })
})
