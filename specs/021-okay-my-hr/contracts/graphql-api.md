# GraphQL API Contract: System Settings

**Feature**: 021-okay-my-hr
**Date**: 2025-11-11
**Version**: 1.0.0

## Overview

This document defines the complete GraphQL API contract for the System Settings feature, including all types, queries, mutations, and authorization requirements.

## Schema Definition

### Enums

```graphql
"""
Log level for application containers
"""
enum LogLevel {
	DEBUG
	INFO
	WARN
	ERROR
}

"""
Type of notification channel
"""
enum ChannelType {
	EMAIL
	WEBHOOK
}
```

### Types

#### SystemSettings

```graphql
"""
Global system configuration settings (singleton)
"""
type SystemSettings {
	"""
	Singleton ID (always 1)
	"""
	id: ID!

	"""
	System branding name displayed throughout the application
	"""
	systemName: String!

	"""
	IANA timezone identifier for system-wide date/time display
	"""
	systemTimezone: String!

	"""
	Session timeout duration in minutes (5-1440)
	"""
	sessionTimeoutMinutes: Int!

	"""
	Minimum password length requirement (8-128)
	"""
	minPasswordLength: Int!

	"""
	Maximum failed login attempts before account lockout (3-100)
	"""
	maxLoginAttempts: Int!

	"""
	Whether MFA is required for all users
	"""
	requireMfa: Boolean!

	"""
	Whether password expiration is enabled
	"""
	passwordExpirationEnabled: Boolean!

	"""
	Number of days until password expires (30-365, null if disabled)
	"""
	passwordExpirationDays: Int

	"""
	Whether HTTPS enforcement is enabled
	"""
	httpsEnforced: Boolean!

	"""
	Content Security Policy header value
	"""
	cspPolicy: String

	"""
	Whether X-Frame-Options header is enabled
	"""
	xFrameOptions: Boolean!

	"""
	Whether HSTS header is enabled
	"""
	hstEnabled: Boolean!

	"""
	Array of allowed CORS origin URLs
	"""
	corsOrigins: [String!]

	"""
	Log level for Svelte frontend containers
	"""
	logLevelFrontend: LogLevel!

	"""
	Log level for Rust backend containers
	"""
	logLevelBackend: LogLevel!

	"""
	Creation timestamp (UTC)
	"""
	createdAt: DateTime!

	"""
	Last modification timestamp (UTC)
	"""
	updatedAt: DateTime!

	"""
	User who last modified settings
	"""
	updatedBy: User
}
```

#### NotificationChannel

```graphql
"""
Notification delivery channel configuration
"""
type NotificationChannel {
	"""
	Unique channel identifier
	"""
	id: ID!

	"""
	Type of notification channel
	"""
	channelType: ChannelType!

	"""
	Whether channel is currently enabled
	"""
	enabled: Boolean!

	"""
	Channel-specific configuration (union type based on channelType)
	"""
	config: ChannelConfig!

	"""
	Creation timestamp (UTC)
	"""
	createdAt: DateTime!

	"""
	Last modification timestamp (UTC)
	"""
	updatedAt: DateTime!
}
```

#### ChannelConfig (Union Type)

```graphql
"""
Channel configuration (union type based on channel type)
"""
union ChannelConfig = EmailChannelConfig | WebhookChannelConfig

"""
Email SMTP configuration
"""
type EmailChannelConfig {
	"""
	SMTP server hostname
	"""
	smtpHost: String!

	"""
	SMTP server port (1-65535)
	"""
	smtpPort: Int!

	"""
	SMTP authentication username
	"""
	smtpUsername: String!

	"""
	Email from address
	"""
	fromAddress: String!

	"""
	Whether to use TLS encryption
	"""
	useTls: Boolean!

	# Note: smtp_password is NOT exposed in queries for security
}

"""
Webhook delivery configuration
"""
type WebhookChannelConfig {
	"""
	Webhook endpoint URL
	"""
	webhookUrl: String!

	"""
	Optional custom HTTP headers (JSON object)
	"""
	customHeaders: JSON

	"""
	HTTP request timeout in seconds (1-30)
	"""
	timeoutSeconds: Int!

	# Note: auth_token is NOT exposed in queries for security
}
```

