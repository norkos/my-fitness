# Spec Delta

## MODIFIED Requirements

### Requirement: Exercise progress chart
The system SHALL show, for a selected exercise, a chart of its progress value over workout dates in chronological order. Only done workouts SHALL be included; drafts SHALL NOT contribute points.

#### Scenario: Several workouts
- **WHEN** the user opens progress for bench press logged on 1, 5 and 12 Nov
- **THEN** the chart shows three points in date order with each workout's progress value

#### Scenario: Single workout
- **WHEN** the exercise has been logged only once
- **THEN** the system shows that single value without an error

#### Scenario: No history
- **WHEN** the exercise has never been logged
- **THEN** the system shows an empty state instead of a chart

#### Scenario: Planned only
- **WHEN** the exercise appears only in a draft
- **THEN** the system shows the empty state instead of a chart

### Requirement: Exercise history list
Below the chart, the system SHALL list every done workout containing the exercise, newest first, with the date, session type and all sets for that exercise. Drafts SHALL NOT be listed.

#### Scenario: History details
- **WHEN** the user views progress for bench press
- **THEN** each listed entry shows the workout date, solo/trainer tag and all bench press sets from that workout

#### Scenario: Draft excluded
- **WHEN** bench press is in two done workouts and one draft
- **THEN** the list shows only the two done workouts
