# Research: Functional System Settings

**Feature**: 021-okay-my-hr
**Date**: 2025-11-11
**Phase**: 0 - Technical Research

## Overview

This feature implements a comprehensive system settings management interface allowing administrators to configure critical system parameters including branding, timezone, authentication policies, notification channels, security settings, and developer logging levels.

## Technology Stack Analysis

### Backend (Rust GraphQL)

**Primary Technologies**:
- **Rust 1.75+** with async-graphql for GraphQL API
- **SeaORM 0.12+** for database migrations and ORM
- **PostgreSQL** (assumed from existing project) for data persistence
- **JWT** for session management and token expiration
- **Kubernetes API** or **Docker API** for container orchestration

**Key Dependencies**:
- `async-graphql` - GraphQL server implementation
- `sea-orm` - ORM and migration framework
- `sea-orm-migration` - Database schema migrations
- `chrono-tz` - Timezone handling (IANA timezone database)
- `serde` - Serialization/deserialization
- `argon2` - Password hashing (for validation)
- `kube` - Kubernetes API client (if K8s deployment)
- `bollard` - Docker API client (if Docker deployment)

### Frontend (SvelteKit + Svelte 5)

**Primary Technologies**:
- **SvelteKit 2.22.0** with Svelte 5.0 runes
- **TypeScript 5.0** for type safety
- **urql** GraphQL client for backend communication
- **Tailwind CSS 4.0** for styling
- **Zod 4.0.14** for schema validation

**Key Dependencies**:
- `@urql/svelte` - GraphQL client with subscriptions
- `zod` - Runtime type validation
- `@internationalized/date` - Timezone-aware date handling
- `svelte-sonner` - Toast notifications
- `bits-ui` - UI primitives

## Technical Approaches

### 1. System Name Replacement Strategy

**Challenge**: Replace all hardcoded instances of "MountainHR" and "SvelteHR" with dynamic system name.

**Approach**: Svelte Store + Context API
- Create reactive `systemSettings` store that loads on app initialization
- Use Svelte context to provide settings throughout component tree
- Replace hardcoded strings with `$systemSettings.system_name` reactive references
- Update `app.html` title dynamically via `svelte:head`

**Files to Scan for Replacement**:
```bash
# Find all hardcoded instances
grep -r "MountainHR\|SvelteHR" src/
```

**Alternative Considered**: Build-time replacement (rejected - not runtime configurable)

### 2. Timezone Handling Architecture

**Clarification**: UTC storage, display-time conversion (from clarifications)

**Backend Strategy**:
- Store ALL timestamps as `TIMESTAMPTZ` in UTC
- GraphQL resolvers return ISO 8601 strings in UTC
- Backend applies system timezone for timestamp generation metadata (created_at, updated_at)

**Frontend Strategy**:
- Load system timezone from settings store on app init
- Use `@internationalized/date` ZonedDateTime for timezone conversions
- Create utility function `formatInSystemTz(utcTimestamp)` used across all date displays
- Update existing date formatters to respect system timezone

**Migration Requirement**: None (existing data already UTC)

### 3. Authentication Policy Enforcement

**Session Timeout Implementation**:
- Backend: Store `session_timeout_minutes` in SystemSettings
- JWT generation: Set `exp` claim to `now + session_timeout_minutes`
- Frontend: Implement activity tracker that refreshes token before expiration
- Handle timeout gracefully with "session expired" modal + redirect to login

**Password Length Validation**:
- Backend: Validate on password creation/update via `min_password_length` setting
- Frontend: Client-side validation with Zod schema dynamically generated from settings
- Grandfathering: No migration needed (existing passwords remain valid per clarification)

**Max Login Attempts & Account Lockout**:
- Backend: Increment `failed_login_attempts` counter on UserAccount table
- Lock account when counter >= `max_login_attempts`
- Admin unlock: GraphQL mutation `unlockUserAccount(user_id)`
- Reset counter on successful login

### 4. Notification Channel Architecture

**Data Model**:
```typescript
interface NotificationChannel {
  id: string;
  channel_type: 'email' | 'webhook';
  enabled: boolean;
  config_json: EmailConfig | WebhookConfig;
}

interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string; // Encrypted at rest
  from_address: string;
}

interface WebhookConfig {
  webhook_url: string;
  auth_token?: string; // Encrypted at rest
  custom_headers?: Record<string, string>;
}
```

**Email Validation Strategy**:
- On save: Attempt SMTP connection with credentials
- Send test email to administrator's email
- Display success/failure toast

**Webhook Delivery**:
- Best-effort HTTP POST (per clarification)
- Timeout: 5 seconds
- Log failure to application logs (no retry)
- Include event payload as JSON body

