# Feature Specification: Functional System Settings

**Feature Branch**: `021-okay-my-hr`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "Okay, my hr site is nearly feature complete for mvp. There is one last feature I would like to add. This may take some additional migration in our rust graphql backend through sea-orm and tying that into the frontend. This mainly concerns the system settings. Most of them currently are placeholders. I would like to be able to set the system settings with these options. System Name should change all instances of "MountainHR" or "SvelteHR" on the frontend. Let's default this to "MoncuraHR". System email should be moved to notification settings. Timezone should be used to set the default timezone for the front and backend. Date format can be removed as it's backend dependent and Language can be removed as we do not have localization at this time. Next in authentication we should be respecting the session timeout, password length, max login attempts and checkboxes with sensible defaults. notifications are great but we need to be able to configure notification channels: email smtp provider, webhook configuration, etc... We should also respect the security settings with sensible defaults with https off by default. I would like the developer log level to set the log level in containers and kubernetes for both our svelte frontend and rust backend."

## Clarifications

### Session 2025-11-11

- Q: How should the system handle timezone storage in the database for timestamps? → A: Store all timestamps in UTC, convert to system timezone only for display
- Q: What should happen when an administrator changes password length requirements and existing users have passwords shorter than the new minimum? → A: Grandfather existing passwords; new minimum applies only to new passwords and password changes
- Q: How should the system apply log level changes to running containers in Kubernetes and Docker? → A: Container restart required; update environment variables and restart pods/containers
- Q: How should the SystemSettings table be structured? → A: Singleton table with one row; settings are updated in place
- Q: How should the system handle webhook delivery failures when sending notifications? → A: Best-effort delivery; log failure and continue without retry

## User Scenarios & Testing *(mandatory)*

### User Story 1 - System Branding Configuration (Priority: P1)

As a system administrator, I want to configure the system name so that all instances of "MountainHR" or "SvelteHR" are replaced with my organization's branding (default: "MoncuraHR"), ensuring consistent branding across the entire application.

**Why this priority**: This is the most visible setting and provides immediate value by allowing organizations to brand the HR system as their own. It's essential for MVP as it demonstrates customization capability and builds trust with users who see their organization's name throughout the application.

**Independent Test**: Can be fully tested by updating the system name in settings and verifying that all UI elements (header, footer, page titles, email templates) reflect the new name, delivering immediate visual branding value.

**Acceptance Scenarios**:

1. **Given** I am logged in as an administrator, **When** I navigate to System Settings and update the system name to "MoncuraHR", **Then** all instances of "MountainHR" and "SvelteHR" in the UI are replaced with "MoncuraHR"
2. **Given** the system name has been changed, **When** I refresh the page or navigate to different sections, **Then** the new system name persists across all pages
3. **Given** no system name has been configured, **When** I access the application for the first time, **Then** the default system name "MoncuraHR" is displayed
4. **Given** I update the system name, **When** system emails are sent (notifications, password resets), **Then** the emails use the configured system name in subject lines and body content

---

### User Story 2 - Timezone Management (Priority: P1)

As a system administrator, I want to set the default timezone for the system so that all date/time displays and backend operations respect the organization's timezone, ensuring consistency across frontend and backend.

**Why this priority**: Timezone configuration is critical for data integrity and user experience. Without proper timezone handling, timestamps will be incorrect, leading to confusion in employee records, leave requests, and audit logs. This is essential for MVP as it ensures data accuracy.

**Independent Test**: Can be fully tested by setting a specific timezone (e.g., "America/Denver"), creating timestamped records (leave requests, timesheet entries), and verifying that both frontend displays and backend database entries reflect the correct timezone.

**Acceptance Scenarios**:

1. **Given** I am logged in as an administrator, **When** I set the system timezone to "America/Denver", **Then** all date/time displays in the UI show times in Mountain Time
2. **Given** the timezone is set to "America/Denver", **When** the backend creates new records with timestamps, **Then** the timestamps are stored in UTC in the database and displayed in Mountain Time on the frontend
3. **Given** a user creates a leave request at 2:00 PM MST, **When** another user in a different browser views the request, **Then** the time displays as 2:00 PM (respecting the system timezone, converted from UTC storage)
4. **Given** the timezone setting is changed, **When** existing records are viewed, **Then** UTC timestamps are converted and displayed in the new timezone without data migration

