import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { createExerciseSchema, exerciseNameKey, updateExerciseSchema, type Exercise } from '../../shared/exercises'
import type { Db } from '../db/client'
import { exercises, workoutExercises, workouts } from '../db/schema'
import { parseInput, ServiceError } from '../lib/errors'

const DUPLICATE_MESSAGE = 'An exercise with this name already exists'
// Columns are written out with table names: Drizzle renders bare column names inside subqueries.
// Only done workouts count: planned sets are not logged history, so they don't fix the kind.
const usedExpr = sql<number>`exists (select 1 from ${workoutExercises} we join ${workouts} w on w.id = we.workout_id where we.exercise_id = "exercises"."id" and w.status = 'done')`
const lastDoneExpr = sql<string | null>`(select max(w.date) from ${workoutExercises} we join ${workouts} w on w.id = we.workout_id where we.exercise_id = "exercises"."id" and w.status = 'done')`

const columns = {
  id: exercises.id,
  name: exercises.name,
  kind: exercises.kind,
  videoUrl: exercises.videoUrl,
  used: usedExpr,
  lastDoneOn: lastDoneExpr,
}

interface ExerciseRow {
  id: number
  name: string
  kind: Exercise['kind']
  videoUrl: string | null
  used: number | boolean
  lastDoneOn: string | null
}

function toExercise(row: ExerciseRow): Exercise {
  return { id: row.id, name: row.name, kind: row.kind, videoUrl: row.videoUrl, used: Boolean(row.used), lastDoneOn: row.lastDoneOn ?? null }
}

export function listExercises(db: Db): Exercise[] {
  return db
    .select(columns)
    .from(exercises)
    .orderBy(asc(exercises.nameKey), asc(exercises.id))
    .all()
    .map(toExercise)
}

export function getExercise(db: Db, id: number): Exercise {
  const row = db
    .select(columns)
    .from(exercises)
    .where(eq(exercises.id, id))
    .get()
  if (!row) throw new ServiceError('not_found', 'Exercise not found')
  return toExercise(row)
}

function duplicateName(): ServiceError {
  return new ServiceError('conflict', DUPLICATE_MESSAGE, { name: DUPLICATE_MESSAGE })
}

/** Runs a write, turning a lost race on the unique name index into the same conflict as the pre-check. */
export function withUniqueName<T>(write: () => T): T {
  try {
    return write()
  }
  catch (error) {
    if ((error as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') throw duplicateName()
    throw error
  }
}

function assertNameFree(db: Db, nameKey: string, exceptId?: number) {
  const clash = db
    .select({ id: exercises.id })
    .from(exercises)
    .where(exceptId === undefined ? eq(exercises.nameKey, nameKey) : and(eq(exercises.nameKey, nameKey), ne(exercises.id, exceptId)))
    .get()
  if (clash) throw duplicateName()
}

export function createExercise(db: Db, input: unknown): Exercise {
  const data = parseInput(createExerciseSchema, input)
  const nameKey = exerciseNameKey(data.name)
  assertNameFree(db, nameKey)
  const row = withUniqueName(() => db
    .insert(exercises)
    .values({ name: data.name, nameKey, kind: data.kind, videoUrl: data.videoUrl ?? null, createdAt: new Date() })
    .returning({ id: exercises.id })
    .get())
  return getExercise(db, row.id)
}

export function updateExercise(db: Db, id: number, input: unknown): Exercise {
  const data = parseInput(updateExerciseSchema, input)
  const current = getExercise(db, id)
  const changes: Partial<typeof exercises.$inferInsert> = {}

  if (data.name !== undefined) {
    const nameKey = exerciseNameKey(data.name)
    assertNameFree(db, nameKey, id)
    changes.name = data.name
    changes.nameKey = nameKey
  }

  if (data.kind !== undefined && data.kind !== current.kind) {
    if (current.used) {
      const message = 'The kind cannot change once the exercise has logged sets'
      throw new ServiceError('conflict', message, { kind: message })
    }
    changes.kind = data.kind
  }

  if (data.videoUrl !== undefined) changes.videoUrl = data.videoUrl

  if (Object.keys(changes).length) {
    withUniqueName(() => db.update(exercises).set(changes).where(eq(exercises.id, id)).run())
  }
  return getExercise(db, id)
}
