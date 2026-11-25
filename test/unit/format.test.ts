import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatLastTimeSets,
  formatNumber,
  formatSet,
  formatSets,
  formatShortDate,
  toIsoDate,
  tomorrowIsoDate,
} from '../../shared/format'
import { draftToValues, EMPTY_SET_DRAFT, fieldUnit, isFieldRequired, usesMinutes, valuesToDraft } from '../../shared/set-form'

const set = (v: Partial<Record<'weightKg' | 'reps' | 'durationS' | 'distanceM', number>>) => ({
  weightKg: null, reps: null, durationS: null, distanceM: null, ...v,
})

describe('formatting', () => {
  it('formats numbers without trailing zeros', () => {
    expect(formatNumber(50)).toBe('50')
    expect(formatNumber(52.5)).toBe('52.5')
    expect(formatNumber(1.234)).toBe('1.23')
  })

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(600)).toBe('10:00')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3725)).toBe('1:02:05')
  })

  it('formats distances', () => {
    expect(formatDistance(800)).toBe('800 m')
    expect(formatDistance(2000)).toBe('2 km')
    expect(formatDistance(2500)).toBe('2.5 km')
  })

  it('formats a set per kind', () => {
    expect(formatSet('weight_reps', set({ weightKg: 50, reps: 8 }))).toBe('50kg x 8')
    expect(formatSet('bodyweight', set({ reps: 8 }))).toBe('8 reps')
    expect(formatSet('bodyweight', set({ reps: 5, weightKg: 10 }))).toBe('5 reps +10kg')
    expect(formatSet('timed', set({ durationS: 45 }))).toBe('45s')
    expect(formatSet('cardio', set({ durationS: 600, distanceM: 2000 }))).toBe('10:00, 2 km')
    expect(formatSet('cardio', set({ durationS: 600 }))).toBe('10:00')
  })

  it('tolerates missing values', () => {
    expect(formatSet('weight_reps', set({}))).toBe('0kg x 0')
    expect(formatSet('bodyweight', set({}))).toBe('0 reps')
    expect(formatSet('timed', set({}))).toBe('0s')
    expect(formatSet('cardio', set({}))).toBe('0s')
  })

  it('joins sets', () => {
    expect(formatSets('weight_reps', [set({ weightKg: 50, reps: 8 }), set({ weightKg: 50, reps: 6 })])).toBe('50kg x 8, 50kg x 6')
  })

  it('formats calendar dates without time-zone shifts', () => {
    expect(formatDate('2026-11-15')).toBe('Sun, 15 Nov 2026')
    expect(formatShortDate('2026-11-05')).toBe('5 Nov')
  })

  it('converts a local date to YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(tomorrowIsoDate(new Date(2026, 0, 31, 23, 30))).toBe('2026-02-01')
    expect(tomorrowIsoDate(new Date(2026, 11, 31, 8, 0))).toBe('2027-01-01')
  })
})

describe('formatLastTimeSets', () => {
  it('formats weight x reps sets joined with a middle dot', () => {
    expect(formatLastTimeSets('weight_reps', [set({ weightKg: 70, reps: 8 }), set({ weightKg: 70, reps: 6 })])).toBe('70 kg × 8 · 70 kg × 6')
    expect(formatLastTimeSets('weight_reps', [set({ weightKg: 12.5, reps: 10 })])).toBe('12.5 kg × 10')
  })

  it('falls back to the standard set format when weight or reps is missing', () => {
    expect(formatLastTimeSets('weight_reps', [set({ reps: 8 })])).toBe(formatSet('weight_reps', set({ reps: 8 })))
    expect(formatLastTimeSets('weight_reps', [set({ weightKg: 70 })])).toBe(formatSet('weight_reps', set({ weightKg: 70 })))
  })

  it('uses the standard set format for other kinds', () => {
    expect(formatLastTimeSets('bodyweight', [set({ reps: 8, weightKg: 5 }), set({ reps: 6 })])).toBe('8 reps +5kg · 6 reps')
    expect(formatLastTimeSets('timed', [set({ durationS: 45 }), set({ durationS: 90 })])).toBe('45s · 1:30')
  })
})

describe('set form helpers', () => {
  it('describes units and required fields', () => {
    expect(fieldUnit('weight_reps', 'weightKg')).toBe('kg')
    expect(fieldUnit('bodyweight', 'weightKg')).toBe('+kg')
    expect(fieldUnit('bodyweight', 'reps')).toBe('reps')
    expect(fieldUnit('timed', 'durationS')).toBe('s')
    expect(fieldUnit('cardio', 'durationS')).toBe('min')
    expect(fieldUnit('cardio', 'distanceM')).toBe('m')
    expect(isFieldRequired('bodyweight', 'weightKg')).toBe(false)
    expect(isFieldRequired('bodyweight', 'reps')).toBe(true)
    expect(usesMinutes('timed', 'durationS')).toBe(false)
  })

  it('parses drafts into values', () => {
    expect(draftToValues('weight_reps', { ...EMPTY_SET_DRAFT, weightKg: '52,5', reps: ' 8 ' })).toEqual(set({ weightKg: 52.5, reps: 8 }))
    expect(draftToValues('cardio', { ...EMPTY_SET_DRAFT, durationS: '12.5', distanceM: '2000' })).toEqual(set({ durationS: 750, distanceM: 2000 }))
  })

  it('marks non-numeric text as NaN and negative numbers as negative', () => {
    expect(draftToValues('timed', { ...EMPTY_SET_DRAFT, durationS: 'abc' }).durationS).toBeNaN()
    expect(draftToValues('bodyweight', { ...EMPTY_SET_DRAFT, reps: '-5' }).reps).toBe(-5)
  })

  it('turns values back into drafts', () => {
    expect(valuesToDraft('cardio', set({ durationS: 750, distanceM: 2000 }))).toEqual({ ...EMPTY_SET_DRAFT, durationS: '12.5', distanceM: '2000' })
    expect(valuesToDraft('weight_reps', set({ weightKg: 50, reps: 8 }))).toEqual({ ...EMPTY_SET_DRAFT, weightKg: '50', reps: '8' })
  })
})