#### TestEmailResult

```graphql
"""
Result of test email send operation
"""
type TestEmailResult {
	"""
	Whether test email was sent successfully
	"""
	success: Boolean!

	"""
	Human-readable result message
	"""
	message: String!

	"""
	Error details if success is false
	"""
	error: String
}
```

### Input Types

#### UpdateSystemSettingsInput

```graphql
"""
Input for updating system settings (partial update)
"""
input UpdateSystemSettingsInput {
	"""
	System branding name (3-255 characters)
	"""
	systemName: String

	"""
	IANA timezone identifier
	"""
	systemTimezone: String

	"""
	Session timeout duration in minutes (5-1440)
	"""
	sessionTimeoutMinutes: Int

	"""
	Minimum password length (8-128)
	"""
	minPasswordLength: Int

	"""
	Maximum failed login attempts (3-100)
	"""
	maxLoginAttempts: Int

	"""
	MFA requirement flag
	"""
	requireMfa: Boolean

	"""
	Password expiration enabled flag
	"""
	passwordExpirationEnabled: Boolean

	"""
	Password expiration days (30-365)
	"""
	passwordExpirationDays: Int

	"""
	HTTPS enforcement flag
	"""
	httpsEnforced: Boolean

	"""
	Content Security Policy header
	"""
	cspPolicy: String

	"""
	X-Frame-Options header flag
	"""
	xFrameOptions: Boolean

	"""
	HSTS header flag
	"""
	hstEnabled: Boolean

	"""
	CORS allowed origins
	"""
	corsOrigins: [String!]

	"""
	Frontend container log level
	"""
	logLevelFrontend: LogLevel

	"""
	Backend container log level
	"""
	logLevelBackend: LogLevel
}
```

#### CreateNotificationChannelInput

```graphql
"""
Input for creating a new notification channel
"""
input CreateNotificationChannelInput {
	"""
	Type of notification channel
	"""
	channelType: ChannelType!

	"""
	Whether channel is enabled
	"""
	enabled: Boolean!

	"""
	Email configuration (required if channelType is EMAIL)
	"""
	emailConfig: EmailConfigInput

	"""
	Webhook configuration (required if channelType is WEBHOOK)
	"""
	webhookConfig: WebhookConfigInput
}
```

#### UpdateNotificationChannelInput

```graphql
"""
Input for updating existing notification channel
"""
input UpdateNotificationChannelInput {
	"""
	Whether channel is enabled
	"""
	enabled: Boolean

	"""
	Email configuration (if channelType is EMAIL)
	"""
	emailConfig: EmailConfigInput

	"""
	Webhook configuration (if channelType is WEBHOOK)
	"""
	webhookConfig: WebhookConfigInput
}
```

#### EmailConfigInput

```graphql
"""
Email SMTP configuration input
"""
input EmailConfigInput {
	"""
	SMTP server hostname
	"""
	smtpHost: String!

	"""
	SMTP server port (1-65535)
	"""
	smtpPort: Int!

	"""
	SMTP authentication username
	"""
	smtpUsername: String!

	"""
	SMTP authentication password (encrypted before storage)
	"""
	smtpPassword: String!

	"""
	Email from address
	"""
	fromAddress: String!

	"""
	Whether to use TLS encryption (default: true)
	"""
	useTls: Boolean
}
```

#### WebhookConfigInput

```graphql
"""
Webhook configuration input
"""
input WebhookConfigInput {
	"""
	Webhook endpoint URL
	"""
	webhookUrl: String!

	"""
	Optional authentication token (encrypted before storage)
	"""
	authToken: String

	"""
	Optional custom HTTP headers (JSON object)
	"""
	customHeaders: JSON

	"""
	HTTP request timeout in seconds (1-30, default: 5)
	"""
	timeoutSeconds: Int
}
```

