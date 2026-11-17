# Tasks

## 1. Data model

- [x] 1.1 Add `workouts.status` (default `done`), `sets.completed` (default true), `exercises.video_url` (nullable) and an index on `workouts(status, date)` to `server/db/schema.ts`, add `WORKOUT_STATUSES` to `shared/kinds.ts`, and generate migration `0001` with `npm run db:generate`; verify with a DB unit test that migrating a database holding v1 data leaves every existing workout `done` with completed sets
- [x] 1.2 Verify `npm run typecheck` passes with the new columns

## 2. Workout status, finish and done-only queries (spec: workout-logging, progress-tracking)

- [x] 2.1 Extend `validateWorkout` in `shared/workouts.ts` with a `mode` (`draft` | `done`) where draft skips the required-value check, and accept an optional `completed` per set; verify with new cases in `test/unit/workout-validation.test.ts` (draft with missing weight passes, negative value still fails in draft)
- [x] 2.2 Make `createWorkout` accept an optional `status` (default done, new drafts store sets as not completed), make `replaceWorkout` keep the stored status and validate by it, and return `status` and per-set `completed` from `getWorkout` and `listWorkouts`; verify in `test/unit/workouts-service.test.ts`
- [x] 2.3 Add `finishWorkout` (draft only: drop uncompleted sets and empty exercises, validate as done, refuse when nothing is completed, set status in one transaction) and `POST /api/workouts/:id/finish`; verify with service tests for the three finish scenarios and an API test in `test/api/workouts.test.ts`
- [x] 2.4 Filter `getLastTime` and `getExerciseProgress` to done workouts; verify with the "Drafts are ignored", "Planned only" and "Draft excluded" scenarios in the workouts and progress service tests

## 3. Exercise video link and swap data (spec: exercise-catalog)

- [x] 3.1 Add an optional `videoUrl` (https only, at most 2048 characters, empty string becomes null) to exercise create/update schemas in `shared/exercises.ts` and the exercises service, and return it from the list, detail and workout detail responses; verify with schema unit tests (including `javascript:` and `http:` rejected) and API tests
- [x] 3.2 Add `lastDoneOn` (latest done-workout date or null) to `GET /api/exercises`; verify with a service test where a draft does not affect `lastDoneOn`
- [x] 3.3 Add a `VideoLink` component (opens in a new tab with `rel="noopener noreferrer"`) and show it in the exercises list, workout view and workout form, plus a video URL field on the exercise edit screen; verify with an E2E case in `e2e/exercises.spec.ts` that adds a link and sees the control open a new tab

## 4. Plan parser and name matching (spec: plan-import)

- [x] 4.1 Add `pdfjs-dist` and a client helper `app/utils/pdf-extract.ts` that lazily loads it with a same-origin `workerSrc` (pdf.js 6 has no eval to disable) and returns page-1 text items (string, x, y) and link annotations (url, rect); verify by extracting `e2e/fixtures/trainer-plan.pdf` in a small script and committing the output as `test/unit/fixtures/plan-example.json`
- [x] 4.2 Implement `parsePlan` in `shared/plan-import.ts` (one constant mapping the PDF's Polish header labels to English field names, with no Polish identifiers elsewhere; header detection, column boundaries from header x positions, row grouping by y, cell parsing for sets, reps, `Ns` durations, `12,5kg` and `6/8kg` weights, link assignment by rectangle overlap, https-only links); verify with `test/unit/plan-import.test.ts` covering all eight fixture rows with their links, a blank cell, a missing link and a "not a plan" input
- [x] 4.3 Implement `importNameKey` and the kind guess (reps + weight means weight x reps, reps only means bodyweight, duration means timed) in `shared/plan-import.ts`; verify with unit tests for " deska " vs "Deska" and "Russian twist's" vs "Russian twist"

## 5. Plan import API (spec: plan-import)

- [x] 5.1 Add a zod schema for the confirmed import and `POST /api/plan-imports`, which in one transaction creates the new exercises, sets `video_url` only where it is null, and creates the draft; verify with API tests for a successful import, an existing video kept, a duplicate new name rejected with nothing created, and an unauthenticated request rejected

## 6. Drafts on the home screen and draft editing (spec: workout-logging)

- [x] 6.1 Split the home page into a Planned section (drafts, date ascending, hidden when empty) and history (done only, keeping the existing empty state); verify with an E2E case in `e2e/home.spec.ts`
- [x] 6.2 Add "New draft" using `WorkoutForm` in draft mode (missing values allowed) and let a draft open in the edit screen as a draft with actions "Start in gym" and "Delete"; verify with an E2E case that creates, edits and deletes a draft

## 7. Gym mode and swap (spec: workout-logging)

- [x] 7.1 Build the gym mode page `app/pages/workouts/[id]/gym.vue` with per-set done toggles, editable values, last-time values and video links per exercise, adding and removing sets, and a numeric keyboard at 360 px width; verify with an E2E case that ticks a set with changed reps and checks the values after a reload
- [x] 7.2 Add the save queue from design D6 (debounce, one request at a time, retry with backoff, Saved / Saving / Not saved indicator, leave-page confirmation while unsaved) as a composable; verify with unit tests for ordering and retry using a mocked fetch, and an E2E case that blocks the API route and sees "Not saved", then sees it saved after unblocking
- [x] 7.3 Add the swap dialog (exclude exercises already in the draft, sort by `lastDoneOn` then alphabetically, name search, same-kind keeps sets, otherwise last-time values or one empty set, confirm when a set is already done); verify with unit tests for the ordering and set-carry logic and an E2E swap case
- [x] 7.4 Add "Finish workout" in gym mode calling the finish endpoint, showing validation errors on the affected sets and opening the done workout on success; verify with an E2E case that finishes a partly done draft and finds it in history with only the done exercises

## 8. Import page (spec: plan-import)

- [x] 8.1 Build `app/pages/workouts/import.vue`: file picker (PDF only), extraction and parsing, a "could not read as a plan" message, and a review list showing each row's values, video, match state, a create/link choice for unmatched rows with an editable kind, and a kind-conflict warning, plus date (tomorrow) and session type (trainer) fields; confirm posts to `/api/plan-imports` and opens the new draft; verify with an E2E case in `e2e/import.spec.ts` that imports the synthetic plan `e2e/fixtures/trainer-plan.pdf` (generated by `scripts/make-plan-fixture-pdf.mjs`, made-up values and links) and sees eight exercises under Planned
- [x] 8.2 Add an "Import plan" entry point on the home screen next to "New draft"; verify that it navigates to the import page in the E2E case

## 9. Integration and documentation

- [x] 9.1 Run the full flow (import, adjust the draft, gym mode, swap, finish, progress shows the new values) under the production build with the CSP header active (`npm run build && npm run start` or the Docker image), and confirm the browser console shows no CSP violations from the pdf.js worker
- [x] 9.2 Update `DEVELOPMENT.md` with the new migration, the import endpoint, the pdf.js worker setup and the plan fixture regeneration step, and mention plan import and gym mode in `README.md`; verify that the documented fixture command reproduces `plan-example.json`
- [x] 9.3 Verify `npm run lint`, `npm run typecheck` and `npm test` (coverage threshold held) pass, and `npm run test:e2e` passes on the phone viewport
