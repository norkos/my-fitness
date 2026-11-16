# Spec Delta

## Purpose

Defines how the application is configured and where it keeps its data, so the same container runs locally and on a host without losing workouts.

## ADDED Requirements

### Requirement: Environment-based configuration
The system SHALL read its listening port, database file location, login credentials and session secret from environment variables, and MUST NOT contain default values for the credentials or session secret.

#### Scenario: Port from environment
- **WHEN** the app starts with PORT set to 8080
- **THEN** it accepts HTTP requests on port 8080

#### Scenario: Missing required secret
- **WHEN** the app starts without the username, password or session secret configured
- **THEN** it refuses to start and logs which setting is missing, without logging any secret value

### Requirement: Persistent data location
The system SHALL store all data in a single SQLite database file at the configured location, so that data survives container restarts and image rebuilds when that location is a mounted volume.

#### Scenario: Restart keeps data
- **WHEN** the user logs a workout, then the container is stopped, removed and started again with the same data folder mounted
- **THEN** the workout is still present

#### Scenario: Missing database file
- **WHEN** the app starts and no database file exists at the configured location
- **THEN** it creates a new empty database there

### Requirement: Automatic schema migration
On startup the system SHALL bring the database schema up to date before serving requests, without deleting existing data.

#### Scenario: Upgrade with existing data
- **WHEN** a newer version of the app starts against a database created by an older version
- **THEN** pending schema migrations are applied and all existing workouts remain

### Requirement: Health check
The system SHALL expose an unauthenticated health endpoint that reports whether the app can reach its database, and returns no user data.

#### Scenario: Healthy
- **WHEN** a request is made to the health endpoint while the database is reachable
- **THEN** the system responds with HTTP 200

#### Scenario: Database unavailable
- **WHEN** the database file cannot be opened
- **THEN** the health endpoint responds with a non-200 status
