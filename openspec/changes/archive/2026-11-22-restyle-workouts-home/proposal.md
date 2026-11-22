# Proposal

## Why

The design canvas draws the Workouts home with lighter, more compact pieces than the app has today: tabs as wide as their labels instead of two half-width tabs, a planned card whose secondary action is a quiet "Edit plan" text link next to a compact "Start in gym" button, and history as separate cards with an icon tile instead of rows in one bordered box. This is the second item of the README roadmap's "Visual alignment" list.

## What Changes

- **Tabs**: Planned and History sit on the left, each as wide as its label and count badge, with a gap between them and an underline under the selected one. They stay at least 44 px tall; the count badge text stays at least 12 px.
- **Planned card**: the two equal-width buttons at the bottom become one row under a thin divider: "Edit plan" on the left as a text link with a pencil icon, "Start in gym" on the right as a compact solid button with a trailing arrow icon. Both keep a 44 px touch target, their accessible names and test ids. Calendar icon tile, date, counts, session badge and exercise preview are unchanged.
- **History**: each finished workout becomes its own card (white, bordered, rounded, spaced apart) with an icon tile on the left (dumbbell icon, same tint as the planned tile), date, counts, session badge and a chevron. The whole card stays one link to the workout.
- Deviations kept from the roadmap: no text under 12 px (the design's 10-11 px badge and meta text), muted text keeps 4.5:1 contrast, dates keep their current format (shorter dates are a separate roadmap item).
- Tick the roadmap item in `README.md`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `workout-logging`:
  - "Home screen tabs": tabs sized to their labels, left-aligned.
  - "Planned drafts on the home screen": Edit plan as a text link and Start in gym as a compact button in one row.
  - "Workout history list": each workout as its own card with an icon tile; the whole card opens the workout.

## Out of scope

- Shorter dates without the year, and every later roadmap item (Exercises rows, gym set grid, progress sheet, kind toggles, nav icons).
- The page heading, Plan/Import buttons, count rows and empty states (done in the previous change or unchanged).
- The design's separate chevron button on history cards: the whole card stays a single link, so there is one tab stop per workout and the whole card is the touch target.
- Data, API, dependency or security changes.

## Open questions

- Should the history icon tile differ between solo and trainer sessions (e.g. icon or tint)? The design uses the same dumbbell tile for both and shows the difference only in the badge; this change follows the design.

## Impact

- `app/pages/index.vue` (tabs, history list wrapper), `app/components/WorkoutCard.vue` (both variants).
- E2E: `e2e/home.spec.ts` (tab width, card layout, links), `e2e/mobile-shell.spec.ts` (44 px targets and 12 px text on the restyled pieces). Existing test ids (`planned-item-*`, `workout-item*`, `workout-list`) are kept.
- `README.md` roadmap checkbox.
