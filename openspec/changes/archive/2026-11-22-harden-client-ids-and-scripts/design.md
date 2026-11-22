# Design

## Context

- The server validates ids with `parseId` in `server/lib/errors.ts`, using `Number(value)` and requiring a positive integer. That accepts forms like `" 42 "`, `"1e2"` and `"0x10"`, which are harmless but looser than they need to be.
- The client builds API paths from URL values in four places: `plan.vue` (`?from=`, through `encodeURIComponent`, which leaves `.` and `..` unchanged), `ExerciseProgress.vue` (with no encoding), and `workouts/[id]/index.vue` and `edit.vue` (raw `route.params.id`, also with no encoding). `gym.vue` uses `Number(route.params.id)`, so a bad id becomes `NaN` and the page requests `/api/workouts/NaN`. That is harmless, but it should go through the same check.
- `vue-router` decodes route params, so `%2F` in an address becomes `/` before the page sees it.
- `scripts/e2e-local.mjs` already waits for the health check and stops if the server exits or never becomes healthy. `scripts/make-screenshots.mjs` has a weaker copy of that loop. Both spread `...process.env` into the server.

## Goals / Non-Goals

**Goals:**
- One strict id rule shared by client and server.
- No API request is ever built from an id that fails that rule.
- The helper scripts start the server only with the settings they choose, and stop when that server is not the one answering.

**Non-Goals:**
- Changing API responses: non-integer ids already return 404.
- A router-level guard or param regex for every route.

## Decisions

1. **A shared `parsePositiveId(value): number | undefined` in `shared/ids.ts`.** It accepts only strings or numbers that match `^[1-9]\d*$` and are within `Number.MAX_SAFE_INTEGER`. For arrays (repeated query keys) it takes the first value. Server `parseId` calls it and throws `not_found` when it returns `undefined`.
   - Rejected: checking with a regex in each page. Five copies would drift apart, and the server would still use a different rule.
   - Effect on the server: `/api/workouts/1e2` and `/api/workouts/%2042` now return 404 instead of resolving to 100 or 42. No client sends these forms, so this is accepted.

2. **Pages check the id before calling `useAsyncData`.** When the id is invalid, the page sets the same error or empty state as a 404 and makes no request. `ExerciseProgress` takes the parsed id (`number | undefined`) and does the check itself, because both the page and the sheet use it. The URL is then built from the number, so encoding is no longer needed.
   - Rejected: `encodeURIComponent` alone. It leaves `.` and `..` unchanged, so it does not close the plan-screen issue, and it treats the symptom rather than the cause.

3. **A shared `scripts/lib/local-server.mjs`** with `freePort()`, `serverEnv(overrides)` and `waitForHealth(url, server)`. Both scripts use it.
   - `serverEnv` copies `process.env` without keys that start with `NUXT_` or `NITRO_`, then applies the script's overrides. PATH and the other system variables stay, because Node and Playwright need them on Windows.
   - `waitForHealth` returns false when the spawned server has exited, which covers losing the port race (the server fails with EADDRINUSE) and startup crashes. It also returns false after 60 tries. `make-screenshots.mjs` then prints the server log and exits non-zero before logging in or creating any data.
   - Rejected: an environment with only PATH. On Windows, Node and Chromium also need `SystemRoot`, `TEMP` and similar variables, so it is fragile across machines.
   - Rejected: a nonce to prove the server's identity. Checking the exit code already covers the realistic failures, and a nonce would need a server change for test tooling only.

4. **`.gitignore` gets `Fitness Mobile App UX/`** in the existing "Design references kept locally" block. The ESLint ignore stays, so linting doesn't pick up the folder when it is present.

## Risks / Trade-offs

- [The stricter server rule changes behaviour for unusual id forms] → No client sends them. Unit tests cover the forms that are accepted and rejected.
- [A developer may rely on an exported `NUXT_*` variable when running the scripts] → Neither script documents such use. The header comments will say that inherited `NUXT_*` and `NITRO_*` variables are ignored.
- [The port race is narrowed, not removed] → If another process wins the port and our server exits, we stop. A server that stays up without binding is not a realistic case for Nitro.