### Queries

```graphql
type Query {
	"""
	Fetch current system settings (singleton)

	Authorization: Admin or HR Manager
	"""
	systemSettings: SystemSettings! @auth(requires: ADMIN)

	"""
	Fetch all notification channels

	Authorization: Admin only
	"""
	notificationChannels: [NotificationChannel!]! @auth(requires: ADMIN)

	"""
	Fetch single notification channel by ID

	Authorization: Admin only
	"""
	notificationChannel(id: ID!): NotificationChannel @auth(requires: ADMIN)
}
```

### Mutations

```graphql
type Mutation {
	"""
	Update system settings (partial update)

	Validates all input fields before persisting.
	Triggers cache invalidation and container restarts if log levels changed.

	Authorization: Admin only

	Errors:
	- VALIDATION_ERROR: Invalid input values (e.g., invalid timezone)
	- UNAUTHORIZED: User does not have Admin role
	"""
	updateSystemSettings(input: UpdateSystemSettingsInput!): SystemSettings! @auth(requires: ADMIN)

	"""
	Create new notification channel

	Validates SMTP credentials (if email) or webhook URL (if webhook).
	Encrypts sensitive fields before storage.

	Authorization: Admin only

	Errors:
	- VALIDATION_ERROR: Invalid configuration (e.g., invalid SMTP credentials)
	- UNAUTHORIZED: User does not have Admin role
	- CONFLICT: Channel with same configuration already exists
	"""
	createNotificationChannel(input: CreateNotificationChannelInput!): NotificationChannel!
		@auth(requires: ADMIN)

	"""
	Update existing notification channel

	Validates updated configuration before persisting.
	Re-encrypts sensitive fields if changed.

	Authorization: Admin only

	Errors:
	- NOT_FOUND: Channel with given ID does not exist
	- VALIDATION_ERROR: Invalid configuration
	- UNAUTHORIZED: User does not have Admin role
	"""
	updateNotificationChannel(id: ID!, input: UpdateNotificationChannelInput!): NotificationChannel!
		@auth(requires: ADMIN)

	"""
	Delete notification channel

	Soft delete (mark as disabled) recommended, hard delete supported.

	Authorization: Admin only

	Errors:
	- NOT_FOUND: Channel with given ID does not exist
	- UNAUTHORIZED: User does not have Admin role
	"""
	deleteNotificationChannel(id: ID!): Boolean! @auth(requires: ADMIN)

	"""
	Send test email through specified channel

	Validates SMTP connection and sends test email to recipient.
	Does not modify any data.

	Authorization: Admin only

	Errors:
	- NOT_FOUND: Channel with given ID does not exist
	- VALIDATION_ERROR: Invalid recipient email or channel is not email type
	- SMTP_ERROR: SMTP connection or send failure
	- UNAUTHORIZED: User does not have Admin role
	"""
	sendTestEmail(channelId: ID!, recipientEmail: String!): TestEmailResult! @auth(requires: ADMIN)

	"""
	Unlock locked user account

	Resets failed_login_attempts to 0 and sets account_locked to false.

	Authorization: Admin or HR Manager

	Errors:
	- NOT_FOUND: User with given ID does not exist
	- UNAUTHORIZED: User does not have Admin or HR Manager role
	"""
	unlockUserAccount(userId: ID!): User! @auth(requires: [ADMIN, HR_MANAGER])
}
```

### Subscriptions

