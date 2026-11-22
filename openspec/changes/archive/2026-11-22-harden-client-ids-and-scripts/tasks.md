# Tasks

## 1. Shared id rule

- [x] 1.1 Add `shared/ids.ts` with `parsePositiveId(value)`: accept only strings/numbers matching `^[1-9]\d*$` within `Number.MAX_SAFE_INTEGER`, take the first item of an array, return `undefined` otherwise. Verify: new `test/unit/ids.test.ts` covers `'42'`, `42`, `['7','8']`, and rejects `'..'`, `'abc'`, `'0'`, `'-3'`, `'1.5'`, `'1e2'`, `' 42 '`, `'0x10'`, `''`, `undefined`, and a value above `MAX_SAFE_INTEGER`.
- [x] 1.2 Make `parseId` in `server/lib/errors.ts` use `parsePositiveId` and throw `not_found` on `undefined`. Verify: extend `test/unit/errors.test.ts` with `'1e2'` and `' 42 '` → "not found". Add an API test in `test/api/workouts.test.ts`: `GET /api/workouts/1e2` → 404 (build first).
- [x] 1.3 Run the `diff-reviewer` on group 1, then the `verifier` (`npm run verify`).

## 2. Client pages

- [x] 2.1 `app/pages/workouts/plan.vue`: parse `?from=` with `parsePositiveId`. When it is present but invalid, skip the fetch and show the existing "could not be loaded" alert with an empty plan. Build the URL from the number. Verify: E2E in `e2e/planned.spec.ts` opens `/workouts/plan?from=..` and `?from=abc`, expects `repeat-missing` visible, and records that no request to `/api/workouts/` was made (`page.on('request')`).
- [x] 2.2 `app/components/ExerciseProgress.vue`: take `exerciseId: number | undefined`. When it is `undefined`, show "Exercise not found" without fetching. `app/pages/exercises/[id].vue` passes the parsed route param. `ExerciseProgressSheet.vue` already passes a number. Verify: E2E in `e2e/progress.spec.ts` opens `/exercises/..%2F..%2Fworkouts%2F1` and `/exercises/999999999`, expects "Exercise not found", and records no `/api/` progress request for the malformed one.
- [x] 2.3 `app/pages/workouts/[id]/index.vue`, `edit.vue` and `gym.vue`: parse the route id with `parsePositiveId`. When it is invalid, show "Workout not found" without fetching. Build every `/api/workouts/...` URL on these pages from the parsed number. Verify: E2E opens `/workouts/abc` and `/workouts/abc/edit`, expects "Workout not found", and records no `/api/workouts/` request.
- [x] 2.4 Run the `diff-reviewer` on group 2, then the `verifier` with `npm run verify -- --e2e`.

## 3. Repo and script hygiene

- [x] 3.1 Add `Fitness Mobile App UX/` to `.gitignore` under "Design references kept locally". Verify: after creating an empty `Fitness Mobile App UX/x.md` locally, `git check-ignore -v "Fitness Mobile App UX/x.md"` prints the rule. Then remove the test file.
- [x] 3.2 Add `scripts/lib/local-server.mjs` with `freePort()`, `serverEnv(overrides)` (drops inherited `NUXT_*`/`NITRO_*` keys, then applies the overrides) and `waitForHealth(url, server)` (false if the server exited or after 60 tries). Switch `scripts/e2e-local.mjs` to use it with no change in behaviour. Verify: `npm run test:e2e:local` still passes (through the `verifier`).
- [x] 3.3 Switch `scripts/make-screenshots.mjs` to the helper. When the server isn't healthy, print the server log tail and exit non-zero before launching the browser. Update its header comment and the one in `e2e-local.mjs` to say that inherited `NUXT_*`/`NITRO_*` variables are ignored. Verify: set `NUXT_APP_USERNAME=other` in the shell and run the script after a build. It still logs in as `demo`. Then run it with `.output` missing, or with a server that fails to start, and check that it exits non-zero without creating data. Running it does not change the committed PNGs beyond what a normal run produces. Discard any diff in `docs/screenshots/`.
- [x] 3.4 Run the `diff-reviewer` on group 3, then the `verifier`.

## 4. Integration

- [x] 4.1 Run the full suite with the `verifier`: `npm run verify -- --e2e` (hygiene, lint, typecheck, build, unit, API, E2E). All green.
- [x] 4.2 Run `openspec validate harden-client-ids-and-scripts --strict`. It passes.

## Workflow follow-up

- Archive with `/opsx:archive` after merge, which syncs the `workout-logging` and `progress-tracking` deltas.
