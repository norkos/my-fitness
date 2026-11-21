## ADDED Requirements

### Requirement: Repeat a workout as a draft
The system SHALL let the user start a new draft from any done workout. The new draft SHALL be pre-filled with the done workout's session type, its exercises in the same order, and for each exercise the same number of sets with the values recorded in that workout, none marked done, and SHALL be dated today. The user SHALL be able to change the pre-filled draft exactly as when creating a draft by hand, and nothing SHALL be stored until the user saves it. The done workout SHALL remain unchanged.

#### Scenario: Repeating last session
- **WHEN** the user opens a done trainer workout with "Bench press" 50kg x 8 and 50kg x 6 followed by "Plank" 45 s, chooses "Repeat as draft" and saves
- **THEN** a draft dated today is stored, tagged trainer, with "Bench press" 50kg x 8 and 50kg x 6 followed by "Plank" 45 s, and no set marked done
- **AND** it is listed under Planned, while the original workout keeps its date and values in history

#### Scenario: Adjusting before saving
- **WHEN** the user repeats a workout, changes the first bench press set to 52.5kg x 8, removes "Plank" and saves
- **THEN** the draft contains only "Bench press" with 52.5kg x 8 and 50kg x 6

#### Scenario: Leaving without saving
- **WHEN** the user chooses "Repeat as draft" and leaves the plan screen without saving
- **THEN** no draft is stored

#### Scenario: Only done workouts
- **WHEN** the user opens a draft
- **THEN** no "Repeat as draft" action is offered

#### Scenario: Source workout missing
- **WHEN** the plan screen is asked to repeat a workout that no longer exists
- **THEN** the system tells the user the workout could not be loaded and offers an empty plan instead
