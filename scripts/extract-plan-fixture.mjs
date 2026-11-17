// Regenerates the parser fixture from a plan PDF, using the same conversion as the browser:
//   node scripts/extract-plan-fixture.mjs e2e/fixtures/trainer-plan.pdf test/unit/fixtures/plan-example.json
import { readFileSync, writeFileSync } from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
// Node strips the TypeScript types; the file has no imports of its own.
import { toPageContent } from '../shared/pdf-content.ts'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('Usage: node scripts/extract-plan-fixture.mjs <plan.pdf> <out.json>')
  process.exit(1)
}

// verbosity 0: Node has no standard font files; the text and links are read without them.
const task = getDocument({ data: new Uint8Array(readFileSync(input)), verbosity: 0 })
const doc = await task.promise
const page = await doc.getPage(1)
const [text, annotations] = await Promise.all([page.getTextContent(), page.getAnnotations()])
writeFileSync(output, `${JSON.stringify(toPageContent(text.items, annotations), null, 2)}\n`)
await task.destroy()
console.log(`Wrote ${output}`)