---

### User Story 3 - Authentication Security Configuration (Priority: P1)

As a system administrator, I want to configure authentication security settings (session timeout, password length requirements, max login attempts) so that I can enforce security policies appropriate for my organization's risk tolerance.

**Why this priority**: Authentication security is fundamental to protecting user data and preventing unauthorized access. These settings directly impact system security and compliance requirements. Essential for MVP as it allows organizations to meet their security standards.

**Independent Test**: Can be fully tested by configuring each authentication setting independently (e.g., set session timeout to 30 minutes) and verifying the system enforces the policy (user is logged out after 30 minutes of inactivity).

**Acceptance Scenarios**:

1. **Given** I set session timeout to 30 minutes, **When** a user is inactive for 30 minutes, **Then** the user is automatically logged out and redirected to the login page
2. **Given** I set minimum password length to 12 characters, **When** a user attempts to create a password with 8 characters, **Then** the system rejects the password and displays a validation error
3. **Given** I set max login attempts to 5, **When** a user enters incorrect credentials 5 times, **Then** the account is locked and the user cannot log in until an administrator unlocks it
4. **Given** authentication settings have been updated, **When** new users are created or existing users change passwords, **Then** the new policies are enforced immediately

---

### User Story 4 - Notification Channel Configuration (Priority: P2)

As a system administrator, I want to configure notification channels (email SMTP provider, webhook endpoints) so that system notifications are delivered reliably through my organization's preferred communication channels.

**Why this priority**: Notification delivery is important for keeping users informed, but the system can function without it initially. This is P2 because it enhances user experience but isn't blocking for core HR functionality.

**Independent Test**: Can be fully tested by configuring an SMTP provider (e.g., SendGrid with API key), sending a test notification, and verifying the email is delivered successfully through the configured channel.

**Acceptance Scenarios**:

1. **Given** I configure SMTP settings (host, port, username, password), **When** I save the configuration and send a test email, **Then** the test email is delivered successfully to the specified recipient
2. **Given** I configure a webhook endpoint for notifications, **When** a system event triggers a notification (e.g., new employee created), **Then** a POST request with the event payload is sent to the webhook URL using best-effort delivery
3. **Given** SMTP credentials are invalid, **When** I attempt to save the configuration, **Then** the system validates the credentials and displays an error if they are incorrect
4. **Given** multiple notification channels are configured, **When** a notification is triggered, **Then** the notification is sent through all enabled channels
5. **Given** I disable email notifications, **When** a notification event occurs, **Then** emails are not sent but other channels (webhooks) still receive the notification
6. **Given** a webhook endpoint is unreachable, **When** a notification is sent, **Then** the system logs the delivery failure and continues without retry

---

### User Story 5 - Security Settings Management (Priority: P2)

As a system administrator, I want to configure security settings (HTTPS enforcement, security headers, CORS policies) so that I can control the security posture of the application based on deployment environment.

**Why this priority**: Security settings are important for production deployments but may not be critical for initial MVP testing in development environments. This is P2 because it can be configured with sensible defaults initially and adjusted later.

**Independent Test**: Can be fully tested by toggling HTTPS enforcement (default: off) and verifying that the system allows HTTP connections when disabled and redirects to HTTPS when enabled.

**Acceptance Scenarios**:

1. **Given** HTTPS enforcement is disabled (default), **When** I access the application via HTTP, **Then** the application loads successfully without redirecting to HTTPS
2. **Given** HTTPS enforcement is enabled, **When** I access the application via HTTP, **Then** the system redirects me to the HTTPS URL
3. **Given** I configure CORS allowed origins, **When** a request comes from an allowed origin, **Then** the request is processed successfully
4. **Given** I configure CORS allowed origins, **When** a request comes from a non-allowed origin, **Then** the request is blocked with a CORS error
5. **Given** security headers are configured (CSP, X-Frame-Options), **When** I inspect HTTP responses, **Then** the configured security headers are present

---

### User Story 6 - Developer Log Level Configuration (Priority: P3)

As a developer or system administrator, I want to configure log levels for frontend and backend containers so that I can control the verbosity of application logs in different environments (development, staging, production).

