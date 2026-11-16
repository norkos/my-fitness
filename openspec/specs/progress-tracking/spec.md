# progress-tracking Specification

## Purpose

Shows the user how each exercise has developed over time, using a metric that makes sense for the exercise kind.

## Requirements

### Requirement: Progress metric per kind
For each workout containing an exercise, the system SHALL derive one progress value from that workout's sets: weight x reps uses the heaviest weight (ties broken by most reps at that weight); bodyweight uses the most reps in one set; timed uses the longest duration; cardio uses the longest duration and, when recorded, the longest distance.

#### Scenario: Weight x reps
- **WHEN** a workout has bench press sets 50kg x 8, 55kg x 5 and 55kg x 6
- **THEN** that workout's progress value is 55kg x 6

#### Scenario: Bodyweight
- **WHEN** a workout has pull-up sets of 6, 8 and 5 reps
- **THEN** that workout's progress value is 8 reps

#### Scenario: Timed
- **WHEN** a workout has plank sets of 45 s and 60 s
- **THEN** that workout's progress value is 60 s

#### Scenario: Cardio with distance
- **WHEN** a workout has a rowing set of 600 s and 2000 m
- **THEN** that workout's progress values are 600 s and 2000 m

### Requirement: Exercise progress chart
The system SHALL show, for a selected exercise, a chart of its progress value over workout dates in chronological order.

#### Scenario: Several workouts
- **WHEN** the user opens progress for bench press logged on 1, 5 and 12 Nov
- **THEN** the chart shows three points in date order with each workout's progress value

#### Scenario: Single workout
- **WHEN** the exercise has been logged only once
- **THEN** the system shows that single value without an error

#### Scenario: No history
- **WHEN** the exercise has never been logged
- **THEN** the system shows an empty state instead of a chart

### Requirement: Exercise history list
Below the chart, the system SHALL list every workout containing the exercise, newest first, with the date, session type and all sets for that exercise.

#### Scenario: History details
- **WHEN** the user views progress for bench press
- **THEN** each listed entry shows the workout date, solo/trainer tag and all bench press sets from that workout

### Requirement: Reach progress from anywhere relevant
The system SHALL let the user open an exercise's progress from the exercises list and from an exercise within a workout view.

#### Scenario: From the exercises list
- **WHEN** the user taps an exercise in the exercises list
- **THEN** that exercise's progress view opens

#### Scenario: From a workout
- **WHEN** the user taps an exercise while viewing a workout
- **THEN** that exercise's progress view opens
