## MODIFIED Requirements

### Requirement: List exercises
The system SHALL show all exercises sorted alphabetically by name, each with its kind and with actions to open its progress and edit it, plus its video link when it has one. Each row SHALL start with an icon tile whose icon identifies the exercise's kind and whose tint identifies its kind family: weight x reps and bodyweight share one tint, timed and cardio each have their own. Each action SHALL be at least 44 px tall and narrower than 44 px, so the name keeps most of the row.

#### Scenario: Viewing the list
- **WHEN** the user opens the exercises screen
- **THEN** all exercises are listed alphabetically with their kind indicated
- **AND** each row offers Progress and Edit, and a video link when the exercise has one

#### Scenario: Tile per kind
- **WHEN** the catalog has Bench Press (weight x reps), Push-ups (bodyweight), Plank (timed) and Rowing (cardio)
- **THEN** each of the four rows shows a different tile icon
- **AND** Bench Press and Push-ups share a tile tint, while Plank and Rowing each have a tint different from it and from each other

#### Scenario: Compact row on a phone
- **WHEN** the user views an exercise with a video link at 360 px width
- **THEN** its Video, Progress and Edit actions sit on one row to the right of the name, each at least 44 px tall and narrower than 44 px
- **AND** the name and kind label are at least 12 px
