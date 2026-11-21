# Proposal

## Why

Training sessions often repeat: the next session is the last one with small adjustments. Today a draft is built by hand exercise by exercise (or imported from a PDF), even when the plan is "do what I did last time". Copying a done workout, with the values actually achieved, into a new draft makes planning the next session a one-tap start.

## What Changes

- A done workout's view gets a **Repeat as draft** action.
- It opens the plan screen pre-filled from that workout: same session type, same exercises in the same order, and the same sets with the values actually performed (the "outcomes"), none marked done.
- The new draft is dated today; the date, exercises and sets can be changed before saving, exactly as in "Plan workout".
- Nothing is stored until the user saves; the source workout is never changed.
- If the workout to copy cannot be loaded, the plan screen says so and falls back to an empty plan.

Out of scope:
- Repeating a draft (drafts have no outcomes and are already editable).
- A home-screen "repeat last workout" shortcut; the latest workout is the top of the history list.
- Progression rules (e.g. auto-adding weight), copying across several workouts, or templates as a separate entity.
- Any API, data model or migration change.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `workout-logging`: adds a requirement for creating a draft from a done workout.

## Impact

- UI: `app/pages/workouts/[id]/index.vue` (new action), `app/pages/workouts/plan.vue` (reads the source workout from the query), `app/components/WorkoutForm.vue` (pre-fill a new draft from a source workout).
- Shared: a small pure helper in `shared/workouts.ts` that turns a workout into draft form values.
- No server, API, schema or dependency changes; security posture unchanged.
- Tests: unit (helper), E2E (repeat flow at phone width).

## Open questions

- None blocking. Decided with the user: any done workout can be repeated (not only the latest), and the draft defaults to today.
