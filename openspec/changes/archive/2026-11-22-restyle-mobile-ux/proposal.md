# Proposal

## Why

The Figma prototype ("Fitness Mobile App UX" and its implementation guide) proposes a calmer, more compact phone layout for the app: thumb-reachable navigation, tabbed Planned/History lists, richer planned cards, and a searchable exercise list. The app's features stay the same. Only the screens and how you move between them change, so the app is easier to use one-handed at 360–390 px.

## What Changes

- **Visual system**: Green primary (#278054), tinted background (#f8faf9), light borders (#e2e9e3), 7 px controls and 10 px cards, Manrope headings and DM Sans body text served from the app itself. Primary actions are 44–48 px tall and inputs use 16 px text on phones. Text is never smaller than 12 px, which deliberately overrides the prototype's 7–10 px labels.
- **Navigation**: On screens 600 px and wider, the header shows the brand, Workouts, Exercises and Log out. Below 600 px, a fixed two-item bottom bar (Workouts, Exercises) handles navigation and respects the safe area, and the header keeps only the brand and Log out.
- **Workouts home**: Heading with New workout, then Plan workout and Import plan (PDF) as secondary actions. **Planned** and **History** tabs show counts. Planned cards show the date, session badge, exercise and set counts, up to three exercise names with "+N more", and Edit plan and Start in gym actions. History rows show the date, badge and exercise and set counts, and open the workout. Each tab has its own empty state.
- **Workout list API**: `GET /api/workouts` summaries also return `setCount` and `exerciseNames`. The change only adds fields.
- **Editor and gym mode**: Exercise cards are numbered and show the name, kind, last-time values, a progress shortcut, the optional video, the sets, Add set, Swap and Remove. Solo / With trainer becomes a segmented control. Saving, retry, unsaved-change warnings, stale-write protection and restore after reload all stay exactly as they are.
- **Exercises**: The heading gets an Add exercise button that opens a dialog, replacing the inline create card. A client-side search box filters by name. Each row shows the name and kind and has Video, Progress and Edit actions.
- **Dialogs**: On phones, dialogs (edit exercise, swap, delete, add exercise) open as bottom sheets. Focus trapping and restoring focus on close are kept.

Out of scope: dashboards, goals, streaks, muscle groups, templates, rest timers, profiles, JSON import, the prototype's "handoff" link, preview labels and footer, and any change to auth, DB schema, the PDF parser or the import review logic.

## Capabilities

### New Capabilities
- `app-shell`: Responsive navigation (header or bottom bar), dialogs that become bottom sheets on phones, and the baseline for touch targets and text size shared by every screen.

### Modified Capabilities
- `workout-logging`: Home screen uses Planned/History tabs with counts, and summaries include set counts and an exercise-name preview. Planned cards can start gym mode directly.
- `exercise-catalog`: The exercises list is searchable, exercises are created from a dialog, and each row has a progress action.
- `progress-tracking`: Progress is also reachable from each exercise card in the workout editor and gym mode.

## Impact

- UI: `app/layouts/default.vue`, `app/assets/css/main.css`, new `app/app.config.ts`, `app/pages/index.vue`, `app/pages/exercises/index.vue`, `app/components/WorkoutForm.vue`, `app/pages/workouts/[id]/gym.vue`, and the dialog components.
- API: `shared/workouts.ts` (`WorkoutSummary`) and `server/services/workouts.ts` (list query).
- Tests: API tests for the new summary fields, and E2E tests updated for tabs, bottom nav, search and the add-exercise dialog at 360 px. Existing `data-testid`s are kept where possible.
- **Dependencies (needs your approval)**: `@fontsource-variable/manrope` and `@fontsource-variable/dm-sans`. These are static font files bundled at build time and served same-origin, so the strict CSP (`font-src 'self'`) is unchanged and nothing is fetched from third parties at runtime. Only the latin and latin-ext subsets are loaded, so Polish exercise names render correctly.

## Open questions

1. Do you approve the two font packages above? If not, use the system font stack and keep everything else.
2. Should the Workouts screen open on the **Planned** tab when any plan exists and on **History** otherwise? (Assumed yes. The chosen tab is kept in `?tab=` so Back returns to it.)
