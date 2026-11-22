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
The home screen SHALL list done workouts newest first under a History tab, showing for each its date, session type, number of exercises and number of sets. Drafts SHALL NOT appear in this list. Opening a row SHALL show that workout.

#### Scenario: Viewing history
- **WHEN** the user opens the History tab with three logged workouts
- **THEN** they are listed newest first with date, solo/trainer tag, exercise count and set count

#### Scenario: No workouts yet
- **WHEN** the user opens the History tab before logging anything
- **THEN** the system shows an empty state saying completed workouts will appear there

#### Scenario: Draft not in history
- **WHEN** the user has one draft and no done workouts
- **THEN** the draft is shown in the Planned tab and the History tab shows its empty state

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
The home screen SHALL show drafts under a Planned tab, ordered by date ascending. Each draft SHALL be shown as a card with its date, session type, exercise and set counts, the names of its first three exercises plus a "+N more" note when it has more, an Edit plan action and a Start in gym action.

#### Scenario: Draft for tomorrow
- **WHEN** the user has a draft dated tomorrow and three done workouts
- **THEN** the draft appears in the Planned tab and the History tab lists only the three done workouts

#### Scenario: Exercise preview
- **WHEN** a draft contains Bench Press, Squat, Plank and Rowing, in that order
- **THEN** its card shows Bench Press, Squat and Plank followed by "+1 more"

#### Scenario: Start in gym from the card
- **WHEN** the user taps Start in gym on a planned card
- **THEN** that draft opens in gym mode

#### Scenario: No drafts
- **WHEN** there are no drafts
- **THEN** the Planned tab shows an empty state inviting the user to plan a workout or import a plan

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

### Requirement: Home screen tabs
The home screen SHALL show New workout as its primary action, Plan workout and Import plan as secondary actions, and Planned and History tabs, each labelled with its number of workouts. It SHALL open on Planned when at least one draft exists and on History otherwise. The selected tab SHALL be kept when the user navigates back to the home screen.

#### Scenario: Opening with drafts
- **WHEN** the user has two drafts and five done workouts and opens the home screen
- **THEN** the Planned tab is selected and the tabs read "Planned 2" and "History 5"

#### Scenario: Opening without drafts
- **WHEN** the user has no drafts and opens the home screen
- **THEN** the History tab is selected

#### Scenario: Back keeps the tab
- **WHEN** the user selects History, opens a workout and goes back
- **THEN** the History tab is still selected

### Requirement: Workout summaries include sets and exercise names
The workout list returned by the API SHALL include, for each workout, its total number of sets and the names of its exercises in workout order. Neither SHALL change the existing fields.

#### Scenario: Summary of a draft
- **WHEN** a draft has Bench Press with 3 sets and Plank with 2 sets
- **THEN** its summary reports 2 exercises, 5 sets and the names Bench Press and Plank in that order

#### Scenario: Renamed exercise
- **WHEN** an exercise used in a workout is renamed from Bench Press to Flat Bench Press
- **THEN** the workout's summary shows Flat Bench Press

### Requirement: Exercise cards while logging
In the workout editor and in gym mode, each exercise SHALL be shown as a numbered card with its name, kind, last-time values, a progress shortcut, its video link when it has one, its sets, and Add set and Remove actions. In gym mode a card SHALL also offer Swap. The session type SHALL be chosen with a two-option Solo / With trainer control.

#### Scenario: Card contents
- **WHEN** the user adds Squat, which has a video link and a previous session, as the second exercise
- **THEN** its card is labelled 02 and shows Squat, its kind, the last-time values, a progress shortcut and a video link

#### Scenario: Invalid value keeps input
- **WHEN** the user enters reps of 8.5 in a set and saves
- **THEN** that reps field is highlighted with an error and every entered value stays on screen