**Encryption Strategy**:
- Use PostgreSQL `pgcrypto` extension for column-level encryption
- Encrypt `smtp_password` and `auth_token` fields
- Backend decrypts on read for notification sending

### 5. Log Level Propagation to Containers

**Clarification**: Container restart required with environment variable update (from clarifications)

**Kubernetes Approach**:
```rust
// Pseudo-code for Kubernetes integration
async fn update_log_level(deployment: &str, log_level: &str) -> Result<()> {
    let kube_client = kube::Client::try_default().await?;
    let deployments: Api<Deployment> = Api::namespaced(kube_client, "default");

    // Patch deployment with new LOG_LEVEL env var
    let patch = json!({
        "spec": {
            "template": {
                "spec": {
                    "containers": [{
                        "name": deployment,
                        "env": [{
                            "name": "LOG_LEVEL",
                            "value": log_level
                        }]
                    }]
                }
            }
        }
    });

    deployments.patch(deployment, &PatchParams::default(), &Patch::Merge(&patch)).await?;
    // Kubernetes automatically triggers rolling restart
    Ok(())
}
```

**Docker Compose Approach**:
```rust
// Update docker-compose.yml environment section
// Requires docker-compose up -d to apply
async fn update_docker_compose_env(service: &str, log_level: &str) -> Result<()> {
    // Read docker-compose.yml
    // Update environment.LOG_LEVEL for service
    // Write back to disk
    // Execute: docker-compose up -d --no-deps service
    Ok(())
}
```

