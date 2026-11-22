# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
