// Fails when the repository would contain data it must not: real video links, Polish text in code and
// tests (only the trainer's PDF header labels are allowed), plan PDFs other than the generated fixture,
// environment files, or terms from a private, untracked blocklist.
//   node scripts/check-repo-hygiene.mjs           all tracked and new (not ignored) files
//   node scripts/check-repo-hygiene.mjs --staged  only files staged for commit (pre-commit hook)
// Private terms (names, IDs) go one per line into `.hygiene-blocklist` in the repo root; that file is
// gitignored, so the terms themselves never enter the repository.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const staged = process.argv.includes('--staged')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' })

const files = (staged
  ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR')
  : git('ls-files', '--cached', '--others', '--exclude-standard')
).split('\n').filter(Boolean)

/** Where code and test data must be English. */
const ENGLISH_ONLY = /^(app|server|shared|test|e2e|scripts)\//
/** Lines allowed to contain Polish: the trainer's PDF header labels and the PDF generator's letter map. */
const POLISH_ALLOWED_LINE = /ciężar|ćwiczenia|const POLISH/i
const POLISH_LETTERS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/
const VIDEO_LINK = /youtube\.com\/(watch|shorts|embed)|youtu\.be\//i
const ALLOWED_PDFS = new Set(['e2e/fixtures/trainer-plan.pdf'])
const TEXT_FILE = /\.(ts|mts|mjs|js|vue|json|md|ya?ml|css|html|sql|txt)$/i

const blocklist = existsSync('.hygiene-blocklist')
  ? readFileSync('.hygiene-blocklist', 'utf8').split(/\r?\n/).map(t => t.trim().toLowerCase()).filter(t => t && !t.startsWith('#'))
  : []

const problems = []
for (const file of files) {
  if (!existsSync(file)) continue
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.env.example')) problems.push(`${file}: environment files must not be committed`)
  if (/\.pdf$/i.test(file) && !ALLOWED_PDFS.has(file)) problems.push(`${file}: only the generated fixture PDF may be committed (real plans contain real data)`)
  if (!TEXT_FILE.test(file) || file === 'package-lock.json' || file.startsWith('openspec/changes/archive/')) continue

  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`
    if (VIDEO_LINK.test(line)) problems.push(`${where}: real video link; use https://example.com/videos/...`)
    if (ENGLISH_ONLY.test(file) && POLISH_LETTERS.test(line) && !POLISH_ALLOWED_LINE.test(line)) {
      problems.push(`${where}: Polish text in code or tests; use English names`)
    }
    const lower = line.toLowerCase()
    for (const term of blocklist) {
      if (lower.includes(term)) problems.push(`${where}: contains a term from .hygiene-blocklist`)
    }
  })
}

if (problems.length) {
  console.error(`Repository hygiene check failed (${problems.length}):`)
  for (const p of problems.slice(0, 50)) console.error(`  ${p}`)
  if (problems.length > 50) console.error(`  ...and ${problems.length - 50} more`)
  process.exit(1)
}
console.log(`Repository hygiene OK (${files.length} files checked${blocklist.length ? `, ${blocklist.length} private terms` : ''}).`)
