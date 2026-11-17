import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PdfPageContent, PdfTextItem } from '../../shared/pdf-content'
import { toPageContent } from '../../shared/pdf-content'
import { guessKind, importNameKey, matchExercise, NOT_A_PLAN_MESSAGE, parsePlan, planFitsKind, planSets, type PlanRow } from '../../shared/plan-import'

/** Text items and links extracted from the synthetic e2e/fixtures/trainer-plan.pdf (see scripts/). */
const example: PdfPageContent = JSON.parse(readFileSync(new URL('./fixtures/plan-example.json', import.meta.url), 'utf8'))

function rows(page: PdfPageContent): PlanRow[] {
  const result = parsePlan(page)
  if (!result.ok) throw new Error(result.message)
  return result.rows
}

function withoutItem(page: PdfPageContent, predicate: (item: PdfTextItem) => boolean): PdfPageContent {
  return { ...page, items: page.items.filter(i => !predicate(i)) }
}

describe('parsePlan on the trainer example', () => {
  const parsed = rows(example)

  it('reads all eight rows in table order with their values and links, including a row without one', () => {
    expect(parsed.map(r => [r.name, r.sets, r.reps, r.durationS, r.weightKg, r.videoUrl])).toEqual([
      ['Dumbbell bench press', 4, 10, null, 12.5, 'https://example.com/videos/dumbbell-press'],
      ['Bent-over dumbbell row', 3, 10, null, 20, 'https://example.com/videos/dumbbell-row'],
      ['Flat bench flyes', 3, 15, null, 6, 'https://example.com/videos/flyes'],
      ['Dumbbell lunges', 3, 10, null, 10, 'https://example.com/videos/lunges'],
      ['Lateral raise', 3, 15, null, 4, 'https://example.com/videos/lateral-raise'],
      ['Dumbbell curl', 3, 10, null, 8, null],
      ['Plank', 3, null, 40, null, 'https://example.com/videos/plank'],
      ["Russian twist's", 3, null, 20, null, 'https://example.com/videos/russian-twist'],
    ])
  })

  it('reports no issues for a complete plan', () => {
    expect(parsed.flatMap(r => r.issues)).toEqual([])
  })

  it('does not depend on the order of the text items', () => {
    expect(rows({ ...example, items: [...example.items].reverse() })).toEqual(parsed)
  })
})

describe('parsePlan edge cases', () => {
  it('leaves a blank weight empty and marks the row', () => {
    const page = withoutItem(example, i => i.str === '12,5kg')
    const first = rows(page)[0]!
    expect(first.weightKg).toBeNull()
    expect(first.issues).toEqual(['No weight in the plan'])
  })

  it('marks unreadable values and leaves them empty', () => {
    const flyesReps = example.items.find(i => i.str === '15')!
    const page: PdfPageContent = {
      ...example,
      items: example.items.map((i) => {
        if (i.str === '12,5kg') return { ...i, str: 'light' }
        if (i === flyesReps) return { ...i, str: '12-15' }
        return i
      }),
    }
    const [first, , third] = rows(page)
    expect(first!.weightKg).toBeNull()
    expect(first!.issues).toEqual(['Weight "light" could not be read'])
    expect(third!.reps).toBeNull()
    expect(third!.issues).toEqual(['Reps "12-15" could not be read'])
  })

  it('ignores non-https links', () => {
    const page: PdfPageContent = {
      ...example,
      links: example.links.map(l => (l.url.endsWith('/plank') ? { ...l, url: 'http://example.com/videos/plank' } : l)),
    }
    const parsed = rows(page)
    expect(parsed[6]!.videoUrl).toBeNull()
    expect(parsed[7]!.videoUrl).toBe('https://example.com/videos/russian-twist')
  })

  it('joins a name wrapped onto a second line', () => {
    const plank = example.items.find(i => i.str === 'Plank')!
    const page: PdfPageContent = { ...example, items: [...example.items, { ...plank, str: 'on elbows', y: plank.y - 4.5 }] }
    expect(rows(page)[6]!.name).toBe('Plank on elbows')
  })

  it('reads only the first of repeated weight columns', () => {
    // Add a "Ciężar T2" column to the right of "Ciężar T1", with a value on the first row.
    const t1 = example.items.find(i => i.str === 'Ciężar T1')!
    const firstWeight = example.items.find(i => i.str === '12,5kg')!
    const page: PdfPageContent = {
      ...example,
      items: [
        ...example.items,
        { ...t1, str: 'Ciężar T2', x: t1.x + 80 },
        { ...firstWeight, str: '15kg', x: firstWeight.x + 80 },
      ],
    }
    const parsed = rows(page)
    expect(parsed.map(r => r.weightKg)).toEqual([12.5, 20, 6, 10, 4, 8, null, null])
    expect(parsed.flatMap(r => r.issues)).toEqual([])
  })

  it('rejects a page without the plan header', () => {
    expect(parsePlan({ items: [{ str: 'Invoice', x: 10, y: 10, width: 30, height: 8 }], links: [] })).toEqual({ ok: false, message: NOT_A_PLAN_MESSAGE })
    expect(parsePlan({ items: [], links: [] }).ok).toBe(false)
  })

  it('rejects a header without a required column or without rows', () => {
    expect(parsePlan(withoutItem(example, i => i.str === 'Ruchy')).ok).toBe(false)
    const headerOnly = example.items.filter(i => i.y >= 524)
    expect(parsePlan({ items: headerOnly, links: [] }).ok).toBe(false)
  })
})

