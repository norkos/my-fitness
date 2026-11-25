import type { LastTime } from '#shared/workouts'

/**
 * "Last time" values per gym entry, keyed by the entry key. Kept outside the entries themselves so
 * loading them does not count as a change to save.
 */
export function useLastTimes() {
  const api = useApi()
  const lastTimes = ref<Record<number, LastTime | undefined>>({})

  async function loadLast(entryKey: number, exerciseId: number, beforeDate: string) {
    try {
      lastTimes.value[entryKey] = await api<LastTime>(`/api/exercises/${exerciseId}/last`, { query: { before: beforeDate } })
    }
    catch {
      lastTimes.value[entryKey] = undefined
    }
  }

  return { lastTimes, loadLast }
}
