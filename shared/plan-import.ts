import { z } from 'zod'
import { exerciseKindSchema, exerciseNameKey, exerciseNameSchema, isHttpsUrl, videoUrlSchema } from './exercises'
import { SESSION_TYPES, type ExerciseKind } from './kinds'
import type { PdfLink, PdfPageContent, PdfTextItem } from './pdf-content'
import { FIELD_LIMITS, isoDateSchema, MAX_EXERCISES_PER_WORKOUT, MAX_SETS_PER_EXERCISE, type SetValues } from './workouts'

/** Fields of one table row in the trainer's plan. */
export type PlanField = 'number' | 'name' | 'sets' | 'reps' | 'tempo' | 'rir' | 'weight'

/**
 * The trainer's PDF header labels, matched case-insensitively as prefixes ("Ciężar T1" matches "Ciężar").
 * This is the only place the Polish labels appear; everything else uses the English field names.
 */
export const PLAN_HEADER_LABELS: ReadonlyArray<readonly [string, PlanField]> = [
  ['nazwa ćwiczenia', 'name'],
  ['nr', 'number'],
  ['serie', 'sets'],
  ['ruchy', 'reps'],
  ['tempo', 'tempo'],
  ['rir', 'rir'],
  ['ciężar', 'weight'],
]

/** Columns that must be present for the table to be read as a plan. */
const REQUIRED_FIELDS: readonly PlanField[] = ['name', 'sets', 'reps', 'weight']

export interface PlanRow {
  name: string
  sets: number | null
  reps: number | null
  durationS: number | null
  weightKg: number | null
  videoUrl: string | null
  /** Values that were blank or could not be read; shown to the user to complete. */
  issues: string[]
}

export type ParsePlanResult =
  | { ok: true, rows: PlanRow[] }
  | { ok: false, message: string }

export const NOT_A_PLAN_MESSAGE = 'This file could not be read as a training plan'

function normalizeLabel(text: string): string {
  return text.normalize('NFC').trim().toLowerCase().replace(/\.$/, '')
}

function fieldForHeader(text: string): PlanField | undefined {
  const label = normalizeLabel(text)
  return PLAN_HEADER_LABELS.find(([prefix]) => label === prefix || label.startsWith(`${prefix} `))?.[1]
}

const center = (item: PdfTextItem) => item.x + item.width / 2

interface Column {
  /** null for a column that is not read, e.g. a repeated "Ciężar T2" after "Ciężar T1". */
  field: PlanField | null
  from: number
  to: number
}

/** Splits the page width into columns at the midpoints between header label centers. */
function columnsFromHeader(header: Array<{ field: PlanField | null, item: PdfTextItem }>): Column[] {
  const sorted = [...header].sort((a, b) => center(a.item) - center(b.item))
  return sorted.map((h, i) => ({
    field: h.field,
    from: i === 0 ? Number.NEGATIVE_INFINITY : (center(sorted[i - 1]!.item) + center(h.item)) / 2,
    to: i === sorted.length - 1 ? Number.POSITIVE_INFINITY : (center(h.item) + center(sorted[i + 1]!.item)) / 2,
  }))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0
}

/** Groups items into visual lines, top to bottom; items whose baselines are close belong to one line. */
function groupLines(items: PdfTextItem[]): PdfTextItem[][] {
  const tolerance = Math.max(2, median(items.map(i => i.height)) / 2)
  const lines: Array<{ y: number, items: PdfTextItem[] }> = []
  for (const item of [...items].sort((a, b) => b.y - a.y)) {
    const line = lines[lines.length - 1]
    if (line && Math.abs(line.y - item.y) <= tolerance) line.items.push(item)
    else lines.push({ y: item.y, items: [item] })
  }
  return lines.map(l => l.items)
}

interface RawRow {
  cells: Partial<Record<PlanField, string>>
  nameItems: PdfTextItem[]
}

const SECONDS = /^(\d+)\s*s(?:ek)?$/i
const WHOLE = /^\d+$/

function parseCount(text: string | undefined, max: number): number | null | undefined {
  if (!text) return null
  if (!WHOLE.test(text)) return undefined
  const n = Number(text)
  return n > 0 && n <= max ? n : undefined
}

