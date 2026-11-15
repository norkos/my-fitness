import type { Db } from '../../../server/db/client'
import { sets, workoutExercises, workouts } from '../../../server/db/schema'

/** Inserts a minimal workout using the exercise directly, bypassing services. */
export function insertRawUsage(db: Db, exerciseId: number, date = '2026-11-01') {
  const now = new Date()
  const workout = db.insert(workouts).values({ date, sessionType: 'solo', createdAt: now, updatedAt: now }).returning().get()
  const we = db.insert(workoutExercises).values({ workoutId: workout.id, exerciseId, position: 0 }).returning().get()
  db.insert(sets).values({ workoutExerciseId: we.id, position: 0, reps: 5 }).run()
  return workout.id
}
