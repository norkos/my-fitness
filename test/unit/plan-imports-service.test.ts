import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { exercises, workouts } from '../../server/db/schema'
import { ServiceError } from '../../server/lib/errors'
import { createExercise, getExercise, listExercises } from '../../server/services/exercises'
import { importPlan } from '../../server/services/plan-imports'
import { createTempDb, type TempDb } from './helpers/db'

let t: TempDb

beforeEach(() => {
  t = createTempDb()
})

afterEach(() => {
  t.dispose()
})

function failure(fn: () => unknown): ServiceError {
  try {
    fn()
  }
  catch (error) {
    if (error instanceof ServiceError) return error
    throw error
  }
  throw new Error('expected a ServiceError')
}

const press = (sets = 3) => Array.from({ length: sets }, () => ({ weightKg: 12.5, reps: 12 }))

describe('importPlan', () => {
  it('creates new exercises, fills missing videos and creates a draft in row order', () => {
    const plank = createExercise(t.db, { name: 'Plank', kind: 'timed' }).id
    const draft = importPlan(t.db, {
      date: '2026-11-18',
      sessionType: 'trainer',
      rows: [
        { newExercise: { name: 'Dumbbell bench press', kind: 'weight_reps' }, videoUrl: 'https://example.com/videos/dumbbell-press', sets: press() },
        { exerciseId: plank, videoUrl: 'https://example.com/videos/plank', sets: [{ durationS: 45 }, { durationS: 45 }, { durationS: 45 }] },
        { newExercise: { name: 'Lateral raise', kind: 'bodyweight' }, sets: [{ reps: 12 }] },
      ],
    })

    expect(draft).toMatchObject({ date: '2026-11-18', sessionType: 'trainer', status: 'draft' })
    expect(draft.exercises.map(e => [e.name, e.kind, e.videoUrl, e.sets.length])).toEqual([
      ['Dumbbell bench press', 'weight_reps', 'https://example.com/videos/dumbbell-press', 3],
      ['Plank', 'timed', 'https://example.com/videos/plank', 3],
      ['Lateral raise', 'bodyweight', null, 1],
    ])
    expect(draft.exercises[0]!.sets[0]).toEqual({ weightKg: 12.5, reps: 12, durationS: null, distanceM: null, completed: false })
    expect(listExercises(t.db)).toHaveLength(3)
  })

  it('keeps an existing video link', () => {
    const plank = createExercise(t.db, { name: 'Plank', kind: 'timed', videoUrl: 'https://example.com/videos/mine' }).id
    importPlan(t.db, { date: '2026-11-18', sessionType: 'solo', rows: [{ exerciseId: plank, videoUrl: 'https://example.com/videos/trainer', sets: [{ durationS: 45 }] }] })
    expect(getExercise(t.db, plank).videoUrl).toBe('https://example.com/videos/mine')
  })

  it('allows planned sets with missing values', () => {
    const draft = importPlan(t.db, {
      date: '2026-11-18',
      sessionType: 'solo',
      rows: [{ newExercise: { name: 'Flyes', kind: 'weight_reps' }, sets: [{ reps: 16 }] }],
    })
    expect(draft.exercises[0]!.sets[0]!.weightKg).toBeNull()
  })

  it('creates nothing when a new name already exists', () => {
    createExercise(t.db, { name: 'Plank', kind: 'timed' })
    const error = failure(() => importPlan(t.db, {
      date: '2026-11-18',
      sessionType: 'solo',
      rows: [
        { newExercise: { name: 'Squat', kind: 'weight_reps' }, sets: press() },
        { newExercise: { name: ' plank ', kind: 'timed' }, sets: [{ durationS: 45 }] },
      ],
    }))
    expect(error.code).toBe('conflict')
    expect(error.fieldErrors).toEqual({ 'rows.1.newExercise.name': 'An exercise with this name already exists' })
    expect(t.db.select().from(exercises).all()).toHaveLength(1)
    expect(t.db.select().from(workouts).all()).toHaveLength(0)
  })

  it('creates nothing when the draft is invalid, and reports errors by row', () => {
    const id = createExercise(t.db, { name: 'Plank', kind: 'timed' }).id
    const error = failure(() => importPlan(t.db, {
      date: '2026-11-18',
      sessionType: 'solo',
      rows: [
        { newExercise: { name: 'Squat', kind: 'weight_reps' }, videoUrl: 'https://example.com/videos/p', sets: press() },
        { exerciseId: id, videoUrl: 'https://example.com/videos/d', sets: [{ durationS: -1 }] },
      ],
    }))
    expect(error.code).toBe('validation')
    expect(error.fieldErrors).toEqual({ 'rows.1.sets.0.durationS': 'Duration cannot be negative' })
    expect(listExercises(t.db).map(e => [e.name, e.videoUrl])).toEqual([['Plank', null]])
  })

  it('validates the review payload', () => {
    expect(failure(() => importPlan(t.db, { date: '2026-11-18', sessionType: 'solo', rows: [] })).fieldErrors).toEqual({ rows: 'The plan has no exercises' })
    const both = failure(() => importPlan(t.db, { date: '2026-11-18', sessionType: 'solo', rows: [{ exerciseId: 1, newExercise: { name: 'X', kind: 'timed' }, sets: [] }] }))
    expect(both.fieldErrors).toEqual({ 'rows.0.exerciseId': 'Choose an existing exercise or create a new one' })
    const unknown = failure(() => importPlan(t.db, { date: '2026-11-18', sessionType: 'solo', rows: [{ exerciseId: 99, sets: [{ durationS: 1 }] }] }))
    expect(unknown.fieldErrors).toEqual({ 'rows.0.exerciseId': 'This exercise does not exist' })
    const unsafe = failure(() => importPlan(t.db, { date: '2026-11-18', sessionType: 'solo', rows: [{ newExercise: { name: 'X', kind: 'timed' }, videoUrl: 'javascript:alert(1)', sets: [{ durationS: 1 }] }] }))
    expect(unsafe.fieldErrors).toEqual({ 'rows.0.videoUrl': 'Enter an https:// link' })
    expect(failure(() => importPlan(t.db, undefined)).code).toBe('validation')
  })

  it('links two rows to the same exercise only once', () => {
    const id = createExercise(t.db, { name: 'Plank', kind: 'timed' }).id
    const error = failure(() => importPlan(t.db, {
      date: '2026-11-18',
      sessionType: 'solo',
      rows: [{ exerciseId: id, sets: [{ durationS: 45 }] }, { exerciseId: id, sets: [{ durationS: 30 }] }],
    }))
    expect(error.fieldErrors['rows.1.exerciseId']).toMatch(/already in the workout/)
    expect(t.db.select().from(workouts).all()).toHaveLength(0)
  })
})
