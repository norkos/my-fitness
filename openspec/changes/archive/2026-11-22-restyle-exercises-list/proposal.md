# Proposal

## Why

The design canvas draws the Exercises list with more compact rows than the app has today: a slightly larger icon tile with a hairline border, tinted by the exercise's kind, the name in the heading font, and narrower icon buttons that leave more room for the name on a 360 px phone. Today every tile uses the same green, so the tint says nothing. This is the third item of the README roadmap's "Visual alignment" list (#7).

## What Changes

- **Icon tile tinted per kind**: each row's tile becomes 36 px, rounded, with a 1 px border in its tint. Tint by kind family, as the design shows: weight x reps and bodyweight share a sage green, timed uses sand, cardio uses a muted blue (not in the design; see Open questions). Each kind keeps its own icon (dumbbell, standing person, timer, heart pulse), so the four kinds stay distinguishable even where two share a tint. The tile stays decorative (`aria-hidden`); the kind label under the name stays the accessible way to tell the kind.
- **Compact row**: name in the heading font at 14 px, semibold, still wrapping long names; kind label at 12 px muted; row padding and gaps as the design (about 11 px vertical, 12 px left, 8 px right). The tile is the same size on phone and desktop.
- **Narrower actions**: Video, Progress and Edit become 36 px wide and stay at least 44 px tall, keep their accessible names, test ids and order. The video control is the same green play icon it is today.
- Deviations kept from the roadmap: no text under 12 px (the design's 11 px kind label and 13 px name become 12 px and 14 px), muted text keeps 4.5:1 contrast, the tile tints are new theme tokens next to the brand colors.
- Tick the roadmap item in `README.md` and close #7 from the PR.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `exercise-catalog`: "List exercises" gains the kind-tinted icon tile and the compact row (actions narrower than the name column, at least 44 px tall).

## Out of scope

- The Progress bottom sheet (#9), the New/edit exercise sheet (#10), gym mode (#8) and bottom navigation icons (#11). The Progress button stays a link to `/exercises/<id>`.
- Using the tinted tile anywhere other than the Exercises list (gym mode, workout view). The tile is built as a component so later items can reuse it.
- Search, the count row, the page heading and empty states (unchanged).
- Data, API, dependency or security changes.

## Open questions

- **Cardio tint**: the design shows no cardio exercise. Assumed a muted blue of the same lightness as the sage and sand tints. Say if you want another colour.
- **Tint per family vs per kind**: the design tints bodyweight the same as weight x reps. This change follows the design (three tints, four icons). If you want four distinct tints, bodyweight needs its own colour.

## Impact

- `app/pages/exercises/index.vue` (row markup), new `app/components/KindTile.vue` (icon and tint per kind, moving `KIND_ICONS` out of the page), `app/components/VideoLink.vue` (a compact width option, default unchanged for gym mode and workout views), `app/assets/css/main.css` (tile tint tokens).
- E2E: `e2e/exercises.spec.ts` (tile per kind, row layout at 360 px, the existing long-name test), `e2e/mobile-shell.spec.ts` (12 px text in rows; the 44 px and no-horizontal-scroll checks already cover `/exercises`). Existing test ids (`exercise-item*`, `exercise-link`, `exercise-edit`, `video-link`, `kind-badge-*`) are kept.
- `README.md` roadmap checkbox.