**Why this priority**: Log level configuration is valuable for debugging and monitoring but isn't essential for core functionality. This is P3 because it primarily supports operations and troubleshooting rather than end-user features.

**Independent Test**: Can be fully tested by setting log level to "DEBUG" in settings, restarting the frontend and backend containers, and verifying that DEBUG-level logs appear in container logs (kubectl logs or docker logs).

**Acceptance Scenarios**:

1. **Given** I set the log level to "DEBUG", **When** I apply the change and containers restart, **Then** DEBUG-level logs are visible in the Svelte frontend container logs
2. **Given** I set the log level to "DEBUG", **When** I apply the change and containers restart, **Then** DEBUG-level logs are visible in the Rust backend container logs
3. **Given** I set the log level to "ERROR", **When** the containers restart with the new configuration, **Then** only ERROR and CRITICAL logs are written to container logs (INFO and DEBUG are suppressed)
4. **Given** I change the log level from "INFO" to "WARN", **When** I apply the change, **Then** the system triggers a rolling restart of pods/containers to apply the new log level via updated environment variables
5. **Given** different log levels are set for frontend and backend, **When** I view logs after restart, **Then** each component respects its independent log level configuration

---

### Edge Cases

- What happens when the system name contains special characters (e.g., "Acme & Co.")?
- How does the system handle timezone changes when there are active user sessions?
- What happens when SMTP credentials are valid initially but later become invalid (expired API key)?
- How does the system handle session timeout edge case where a user is actively typing a form when the session expires?
- What happens when max login attempts is set to 0 or negative value?
- How does the system handle log level changes when containers are scaled across multiple nodes in Kubernetes?
- What happens when timezone is changed while users are viewing timestamped data?
- How does the system handle HTTPS enforcement when SSL certificates are invalid or expired?

## Requirements *(mandatory)*

### Functional Requirements

#### General Settings

- **FR-001**: System MUST allow administrators to configure the system name (default: "MoncuraHR")
- **FR-002**: System MUST replace all instances of "MountainHR" and "SvelteHR" with the configured system name across the entire frontend UI
- **FR-003**: System MUST persist the system name setting and apply it across all pages, components, and email templates
- **FR-004**: System MUST allow administrators to configure the default system timezone
- **FR-005**: System MUST apply the configured timezone to all frontend date/time displays
- **FR-006**: System MUST store all timestamps in UTC in the database and convert to the configured system timezone only for display purposes
- **FR-007**: System MUST remove Date Format and Language settings from the UI as they are not currently supported

#### Authentication Settings

- **FR-008**: System MUST allow administrators to configure session timeout duration (in minutes)
- **FR-009**: System MUST enforce session timeout by automatically logging out inactive users after the configured duration
- **FR-010**: System MUST allow administrators to configure minimum password length (with sensible default of 12 characters)
- **FR-011**: System MUST enforce minimum password length when users create or update passwords; existing passwords shorter than the new minimum are grandfathered and remain valid until the user changes their password
- **FR-012**: System MUST allow administrators to configure max login attempts (with sensible default of 5 attempts)
- **FR-013**: System MUST lock user accounts after max login attempts is exceeded
- **FR-014**: System MUST provide administrator controls for unlocking locked accounts
- **FR-015**: System MUST allow administrators to enable/disable MFA requirement via checkbox
- **FR-016**: System MUST allow administrators to enable/disable password expiration via checkbox
- **FR-017**: System MUST enforce MFA and password expiration policies when enabled

#### Notification Settings

- **FR-018**: System MUST move System Email configuration from General Settings to Notification Settings
- **FR-019**: System MUST allow administrators to configure email notification channels (SMTP provider settings: host, port, username, password, from address)
- **FR-020**: System MUST allow administrators to configure webhook notification channels (webhook URL, authentication token, custom headers)
- **FR-021**: System MUST validate SMTP credentials when configuration is saved
- **FR-022**: System MUST provide a "Send Test Email" function to verify email configuration
- **FR-023**: System MUST send notifications through all enabled notification channels
- **FR-024**: System MUST allow administrators to enable/disable individual notification channels
- **FR-025**: System MUST securely store SMTP credentials and webhook tokens (encrypted in database)
- **FR-026-A**: System MUST use best-effort delivery for webhook notifications; log delivery failures without retry attempts

