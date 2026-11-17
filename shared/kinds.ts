export const EXERCISE_KINDS = ['weight_reps', 'bodyweight', 'timed', 'cardio'] as const
export type ExerciseKind = (typeof EXERCISE_KINDS)[number]

export const SESSION_TYPES = ['solo', 'trainer'] as const
export type SessionType = (typeof SESSION_TYPES)[number]

export type SetField = 'weightKg' | 'reps' | 'durationS' | 'distanceM'
export const SET_FIELDS: readonly SetField[] = ['weightKg', 'reps', 'durationS', 'distanceM']

export interface KindDefinition {
  label: string
  required: readonly SetField[]
  optional: readonly SetField[]
}

export const KIND_DEFINITIONS: Record<ExerciseKind, KindDefinition> = {
  weight_reps: { label: 'Weight x reps', required: ['weightKg', 'reps'], optional: [] },
  bodyweight: { label: 'Bodyweight', required: ['reps'], optional: ['weightKg'] },
  timed: { label: 'Timed', required: ['durationS'], optional: [] },
  cardio: { label: 'Cardio', required: ['durationS'], optional: ['distanceM'] },
}

export function fieldsForKind(kind: ExerciseKind): SetField[] {
  const def = KIND_DEFINITIONS[kind]
  return [...def.required, ...def.optional]
}

/** A draft is a planned workout that has not been performed yet; only done workouts count as history. */
export const WORKOUT_STATUSES = ['draft', 'done'] as const
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number]
