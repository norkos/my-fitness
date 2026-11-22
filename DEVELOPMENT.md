# My Fitness: Development Guide

Everything needed to configure, run, test and change the app. For what the app does, see the [README](README.md).

**Stack:** Nuxt 4 (Vue) single-page app with a built-in server API, SQLite via Drizzle ORM, Nuxt UI, Chart.js, pdf.js (plan import, in the browser). Packaged as one Docker image.

## Requirements

- Docker Desktop (for running and testing exactly as in production)
- Node.js 24 LTS + npm (only for working on the code outside Docker)

## Configuration

All configuration comes from environment variables. Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `NUXT_APP_USERNAME` | Login username |
| `NUXT_APP_PASSWORD` | Login password |
| `NUXT_APP_SECRET` | Secret (32+ chars) used to encrypt the session cookie |
| `NUXT_DATABASE_PATH` | SQLite file path (Docker uses `/data/fitness.db`) |
| `PORT` | Port to listen on (default `3000`) |
| `NUXT_SESSION_COOKIE_SECURE` | Set to `false` **only** for local HTTP testing. Leave unset when hosted. |
| `NUXT_TRUSTED_PROXY` | How to identify clients for the login lockout: unset/`none` (direct connection, default), `cloudflare` (behind Cloudflare / Cloudflare Tunnel, uses `CF-Connecting-IP`), `generic` (behind one reverse proxy such as Railway, uses the last `X-Forwarded-For` entry). Only set it when that proxy really is in front; otherwise clients could forge the header. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env` and `data/` are gitignored. Never commit real credentials.

The app refuses to start if the username, password or secret is missing.

## Run locally with Docker

```bash
docker compose up --build
```

Open http://localhost:3000. Data is stored in `./data/fitness.db` on your machine, so it survives `docker compose down` and image rebuilds.

Stop with `Ctrl+C` or `docker compose down`.

### Use it from your phone on home Wi-Fi

1. Find your PC's IP address (Windows: `ipconfig`, look for the Wi-Fi adapter's IPv4 address, e.g. `192.168.1.20`).
2. On the phone (same Wi-Fi), open `http://<that-ip>:3000`.
3. If it does not load, allow inbound TCP port 3000 in Windows Defender Firewall (private networks only), for example from an elevated PowerShell:

   ```powershell
   New-NetFirewallRule -DisplayName "My Fitness 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private
   ```

Login works over plain HTTP here because `compose.yaml` sets `NUXT_SESSION_COOKIE_SECURE=false`.

## Tests

Three layers, all runnable in Docker:

| Layer | What | Command |
| --- | --- | --- |
| Unit | Shared logic and server services, in-process, with coverage (80% threshold) | `docker compose run --rm --build test` |
| API | Every endpoint against the built server with a temporary database | (included in the command above) |
| E2E | Playwright, phone-sized Chromium, against the production image | `docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from e2e` |

After the E2E run, clean up with `docker compose -f compose.test.yaml down`. Reports land in `coverage/` and `playwright-report/`.

Tests never touch `./data`; they use temporary databases and dummy credentials.

### Without Docker

```bash
npm ci
npm run hooks:install   # once per clone: enables the pre-commit hygiene check
npm run verify          # hygiene, lint, typecheck, build, unit + API tests; one line per step
npm run verify -- --e2e # ...plus the E2E suite
```

`npm run verify` prints only a summary per step and the full output of a failing step. The individual commands still work: `npm run lint`, `npm run typecheck`, `npm run build` (API tests run against the built server), `npm test`.

For E2E outside Docker, run `npx playwright install chromium` once, then:

```bash
npm run test:e2e:local                                     # build, then E2E against a throwaway server
npm run test:e2e:local -- --no-build e2e/import.spec.ts -g "rejects"   # reuse the build, one test
```

It starts the production build on a free port with a temporary database and test credentials (never your `.env` or `./data`), runs Playwright and stops the server again. To test against an app you started yourself: `E2E_BASE_URL=http://localhost:3000 E2E_USERNAME=... E2E_PASSWORD=... npm run test:e2e`.

### Repository hygiene

