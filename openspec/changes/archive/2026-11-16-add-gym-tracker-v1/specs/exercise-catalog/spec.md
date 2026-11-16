# Spec Delta

## Purpose

Maintains the list of exercises the user performs and the kind of each exercise, which determines what measurements are recorded and how progress is judged.

## ADDED Requirements

### Requirement: Exercise kinds
Each exercise SHALL have exactly one kind. The kinds and the measurements they record per set are: weight x reps (weight in kg and reps, both required), bodyweight (reps required, added weight in kg optional), timed (duration in seconds required), cardio (duration in seconds required, distance in meters optional).

#### Scenario: Weight x reps measurements
- **WHEN** the user logs a set for an exercise of kind weight x reps
- **THEN** the system asks for weight in kg and number of reps, and requires both

#### Scenario: Bodyweight measurements
- **WHEN** the user logs a set for an exercise of kind bodyweight
- **THEN** the system requires reps and offers an optional added weight in kg

#### Scenario: Timed measurements
- **WHEN** the user logs a set for an exercise of kind timed
- **THEN** the system requires a duration in seconds and asks for nothing else

#### Scenario: Cardio measurements
- **WHEN** the user logs a set for an exercise of kind cardio
- **THEN** the system requires a duration and offers an optional distance in meters

### Requirement: Create exercise
The system SHALL let the user create an exercise by giving a name and choosing a kind. Names MUST be non-empty and unique, ignoring letter case and surrounding whitespace.

#### Scenario: New exercise
- **WHEN** the user creates an exercise named "Bench press" with kind weight x reps
- **THEN** the exercise appears in the exercise list and can be selected when logging a workout

#### Scenario: Duplicate name
- **WHEN** the user creates an exercise named " bench PRESS " while "Bench press" already exists
- **THEN** the system rejects it with a message that the exercise already exists

#### Scenario: Empty name
- **WHEN** the user tries to create an exercise with a blank name
- **THEN** the system rejects it with a validation message

### Requirement: List exercises
The system SHALL show all exercises sorted alphabetically by name, each with its kind.

#### Scenario: Viewing the list
- **WHEN** the user opens the exercises screen
- **THEN** all exercises are listed alphabetically with their kind indicated

### Requirement: Rename exercise
The system SHALL let the user rename an exercise, subject to the same name rules as creation. Renaming MUST keep all of the exercise's logged history.

#### Scenario: Rename keeps history
- **WHEN** the user renames "Bench" to "Bench press"
- **THEN** all previously logged sets for that exercise appear under "Bench press"

### Requirement: Kind is fixed once used
The system SHALL allow changing an exercise's kind only while the exercise has no logged sets, so recorded measurements stay consistent.

#### Scenario: Change kind of unused exercise
- **WHEN** the user changes the kind of an exercise that has never been logged
- **THEN** the kind is updated

#### Scenario: Change kind of used exercise
- **WHEN** the user tries to change the kind of an exercise that has logged sets
- **THEN** the system rejects the change and explains that the kind cannot change once the exercise has history
