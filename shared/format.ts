import type { ExerciseKind, SessionType } from './kinds'
import type { SetValues } from './workouts'

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${formatNumber(meters / 1000)} km` : `${meters} m`
}

export function formatSet(kind: ExerciseKind, set: SetValues): string {
  switch (kind) {
    case 'weight_reps':
      return `${formatNumber(set.weightKg ?? 0)}kg x ${set.reps ?? 0}`
    case 'bodyweight': {
      const reps = `${set.reps ?? 0} reps`
      return set.weightKg ? `${reps} +${formatNumber(set.weightKg)}kg` : reps
    }
    case 'timed':
      return formatDuration(set.durationS ?? 0)
    case 'cardio': {
      const time = formatDuration(set.durationS ?? 0)
      return set.distanceM !== null && set.distanceM !== undefined ? `${time}, ${formatDistance(set.distanceM)}` : time
    }
  }
}

export function formatSets(kind: ExerciseKind, sets: SetValues[]): string {
  return sets.map(s => formatSet(kind, s)).join(', ')
}

/** "Sun, 15 Nov 2026" for a YYYY-MM-DD calendar date, independent of the device time zone. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${isoDate}T00:00:00Z`))
}

/** "15 Nov" for chart labels. */
export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`))
}

/** The local calendar day of `date` as YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Tomorrow's local calendar day, the default date for a planned workout. */
export function tomorrowIsoDate(now: Date = new Date()): string {
  const next = new Date(now)
  next.setDate(next.getDate() + 1)
  return toIsoDate(next)
}

export const SESSION_LABELS: Record<SessionType, string> = { solo: 'Solo', trainer: 'Trainer' }
