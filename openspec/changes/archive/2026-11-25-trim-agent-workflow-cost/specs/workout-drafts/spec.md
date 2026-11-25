# Spec Delta

## Purpose

Lets the user plan a workout ahead as a draft, change it before the session, turn it into a done workout once performed, and start a new draft from a done workout.

## ADDED Requirements

### Requirement: Create and edit drafts
The system SHALL let the user create a draft by hand with the same fields as a workout, and edit a draft's date, session type, exercises and sets at any time before finishing it.

#### Scenario: Draft by hand
- **WHEN** the user chooses "New draft", adds "Bench press" with three sets and saves
- **THEN** a draft is stored and listed under Planned

#### Scenario: Changing a draft the evening before
- **WHEN** the user opens a draft, removes one exercise, changes the date and saves
- **THEN** the draft reflects the changes and stays a draft

### Requirement: Finish a draft
The system SHALL let the user finish a draft, which turns it into a done workout keeping only sets marked done and only exercises with at least one done set. Finishing SHALL apply the validation of a done workout and SHALL be refused if no set is marked done.

#### Scenario: Partly completed plan
- **WHEN** the user finishes a draft with eight exercises, where seven have all sets done and one has none
- **THEN** the workout becomes done with seven exercises and appears in history

#### Scenario: Nothing done
- **WHEN** the user tries to finish a draft with no set marked done
- **THEN** the system refuses and explains that at least one set must be done

#### Scenario: Late change after finishing
- **WHEN** a change made to the draft in gym mode or in another tab reaches the server after the draft was finished
- **THEN** the system refuses it and the finished workout keeps only the sets that were done

#### Scenario: Done set with a missing value
- **WHEN** a set marked done has no weight for a weight x reps exercise
- **THEN** the system does not finish and highlights the missing weight

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

#### Scenario: Malformed source address
- **WHEN** the plan screen is opened with a source that is not a positive whole number, such as `..`, `abc`, `0`, `-3` or `1.5`
- **THEN** the system makes no request for it, tells the user the workout could not be loaded and offers an empty plan instead
