# Tasks

## 1. Workout summary API

- [x] 1.1 Add `setCount: number` and `exerciseNames: string[]` to `WorkoutSummary` in `shared/workouts.ts`, and compute both in `listWorkouts` (`server/services/workouts.ts`) with correlated subqueries, names ordered by `workout_exercises.position`. Verify with `npm run typecheck`.
- [x] 1.2 Extend `test/api/workouts.test.ts`: a draft with Bench Press (3 sets), Squat (2) and Plank (1) reports 3 exercises, 6 sets and the names in order; a workout with no exercises reports 0 and `[]`; a renamed exercise shows its new name. Verify with `npm run build` then `npm run test:api`.

## 2. Theme, fonts and shell

- [x] 2.1 (Only after the font dependency is approved, otherwise skip to 2.2 with the system stack.) Install `@fontsource-variable/manrope` and `@fontsource-variable/dm-sans`, import only their latin and latin-ext subset CSS in `app/assets/css/main.css`, and set `--font-sans` and a heading font. Verify that `npm run build` emits the woff2 files under `.output/public/_nuxt/`.
- [x] 2.2 Define the `brand` green scale and the `--ui-bg`, `--ui-border`, `--ui-text` and `--ui-radius` overrides in `main.css`. Add `app/app.config.ts` (primary `brand`, card and button slot radii, `colorMode: false`) and a `nav` breakpoint at 600 px. Verify that the login and home screens render green primary buttons on #f8faf9 in a local `npm run dev` check.
- [x] 2.3 Rework `app/layouts/default.vue`: on wide screens, the header shows the brand, Workouts, Exercises and Log out; below 600 px, the header shows the brand and Log out and a fixed bottom nav uses safe-area padding. Main is `max-w-[744px]` with 32 px gutters (21 px on phones) and bottom padding to clear the nav. Add `viewport-fit=cover` in `nuxt.config.ts`. Keep the `nav-workouts`, `nav-exercises` and `logout` testids.
- [x] 2.4 Add `app/components/AppSheet.vue` (a `UModal` wrapper: bottom sheet with handle below 600 px, centered `max-w-md` above), and move `SwapExerciseModal`, `WorkoutDeleteButton` and the exercise edit dialog onto it. Verify that the existing swap and delete E2E specs pass.
- [x] 2.5 Add `e2e/mobile-shell.spec.ts` at 360 px: the bottom nav is visible and the header nav hidden; the active item follows the route, including gym mode; the delete confirmation opens bottom-anchored; Escape returns focus to the opener; there is no horizontal overflow (`scrollWidth <= clientWidth`); and every visible button and link is at least 44 px high on the home, exercises, editor and gym screens. Add a 1024 px case where the header nav is shown and no bottom bar. Verify with `npm run test:e2e:local -- e2e/mobile-shell.spec.ts`.
- [x] 2.6 Add a short "UI conventions" note to `DEVELOPMENT.md` (tokens location, 600 px shell breakpoint, `AppSheet` for every dialog, 12 px text floor, fonts self-hosted).

## 3. Workouts home

- [x] 3.1 Add `app/components/WorkoutCard.vue` with two variants. Planned: date icon, date, session badge, "N exercises · M sets", the first three names plus "+N more", and Edit plan (`/workouts/:id/edit`) and Start in gym (`/workouts/:id/gym`). History: a row linking to `/workouts/:id` with the same meta line. Keep the `planned-item`, `workout-item` and `*-date`/`*-count` testids.
- [x] 3.2 Rewrite `app/pages/index.vue`: a heading with New workout, then the Plan workout and Import plan (PDF) secondary actions, then `UTabs` for Planned and History with counts, bound to `?tab=` (default `planned` when drafts exist, else `history`) and updated with `router.replace`, then per-tab empty states.
- [x] 3.3 Update `e2e/home.spec.ts` and `e2e/planned.spec.ts` (and the helpers that expect both lists visible) to cover the tab default with and without drafts, the counts in the tab labels, the preview with four exercises showing "+1 more", Start in gym opening gym mode, and Back from a workout keeping History selected. Verify with `npm run test:e2e:local -- e2e/home.spec.ts e2e/planned.spec.ts`.

## 4. Editor, gym mode and progress sheet

- [x] 4.1 Extract the body of `app/pages/exercises/[id].vue` into `app/components/ExerciseProgress.vue` (with a prop that disables history links). The page keeps rendering it, and `ExerciseProgressSheet.vue` shows it in `AppSheet`. Verify that `e2e/progress.spec.ts` still passes unchanged.
- [x] 4.2 Add `app/components/ExerciseCardHeader.vue` (a two-digit number, name, kind, progress shortcut that opens the sheet, `VideoLink`) and use it in `WorkoutForm.vue` and `gym.vue`. Restyle the set rows and the Add set, Swap and Remove actions to the card layout, and make Solo / With trainer a segmented control that keeps `role="radio"` and its testids.
- [x] 4.3 Below 600 px, put the editor's Save and gym mode's Finish in a sticky bar offset above the bottom nav. Confirm that saving, retry, the unsaved-change warning, stale-write rejection and restore after reload are untouched (no edits to `useDraftSaving.ts`).
- [x] 4.4 Extend `e2e/workouts.spec.ts` and `e2e/workouts-gym.spec.ts` at 360 px: the card shows 02, the name, last-time values and the progress shortcut. Typed unsaved values survive opening and closing the progress sheet in the new-workout editor, and ticked sets survive it in gym mode. Reps of 8.5 highlight that field and keep the input. Finish can be clicked after scrolling to the last set. Verify with `npm run test:e2e:local -- e2e/workouts.spec.ts e2e/workouts-gym.spec.ts`.

## 5. Exercises screen

- [x] 5.1 Rewrite `app/pages/exercises/index.vue`: a heading with Add exercise opening an `AppSheet` form (name, kind, optional video), a search field with Clear, a "N exercises" caption, and rows with a kind icon, name and kind, plus Video, Progress (`/exercises/:id`) and Edit. Add an empty state with Clear search when nothing matches. Keep the `exercise-*` testids; `exercise-create-form` moves into the sheet.
- [x] 5.2 Update `e2e/exercises.spec.ts` (and any helper that creates exercises through the inline form): adding through the dialog with an `https://example.com/...` video; a duplicate keeps the dialog open with the name error; searching "bench" filters case-insensitively; "zzz" shows the empty state and Clear restores the list. Verify with `npm run test:e2e:local -- e2e/exercises.spec.ts`.

## 6. Integration

- [x] 6.1 Run the `verifier` sub-agent with `npm run verify -- --e2e` and confirm that hygiene, lint, typecheck, build, unit, API and the full E2E suite pass.
- [x] 6.2 Manually check at 360 and 390 px with Playwright screenshots of home (both tabs), the exercises screen with a sheet open, the editor and gym mode, and compare them against the prototype for spacing, colors and type. Confirm that the network tab shows no third-party requests.

## Workflow follow-up

- Keep `Fitness Mobile App UX.zip` and `figma-implementation-guide.md` out of git (reference only; they hold the prototype's sample names and the repo URL); ask before adding them to `.gitignore`.
- Archive with `/opsx:archive` after review.
