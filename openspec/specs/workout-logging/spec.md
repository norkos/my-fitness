# workout-logging Specification

## Purpose

Lets the user record each gym session after it happens, with its exercises and sets, and keep that record correct over time.

## Requirements

### Requirement: Record a workout
The system SHALL let the user save a workout consisting of a date (defaulting to today), a session type of solo or trainer, and one or more exercises, each with one or more sets whose values follow the exercise's kind.

#### Scenario: Save a trainer session
- **WHEN** the user creates a workout for today tagged trainer, adds "Bench press" with sets 50kg x 8 and 50kg x 8, adds "Plank" with a 45-second set, and saves
- **THEN** the workout is stored with both exercises and all three sets in the entered order
- **AND** it appears at the top of the home screen

#### Scenario: Past date
- **WHEN** the user sets the workout date to an earlier day and saves
- **THEN** the workout is stored with that date and placed accordingly in the history

### Requirement: Workout validation
The system MUST reject a workout that has no exercises, an exercise with no sets, a set missing a required value for its kind, or values that are negative or non-numeric, and SHALL indicate what to fix without losing entered data. A draft MAY contain sets with missing required values; all other rules apply to drafts.

#### Scenario: Missing required value
- **WHEN** the user tries to save a weight x reps set with reps but no weight
- **THEN** the system does not save and highlights the missing weight, keeping the rest of the form intact

#### Scenario: Empty workout
- **WHEN** the user tries to save a workout with no exercises
- **THEN** the system does not save and asks the user to add at least one exercise

#### Scenario: Negative value
- **WHEN** the user enters -5 reps
- **THEN** the system rejects the value as invalid

#### Scenario: Draft with a missing value
- **WHEN** the user saves a draft with a weight x reps set that has reps but no weight
- **THEN** the draft is saved and the missing weight stays empty

### Requirement: Last-time values while logging
When the user adds an exercise to a workout, the system SHALL show the sets recorded for that exercise in the most recent earlier done workout containing it, and SHALL pre-fill the new sets with those values. Drafts SHALL never be used as last-time values.

#### Scenario: Exercise done before
- **WHEN** the user adds "Bench press" to a new workout and the most recent earlier workout with bench press had 50kg x 8 and 50kg x 6
- **THEN** the system shows "last time: 50kg x 8, 50kg x 6" and pre-fills two sets with those values

#### Scenario: Exercise never done
- **WHEN** the user adds an exercise that has no history
- **THEN** the system shows no last-time values and offers one empty set

#### Scenario: Earlier means earlier date
- **WHEN** the user logs a workout dated 10 Nov while workouts with that exercise exist on 5 Nov and 12 Nov
- **THEN** the last-time values come from the 5 Nov workout

#### Scenario: Drafts are ignored
- **WHEN** a draft dated 9 Nov contains bench press at 60kg and the last done workout with bench press on 5 Nov had 50kg x 8
- **THEN** the last-time values for a workout dated 10 Nov are 50kg x 8

### Requirement: View a workout
The system SHALL show a single workout with its date, session type, and every exercise with all its sets.

#### Scenario: Opening a workout
- **WHEN** the user taps a workout in the history
- **THEN** the system shows all its exercises and sets with values formatted per kind

### Requirement: Edit a workout
The system SHALL let the user change any part of a saved workout (date, session type, exercises and sets), applying the same validation as when recording.

#### Scenario: Fixing a typo
- **WHEN** the user opens a saved workout, changes a set from 500kg to 50kg and saves
- **THEN** the workout shows 50kg and progress views reflect the corrected value

### Requirement: Delete a workout
The system SHALL let the user delete a workout after an explicit confirmation; deletion removes all its sets.

#### Scenario: Confirmed delete
- **WHEN** the user deletes a workout and confirms
- **THEN** the workout and its sets are removed from history and from progress views

#### Scenario: Cancelled delete
- **WHEN** the user starts deleting a workout but cancels the confirmation
- **THEN** nothing is removed

### Requirement: Mobile-friendly logging
The logging screens SHALL be usable on a phone-sized screen (360 px wide) without horizontal scrolling, with numeric inputs that open a numeric keyboard.

#### Scenario: Phone viewport
- **WHEN** the new workout screen is opened at 360 px width
- **THEN** all fields and buttons are visible without horizontal scrolling
- **AND** weight, reps, duration and distance inputs request a numeric keyboard

### Requirement: Workout status
Every workout SHALL be either a draft (planned, not yet performed) or done. Workouts recorded with the existing new-workout form SHALL be done. Workouts that existed before this change SHALL be done.

#### Scenario: Recording after the session
- **WHEN** the user records and saves a workout from the new-workout screen
- **THEN** it is stored as done

#### Scenario: Existing data
- **WHEN** the app is upgraded with workouts already logged
- **THEN** all of them are done and appear in history and progress as before

### Requirement: Exercise cards while logging
In the workout editor and in gym mode, each exercise SHALL be shown as a numbered card with its name, kind, last-time values, a progress shortcut, its video link when it has one, its sets, and Add set and Remove actions. In gym mode a card SHALL also offer Swap. The session type SHALL be chosen with a two-option Solo / With trainer control.

#### Scenario: Card contents
- **WHEN** the user adds Squat, which has a video link and a previous session, as the second exercise
- **THEN** its card is labelled 02 and shows Squat, its kind, the last-time values, a progress shortcut and a video link

#### Scenario: Invalid value keeps input
- **WHEN** the user enters reps of 8.5 in a set and saves
- **THEN** that reps field is highlighted with an error and every entered value stays on screen

### Requirement: Unknown workout address
The system SHALL show "Workout not found" when the workout view, edit or gym mode screen is opened with an address whose workout id is not a positive whole number, without requesting any data for it.

#### Scenario: Malformed workout id
- **WHEN** the user opens the workout view for the address id `..%2Fexercises`
- **THEN** the system shows "Workout not found" and requests no workout

#### Scenario: Unknown but well-formed id
- **WHEN** the user opens the workout view for id 999999999, which does not exist
- **THEN** the system shows "Workout not found"
