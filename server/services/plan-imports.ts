import { and, eq, isNull } from 'drizzle-orm'
import { confirmedImportSchema } from '../../shared/plan-import'
import type { FieldErrors } from '../../shared/validation'
import type { WorkoutDetail } from '../../shared/workouts'
import type { Db } from '../db/client'
import { exercises } from '../db/schema'
import { parseInput, ServiceError } from '../lib/errors'
import { createExercise } from './exercises'
import { createWorkout } from './workouts'

/** Prefixes field errors from a nested service call so they point at the review row they came from. */
function rethrowWithPrefix(error: unknown, rename: (key: string) => string): never {
  if (error instanceof ServiceError) {
    const fieldErrors: FieldErrors = {}
    for (const [key, message] of Object.entries(error.fieldErrors)) fieldErrors[rename(key)] = message
    throw new ServiceError(error.code, error.message, fieldErrors)
  }
  throw error
}

/**
 * Saves a confirmed plan import in one transaction: creates the new exercises, stores imported video links
 * on exercises that have none, and creates the draft workout. Any failure leaves the database unchanged.
 */
export function importPlan(db: Db, input: unknown): WorkoutDetail {
  const data = parseInput(confirmedImportSchema, input)

  return db.transaction((tx) => {
    const exerciseIds = data.rows.map((row, i) => {
      if (row.exerciseId !== undefined) {
        const found = tx.select({ id: exercises.id }).from(exercises).where(eq(exercises.id, row.exerciseId)).get()
        if (!found) {
          const message = 'This exercise does not exist'
          throw new ServiceError('validation', message, { [`rows.${i}.exerciseId`]: message })
        }
        return found.id
      }
      try {
        return createExercise(tx, row.newExercise).id
      }
      catch (error) {
        rethrowWithPrefix(error, key => `rows.${i}.newExercise.${key}`)
      }
    })

    data.rows.forEach((row, i) => {
      if (!row.videoUrl) return
      tx.update(exercises)
        .set({ videoUrl: row.videoUrl })
        .where(and(eq(exercises.id, exerciseIds[i]!), isNull(exercises.videoUrl)))
        .run()
    })

    try {
      return createWorkout(tx, {
        date: data.date,
        sessionType: data.sessionType,
        status: 'draft',
        exercises: data.rows.map((row, i) => ({ exerciseId: exerciseIds[i], sets: row.sets })),
      })
    }
    catch (error) {
      rethrowWithPrefix(error, key => key.replace(/^exercises\./, 'rows.'))
    }
  })
}
