import { formatDistance, formatDuration, formatNumber } from './format'
import type { ExerciseKind, SessionType } from './kinds'
import type { SetValues } from './workouts'

/**
 * One workout's progress value for an exercise.
 * `value` is the charted number: kg (weight x reps), reps (bodyweight) or seconds (timed, cardio).
 */
export interface ProgressValue {
  value: number
  /** weight x reps: reps achieved at the heaviest weight */
  reps?: number
  /** cardio: longest distance, null when none was recorded */
  distanceM?: number | null
}

export interface ProgressPoint {
  workoutId: number
  date: string
  sessionType: SessionType
  progress: ProgressValue
  sets: SetValues[]
}

export interface ExerciseProgress {
  exercise: { id: number, name: string, kind: ExerciseKind }
  /** Oldest first. */
  points: ProgressPoint[]
}

function max(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number')
  return nums.length ? Math.max(...nums) : null
}

export function computeProgress(kind: ExerciseKind, sets: SetValues[]): ProgressValue {
  switch (kind) {
    case 'weight_reps': {
      let best: { weight: number, reps: number } | undefined
      for (const s of sets) {
        const weight = s.weightKg ?? 0
        const reps = s.reps ?? 0
        if (!best || weight > best.weight || (weight === best.weight && reps > best.reps)) best = { weight, reps }
      }
      return { value: best?.weight ?? 0, reps: best?.reps ?? 0 }
    }
    case 'bodyweight':
      return { value: max(sets.map(s => s.reps)) ?? 0 }
    case 'timed':
      return { value: max(sets.map(s => s.durationS)) ?? 0 }
    case 'cardio':
      return { value: max(sets.map(s => s.durationS)) ?? 0, distanceM: max(sets.map(s => s.distanceM)) }
  }
}

export function formatProgress(kind: ExerciseKind, p: ProgressValue): string {
  switch (kind) {
    case 'weight_reps':
      return `${formatNumber(p.value)}kg x ${p.reps ?? 0}`
    case 'bodyweight':
      return `${p.value} reps`
    case 'timed':
      return formatDuration(p.value)
    case 'cardio':
      return p.distanceM !== null && p.distanceM !== undefined
        ? `${formatDuration(p.value)}, ${formatDistance(p.distanceM)}`
        : formatDuration(p.value)
  }
}

export const PROGRESS_AXIS_LABEL: Record<ExerciseKind, string> = {
  weight_reps: 'Heaviest weight (kg)',
  bodyweight: 'Most reps',
  timed: 'Longest hold (s)',
  cardio: 'Longest duration (min)',
}
