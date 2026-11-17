import { z } from 'zod'
import { EXERCISE_KINDS, type ExerciseKind } from './kinds'

export const EXERCISE_NAME_MAX = 80

export const exerciseNameSchema = z
  .string({ error: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(EXERCISE_NAME_MAX, `Name must be at most ${EXERCISE_NAME_MAX} characters`)

export const exerciseKindSchema = z.enum(EXERCISE_KINDS, { error: 'Choose a valid kind' })

export const VIDEO_URL_MAX = 2048
const VIDEO_URL_MESSAGE = 'Enter an https:// link'

/** True for an absolute https URL with a host; anything else (javascript:, http:, relative) is rejected. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname !== ''
  }
  catch {
    return false
  }
}

/** Optional video link: an https URL, or null. An empty string clears the link. */
export const videoUrlSchema = z.preprocess(
  v => (typeof v === 'string' && v.trim() === '' ? null : v),
  z.string({ error: VIDEO_URL_MESSAGE })
    .trim()
    .max(VIDEO_URL_MAX, 'Link is too long')
    .refine(isHttpsUrl, VIDEO_URL_MESSAGE)
    .nullable(),
)

export const createExerciseSchema = z.object({
  name: exerciseNameSchema,
  kind: exerciseKindSchema,
  videoUrl: videoUrlSchema.optional(),
})

export const updateExerciseSchema = z
  .object({
    name: exerciseNameSchema.optional(),
    kind: exerciseKindSchema.optional(),
    videoUrl: videoUrlSchema.optional(),
  })
  .refine(v => v.name !== undefined || v.kind !== undefined || v.videoUrl !== undefined, { message: 'Nothing to update' })

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
  /** Optional https link to a video showing the exercise. */
  videoUrl: string | null
  /** True once the exercise appears in a done workout (its kind is then fixed); planned workouts don't count. */
  used: boolean
  /** Date of the latest done workout containing the exercise, or null if it was never done. */
  lastDoneOn: string | null
}
