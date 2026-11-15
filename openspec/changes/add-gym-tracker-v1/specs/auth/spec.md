# Spec Delta

## Purpose

Restricts the application to its single owner by requiring a login with configured credentials and keeping that login alive through a long-lived session.

## ADDED Requirements

### Requirement: Login with configured credentials
The system SHALL authenticate a single user whose username and password are provided through runtime configuration. Credentials MUST NOT be stored in source code or in the database.

#### Scenario: Correct credentials
- **WHEN** the user submits the configured username and password on the login screen
- **THEN** the system starts a session and shows the home screen

#### Scenario: Wrong password
- **WHEN** the user submits the configured username with an incorrect password
- **THEN** the system rejects the login, shows a generic "invalid username or password" message, and does not start a session

#### Scenario: Unknown username
- **WHEN** the user submits a username other than the configured one
- **THEN** the system rejects the login with the same generic message as for a wrong password

### Requirement: Long-lived session
The system SHALL keep the user logged in through an HTTP-only session cookie valid for 30 days, so the user does not have to log in after every workout.

#### Scenario: Returning within the session lifetime
- **WHEN** the user opens the app 10 days after logging in, without having logged out
- **THEN** the system shows the home screen without asking for credentials

#### Scenario: Session expired
- **WHEN** the user opens the app more than 30 days after logging in
- **THEN** the system redirects to the login screen

### Requirement: Secure cookie in production
The session cookie MUST be marked Secure when the app runs in production mode, and MUST work over plain HTTP when running in local/development mode so the app can be tested from a phone on the local network.

#### Scenario: Production mode
- **WHEN** the app runs in production mode and the user logs in
- **THEN** the session cookie has the Secure, HttpOnly and SameSite attributes set

#### Scenario: Local network testing
- **WHEN** the app runs in local mode and the user logs in from a phone over http on the local network
- **THEN** the login succeeds and the session persists across page loads

### Requirement: Logout
The system SHALL let the user log out, which ends the session immediately.

#### Scenario: Logging out
- **WHEN** the user chooses "Log out"
- **THEN** the session is cleared and the login screen is shown
- **AND** subsequent data requests without logging in again are rejected

### Requirement: Protected screens and data
Every screen except the login screen, and every data endpoint, MUST require a valid session.

#### Scenario: Unauthenticated screen access
- **WHEN** a visitor without a session opens any screen other than login
- **THEN** the system redirects to the login screen

#### Scenario: Unauthenticated API access
- **WHEN** a request without a valid session is made to any data endpoint
- **THEN** the system responds with HTTP 401 and returns no data