`npm run hygiene` (also the pre-commit hook and a CI step) fails on real video links, Polish text in code and tests (only the trainer's PDF header labels are allowed), PDFs other than the generated fixture, and committed `.env` files. For private terms such as real names, list them one per line in `.hygiene-blocklist` in the repo root; the file is gitignored, so the terms never enter the repository.

### Manual checks

Before relying on a new version, run through these against `docker compose up --build`:

- Log in with your credentials; a wrong password is rejected.
- Log a trainer workout and a solo workout; the second time you add an exercise, last time's values are pre-filled.
- Edit a set value and delete a workout (cancel once, then confirm).
- Repeat a done workout as a draft: the plan is dated today with last session's exercises and values; save it and it appears under Planned.
- Import the trainer's plan PDF, adjust the draft, open it in gym mode, tick sets, swap an exercise and finish it; the finished workout appears in history and progress.
- Open an exercise's progress chart and history.
- **Persistence:** run `docker compose down`, then `docker compose up -d`, and confirm your workouts are still there. (The automated API suite checks the same thing at the process level.)
- Open the app on your phone over Wi-Fi and check the layout.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit + API tests with coverage, and the Docker E2E suite on every push and pull request.

## Development

```bash
npm ci
npm run dev        # http://localhost:3000 with hot reload, reads .env
```

Database schema changes: edit `server/db/schema.ts`, then run `npm run db:generate` and commit the generated migration in `server/db/migrations/`. Migrations are applied automatically on startup. `0001_drafts_and_videos` added `workouts.status` (`draft` or `done`; existing workouts became `done`), `sets.completed` and `exercises.video_url`.

### Planned workouts and gym mode

- A **draft** is a workout with `status: 'draft'`. Drafts may have empty set values, are listed under Planned on the home screen, and are left out of history, last-time values and progress.
- **Gym mode** (`/workouts/:id/gym`) saves the whole draft with `PUT /api/workouts/:id` after every change: debounced, one request at a time, retried while offline (`shared/save-queue.ts`, `app/composables/useDraftSaving.ts`).
- `POST /api/workouts/:id/finish` turns a draft into a done workout, keeping only sets marked done.

### Plan import

- The browser reads the PDF with pdf.js (`app/utils/pdf-extract.ts`, loaded only on the import page). The pdf.js worker is served from the app's own origin, so it works under the CSP without exceptions. Only the reviewed rows are sent to the server, so the JSON-only request guard is unchanged.
- `shared/plan-import.ts` parses the trainer's table by the positions of its header labels. The Polish labels live only in `PLAN_HEADER_LABELS`; everything else uses English names. Tempo and RIR are ignored.
- `POST /api/plan-imports` saves a confirmed review in one transaction: new exercises, video links for exercises without one, and the draft.
- Tests use a **synthetic** plan, `e2e/fixtures/trainer-plan.pdf`: the trainer's layout with made-up exercises, values and `example.com` video links. Never commit a real plan or real video links. The parser's unit tests read `test/unit/fixtures/plan-example.json`, extracted from that PDF. After changing the generator or the extraction, regenerate both:

  ```bash
  node scripts/make-plan-fixture-pdf.mjs e2e/fixtures/trainer-plan.pdf
  node scripts/extract-plan-fixture.mjs e2e/fixtures/trainer-plan.pdf test/unit/fixtures/plan-example.json
  ```

### UI conventions

- **Tokens:** colors (the `brand` green scale, `--ui-bg`, `--ui-border`, text colors), radii and fonts live in `app/assets/css/main.css`; component defaults (primary color, button and card shapes) in `app/app.config.ts`. Style through Nuxt UI tokens and slots, not parallel CSS classes. The theme is light only (`ui.colorMode: false` in `nuxt.config.ts`).
- **Shell breakpoint 600 px** (`--breakpoint-nav`, used as `nav:` / `max-nav:`; `useWideScreen()` in script). Below it, navigation is a fixed bottom bar and dialogs are bottom sheets; at or above it, the header holds the navigation. Use it only for the shell; components keep Nuxt UI's own breakpoints.
- **Every dialog uses `AppSheet`** (a `UModal` wrapper: bottom sheet on phones, centered `max-w-md` otherwise). It keeps focus trapping, Escape and focus return.
- **Sizes:** no text below 12 px; inputs use 16 px on phones; buttons, links and checkboxes are at least 44 px high on phones (`e2e/mobile-shell.spec.ts` audits this).
- **Fonts are self-hosted:** Manrope (headings) and DM Sans (body) come from `@fontsource-variable/*`, with only the latin and latin-ext subsets declared in `main.css`. They are bundled under `/_nuxt/`, so `font-src 'self'` holds. Never load fonts from a third party.

## Security

- **Login:** credentials come only from the environment. Failed logins are throttled per client (5 failures in 15 minutes blocks that client for 15 minutes; see `NUXT_TRUSTED_PROXY`).
- **Session:** encrypted HTTP-only cookie, `SameSite=Lax`, `Secure` unless explicitly disabled for local HTTP.
- **API request guard** (`server/middleware/auth.ts`, `server/lib/request-guard.ts`): every `/api` route except login, health and the session check requires a session. Write requests must be JSON, at most 256 KB, with a declared `Content-Length`, and are rejected when they come from another site (`Sec-Fetch-Site`, or `Origin` for older browsers).
- **Video links:** only `https://` URLs are accepted. They open in a new tab with `rel="noopener noreferrer"` and are never embedded.
- **Headers:** a Content-Security-Policy without `unsafe-inline` scripts (HTML pages allow their own inline scripts by hash, see `server/plugins/csp.ts`), HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a permissions policy. Because the CSP allows no third-party connections, every icon must be in the client bundle (`icon.clientBundle` in `nuxt.config.ts`).
- **Limits:** at most 30 exercises per workout and 30 sets per exercise.
