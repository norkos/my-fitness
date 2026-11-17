import { describe, expect, it } from 'vitest'
import { swapCandidates, swapSets } from '../../shared/swap'

const catalog = [
  { id: 1, name: 'Deadlift', lastDoneOn: '2026-11-10' },
  { id: 2, name: 'cable row', lastDoneOn: '2026-11-16' },
  { id: 3, name: 'Biceps curl', lastDoneOn: null },
  { id: 4, name: 'Dumbbell row', lastDoneOn: '2026-11-16' },
  { id: 5, name: 'Ab rollout', lastDoneOn: null },
  { id: 6, name: 'Plank', lastDoneOn: '2026-11-01' },
]

describe('swapCandidates', () => {
  it('lists recently done first, then never-done alphabetically, excluding the draft', () => {
    expect(swapCandidates(catalog, new Set([6])).map(e => e.id)).toEqual([2, 4, 1, 5, 3])
  })

  it('searches by name ignoring case', () => {
    expect(swapCandidates(catalog, new Set(), '  ROW ').map(e => e.name)).toEqual(['cable row', 'Dumbbell row'])
    expect(swapCandidates(catalog, new Set(), 'nothing')).toEqual([])
  })

  it('does not change the catalog order', () => {
    swapCandidates(catalog, new Set())
    expect(catalog.map(e => e.id)).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('swapSets', () => {
  const planned = [{ weightKg: 7, reps: 16, durationS: null, distanceM: null }, { weightKg: 7, reps: 16, durationS: null, distanceM: null }]
  const last = [{ weightKg: 40, reps: 10, durationS: null, distanceM: null }, { weightKg: 40, reps: 8, durationS: null, distanceM: null }]

  it('keeps the planned sets for the same kind', () => {
    expect(swapSets('weight_reps', 'weight_reps', planned, last)).toEqual(planned)
  })

  it('uses last-time values for a different kind', () => {
    expect(swapSets('timed', 'weight_reps', [{ weightKg: null, reps: null, durationS: 45, distanceM: null }], last)).toEqual(last)
  })

  it('offers one empty set when a different kind has no history', () => {
    expect(swapSets('timed', 'weight_reps', planned, [])).toEqual([{ weightKg: null, reps: null, durationS: null, distanceM: null }])
  })

  it('copies the sets rather than sharing them', () => {
    const result = swapSets('weight_reps', 'weight_reps', planned, [])
    result[0]!.reps = 1
    expect(planned[0]!.reps).toBe(16)
  })
})