**Frontend Integration**:
- GraphQL mutation triggers backend log level update
- Backend updates SystemSettings table
- Backend calls Kubernetes/Docker API to restart containers
- Return success when restart initiated (don't wait for completion)
- Display toast: "Log level updated. Containers restarting..."

### 6. HTTPS Enforcement Strategy

**Implementation**:
- Backend middleware: Check `https_enforced` setting on each request
- If enabled and request is HTTP: Return 301 redirect to HTTPS URL
- Store setting in memory cache (reload on setting change)
- Frontend: No changes needed (transparent redirect)

**Edge Case Handling**:
- If SSL cert invalid: Log error, allow HTTP (fail open for development)
- Health check endpoints: Exempt from HTTPS enforcement

### 7. Security Settings (CORS, CSP Headers)

**CORS Configuration**:
```rust
// Actix-web CORS middleware
let cors_origins = system_settings.get_cors_origins(); // Load from DB
Cors::default()
    .allowed_origins(cors_origins.iter().map(|s| s.as_str()))
    .allowed_methods(vec!["GET", "POST"])
    .allowed_headers(vec![header::AUTHORIZATION, header::CONTENT_TYPE])
```

**Security Headers**:
```rust
// Apply headers from SystemSettings
fn apply_security_headers(req: &HttpRequest, resp: &mut HttpResponse) {
    let settings = req.app_data::<SystemSettings>().unwrap();
    if let Some(csp) = &settings.csp_policy {
        resp.headers_mut().insert("Content-Security-Policy", csp.parse().unwrap());
    }
    if settings.x_frame_options {
        resp.headers_mut().insert("X-Frame-Options", "DENY".parse().unwrap());
    }
    if settings.hsts_enabled {
        resp.headers_mut().insert("Strict-Transport-Security", "max-age=31536000".parse().unwrap());
    }
}
```

## Database Schema Design

### SystemSettings Table (Singleton)

```sql
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce singleton
    system_name VARCHAR(255) NOT NULL DEFAULT 'MoncuraHR',
    system_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',

    -- Authentication
    session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
    min_password_length INTEGER NOT NULL DEFAULT 12,
    max_login_attempts INTEGER NOT NULL DEFAULT 5,
    require_mfa BOOLEAN NOT NULL DEFAULT false,
    password_expiration_enabled BOOLEAN NOT NULL DEFAULT false,

    -- Security
    https_enforced BOOLEAN NOT NULL DEFAULT false,
    csp_policy TEXT,
    x_frame_options BOOLEAN NOT NULL DEFAULT true,
    hsts_enabled BOOLEAN NOT NULL DEFAULT false,

    -- Developer
    log_level_frontend VARCHAR(20) NOT NULL DEFAULT 'INFO',
    log_level_backend VARCHAR(20) NOT NULL DEFAULT 'INFO',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- Initialize with defaults
INSERT INTO system_settings (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
```

### NotificationChannel Table

```sql
CREATE TABLE notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('email', 'webhook')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    config_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notification_channels_enabled ON notification_channels(enabled);
CREATE INDEX idx_notification_channels_type ON notification_channels(channel_type);
```

### UserAccount Extensions

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_last_changed TIMESTAMPTZ DEFAULT NOW();

-- Index for account lockout queries
CREATE INDEX idx_users_account_locked ON users(account_locked);
```

## GraphQL API Design

### Queries

```graphql
type SystemSettings {
  id: ID!
  systemName: String!
  systemTimezone: String!
  sessionTimeoutMinutes: Int!
  minPasswordLength: Int!
  maxLoginAttempts: Int!
  requireMfa: Boolean!
  passwordExpirationEnabled: Boolean!
  httpsEnforced: Boolean!
  cspPolicy: String
  xFrameOptions: Boolean!
  hstEnabled: Boolean!
  logLevelFrontend: LogLevel!
  logLevelBackend: LogLevel!
  updatedAt: DateTime!
  updatedBy: User
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}

type NotificationChannel {
  id: ID!
  channelType: ChannelType!
  enabled: Boolean!
  config: ChannelConfig!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ChannelType {
  EMAIL
  WEBHOOK
}

union ChannelConfig = EmailChannelConfig | WebhookChannelConfig

type EmailChannelConfig {
  smtpHost: String!
  smtpPort: Int!
  smtpUsername: String!
  fromAddress: String!
  # Note: password not exposed in queries
}

type WebhookChannelConfig {
  webhookUrl: String!
  customHeaders: JSON
  # Note: authToken not exposed in queries
}

type Query {
  systemSettings: SystemSettings!
  notificationChannels: [NotificationChannel!]!
}
```

### Mutations

```graphql
input UpdateSystemSettingsInput {
  systemName: String
  systemTimezone: String
  sessionTimeoutMinutes: Int
  minPasswordLength: Int
  maxLoginAttempts: Int
  requireMfa: Boolean
  passwordExpirationEnabled: Boolean
  httpsEnforced: Boolean
  cspPolicy: String
  xFrameOptions: Boolean
  hstEnabled: Boolean
  logLevelFrontend: LogLevel
  logLevelBackend: LogLevel
}

input CreateNotificationChannelInput {
  channelType: ChannelType!
  enabled: Boolean!
  emailConfig: EmailConfigInput
  webhookConfig: WebhookConfigInput
}

input EmailConfigInput {
  smtpHost: String!
  smtpPort: Int!
  smtpUsername: String!
  smtpPassword: String! # Encrypted before storage
  fromAddress: String!
}

input WebhookConfigInput {
  webhookUrl: String!
  authToken: String # Encrypted before storage
  customHeaders: JSON
}

type Mutation {
  updateSystemSettings(input: UpdateSystemSettingsInput!): SystemSettings!
  createNotificationChannel(input: CreateNotificationChannelInput!): NotificationChannel!
  updateNotificationChannel(id: ID!, input: UpdateNotificationChannelInput!): NotificationChannel!
  deleteNotificationChannel(id: ID!): Boolean!
  sendTestEmail(channelId: ID!, recipientEmail: String!): TestEmailResult!
  unlockUserAccount(userId: ID!): User!
}

type TestEmailResult {
  success: Boolean!
  message: String!
}
```

## Performance Considerations

### Caching Strategy

**SystemSettings Cache**:
- Load settings once at application startup
- Cache in application memory (both frontend store and backend in-memory cache)
- Invalidate cache on settings update via GraphQL subscription or polling
- Cache TTL: 5 minutes (fallback if subscription fails)

**Query Performance**:
- SystemSettings: Single row lookup (O(1) with primary key)
- NotificationChannels: Indexed by `enabled` and `channel_type`
- Expected QPS: <10 (admin-only operations)

### Container Restart Impact

**Rolling Restart Strategy**:
- Kubernetes: Automatic rolling update (zero downtime)
- Docker Compose: Brief interruption (<5 seconds per container)
- Frontend displays warning: "Log level change requires container restart (may take up to 2 minutes)"

## Security Considerations

### Encryption at Rest

**Sensitive Fields**:
- `notification_channels.config_json.smtp_password`
- `notification_channels.config_json.auth_token`

**Implementation**:
```sql
-- Using pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt on insert/update
INSERT INTO notification_channels (config_json)
VALUES (
  jsonb_set(
    config_json,
    '{smtp_password}',
    to_jsonb(encrypt(password::bytea, 'encryption_key', 'aes'))
  )
);

-- Decrypt on select
SELECT jsonb_set(
  config_json,
  '{smtp_password}',
  to_jsonb(decrypt(config_json->'smtp_password', 'encryption_key', 'aes'))
) FROM notification_channels;
```

**Key Management**:
- Store encryption key in environment variable `SETTINGS_ENCRYPTION_KEY`
- Rotate key via migration script (decrypt with old key, re-encrypt with new key)

### RBAC Authorization

**Admin-Only Operations**:
- All `systemSettings` mutations require `Admin` role
- `notificationChannels` mutations require `Admin` role
- `unlockUserAccount` mutation requires `Admin` or `HR Manager` role

**Authorization Middleware**:
```rust
#[graphql(guard = "AdminGuard")]
async fn update_system_settings(&self, ctx: &Context<'_>, input: UpdateSystemSettingsInput) -> Result<SystemSettings> {
    // Implementation
}
```

## Testing Strategy

### Unit Tests

**Backend (Rust)**:
- SeaORM entity tests (CRUD operations)
- GraphQL resolver tests (mocked database)
- Timezone conversion utilities
- Password validation logic
- SMTP validation logic

**Frontend (Vitest)**:
- Settings store behavior
- Form validation with Zod schemas
- Date formatting utilities
- Component rendering with mock data

### Integration Tests

**E2E Tests (Playwright)**:
1. Admin navigates to System Settings
2. Updates system name to "TestCorp"
3. Verifies name appears in header, footer, and page title
4. Updates timezone to "America/New_York"
5. Creates timestamped record and verifies display timezone
6. Configures session timeout to 5 minutes
7. Waits 5 minutes and verifies auto-logout
8. Configures SMTP settings
9. Sends test email and verifies delivery
10. Updates log level and verifies container restart

### Contract Tests

**GraphQL Schema Contract**:
- Verify `systemSettings` query returns all expected fields
- Verify `updateSystemSettings` mutation accepts all input fields
- Verify RBAC authorization on mutations (non-admin receives error)

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Container restart causes downtime | High | Medium | Use rolling restart in K8s; warn users in UI |
| Encryption key compromise | Critical | Low | Store in secure vault (K8s secrets); implement key rotation |
| Invalid timezone breaks app | High | Low | Validate against IANA timezone database; fallback to UTC |
| SMTP credentials leak in logs | High | Medium | Never log config_json; encrypt at rest; mask in error messages |
| Singleton constraint violated | Medium | Low | Database CHECK constraint enforces; test in CI |
| System name XSS attack | High | Low | Sanitize input; escape in Svelte templates |

## Dependencies & External APIs

**Required External APIs**:
- Kubernetes API (if K8s deployment) - for log level container restarts
- Docker API (if Docker deployment) - for log level container restarts
- SMTP server (user-configured) - for email notifications
- Webhook endpoints (user-configured) - for webhook notifications

**Version Compatibility**:
- Kubernetes API: v1.28+
- Docker API: 1.41+
- PostgreSQL: 14+ (for `gen_random_uuid()` and `pgcrypto`)

## Open Questions

1. **Should system settings changes be audited?** (Recommendation: Yes - add audit_log table)
2. **Should we support per-user timezone preferences?** (Recommendation: Not in MVP - use system timezone only)
3. **Should log level changes require confirmation dialog?** (Recommendation: Yes - warn about restart)
4. **Should we support multiple notification channels of same type?** (Recommendation: Yes - allow multiple SMTP providers)

## Recommended Implementation Order

**Phase 1: Foundation (P1 features)**
1. Database migrations (SystemSettings table)
2. Backend GraphQL schema and resolvers (systemSettings query/mutation)
3. Frontend settings store and basic UI
4. System name replacement across UI
5. Timezone handling (UTC storage + display conversion)

**Phase 2: Authentication (P1 features)**
6. Session timeout enforcement
7. Password length validation
8. Max login attempts & account lockout
9. Admin unlock functionality

**Phase 3: Notifications (P2 features)**
10. NotificationChannel table and GraphQL API
11. Email channel configuration + validation
12. Webhook channel configuration
13. Notification sending service
14. Test email functionality

**Phase 4: Security & Developer (P2-P3 features)**
15. HTTPS enforcement middleware
16. CORS configuration
17. Security headers implementation
18. Log level UI controls
19. Container restart integration (K8s/Docker)

## References

- SeaORM Migration Guide: https://www.sea-ql.org/SeaORM/docs/migration/writing-migration/
- async-graphql Authorization: https://async-graphql.github.io/async-graphql/en/context_and_data_loaders.html
- Kubernetes Client Rust: https://github.com/kube-rs/kube
- IANA Timezone Database: https://www.iana.org/time-zones
- PostgreSQL pgcrypto: https://www.postgresql.org/docs/current/pgcrypto.html
