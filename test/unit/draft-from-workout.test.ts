import { describe, expect, it } from 'vitest'
import { draftFromWorkout, type WorkoutDetail } from '../../shared/workouts'

const set = (values: Partial<{ weightKg: number, reps: number, durationS: number, distanceM: number }>) => ({
  weightKg: null, reps: null, durationS: null, distanceM: null, completed: true, ...values,
})

function source(): WorkoutDetail {
  return {
    id: 7,
    date: '2026-11-10',
    sessionType: 'trainer',
    status: 'done',
    exercises: [
      { exerciseId: 3, name: 'Bench press', kind: 'weight_reps', videoUrl: 'https://example.com/bench', sets: [set({ weightKg: 50, reps: 8 }), set({ weightKg: 50, reps: 6 })] },
      { exerciseId: 1, name: 'Plank', kind: 'timed', videoUrl: null, sets: [set({ durationS: 45 })] },
      { exerciseId: 2, name: 'Rowing machine', kind: 'cardio', videoUrl: null, sets: [set({ durationS: 600, distanceM: 2000 })] },
    ],
  }
}

describe('draftFromWorkout', () => {
  it('keeps the session type and the exercise order', () => {
    const seed = draftFromWorkout(source())
    expect(seed.sessionType).toBe('trainer')
    expect(seed.exercises.map(e => e.name)).toEqual(['Bench press', 'Plank', 'Rowing machine'])
  })

  it('copies set values for every kind with nothing marked done', () => {
    const seed = draftFromWorkout(source())
    expect(seed.exercises[0]!.sets).toEqual([
      { weightKg: 50, reps: 8, durationS: null, distanceM: null, completed: false },
      { weightKg: 50, reps: 6, durationS: null, distanceM: null, completed: false },
    ])
    expect(seed.exercises[1]!.sets).toEqual([{ weightKg: null, reps: null, durationS: 45, distanceM: null, completed: false }])
    expect(seed.exercises[2]!.sets).toEqual([{ weightKg: null, reps: null, durationS: 600, distanceM: 2000, completed: false }])
  })

  it('carries no identity, date or status of the source', () => {
    expect(Object.keys(draftFromWorkout(source())).sort()).toEqual(['exercises', 'sessionType'])
  })

  it('does not modify the source workout', () => {
    const original = source()
    const seed = draftFromWorkout(original)
    seed.exercises[0]!.sets[0]!.weightKg = 52.5
    seed.exercises.pop()
    expect(original).toEqual(source())
  })
})
