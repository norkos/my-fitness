# Proposal

## Why

A new design for the app's phone screens ("My Fitness App", a Claude Design canvas) differs from the app in many small ways and a few behavioral ones. The design is a visual target: the specs in `openspec/specs/` stay authoritative. Writing the gaps down as a public roadmap lets each one ship later as its own small change, and records where the app deliberately departs from the design so nobody "fixes" it back.

## What Changes

- Add a `## Roadmap` section to `README.md`, at the end after "Try it", with three parts:
  - **Visual alignment** (checklist, in implementation order):
    1. Page headings and section labels (eyebrow line, title with a green dot, subtitle, count row above lists)
    2. Workouts home: tabs sized to their text, an "Edit plan" text link plus a compact "Start in gym" button, history as separate cards with icon tiles
    3. Exercises list: compact rows, icon tile tinted per exercise kind
    4. Gym mode: set grid column headers, filled done check, tinted "last time" box
    5. Progress opens as a bottom sheet from the Exercises list (chart kept)
    6. New/edit exercise sheet: 2x2 kind toggles, "Optional" hint on the video link
    7. Bottom navigation icons
  - **Features suggested by the design** (checklist; each needs its own decision): remove an exercise in gym mode, delete a plan from gym mode, shorter dates (no year for the current year).
  - **Deliberate deviations from the design**: text stays at least 12 px; muted text keeps at least 4.5:1 contrast; Log out, the progress chart, and the workout date and save status in gym mode all stay.
- State that each item ships as its own OpenSpec change and that the specs win over the design where they disagree.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None. This is documentation only, so the change sets `skip_specs: true`. Spec updates that roadmap items need (for example progress opening as a sheet from the Exercises list) belong to those items' own changes.

## Out of scope

- Any code, styling or spec change; this change only adds README text.
- Linking the design canvas: it is a private link, so the README names the design but does not link it.
- Deciding the three "features suggested by the design"; they are listed, not committed to.

## Open questions

None that change scope. The order of the visual items can be changed later by editing the list.

## Impact

- `README.md` only. No code, API, dependency or data changes. `npm run hygiene` must still pass.
