import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ServiceError } from '../../server/lib/errors'
import { createExercise, getExercise, listExercises, updateExercise, withUniqueName } from '../../server/services/exercises'
import { createWorkout, replaceWorkout } from '../../server/services/workouts'
import { createTempDb, type TempDb } from './helpers/db'
import { insertRawUsage } from './helpers/fixtures'

let t: TempDb

beforeEach(() => {
  t = createTempDb()
})

afterEach(() => {
  t.dispose()
})

function expectServiceError(fn: () => unknown, code: ServiceError['code'], field?: string) {
  try {
    fn()
  }
  catch (error) {
    expect(error).toBeInstanceOf(ServiceError)
    const e = error as ServiceError
    expect(e.code).toBe(code)
    if (field) expect(e.fieldErrors[field]).toBeTruthy()
    return e
  }
  throw new Error('expected a ServiceError')
}

describe('createExercise', () => {
  it('creates an unused exercise with a trimmed name', () => {
    const ex = createExercise(t.db, { name: '  Bench press ', kind: 'weight_reps' })
    expect(ex).toMatchObject({ name: 'Bench press', kind: 'weight_reps', used: false })
    expect(ex.id).toBeGreaterThan(0)
  })

  it('rejects duplicates ignoring case and surrounding whitespace', () => {
    createExercise(t.db, { name: 'Bench press', kind: 'weight_reps' })
    const e = expectServiceError(() => createExercise(t.db, { name: ' bench PRESS ', kind: 'timed' }), 'conflict', 'name')
    expect(e.status).toBe(409)
    expect(e.message).toBe('An exercise with this name already exists')
  })

  it('rejects a blank name', () => {
    const e = expectServiceError(() => createExercise(t.db, { name: ' ', kind: 'timed' }), 'validation', 'name')
    expect(e.status).toBe(400)
  })
})

describe('withUniqueName', () => {
  it('turns a unique-index violation from a lost race into a conflict', () => {
    const e = expectServiceError(() => withUniqueName(() => {
      throw Object.assign(new Error('UNIQUE constraint failed'), { code: 'SQLITE_CONSTRAINT_UNIQUE' })
    }), 'conflict', 'name')
    expect(e.message).toBe('An exercise with this name already exists')
  })

  it('rethrows other errors and returns results', () => {
    expect(() => withUniqueName(() => {
      throw new Error('disk full')
    })).toThrow('disk full')
    expect(withUniqueName(() => 42)).toBe(42)
  })
})

describe('listExercises', () => {
  it('sorts alphabetically regardless of case', () => {
    createExercise(t.db, { name: 'squat', kind: 'weight_reps' })
    createExercise(t.db, { name: 'Bench press', kind: 'weight_reps' })
    createExercise(t.db, { name: 'plank', kind: 'timed' })
    expect(listExercises(t.db).map(e => e.name)).toEqual(['Bench press', 'plank', 'squat'])
  })

  it('reports which exercises have been used', () => {
    const used = createExercise(t.db, { name: 'Pull-up', kind: 'bodyweight' })
    createExercise(t.db, { name: 'Rowing', kind: 'cardio' })
    insertRawUsage(t.db, used.id)
    expect(listExercises(t.db).map(e => [e.name, e.used])).toEqual([['Pull-up', true], ['Rowing', false]])
  })
})

describe('getExercise', () => {
  it('throws not found for an unknown id', () => {
    expect(expectServiceError(() => getExercise(t.db, 999), 'not_found').status).toBe(404)
  })
})

describe('updateExercise', () => {
  it('renames while keeping history', () => {
    const ex = createExercise(t.db, { name: 'Bench', kind: 'weight_reps' })
    insertRawUsage(t.db, ex.id)
    const renamed = updateExercise(t.db, ex.id, { name: 'Bench press' })
    expect(renamed).toMatchObject({ id: ex.id, name: 'Bench press', used: true })
  })

  it('allows changing the letter case of its own name', () => {
    const ex = createExercise(t.db, { name: 'plank', kind: 'timed' })
    expect(updateExercise(t.db, ex.id, { name: 'Plank' }).name).toBe('Plank')
  })

  it('rejects renaming to another exercise name', () => {
    createExercise(t.db, { name: 'Squat', kind: 'weight_reps' })
    const ex = createExercise(t.db, { name: 'Lunge', kind: 'weight_reps' })
    expectServiceError(() => updateExercise(t.db, ex.id, { name: 'SQUAT' }), 'conflict', 'name')
  })

  it('changes the kind of an unused exercise', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'weight_reps' })
    expect(updateExercise(t.db, ex.id, { kind: 'timed' }).kind).toBe('timed')
  })

  it('rejects changing the kind of a used exercise', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'timed' })
    insertRawUsage(t.db, ex.id)
    const e = expectServiceError(() => updateExercise(t.db, ex.id, { kind: 'cardio' }), 'conflict', 'kind')
    expect(e.message).toMatch(/cannot change/)
    expect(getExercise(t.db, ex.id).kind).toBe('timed')
  })

  it('accepts the same kind for a used exercise', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'timed' })
    insertRawUsage(t.db, ex.id)
    expect(updateExercise(t.db, ex.id, { kind: 'timed', name: 'Front plank' })).toMatchObject({ kind: 'timed', name: 'Front plank' })
  })

  it('validates input and existence', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'timed' })
    expectServiceError(() => updateExercise(t.db, ex.id, {}), 'validation')
    expectServiceError(() => updateExercise(t.db, 999, { name: 'X' }), 'not_found')
  })
})

