# Proposal

## Why

On a phone in the gym, each set row today is a number bubble, inputs with the unit inside them, an outline circle that turns into a soft green circle-check when done, and the last-time values as a small grey line under the exercise name. The design canvas's "Gym mode" board makes the grid easier to scan mid-workout: column headers name each value once, a done set has a solid filled check you can see from arm's length, and the last-time values sit in their own tinted box. This is the fourth item of the README roadmap's "Visual alignment" list (#8).

## What Changes

- **Set grid column headers**: one header row above each exercise's sets: `SET`, one column per value of the exercise's kind (its unit in capitals, e.g. `KG` `REPS` for weight x reps, `REPS` `+KG` for bodyweight, `S` or `MIN` for timed, `MIN` `M` for cardio), and `DONE`. The remove-set column keeps no header. Header text is at least 12 px (the design's 10 px is raised, as in #7) and hidden from screen readers; each input keeps its `Set N <unit>` accessible name.
- **Aligned grid rows**: each set row uses the same columns as the header: set number, centred inputs, done check, remove. The unit moves from inside the input to the header, which leaves the inputs wider on a 360 px screen. Validation messages still show under the input they belong to.
- **Filled done check**: a 44 px square check button. Not done: white with a border and a faint check icon. Done: filled with the brand green and a white check icon. It keeps `role="checkbox"`, `aria-checked`, its `Set N done` name and the `gym-set-done` test id. Done rows keep their light green tint.
- **Tinted last-time box**: the last-time values move from under the name into a box between the exercise header and the grid, with a light sage background, a clock icon and text at least 12 px. It reads `Last time (<date>): <sets>` or `No previous record`, and is not shown while the values are still loading. It keeps the `gym-entry-last` test id.
- Per the project practice for large pages, the set grid and last-time box move out of `app/pages/workouts/[id]/gym.vue` into components.
- Tick the roadmap item in `README.md` and close #8 from the PR.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `gym-mode`: "Gym mode" gains the column headers per kind, the filled done check and the last-time box.

## Out of scope

- Removing an exercise in gym mode (#12) and the design's "Delete plan" button in the finish bar.
- Other differences on the board: the back link label ("Plan" stays), the "Swap" label, the Finish button text and icon, the kind label under the name, the progress and video buttons. Those stay as they are.
- The draft editor (`WorkoutForm.vue`) and the finished-workout view keep their current set layout.
- Data, API, dependency or security changes.

## Open questions

- **Date in the last-time box**: the design shows only the values; this change keeps the date, since it tells you how stale the numbers are. Say if you want it dropped.
- **Remove-set button**: the design board has no per-set remove control; the app keeps it as a narrow fifth column without a header. Hiding it behind a menu would change behaviour and is not part of this change.

## Impact

- `app/pages/workouts/[id]/gym.vue` (uses the new components), new `app/components/GymSetGrid.vue` (header, rows, done and remove controls) and `app/components/LastTimeBox.vue`, `app/assets/css/main.css` (last-time box tint tokens, if the existing tile tokens do not fit).
- E2E: `e2e/workouts-gym.spec.ts` (headers per kind, done check filled vs not, last-time box), `e2e/mobile-shell.spec.ts` (gym header and last-time text at least 12 px; the 44 px and no-horizontal-scroll checks already cover gym mode). Existing test ids (`gym-set`, `gym-set-<field>`, `gym-set-done`, `gym-set-remove`, `gym-entry-last`, `data-done`) are kept.
- `README.md` roadmap checkbox.