```graphql
type Subscription {
	"""
	Subscribe to system settings changes

	Emits updated settings whenever admin modifies configuration.
	Used by frontend to invalidate cache and reload settings.

	Authorization: Authenticated users (all roles)
	"""
	systemSettingsUpdated: SystemSettings!

	"""
	Subscribe to notification channel changes

	Emits when channels are created, updated, or deleted.
	Used by notification service to reload channel configuration.

	Authorization: Admin only
	"""
	notificationChannelUpdated: NotificationChannelUpdate!
}

"""
Notification channel update event
"""
type NotificationChannelUpdate {
	"""
	Type of update operation
	"""
	operation: CrudOperation!

	"""
	Updated/deleted channel (null for DELETE operation)
	"""
	channel: NotificationChannel
}

enum CrudOperation {
	CREATE
	UPDATE
	DELETE
}
```

## Authorization Matrix

| Operation                                 | Required Role(s)       | Enforcement Level |
| ----------------------------------------- | ---------------------- | ----------------- |
| `systemSettings` query                    | Admin, HR Manager      | GraphQL Guard     |
| `notificationChannels` query              | Admin                  | GraphQL Guard     |
| `notificationChannel` query               | Admin                  | GraphQL Guard     |
| `updateSystemSettings` mutation           | Admin                  | GraphQL Guard     |
| `createNotificationChannel` mutation      | Admin                  | GraphQL Guard     |
| `updateNotificationChannel` mutation      | Admin                  | GraphQL Guard     |
| `deleteNotificationChannel` mutation      | Admin                  | GraphQL Guard     |
| `sendTestEmail` mutation                  | Admin                  | GraphQL Guard     |
| `unlockUserAccount` mutation              | Admin, HR Manager      | GraphQL Guard     |
| `systemSettingsUpdated` subscription      | Any authenticated user | GraphQL Context   |
| `notificationChannelUpdated` subscription | Admin                  | GraphQL Guard     |

## Validation Rules

### SystemSettings

| Field                    | Validation                 | Error Message                                     |
| ------------------------ | -------------------------- | ------------------------------------------------- |
| `systemName`             | 3-255 characters           | "System name must be 3-255 characters"            |
| `systemTimezone`         | Valid IANA timezone        | "Invalid timezone identifier"                     |
| `sessionTimeoutMinutes`  | 5-1440 (5 min to 24 hours) | "Session timeout must be 5-1440 minutes"          |
| `minPasswordLength`      | 8-128                      | "Password length must be 8-128 characters"        |
| `maxLoginAttempts`       | 3-100                      | "Max login attempts must be 3-100"                |
| `passwordExpirationDays` | 30-365 or null             | "Password expiration must be 30-365 days or null" |
| `corsOrigins`            | Valid URLs                 | "Invalid CORS origin URL: {url}"                  |
| `logLevelFrontend`       | Enum value                 | "Invalid log level"                               |
| `logLevelBackend`        | Enum value                 | "Invalid log level"                               |

### NotificationChannel (Email)

| Field          | Validation         | Error Message                |
| -------------- | ------------------ | ---------------------------- |
| `smtpHost`     | Non-empty string   | "SMTP host is required"      |
| `smtpPort`     | 1-65535            | "SMTP port must be 1-65535"  |
| `smtpUsername` | Non-empty string   | "SMTP username is required"  |
| `smtpPassword` | Non-empty string   | "SMTP password is required"  |
| `fromAddress`  | Valid email format | "Invalid from email address" |
| `useTls`       | Boolean            | -                            |

### NotificationChannel (Webhook)

| Field            | Validation      | Error Message                         |
| ---------------- | --------------- | ------------------------------------- |
| `webhookUrl`     | Valid HTTPS URL | "Invalid webhook URL (must be HTTPS)" |
| `authToken`      | Optional string | -                                     |
| `timeoutSeconds` | 1-30            | "Timeout must be 1-30 seconds"        |

## Error Codes

