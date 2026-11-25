## 1. Shared helpers and composable

- [x] 1.1 Add `formatLastTimeSets` to `shared/format.ts` (weight x reps as "8 kg × 15", other kinds as `formatSet`, joined by " · ") and `fieldHeader` and `gymFieldsForKind` (weight before reps) to `shared/set-form.ts`, with unit tests in `test/unit/format.test.ts` and a new `test/unit/set-form.test.ts`. Reuse the versions in commit 9520500 (`git show 9520500 -- shared test/unit`). Targeted check: `npx vitest run test/unit/format.test.ts test/unit/set-form.test.ts`.
- [x] 1.2 Create `app/composables/useLastTimes.ts` (`lastTimes`, `loadLast(entryKey, exerciseId, beforeDate)`) and use it in `app/pages/workouts/[id]/gym.vue`, replacing the inline state and loader (the swap flow keeps working). Targeted check: `npm run lint` and `npm run typecheck`.

## 2. Components

- [x] 2.1 `LastTimeBox.vue`: show `Last time: <formatLastTimeSets>` (no date) or "No previous record". `GymSetGrid.vue`: use `gymFieldsForKind` and `fieldHeader`, grid gap 10 px (`gap-2.5`) on header and rows. Targeted check: `npm run lint` and `npm run typecheck`.
- [x] 2.2 README: add the done-check bullet to "Deliberate deviations from the design" (brand green #278054, white check at 4.5:1); roadmap #8 stays ticked. Targeted check: `npm run hygiene`.

## 3. E2E

- [x] 3.1 In `e2e/workouts-gym.spec.ts` update the last-time assertions to the new text (e.g. "Last time: 8 kg × 15") and change the bodyweight case to header `SET +KG REPS DONE` with inputs ordered weight then reps, at 360 px. Targeted check: `npm run test:e2e:local -- e2e/workouts-gym.spec.ts`; also run `e2e/mobile-shell.spec.ts` and `e2e/workouts.spec.ts` (editor format unchanged).

## 4. Integration

- [x] 4.1 Stop any running app server, then `npm run build && npm run screenshots`. Keep only `docs/screenshots/gym-mode.png` if others change only by rendering noise; restore those with `git checkout`.
- [x] 4.2 Run `diff-reviewer`-style review of the whole change (`git diff origin/main`), fix blocking findings.
- [x] 4.3 Run `npm run verify -- --e2e` and `openspec validate refine-gym-set-grid --strict`; both must pass.
