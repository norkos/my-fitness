# Proposal

## Why

A security review of the restyle branch found five low-severity issues. Two let a crafted link make the logged-in browser call a different same-origin API path than the page intends. One could let a local design prototype with sample links be committed. Two let the screenshot script talk to a server it did not start, or run with the developer's own settings. None is exploitable in a meaningful way in a single-user app, but each weakens a guarantee the project already claims: the API is only called with valid ids, no real data reaches the repository, and the helper scripts never touch the developer's configuration.

## What Changes

- **Client id validation.** Ids taken from the URL (`?from=` on the plan screen, `:id` on the exercise progress, workout view and workout edit pages) are accepted only when they are positive integers. Anything else is treated as "not found" without any API request. The same rule the server applies in `parseId`, shared between client and server.
  - Assumption: the review flagged only the plan screen and the progress component. The workout view and edit pages build their API URL from the raw route param in the same way, so they are included.
- **Ignore the design prototype folder.** `Fitness Mobile App UX/` is added to `.gitignore`, next to `figma-implementation-guide.md`.
- **Throwaway-server scripts.** `scripts/make-screenshots.mjs` stops when its server does not become healthy or exits early, the way `scripts/e2e-local.mjs` already does. Both scripts start the server without inherited `NUXT_*` variables, so only the values the script sets apply.

## Out of scope

- Server-side changes: the API already rejects non-integer ids with 404.
- Other hardening the review did not raise, and any change to the CSP, auth or request guard.
- Ids that come from API responses (e.g. `entry.exerciseId`), which are already numbers.

## Open questions

None. If the user prefers to keep the change to the two flagged files only, the workout view and edit pages drop out of the tasks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workout-logging`: repeating a workout from a malformed `?from=` address behaves like a missing workout, without an API request; a malformed workout address on the view, edit and gym screens shows "Workout not found" without an API request.
- `progress-tracking`: opening progress for a malformed or unknown exercise address shows "Exercise not found".

## Impact

- Code: `shared/` (new id helper), `server/lib/errors.ts` (reuses it), `app/pages/workouts/plan.vue`, `app/components/ExerciseProgress.vue`, `app/pages/workouts/[id]/index.vue`, `app/pages/workouts/[id]/edit.vue`, `app/pages/workouts/[id]/gym.vue`.
- Tooling: `.gitignore`, `scripts/make-screenshots.mjs`, `scripts/e2e-local.mjs`, and a small shared helper under `scripts/lib/`.
- No API, schema, dependency or runtime changes.
