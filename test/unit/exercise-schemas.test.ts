import { describe, expect, it } from 'vitest'
import { createExerciseSchema, exerciseNameKey, isHttpsUrl, updateExerciseSchema } from '../../shared/exercises'
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

  it('treats composed and decomposed accents as the same name', () => {
    const composed = 'Pli\u00E9 squat'
    const decomposed = 'Plie\u0301 squat'
    expect(composed).not.toBe(decomposed)
    expect(exerciseNameKey(decomposed)).toBe(exerciseNameKey(composed))
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

describe('video link', () => {
  const create = (videoUrl: unknown) => createExerciseSchema.safeParse({ name: 'Plank', kind: 'timed', videoUrl })

  it('accepts an https link and trims it', () => {
    const result = create('  https://example.com/videos/plank ')
    expect(result.success && result.data.videoUrl).toBe('https://example.com/videos/plank')
  })

  it('treats an empty string as no video and allows omitting it', () => {
    expect(create('').data?.videoUrl).toBeNull()
    expect(create(null).data?.videoUrl).toBeNull()
    expect(createExerciseSchema.parse({ name: 'Plank', kind: 'timed' }).videoUrl).toBeUndefined()
  })

  it('rejects unsafe or non-https links', () => {
    for (const bad of ['javascript:alert(1)', 'http://example.com/video', 'www.example.com/video', 'https://', 42]) {
      const result = create(bad)
      expect(result.success).toBe(false)
      expect(toFieldErrors(result.error!)).toEqual({ videoUrl: 'Enter an https:// link' })
    }
  })

  it('rejects links over 2048 characters', () => {
    const result = create(`https://example.com/${'a'.repeat(2048)}`)
    expect(toFieldErrors(result.error!)).toEqual({ videoUrl: 'Link is too long' })
  })

  it('counts a video change as an update on its own', () => {
    expect(updateExerciseSchema.safeParse({ videoUrl: '' }).success).toBe(true)
  })

  it('checks https URLs', () => {
    expect(isHttpsUrl('https://example.com/videos/x')).toBe(true)
    expect(isHttpsUrl('not a url')).toBe(false)
  })
})
