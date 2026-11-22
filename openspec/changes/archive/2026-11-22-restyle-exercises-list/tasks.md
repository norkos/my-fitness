# Tasks

Visual target: the "Exercises" board of the design canvas. Keep every existing test id (`exercise-item`, `exercise-item-name`, `kind-badge-<kind>`, `video-link`, `exercise-link`, `exercise-edit`, `exercise-list`); text stays at least 12 px and muted text uses the app's `text-muted`.

## 1. Kind tile

- [x] 1.1 In `app/assets/css/main.css`, add tile tint tokens to `@theme static` for three families, each a background, border and icon colour: strength (sage, design: bg `#f0f5eb`, border `#e6eddf`, icon `#6f8f5a`), timed (sand: `#f6f2e9`, `#eee7d9`, `#8f7f55`) and cardio (a muted blue of the same lightness, e.g. `#ebf1f5`, `#dde6ed`, `#5a7d93`). Verify with `npm run verify` (lint, typecheck, build).
- [x] 1.2 Create `app/components/KindTile.vue` (prop `kind: ExerciseKind`): a 36 px (`size-9`) `rounded-lg` tile with a 1 px border, `aria-hidden="true"`, `data-testid="kind-tile"` and `data-kind-family="strength|timed|cardio"`, showing the kind's icon at 20 px. Move `KIND_ICONS` from `app/pages/exercises/index.vue` into it (weight_reps and bodyweight → strength tint, timed → timed, cardio → cardio). Verify with `npm run verify`.

## 2. Compact row

- [x] 2.1 In `app/components/VideoLink.vue`, add an optional `compact` prop that makes the link `h-11 w-9` instead of `size-11`; the default stays `size-11` so gym mode, the workout view and the draft editor are unchanged. Verify with `npm run verify`.
- [x] 2.2 In `app/pages/exercises/index.vue`, rebuild each `exercise-item` row: `KindTile` first; name in `font-heading text-sm font-semibold text-highlighted break-words`; kind label `text-xs text-muted` (keeping `kind-badge-<kind>`); row padding `py-[11px] pl-3 pr-2`, gap `gap-2.5`, same on phone and desktop (drop the `nav:` size variants); actions in one `flex` group: `VideoLink compact`, then Progress and Edit as ghost `UButton`s with `class="h-11 w-9 justify-center px-0"` (no `min-w-11`), same icons, `aria-label`s and test ids. Verify with `npm run verify`.
- [x] 2.3 E2E in `e2e/exercises.spec.ts`: new test "tile tint follows the kind family": create one exercise of each kind with made-up names (e.g. Bench Press, Push-ups, Plank, Rowing plus `unique()`), read each row's `kind-tile` computed `background-color` and `data-kind-family`; weight x reps and bodyweight match, timed and cardio differ from them and from each other, and the four tiles' icons differ (icon class or `data-kind`). Extend "a long name with a video link fits a 360px row": each action is at least 44 px tall and under 44 px wide, all three share one row (vertical centres within a few px), and the name's box starts right of the tile. Run `npm run test:e2e:local -- e2e/exercises.spec.ts` via the `verifier` sub-agent.

## 3. Readability audit and docs

- [x] 3.1 Extend `e2e/mobile-shell.spec.ts` ("page heading and count row text is at least 12px" or a new test): on `/exercises` with at least one exercise, `exercise-item-name` and the `kind-badge-*` label compute a font size of at least 12 px. The existing 44 px touch-target and no-horizontal-scroll checks already include `/exercises`; confirm they still pass. Run it via `verifier`.
- [x] 3.2 In `README.md`, tick "Exercises list: compact rows, icon tile tinted per exercise kind (#7)" under Roadmap › Visual alignment. Ask the user before refreshing README screenshots that show the Exercises screen; do not regenerate them silently. Verify `npm run hygiene` passes.

## 4. Integration

- [x] 4.1 Run the `verifier` sub-agent with `npm run verify -- --e2e` and confirm every step passes.
- [x] 4.2 Run `openspec validate restyle-exercises-list --strict` and confirm it passes.

## Workflow follow-up

- Open the PR with `Closes #7` in its body.
- Archive with `/opsx:archive` after the change is merged; check #7 is closed.
- Next roadmap item: "Gym mode: set grid column headers, filled done check, tinted "last time" box (#8)".
