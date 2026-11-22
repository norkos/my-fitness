import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sets, workoutExercises } from '../../server/db/schema'
import { ServiceError } from '../../server/lib/errors'
import { createExercise } from '../../server/services/exercises'
import { createWorkout, deleteWorkout, finishWorkout, getLastTime, getWorkout, listWorkouts, replaceWorkout } from '../../server/services/workouts'
import { createTempDb, type TempDb } from './helpers/db'

let t: TempDb
let bench: number
let plank: number
let pullup: number

beforeEach(() => {
  t = createTempDb()
  bench = createExercise(t.db, { name: 'Bench press', kind: 'weight_reps' }).id
  plank = createExercise(t.db, { name: 'Plank', kind: 'timed' }).id
  pullup = createExercise(t.db, { name: 'Pull-up', kind: 'bodyweight' }).id
})

afterEach(() => {
  t.dispose()
})

const benchSets = (...pairs: Array<[number, number]>) => pairs.map(([weightKg, reps]) => ({ weightKg, reps }))

function log(date: string, entries: Array<{ exerciseId: number, sets: object[] }>, sessionType = 'solo') {
  return createWorkout(t.db, { date, sessionType, exercises: entries })
}

function plan(date: string, entries: Array<{ exerciseId: number, sets: object[] }>) {
  return createWorkout(t.db, { date, sessionType: 'solo', status: 'draft', exercises: entries })
}

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn()
  }
  catch (e) {
    return e instanceof ServiceError ? e.code : 'other'
  }
  return undefined
}

describe('createWorkout / getWorkout', () => {
  it('stores exercises and sets in the entered order', () => {
    const w = log('2026-11-15', [
      { exerciseId: bench, sets: benchSets([50, 8], [50, 8]) },
      { exerciseId: plank, sets: [{ durationS: 45 }] },
    ], 'trainer')

    expect(w).toEqual({
      id: w.id,
      date: '2026-11-15',
      sessionType: 'trainer',
      status: 'done',
      exercises: [
        {
          exerciseId: bench,
          name: 'Bench press',
          kind: 'weight_reps',
          videoUrl: null,
          sets: [
            { weightKg: 50, reps: 8, durationS: null, distanceM: null, completed: true },
            { weightKg: 50, reps: 8, durationS: null, distanceM: null, completed: true },
          ],
        },
        {
          exerciseId: plank,
          name: 'Plank',
          kind: 'timed',
          videoUrl: null,
          sets: [{ weightKg: null, reps: null, durationS: 45, distanceM: null, completed: true }],
        },
      ],
    })
    expect(getWorkout(t.db, w.id)).toEqual(w)
  })

  it('rejects invalid workouts without storing anything', () => {
    expect(errorCode(() => log('2026-11-15', [{ exerciseId: bench, sets: [{ reps: 8 }] }]))).toBe('validation')
    expect(errorCode(() => log('2026-11-15', [{ exerciseId: 999, sets: [{ reps: 8 }] }]))).toBe('validation')
    expect(listWorkouts(t.db)).toEqual([])
  })

  it('throws not found for an unknown workout', () => {
    expect(errorCode(() => getWorkout(t.db, 42))).toBe('not_found')
  })
})

describe('listWorkouts', () => {
  it('lists newest first with exercise counts', () => {
    const a = log('2026-11-01', [{ exerciseId: bench, sets: benchSets([40, 8]) }])
    const b = log('2026-11-12', [{ exerciseId: bench, sets: benchSets([45, 8]) }, { exerciseId: plank, sets: [{ durationS: 30 }] }], 'trainer')
    const c = log('2026-11-05', [{ exerciseId: pullup, sets: [{ reps: 5 }] }])
    const d = log('2026-11-12', [{ exerciseId: plank, sets: [{ durationS: 40 }] }])

    expect(listWorkouts(t.db)).toEqual([
      { id: d.id, date: '2026-11-12', sessionType: 'solo', status: 'done', exerciseCount: 1, setCount: 1, exerciseNames: ['Plank'] },
      { id: b.id, date: '2026-11-12', sessionType: 'trainer', status: 'done', exerciseCount: 2, setCount: 2, exerciseNames: ['Bench press', 'Plank'] },
      { id: c.id, date: '2026-11-05', sessionType: 'solo', status: 'done', exerciseCount: 1, setCount: 1, exerciseNames: ['Pull-up'] },
      { id: a.id, date: '2026-11-01', sessionType: 'solo', status: 'done', exerciseCount: 1, setCount: 1, exerciseNames: ['Bench press'] },
    ])
  })

  it('includes drafts with their status', () => {
    const w = plan('2026-11-20', [{ exerciseId: plank, sets: [{ durationS: 45 }] }])
    expect(listWorkouts(t.db)).toEqual([{ id: w.id, date: '2026-11-20', sessionType: 'solo', status: 'draft', exerciseCount: 1, setCount: 1, exerciseNames: ['Plank'] }])
  })
})

