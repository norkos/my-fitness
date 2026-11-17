// Runs every local check in order and prints one line per step; the full output only for a failing step.
//   npm run verify            hygiene, lint, typecheck, build, unit + API tests
//   npm run verify -- --e2e   ...then the E2E suite against the fresh build (scripts/e2e-local.mjs --no-build)
import { spawn } from 'node:child_process'

const withE2e = process.argv.includes('--e2e')

/**
 * Runs npm without a shell: through npm's own JS entry point when started via `npm run` (no quoting issues with
 * paths such as "C:\Program Files"); otherwise a fixed `npm ...` command line, which never contains user input.
 */
function npm(args) {
  const cli = process.env.npm_execpath
  if (cli && cli.endsWith('.js')) return { cmd: process.execPath, args: [cli, ...args], shell: false }
  return { cmd: `npm ${args.join(' ')}`, args: [], shell: true }
}

const steps = [
  { name: 'hygiene', cmd: process.execPath, args: ['scripts/check-repo-hygiene.mjs'] },
  { name: 'lint', ...npm(['run', 'lint']) },
  { name: 'typecheck', ...npm(['run', 'typecheck']) },
  { name: 'build', ...npm(['run', 'build']) },
  // Keeps the "Tests", "Test Files" and coverage total lines of a passing run.
  { name: 'unit + API', ...npm(['test']), keep: /^\s*(Test Files|Tests)\s|^All files/ },
]
if (withE2e) steps.push({ name: 'e2e', cmd: process.execPath, args: ['scripts/e2e-local.mjs', '--no-build'], keep: /passed|failed|flaky|skipped/ })

function run({ cmd, args, shell = false }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { shell, env: { ...process.env, FORCE_COLOR: '0' } })
    let output = ''
    child.stdout.on('data', (d) => { output += d })
    child.stderr.on('data', (d) => { output += d })
    child.on('close', code => resolve({ code, output }))
  })
}

// eslint-disable-next-line no-control-regex
const plain = text => text.replace(/\u001B\[[0-9;]*m/g, '')

for (const step of steps) {
  const started = Date.now()
  const { code, output } = await run(step)
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  const lines = plain(output).split(/\r?\n/)
  if (code !== 0) {
    console.log(`✗ ${step.name} (${seconds}s)\n`)
    console.log(lines.filter(l => l.trim()).slice(-120).join('\n'))
    process.exit(code ?? 1)
  }
  const kept = step.keep ? lines.filter(l => step.keep.test(l)).map(l => `    ${l.trim()}`) : []
  console.log([`✓ ${step.name} (${seconds}s)`, ...kept].join('\n'))
}
console.log('All checks passed.')
