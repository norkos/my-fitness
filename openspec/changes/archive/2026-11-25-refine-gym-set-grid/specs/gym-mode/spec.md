## MODIFIED Requirements

### Requirement: Gym mode set layout
In gym mode each exercise SHALL show a tinted box under its name reading "Last time: " plus its previous sets without a date, or "No previous record". Its sets SHALL form a grid under a header row: set number, one column per value of its kind labelled with its unit in capitals, and done; bodyweight shows weight before reps. Done controls SHALL be at least 44 px square: brand-filled with a check when done, empty when not. Header and last-time text SHALL be at least 12 px.

#### Scenario: Column headers follow the kind
- **WHEN** a draft has Bench Press (weight x reps), Push-ups (bodyweight) and Plank (timed, in seconds) and the user opens it in gym mode
- **THEN** Bench Press's sets are headed SET, KG, REPS, DONE
- **AND** Push-ups's sets are headed SET, +KG, REPS, DONE and each set's weight input comes before its reps input
- **AND** Plank's sets are headed SET, S, DONE

#### Scenario: Done check filled
- **WHEN** Bench Press has two planned sets and the user marks the first one done
- **THEN** the first set's done control is filled with the brand colour and reports itself as checked
- **AND** the second set's done control stays an outlined, unfilled box and reports itself as unchecked

#### Scenario: Last-time box
- **WHEN** Bench Press was last done as 40 kg x 10, 40 kg x 8 and the user opens a later draft with it in gym mode
- **THEN** a tinted box under its name reads "Last time: 40 kg × 10 · 40 kg × 8"
- **AND** an exercise never done before shows "No previous record" in the same box

#### Scenario: Grid on a phone
- **WHEN** the user views a weight x reps exercise in gym mode at 360 px width
- **THEN** each set row fits the width without horizontal scrolling, with its inputs aligned under their headers
