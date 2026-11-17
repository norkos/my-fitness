# workout-logging Specification

## Purpose

Lets the user record each gym session after it happens, with its exercises and sets, and keep that record correct over time.

## Requirements

### Requirement: Record a workout
The system SHALL let the user save a workout consisting of a date (defaulting to today), a session type of solo or trainer, and one or more exercises, each with one or more sets whose values follow the exercise's kind.

#### Scenario: Save a trainer session
- **WHEN** the user creates a workout for today tagged trainer, adds "Bench press" with sets 50kg x 8 and 50kg x 8, adds "Plank" with a 45-second set, and saves
- **THEN** the workout is stored with both exercises and all three sets in the entered order
- **AND** it appears at the top of the home screen

#### Scenario: Past date
- **WHEN** the user sets the workout date to an earlier day and saves
- **THEN** the workout is stored with that date and placed accordingly in the history

### Requirement: Workout validation
The system MUST reject a workout that has no exercises, an exercise with no sets, a set missing a required value for its kind, or values that are negative or non-numeric, and SHALL indicate what to fix without losing entered data. A draft MAY contain sets with missing required values; all other rules apply to drafts.

#### Scenario: Missing required value
- **WHEN** the user tries to save a weight x reps set with reps but no weight
- **THEN** the system does not save and highlights the missing weight, keeping the rest of the form intact

#### Scenario: Empty workout
- **WHEN** the user tries to save a workout with no exercises
- **THEN** the system does not save and asks the user to add at least one exercise

#### Scenario: Negative value
- **WHEN** the user enters -5 reps
- **THEN** the system rejects the value as invalid

#### Scenario: Draft with a missing value
- **WHEN** the user saves a draft with a weight x reps set that has reps but no weight
- **THEN** the draft is saved and the missing weight stays empty

### Requirement: Last-time values while logging
When the user adds an exercise to a workout, the system SHALL show the sets recorded for that exercise in the most recent earlier done workout containing it, and SHALL pre-fill the new sets with those values. Drafts SHALL never be used as last-time values.

#### Scenario: Exercise done before
- **WHEN** the user adds "Bench press" to a new workout and the most recent earlier workout with bench press had 50kg x 8 and 50kg x 6
- **THEN** the system shows "last time: 50kg x 8, 50kg x 6" and pre-fills two sets with those values

#### Scenario: Exercise never done
- **WHEN** the user adds an exercise that has no history
- **THEN** the system shows no last-time values and offers one empty set

#### Scenario: Earlier means earlier date
- **WHEN** the user logs a workout dated 10 Nov while workouts with that exercise exist on 5 Nov and 12 Nov
- **THEN** the last-time values come from the 5 Nov workout

#### Scenario: Drafts are ignored
- **WHEN** a draft dated 9 Nov contains bench press at 60kg and the last done workout with bench press on 5 Nov had 50kg x 8
- **THEN** the last-time values for a workout dated 10 Nov are 50kg x 8

### Requirement: Workout history list
The home screen SHALL list done workouts newest first, showing for each its date, session type and number of exercises. Drafts SHALL NOT appear in this list.

#### Scenario: Viewing history
- **WHEN** the user opens the home screen with three logged workouts
- **THEN** they are listed newest first with date, solo/trainer tag and exercise count

#### Scenario: No workouts yet
- **WHEN** the user opens the home screen before logging anything
- **THEN** the system shows an empty state inviting them to log the first workout

#### Scenario: Draft not in history
- **WHEN** the user has one draft and no done workouts
- **THEN** the draft is shown under Planned and the history shows its empty state

### Requirement: View a workout
The system SHALL show a single workout with its date, session type, and every exercise with all its sets.

#### Scenario: Opening a workout
- **WHEN** the user taps a workout in the history
- **THEN** the system shows all its exercises and sets with values formatted per kind

### Requirement: Edit a workout
The system SHALL let the user change any part of a saved workout (date, session type, exercises and sets), applying the same validation as when recording.

#### Scenario: Fixing a typo
- **WHEN** the user opens a saved workout, changes a set from 500kg to 50kg and saves
- **THEN** the workout shows 50kg and progress views reflect the corrected value

### Requirement: Delete a workout
The system SHALL let the user delete a workout after an explicit confirmation; deletion removes all its sets.

#### Scenario: Confirmed delete
- **WHEN** the user deletes a workout and confirms
- **THEN** the workout and its sets are removed from history and from progress views

#### Scenario: Cancelled delete
- **WHEN** the user starts deleting a workout but cancels the confirmation
- **THEN** nothing is removed

