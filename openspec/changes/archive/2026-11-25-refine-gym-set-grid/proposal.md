## Why

The earlier gym-mode restyle (`restyle-gym-mode`, issue #8) left a few differences from the design canvas: the last-time box carries a long dated text, and bodyweight exercises show REPS before +KG. This change refines the existing components with the product owner's decisions.

## What Changes

- Gym-mode last-time box reads "Last time: 8 kg × 15 · 8 kg × 12" (no date, sets joined by " · ", "kg ×" with spaces). Gym mode only: the workout editor and other screens keep their current format. "No previous record" is unchanged.
- Header labels are the unit in capitals; for bodyweight the header reads +KG before REPS and gym mode's bodyweight inputs are reordered to weight before reps so header and inputs line up. Gym mode only: the editor keeps its order.
- Set grid gap becomes 10 px.
- README "Deliberate deviations from the design" gains a bullet on the done check using the brand green (#278054) for 4.5:1 contrast.
- Last-time loading moves from `app/pages/workouts/[id]/gym.vue` into a `useLastTimes` composable; new shared helpers `formatLastTimeSets`, `gymFieldsForKind` and `fieldHeader` with unit tests.
- E2E (360 px) updated for the new last-time text and a bodyweight header/order case.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `gym-mode`: the "Gym mode set layout" requirement changes the last-time text and the header/input order.

## Impact

- `app/components/GymSetGrid.vue`, `app/components/LastTimeBox.vue`, `app/pages/workouts/[id]/gym.vue`, new `app/composables/useLastTimes.ts`, `shared/format.ts`, `shared/set-form.ts`, unit tests, `e2e/workouts-gym.spec.ts`, `README.md`, `docs/screenshots/gym-mode.png`.
- No API, schema or dependency changes.

## Open questions

- Decided by user: the last-time text drops the date: "Last time: 8 kg × 15 · ...", sets joined by " · ", gym mode only; editor and other screens keep their format; "No previous record" unchanged.
- Decided by user: header labels use the unit in capitals; bodyweight shows +KG before REPS and gym mode's bodyweight inputs are reordered to weight before reps (gym mode only, editor unchanged).
- Decided by user: grid gap is 10 px.
- Decided by user: README deliberate deviations gets one bullet that the done check uses the brand green (#278054) instead of the design's lighter green so the white check meets 4.5:1; the roadmap #8 box stays ticked.
- Decided by user: keep main's `GymSetGrid.vue` and `LastTimeBox.vue` and edit them (no `GymLastTime.vue`); move last-time loading into a `useLastTimes` composable.
- Decided by user: E2E at 360 px updates the last-time assertions and adds the bodyweight header/order case.
