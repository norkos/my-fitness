import { fieldsForKind, KIND_DEFINITIONS, type ExerciseKind, type SetField } from './kinds'
import type { SetValues } from './workouts'

/** Text-field state for one set in the workout form. */
export type SetDraft = Record<SetField, string>

export const EMPTY_SET_DRAFT: SetDraft = { weightKg: '', reps: '', durationS: '', distanceM: '' }

/** Cardio duration is entered in minutes; everything else in its stored unit. */
export function usesMinutes(kind: ExerciseKind, field: SetField): boolean {
  return kind === 'cardio' && field === 'durationS'
}

export function fieldUnit(kind: ExerciseKind, field: SetField): string {
  if (field === 'weightKg') return kind === 'bodyweight' ? '+kg' : 'kg'
  if (field === 'reps') return 'reps'
  if (field === 'durationS') return usesMinutes(kind, field) ? 'min' : 's'
  return 'm'
}

/** Column header in gym mode: the unit in capitals (KG, +KG, REPS, S, MIN, M). */
export function fieldHeader(kind: ExerciseKind, field: SetField): string {
  return fieldUnit(kind, field).toUpperCase()
}

/** Gym mode field order: weight before reps when both are present (bodyweight); other kinds unchanged. */
export function gymFieldsForKind(kind: ExerciseKind): SetField[] {
  const fields = fieldsForKind(kind)
  if (!fields.includes('weightKg') || !fields.includes('reps')) return fields
  return ['weightKg', 'reps', ...fields.filter(f => f !== 'weightKg' && f !== 'reps')]
}

export function isFieldRequired(kind: ExerciseKind, field: SetField): boolean {
  return KIND_DEFINITIONS[kind].required.includes(field)
}

function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.')
  if (trimmed === '') return null
  // NaN for anything non-numeric, so validation reports "must be a number"
  return /^-?\d*\.?\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

export function draftToValues(kind: ExerciseKind, draft: SetDraft): SetValues {
  const values = {} as SetValues
  for (const field of ['weightKg', 'reps', 'durationS', 'distanceM'] as const) {
    let n = parseNumber(draft[field])
    if (n !== null && !Number.isNaN(n) && usesMinutes(kind, field)) n = Math.round(n * 60)
    values[field] = n
  }
  return values
}

export function valuesToDraft(kind: ExerciseKind, values: SetValues): SetDraft {
  const draft = { ...EMPTY_SET_DRAFT }
  for (const field of ['weightKg', 'reps', 'durationS', 'distanceM'] as const) {
    const v = values[field]
    if (v === null || v === undefined) continue
    draft[field] = usesMinutes(kind, field) ? String(Number((v / 60).toFixed(2))) : String(v)
  }
  return draft
}