#### Security Settings

- **FR-027**: System MUST allow administrators to configure HTTPS enforcement (default: off)
- **FR-028**: System MUST redirect HTTP requests to HTTPS when HTTPS enforcement is enabled
- **FR-029**: System MUST allow administrators to configure security headers (CSP, X-Frame-Options, HSTS)
- **FR-030**: System MUST allow administrators to configure CORS allowed origins
- **FR-031**: System MUST enforce CORS policies based on configured allowed origins
- **FR-032**: System MUST provide sensible security defaults (HTTPS off, basic security headers enabled)

#### Developer Settings

- **FR-033**: System MUST allow administrators to configure log level for Svelte frontend containers (DEBUG, INFO, WARN, ERROR)
- **FR-034**: System MUST allow administrators to configure log level for Rust backend containers independently
- **FR-035**: System MUST apply log level changes by updating environment variables and restarting pods/containers in both Docker and Kubernetes environments
- **FR-036**: System MUST trigger rolling restart of affected containers when log level configuration is changed to apply new settings

#### Backend Requirements

- **FR-037**: System MUST create SeaORM migrations to add system_settings table as a singleton table (one row) with fields for all configurable settings
- **FR-038**: System MUST implement GraphQL mutations for updating system settings (UPDATE operation on the singleton row)
- **FR-039**: System MUST implement GraphQL queries for retrieving current system settings (SELECT on the singleton row)
- **FR-040**: System MUST implement RBAC authorization requiring Admin role for system settings mutations
- **FR-041**: System MUST validate all setting values server-side before persisting to database
- **FR-042**: System MUST apply system settings to backend operations (timezone for timestamps, session timeout for JWT expiration)

### Key Entities

- **SystemSettings**: Represents the system-wide configuration settings (singleton table with exactly one row)
  - `id`: Unique identifier (primary key, always 1)
  - `system_name`: Configured system name (default: "MoncuraHR")
  - `system_timezone`: IANA timezone identifier (e.g., "America/Denver")
  - `session_timeout_minutes`: Session timeout duration in minutes
  - `min_password_length`: Minimum required password length
  - `max_login_attempts`: Maximum failed login attempts before lockout
  - `require_mfa`: Boolean flag for MFA enforcement
  - `password_expiration_enabled`: Boolean flag for password expiration policy
  - `https_enforced`: Boolean flag for HTTPS enforcement
  - `log_level_frontend`: Log level for frontend containers
  - `log_level_backend`: Log level for backend containers
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last modification
  - `updated_by`: User ID of administrator who last updated settings

- **NotificationChannel**: Represents a configured notification delivery channel
  - `id`: Unique identifier (primary key)
  - `channel_type`: Type of channel ("email", "webhook")
  - `enabled`: Boolean flag indicating if channel is active
  - `config_json`: JSON blob containing channel-specific configuration (SMTP settings, webhook URL, etc.)
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last modification

- **UserAccount**: Extended to support authentication settings
  - `failed_login_attempts`: Counter for failed login attempts
  - `account_locked`: Boolean flag indicating if account is locked
  - `locked_at`: Timestamp of when account was locked
  - `password_last_changed`: Timestamp of last password change (for expiration)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can update the system name and see changes reflected across all UI elements within 5 seconds
- **SC-002**: Administrators can configure timezone and all existing timestamp displays are converted to the new timezone without data loss
- **SC-003**: Session timeout enforcement logs out inactive users within 60 seconds of the configured timeout duration
- **SC-004**: Password length validation rejects passwords shorter than the configured minimum length with 100% accuracy
- **SC-005**: Account lockout occurs immediately after max login attempts is exceeded, preventing further login attempts
- **SC-006**: Email notifications are successfully delivered through configured SMTP provider with 95%+ delivery rate
- **SC-007**: Webhook notifications are successfully delivered to configured endpoints with 95%+ delivery rate
- **SC-008**: Log level changes propagate to all running containers within 2 minutes of configuration update (including rolling restart time)
- **SC-009**: HTTPS enforcement redirects 100% of HTTP requests to HTTPS when enabled
- **SC-010**: 90% of administrators successfully configure system settings on first attempt without support assistance
