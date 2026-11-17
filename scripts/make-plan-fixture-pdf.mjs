// Generates the synthetic trainer plan used by the tests. It mimics the trainer's spreadsheet export
// (same columns, one row per exercise, links on exercise names) but every value and link is made up.
//   node scripts/make-plan-fixture-pdf.mjs e2e/fixtures/trainer-plan.pdf
import { writeFileSync } from 'node:fs'

const output = process.argv[2]
if (!output) {
  console.error('Usage: node scripts/make-plan-fixture-pdf.mjs <out.pdf>')
  process.exit(1)
}

const TITLE = 'Plan treningowy'
const HEADER = ['Nr.', 'Nazwa Ćwiczenia', 'Serie', 'Ruchy', 'Tempo', 'RIR', 'Ciężar T1']
// [number, name, sets, reps, tempo, rir, weight, link]. Row 3b has no video on purpose.
const ROWS = [
  ['1a', 'Wyciskanie hantli leżąc', '4', '10', '3010', '2', '12,5kg', 'https://example.com/videos/dumbbell-press'],
  ['1b', 'Wiosłowanie hantlem w opadzie', '3', '10', '2011', '2', '20kg', 'https://example.com/videos/dumbbell-row'],
  ['2a', 'Rozpiętki na ławce płaskiej', '3', '15', '2010', '1', '6/8kg', 'https://example.com/videos/flyes'],
  ['2b', 'Wykroki z hantlami', '3', '10', '2010', '2', '10kg', 'https://example.com/videos/lunges'],
  ['3a', 'Wznosy boczne', '3', '15', '2010', '1', '4kg', 'https://example.com/videos/lateral-raise'],
  ['3b', 'Uginanie przedramion z hantlami', '3', '10', '3010', '1', '8kg', null],
  ['4a', 'Deska', '3', '40s', '2010', '1', '40s', 'https://example.com/videos/plank'],
  ['4b', "Russian twist's", '3', '20s', 'ISO', '1', '20s', 'https://example.com/videos/russian-twist'],
]

// Column centers (PDF units, landscape A4) and line positions, close to the original export.
const COLUMN_X = [73, 212, 374, 490, 583, 676, 768]
const TITLE_Y = 534
const HEADER_Y = 524
const ROW_STEP = 9.64
const FONT_SIZE = 8

// Helvetica with WinAnsi plus the Polish letters mapped onto free codes, so text extracts as proper Unicode.
const POLISH = { 'Ć': 'Cacute', 'ć': 'cacute', 'ę': 'eogonek', 'ą': 'aogonek', 'ł': 'lslash', 'Ł': 'Lslash', 'ż': 'zdotaccent', 'ź': 'zacute', 'ś': 'sacute', 'ń': 'nacute', 'ó': 'oacute' }
const POLISH_CODES = Object.fromEntries(Object.keys(POLISH).map((ch, i) => [ch, 0x80 + i]))

function pdfString(text) {
  let out = ''
  for (const ch of text) {
    if (ch in POLISH_CODES) out += `\\${POLISH_CODES[ch].toString(8)}`
    else if ('()\\'.includes(ch)) out += `\\${ch}`
    else out += ch
  }
  return `(${out})`
}

// Rough Helvetica width (average glyph ~0.52 em); only used to center text and size link rectangles.
const textWidth = text => [...text].length * FONT_SIZE * 0.52

const ops = []
const annotations = []
function text(str, centerX, y) {
  const x = centerX - textWidth(str) / 2
  ops.push(`BT /F1 ${FONT_SIZE} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(str)} Tj ET`)
  return x
}

text(TITLE, 420, TITLE_Y)
HEADER.forEach((label, i) => text(label, COLUMN_X[i], HEADER_Y))
ROWS.forEach((row, r) => {
  const y = HEADER_Y - ROW_STEP * (r + 1)
  row.slice(0, 7).forEach((cell, i) => {
    const x = text(cell, COLUMN_X[i], y)
    if (i === 1 && row[7]) annotations.push({ url: row[7], rect: [x, y - 1.4, x + textWidth(cell), y + 5.9] })
  })
})

const content = ops.join('\n')
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> /Annots [${annotations.map((_, i) => `${6 + i} 0 R`).join(' ')}] >>`,
  `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [128 ${Object.values(POLISH).map(n => `/${n}`).join(' ')}] >> >>`,
  ...annotations.map(a => `<< /Type /Annot /Subtype /Link /Rect [${a.rect.map(n => n.toFixed(2)).join(' ')}] /Border [0 0 0] /A << /S /URI /URI ${pdfString(a.url)} >> >>`),
]

let pdf = '%PDF-1.4\n'
const offsets = []
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf, 'latin1'))
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
})
const xref = Buffer.byteLength(pdf, 'latin1')
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
writeFileSync(output, Buffer.from(pdf, 'latin1'))
console.log(`Wrote ${output}`)