describe('toPageContent', () => {
  it('keeps positioned text and URL links only', () => {
    const content = toPageContent(
      [
        { str: 'Plank', transform: [1, 0, 0, 1, 202.771, 456.824], width: 18.6, height: 7.3 },
        { str: '  ', transform: [1, 0, 0, 1, 0, 0], width: 1, height: 1 },
        { type: 'beginMarkedContent' },
      ],
      [
        { subtype: 'Link', url: 'https://example.com/videos/x', rect: [1, 2, 3, 4] },
        { subtype: 'Link', dest: 'page2', rect: [1, 2, 3, 4] },
        { subtype: 'Widget', rect: [1, 2, 3, 4] },
      ],
    )
    expect(content).toEqual({
      items: [{ str: 'Plank', x: 202.77, y: 456.82, width: 18.6, height: 7.3 }],
      links: [{ url: 'https://example.com/videos/x', rect: [1, 2, 3, 4] }],
    })
  })
})

describe('name matching', () => {
  const catalog = [{ id: 1, name: 'Plank' }, { id: 2, name: 'Russian twist' }, { id: 3, name: 'Side lateral raise' }]

  it('ignores case and surrounding whitespace', () => {
    expect(matchExercise(' plank ', catalog)?.id).toBe(1)
  })

  it('ignores a trailing apostrophe suffix and punctuation', () => {
    expect(matchExercise("Russian twist's", catalog)?.id).toBe(2)
    expect(matchExercise('Russian twist’s', catalog)?.id).toBe(2)
    expect(matchExercise('Plank.', catalog)?.id).toBe(1)
  })

  it('collapses inner whitespace but does not fuzzy-match different names', () => {
    expect(importNameKey('Lateral   raise')).toBe('lateral raise')
    expect(matchExercise('Lateral raise', catalog)).toBeUndefined()
  })
})

describe('kinds and planned sets', () => {
  const base = { sets: 3, reps: null, durationS: null, weightKg: null }

  it('guesses the kind from the planned values', () => {
    expect(guessKind({ ...base, reps: 12, weightKg: 12.5 })).toBe('weight_reps')
    expect(guessKind({ ...base, reps: 12 })).toBe('bodyweight')
    expect(guessKind({ ...base, durationS: 45 })).toBe('timed')
    expect(guessKind(base)).toBe('weight_reps')
  })

  it('builds one set per planned set with the values the kind records', () => {
    expect(planSets('weight_reps', { ...base, reps: 12, weightKg: 12.5 })).toEqual(
      Array.from({ length: 3 }, () => ({ weightKg: 12.5, reps: 12, durationS: null, distanceM: null })),
    )
    expect(planSets('timed', { ...base, sets: 2, durationS: 45 })).toEqual(
      Array.from({ length: 2 }, () => ({ weightKg: null, reps: null, durationS: 45, distanceM: null })),
    )
    expect(planSets('bodyweight', { ...base, sets: null, reps: 10 })).toEqual([{ weightKg: null, reps: 10, durationS: null, distanceM: null }])
  })

  it('leaves values empty when they do not fit the kind', () => {
    const timedRow = { ...base, durationS: 45 }
    expect(planFitsKind('weight_reps', timedRow)).toBe(false)
    expect(planFitsKind('cardio', timedRow)).toBe(true)
    expect(planFitsKind('timed', { ...base, reps: 12 })).toBe(false)
    expect(planSets('weight_reps', timedRow)).toEqual(Array.from({ length: 3 }, () => ({ weightKg: null, reps: null, durationS: null, distanceM: null })))
  })
})
