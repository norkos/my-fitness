import { and, asc, desc, eq, lt, sql } from 'drizzle-orm'
import type { ExerciseKind, WorkoutStatus } from '../../shared/kinds'
import {
  isValidIsoDate,
  validateWorkout,
  workoutStatusSchema,
  type LastTime,
  type SetValues,
  type WorkoutDetail,
  type WorkoutInput,
  type WorkoutSet,
  type WorkoutSummary,
} from '../../shared/workouts'
import type { Db } from '../db/client'
import { exercises, sets, workoutExercises, workouts } from '../db/schema'
import { ServiceError } from '../lib/errors'

function notFound(): ServiceError {
  return new ServiceError('not_found', 'Workout not found')
}

function parseWorkout(db: Db, input: unknown, mode: WorkoutStatus): WorkoutInput {
  const kinds = new Map<number, ExerciseKind>(
    db.select({ id: exercises.id, kind: exercises.kind }).from(exercises).all().map(r => [r.id, r.kind]),
  )
  const result = validateWorkout(input, id => kinds.get(id), { mode })
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

function toWorkoutSet(row: WorkoutSet): WorkoutSet {
  return { ...toSetValues(row), completed: row.completed }
}

/** Reads an optional status field (`status`, `expectedStatus`); anything other than draft or done is a validation error. */
function parseStatusField(input: unknown, key: 'status' | 'expectedStatus'): WorkoutStatus | undefined {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>)[key] : undefined
  if (raw === undefined) return undefined
  const result = workoutStatusSchema.safeParse(raw)
  if (!result.success) {
    const message = 'Choose draft or done'
    throw new ServiceError('validation', message, { [key]: message })
  }
  return result.data
}

const isDone = eq(workouts.status, 'done')

/** Creates a workout; `status: 'draft'` stores a planned workout whose sets start not completed. */
export function createWorkout(db: Db, input: unknown): WorkoutDetail {
  const status = parseStatusField(input, 'status') ?? 'done'
  const data = parseWorkout(db, input, status)
  const id = db.transaction((tx) => {
    const now = new Date()
    const row = tx
      .insert(workouts)
      .values({ date: data.date, sessionType: data.sessionType, status, createdAt: now, updatedAt: now })
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
      status: workouts.status,
      exerciseCount: sql<number>`(select count(*) from ${workoutExercises} we where we.workout_id = "workouts"."id")`,
      setCount: sql<number>`(select count(*) from ${sets} s join ${workoutExercises} we on we.id = s.workout_exercise_id where we.workout_id = "workouts"."id")`,
      exerciseNames: sql<string[]>`coalesce((select json_group_array(e.name order by we.position) from ${workoutExercises} we join ${exercises} e on e.id = we.exercise_id where we.workout_id = "workouts"."id"), '[]')`
        .mapWith((value: string) => JSON.parse(value) as string[]),
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
      videoUrl: exercises.videoUrl,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationS: sets.durationS,
      distanceM: sets.distanceM,
      completed: sets.completed,
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
      entry = { exerciseId: row.exerciseId, name: row.name, kind: row.kind, videoUrl: row.videoUrl, sets: [] }
      entries.set(row.weId, entry)
    }
    entry.sets.push(toWorkoutSet(row))
  }

  return {
    id: workout.id,
    date: workout.date,
    sessionType: workout.sessionType,
    status: workout.status,
    exercises: [...entries.values()],
  }
}

function getStatus(db: Db, id: number): WorkoutStatus {
  const row = db.select({ status: workouts.status }).from(workouts).where(eq(workouts.id, id)).get()
  if (!row) throw notFound()
  return row.status
}

/**
 * Replaces the workout's date, session type, exercises and sets in one transaction.
 * The status is kept and decides how strictly the input is validated; it changes only through finishing.
 * With `expectedStatus`, the replace is refused when the workout's status differs, so a late save meant for a
 * draft (gym mode, another tab) cannot overwrite a workout that was finished meanwhile.
 */
export function replaceWorkout(db: Db, id: number, input: unknown): WorkoutDetail {
  const expected = parseStatusField(input, 'expectedStatus')
  const stored = getStatus(db, id)
  if (expected && expected !== stored) {
    throw new ServiceError('conflict', stored === 'done' ? 'This workout has already been finished' : 'This workout is still planned')
  }
  const data = parseWorkout(db, input, stored)
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

/**
 * Turns a draft into a done workout, keeping only completed sets and exercises with at least one of them.
 * The result must pass done-workout validation; field errors refer to positions in the draft.
 */
export function finishWorkout(db: Db, id: number): WorkoutDetail {
  const draft = getWorkout(db, id)
  if (draft.status !== 'draft') {
    throw new ServiceError('conflict', 'Only a planned workout can be finished')
  }

  const fieldErrors: Record<string, string> = {}
  const kept: WorkoutInput['exercises'] = []
  draft.exercises.forEach((entry, i) => {
    const doneSets = entry.sets.flatMap((set, j) => (set.completed ? [{ set, j }] : []))
    if (!doneSets.length) return
    const result = validateWorkout(
      { date: draft.date, sessionType: draft.sessionType, exercises: [{ exerciseId: entry.exerciseId, sets: doneSets.map(d => toSetValues(d.set)) }] },
      () => entry.kind,
    )
    if (!result.success) {
      // Map "exercises.0.sets.<k>.<field>" back to the set's position in the draft.
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        const match = /^exercises\.0\.sets\.(\d+)\.(.+)$/.exec(key)
        const target = match ? `exercises.${i}.sets.${doneSets[Number(match[1])]!.j}.${match[2]}` : `exercises.${i}`
        fieldErrors[target] ??= message
      }
      return
    }
    kept.push(result.data.exercises[0]!)
  })

  if (Object.keys(fieldErrors).length) {
    throw new ServiceError('validation', 'Please fix the highlighted fields', fieldErrors)
  }
  if (!kept.length) {
    const message = 'Mark at least one set as done before finishing'
    throw new ServiceError('validation', message, { _: message })
  }

  db.transaction((tx) => {
    tx.update(workouts).set({ status: 'done', updatedAt: new Date() }).where(eq(workouts.id, id)).run()
    tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, id)).run()
    insertEntries(tx, id, kept)
  })
  return getWorkout(db, id)
}

export function deleteWorkout(db: Db, id: number): void {
  const deleted = db.delete(workouts).where(eq(workouts.id, id)).returning({ id: workouts.id }).all()
  if (!deleted.length) throw notFound()
}

/**
 * Sets for the exercise from the most recent done workout dated strictly before `before`
 * (or the most recent done workout overall when `before` is omitted). Drafts are never used.
 */
export function getLastTime(db: Db, exerciseId: number, before?: string): LastTime {
  if (before !== undefined && !isValidIsoDate(before)) {
    throw new ServiceError('validation', 'Enter a valid date', { before: 'Enter a valid date' })
  }
  const exists = db.select({ id: exercises.id }).from(exercises).where(eq(exercises.id, exerciseId)).get()
  if (!exists) throw new ServiceError('not_found', 'Exercise not found')

  const conditions = [eq(workoutExercises.exerciseId, exerciseId), isDone]
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