### Requirement: Mobile-friendly logging
The logging screens SHALL be usable on a phone-sized screen (360 px wide) without horizontal scrolling, with numeric inputs that open a numeric keyboard.

#### Scenario: Phone viewport
- **WHEN** the new workout screen is opened at 360 px width
- **THEN** all fields and buttons are visible without horizontal scrolling
- **AND** weight, reps, duration and distance inputs request a numeric keyboard

### Requirement: Workout status
Every workout SHALL be either a draft (planned, not yet performed) or done. Workouts recorded with the existing new-workout form SHALL be done. Workouts that existed before this change SHALL be done.

#### Scenario: Recording after the session
- **WHEN** the user records and saves a workout from the new-workout screen
- **THEN** it is stored as done

#### Scenario: Existing data
- **WHEN** the app is upgraded with workouts already logged
- **THEN** all of them are done and appear in history and progress as before

### Requirement: Create and edit drafts
The system SHALL let the user create a draft by hand with the same fields as a workout, and edit a draft's date, session type, exercises and sets at any time before finishing it.

#### Scenario: Draft by hand
- **WHEN** the user chooses "New draft", adds "Bench press" with three sets and saves
- **THEN** a draft is stored and listed under Planned

#### Scenario: Changing a draft the evening before
- **WHEN** the user opens a draft, removes one exercise, changes the date and saves
- **THEN** the draft reflects the changes and stays a draft

### Requirement: Planned drafts on the home screen
The home screen SHALL show drafts in a Planned section above the workout history, ordered by date ascending, each with its date, session type and number of exercises.

#### Scenario: Draft for tomorrow
- **WHEN** the user has a draft dated tomorrow and three done workouts
- **THEN** the draft appears under Planned and the history lists only the three done workouts

#### Scenario: No drafts
- **WHEN** there are no drafts
- **THEN** the Planned section is not shown

### Requirement: Gym mode
The system SHALL let the user open a draft in gym mode, where each set can be marked done and its values adjusted. Each exercise SHALL show its last-time values and, when the exercise has one, a link to its video.

#### Scenario: Ticking a set with different values
- **WHEN** the planned set is 12.5 kg x 12 and the user changes reps to 10 and marks it done
- **THEN** the set is stored as done with 12.5 kg x 10

#### Scenario: Watching the video
- **WHEN** the user taps the video link of an exercise in gym mode
- **THEN** the video opens in a new browser tab and gym mode stays open in the original tab

### Requirement: Gym mode saves every change
In gym mode the system SHALL save each change (a set marked done or undone, a value edited, an exercise swapped, a set added or removed) without a separate save action, and SHALL show when a change could not be saved and keep it on screen until it is saved.

#### Scenario: Page reloaded mid-session
- **WHEN** the user marks two sets done and the page reloads
- **THEN** both sets are still shown as done with their values

#### Scenario: Connection lost
- **WHEN** a change cannot be saved because the server is unreachable
- **THEN** the system shows that the change is not saved yet and retries, without discarding it

### Requirement: Swap an exercise in place
In a draft, the system SHALL let the user replace an exercise with another catalog exercise at the same position. If both have the same kind, the planned sets SHALL be kept; otherwise the sets SHALL be pre-filled with the new exercise's last-time values, or one empty set if it has none. If any set of the replaced exercise was marked done, the system SHALL ask for confirmation first.

#### Scenario: Same kind
- **WHEN** "Flat bench flyes" planned as 3 x 15 at 6 kg is swapped for "Machine flyes"
- **THEN** the new exercise takes the same position with 3 sets of 15 at 6 kg

#### Scenario: Different kind
- **WHEN** a timed exercise is swapped for a weight x reps exercise last done as 40 kg x 10, 40 kg x 8
- **THEN** the new exercise has two sets pre-filled with 40 kg x 10 and 40 kg x 8

#### Scenario: Swapping after a set was done
- **WHEN** one set of the exercise is marked done and the user swaps it
- **THEN** the system asks for confirmation and, if confirmed, the done set is replaced with the new exercise's sets

### Requirement: Swap choices
The swap list SHALL show catalog exercises that are not already in the draft, with exercises from done workouts first ordered by most recently done, followed by never-done exercises alphabetically, and SHALL be searchable by name.

#### Scenario: Recently done first
- **WHEN** the user opens the swap list and "Dumbbell row" was done yesterday and "Deadlift" last week
- **THEN** "Dumbbell row" is listed before "Deadlift", and never-done exercises follow

#### Scenario: Searching
- **WHEN** the user types "row" in the swap list
- **THEN** only exercises whose name contains "row", ignoring letter case, are shown

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
