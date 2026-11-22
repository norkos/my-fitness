# Spec Delta

## MODIFIED Requirements

### Requirement: List exercises
The system SHALL show all exercises sorted alphabetically by name, each with its kind and with actions to open its progress and edit it, plus its video link when it has one.

#### Scenario: Viewing the list
- **WHEN** the user opens the exercises screen
- **THEN** all exercises are listed alphabetically with their kind indicated
- **AND** each row offers Progress and Edit, and a video link when the exercise has one

## ADDED Requirements

### Requirement: Search exercises
The exercises screen SHALL filter the list as the user types, keeping exercises whose name contains the search text, ignoring letter case. Clearing the search SHALL show the full list again. When nothing matches, the screen SHALL say so and offer to clear the search.

#### Scenario: Matching names
- **WHEN** the catalog has Bench Press, Incline Bench Press and Squat and the user types "bench"
- **THEN** only Bench Press and Incline Bench Press are listed

#### Scenario: No match
- **WHEN** the user types "zzz"
- **THEN** the screen says no exercises match and offers Clear search, which restores the full list

### Requirement: Add exercise from a dialog
The exercises screen SHALL offer an Add exercise action that opens a dialog with name, kind and an optional video link. Saving SHALL apply the same validation as creating an exercise. On success the dialog closes and the new exercise appears in the list. On error the dialog stays open, the invalid field is highlighted and the entered values are kept.

#### Scenario: Adding with a video
- **WHEN** the user adds "Goblet Squat" with kind weight x reps and video https://example.com/goblet
- **THEN** the dialog closes and Goblet Squat appears in the list with a video link

#### Scenario: Duplicate in the dialog
- **WHEN** the user adds "bench press" while Bench Press exists
- **THEN** the dialog stays open with the name field showing that the exercise already exists
