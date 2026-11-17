import { and, asc, eq } from 'drizzle-orm'
import { computeProgress, type ExerciseProgress, type ProgressPoint } from '../../shared/progress'
import type { Db } from '../db/client'
import { sets, workoutExercises, workouts } from '../db/schema'
import { getExercise } from './exercises'

/** Every done workout containing the exercise, oldest first, with its sets and progress value. Drafts are excluded. */
export function getExerciseProgress(db: Db, exerciseId: number): ExerciseProgress {
  const exercise = getExercise(db, exerciseId)

  const rows = db
    .select({
      weId: workoutExercises.id,
      workoutId: workouts.id,
      date: workouts.date,
      sessionType: workouts.sessionType,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationS: sets.durationS,
      distanceM: sets.distanceM,
    })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .innerJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(and(eq(workoutExercises.exerciseId, exerciseId), eq(workouts.status, 'done')))
    .orderBy(asc(workouts.date), asc(workouts.id), asc(sets.position))
    .all()

  const byEntry = new Map<number, Omit<ProgressPoint, 'progress'>>()
  for (const row of rows) {
    let point = byEntry.get(row.weId)
    if (!point) {
      point = { workoutId: row.workoutId, date: row.date, sessionType: row.sessionType, sets: [] }
      byEntry.set(row.weId, point)
    }
    point.sets.push({ weightKg: row.weightKg, reps: row.reps, durationS: row.durationS, distanceM: row.distanceM })
  }

  return {
    exercise: { id: exercise.id, name: exercise.name, kind: exercise.kind },
    points: [...byEntry.values()].map(p => ({ ...p, progress: computeProgress(exercise.kind, p.sets) })),
  }
}
