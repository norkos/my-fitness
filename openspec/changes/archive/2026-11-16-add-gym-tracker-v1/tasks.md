# Tasks

## 1. Project scaffolding

- [x] 1.1 Create a Nuxt 4 project in the repo root with TypeScript, `ssr: false`, `app/`, `server/` and `shared/` directories; verify `npm run dev` serves a placeholder page on localhost
- [x] 1.2 Add dependencies (Nuxt UI, nuxt-auth-utils, better-sqlite3, drizzle-orm, drizzle-kit, zod, chart.js, vue-chartjs; dev: vitest, @vitest/coverage-v8, @nuxt/test-utils, @playwright/test, ESLint) and verify `npm ci` and `npm run build` succeed
- [x] 1.3 Add `.gitignore` (node_modules, .output, .nuxt, data/, .env, coverage, test reports) and `.env.example` with placeholder values for all variables in design D7; verify `git status` does not show `data/` or `.env`
- [x] 1.4 Add lint and typecheck scripts (`npm run lint`, `npm run typecheck`) and verify both pass on the scaffold

## 2. Docker and test harness

- [x] 2.1 Write the multi-stage `Dockerfile` (deps, build, runtime on `node:24-slim`, non-root `node` user, `/data` owned by `node`) and verify `docker build --target runtime .` succeeds
- [x] 2.2 Write `compose.yaml` (app service, `.env`, port 3000, `./data:/data`, `NUXT_SESSION_COOKIE_SECURE=false`) and a test service using the build target for unit/API tests; verify `docker compose up --build` serves the placeholder page at http://localhost:3000
- [x] 2.3 Configure Vitest with two projects (unit, API via a helper that boots the built server per test file) and v8 coverage thresholds of 80% for lines/branches/functions/statements on `server/**` and `shared/**`; add one trivial unit test and one API test hitting the running app; verify `docker compose run --rm test` passes and prints a coverage report
- [x] 2.4 Configure Playwright (Chromium, 360x780 viewport, `data-testid` convention, retries 1 in CI) and `compose.test.yaml` (app with dummy credentials and tmpfs DB + Playwright container); add one smoke test that loads the app; verify `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from e2e` exits 0
- [x] 2.5 Add GitHub Actions workflow (jobs `unit-api` and `e2e`, npm cache, concurrency cancel-in-progress, coverage and Playwright report artifacts with 7-day retention); verify a push shows both jobs green
- [x] 2.6 Write `README.md` sections for running locally, running each test layer in Docker, environment variables and testing from a phone on the LAN (incl. Windows Firewall note); verify each documented command runs as written

## 3. Runtime configuration and database

- [x] 3.1 Implement startup config check that exits with a clear message naming any missing credential/secret variable without printing values; verify with an API/unit test for missing and present variables (spec app-runtime: environment-based configuration)
- [x] 3.2 Define the Drizzle schema from design D3 (exercises, workouts, workout_exercises, sets), generate the initial SQL migration and commit it; verify `drizzle-kit generate` reports no pending changes
- [x] 3.3 Implement the DB module (opens `NUXT_DATABASE_PATH`, creates the file if missing, WAL + foreign keys) and a Nitro startup plugin that applies migrations before serving; verify API tests for empty-DB creation and that rerunning migrations keeps existing rows
- [x] 3.4 Implement `GET /api/health` (200 when DB reachable, 503 otherwise, no auth, no data) and wire it into the Dockerfile `HEALTHCHECK`; verify API tests for both outcomes and `docker compose ps` shows the container healthy
- [x] 3.5 Verify persistence end to end: add an API/E2E-level test or documented manual check that data written, then container removed and restarted with the same mount, is still present (spec app-runtime: persistent data location)

## 4. Authentication

