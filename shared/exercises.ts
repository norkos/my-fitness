import { z } from 'zod'
import { EXERCISE_KINDS, type ExerciseKind } from './kinds'

export const EXERCISE_NAME_MAX = 80

export const exerciseNameSchema = z
  .string({ error: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(EXERCISE_NAME_MAX, `Name must be at most ${EXERCISE_NAME_MAX} characters`)

export const exerciseKindSchema = z.enum(EXERCISE_KINDS, { error: 'Choose a valid kind' })

export const createExerciseSchema = z.object({
  name: exerciseNameSchema,
  kind: exerciseKindSchema,
})

export const updateExerciseSchema = z
  .object({
    name: exerciseNameSchema.optional(),
    kind: exerciseKindSchema.optional(),
  })
  .refine(v => v.name !== undefined || v.kind !== undefined, { message: 'Nothing to update' })

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>

/** Key used for case- and whitespace-insensitive uniqueness. */
export function exerciseNameKey(name: string): string {
  // NFC so composed and decomposed accents compare equal; locale-independent lowercasing.
  return name.trim().normalize('NFC').toLowerCase()
}

export interface Exercise {
  id: number
  name: string
  kind: ExerciseKind
  /** True once the exercise appears in any workout (its kind is then fixed). */
  used: boolean
}