describe('drafts', () => {
  it('stores a draft with missing values and sets not completed', () => {
    const w = plan('2026-11-20', [{ exerciseId: bench, sets: [{ reps: 12 }, { weightKg: 12.5, reps: 12 }] }])
    expect(w.status).toBe('draft')
    expect(w.exercises[0]!.sets).toEqual([
      { weightKg: null, reps: 12, durationS: null, distanceM: null, completed: false },
      { weightKg: 12.5, reps: 12, durationS: null, distanceM: null, completed: false },
    ])
  })

  it('rejects an unknown status', () => {
    expect(errorCode(() => createWorkout(t.db, { date: '2026-11-20', sessionType: 'solo', status: 'planned', exercises: [] }))).toBe('validation')
  })

  it('keeps the draft status and draft validation when replaced', () => {
    const w = plan('2026-11-20', [{ exerciseId: bench, sets: [{ reps: 12 }] }])
    const updated = replaceWorkout(t.db, w.id, {
      date: '2026-11-21',
      sessionType: 'trainer',
      status: 'done',
      exercises: [{ exerciseId: bench, sets: [{ reps: 10, completed: true }, { reps: 12 }] }],
    })
    expect(updated.status).toBe('draft')
    expect(updated.exercises[0]!.sets.map(s => [s.reps, s.completed])).toEqual([[10, true], [12, false]])
  })

  it('applies done validation when replacing a done workout', () => {
    const w = log('2026-11-15', [{ exerciseId: bench, sets: benchSets([50, 8]) }])
    expect(errorCode(() => replaceWorkout(t.db, w.id, { date: '2026-11-15', sessionType: 'solo', exercises: [{ exerciseId: bench, sets: [{ reps: 8 }] }] }))).toBe('validation')
  })
})

describe('finishWorkout', () => {
  it('keeps only completed sets and exercises with at least one', () => {
    const w = plan('2026-11-20', [
      { exerciseId: bench, sets: [{ weightKg: 12.5, reps: 10, completed: true }, { weightKg: 12.5, reps: 12 }] },
      { exerciseId: plank, sets: [{ durationS: 45 }] },
      { exerciseId: pullup, sets: [{ reps: 6, completed: true }] },
    ])
    const finished = finishWorkout(t.db, w.id)
    expect(finished.status).toBe('done')
    expect(finished.exercises.map(e => [e.name, e.sets.map(s => [s.weightKg, s.reps, s.completed])])).toEqual([
      ['Bench press', [[12.5, 10, true]]],
      ['Pull-up', [[null, 6, true]]],
    ])
    expect(listWorkouts(t.db)[0]).toMatchObject({ id: w.id, status: 'done', exerciseCount: 2 })
  })

  it('refuses when no set is completed', () => {
    const w = plan('2026-11-20', [{ exerciseId: plank, sets: [{ durationS: 45 }] }])
    let error: unknown
    try {
      finishWorkout(t.db, w.id)
    }
    catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ServiceError)
    expect((error as ServiceError).fieldErrors).toEqual({ _: 'Mark at least one set as done before finishing' })
    expect(getWorkout(t.db, w.id).status).toBe('draft')
  })

  it('reports a missing value on a completed set at its draft position', () => {
    const w = plan('2026-11-20', [
      { exerciseId: plank, sets: [{ durationS: 45, completed: true }] },
      { exerciseId: bench, sets: [{ weightKg: 20, reps: 10 }, { reps: 10, completed: true }] },
    ])
    let error: unknown
    try {
      finishWorkout(t.db, w.id)
    }
    catch (e) {
      error = e
    }
    expect((error as ServiceError).code).toBe('validation')
    expect((error as ServiceError).fieldErrors).toEqual({ 'exercises.1.sets.1.weightKg': 'Weight is required' })
    expect(getWorkout(t.db, w.id)).toEqual(w)
  })

  it('refuses a late save meant for the draft once it is finished', () => {
    const w = plan('2026-11-20', [{ exerciseId: bench, sets: [{ weightKg: 20, reps: 10, completed: true }, { weightKg: 20, reps: 10 }] }])
    const finished = finishWorkout(t.db, w.id)
    const lateSave = {
      date: '2026-11-20',
      sessionType: 'solo',
      expectedStatus: 'draft',
      exercises: [{ exerciseId: bench, sets: [{ weightKg: 20, reps: 10, completed: true }, { weightKg: 20, reps: 10 }] }],
    }
    expect(errorCode(() => replaceWorkout(t.db, w.id, lateSave))).toBe('conflict')
    expect(getWorkout(t.db, w.id)).toEqual(finished)
    expect(errorCode(() => replaceWorkout(t.db, w.id, { ...lateSave, expectedStatus: 'planned' }))).toBe('validation')
    // Editing the done workout itself still works
    expect(replaceWorkout(t.db, w.id, { ...lateSave, expectedStatus: 'done' }).exercises[0]!.sets).toHaveLength(2)
  })

  it('refuses a done workout and an unknown id', () => {
    const w = log('2026-11-15', [{ exerciseId: plank, sets: [{ durationS: 45 }] }])
    expect(errorCode(() => finishWorkout(t.db, w.id))).toBe('conflict')
    expect(errorCode(() => finishWorkout(t.db, 42))).toBe('not_found')
  })
})

