# Tasks

## 1. Review and check cadence

- [x] 1.1 In `openspec/config.yaml`, replace the "After each task group, run the diff-reviewer…" apply guidance with the once-per-change review plus the per-group trigger from design.md (`server/`, `shared/`, `nuxt.config.ts`). Verify with `openspec instructions apply --change trim-agent-workflow-cost --json`, which must print the new guidance.
- [x] 1.2 In `openspec/config.yaml`, change the first `rules.tasks` entry to: each group carries its own tests and docs, and each task names the test files that verify it. Change the second entry to: the final integration group runs the whole-change `diff-reviewer` and `npm run verify -- --e2e`. Verify with `openspec instructions tasks --change trim-agent-workflow-cost --json`, which must print both rules.
- [x] 1.3 In `CLAUDE.md` (Workflow), replace the "run the `diff-reviewer` sub-agent after each task group, and `verifier` before marking a group done" line with the same rules in one or two lines: targeted `verifier` checks per group, review per group only for the trigger paths, whole-change review and full suite at the end. Verify by reading the Workflow section against design.md.
- [x] 1.4 In `.claude/agents/diff-reviewer.md`, change the description's "Use after each task group during /opsx:apply, not only at the end" to the new trigger (whole change in the final group, plus groups touching the trigger paths). Leave the agent's body unchanged. Verify by reading the frontmatter.
- [x] 1.5 In `agentic-SDLC.md`, update the diagram (`apply (per task group)` branch), section 3 steps 2–3, and the "Running checks yourself" table if needed, to the new cadence. Verify by reading section 3 against design.md.
- [x] 1.6 Verify that `git grep -n -i "after each task group"` and `git grep -n "npm run verify\` (add"` return nothing outside `openspec/changes/`, then run `verifier` (`npm run verify`, no E2E: docs and config only).

## 2. Practices in CLAUDE.md

- [x] 2.1 Add a short "Practices" section to `CLAUDE.md` with two lines. First: when a change touches a large page (`app/pages/workouts/[id]/gym.vue`, `app/components/WorkoutForm.vue`, `app/pages/workouts/import.vue`), move the logic it touches into a composable in `app/composables/`. Second: use Opus for `/opsx:explore` and `/opsx:propose`, and Sonnet for `/opsx:apply` when `tasks.md` is clear. Verify by reading the section and running `npm run hygiene`.

## 3. Spec split check

- [x] 3.1 Confirm the delta specs still match the main spec: every `### Requirement:` block under ADDED in `specs/workout-drafts`, `specs/gym-mode` and `specs/workouts-home` is identical to its block in `openspec/specs/workout-logging/spec.md`, and the REMOVED list names exactly those 11 requirements. Verify with `openspec validate trim-agent-workflow-cost --strict` and a text diff of each moved block.

## 4. Integration

- [x] 4.1 Run `diff-reviewer` once on the whole change (`git diff main...HEAD` plus uncommitted changes) and fix blocking or important findings.
- [x] 4.2 Run `verifier` with `npm run verify` and run `openspec validate --specs --strict`. E2E is skipped because no app code, tests or E2E specs change (see proposal, Open questions).

## Workflow follow-up

- Start a new session (or run `/agents`) so the updated `diff-reviewer` description is loaded.
- `/opsx:archive`: after the specs sync, check that `openspec/specs/workout-drafts`, `gym-mode` and `workouts-home` have their Purpose (not a TBD placeholder) and that `workout-logging` lists the 10 kept requirements. Then run `openspec validate --specs --strict` and `npm run hygiene`.