/** "12,5kg" -> 12.5, "6/8kg" -> 6 (the first value), "" -> null, anything else -> undefined. */
function parseWeight(text: string | undefined): number | null | undefined {
  if (!text) return null
  const first = text.toLowerCase().replace(/\s+/g, '').replace(/kg$/, '').split('/')[0]!.replace(/kg$/, '').replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(first)) return undefined
  const n = Number(first)
  return n <= FIELD_LIMITS.weightKg.max ? n : undefined
}

function toPlanRow(raw: RawRow): PlanRow {
  const { cells } = raw
  const issues: string[] = []
  const row: PlanRow = {
    name: cells.name!.replace(/\s+/g, ' ').trim(),
    sets: null,
    reps: null,
    durationS: null,
    weightKg: null,
    videoUrl: null,
    issues,
  }

  const sets = parseCount(cells.sets, MAX_SETS_PER_EXERCISE)
  if (sets === undefined) issues.push(`Number of sets "${cells.sets}" could not be read`)
  else if (sets === null) issues.push('No number of sets in the plan')
  else row.sets = sets

  const repsText = cells.reps
  const seconds = repsText ? SECONDS.exec(repsText) : null
  if (seconds) {
    const n = Number(seconds[1])
    if (n > 0 && n <= FIELD_LIMITS.durationS.max) row.durationS = n
    else issues.push(`Time "${repsText}" could not be read`)
  }
  else {
    const reps = parseCount(repsText, FIELD_LIMITS.reps.max)
    if (reps === undefined) issues.push(`Reps "${repsText}" could not be read`)
    else if (reps === null) issues.push('No reps or time in the plan')
    else row.reps = reps
  }

  // For timed rows the weight column repeats the time, so it is not a weight.
  if (!seconds) {
    const weight = parseWeight(cells.weight)
    if (weight === undefined) issues.push(`Weight "${cells.weight}" could not be read`)
    else if (weight === null) issues.push('No weight in the plan')
    else row.weightKg = weight
  }
  return row
}

/** Vertical overlap between a link rectangle and the text of a row's name cell. */
function linkOverlap(link: PdfLink, items: PdfTextItem[]): number {
  const [x1, y1, x2, y2] = link.rect
  let best = 0
  for (const item of items) {
    const horizontal = Math.min(x2, item.x + item.width) - Math.max(x1, item.x)
    const vertical = Math.min(y2, item.y + item.height) - Math.max(y1, item.y)
    if (horizontal > 0 && vertical > 0) best = Math.max(best, vertical)
  }
  return best
}

/**
 * Reads the trainer's plan table from the first page of the PDF: one row per exercise with its name,
 * sets, reps or time and weight, plus the link on the exercise name. Tempo, RIR and the Nr column are ignored.
 * Columns are found from the header labels' positions, so the order in which the PDF lists text does not matter.
 */
export function parsePlan(page: PdfPageContent): ParsePlanResult {
  const notAPlan = { ok: false, message: NOT_A_PLAN_MESSAGE } as const

  const nameHeader = page.items.find(i => fieldForHeader(i.str) === 'name')
  if (!nameHeader) return notAPlan
  const lines = groupLines(page.items)
  const headerLine = lines.find(line => line.includes(nameHeader))!
  // When a label repeats (the trainer adds "Ciężar T2", "Ciężar T3" for later sessions), only the leftmost
  // column is read; the others still take part in the layout so their values don't spill into it.
  const seen = new Set<PlanField>()
  const header = [...headerLine].sort((a, b) => a.x - b.x).flatMap((item) => {
    const field = fieldForHeader(item.str)
    if (!field) return []
    const first = !seen.has(field)
    seen.add(field)
    return [{ field: first ? field : null, item }]
  })
  if (!REQUIRED_FIELDS.every(f => seen.has(f))) return notAPlan
  const columns = columnsFromHeader(header)
  const columnFor = (item: PdfTextItem) => columns.find(c => center(item) >= c.from && center(item) < c.to)!.field

  const rawRows: RawRow[] = []
  for (const line of lines.slice(lines.indexOf(headerLine) + 1)) {
    const cells: Partial<Record<PlanField, string>> = {}
    const nameItems: PdfTextItem[] = []
    for (const item of [...line].sort((a, b) => a.x - b.x)) {
      const field = columnFor(item)
      if (!field) continue
      cells[field] = cells[field] ? `${cells[field]} ${item.str.trim()}` : item.str.trim()
      if (field === 'name') nameItems.push(item)
    }
    const onlyName = Object.keys(cells).every(f => f === 'name')
    const previous = rawRows[rawRows.length - 1]
    if (onlyName && previous && cells.name) {
      // A long name wrapped onto a second line of the same cell.
      previous.cells.name = `${previous.cells.name} ${cells.name}`
      previous.nameItems.push(...nameItems)
    }
    else if (cells.name) {
      rawRows.push({ cells, nameItems })
    }
  }
  if (!rawRows.length || rawRows.length > MAX_EXERCISES_PER_WORKOUT) return notAPlan

  const rows = rawRows.map(toPlanRow)
  for (const link of page.links) {
    if (!isHttpsUrl(link.url)) continue
    let bestRow = -1
    let bestOverlap = 0
    rawRows.forEach((raw, i) => {
      const overlap = linkOverlap(link, raw.nameItems)
      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestRow = i
      }
    })
    if (bestRow >= 0 && !rows[bestRow]!.videoUrl) rows[bestRow]!.videoUrl = link.url
  }
  return { ok: true, rows }
}