| Code               | HTTP Status | Description              | Example                     |
| ------------------ | ----------- | ------------------------ | --------------------------- |
| `VALIDATION_ERROR` | 400         | Input validation failed  | Invalid timezone identifier |
| `UNAUTHORIZED`     | 403         | User lacks required role | Admin role required         |
| `NOT_FOUND`        | 404         | Resource not found       | Channel ID does not exist   |
| `CONFLICT`         | 409         | Resource conflict        | Channel already exists      |
| `SMTP_ERROR`       | 500         | SMTP operation failed    | SMTP connection timeout     |
| `INTERNAL_ERROR`   | 500         | Unexpected server error  | Database connection failed  |

## GraphQL Error Response Format

```json
{
	"errors": [
		{
			"message": "Session timeout must be 5-1440 minutes",
			"extensions": {
				"code": "VALIDATION_ERROR",
				"field": "sessionTimeoutMinutes",
				"providedValue": 2,
				"validRange": { "min": 5, "max": 1440 }
			},
			"path": ["updateSystemSettings"]
		}
	],
	"data": null
}
```

## Example Requests & Responses

### Query: Fetch System Settings

**Request**:

```graphql
query GetSystemSettings {
	systemSettings {
		id
		systemName
		systemTimezone
		sessionTimeoutMinutes
		minPasswordLength
		maxLoginAttempts
		requireMfa
		passwordExpirationEnabled
		httpsEnforced
		logLevelFrontend
		logLevelBackend
		updatedAt
		updatedBy {
			id
			email
		}
	}
}
```

**Response**:

```json
{
	"data": {
		"systemSettings": {
			"id": "1",
			"systemName": "MoncuraHR",
			"systemTimezone": "America/Denver",
			"sessionTimeoutMinutes": 60,
			"minPasswordLength": 12,
			"maxLoginAttempts": 5,
			"requireMfa": false,
			"passwordExpirationEnabled": false,
			"httpsEnforced": false,
			"logLevelFrontend": "INFO",
			"logLevelBackend": "INFO",
			"updatedAt": "2025-11-11T10:30:00Z",
			"updatedBy": {
				"id": "abc-123",
				"email": "admin@example.com"
			}
		}
	}
}
```

### Mutation: Update System Settings

**Request**:

```graphql
mutation UpdateSettings {
	updateSystemSettings(
		input: {
			systemName: "TestCorp HR"
			systemTimezone: "America/New_York"
			sessionTimeoutMinutes: 30
			logLevelFrontend: DEBUG
		}
	) {
		id
		systemName
		systemTimezone
		sessionTimeoutMinutes
		logLevelFrontend
		updatedAt
	}
}
```

**Response**:

```json
{
	"data": {
		"updateSystemSettings": {
			"id": "1",
			"systemName": "TestCorp HR",
			"systemTimezone": "America/New_York",
			"sessionTimeoutMinutes": 30,
			"logLevelFrontend": "DEBUG",
			"updatedAt": "2025-11-11T11:00:00Z"
		}
	}
}
```

### Mutation: Create Email Notification Channel

**Request**:

```graphql
mutation CreateEmailChannel {
	createNotificationChannel(
		input: {
			channelType: EMAIL
			enabled: true
			emailConfig: {
				smtpHost: "smtp.sendgrid.net"
				smtpPort: 587
				smtpUsername: "apikey"
				smtpPassword: "SG.secret_key_here"
				fromAddress: "noreply@testcorp.com"
				useTls: true
			}
		}
	) {
		id
		channelType
		enabled
		config {
			... on EmailChannelConfig {
				smtpHost
				smtpPort
				fromAddress
			}
		}
	}
}
```

**Response**:

```json
{
	"data": {
		"createNotificationChannel": {
			"id": "ch-456",
			"channelType": "EMAIL",
			"enabled": true,
			"config": {
				"smtpHost": "smtp.sendgrid.net",
				"smtpPort": 587,
				"fromAddress": "noreply@testcorp.com"
			}
		}
	}
}
```

### Mutation: Send Test Email

**Request**:

```graphql
mutation SendTest {
	sendTestEmail(channelId: "ch-456", recipientEmail: "admin@testcorp.com") {
		success
		message
		error
	}
}
```

