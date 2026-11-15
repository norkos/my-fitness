# Design

## Context

Greenfield repository: only OpenSpec scaffolding exists, no application code. Motivation and scope are in `proposal.md`; behavior is defined in `specs/` (auth, exercise-catalog, workout-logging, progress-tracking, app-runtime).

Constraints decided up front:
- One deployable application, Vue-based, no separate backend service.
- Data in a single SQLite file; host (Railway Hobby, Fly.io as fallback) is chosen later, so the container must be host-agnostic and keep data on a mounted volume.
- Single user, used mostly from a phone, logging after a session (no live/offline workout mode).
- Developed and verified locally with Docker; automated unit, API and E2E tests from the first task, also run in GitHub Actions; 80% coverage threshold on server and logic code.

## Goals / Non-Goals

**Goals:**
- Same Docker image runs locally and on a host, configured only by environment variables.
- Business rules (validation per exercise kind, last-time lookup, progress metric) live in plain, framework-free functions so they are cheap to unit test.
- Every API endpoint is covered by API tests against a throwaway database; the main user journeys are covered by E2E tests in a phone-sized browser.

**Non-Goals:**
- Deployment, custom domains, backups beyond what the host provides.
- Server-side rendering, SEO, offline support/PWA install.
- Multi-user data model (no user_id columns).
- Visual design beyond a clean, usable mobile layout from the UI kit.

## Decisions

### D1. Nuxt 4 in SPA mode (`ssr: false`) with Nitro server routes
One project contains the Vue UI (`app/`) and the API (`server/api/`), built into one Node server (`.output/server/index.mjs`).
- SPA mode keeps the mental model simple (all pages render in the browser, all data via `/api/*`) and uses the least memory on the host. Security does not depend on SSR because every API route checks the session.
- Alternatives: Vue + Vite SPA with a separate Express/Hono API (two packages, dev proxy, more wiring - rejected per "one application"); Nuxt with SSR (more server work and hydration concerns with no benefit for a single logged-in user).

### D2. SQLite via better-sqlite3 + Drizzle ORM, committed migrations applied on startup
- `better-sqlite3`: synchronous, fast, mature; native module, so the Docker image uses a Debian-based Node image (`node:24-slim`, current LTS) rather than Alpine.
- Drizzle: typed schema in TypeScript, `drizzle-kit generate` produces SQL migrations that are committed to the repo; a Nitro startup plugin runs the migrator before serving requests (spec app-runtime: automatic migration). The database file is created if missing.
- SQLite pragmas: `journal_mode=WAL`, `foreign_keys=ON`.
- Alternatives: Node's built-in `node:sqlite` (fewer deps, but ORM support and maturity are weaker); plain SQL with no ORM (fine, but loses typed queries and migration tooling); Prisma (heavier engine, slower cold start).

### D3. Data model

```
exercises
  id            integer pk
  name          text not null
  name_key      text not null unique      -- lower(trim(name)), enforces case-insensitive uniqueness
  kind          text not null             -- 'weight_reps' | 'bodyweight' | 'timed' | 'cardio'
  created_at    integer not null

workouts
  id            integer pk
  date          text not null             -- 'YYYY-MM-DD', the local calendar day chosen in the UI
  session_type  text not null             -- 'solo' | 'trainer'
  created_at, updated_at integer not null

workout_exercises                         -- an exercise performed within a workout, ordered
  id            integer pk
  workout_id    integer not null -> workouts.id  ON DELETE CASCADE
  exercise_id   integer not null -> exercises.id ON DELETE RESTRICT
  position      integer not null

sets
  id                   integer pk
  workout_exercise_id  integer not null -> workout_exercises.id ON DELETE CASCADE
  position             integer not null
  weight_kg            real null
  reps                 integer null
  duration_s           integer null
  distance_m           integer null
```
- Storing the date as a plain calendar string avoids time-zone shifts between phone and server.
- A `workout_exercises` table (rather than putting exercise_id on each set) preserves exercise order inside a workout and makes "exercises per workout" trivial.
- Which columns are required is enforced by kind-aware validation (D5), not by DB constraints, keeping the schema simple.
- Exercises cannot be deleted in v1 (not in specs); RESTRICT protects history anyway.

### D4. API surface (all JSON, all under `/api`, all require a session except login and health)

