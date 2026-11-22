# Proposal

## Why

The "My Fitness App" design canvas gives each main screen a consistent heading: a small uppercase eyebrow, a large title ending in a green dot, a one-line subtitle, and a labelled count row above each list. The app today shows a bare title and, on Exercises only, a plain count. This is the first item of the README roadmap's "Visual alignment" list.

## What Changes

- A shared page heading (eyebrow, title with a decorative green dot, subtitle, optional action on the right) on the three screens the design draws with it:
  - **Workouts home**: eyebrow "YOUR GYM NOTEBOOK", title "Workouts", subtitle "Plan your session. Log your progress.", action "New workout" (unchanged).
  - **Exercises**: eyebrow "YOUR EXERCISE LIBRARY", title "Exercises", subtitle "Your movements, last time's numbers, and progress.", action "Add exercise" (unchanged).
  - **Gym mode**: eyebrow "FOLLOW YOUR PLAN", title "Gym mode", subtitle "Adjust the numbers. Tick the sets you actually do." The workout date, session badge and save status stay visible right below the heading (a deliberate deviation in the roadmap).
- A count row above each list: uppercase label on the left, count on the right.
  - Planned tab: "READY WHEN YOU ARE" · "2 workouts"
  - History tab: "YOUR PREVIOUS SESSIONS" · "8 workouts"
  - Exercises: "YOUR EXERCISES" · "7 exercises" (replaces today's count line under the search; still counts the filtered list)
  - Singular "1 workout" / "1 exercise". The row is hidden when its list is empty (the empty state shows instead).
- Deviations kept from the roadmap: the design's 10 px eyebrow and count text become 12 px, and its light grey (#7f8f85) becomes the app's muted text colour so contrast stays at least 4.5:1.
- Tick the roadmap item in `README.md`.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `app-shell`: adds a "Page headings" requirement (heading parts per screen, count rows above lists, accessible title without the dot).

## Out of scope

- Screens the design does not draw: Plan, Import, New/Edit workout, workout view, login, the exercise progress page. They keep their current headings.
- Everything in the later roadmap items: tab sizing, "Edit plan"/"Start in gym" buttons, history cards, exercise row compaction, gym set grid, progress sheet, kind toggles, nav icons.
- Removing the tab count badges on the Workouts tabs (the design keeps them too).
- Desktop-specific layout: the heading is the same at every width.

## Open questions

- Should the sub-pages not in the design (Plan, Import, New/Edit workout, workout view) adopt the same heading later? This change leaves them alone; a yes would be a separate small change or an extra task group here.

## Impact

- `app/components/` (new page heading component), `app/pages/index.vue`, `app/pages/exercises/index.vue`, `app/pages/workouts/[id]/gym.vue`.
- E2E: `e2e/exercises.spec.ts` count assertions; new heading/count checks in home, exercises and gym specs.
- `README.md` roadmap checkbox. No API, data, dependency or security changes.