**Response (Success)**:

```json
{
	"data": {
		"sendTestEmail": {
			"success": true,
			"message": "Test email sent successfully to admin@testcorp.com",
			"error": null
		}
	}
}
```

**Response (Failure)**:

```json
{
	"data": {
		"sendTestEmail": {
			"success": false,
			"message": "Failed to send test email",
			"error": "SMTP authentication failed: Invalid credentials"
		}
	}
}
```

### Subscription: System Settings Updated

**Subscription**:

```graphql
subscription OnSettingsChange {
	systemSettingsUpdated {
		id
		systemName
		systemTimezone
		updatedAt
	}
}
```

**Event Payload**:

```json
{
	"data": {
		"systemSettingsUpdated": {
			"id": "1",
			"systemName": "Updated Name",
			"systemTimezone": "UTC",
			"updatedAt": "2025-11-11T12:00:00Z"
		}
	}
}
```

## Implementation Notes

### Backend (Rust + async-graphql)

**Resolver Authorization**:

```rust
use async_graphql::{Context, Object, Result, Guard};

pub struct SystemSettingsQuery;

#[Object]
impl SystemSettingsQuery {
    #[graphql(guard = "RoleGuard::new(Role::Admin)")]
    async fn system_settings(&self, ctx: &Context<'_>) -> Result<SystemSettings> {
        let db = ctx.data::<DatabaseConnection>()?;
        let settings = SystemSettingsEntity::find_by_id(1)
            .one(db)
            .await?
            .ok_or("Settings not found")?;
        Ok(settings.into())
    }
}
```

**Mutation with Validation**:

```rust
pub struct SystemSettingsMutation;

#[Object]
impl SystemSettingsMutation {
    #[graphql(guard = "RoleGuard::new(Role::Admin)")]
    async fn update_system_settings(
        &self,
        ctx: &Context<'_>,
        input: UpdateSystemSettingsInput,
    ) -> Result<SystemSettings> {
        // Validate input
        input.validate()?;

        let db = ctx.data::<DatabaseConnection>()?;
        let user = ctx.data::<CurrentUser>()?;

        // Update settings
        let mut settings: system_settings::ActiveModel = SystemSettingsEntity::find_by_id(1)
            .one(db)
            .await?
            .ok_or("Settings not found")?
            .into();

        // Apply partial updates
        if let Some(name) = input.system_name {
            settings.system_name = Set(name);
        }
        // ... other fields

        settings.updated_by = Set(Some(user.id));
        settings.updated_at = Set(chrono::Utc::now().into());

        let updated = settings.update(db).await?;

        // Publish subscription event
        ctx.data::<SubscriptionBroker>()?
            .publish(SystemSettingsUpdatedEvent { settings: updated.clone() });

        Ok(updated.into())
    }
}
```

### Frontend (urql + TypeScript)

**GraphQL Client Setup**:

```typescript
import { Client, cacheExchange, fetchExchange, subscriptionExchange } from '@urql/svelte';
import { createClient as createWSClient } from 'graphql-ws';

const wsClient = createWSClient({
	url: 'ws://localhost:8080/graphql'
});

export const urqlClient = new Client({
	url: 'http://localhost:8080/graphql',
	exchanges: [
		cacheExchange,
		fetchExchange,
		subscriptionExchange({
			forwardSubscription: (operation) => ({
				subscribe: (sink) => ({
					unsubscribe: wsClient.subscribe(operation, sink)
				})
			})
		})
	]
});
```

**Query Hook**:

```typescript
import { query } from '@urql/svelte';
import { SYSTEM_SETTINGS_QUERY } from '$lib/graphql/queries';

export const systemSettingsStore = query({
	client: urqlClient,
	query: SYSTEM_SETTINGS_QUERY
});

// Usage in component
$: settings = $systemSettingsStore.data?.systemSettings;
```

