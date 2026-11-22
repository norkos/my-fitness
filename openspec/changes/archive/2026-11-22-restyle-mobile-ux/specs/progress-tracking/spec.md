# Spec Delta

## MODIFIED Requirements

### Requirement: Reach progress from anywhere relevant
The system SHALL let the user open an exercise's progress from the exercises list, from an exercise within a workout view, and from each exercise card in the workout editor and gym mode. From the editor and gym mode, progress (the same chart and full history) SHALL open over the workout without leaving it, so nothing entered is lost.

#### Scenario: From the exercises list
- **WHEN** the user taps an exercise in the exercises list
- **THEN** that exercise's progress view opens

#### Scenario: From a workout
- **WHEN** the user taps an exercise while viewing a workout
- **THEN** that exercise's progress view opens

#### Scenario: From the editor
- **WHEN** the user has typed unsaved sets for a new workout, taps the progress shortcut on Squat and closes it
- **THEN** Squat's chart and history are shown, and after closing, every typed value is still in the editor

#### Scenario: From gym mode
- **WHEN** the user taps the progress shortcut on Squat in gym mode
- **THEN** Squat's chart and history are shown over gym mode, and closing them returns to the same sets, including those already ticked
