# gym-mode Specification

## Purpose

Lets the user perform a planned draft at the gym on a phone: tick and adjust sets, have every change saved as it happens, and swap exercises in place.

## Requirements

### Requirement: Gym mode
The system SHALL let the user open a draft in gym mode, where each set can be marked done and its values adjusted. Each exercise SHALL show its last-time values and, when the exercise has one, a link to its video.

#### Scenario: Ticking a set with different values
- **WHEN** the planned set is 12.5 kg x 12 and the user changes reps to 10 and marks it done
- **THEN** the set is stored as done with 12.5 kg x 10

#### Scenario: Watching the video
- **WHEN** the user taps the video link of an exercise in gym mode
- **THEN** the video opens in a new browser tab and gym mode stays open in the original tab

### Requirement: Gym mode set layout
In gym mode each exercise SHALL show its last-time values in a tinted box between its name and its sets. Its sets SHALL form a grid under one header row: the set number, one column per value of the exercise's kind labelled with its unit, and done. Each done control SHALL be at least 44 px square: filled with the brand colour and a check mark when done, an empty outlined box when not. Header and last-time text SHALL be at least 12 px.

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

### Requirement: Gym mode saves every change
In gym mode the system SHALL save each change (a set marked done or undone, a value edited, an exercise swapped, a set added or removed) without a separate save action, and SHALL show when a change could not be saved and keep it on screen until it is saved.

#### Scenario: Page reloaded mid-session
- **WHEN** the user marks two sets done and the page reloads
- **THEN** both sets are still shown as done with their values

#### Scenario: Connection lost
- **WHEN** a change cannot be saved because the server is unreachable
- **THEN** the system shows that the change is not saved yet and retries, without discarding it

### Requirement: Swap an exercise in place
In a draft, the system SHALL let the user replace an exercise with another catalog exercise at the same position. If both have the same kind, the planned sets SHALL be kept; otherwise the sets SHALL be pre-filled with the new exercise's last-time values, or one empty set if it has none. If any set of the replaced exercise was marked done, the system SHALL ask for confirmation first.

#### Scenario: Same kind
- **WHEN** "Flat bench flyes" planned as 3 x 15 at 6 kg is swapped for "Machine flyes"
- **THEN** the new exercise takes the same position with 3 sets of 15 at 6 kg

#### Scenario: Different kind
- **WHEN** a timed exercise is swapped for a weight x reps exercise last done as 40 kg x 10, 40 kg x 8
- **THEN** the new exercise has two sets pre-filled with 40 kg x 10 and 40 kg x 8

#### Scenario: Swapping after a set was done
- **WHEN** one set of the exercise is marked done and the user swaps it
- **THEN** the system asks for confirmation and, if confirmed, the done set is replaced with the new exercise's sets

### Requirement: Swap choices
The swap list SHALL show catalog exercises that are not already in the draft, with exercises from done workouts first ordered by most recently done, followed by never-done exercises alphabetically, and SHALL be searchable by name.

#### Scenario: Recently done first
- **WHEN** the user opens the swap list and "Dumbbell row" was done yesterday and "Deadlift" last week
- **THEN** "Dumbbell row" is listed before "Deadlift", and never-done exercises follow

#### Scenario: Searching
- **WHEN** the user types "row" in the swap list
- **THEN** only exercises whose name contains "row", ignoring letter case, are shown