/**
 * Key for matching imported names to catalog exercises: the catalog's case- and whitespace-insensitive key,
 * with inner whitespace collapsed, a trailing "'s" and trailing punctuation removed ("Russian twist's" = "Russian twist").
 */
export function importNameKey(name: string): string {
  return exerciseNameKey(name)
    .replace(/\s+/g, ' ')
    .replace(/['’]s$/, '')
    .replace(/[\s.,;:!?'’"-]+$/, '')
}

/** Finds the catalog exercise an imported name refers to, if any. */
export function matchExercise<T extends { name: string }>(name: string, catalog: readonly T[]): T | undefined {
  const key = importNameKey(name)
  return catalog.find(e => importNameKey(e.name) === key)
}

/** The kind proposed for a new exercise: a time means timed, reps with a weight weight x reps, reps alone bodyweight. */
export function guessKind(row: Pick<PlanRow, 'reps' | 'durationS' | 'weightKg'>): ExerciseKind {
  if (row.durationS !== null) return 'timed'
  if (row.reps !== null && row.weightKg === null) return 'bodyweight'
  return 'weight_reps'
}

/** Whether the planned values can be used for an exercise of this kind (a time for timed or cardio, reps otherwise). */
export function planFitsKind(kind: ExerciseKind, row: Pick<PlanRow, 'reps' | 'durationS'>): boolean {
  if (kind === 'timed' || kind === 'cardio') return row.reps === null
  return row.durationS === null
}

/** The draft sets for a planned row: one per planned set (one if unknown), with the values the kind records. */
export function planSets(kind: ExerciseKind, row: Pick<PlanRow, 'sets' | 'reps' | 'durationS' | 'weightKg'>): SetValues[] {
  const fits = planFitsKind(kind, row)
  const values: SetValues = { weightKg: null, reps: null, durationS: null, distanceM: null }
  if (fits) {
    if (kind === 'weight_reps' || kind === 'bodyweight') {
      values.reps = row.reps
      values.weightKg = row.weightKg
    }
    else {
      values.durationS = row.durationS
    }
  }
  return Array.from({ length: row.sets ?? 1 }, () => ({ ...values }))
}

const newExerciseSchema = z.object({ name: exerciseNameSchema, kind: exerciseKindSchema })

/** One confirmed row of the review: an existing exercise or a new one, its imported video and its planned sets. */
export const confirmedRowSchema = z
  .object({
    exerciseId: z.number().int().positive().optional(),
    newExercise: newExerciseSchema.optional(),
    videoUrl: videoUrlSchema.optional(),
    // Set values are validated with the draft rules once each row's exercise kind is known.
    sets: z.array(z.unknown()),
  })
  .refine(r => (r.exerciseId === undefined) !== (r.newExercise === undefined), {
    message: 'Choose an existing exercise or create a new one',
    path: ['exerciseId'],
  })

/** What the review sends to the server when the user confirms the import. */
export const confirmedImportSchema = z.object({
  date: isoDateSchema,
  sessionType: z.enum(SESSION_TYPES, { error: 'Choose solo or trainer' }),
  rows: z
    .array(confirmedRowSchema)
    .min(1, 'The plan has no exercises')
    .max(MAX_EXERCISES_PER_WORKOUT, `At most ${MAX_EXERCISES_PER_WORKOUT} exercises per workout`),
})

export type ConfirmedImport = z.input<typeof confirmedImportSchema>