**Mutation Hook**:

```typescript
import { mutation } from '@urql/svelte';
import { UPDATE_SYSTEM_SETTINGS_MUTATION } from '$lib/graphql/mutations';

const updateSettings = mutation({
	client: urqlClient,
	query: UPDATE_SYSTEM_SETTINGS_MUTATION
});

async function handleSave(values: UpdateSystemSettingsInput) {
	const result = await updateSettings({ input: values });
	if (result.error) {
		toast.error(result.error.message);
	} else {
		toast.success('Settings updated successfully');
	}
}
```

**Subscription Hook**:

```typescript
import { subscription } from '@urql/svelte';
import { SYSTEM_SETTINGS_SUBSCRIPTION } from '$lib/graphql/subscriptions';

const settingsUpdates = subscription({
	client: urqlClient,
	query: SYSTEM_SETTINGS_SUBSCRIPTION
});

$effect(() => {
	if ($settingsUpdates.data) {
		// Invalidate cache and reload
		systemSettingsStore.reexecute({ requestPolicy: 'network-only' });
		toast.info('System settings updated by administrator');
	}
});
```

## Testing Contract Compliance

### Contract Tests (Backend)

```rust
#[tokio::test]
async fn test_system_settings_query_requires_admin() {
    let schema = create_test_schema();
    let non_admin_context = create_context_with_role(Role::Employee);

    let query = r#"
        query {
            systemSettings {
                id
                systemName
            }
        }
    "#;

    let result = schema.execute(Request::new(query).data(non_admin_context)).await;
    assert!(result.errors.len() > 0);
    assert_eq!(result.errors[0].extensions.get("code"), Some(&"UNAUTHORIZED".into()));
}

#[tokio::test]
async fn test_update_system_settings_validates_timezone() {
    let schema = create_test_schema();
    let admin_context = create_context_with_role(Role::Admin);

    let mutation = r#"
        mutation {
            updateSystemSettings(input: { systemTimezone: "Invalid/Timezone" }) {
                id
            }
        }
    "#;

    let result = schema.execute(Request::new(mutation).data(admin_context)).await;
    assert!(result.errors.len() > 0);
    assert_eq!(result.errors[0].extensions.get("code"), Some(&"VALIDATION_ERROR".into()));
}
```

### Integration Tests (E2E)

```typescript
import { test, expect } from '@playwright/test';

test('admin can update system settings', async ({ page }) => {
	await loginAsAdmin(page);
	await page.goto('/admin/settings');

	await page.fill('[name="systemName"]', 'Updated Name');
	await page.selectOption('[name="logLevelFrontend"]', 'DEBUG');
	await page.click('button[type="submit"]');

	await expect(page.locator('.toast-success')).toContainText('Settings updated');

	// Verify GraphQL mutation was called
	const requests = page
		.context()
		.requests.filter(
			(r) =>
				r.url().includes('/graphql') && r.postDataJSON()?.operationName === 'UpdateSystemSettings'
		);
	expect(requests.length).toBeGreaterThan(0);
});
```

## Versioning & Breaking Changes

**Current Version**: 1.0.0

**Deprecation Policy**:

- Deprecated fields marked with `@deprecated(reason: "...")` directive
- Minimum 6 months notice before removal
- Migration guide provided for breaking changes

**Future Considerations**:

- Add `version` field to SystemSettings for tracking schema migrations
- Implement GraphQL schema versioning via custom directives
- Add pagination to `notificationChannels` query if count grows

## Summary

This GraphQL API contract provides:

✅ **Type-safe schema** with comprehensive field documentation
✅ **RBAC enforcement** via GraphQL guards and directives
✅ **Input validation** with detailed error messages
✅ **Real-time updates** via subscriptions
✅ **Secure credential handling** (passwords/tokens not exposed in queries)
✅ **Pagination-ready** design for future scaling
✅ **Testable interface** with clear contract boundaries
