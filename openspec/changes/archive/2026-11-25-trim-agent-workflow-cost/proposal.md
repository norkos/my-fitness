# Proposal

## Why

Each feature built with Claude pays for repeated work that rarely finds anything new. `diff-reviewer` starts cold after every task group and re-reads the same code. `verifier` builds and runs the full suite, E2E included for UI groups, after every group. Almost every propose and archive loads `workout-logging`, the largest spec (18.7 KB, 21 of the project's 58 requirements), even when the change touches only a part of it. Cutting these costs now keeps the upcoming roadmap items (#7–#14) cheaper to build.

## What Changes

- **Review once per change**: `diff-reviewer` runs once on the whole change, in the final integration group. It also runs after an individual task group when that group touches `server/` (API, services, DB schema and migrations, request guard, CSP), `shared/` (validation rules the server enforces) or `nuxt.config.ts` (CSP header wiring).
- **Targeted checks per group, full suite once**: before a task group is marked done, `verifier` runs only the checks for that group (its unit or API test files, its E2E spec files, or `npm run verify` without E2E when no targeted file fits). The full `npm run verify -- --e2e` runs once, in the final integration group.
- **Split `workout-logging`** into four capabilities by user-facing area. Requirement and scenario text moves unchanged:
  - `workout-logging` keeps recording, validating, viewing, editing and deleting a workout (10 requirements)
  - `workout-drafts`: creating, finishing and repeating drafts (3)
  - `gym-mode`: performing a draft at the gym, with autosave and swaps (4)
  - `workouts-home`: the Planned and History lists, their tabs and the summaries they show (4)
- **Record two practices in `CLAUDE.md`**: when a change touches a large page (`gym.vue`, `WorkoutForm.vue`, `import.vue`), move the logic it touches into a composable. Use Opus for explore and propose, and Sonnet for applying a clear `tasks.md`.
- Update everything that describes the old cadence: `openspec/config.yaml` (apply guidance and the `tasks` rule), `CLAUDE.md`, the `diff-reviewer` description, and `agentic-SDLC.md`.

## Capabilities

### New Capabilities
- `workout-drafts`: planning a workout ahead as a draft, editing it, finishing it into a done workout, and starting a draft from a done workout.
- `gym-mode`: performing a draft at the gym: ticking and adjusting sets, autosaving every change, and swapping exercises.
- `workouts-home`: the Workouts home screen: the Planned and History tabs, their cards, and the workout summaries they are built from.

### Modified Capabilities
- `workout-logging`: 11 requirements move out to the three new capabilities, with text unchanged. No behavior changes.

## Out of scope

- Any change to app code, tests or app behavior.
- Extracting composables now (5a is recorded as a practice only), and deciding between the `/opsx:*` commands and the `openspec-*` skills.
- Splitting other specs, and changing the OpenSpec phases or which changes go through OpenSpec.

## Open questions

- **Final check for this change**: this change touches only docs, config and specs, so the final group runs `npm run verify` and `openspec validate --strict` without E2E. Say if you want E2E run anyway.

## Impact

- `openspec/config.yaml`, `CLAUDE.md`, `.claude/agents/diff-reviewer.md`, `agentic-SDLC.md`.
- `openspec/specs/`: `workout-logging` shrinks. `workout-drafts`, `gym-mode` and `workouts-home` are created when the change is archived.
- Sub-agent changes take effect in a new session (or after `/agents`).