```
POST   /api/auth/login            { username, password }
POST   /api/auth/logout
GET    /api/health                 -> 200 { ok: true } | 503

GET    /api/exercises              list (alphabetical)
POST   /api/exercises              { name, kind }
PATCH  /api/exercises/:id          { name?, kind? }   (kind only if no sets)
GET    /api/exercises/:id/last?before=YYYY-MM-DD      sets from most recent workout with date < before
GET    /api/exercises/:id/progress                    per-workout progress values + sets

GET    /api/workouts               list newest first (date desc, id desc) with exercise count
POST   /api/workouts               full workout payload
GET    /api/workouts/:id
PUT    /api/workouts/:id           full replacement of exercises/sets in one transaction
DELETE /api/workouts/:id
```
- Edit uses full replacement (`PUT`): delete the workout's `workout_exercises` and insert the new ones in a transaction. Simpler and less error-prone than diffing sets, and set identity has no meaning to the user.
- "Last time" uses strictly earlier dates (spec: earlier means earlier date); same-day workouts are not considered.

### D5. Shared validation and domain logic in `shared/`
Zod schemas for exercise and workout payloads, kind-aware set validation (required/optional fields per kind, non-negative numbers, integers for reps/seconds/meters) and the progress-metric function live in `shared/` and are used by both the forms (client-side feedback) and the server (authoritative check). These pure functions are the main unit-test targets.
- An exercise may appear only once per workout (more sets are added to the same entry instead). This keeps "last time" and the per-workout progress value unambiguous.
- Values for fields that an exercise's kind does not record are dropped (stored as NULL) rather than rejected.

### D6. Authentication with `nuxt-auth-utils` sealed-cookie sessions
- Login compares the submitted credentials with `NUXT_APP_USERNAME` / `NUXT_APP_PASSWORD` using a constant-time comparison and returns the same error for unknown user and wrong password.
- Session stored in an encrypted, HTTP-only, `SameSite=Lax` cookie with `maxAge` 30 days, sealed with a key derived from Nuxt's `appSecret` (`NUXT_APP_SECRET`, >= 32 chars; nuxt-auth-utils >= 0.6 no longer uses `NUXT_SESSION_PASSWORD`). No session table needed.
- Server middleware rejects `/api/*` (except `/api/auth/login`, `/api/health`) with 401 when no session; a global client route middleware redirects to `/login`.
- Secure flag: on by default (`runtimeConfig.session.cookie.secure`); the local compose file sets `NUXT_SESSION_COOKIE_SECURE=false` so a phone on the LAN can log in over plain HTTP. Hosted deployments keep the default (spec auth: secure cookie in production).
- Basic brute-force damping: a small in-memory delay/limit on failed logins (single instance, so in-memory is sufficient). Clients are identified by the TCP peer address by default; forwarding headers are client-forgeable and are only used when `NUXT_TRUSTED_PROXY` names the proxy in front (`cloudflare`: `CF-Connecting-IP`; `generic`: last `X-Forwarded-For` entry).
- Alternatives: HTTP basic auth (poor phone UX, no logout); hand-rolled JWT (more code, no benefit).

### D7. Configuration

| Variable | Purpose | Local value source |
| --- | --- | --- |
| `PORT` | Listen port (Nitro honors it) | compose (`3000`) |
| `NUXT_DATABASE_PATH` | SQLite file path | compose (`/data/fitness.db`) |
| `NUXT_APP_USERNAME` / `NUXT_APP_PASSWORD` | Login credentials | `.env` (gitignored) |
| `NUXT_APP_SECRET` | Cookie sealing secret (Nuxt appSecret) | `.env` (gitignored) |
| `NUXT_SESSION_COOKIE_SECURE` | `false` only for local HTTP | compose |
| `NUXT_TRUSTED_PROXY` | `none` (default) / `cloudflare` / `generic`: which proxy header identifies clients for login throttling | host / tunnel setup |

A startup check fails fast (process exits, logs the missing variable name only) when credentials or session secret are absent. A committed `.env.example` lists the variables with placeholder values; real values never enter git.

### D8. UI: Nuxt UI + vue-chartjs
- Nuxt UI (Tailwind-based, first-party for Nuxt) provides touch-friendly inputs, buttons, modals (delete confirmation) and toasts with little styling work.
- Charts with Chart.js via `vue-chartjs`: one line chart per exercise; small and well known.
- Numeric inputs use `inputmode="decimal"` (kg) / `inputmode="numeric"` (reps, seconds, meters) to open the numeric keyboard.
- Screens: `/login`, `/` (history), `/workouts/new`, `/workouts/:id` (view), `/workouts/:id/edit`, `/exercises`, `/exercises/:id` (progress).
- Alternatives: Vuetify / Quasar (heavier, Material look); hand-rolled Tailwind (more effort).

