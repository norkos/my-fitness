# app-shell Specification

## Purpose

Defines the frame shared by every signed-in screen: how the user moves between Workouts and Exercises, how dialogs appear on a phone, and the minimum size of text and touch targets so the app works one-handed.

## Requirements

### Requirement: Primary navigation
Every signed-in screen SHALL offer navigation to Workouts and Exercises and a Log out action. The current section SHALL be marked as active. Workouts is active on the home screen and on every workout screen.

#### Scenario: Active section
- **WHEN** the user is in gym mode for a planned workout
- **THEN** the navigation shows Workouts as the active section

#### Scenario: Log out
- **WHEN** the user taps Log out on any signed-in screen
- **THEN** the session ends and the login screen is shown

### Requirement: Bottom navigation on phones
On screens narrower than 600 px, Workouts and Exercises SHALL appear in a bar fixed to the bottom of the screen, clear of the device's safe area. Page content SHALL never be hidden behind the bar. At 600 px and wider, they SHALL appear in the header instead.

#### Scenario: Phone width
- **WHEN** any signed-in screen is opened at 360 px width
- **THEN** Workouts and Exercises are shown in a fixed bottom bar and not in the header
- **AND** the last item on the page can be scrolled fully above the bar

#### Scenario: Desktop width
- **WHEN** any signed-in screen is opened at 1024 px width
- **THEN** Workouts and Exercises are shown in the header and no bottom bar is shown

### Requirement: Dialogs as bottom sheets on phones
On screens narrower than 600 px, dialogs SHALL open anchored to the bottom edge at full width. On every screen size, a dialog SHALL move keyboard focus into itself when opened, keep focus inside while open, close with Escape, and return focus to the control that opened it.

#### Scenario: Delete confirmation on a phone
- **WHEN** the user taps Delete on a workout at 360 px width
- **THEN** the confirmation opens attached to the bottom of the screen

#### Scenario: Focus returns after closing
- **WHEN** the user opens the edit dialog of an exercise and presses Escape
- **THEN** the dialog closes and focus returns to that exercise's Edit button

### Requirement: Touch targets and readable text
On a 360 px screen, every interactive control SHALL have a touch target at least 44 px high. Form inputs SHALL use text of at least 16 px so the browser does not zoom on focus. No text SHALL be smaller than 12 px.

#### Scenario: Phone audit
- **WHEN** the home, exercises, workout editor and gym mode screens are opened at 360 px width
- **THEN** every button, link and checkbox measures at least 44 px high
- **AND** no screen scrolls horizontally

### Requirement: Fonts served by the app
Every font the app uses SHALL be served from the app's own origin. Text SHALL render correctly for Polish letters.

#### Scenario: No third-party font requests
- **WHEN** any screen is loaded
- **THEN** no request is made to a host other than the app's own

#### Scenario: Polish letters
- **WHEN** an exercise whose name contains the letters ą, ę, ł, ó, ś and ż is shown
- **THEN** every letter renders in the heading or body font, without falling back to a different typeface

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