- [x] 4.1 Implement `POST /api/auth/login` (constant-time compare against configured credentials, generic error for wrong user or password, failed-login throttling) and `POST /api/auth/logout` using nuxt-auth-utils with a 30-day HTTP-only, SameSite=Lax cookie and Secure flag controlled by `NUXT_SESSION_COOKIE_SECURE`; verify API tests for success, wrong password, unknown user, logout, cookie attributes in both secure modes
- [x] 4.2 Add server middleware returning 401 for every `/api/*` route except login and health when there is no session; verify an API test that iterates all data endpoints without a session and expects 401
- [x] 4.3 Build the login page and a global client route middleware redirecting unauthenticated users to `/login`, plus a logout action in the app layout; verify E2E tests: login success, wrong password message, redirect when not logged in, logout returns to login, session survives a page reload
- [x] 4.4 Identify clients for login throttling by connection address, trusting `CF-Connecting-IP` / last `X-Forwarded-For` entry only when `NUXT_TRUSTED_PROXY` is `cloudflare` / `generic` (invalid value refuses startup); verify unit tests for each mode and API tests showing forged headers cannot bypass the lockout

## 5. Exercise catalog

- [x] 5.1 Implement shared zod schemas and kind definitions (weight_reps, bodyweight, timed, cardio with required/optional set fields and name rules); verify unit tests for each kind's required/optional fields, name trimming and case-insensitive key
- [x] 5.2 Implement `GET /api/exercises`, `POST /api/exercises` and `PATCH /api/exercises/:id` (unique name, rename keeps history, kind change rejected when sets exist); verify API tests for create, duplicate name, blank name, alphabetical list, rename, kind change allowed/rejected
- [x] 5.3 Build the exercises screen (alphabetical list with kind badge, create form, rename/change-kind dialog, tap opens progress route); verify E2E test creating one exercise of each kind, rejecting a duplicate and renaming one

## 6. Workout logging

- [x] 6.1 Implement shared workout payload validation (date, solo/trainer, at least one exercise, at least one set each, kind-aware required values, non-negative numbers, integer reps/seconds/meters); verify unit tests for every rejection rule in spec workout-logging: workout validation
- [x] 6.2 Implement `POST /api/workouts`, `GET /api/workouts` (newest first with exercise count), `GET /api/workouts/:id`, `PUT /api/workouts/:id` (transactional full replace) and `DELETE /api/workouts/:id` (cascade); verify API tests for create, ordering, view, edit replacing sets, delete removing sets, validation errors, 404 for unknown ids
- [x] 6.3 Implement `GET /api/exercises/:id/last?before=YYYY-MM-DD` returning sets from the most recent workout with a strictly earlier date; verify unit/API tests for no history, latest earlier workout chosen, same-day and later workouts ignored
- [x] 6.4 Build the home screen (history list with date, solo/trainer tag, exercise count, empty state, "New workout" button); verify E2E test for empty state and listing order
- [x] 6.5 Build the new/edit workout form (date default today, solo/trainer toggle, add exercise picker, kind-specific numeric inputs with numeric keyboards, add/remove sets, "last time" hint and pre-fill, inline validation keeping entered data); verify E2E test logging a trainer workout and then seeing last-time values pre-filled when logging the same exercise again
- [x] 6.6 Build the workout view screen with edit and delete (confirmation dialog; cancel keeps data) and exercise links to progress; verify E2E tests for editing a set value, cancelled delete, confirmed delete, and no horizontal scrolling at 360 px on home, form and view screens

## 7. Progress tracking

- [x] 7.1 Implement the shared progress-metric function per kind (heaviest weight with rep tie-break, most reps, longest duration, longest duration + distance); verify unit tests covering each scenario in spec progress-tracking: progress metric per kind
- [x] 7.2 Implement `GET /api/exercises/:id/progress` returning per-workout progress values in date order plus full sets and session type per workout; verify API tests for multiple workouts, single workout, no history and values updating after a workout edit/delete
- [x] 7.3 Build the exercise progress screen (line chart via vue-chartjs, single-value and empty states, history list newest first with date, tag and sets) reachable from the exercises list and workout view; verify E2E test that logs workouts on several dates and checks chart points count and history entries

## 8. Integration verification

- [x] 8.1 Run the full suite in Docker (unit + API with coverage >= 80% on server and shared, E2E) and in GitHub Actions; verify all jobs pass and the coverage threshold is enforced
- [x] 8.2 Perform the manual checklist on a real phone over home Wi-Fi against `docker compose up` (login, log trainer and solo workouts, last-time values, edit/delete, progress chart, restart container and confirm data persists); record results in the README or PR description — confirmed working by the owner on 2026-11-16