describe('video link', () => {
  it('is stored on create and can be changed and removed', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'timed', videoUrl: 'https://example.com/videos/plank' })
    expect(ex.videoUrl).toBe('https://example.com/videos/plank')
    expect(updateExercise(t.db, ex.id, { videoUrl: 'https://example.com/videos/abc' }).videoUrl).toBe('https://example.com/videos/abc')
    expect(updateExercise(t.db, ex.id, { videoUrl: '' }).videoUrl).toBeNull()
  })

  it('defaults to none and keeps the video when only the name changes', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'timed' })
    expect(ex.videoUrl).toBeNull()
    updateExercise(t.db, ex.id, { videoUrl: 'https://example.com/videos/abc' })
    expect(updateExercise(t.db, ex.id, { name: 'Front plank' }).videoUrl).toBe('https://example.com/videos/abc')
  })

  it('rejects an unsafe link', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'timed' })
    expectServiceError(() => updateExercise(t.db, ex.id, { videoUrl: 'javascript:alert(1)' }), 'validation', 'videoUrl')
  })
})

describe('kind of a planned exercise', () => {
  it('can change while the exercise is only in a draft, and the draft stays editable', () => {
    const ex = createExercise(t.db, { name: 'Lateral raise', kind: 'bodyweight' })
    const draft = createWorkout(t.db, { date: '2026-11-20', sessionType: 'solo', status: 'draft', exercises: [{ exerciseId: ex.id, sets: [{ reps: 12 }] }] })
    expect(getExercise(t.db, ex.id).used).toBe(false)

    expect(updateExercise(t.db, ex.id, { kind: 'weight_reps' }).kind).toBe('weight_reps')
    const edited = replaceWorkout(t.db, draft.id, { date: '2026-11-20', sessionType: 'solo', exercises: [{ exerciseId: ex.id, sets: [{ weightKg: 5, reps: 12 }] }] })
    expect(edited.exercises[0]).toMatchObject({ kind: 'weight_reps', sets: [{ weightKg: 5, reps: 12 }] })
  })

  it('is fixed once a done workout contains the exercise', () => {
    const ex = createExercise(t.db, { name: 'Plank', kind: 'timed' })
    createWorkout(t.db, { date: '2026-11-01', sessionType: 'solo', exercises: [{ exerciseId: ex.id, sets: [{ durationS: 45 }] }] })
    expect(getExercise(t.db, ex.id).used).toBe(true)
    expectServiceError(() => updateExercise(t.db, ex.id, { kind: 'cardio' }), 'conflict', 'kind')
  })
})

describe('lastDoneOn', () => {
  it('is the latest done workout date and ignores drafts', () => {
    const plank = createExercise(t.db, { name: 'Plank', kind: 'timed' })
    const never = createExercise(t.db, { name: 'Row', kind: 'cardio' })
    const entry = { exerciseId: plank.id, sets: [{ durationS: 45 }] }
    createWorkout(t.db, { date: '2026-11-01', sessionType: 'solo', exercises: [entry] })
    createWorkout(t.db, { date: '2026-11-08', sessionType: 'solo', exercises: [entry] })
    createWorkout(t.db, { date: '2026-11-20', sessionType: 'solo', status: 'draft', exercises: [entry] })

    expect(getExercise(t.db, plank.id).lastDoneOn).toBe('2026-11-08')
    expect(listExercises(t.db).map(e => [e.name, e.lastDoneOn])).toEqual([['Plank', '2026-11-08'], ['Row', null]])
    expect(getExercise(t.db, never.id).lastDoneOn).toBeNull()
  })
})
