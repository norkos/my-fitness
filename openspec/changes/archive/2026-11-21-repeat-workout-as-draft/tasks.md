# Tasks

## 1. Pre-fill a new draft from a done workout

- [x] 1.1 Add a pure helper in `shared/workouts.ts` that turns a `WorkoutDetail` into new-draft form values: session type, exercises in order, set values copied, every set `completed: false`, date left to the caller
- [x] 1.2 Unit tests in `test/unit/` for the helper: order kept, values per kind copied (weight x reps, timed, distance), nothing marked done, the source object is not mutated
- [x] 1.3 `WorkoutForm.vue`: accept an optional source workout used only to seed a new draft (date today, saved with POST as a draft); `initial` keeps meaning "edit this workout"
- [x] 1.4 `app/pages/workouts/plan.vue`: read `?from=<id>`, load that workout, pass it to the form when it is done; on a load failure or a draft source, show an alert ("Workout to repeat could not be loaded") and the empty plan form
- [x] 1.5 Verify with `npm run verify`

## 2. Repeat action on the workout view

- [x] 2.1 `app/pages/workouts/[id]/index.vue`: add a "Repeat as draft" button (`data-testid="workout-repeat"`) linking to `/workouts/plan?from=<id>`; keep the action row usable at 360 px
- [x] 2.2 E2E in `e2e/planned.spec.ts`: log a done trainer workout with made-up "Bench press" and "Plank" sets, repeat it, check the pre-filled date (today), session type, exercises and set values, adjust one set, save, and check the draft under Planned and the original unchanged in history
- [x] 2.3 E2E: leaving the plan screen without saving stores no draft; `/workouts/plan?from=<missing id>` shows the alert and an empty form
- [x] 2.4 Update `DEVELOPMENT.md` / user-facing docs only if they list the workout view actions
- [x] 2.5 Verify with `npm run verify -- --e2e`

## 3. Integration

- [x] 3.1 Run the full suite including E2E (`npm run verify -- --e2e`) via the `verifier` sub-agent and fix any failures
- [x] 3.2 `openspec validate repeat-workout-as-draft --strict` and `npm run hygiene` pass
