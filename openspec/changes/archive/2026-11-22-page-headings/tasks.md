# Tasks

## 1. Shared heading and count row components

- [x] 1.1 Add `app/components/PageHeader.vue`: props `eyebrow`, `title`, `subtitle`; default slot on the right for the action (kept on one row with `gap-3`, wrapping cleanly at 360 px). Eyebrow: 12 px, uppercase, `tracking-[0.13em]`, medium weight, `text-muted`. Title: `<h1>` in the heading font, `text-3xl font-bold tracking-tight text-highlighted`, followed by `<span aria-hidden="true" class="text-primary">.</span>`. Subtitle: `<p>` at 12 px+ (`text-xs` is 12 px), `text-muted`. Test ids `page-eyebrow`, `page-subtitle`. Verify with `npm run verify` (lint + typecheck).
- [x] 1.2 Add `app/components/ListCountRow.vue`: props `label`, `count`, `noun` (singular, e.g. `workout`); renders a flex row with the uppercase label left (12 px, tracked, medium, `text-muted`) and `"{count} {noun}"` / `"{count} {noun}s"` right (12 px, `text-muted`), test id `list-count` on the count text. Verify with `npm run verify`.

## 2. Workouts home

- [x] 2.1 In `app/pages/index.vue`, replace the title row with `PageHeader` (eyebrow "YOUR GYM NOTEBOOK", title "Workouts", subtitle "Plan your session. Log your progress.") holding the existing "New workout" button in its slot; keep `data-testid="new-workout"`.
- [x] 2.2 Above the planned list (only when `planned.length`) add `ListCountRow` "READY WHEN YOU ARE" / `workout`; above the history list (only when `history.length`) add "YOUR PREVIOUS SESSIONS" / `workout`. Empty states unchanged.
- [x] 2.3 E2E in `e2e/home.spec.ts` (phone viewport): heading named exactly "Workouts" (dot not in the accessible name), eyebrow and subtitle text; Planned count "2 workouts" with two drafts; History count "1 workout" with one finished workout; no `list-count` when Planned is empty. Run `npm run test:e2e:local -- e2e/home.spec.ts` via the `verifier` sub-agent.

## 3. Exercises

- [x] 3.1 In `app/pages/exercises/index.vue`, replace the title row with `PageHeader` (eyebrow "YOUR EXERCISE LIBRARY", title "Exercises", subtitle "Your movements, last time's numbers, and progress.") holding the existing "Add exercise" button; keep `data-testid="exercise-add"`.
- [x] 3.2 Replace the `exercise-count` paragraph under the search with `ListCountRow` "YOUR EXERCISES" / `exercise` fed by `filtered.length`, placed between the search and the list and hidden while the no-match state shows; keep `data-testid="exercise-count"` on the count text so existing assertions keep their target. Remove the now-unused `countLabel`.
- [x] 3.3 Update `e2e/exercises.spec.ts` count assertions as needed and add: heading "Exercises" with eyebrow/subtitle; searching "squat" over "Bench press", "Back squat", "Plank" shows "1 exercise". Run that spec via `verifier`.

## 4. Gym mode

- [x] 4.1 In `app/pages/workouts/[id]/gym.vue`, put `PageHeader` (eyebrow "FOLLOW YOUR PLAN", title "Gym mode", subtitle "Adjust the numbers. Tick the sets you actually do.") at the top, then a row with the formatted workout date (`data-testid="gym-date"`, no longer an `<h1>`) and the `SessionBadge`, then the existing `save-status` line unchanged.
- [x] 4.2 E2E in `e2e/workouts-gym.spec.ts`: a level-one heading named "Gym mode", the workout date in `gym-date`, `session-badge` and `save-status` visible below it. Check no other spec relied on the date being the `<h1>` (`grep -n "heading" e2e/*.ts`). Run that spec via `verifier`.

## 5. Readability audit and docs

- [x] 5.1 Extend the phone audit in `e2e/mobile-shell.spec.ts`: on home, Exercises and gym mode, `page-eyebrow`, `page-subtitle` and every `list-count` row compute a font size of at least 12 px. Run it via `verifier`.
- [x] 5.2 In `README.md`, tick "Page headings and section labels" under Roadmap › Visual alignment. Refresh the README screenshots only if they show these headers and the user wants that (ask; do not regenerate silently). Verify `npm run hygiene` passes.

## 6. Integration

- [x] 6.1 Run the `verifier` sub-agent with `npm run verify -- --e2e` and confirm every step passes.
- [x] 6.2 Run `openspec validate page-headings --strict` and confirm it passes.

## Workflow follow-up

- Archive with `/opsx:archive` after the change is committed.
- Next roadmap item: "Workouts home: tabs sized to their text, Edit plan link, Start in gym button, history cards".
