# Tasks

Visual target: the "Workouts, planned" and "Workouts, history" boards of the design canvas. Keep every existing test id; text stays at least 12 px and muted text uses the app's `text-muted`.

## 1. Tabs sized to their labels

- [x] 1.1 In `app/pages/index.vue`, restyle the `UTabs` so the triggers sit at the left, each as wide as its label and badge (drop `flex-1`; e.g. `list: 'w-auto justify-start gap-7'`, `trigger: 'min-h-11 grow-0 px-0.5'`), with the selected underline under the active trigger and a hairline under the whole tab row. Keep `min-h-11` (44 px) and the badge at `text-xs` (12 px). Verify with `npm run verify` (lint, typecheck, build).
- [x] 1.2 E2E in `e2e/home.spec.ts`: at 360 px, the Planned tab's left edge matches the content's left edge (within 1 px of the heading's left edge), History is on the same row to its right, and the History tab's right edge is well short of the content's right edge; both tabs are at least 44 px tall. Existing tab assertions ("Planned 2", selection, Back keeps the tab) still pass. Run `npm run test:e2e:local -- e2e/home.spec.ts` via the `verifier` sub-agent.

## 2. Planned card action row

- [x] 2.1 In `app/components/WorkoutCard.vue` (planned variant), replace the two-column button grid with one row below a `border-t border-default pt-3` divider: left, "Edit plan" as `UButton` `variant="link"` `color="neutral"` with `i-lucide-pencil` (`min-h-11`, no `block`); right, "Start in gym" as a compact solid `UButton` with `trailing-icon="i-lucide-arrow-right"` (`min-h-11`, no `block`). Keep `to`, `aria-label`s and the `planned-item-edit` / `planned-item-gym` test ids. Verify with `npm run verify`.
- [x] 2.2 E2E in `e2e/home.spec.ts` (extend the planned test): in a planned card, `planned-item-edit` and `planned-item-gym` share a row (vertical centres within a few px), edit is left of gym, gym is narrower than half the card, both at least 44 px tall; tapping Edit plan opens `/workouts/<id>/edit` (existing Start in gym check stays). Run that spec via `verifier`.

## 3. History as separate cards

- [x] 3.1 In `app/components/WorkoutCard.vue` (history variant), make the `NuxtLink` the card itself: `rounded-[10px] border border-default bg-white`, padding as the design (`py-3.5 pl-3.5 pr-2`), an icon tile on the left matching the planned tile (`size-11 rounded-md bg-primary/10 text-primary`, `i-lucide-dumbbell`, `aria-hidden`), then date (heading font, bold), counts, `SessionBadge` and the chevron. Keep `workout-item`, `workout-item-date`, `workout-item-count`.
- [x] 3.2 In `app/pages/index.vue`, change the history `ul` (`data-testid="workout-list"`) from a divided bordered box to a plain `space-y-2.5` list. Verify with `npm run verify`.
- [x] 3.3 E2E in `e2e/home.spec.ts` (extend the history test): with at least two done workouts, each `workout-item` has its own border (computed `border-top-width` > 0 on its link) and a visible gap between consecutive items; each item contains exactly one link, at least 44 px tall, and tapping the card's icon tile area opens that workout. Existing order/count assertions still pass. Run that spec via `verifier`.

## 4. Readability audit and docs

- [x] 4.1 Extend `e2e/mobile-shell.spec.ts`: on `/?tab=planned` and `/?tab=history` (with one draft and one done workout), the tab badges, card meta text, session badges and both planned actions compute a font size of at least 12 px; the existing 44 px touch-target and no-horizontal-scroll checks cover `/?tab=history` too. Run it via `verifier`.
- [x] 4.2 In `README.md`, tick "Workouts home: tabs sized to their text, ..." under Roadmap › Visual alignment. Ask the user before refreshing README screenshots that show the home screen; do not regenerate them silently. Verify `npm run hygiene` passes.

## 5. Integration

- [x] 5.1 Run the `verifier` sub-agent with `npm run verify -- --e2e` and confirm every step passes.
- [x] 5.2 Run `openspec validate restyle-workouts-home --strict` and confirm it passes.

## Workflow follow-up

- Archive with `/opsx:archive` after the change is committed.
- Next roadmap item: "Exercises list: compact rows, icon tile tinted per exercise kind".
