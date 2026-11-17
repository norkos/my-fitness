# Spec Delta

## ADDED Requirements

### Requirement: Exercise video link
The system SHALL let the user set, change or remove an optional video link on an exercise when creating or editing it. A video link MUST be an `https://` URL; other values SHALL be rejected with a validation message.

#### Scenario: Adding a video
- **WHEN** the user edits "Deska" and enters https://example.com/videos/plank as its video
- **THEN** the exercise is saved with that video link

#### Scenario: Removing a video
- **WHEN** the user clears the video link of an exercise and saves
- **THEN** the exercise has no video link

#### Scenario: Unsafe link
- **WHEN** the user enters "javascript:alert(1)" or "http://example.com/video" as a video link
- **THEN** the system rejects it and asks for an https:// link

### Requirement: Video shown where the exercise appears
When an exercise has a video link, the system SHALL show a video control for it in the exercises list, the workout view, the draft editor and gym mode. Activating it SHALL open the link in a new browser tab. Exercises without a video SHALL show no video control.

#### Scenario: Exercise with a video
- **WHEN** the user views a workout containing "Deska", which has a video link
- **THEN** a video control is shown next to "Deska" and opens the video in a new tab

#### Scenario: Exercise without a video
- **WHEN** the user views an exercise that has no video link
- **THEN** no video control is shown for it

## MODIFIED Requirements

### Requirement: Kind is fixed once used
The system SHALL allow changing an exercise's kind only while the exercise has no logged sets, so recorded measurements stay consistent. Sets in planned (draft) workouts are not logged sets.

#### Scenario: Change kind of unused exercise
- **WHEN** the user changes the kind of an exercise that has never been logged
- **THEN** the kind is updated

#### Scenario: Change kind of used exercise
- **WHEN** the user tries to change the kind of an exercise that has logged sets
- **THEN** the system rejects the change and explains that the kind cannot change once the exercise has history

#### Scenario: Exercise only in a plan
- **WHEN** the user changes the kind of an exercise that appears only in planned workouts, e.g. after an import guessed it wrong
- **THEN** the kind is updated and the planned workouts keep the exercise
