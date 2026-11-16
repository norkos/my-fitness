import { and, asc, desc, eq, lt, sql } from 'drizzle-orm'
import type { ExerciseKind } from '../../shared/kinds'
import {
  isValidIsoDate,
  validateWorkout,
  type LastTime,
  type SetValues,
  type WorkoutDetail,
  type WorkoutInput,
  type WorkoutSummary,
} from '../../shared/workouts'
import type { Db } from '../db/client'
import { exercises, sets, workoutExercises, workouts } from '../db/schema'
import { ServiceError } from '../lib/errors'

function notFound(): ServiceError {
  return new ServiceError('not_found', 'Workout not found')
}

function parseWorkout(db: Db, input: unknown): WorkoutInput {
  const kinds = new Map<number, ExerciseKind>(
    db.select({ id: exercises.id, kind: exercises.kind }).from(exercises).all().map(r => [r.id, r.kind]),
  )
  const result = validateWorkout(input, id => kinds.get(id))
  if (!result.success) {
    throw new ServiceError('validation', 'Please fix the highlighted fields', result.fieldErrors)
  }
  return result.data
}

function insertEntries(db: Db, workoutId: number, entries: WorkoutInput['exercises']) {
  entries.forEach((entry, position) => {
    const we = db
      .insert(workoutExercises)
      .values({ workoutId, exerciseId: entry.exerciseId, position })
      .returning({ id: workoutExercises.id })
      .get()
    db.insert(sets)
      .values(entry.sets.map((set, setPosition) => ({ workoutExerciseId: we.id, position: setPosition, ...set })))
      .run()
  })
}

function toSetValues(row: SetValues): SetValues {
  return { weightKg: row.weightKg, reps: row.reps, durationS: row.durationS, distanceM: row.distanceM }
}

export function createWorkout(db: Db, input: unknown): WorkoutDetail {
  const data = parseWorkout(db, input)
  const id = db.transaction((tx) => {
    const now = new Date()
    const row = tx
      .insert(workouts)
      .values({ date: data.date, sessionType: data.sessionType, createdAt: now, updatedAt: now })
      .returning({ id: workouts.id })
      .get()
    insertEntries(tx, row.id, data.exercises)
    return row.id
  })
  return getWorkout(db, id)
}

export function listWorkouts(db: Db): WorkoutSummary[] {
  return db
    .select({
      id: workouts.id,
      date: workouts.date,
      sessionType: workouts.sessionType,
      exerciseCount: sql<number>`(select count(*) from ${workoutExercises} we where we.workout_id = "workouts"."id")`,
    })
    .from(workouts)
    .orderBy(desc(workouts.date), desc(workouts.id))
    .all()
}

export function getWorkout(db: Db, id: number): WorkoutDetail {
  const workout = db.select().from(workouts).where(eq(workouts.id, id)).get()
  if (!workout) throw notFound()

  const rows = db
    .select({
      weId: workoutExercises.id,
      exerciseId: exercises.id,
      name: exercises.name,
      kind: exercises.kind,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationS: sets.durationS,
      distanceM: sets.distanceM,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .innerJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(asc(workoutExercises.position), asc(sets.position))
    .all()

  const entries = new Map<number, WorkoutDetail['exercises'][number]>()
  for (const row of rows) {
    let entry = entries.get(row.weId)
    if (!entry) {
      entry = { exerciseId: row.exerciseId, name: row.name, kind: row.kind, sets: [] }
      entries.set(row.weId, entry)
    }
    entry.sets.push(toSetValues(row))
  }

  return { id: workout.id, date: workout.date, sessionType: workout.sessionType, exercises: [...entries.values()] }
}

/** Replaces the workout's date, session type, exercises and sets in one transaction. */
export function replaceWorkout(db: Db, id: number, input: unknown): WorkoutDetail {
  const data = parseWorkout(db, input)
  db.transaction((tx) => {
    const updated = tx
      .update(workouts)
      .set({ date: data.date, sessionType: data.sessionType, updatedAt: new Date() })
      .where(eq(workouts.id, id))
      .returning({ id: workouts.id })
      .all()
    if (!updated.length) throw notFound()
    tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, id)).run()
    insertEntries(tx, id, data.exercises)
  })
  return getWorkout(db, id)
}

export function deleteWorkout(db: Db, id: number): void {
  const deleted = db.delete(workouts).where(eq(workouts.id, id)).returning({ id: workouts.id }).all()
  if (!deleted.length) throw notFound()
}

/**
 * Sets for the exercise from the most recent workout dated strictly before `before`
 * (or the most recent workout overall when `before` is omitted).
 */
export function getLastTime(db: Db, exerciseId: number, before?: string): LastTime {
  if (before !== undefined && !isValidIsoDate(before)) {
    throw new ServiceError('validation', 'Enter a valid date', { before: 'Enter a valid date' })
  }
  const exists = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.id, exerciseId)).get()
  if (!exists) throw new ServiceError('not_found', 'Exercise not found')

  const conditions = [eq(workoutExercises.exerciseId, exerciseId)]
  if (before) conditions.push(lt(workouts.date, before))

  const latest = db
    .select({ weId: workoutExercises.id, date: workouts.date })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workouts.id, workoutExercises.workoutId))
    .where(and(...conditions))
    .orderBy(desc(workouts.date), desc(workouts.id))
    .limit(1)
    .get()
  if (!latest) return { date: null, sets: [] }

  const rows = db
    .select({ weightKg: sets.weightKg, reps: sets.reps, durationS: sets.durationS, distanceM: sets.distanceM })
    .from(sets)
    .where(eq(sets.workoutExerciseId, latest.weId))
    .orderBy(asc(sets.position))
    .all()
  return { date: latest.date, sets: rows.map(toSetValues) }
}
