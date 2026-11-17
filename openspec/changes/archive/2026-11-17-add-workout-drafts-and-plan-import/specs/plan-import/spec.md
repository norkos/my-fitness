# Spec Delta

## Purpose

Turns a training plan PDF from the trainer into a draft workout, linking each planned exercise to the exercise catalog so the plan can be adjusted and then followed in the gym.

## ADDED Requirements

### Requirement: Supported plan format
The system SHALL read plan PDFs laid out as a single table with the columns Nr, Nazwa Ćwiczenia, Serie, Ruchy, Tempo, RIR and Ciężar, one exercise per row, where an exercise name may carry a link. Other layouts SHALL be rejected with a message that the file could not be read as a plan, without creating anything.

#### Scenario: Trainer's plan
- **WHEN** the user imports the trainer's PDF with eight exercise rows
- **THEN** the system shows eight planned exercises in the table's order

#### Scenario: Unrelated PDF
- **WHEN** the user imports a PDF that has no such table
- **THEN** the system shows that the file could not be read as a training plan and creates no draft or exercise

#### Scenario: Not a PDF
- **WHEN** the user selects a file that is not a PDF
- **THEN** the system rejects it with a message and creates nothing

### Requirement: Values read from each row
For each row the system SHALL read the exercise name, the number of sets (Serie), the reps or duration (Ruchy) and the weight (Ciężar). A Ruchy value with an `s` suffix SHALL be read as a duration in seconds. The Nr, Tempo and RIR columns SHALL be ignored.

#### Scenario: Weight and reps row
- **WHEN** a row reads "Wyciskanie hantli leżąc", 4, 10, 3010, 2, "12,5kg"
- **THEN** the planned exercise has 4 sets of 10 reps at 12.5 kg

#### Scenario: Timed row
- **WHEN** a row reads "Deska", 3, "40s", 2010, 1, "40s"
- **THEN** the planned exercise has 3 sets of 40 seconds and no weight

#### Scenario: Repeated weight columns
- **WHEN** the table has the columns "Ciężar T1" and "Ciężar T2"
- **THEN** the weight is read from "Ciężar T1", the first of them, and the other column is ignored

#### Scenario: Two weights in one cell
- **WHEN** the weight cell reads "6/8kg"
- **THEN** the planned weight is 6 kg for every set and the user can change it in the draft

#### Scenario: Missing or unreadable value
- **WHEN** a row has a blank or unreadable weight or reps value
- **THEN** that value is left empty in the draft and the row is marked for the user to complete

### Requirement: Video link from the exercise name
The system SHALL take the link attached to an exercise name in the PDF, when present, as that exercise's video link. Only `https://` links SHALL be accepted; rows without a link SHALL import with no video.

#### Scenario: Name with a link
- **WHEN** the name "Deska" links to https://example.com/videos/plank
- **THEN** the planned exercise carries that video link

#### Scenario: Name without a link
- **WHEN** an exercise name has no link
- **THEN** the exercise imports without a video and no error is shown

### Requirement: Matching names to the catalog
The system SHALL match each imported name to an existing exercise when the names are equal after ignoring letter case, surrounding whitespace and trailing punctuation or apostrophe suffixes. Names SHALL be kept in their original language.

#### Scenario: Existing exercise
- **WHEN** the catalog has "Deska" and the PDF row reads " deska "
- **THEN** the row is linked to the existing "Deska" exercise

#### Scenario: Trailing apostrophe suffix
- **WHEN** the catalog has "Russian twist" and the PDF row reads "Russian twist's"
- **THEN** the row is linked to the existing "Russian twist" exercise

### Requirement: Review before creating the draft
Before anything is saved, the system SHALL show every imported row with its values and match. For an unmatched name the user SHALL choose to create a new exercise, with a guessed kind they can change, or to link it to an existing exercise. Nothing SHALL be saved until the user confirms.

#### Scenario: Guessed kind for a new exercise
- **WHEN** an unmatched row has reps and a weight
- **THEN** it is proposed as a new weight x reps exercise; a row with reps and no weight is proposed as bodyweight, and a row with a duration as timed

#### Scenario: Link to an existing exercise instead
- **WHEN** the user links the unmatched "Wznosy boczne" row to the existing exercise "Wznosy bokiem"
- **THEN** the draft uses "Wznosy bokiem" and no new exercise is created

#### Scenario: Cancelling the import
- **WHEN** the user leaves the review without confirming
- **THEN** no draft and no exercise is created

#### Scenario: Kind conflicts with the row
- **WHEN** a row with a duration is linked to an existing weight x reps exercise
- **THEN** the review shows that the planned values do not fit that exercise's kind, and those values are left empty in the draft

### Requirement: Draft created from the import
On confirmation the system SHALL create any confirmed new exercises and one draft workout dated tomorrow by default and tagged trainer, containing the exercises in table order with the read sets. The date and session type SHALL be editable in the review.

#### Scenario: Confirming the import
- **WHEN** the user confirms a review of eight rows, two of them new exercises
- **THEN** two exercises are added to the catalog and a draft dated tomorrow appears under Planned with eight exercises

### Requirement: Video links fill missing catalog videos
On confirmation, an imported video link SHALL be stored on the exercise when the exercise has no video link yet. An existing video link SHALL NOT be overwritten by an import.

#### Scenario: Exercise without a video
- **WHEN** a matched exercise has no video and the row carries a link
- **THEN** the exercise's video link is set to the imported link

#### Scenario: Exercise with a different video
- **WHEN** a matched exercise already has a video link that differs from the row's link
- **THEN** the exercise keeps its existing video link
