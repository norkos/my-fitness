# Design

## Context

The apply cadence is written down in four places that have to agree: `openspec/config.yaml` (`operations.apply.guidance` and `rules.tasks`), `CLAUDE.md` (Workflow), the `diff-reviewer` agent description, and `agentic-SDLC.md` (section 3 and the diagram). `verifier` already supports targeted runs (a single unit/API file with `npx vitest run`, a single E2E file with `npm run test:e2e:local`), so no agent behavior has to change, only when it is called and with what. The generated `.claude/commands/opsx/*` and `.claude/skills/openspec-*` files are gitignored and don't mention either sub-agent, so they stay as they are.

## Goals / Non-Goals

**Goals:**
- One wording for each rule, the same in all four places.
- A per-group review trigger the apply agent can check from the changed paths alone.
- A spec split that changes no requirement text, so archive is a pure move.

**Non-Goals:**
- Changing `scripts/verify.mjs`, the `verifier` agent's commands, or CI.
- Rewording requirements while moving them.

## Decisions

**Per-group review trigger is path-based.** A group gets its own `diff-reviewer` run when it changes any file under `server/` or `shared/`, or `nuxt.config.ts`. `server/` holds the API, services, DB schema and migrations, the request guard, CSP and login throttling. `shared/` holds the validation rules the server enforces, including the https-only video link check used by the exercise forms and plan import. `nuxt.config.ts` wires the CSP header. Every change also gets one review of the whole diff (`git diff main...HEAD` plus uncommitted changes) in its final integration group. Rejected: leaving the per-group call to the agent's judgment, because "risky" is read differently each session and the cost would creep back. Also rejected: a list of individual `shared/` files, because it goes stale when validation lands in a new file (the first list missed `shared/exercises.ts` and `shared/plan-import.ts`).

**Targeted checks name files.** Each task's verification names the test files it relies on, and `verifier` runs those. When a group has no fitting file (config, docs), it runs `npm run verify` without E2E, which is cheap because it uses Haiku and prints one line per passing step. API test files need a fresh build, which `verifier` already handles. Rejected: dropping per-group checks entirely, because a broken early group then fails at the end and the fix cascades through later groups.

**Split by user-facing area, keeping `workout-logging`'s id.** The 10 requirements about a single workout (record, validate, last-time values, view, edit, delete, mobile inputs, status, exercise cards, unknown address) keep the existing capability id and Purpose. Drafts, gym mode and the home lists become `workout-drafts`, `gym-mode` and `workouts-home`. Each new delta carries a `## Purpose`, so archive creates the new main specs without a TBD placeholder. The delta files were generated from the current spec text, so the moved blocks match byte for byte. Rejected: renaming `workout-logging` to something narrower, because archived changes and issues refer to it by name.

**`Finish a draft` goes to `workout-drafts`, not `gym-mode`.** Finishing changes a draft's status and is reachable from the draft's lifecycle. Gym mode is only where the user usually triggers it. Rejected: putting it in `gym-mode`, because then a change to draft rules would need two specs.

**Practices live in `CLAUDE.md`, not in `openspec/config.yaml`.** The composable rule applies to any edit, inside OpenSpec or not. The model choice is a habit for the user starting each phase, not something the apply agent can act on. Rejected: memory files, because they are per machine and invisible to a fresh clone.

## Risks / Trade-offs

- [A UI-only group's bug is caught later, at the whole-change review or the final E2E run] → Each group still runs its own targeted tests, and the final group runs the full suite before the PR.
- [The new rule disagrees with an old doc somewhere, so the agent follows the stale one] → Tasks grep for "after each task group" and the old `verify` wording after the edits, and the search must come back empty.
- [The spec split drifts if `workout-logging` is changed by another change before archive] → No other change is in flight. Archive validates with `openspec validate --specs --strict`, which fails on a REMOVED requirement that no longer exists.
