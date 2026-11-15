# Proposal

## Why

I train twice a week (once solo, once with a trainer) and want to see whether I am progressing on each exercise. Today that history lives only in memory, and a spreadsheet is awkward to use on a phone. A small, phone-first web app that I log into after each session gives me a durable history and makes "what did I do last time?" and "am I getting better?" easy to answer.

## What Changes

- New single-user web application (Nuxt / Vue, one app with built-in server API) optimized for a phone browser.
- Login with a single username/password supplied via environment variables; long-lived session cookie so I rarely re-enter it.
- Exercise catalog where I define exercises with a name and a kind: weight x reps, bodyweight, timed hold, or cardio. The kind decides which values are recorded.
- Workout logging after a session: date, solo/trainer tag, exercises with one or more sets; the form shows what I did last time for each exercise. Past workouts can be viewed, edited and deleted.
- Home screen listing recent workouts.
- Progress view per exercise: chart plus chronological history using the metric that fits the exercise kind.
- Data stored in a single SQLite file whose location is configurable, so it lives on a mounted folder locally and on a persistent volume when hosted.
- Runs locally via Docker (single container + mounted data folder); the same image is deployable later to Railway (or Fly.io). No deployment is part of this change.
- Automated tests from day one: unit, API and end-to-end (mobile viewport), runnable in Docker and in GitHub Actions on every push, with an 80% coverage threshold on server and logic code.

## Capabilities

### New Capabilities
- `auth`: Single-user login/logout, session cookie lifetime and protection of all data endpoints and screens.
- `exercise-catalog`: Defining, listing and renaming exercises and their kind (weight x reps, bodyweight, timed, cardio), including which measurements each kind records.
- `workout-logging`: Recording, listing, viewing, editing and deleting workouts with their sets, solo/trainer tag, and "last time" values while logging.
- `progress-tracking`: Per-exercise history and chart, with the progress metric chosen by exercise kind.
- `app-runtime`: Environment-based configuration, persistent SQLite storage location, and startup behavior (schema migration, health check) that make the same container run locally and when hosted.

### Modified Capabilities
<!-- None: this is the first change in the project. -->

## Impact

- Greenfield: creates the whole application in this repository (Nuxt project, `server/` API, SQLite schema/migrations, Dockerfile, docker compose files, GitHub Actions workflow, test suites).
- New dependencies: Nuxt/Vue, a SQLite driver and query layer, a charting library, a mobile-friendly UI kit, Vitest, @nuxt/test-utils, Playwright.
- External systems: GitHub Actions (CI, within the free allowance). Hosting (Railway/Fly.io) is out of scope until a later change.
- Secrets: credentials and session secret are provided only via environment variables (`.env` locally, gitignored); none are committed.
- Out of scope for v1: CSV export, per-workout notes, workout templates, multiple users, offline mode, deployment.
