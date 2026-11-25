## MODIFIED Requirements

### Requirement: Gym mode
The system SHALL let the user open a draft in gym mode, where each set can be marked done and its values adjusted. Each exercise SHALL show its last-time values and, when the exercise has one, a link to its video. The last-time values SHALL appear in a tinted box between the exercise's name and its sets. Each exercise's sets SHALL form a grid under one header row naming the columns: the set number, one column per value of the exercise's kind labelled with its unit, and done. Each set's done control SHALL be at least 44 px square and look clearly different when done: filled with the brand colour and a check mark, versus an empty outlined box when not done. Header and last-time text SHALL be at least 12 px.

#### Scenario: Ticking a set with different values
- **WHEN** the planned set is 12.5 kg x 12 and the user changes reps to 10 and marks it done
- **THEN** the set is stored as done with 12.5 kg x 10

#### Scenario: Watching the video
- **WHEN** the user taps the video link of an exercise in gym mode
- **THEN** the video opens in a new browser tab and gym mode stays open in the original tab

#### Scenario: Column headers follow the kind
- **WHEN** a draft has Bench Press (weight x reps), Push-ups (bodyweight) and Plank (timed, in seconds) and the user opens it in gym mode
- **THEN** Bench Press's sets are headed SET, KG, REPS, DONE
- **AND** Push-ups's sets are headed SET, REPS, +KG, DONE
- **AND** Plank's sets are headed SET, S, DONE

#### Scenario: Done check filled
- **WHEN** Bench Press has two planned sets and the user marks the first one done
- **THEN** the first set's done control is filled with the brand colour and reports itself as checked
- **AND** the second set's done control stays an outlined, unfilled box and reports itself as unchecked

#### Scenario: Last-time box
- **WHEN** Bench Press was last done on 10 Nov 2026 as 40 kg x 10, 40 kg x 8 and the user opens a later draft with it in gym mode
- **THEN** a tinted box under its name reads "Last time (Tue, 10 Nov 2026): 40kg x 10, 40kg x 8"
- **AND** an exercise never done before shows "No previous record" in the same box

#### Scenario: Grid on a phone
- **WHEN** the user views a weight x reps exercise in gym mode at 360 px width
- **THEN** each set row fits the width without horizontal scrolling, with its inputs aligned under their headers
