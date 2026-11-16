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
The system MUST reject a workout that has no exercises, an exercise with no sets, a set missing a required value for its kind, or values that are negative or non-numeric, and SHALL indicate what to fix without losing entered data.

#### Scenario: Missing required value
- **WHEN** the user tries to save a weight x reps set with reps but no weight
- **THEN** the system does not save and highlights the missing weight, keeping the rest of the form intact

#### Scenario: Empty workout
- **WHEN** the user tries to save a workout with no exercises
- **THEN** the system does not save and asks the user to add at least one exercise

#### Scenario: Negative value
- **WHEN** the user enters -5 reps
- **THEN** the system rejects the value as invalid

### Requirement: Last-time values while logging
When the user adds an exercise to a workout, the system SHALL show the sets recorded for that exercise in the most recent earlier workout containing it, and SHALL pre-fill the new sets with those values.

#### Scenario: Exercise done before
- **WHEN** the user adds "Bench press" to a new workout and the most recent earlier workout with bench press had 50kg x 8 and 50kg x 6
- **THEN** the system shows "last time: 50kg x 8, 50kg x 6" and pre-fills two sets with those values

#### Scenario: Exercise never done
- **WHEN** the user adds an exercise that has no history
- **THEN** the system shows no last-time values and offers one empty set

#### Scenario: Earlier means earlier date
- **WHEN** the user logs a workout dated 10 Nov while workouts with that exercise exist on 5 Nov and 12 Nov
- **THEN** the last-time values come from the 5 Nov workout

### Requirement: Workout history list
The home screen SHALL list workouts newest first, showing for each its date, session type and number of exercises.

#### Scenario: Viewing history
- **WHEN** the user opens the home screen with three logged workouts
- **THEN** they are listed newest first with date, solo/trainer tag and exercise count

#### Scenario: No workouts yet
- **WHEN** the user opens the home screen before logging anything
- **THEN** the system shows an empty state inviting them to log the first workout

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
