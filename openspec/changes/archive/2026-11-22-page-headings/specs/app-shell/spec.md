## ADDED Requirements

### Requirement: Page headings
The Workouts home, Exercises and gym mode screens SHALL open with a page heading: an uppercase eyebrow line, a level-one title followed by a decorative green dot that is not part of the title's accessible name, and a one-line subtitle. Eyebrow and subtitle SHALL be at least 12 px and use the muted text colour with at least 4.5:1 contrast. In gym mode, the workout date, session type and save status SHALL stay visible directly below the heading.

#### Scenario: Workouts home heading
- **WHEN** the user opens the home screen at 360 px width
- **THEN** the eyebrow "YOUR GYM NOTEBOOK", a level-one heading named "Workouts" and the subtitle "Plan your session. Log your progress." are shown above the Plan and Import buttons
- **AND** the green dot after the title is not part of the heading's accessible name

#### Scenario: Exercises heading
- **WHEN** the user opens the Exercises screen
- **THEN** the eyebrow "YOUR EXERCISE LIBRARY", a level-one heading named "Exercises" and the subtitle "Your movements, last time's numbers, and progress." are shown above the search

#### Scenario: Gym mode keeps the date and save status
- **WHEN** the user starts a planned trainer workout dated 24 November in gym mode
- **THEN** the eyebrow "FOLLOW YOUR PLAN", a level-one heading named "Gym mode" and the subtitle "Adjust the numbers. Tick the sets you actually do." are shown
- **AND** the workout's date, its trainer session badge and the save status are shown below the heading

#### Scenario: Readable heading text
- **WHEN** the home, Exercises and gym mode screens are opened at 360 px width
- **THEN** the eyebrow and subtitle text measure at least 12 px

### Requirement: List count rows
While the planned list, the history list or the exercise list has at least one item, a count row SHALL appear directly above it: an uppercase label on the left and the item count on the right, singular for one item. The exercise count SHALL count the exercises the search currently shows. An empty list SHALL show its empty state and no count row.

#### Scenario: Planned count
- **WHEN** the user has two planned workouts and opens the Planned tab
- **THEN** the row "READY WHEN YOU ARE" with "2 workouts" is shown above the planned list

#### Scenario: Singular history count
- **WHEN** the user has one finished workout and opens the History tab
- **THEN** the row "YOUR PREVIOUS SESSIONS" with "1 workout" is shown above the history list

#### Scenario: Count follows the search
- **WHEN** the catalog has "Bench press", "Back squat" and "Plank" and the user searches for "squat"
- **THEN** the row "YOUR EXERCISES" shows "1 exercise"

#### Scenario: Empty list shows no count row
- **WHEN** the user has no planned workouts and opens the Planned tab
- **THEN** no count row is shown and the planned empty state is shown