describe('replaceWorkout', () => {
  it('replaces date, session type, exercises and sets', () => {
    const w = log('2026-11-15', [{ exerciseId: bench, sets: benchSets([500, 8], [50, 8]) }])
    const updated = replaceWorkout(t.db, w.id, {
      date: '2026-11-14',
      sessionType: 'trainer',
      exercises: [{ exerciseId: bench, sets: benchSets([50, 8]) }, { exerciseId: pullup, sets: [{ reps: 6 }] }],
    })
    expect(updated.date).toBe('2026-11-14')
    expect(updated.sessionType).toBe('trainer')
    expect(updated.exercises.map(e => [e.name, e.sets.length])).toEqual([['Bench press', 1], ['Pull-up', 1]])
    expect(updated.exercises[0]!.sets[0]!.weightKg).toBe(50)
    // Old rows are gone, not orphaned
    expect(t.db.select().from(workoutExercises).all()).toHaveLength(2)
    expect(t.db.select().from(sets).all()).toHaveLength(2)
  })

  it('keeps the original when the update is invalid', () => {
    const w = log('2026-11-15', [{ exerciseId: plank, sets: [{ durationS: 45 }] }])
    expect(errorCode(() => replaceWorkout(t.db, w.id, { date: '2026-11-15', sessionType: 'solo', exercises: [] }))).toBe('validation')
    expect(getWorkout(t.db, w.id)).toEqual(w)
  })

  it('throws not found for an unknown workout and leaves no rows behind', () => {
    expect(errorCode(() => replaceWorkout(t.db, 42, { date: '2026-11-15', sessionType: 'solo', exercises: [{ exerciseId: plank, sets: [{ durationS: 1 }] }] }))).toBe('not_found')
    expect(t.db.select().from(workoutExercises).all()).toHaveLength(0)
  })
})

describe('deleteWorkout', () => {
  it('removes the workout and all its sets', () => {
    const keep = log('2026-11-01', [{ exerciseId: plank, sets: [{ durationS: 30 }] }])
    const w = log('2026-11-15', [{ exerciseId: bench, sets: benchSets([50, 8], [50, 8]) }])
    deleteWorkout(t.db, w.id)
    expect(listWorkouts(t.db).map(x => x.id)).toEqual([keep.id])
    expect(t.db.select().from(sets).all()).toHaveLength(1)
  })

  it('throws not found for an unknown workout', () => {
    expect(errorCode(() => deleteWorkout(t.db, 42))).toBe('not_found')
  })
})

describe('getLastTime', () => {
  it('returns nothing for an exercise with no history', () => {
    expect(getLastTime(t.db, bench, '2026-11-15')).toEqual({ date: null, sets: [] })
  })

  it('returns the sets from the most recent earlier workout', () => {
    log('2026-11-01', [{ exerciseId: bench, sets: benchSets([45, 8]) }])
    log('2026-11-08', [{ exerciseId: bench, sets: benchSets([50, 8], [50, 6]) }])
    log('2026-11-10', [{ exerciseId: plank, sets: [{ durationS: 60 }] }])
    const last = getLastTime(t.db, bench, '2026-11-15')
    expect(last.date).toBe('2026-11-08')
    expect(last.sets.map(s => [s.weightKg, s.reps])).toEqual([[50, 8], [50, 6]])
  })

  it('ignores same-day and later workouts', () => {
    log('2026-11-05', [{ exerciseId: bench, sets: benchSets([40, 10]) }])
    log('2026-11-10', [{ exerciseId: bench, sets: benchSets([45, 10]) }])
    log('2026-11-12', [{ exerciseId: bench, sets: benchSets([50, 10]) }])
    expect(getLastTime(t.db, bench, '2026-11-10').date).toBe('2026-11-05')
  })

  it('uses the latest workout overall when no date is given', () => {
    log('2026-11-05', [{ exerciseId: bench, sets: benchSets([40, 10]) }])
    log('2026-11-12', [{ exerciseId: bench, sets: benchSets([50, 10]) }])
    expect(getLastTime(t.db, bench).date).toBe('2026-11-12')
  })

  it('ignores drafts', () => {
    log('2026-11-05', [{ exerciseId: bench, sets: benchSets([50, 8]) }])
    plan('2026-11-09', [{ exerciseId: bench, sets: benchSets([60, 8]) }])
    const last = getLastTime(t.db, bench, '2026-11-10')
    expect(last.date).toBe('2026-11-05')
    expect(last.sets.map(s => [s.weightKg, s.reps])).toEqual([[50, 8]])
  })

  it('validates the date and the exercise', () => {
    expect(errorCode(() => getLastTime(t.db, bench, '2026-13-01'))).toBe('validation')
    expect(errorCode(() => getLastTime(t.db, 999))).toBe('not_found')
  })
})
