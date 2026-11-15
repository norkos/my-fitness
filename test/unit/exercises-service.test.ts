import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ServiceError } from '../../server/lib/errors'
import { createExercise, getExercise, listExercises, updateExercise } from '../../server/services/exercises'
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
