# Proposal

## Why

The trainer sends a training plan as a PDF (a spreadsheet export with exercise names, sets, reps or time, weight and a YouTube link per exercise). Today the app only records a workout after it happened, so the plan has to be retyped by hand and cannot be followed in the gym. The user wants to prepare the session a day ahead from that PDF, adjust it, then work through it in the gym, recording actual results and swapping exercises when equipment is busy.

## What Changes

- Workouts get a status: **draft** (planned, not yet done) or **done**. Existing workouts become done. A draft's values are only a starting point and are overwritten by actual results; no planned-vs-actual history is kept.
- Drafts can be created by hand or by **importing the trainer's PDF**. Import reads, per exercise row: name, number of sets, reps or time (e.g. `45s`), weight and the YouTube link (optional). Tempo, RIR and superset pairing (1a/1b) are ignored. Names stay in Polish as written.
- Import matches each name against the exercise catalog (case/whitespace-insensitive, ignoring trailing punctuation) and shows a review step: matched rows link automatically, unknown names become new exercises only after the user confirms (with a guessed kind they can change) or are linked to an existing exercise.
- **Gym mode** for a draft: each set can be ticked as done with its values adjusted; every change is saved immediately. **Finish** turns the draft into a done workout, dropping unticked sets and exercises with no ticked sets.
- **Swap in place**: an exercise in a draft can be replaced by another catalog exercise at the same position, with previously done exercises listed first and their last-time values used.
- Exercises get an optional **video link**, shown as a play link in the catalog, workout view and gym mode. Import fills it when the exercise has none.
- Drafts are listed separately on the home screen ("Planned") and are excluded from workout history, last-time values and progress.

Out of scope: translating names, muscle groups per exercise and "same muscles" swap suggestions (planned as the next change; the swap list is designed to accept them), other PDF layouts, CSV import, storing tempo/RIR/supersets.

## Capabilities

### New Capabilities
- `plan-import`: Reading a trainer's plan PDF into a draft workout, including name matching against the catalog, kind guessing for new exercises, the review step and error handling for unreadable files.

### Modified Capabilities
- `workout-logging`: Workouts gain draft/done status; drafts with relaxed validation, gym mode with per-set completion and immediate saving, finishing a draft, swapping an exercise in place; history list and last-time values consider only done workouts; home screen shows planned drafts.
- `exercise-catalog`: Exercises gain an optional video link that can be set, changed or removed and is shown where the exercise appears; planned (draft) sets no longer fix an exercise's kind.
- `progress-tracking`: Progress chart and exercise history consider only done workouts.

## Impact

- **Database**: new migration adding `workouts.status` (existing rows set to done), `sets.completed`, and `exercises.video_url`.
- **API**: workout endpoints accept and return status and per-set completion; new finish action; list endpoint separates drafts; exercise create/update accept a video URL; last-time and progress queries filter to done workouts.
- **Frontend**: home screen "Planned" section, draft editing, gym mode page, swap dialog, import page with review step; video links in catalog and workout views.
- **Dependencies**: a PDF reading library (`pdfjs-dist`) used in the browser, so the existing JSON-only, 256 KB request guard stays unchanged.
- **Security**: video URLs restricted to `https://` and opened in a new tab; no embedding, so the CSP stays unchanged apart from verifying the PDF worker loads under `'self'`.
- **Tests**: unit tests for the PDF row parser and name matching (using a generated synthetic plan PDF with made-up values and links as a fixture; no real plan data in the repository), service/API tests for status, finish, filters and video URL, E2E for import → gym mode → finish on a phone viewport.
