import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sets, workoutExercises } from '../../server/db/schema'
import { ServiceError } from '../../server/lib/errors'
import { createExercise } from '../../server/services/exercises'
import { createWorkout, deleteWorkout, getLastTime, getWorkout, listWorkouts, replaceWorkout } from '../../server/services/workouts'
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
      exercises: [
        {
          exerciseId: bench,
          name: 'Bench press',
          kind: 'weight_reps',
          sets: [
            { weightKg: 50, reps: 8, durationS: null, distanceM: null },
            { weightKg: 50, reps: 8, durationS: null, distanceM: null },
          ],
        },
        { exerciseId: plank, name: 'Plank', kind: 'timed', sets: [{ weightKg: null, reps: null, durationS: 45, distanceM: null }] },
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
      { id: d.id, date: '2026-11-12', sessionType: 'solo', exerciseCount: 1 },
      { id: b.id, date: '2026-11-12', sessionType: 'trainer', exerciseCount: 2 },
      { id: c.id, date: '2026-11-05', sessionType: 'solo', exerciseCount: 1 },
      { id: a.id, date: '2026-11-01', sessionType: 'solo', exerciseCount: 1 },
    ])
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

  it('validates the date and the exercise', () => {
    expect(errorCode(() => getLastTime(t.db, bench, '2026-13-01'))).toBe('validation')
    expect(errorCode(() => getLastTime(t.db, 999))).toBe('not_found')
  })
})
