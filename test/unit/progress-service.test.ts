import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ServiceError } from '../../server/lib/errors'
import { createExercise } from '../../server/services/exercises'
import { getExerciseProgress } from '../../server/services/progress'
import { createWorkout, deleteWorkout, replaceWorkout } from '../../server/services/workouts'
import { createTempDb, type TempDb } from './helpers/db'

let t: TempDb
let bench: number
let plank: number

beforeEach(() => {
  t = createTempDb()
  bench = createExercise(t.db, { name: 'Bench press', kind: 'weight_reps' }).id
  plank = createExercise(t.db, { name: 'Plank', kind: 'timed' }).id
})

afterEach(() => {
  t.dispose()
})

const benchWorkout = (date: string, sets: Array<[number, number]>, sessionType = 'solo') => ({
  date,
  sessionType,
  exercises: [
    { exerciseId: bench, sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })) },
    { exerciseId: plank, sets: [{ durationS: 30 }] },
  ],
})

describe('getExerciseProgress', () => {
  it('returns an empty history for an unlogged exercise', () => {
    expect(getExerciseProgress(t.db, bench)).toEqual({ exercise: { id: bench, name: 'Bench press', kind: 'weight_reps' }, points: [] })
  })

  it('returns one point per workout in date order with sets and session type', () => {
    createWorkout(t.db, benchWorkout('2026-11-12', [[55, 5], [55, 6]], 'trainer'))
    createWorkout(t.db, benchWorkout('2026-11-01', [[45, 8]]))
    createWorkout(t.db, benchWorkout('2026-11-05', [[50, 8], [50, 6]]))

    const { points } = getExerciseProgress(t.db, bench)
    expect(points.map(p => [p.date, p.sessionType, p.progress])).toEqual([
      ['2026-11-01', 'solo', { value: 45, reps: 8 }],
      ['2026-11-05', 'solo', { value: 50, reps: 8 }],
      ['2026-11-12', 'trainer', { value: 55, reps: 6 }],
    ])
    expect(points[2]!.sets.map(s => [s.weightKg, s.reps])).toEqual([[55, 5], [55, 6]])
  })

  it('excludes drafts from the chart and the history', () => {
    createWorkout(t.db, benchWorkout('2026-11-01', [[45, 8]]))
    createWorkout(t.db, benchWorkout('2026-11-05', [[50, 8]]))
    createWorkout(t.db, { ...benchWorkout('2026-11-09', [[60, 8]]), status: 'draft' })
    expect(getExerciseProgress(t.db, bench).points.map(p => p.date)).toEqual(['2026-11-01', '2026-11-05'])
  })

  it('shows no history for an exercise that is only planned', () => {
    createWorkout(t.db, { ...benchWorkout('2026-11-09', [[60, 8]]), status: 'draft' })
    expect(getExerciseProgress(t.db, bench).points).toEqual([])
  })

  it('reflects edits and deletions', () => {
    const typo = createWorkout(t.db, benchWorkout('2026-11-01', [[500, 8]]))
    const other = createWorkout(t.db, benchWorkout('2026-11-05', [[50, 8]]))
    replaceWorkout(t.db, typo.id, benchWorkout('2026-11-01', [[45, 8]]))
    expect(getExerciseProgress(t.db, bench).points.map(p => p.progress.value)).toEqual([45, 50])

    deleteWorkout(t.db, other.id)
    expect(getExerciseProgress(t.db, bench).points.map(p => p.date)).toEqual(['2026-11-01'])
  })

  it('throws not found for an unknown exercise', () => {
    expect(() => getExerciseProgress(t.db, 999)).toThrow(ServiceError)
  })
})
