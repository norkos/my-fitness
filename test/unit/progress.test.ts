import { describe, expect, it } from 'vitest'
import { computeProgress, formatProgress } from '../../shared/progress'

const set = (v: Partial<Record<'weightKg' | 'reps' | 'durationS' | 'distanceM', number>>) => ({
  weightKg: null, reps: null, durationS: null, distanceM: null, ...v,
})

describe('computeProgress', () => {
  it('weight x reps: heaviest weight, ties broken by most reps', () => {
    const p = computeProgress('weight_reps', [set({ weightKg: 50, reps: 8 }), set({ weightKg: 55, reps: 5 }), set({ weightKg: 55, reps: 6 })])
    expect(p).toEqual({ value: 55, reps: 6 })
    expect(formatProgress('weight_reps', p)).toBe('55kg x 6')
  })

  it('weight x reps: a lighter set with more reps does not win', () => {
    expect(computeProgress('weight_reps', [set({ weightKg: 60, reps: 3 }), set({ weightKg: 40, reps: 12 })])).toEqual({ value: 60, reps: 3 })
  })

  it('bodyweight: most reps in one set', () => {
    const p = computeProgress('bodyweight', [set({ reps: 6 }), set({ reps: 8 }), set({ reps: 5 })])
    expect(p).toEqual({ value: 8 })
    expect(formatProgress('bodyweight', p)).toBe('8 reps')
  })

  it('timed: longest duration', () => {
    const p = computeProgress('timed', [set({ durationS: 45 }), set({ durationS: 60 })])
    expect(p).toEqual({ value: 60 })
    expect(formatProgress('timed', p)).toBe('1:00')
  })

  it('cardio: longest duration and longest distance', () => {
    const p = computeProgress('cardio', [set({ durationS: 600, distanceM: 2000 })])
    expect(p).toEqual({ value: 600, distanceM: 2000 })
    expect(formatProgress('cardio', p)).toBe('10:00, 2 km')
  })

  it('cardio: distance is null when never recorded', () => {
    const p = computeProgress('cardio', [set({ durationS: 300 })])
    expect(p).toEqual({ value: 300, distanceM: null })
    expect(formatProgress('cardio', p)).toBe('5:00')
  })

  it('handles empty sets', () => {
    expect(computeProgress('weight_reps', [])).toEqual({ value: 0, reps: 0 })
    expect(computeProgress('bodyweight', [])).toEqual({ value: 0 })
    expect(formatProgress('weight_reps', { value: 0 })).toBe('0kg x 0')
  })
})