### D9. Docker layout
- Multi-stage `Dockerfile` on `node:24-slim`:
  - `deps` - `npm ci` (includes build tools only if a prebuilt better-sqlite3 binary is unavailable).
  - `build` - `nuxt build`; this stage keeps dev dependencies and is also the target used to run unit/API tests.
  - `runtime` - copies `.output/`, runs as the non-root `node` user, `/data` created and owned by `node`, `CMD node .output/server/index.mjs`, `HEALTHCHECK` on `/api/health`.
- `compose.yaml` - service `app` (runtime target), `env_file: .env`, port `3000:3000`, bind mount `./data:/data`.
- `compose.test.yaml` - service `app` built from the same runtime target with dummy test credentials and a tmpfs database, plus `e2e` using the official Playwright image that runs the E2E suite against `http://app:3000`.
- Commands: `docker compose up --build` (use), `docker compose run --rm --build test` / build-target test service (unit + API + coverage), `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from e2e` (E2E).

### D10. Testing strategy
- **Unit (Vitest)**: `shared/` validation, progress metric, formatting helpers, plus the server service layer (`server/services/`, `server/db/`, `server/lib/`) run in-process against a temporary SQLite file. Route handlers stay thin (parse input, call a service, map errors) so the logic is unit-testable.
- **API (Vitest + a small helper in `test/api/helpers`)**: spawns the built server (`.output/server/index.mjs`, built once) per test file with a temp `NUXT_DATABASE_PATH` and dummy credentials; covers every endpoint, 401s, validation errors, transactions (edit/delete), migration on empty DB, startup config failures. Chosen over `@nuxt/test-utils/e2e` to avoid one Nuxt build per test file.
- **E2E (Playwright, Chromium, 360x780 mobile viewport)**: login/logout, create exercises of all four kinds, log a workout and see last-time pre-fill on the next one, edit and delete a workout, progress chart and history, no horizontal scroll.
- **Coverage**: Vitest v8 coverage with thresholds of 80% for lines, branches, functions and statements, scoped to `shared/**`, `server/services/**`, `server/db/**` and `server/lib/**`; the run fails below threshold. Route handlers, middleware and plugins run in a separate server process during API tests, so v8 cannot measure them in-process; they are kept thin and verified by API tests. Vue pages/components are covered by E2E, not by the threshold.
- **Test data isolation**: tests never use `./data`; credentials in tests are dummy values from test config.

### D11. CI: GitHub Actions
Workflow on every push and pull request, `concurrency` with `cancel-in-progress` per branch:
- Job `unit-api`: setup Node 24 with npm cache, `npm ci`, lint/typecheck, `vitest run --coverage`, upload coverage HTML as an artifact with 7-day retention.
- Job `e2e`: `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from e2e`, upload Playwright report on failure (7-day retention).
Expected cost: ~5-7 runner-minutes per push, within the free allowance.

## Risks / Trade-offs

- [better-sqlite3 native build fails in Docker or CI] -> Debian slim base, pin Node 24 LTS, rely on prebuilt binaries; fall back to installing `python3 make g++` in the `deps` stage only.
- [Volume permissions: non-root user cannot write `/data` on the host's volume] -> create and chown `/data` in the image; document `RAILWAY_RUN_UID=0` as the hosted fallback.
- [Running two app instances against one SQLite file] -> document single instance as a hard rule; health check plus WAL mode; out of scope to support more.
- [Lost or corrupted database file] -> host snapshots/backups at deploy time; CSV export is a candidate follow-up change.
- [E2E tests flaky while the UI changes] -> stable `data-testid` selectors, Playwright auto-waits, retries=1 in CI only.
- [API tests slow because they boot Nuxt] -> build once per run and share across files; keep pure logic in unit tests.
- [Plaintext password in env var] -> acceptable for a single-user personal app; constant-time compare and login throttling; easy rotation by changing the variable.
- [`NUXT_SESSION_COOKIE_SECURE=false` accidentally used when hosted] -> only set in the local compose file; `.env.example` and README call it out.

## Migration Plan

Not applicable for v1 (no existing data or deployment). The app creates and migrates its database on first start. Deployment to Railway/Fly.io is a later change.

## Open Questions

- Exact UI kit theme/colors and app name/icon - cosmetic, can be decided during implementation.
- Whether to enable the host's "wait for CI" deploy gating - decided at deployment time.
