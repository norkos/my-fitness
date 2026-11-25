# Tasks

Visual target: the "Gym mode" board of the design canvas. Keep every existing test id and attribute (`gym-entry`, `gym-set`, `data-done`, `gym-set-<field>`, `gym-set-done`, `gym-set-remove`, `gym-set-add`, `gym-swap`, `gym-entry-last`); text stays at least 12 px, muted text uses `text-muted`, every control stays at least 44 px tall. Example exercise names in tests are made up and in English.

## 1. Last-time box

- [x] 1.1 Create `app/components/LastTimeBox.vue` (props: `kind: ExerciseKind`, `last: LastTime | undefined`): renders nothing while `last` is undefined; otherwise a `rounded-md` box with `data-testid="gym-entry-last"`, a light sage background and dark sage text (reuse `bg-tile-strength-bg` / `text-tile-strength-icon` from `app/assets/css/main.css` if the text reaches 4.5:1 on it; otherwise add `--color-last-time-bg` / `--color-last-time-text` tokens, design: `#f7f9f3` / `#5d6f4d`), an `i-lucide-clock` icon (`aria-hidden`), and text at `text-xs` (12 px): `Last time (<formatDate>): <formatSets>` or `No previous record`, exactly as today. Verify with `npm run verify`.
- [x] 1.2 In `app/pages/workouts/[id]/gym.vue`, drop the last-time markup from the `ExerciseCardHeader` slot and render `<LastTimeBox>` between the header and the sets (`mt-3`). Verify the existing `e2e/workouts-gym.spec.ts` tests that read `gym-entry-last` ("No previous record", the swap test's `8kg x 15`) still pass, run via the `verifier` sub-agent.

## 2. Set grid

- [x] 2.1 Create `app/components/GymSetGrid.vue` and move the set rows out of `gym.vue` into it (props: `kind`, `entryIndex`, `sets` via `defineModel`, `errors`; the toggle and remove logic moves with it, `addSet` stays in the page). Layout: a CSS grid per row with columns `1.75rem repeat(<field count>, minmax(0, 1fr)) 2.75rem 2.25rem` and `gap-2`, the same template on an `aria-hidden="true"` header row (`data-testid="gym-set-header"`) showing `SET`, `fieldUnit(kind, field).toUpperCase()` for each of `fieldsForKind(kind)`, `DONE`, and an empty cell over the remove column; header text `text-xs tracking-wider text-muted`, centred. Rows: set number centred (`text-xs text-muted`, no bubble), inputs centred (`text-center`) with no trailing unit slot, keeping `aria-label="Set N <unit>"`, `inputmode` and `UFormField` errors; done rows keep `bg-success/10`. Verify with `npm run verify`.
- [x] 2.2 Done control in `GymSetGrid.vue`: a 44 px square (`size-11`, `rounded-md`, `justify-center`) `UButton` with `icon="i-lucide-check"`; not done `variant="outline" color="neutral"` with a muted icon, done `variant="solid" color="primary"` (filled brand green, white check). Keep `role="checkbox"`, `:aria-checked`, `aria-label="Set N done"`, `data-testid="gym-set-done"`. The remove button keeps its icon, `aria-label`, `disabled` on the last set and test id, at `h-11 w-9`. Verify with `npm run verify`.
- [x] 2.3 E2E in `e2e/workouts-gym.spec.ts`: new test "set grid has column headers per kind": plan a draft with a weight x reps, a bodyweight and a timed (seconds) exercise (made-up names plus `unique()`), open gym mode and check each entry's `gym-set-header` text reads `SET KG REPS DONE`, `SET REPS +KG DONE`, `SET S DONE` (whitespace-normalised), and that each header cell's horizontal centre is within a few px of the first row's matching input or done button. Run via the `verifier` sub-agent.
- [x] 2.4 E2E in `e2e/workouts-gym.spec.ts`: extend the first gym test (after marking the first set done): the done button is at least 44 x 44 px; its computed `background-color` differs between the done first set and the undone second set, and the undone one is transparent or white; `aria-checked` is `true` / `false`. Assert `gym-entry-last` has a non-transparent background. Run via the `verifier` sub-agent.

## 3. Readability audit and docs

- [x] 3.1 Extend `e2e/mobile-shell.spec.ts` (the readability test that covers page headings, or a new one): on the gym screen, `gym-set-header` cells and `gym-entry-last` compute a font size of at least 12 px. The existing 44 px touch-target and no-horizontal-scroll checks already include `/workouts/<id>/gym`; confirm they still pass at 360 px. Run via the `verifier` sub-agent.
- [x] 3.2 Check `DEVELOPMENT.md` for any description of the gym set row or `ExerciseCardHeader`'s slot that this change makes wrong, and fix it (update the component's doc comment if the slot is no longer used by gym mode). In `README.md`, tick "Gym mode: set grid column headers, filled done check, tinted "last time" box (#8)" under Roadmap › Visual alignment. Ask the user before refreshing README screenshots that show gym mode; do not regenerate them silently. Verify `npm run hygiene` passes.

## 4. Integration

- [x] 4.1 Run the `diff-reviewer` sub-agent on the whole change (`git diff main...HEAD` plus uncommitted changes) and fix blocking or important findings.
- [x] 4.2 Run the `verifier` sub-agent with `npm run verify -- --e2e` and confirm every step passes.
- [x] 4.3 Run `openspec validate restyle-gym-mode --strict` and confirm it passes.

## Workflow follow-up

- Open the PR with `Closes #8` in its body.
- Archive with `/opsx:archive` after the change is merged; check #8 is closed.
- Next roadmap item: "Progress opens as a bottom sheet from the Exercises list (chart kept) (#9)".
