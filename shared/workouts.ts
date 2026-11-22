import { z } from 'zod'
import { KIND_DEFINITIONS, SESSION_TYPES, SET_FIELDS, WORKOUT_STATUSES, type ExerciseKind, type SessionType, type SetField, type WorkoutStatus } from './kinds'
import { toFieldErrors, type FieldErrors } from './validation'

export interface SetValues {
  weightKg: number | null
  reps: number | null
  durationS: number | null
  distanceM: number | null
}

/** A set as stored in a workout: its values plus whether it was performed (relevant while a draft). */
export interface WorkoutSet extends SetValues {
  completed: boolean
}

export interface WorkoutInput {
  date: string
  sessionType: SessionType
  exercises: Array<{ exerciseId: number, sets: WorkoutSet[] }>
}

export interface WorkoutSummary {
  id: number
  date: string
  sessionType: SessionType
  status: WorkoutStatus
  exerciseCount: number
  /** Total sets across all exercises. */
  setCount: number
  /** Exercise names in workout order. */
  exerciseNames: string[]
}

export interface WorkoutExerciseDetail {
  exerciseId: number
  name: string
  kind: ExerciseKind
  videoUrl: string | null
  sets: WorkoutSet[]
}

export interface WorkoutDetail {
  id: number
  date: string
  sessionType: SessionType
  status: WorkoutStatus
  exercises: WorkoutExerciseDetail[]
}

export interface LastTime {
  date: string | null
  sets: SetValues[]
}

export const FIELD_LIMITS: Record<SetField, { max: number, integer: boolean, label: string }> = {
  weightKg: { max: 1000, integer: false, label: 'Weight' },
  reps: { max: 1000, integer: true, label: 'Reps' },
  durationS: { max: 86_400, integer: true, label: 'Duration' },
  distanceM: { max: 1_000_000, integer: true, label: 'Distance' },
}

function fieldSchema(field: SetField) {
  const { max, integer, label } = FIELD_LIMITS[field]
  let schema = z.number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(max, `${label} is too large`)
  if (integer) schema = schema.int(`${label} must be a whole number`)
  return schema.nullable().optional()
}

const setSchema = z.object({
  weightKg: fieldSchema('weightKg'),
  reps: fieldSchema('reps'),
  durationS: fieldSchema('durationS'),
  distanceM: fieldSchema('distanceM'),
  completed: z.boolean({ error: 'Completed must be true or false' }).optional(),
})

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export const isoDateSchema = z.string({ error: 'Date is required' }).refine(isValidIsoDate, 'Enter a valid date')

export const MAX_EXERCISES_PER_WORKOUT = 30
export const MAX_SETS_PER_EXERCISE = 30

export const workoutStatusSchema = z.enum(WORKOUT_STATUSES, { error: 'Choose draft or done' })

export const workoutStructureSchema = z.object({
  date: isoDateSchema,
  sessionType: z.enum(SESSION_TYPES, { error: 'Choose solo or trainer' }),
  exercises: z
    .array(z.object({
      exerciseId: z.number({ error: 'Choose an exercise' }).int().positive(),
      sets: z
        .array(setSchema)
        .min(1, 'Add at least one set')
        .max(MAX_SETS_PER_EXERCISE, `At most ${MAX_SETS_PER_EXERCISE} sets per exercise`),
    }))
    .min(1, 'Add at least one exercise')
    .max(MAX_EXERCISES_PER_WORKOUT, `At most ${MAX_EXERCISES_PER_WORKOUT} exercises per workout`),
})

export type WorkoutValidationResult =
  | { success: true, data: WorkoutInput }
  | { success: false, fieldErrors: FieldErrors }

export interface ValidateWorkoutOptions {
  /** Drafts may leave required values empty; every other rule applies to both. Defaults to done. */
  mode?: WorkoutStatus
}

/**
 * Validates a workout payload. `kindOf` returns the kind of an exercise id, or undefined if it does not exist.
 * Values for fields that the exercise kind does not record are dropped. Sets of a done workout are always
 * completed; in a draft a set is completed only when marked so.
 */
export function validateWorkout(
  input: unknown,
  kindOf: (exerciseId: number) => ExerciseKind | undefined,
  { mode = 'done' }: ValidateWorkoutOptions = {},
): WorkoutValidationResult {
  const parsed = workoutStructureSchema.safeParse(input)
  if (!parsed.success) return { success: false, fieldErrors: toFieldErrors(parsed.error) }

  const fieldErrors: FieldErrors = {}
  const seen = new Set<number>()
  const exercises: WorkoutInput['exercises'] = []

  parsed.data.exercises.forEach((entry, i) => {
    const kind = kindOf(entry.exerciseId)
    if (!kind) {
      fieldErrors[`exercises.${i}.exerciseId`] = 'This exercise does not exist'
      return
    }
    if (seen.has(entry.exerciseId)) {
      fieldErrors[`exercises.${i}.exerciseId`] = 'This exercise is already in the workout; add more sets to it instead'
      return
    }
    seen.add(entry.exerciseId)

    const def = KIND_DEFINITIONS[kind]
    const allowed = new Set<SetField>([...def.required, ...def.optional])
    const sets = entry.sets.map((set, j) => {
      for (const field of mode === 'draft' ? [] : def.required) {
        if (set[field] === null || set[field] === undefined) {
          fieldErrors[`exercises.${i}.sets.${j}.${field}`] = `${FIELD_LIMITS[field].label} is required`
        }
      }
      const normalized = { completed: mode === 'done' ? true : (set.completed ?? false) } as WorkoutSet
      for (const field of SET_FIELDS) {
        normalized[field] = allowed.has(field) ? (set[field] ?? null) : null
      }
      return normalized
    })
    exercises.push({ exerciseId: entry.exerciseId, sets })
  })

  if (Object.keys(fieldErrors).length) return { success: false, fieldErrors }
  return { success: true, data: { date: parsed.data.date, sessionType: parsed.data.sessionType, exercises } }
}

/** The parts of a workout that seed a new draft: everything except identity, date and status. */
export interface DraftSeed {
  sessionType: SessionType
  exercises: WorkoutExerciseDetail[]
}

/**
 * Copies a workout into the starting values of a new draft: same session type, exercises in order and
 * set values as recorded, with no set marked done. The source is not modified; the caller picks the date.
 */
export function draftFromWorkout(source: WorkoutDetail): DraftSeed {
  return {
    sessionType: source.sessionType,
    exercises: source.exercises.map(e => ({
      ...e,
      sets: e.sets.map(s => ({ weightKg: s.weightKg, reps: s.reps, durationS: s.durationS, distanceM: s.distanceM, completed: false })),
    })),
  }
}
