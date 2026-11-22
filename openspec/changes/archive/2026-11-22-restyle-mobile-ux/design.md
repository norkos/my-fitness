# Design

## Context

The UI is Nuxt UI 4 on Tailwind 4 with almost no custom styling: `main.css` only imports both libraries, and there is no `app.config.ts`. The layout has a single sticky header (`max-w-xl`) holding icon nav and Log out. The Figma prototype (`Fitness Mobile App UX.zip`) is React with hand-written CSS and in-memory data. It serves as a visual reference only; none of its code or fixtures are copied. The CSP allows only `font-src 'self' data:` and `connect-src 'self'`. Gym mode persists through `useDraftSaving`. The new, edit and plan editors (`WorkoutForm`) hold unsaved state in memory with no leave guard.

## Goals / Non-Goals

**Goals:** Match the prototype's tokens, spacing, layout and component shapes on Nuxt UI's primitives. Keep every existing behaviour, endpoint contract and most `data-testid`s.

**Non-Goals:** Porting the prototype's CSS classes one by one; a dark palette; copying the prototype's 7–10 px text sizes.

## Decisions

1. **Theme through Nuxt UI tokens, not a parallel stylesheet.** Define a custom `brand` green scale in `main.css` (`@theme static`, 50–950, with 600 = #278054), set `ui.colors.primary = 'brand'` and `neutral` in `app.config.ts`, and override `--ui-bg` (#f8faf9), `--ui-border` (#e2e9e3), `--ui-radius` and `--ui-text` in `:root`. Component shapes such as the 10 px cards and 7 px controls go in `app.config.ts` `ui` slots. *Rejected:* porting `index.css` as global classes, because that would fight Nuxt UI's own styles and double the CSS.
2. **Self-hosted variable fonts.** Use `@fontsource-variable/manrope` and `@fontsource-variable/dm-sans`, importing only the `latin` and `latin-ext` subset CSS in `main.css`. Set `--font-sans: 'DM Sans Variable', ui-sans-serif, system-ui, sans-serif`, and a `--font-heading` used by `h1–h3` and the brand. `ui.fonts: false` stays. The files are emitted by Vite under `/_nuxt/` and are covered by `font-src 'self'`. *Rejected:* the Google Fonts `@import` the prototype uses, because it violates the CSP and leaks visitor IPs. *Fallback if not approved:* the system stack with the same weights.
3. **Text-size floor of 12 px.** Body text is 14–15 px, secondary text 12–13 px and inputs 16 px below 600 px. Wherever the prototype goes smaller, we keep its hierarchy (weight, color) but not its size. *Rejected:* exact prototype sizes, which fail the guide's own contrast and readability audit.
4. **Responsive navigation in the layout.** Below 600 px (a custom `--breakpoint-nav: 600px`, used as `nav:`), the header shows only the brand and Log out, and a `fixed bottom-0` two-item nav carries `pb-[max(12px,env(safe-area-inset-bottom))]`. `<main>` gets matching bottom padding. `viewport-fit=cover` is added to the viewport meta so the safe-area values are non-zero. The container widens to `max-w-[744px]` with 32 px gutters on wide screens and 21 px on phones. *Rejected:* Tailwind's `sm` (640 px), which does not match the design's 600 px.
5. **One `AppSheet` wrapper for every dialog.** A thin component around `UModal` applies bottom-anchored, full-width, top-rounded `ui.content` classes plus a drag-handle bar below 600 px, and a centered `max-w-md` dialog above that. Nuxt UI's Reka dialog already traps and restores focus and handles Escape. `SwapExerciseModal`, `WorkoutDeleteButton`, the exercise dialogs and the new progress sheet all use it. *Rejected:* `UDrawer`, whose swipe-to-dismiss gestures would make it too easy to close a half-filled form by accident.
6. **Home tabs via `UTabs`, with state in `?tab=`.** `planned|history` is read from the route query. When absent, it defaults to `planned` if any draft exists and `history` otherwise. Changing tabs does a `router.replace`, so Back from a workout restores it. Counts come from the already-loaded list. *Rejected:* local `ref` state, which is lost on Back.
7. **Summary fields computed in SQL.** `listWorkouts` adds `setCount` (a correlated count over `sets` joined through `workout_exercises`) and `exerciseNames` (`json_group_array(name)` ordered by `workout_exercises.position` in a subquery, parsed into `string[]`). The client shows the first three names and "+N more". *Rejected:* fetching every workout's detail from the home page, which would mean N+1 requests. Also rejected: returning only three names, because the "+N" count already comes from `exerciseCount`, and full names keep the API independent of the UI.
8. **Progress as a sheet inside the editors, a page elsewhere.** Extract the body of `pages/exercises/[id].vue` into an `ExerciseProgress` component (chart, latest value and newest-first history). The page renders it as before, and an `ExerciseProgressSheet` renders it in `AppSheet` from `WorkoutForm` and gym mode. History links inside the sheet are disabled in the editors, so following one cannot drop unsaved input. *Rejected:* navigating to `/exercises/:id`, which loses `WorkoutForm` state because that form has no leave guard.
9. **Exercise search on the client.** A `computed` filter over the already-loaded list (`toLocaleLowerCase().includes`). The catalog is small and single-user. *Rejected:* a `?q=` API parameter, which adds no value at this size.
10. **Light theme only.** Today Nuxt UI follows the OS color scheme, and its untuned dark mode would clash with the new light tokens. Set `ui.colorMode: false` so the app is always light, as in the prototype. *Rejected:* designing a matching dark palette, which the prototype doesn't define. It can be added later as its own change.
11. **Sticky action bar on phones.** Below 600 px, the editor's Save button and gym mode's Finish button sit in a sticky bar (`bottom` = nav height + safe area), as in the prototype's `save-bar`, so they stay reachable with one thumb. *Rejected:* leaving them at the end of a long scrolling list.
12. **Card markup in components, not pages.** New `WorkoutCard` (planned and history variants) and `ExerciseCardHeader` (number, name, kind, progress, video), the latter shared by `WorkoutForm` and gym mode, so the two editors cannot drift apart.

## Risks / Trade-offs

- [E2E selectors break when the markup moves] → Keep the existing `data-testid`s on equivalent elements, update the specs that rely on `planned`/`workout-list` both being visible at once (both now sit behind tabs), and add `e2e/mobile-shell.spec.ts` at 360 px.
- [The fixed bottom nav covers the sticky Save/Finish bar or the last set] → The sticky bar's offset is the nav height plus the safe area, and `<main>` reserves both. E2E scrolls to the last set and clicks Finish at 360 px.
- [Font files add about 60–90 KB on first load] → Load only the two subsets and use `font-display: swap`. The files have hashed `/_nuxt/` names, so the browser caches them long-term.
- [Users on a dark OS theme now get light only] → Recorded in decision 10. Revert by removing one config line.
- [Custom 600 px breakpoint differs from Nuxt UI's internal `sm` breakpoints] → Use it only for the shell (nav and sheets). Component internals keep Nuxt UI defaults.
- [`json_group_array` ordering] → Order inside a subquery and cover it with an API test that uses three or more exercises.

## Migration Plan

UI only, plus fields added to one endpoint. There is no DB migration. Roll back by reverting the commit. Old clients ignore the new summary fields.
