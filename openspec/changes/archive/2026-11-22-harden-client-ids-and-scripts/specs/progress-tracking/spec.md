## ADDED Requirements

### Requirement: Unknown exercise address
The system SHALL show "Exercise not found" when an exercise's progress is opened for an id that is not a positive whole number or does not exist, and SHALL NOT request any data for an id that is not a positive whole number.

#### Scenario: Malformed exercise id
- **WHEN** the user opens the progress address with the id `..%2F..%2Fworkouts%2F1`
- **THEN** the system shows "Exercise not found" and requests no progress data

#### Scenario: Unknown but well-formed id
- **WHEN** the user opens progress for exercise id 999999999, which does not exist
- **THEN** the system shows "Exercise not found"
