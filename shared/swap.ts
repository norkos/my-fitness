import type { Exercise } from './exercises'
import type { ExerciseKind } from './kinds'
import type { SetValues } from './workouts'

type Candidate = Pick<Exercise, 'id' | 'name' | 'lastDoneOn'>

/**
 * Exercises offered when swapping one in a draft: those not already in it, filtered by a case-insensitive
 * name search, most recently done first, then never-done ones alphabetically.
 * A later change can rank exercises that share muscles with the replaced one ahead of these.
 */
export function swapCandidates<T extends Candidate>(catalog: readonly T[], excludeIds: ReadonlySet<number>, query = ''): T[] {
  const needle = query.trim().normalize('NFC').toLowerCase()
  return catalog
    .filter(e => !excludeIds.has(e.id) && (!needle || e.name.normalize('NFC').toLowerCase().includes(needle)))
    .sort((a, b) => {
      if (a.lastDoneOn && b.lastDoneOn && a.lastDoneOn !== b.lastDoneOn) return a.lastDoneOn < b.lastDoneOn ? 1 : -1
      if (a.lastDoneOn && !b.lastDoneOn) return -1
      if (!a.lastDoneOn && b.lastDoneOn) return 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
}

const EMPTY_SET: SetValues = { weightKg: null, reps: null, durationS: null, distanceM: null }

/**
 * Sets for the exercise swapped in: the planned sets when both exercises record the same kind,
 * otherwise the new exercise's last-time values, or one empty set if it has none. All start not done.
 */
export function swapSets(fromKind: ExerciseKind, toKind: ExerciseKind, planned: readonly SetValues[], lastTime: readonly SetValues[]): SetValues[] {
  const source = fromKind === toKind ? planned : lastTime
  return source.length ? source.map(s => ({ ...EMPTY_SET, ...s })) : [{ ...EMPTY_SET }]
}
