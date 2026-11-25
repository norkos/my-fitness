# workouts-home Specification

## Purpose

Defines the Workouts home screen: the Planned and History tabs, the cards that list drafts and done workouts, and the workout summaries those cards are built from.

## Requirements

### Requirement: Planned drafts on the home screen
The home screen SHALL show drafts under a Planned tab, ordered by date ascending. Each draft SHALL be shown as a card with its date, session type, exercise and set counts, the names of its first three exercises plus a "+N more" note when it has more, and one action row below a divider: an Edit plan text link on the left and a compact Start in gym button on the right. Both actions SHALL be at least 44 px tall and SHALL name the workout's date in their accessible names.

#### Scenario: Draft for tomorrow
- **WHEN** the user has a draft dated tomorrow and three done workouts
- **THEN** the draft appears in the Planned tab and the History tab lists only the three done workouts

#### Scenario: Exercise preview
- **WHEN** a draft contains Bench Press, Squat, Plank and Rowing, in that order
- **THEN** its card shows Bench Press, Squat and Plank followed by "+1 more"

#### Scenario: Card action row
- **WHEN** the user views a planned card at 360 px width
- **THEN** Edit plan is shown as a text link at the left of the card's last row and Start in gym as a filled button at its right, on the same row
- **AND** Start in gym is narrower than half the card

#### Scenario: Edit plan from the card
- **WHEN** the user taps Edit plan on a planned card
- **THEN** that draft opens in the plan editor

#### Scenario: Start in gym from the card
- **WHEN** the user taps Start in gym on a planned card
- **THEN** that draft opens in gym mode

#### Scenario: No drafts
- **WHEN** there are no drafts
- **THEN** the Planned tab shows an empty state inviting the user to plan a workout or import a plan

### Requirement: Workout history list
The home screen SHALL list done workouts newest first under a History tab, each as its own separate card showing an icon tile, its date, session type, number of exercises and number of sets. Drafts SHALL NOT appear in this list. Each whole card SHALL be a single link, at least 44 px tall, that shows that workout.

#### Scenario: Viewing history
- **WHEN** the user opens the History tab with three logged workouts
- **THEN** they are listed newest first with date, solo/trainer tag, exercise count and set count

#### Scenario: Separate cards
- **WHEN** the user opens the History tab with two logged workouts
- **THEN** each workout is shown in its own card with an icon tile, with space between the two cards

#### Scenario: Opening a workout from its card
- **WHEN** the user taps anywhere on the card of the workout dated 15 November
- **THEN** that workout is shown

#### Scenario: No workouts yet
- **WHEN** the user opens the History tab before logging anything
- **THEN** the system shows an empty state saying completed workouts will appear there

#### Scenario: Draft not in history
- **WHEN** the user has one draft and no done workouts
- **THEN** the draft is shown in the Planned tab and the History tab shows its empty state

### Requirement: Home screen tabs
The home screen SHALL show New workout as its primary action, Plan workout and Import plan as secondary actions, and Planned and History tabs, each labelled with its number of workouts. The tabs SHALL sit side by side at the left edge, each only as wide as its label and count, and each at least 44 px tall. It SHALL open on Planned when at least one draft exists and on History otherwise. The selected tab SHALL be kept when the user navigates back to the home screen.

#### Scenario: Opening with drafts
- **WHEN** the user has two drafts and five done workouts and opens the home screen
- **THEN** the Planned tab is selected and the tabs read "Planned 2" and "History 5"

#### Scenario: Opening without drafts
- **WHEN** the user has no drafts and opens the home screen
- **THEN** the History tab is selected

#### Scenario: Back keeps the tab
- **WHEN** the user selects History, opens a workout and goes back
- **THEN** the History tab is still selected

#### Scenario: Tabs sized to their labels
- **WHEN** the user opens the home screen at 360 px width
- **THEN** the Planned tab starts at the left edge of the content, the History tab follows it on the same row, and together they take less than the full content width
- **AND** each tab is at least 44 px tall

### Requirement: Workout summaries include sets and exercise names
The workout list returned by the API SHALL include, for each workout, its total number of sets and the names of its exercises in workout order. Neither SHALL change the existing fields.

#### Scenario: Summary of a draft
- **WHEN** a draft has Bench Press with 3 sets and Plank with 2 sets
- **THEN** its summary reports 2 exercises, 5 sets and the names Bench Press and Plank in that order

#### Scenario: Renamed exercise
- **WHEN** an exercise used in a workout is renamed from Bench Press to Flat Bench Press
- **THEN** the workout's summary shows Flat Bench Press
