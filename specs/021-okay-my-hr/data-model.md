# Data Model: Functional System Settings

**Feature**: 021-okay-my-hr
**Date**: 2025-11-11
**Phase**: 1 - Data Model Design

## Overview

This document defines the complete data model for the System Settings feature, including database schemas, entity relationships, validation rules, and migration strategies.

## Entity Relationship Diagram

```
┌─────────────────────────┐
│   system_settings       │
│   (singleton table)     │
│─────────────────────────│
│ PK  id (always 1)       │
│     system_name         │
│     system_timezone     │
│     session_timeout_min │
│     min_password_length │
│     max_login_attempts  │
│     require_mfa         │
│     password_exp_enabled│
│     https_enforced      │
│     csp_policy          │
│     x_frame_options     │
│     hsts_enabled        │
│     log_level_frontend  │
│     log_level_backend   │
│     cors_origins        │
│     created_at          │
│     updated_at          │
│ FK  updated_by → users  │
└─────────────────────────┘
           │
           │ (updated_by)
           ▼
┌─────────────────────────┐
│   users                 │
│   (existing table)      │
│─────────────────────────│
│ PK  id                  │
│     email               │
│     ...                 │
│ +   failed_login_attempts│ (NEW)
│ +   account_locked      │ (NEW)
│ +   locked_at           │ (NEW)
│ +   password_last_changed│ (NEW)
└─────────────────────────┘

┌─────────────────────────┐
│ notification_channels   │
│─────────────────────────│
│ PK  id                  │
│     channel_type        │
│     enabled             │
│     config_json (JSONB) │
│     created_at          │
│     updated_at          │
└─────────────────────────┘
```

## Entity Definitions

### 1. SystemSettings (Singleton Table)

**Purpose**: Store global system configuration parameters accessible to administrators.

**Table Name**: `system_settings`

**Constraints**:
- **Singleton Enforcement**: CHECK constraint `id = 1` ensures only one row exists
- **Initialization**: Seeded with default values on migration

#### Schema

```sql
CREATE TABLE system_settings (
    -- Primary Key (singleton enforced)
    id INTEGER PRIMARY KEY CHECK (id = 1),

    -- General Settings
    system_name VARCHAR(255) NOT NULL DEFAULT 'MoncuraHR'
        CHECK (char_length(system_name) >= 3 AND char_length(system_name) <= 255),
    system_timezone VARCHAR(100) NOT NULL DEFAULT 'UTC'
        CHECK (system_timezone ~ '^[A-Z][a-zA-Z_/+-]+$'), -- IANA format validation

    -- Authentication Settings
    session_timeout_minutes INTEGER NOT NULL DEFAULT 60
        CHECK (session_timeout_minutes >= 5 AND session_timeout_minutes <= 1440), -- 5 min to 24 hours
    min_password_length INTEGER NOT NULL DEFAULT 12
        CHECK (min_password_length >= 8 AND min_password_length <= 128),
    max_login_attempts INTEGER NOT NULL DEFAULT 5
        CHECK (max_login_attempts >= 3 AND max_login_attempts <= 100),
    require_mfa BOOLEAN NOT NULL DEFAULT false,
    password_expiration_enabled BOOLEAN NOT NULL DEFAULT false,
    password_expiration_days INTEGER DEFAULT 90
        CHECK (password_expiration_days IS NULL OR (password_expiration_days >= 30 AND password_expiration_days <= 365)),

    -- Security Settings
    https_enforced BOOLEAN NOT NULL DEFAULT false,
    csp_policy TEXT,
    x_frame_options BOOLEAN NOT NULL DEFAULT true,
    hsts_enabled BOOLEAN NOT NULL DEFAULT false,
    cors_origins TEXT[], -- Array of allowed origin URLs

    -- Developer Settings
    log_level_frontend VARCHAR(20) NOT NULL DEFAULT 'INFO'
        CHECK (log_level_frontend IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
    log_level_backend VARCHAR(20) NOT NULL DEFAULT 'INFO'
        CHECK (log_level_backend IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),

    -- Audit Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Seed initial row with defaults
INSERT INTO system_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Trigger to update updated_at on modification
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Field Specifications

| Field | Type | Nullable | Default | Validation | Purpose |
|-------|------|----------|---------|------------|---------|
| `id` | INTEGER | NO | - | Must be 1 | Singleton enforcement |
| `system_name` | VARCHAR(255) | NO | 'MoncuraHR' | 3-255 chars | System branding name |
| `system_timezone` | VARCHAR(100) | NO | 'UTC' | IANA format | Default timezone for date/time display |
| `session_timeout_minutes` | INTEGER | NO | 60 | 5-1440 | JWT expiration duration |
| `min_password_length` | INTEGER | NO | 12 | 8-128 | Minimum password characters |
| `max_login_attempts` | INTEGER | NO | 5 | 3-100 | Failed logins before lockout |
| `require_mfa` | BOOLEAN | NO | false | - | MFA enforcement flag |
| `password_expiration_enabled` | BOOLEAN | NO | false | - | Password expiry enforcement |
| `password_expiration_days` | INTEGER | YES | 90 | 30-365 or NULL | Days until password expires |
| `https_enforced` | BOOLEAN | NO | false | - | Force HTTPS redirects |
| `csp_policy` | TEXT | YES | NULL | - | Content Security Policy header |
| `x_frame_options` | BOOLEAN | NO | true | - | Enable X-Frame-Options header |
| `hsts_enabled` | BOOLEAN | NO | false | - | Enable HSTS header |
| `cors_origins` | TEXT[] | YES | NULL | Valid URLs | Allowed CORS origins |
| `log_level_frontend` | VARCHAR(20) | NO | 'INFO' | Enum values | Frontend container log level |
| `log_level_backend` | VARCHAR(20) | NO | 'INFO' | Enum values | Backend container log level |
| `created_at` | TIMESTAMPTZ | NO | NOW() | - | Creation timestamp (UTC) |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | - | Last modification timestamp (UTC) |
| `updated_by` | UUID | YES | NULL | FK to users | User who made last change |

#### Indexes

```sql
-- No indexes needed for singleton table (single row)
```

---

### 2. NotificationChannels

**Purpose**: Store configuration for notification delivery channels (email SMTP, webhooks).

**Table Name**: `notification_channels`

**Constraints**:
- **Channel Type Validation**: CHECK constraint ensures valid channel types
- **Config JSON Validation**: Application-level validation of JSON structure per channel type

#### Schema

```sql
CREATE TABLE notification_channels (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Channel Configuration
    channel_type VARCHAR(50) NOT NULL
        CHECK (channel_type IN ('email', 'webhook')),
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Encrypted Configuration (JSONB)
    config_json JSONB NOT NULL,

    -- Audit Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_notification_channels_enabled ON notification_channels(enabled);
CREATE INDEX idx_notification_channels_type ON notification_channels(channel_type);
CREATE INDEX idx_notification_channels_enabled_type ON notification_channels(enabled, channel_type);

-- Trigger to update updated_at
CREATE TRIGGER update_notification_channels_updated_at
    BEFORE UPDATE ON notification_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### Field Specifications

| Field | Type | Nullable | Default | Validation | Purpose |
|-------|------|----------|---------|------------|---------|
| `id` | UUID | NO | gen_random_uuid() | - | Unique channel identifier |
| `channel_type` | VARCHAR(50) | NO | - | 'email' or 'webhook' | Type of notification channel |
| `enabled` | BOOLEAN | NO | true | - | Whether channel is active |
| `config_json` | JSONB | NO | - | Type-specific schema | Channel configuration (encrypted sensitive fields) |
| `created_at` | TIMESTAMPTZ | NO | NOW() | - | Creation timestamp (UTC) |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | - | Last modification timestamp (UTC) |

#### Config JSON Schemas

**Email Channel**:
```json
{
  "smtp_host": "smtp.sendgrid.net",
  "smtp_port": 587,
  "smtp_username": "apikey",
  "smtp_password": "ENCRYPTED_BASE64_STRING", // Encrypted with pgcrypto
  "from_address": "noreply@moncurahr.com",
  "use_tls": true
}
```

**Webhook Channel**:
```json
{
  "webhook_url": "https://hooks.example.com/notifications",
  "auth_token": "ENCRYPTED_BASE64_STRING", // Encrypted with pgcrypto
  "custom_headers": {
    "X-Custom-Header": "value"
  },
  "timeout_seconds": 5
}
```

#### Encryption Implementation

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encryption key stored in environment variable: SETTINGS_ENCRYPTION_KEY

-- Encrypt sensitive field before insert/update (application layer)
-- Backend Rust example:
/*
let encrypted_password = encrypt_field(&smtp_password, &encryption_key)?;
let config = json!({
    "smtp_password": encrypted_password,
    // ... other fields
});
*/

-- Decrypt when reading (application layer)
/*
let decrypted_password = decrypt_field(&config["smtp_password"], &encryption_key)?;
*/
```

#### Indexes

```sql
-- Query pattern: Find all enabled channels
CREATE INDEX idx_notification_channels_enabled ON notification_channels(enabled);

-- Query pattern: Find channels by type
CREATE INDEX idx_notification_channels_type ON notification_channels(channel_type);

-- Query pattern: Find enabled channels of specific type
CREATE INDEX idx_notification_channels_enabled_type ON notification_channels(enabled, channel_type);
```

---

### 3. Users Extensions (Existing Table Modifications)

**Purpose**: Add authentication policy enforcement fields to existing users table.

**Table Name**: `users` (existing)

**Migration Strategy**: ALTER TABLE to add new columns with safe defaults.

#### Schema Changes

```sql
-- Add authentication policy fields to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_last_changed TIMESTAMPTZ DEFAULT NOW();

-- Index for account lockout queries
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked);
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users(failed_login_attempts);
```

#### New Field Specifications

| Field | Type | Nullable | Default | Validation | Purpose |
|-------|------|----------|---------|------------|---------|
| `failed_login_attempts` | INTEGER | NO | 0 | >= 0 | Count of consecutive failed logins |
| `account_locked` | BOOLEAN | NO | false | - | Whether account is locked |
| `locked_at` | TIMESTAMPTZ | YES | NULL | - | When account was locked (UTC) |
| `password_last_changed` | TIMESTAMPTZ | YES | NOW() | - | Last password change date (UTC) |

#### Business Logic

**Account Lockout Flow**:
1. On failed login: Increment `failed_login_attempts`
2. If `failed_login_attempts >= system_settings.max_login_attempts`:
   - Set `account_locked = true`
   - Set `locked_at = NOW()`
3. On successful login:
   - Reset `failed_login_attempts = 0`
4. Admin unlock:
   - Set `account_locked = false`
   - Reset `failed_login_attempts = 0`
   - Set `locked_at = NULL`

**Password Expiration Check**:
1. If `system_settings.password_expiration_enabled = true`
2. Calculate: `NOW() - password_last_changed`
3. If difference > `password_expiration_days`:
   - Force password change on next login
   - Display "Your password has expired" modal

---

## Data Validation Rules

### Backend Validation (Rust)

```rust
// SystemSettings validation
impl SystemSettings {
    pub fn validate(&self) -> Result<(), ValidationError> {
        // System name
        if self.system_name.len() < 3 || self.system_name.len() > 255 {
            return Err(ValidationError::new("system_name must be 3-255 characters"));
        }

        // Timezone (validate against chrono-tz)
        chrono_tz::Tz::from_str(&self.system_timezone)
            .map_err(|_| ValidationError::new("Invalid IANA timezone"))?;

        // Session timeout (5 minutes to 24 hours)
        if self.session_timeout_minutes < 5 || self.session_timeout_minutes > 1440 {
            return Err(ValidationError::new("session_timeout_minutes must be 5-1440"));
        }

        // Password length (8-128 characters)
        if self.min_password_length < 8 || self.min_password_length > 128 {
            return Err(ValidationError::new("min_password_length must be 8-128"));
        }

        // Max login attempts (3-100)
        if self.max_login_attempts < 3 || self.max_login_attempts > 100 {
            return Err(ValidationError::new("max_login_attempts must be 3-100"));
        }

        // Log levels
        match self.log_level_frontend.as_str() {
            "DEBUG" | "INFO" | "WARN" | "ERROR" => {}
            _ => return Err(ValidationError::new("Invalid log_level_frontend")),
        }

        // CORS origins (if present, validate URLs)
        if let Some(origins) = &self.cors_origins {
            for origin in origins {
                url::Url::parse(origin)
                    .map_err(|_| ValidationError::new("Invalid CORS origin URL"))?;
            }
        }

        Ok(())
    }
}

// NotificationChannel validation
impl NotificationChannel {
    pub fn validate(&self) -> Result<(), ValidationError> {
        match self.channel_type.as_str() {
            "email" => self.validate_email_config()?,
            "webhook" => self.validate_webhook_config()?,
            _ => return Err(ValidationError::new("Invalid channel_type")),
        }
        Ok(())
    }

    fn validate_email_config(&self) -> Result<(), ValidationError> {
        let config = self.config_json.as_object()
            .ok_or(ValidationError::new("config_json must be object"))?;

        // Required fields
        let smtp_host = config.get("smtp_host")
            .and_then(|v| v.as_str())
            .ok_or(ValidationError::new("smtp_host required"))?;

        let smtp_port = config.get("smtp_port")
            .and_then(|v| v.as_u64())
            .ok_or(ValidationError::new("smtp_port required"))?;

        if smtp_port < 1 || smtp_port > 65535 {
            return Err(ValidationError::new("smtp_port must be 1-65535"));
        }

        let from_address = config.get("from_address")
            .and_then(|v| v.as_str())
            .ok_or(ValidationError::new("from_address required"))?;

        // Validate email format
        if !from_address.contains('@') {
            return Err(ValidationError::new("Invalid from_address email"));
        }

        Ok(())
    }

    fn validate_webhook_config(&self) -> Result<(), ValidationError> {
        let config = self.config_json.as_object()
            .ok_or(ValidationError::new("config_json must be object"))?;

        let webhook_url = config.get("webhook_url")
            .and_then(|v| v.as_str())
            .ok_or(ValidationError::new("webhook_url required"))?;

        // Validate URL format
        url::Url::parse(webhook_url)
            .map_err(|_| ValidationError::new("Invalid webhook_url"))?;

        Ok(())
    }
}
```

### Frontend Validation (Zod)

```typescript
import { z } from 'zod';

// SystemSettings schema
export const systemSettingsSchema = z.object({
  systemName: z.string().min(3).max(255),
  systemTimezone: z.string().regex(/^[A-Z][a-zA-Z_/+-]+$/), // IANA format
  sessionTimeoutMinutes: z.number().int().min(5).max(1440),
  minPasswordLength: z.number().int().min(8).max(128),
  maxLoginAttempts: z.number().int().min(3).max(100),
  requireMfa: z.boolean(),
  passwordExpirationEnabled: z.boolean(),
  passwordExpirationDays: z.number().int().min(30).max(365).nullable(),
  httpsEnforced: z.boolean(),
  cspPolicy: z.string().nullable(),
  xFrameOptions: z.boolean(),
  hstEnabled: z.boolean(),
  corsOrigins: z.array(z.string().url()).nullable(),
  logLevelFrontend: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']),
  logLevelBackend: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR'])
});

// Email channel schema
export const emailChannelSchema = z.object({
  channelType: z.literal('email'),
  enabled: z.boolean(),
  config: z.object({
    smtpHost: z.string().min(1),
    smtpPort: z.number().int().min(1).max(65535),
    smtpUsername: z.string().min(1),
    smtpPassword: z.string().min(1),
    fromAddress: z.string().email(),
    useTls: z.boolean().default(true)
  })
});

// Webhook channel schema
export const webhookChannelSchema = z.object({
  channelType: z.literal('webhook'),
  enabled: z.boolean(),
  config: z.object({
    webhookUrl: z.string().url(),
    authToken: z.string().optional(),
    customHeaders: z.record(z.string()).optional(),
    timeoutSeconds: z.number().int().min(1).max(30).default(5)
  })
});

export const notificationChannelSchema = z.discriminatedUnion('channelType', [
  emailChannelSchema,
  webhookChannelSchema
]);
```

---

## Migration Strategy

### Migration 1: Create SystemSettings Table

**File**: `migrations/m20251111_create_system_settings.rs`

```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SystemSettings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SystemSettings::Id)
                            .integer()
                            .not_null()
                            .primary_key()
                            .check(Expr::col(SystemSettings::Id).eq(1)),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::SystemName)
                            .string_len(255)
                            .not_null()
                            .default("MoncuraHR"),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::SystemTimezone)
                            .string_len(100)
                            .not_null()
                            .default("UTC"),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::SessionTimeoutMinutes)
                            .integer()
                            .not_null()
                            .default(60),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::MinPasswordLength)
                            .integer()
                            .not_null()
                            .default(12),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::MaxLoginAttempts)
                            .integer()
                            .not_null()
                            .default(5),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::RequireMfa)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::PasswordExpirationEnabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::HttpsEnforced)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(SystemSettings::CspPolicy).text())
                    .col(
                        ColumnDef::new(SystemSettings::XFrameOptions)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::HstsEnabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::LogLevelFrontend)
                            .string_len(20)
                            .not_null()
                            .default("INFO"),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::LogLevelBackend)
                            .string_len(20)
                            .not_null()
                            .default("INFO"),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(SystemSettings::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(SystemSettings::UpdatedBy).uuid())
                    .foreign_key(
                        ForeignKey::create()
                            .from(SystemSettings::Table, SystemSettings::UpdatedBy)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Insert default row
        let insert = Query::insert()
            .into_table(SystemSettings::Table)
            .columns([SystemSettings::Id])
            .values_panic([1.into()])
            .on_conflict(
                OnConflict::column(SystemSettings::Id)
                    .do_nothing()
                    .to_owned(),
            )
            .to_owned();

        manager.exec_stmt(insert).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SystemSettings::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum SystemSettings {
    Table,
    Id,
    SystemName,
    SystemTimezone,
    SessionTimeoutMinutes,
    MinPasswordLength,
    MaxLoginAttempts,
    RequireMfa,
    PasswordExpirationEnabled,
    HttpsEnforced,
    CspPolicy,
    XFrameOptions,
    HstsEnabled,
    LogLevelFrontend,
    LogLevelBackend,
    CreatedAt,
    UpdatedAt,
    UpdatedBy,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
```

### Migration 2: Create NotificationChannels Table

**File**: `migrations/m20251111_create_notification_channels.rs`

```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Enable pgcrypto for encryption
        manager
            .get_connection()
            .execute_unprepared("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(NotificationChannels::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(NotificationChannels::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .default(Expr::cust("gen_random_uuid()")),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::ChannelType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::ConfigJson)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_enabled")
                    .table(NotificationChannels::Table)
                    .col(NotificationChannels::Enabled)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_type")
                    .table(NotificationChannels::Table)
                    .col(NotificationChannels::ChannelType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_enabled_type")
                    .table(NotificationChannels::Table)
                    .col(NotificationChannels::Enabled)
                    .col(NotificationChannels::ChannelType)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(NotificationChannels::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum NotificationChannels {
    Table,
    Id,
    ChannelType,
    Enabled,
    ConfigJson,
    CreatedAt,
    UpdatedAt,
}
```

### Migration 3: Extend Users Table

**File**: `migrations/m20251111_extend_users_for_auth_policies.rs`

```rust
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::FailedLoginAttempts)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::AccountLocked)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::LockedAt).timestamp_with_time_zone(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::PasswordLastChanged)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_account_locked")
                    .table(Users::Table)
                    .col(Users::AccountLocked)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_failed_attempts")
                    .table(Users::Table)
                    .col(Users::FailedLoginAttempts)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Users::Table)
                    .drop_column(Users::FailedLoginAttempts)
                    .drop_column(Users::AccountLocked)
                    .drop_column(Users::LockedAt)
                    .drop_column(Users::PasswordLastChanged)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Users {
    Table,
    FailedLoginAttempts,
    AccountLocked,
    LockedAt,
    PasswordLastChanged,
}
```

---

## Query Patterns & Performance

### Common Queries

**1. Fetch System Settings (once per app initialization)**
```sql
SELECT * FROM system_settings WHERE id = 1;
```
- **Frequency**: Once per backend/frontend initialization
- **Performance**: O(1) primary key lookup
- **Caching**: Cache in application memory, TTL 5 minutes

**2. Update System Settings (admin action)**
```sql
UPDATE system_settings
SET system_name = $1, system_timezone = $2, updated_at = NOW(), updated_by = $3
WHERE id = 1
RETURNING *;
```
- **Frequency**: <1 per day (admin-only)
- **Performance**: O(1) primary key update
- **Side Effects**: Invalidate cache, trigger container restarts (if log level changed)

**3. Fetch Enabled Notification Channels**
```sql
SELECT * FROM notification_channels
WHERE enabled = true
ORDER BY channel_type;
```
- **Frequency**: Once per notification event
- **Performance**: O(n) with index on `enabled`
- **Expected Rows**: 1-5 channels

**4. Check Account Lockout**
```sql
SELECT account_locked, failed_login_attempts
FROM users
WHERE id = $1;
```
- **Frequency**: Every login attempt
- **Performance**: O(1) primary key lookup
- **Indexed**: Primary key on `id`

**5. Increment Failed Login Attempts**
```sql
UPDATE users
SET failed_login_attempts = failed_login_attempts + 1
WHERE id = $1;
```
- **Frequency**: Every failed login
- **Performance**: O(1) primary key update

**6. Lock Account After Max Attempts**
```sql
UPDATE users
SET account_locked = true, locked_at = NOW()
WHERE id = $1 AND failed_login_attempts >= $2;
```
- **Frequency**: On reaching max_login_attempts
- **Performance**: O(1) primary key update

---

## Data Consistency & Integrity

### ACID Properties

**Atomicity**:
- All mutations wrapped in database transactions
- Settings updates are atomic (all-or-nothing)

**Consistency**:
- CHECK constraints enforce valid ranges
- Foreign key constraints maintain referential integrity
- Application-level validation before persistence

**Isolation**:
- READ COMMITTED isolation level (PostgreSQL default)
- No concurrent modifications expected (singleton table, admin-only updates)

**Durability**:
- All writes commit to PostgreSQL WAL before response
- Database backups include settings (critical for disaster recovery)

### Referential Integrity

**system_settings.updated_by → users.id**:
- ON DELETE SET NULL (preserve audit trail even if admin user deleted)

**No cascading deletes** (settings deletion not allowed due to singleton constraint)

---

## Backup & Recovery

### Critical Data

**Must backup**:
- `system_settings` table (singleton row)
- `notification_channels` table (includes encrypted credentials)
- `users` table extensions (lockout state)

### Recovery Procedures

**Scenario 1: Settings Corruption**
```sql
-- Restore to defaults
UPDATE system_settings
SET system_name = 'MoncuraHR',
    system_timezone = 'UTC',
    session_timeout_minutes = 60,
    min_password_length = 12,
    max_login_attempts = 5,
    require_mfa = false,
    https_enforced = false,
    log_level_frontend = 'INFO',
    log_level_backend = 'INFO'
WHERE id = 1;
```

**Scenario 2: Lost Encryption Key**
- Notification channels become unrecoverable (credentials encrypted)
- Require administrators to re-enter SMTP/webhook credentials
- No system downtime (notifications fail gracefully per best-effort policy)

---

## Security Considerations

### Encryption at Rest

**Sensitive Fields**:
- `notification_channels.config_json.smtp_password`
- `notification_channels.config_json.auth_token`

**Encryption Method**:
- PostgreSQL `pgcrypto` extension
- AES-256 encryption
- Key stored in environment variable `SETTINGS_ENCRYPTION_KEY`

### Access Control

**Admin-Only Operations**:
- All `system_settings` mutations
- All `notification_channels` mutations
- `unlockUserAccount` mutation

**GraphQL Guard Implementation**:
```rust
#[graphql(guard = "RoleGuard::new(Role::Admin)")]
async fn update_system_settings(
    &self,
    ctx: &Context<'_>,
    input: UpdateSystemSettingsInput,
) -> Result<SystemSettings> {
    // Implementation
}
```

### Audit Logging

**Tracked Changes**:
- All system settings updates (via `updated_at` and `updated_by`)
- Notification channel creation/modification
- Account lockouts and unlocks

**Future Enhancement**: Add dedicated `audit_log` table for complete change history.

---

## Testing Data

### Seed Data for Development

```sql
-- System settings already seeded by migration (id=1 with defaults)

-- Sample notification channels
INSERT INTO notification_channels (channel_type, enabled, config_json)
VALUES
  ('email', true, '{"smtp_host": "smtp.mailtrap.io", "smtp_port": 2525, "smtp_username": "test", "smtp_password": "test", "from_address": "noreply@test.com", "use_tls": false}'),
  ('webhook', true, '{"webhook_url": "https://webhook.site/unique-id", "timeout_seconds": 5}');

-- Sample locked user (for testing unlock functionality)
UPDATE users
SET account_locked = true,
    failed_login_attempts = 5,
    locked_at = NOW()
WHERE email = 'locked.user@example.com';
```

---

## Summary

This data model provides:

✅ **Singleton settings table** with constraint enforcement
✅ **Encrypted notification credentials** via pgcrypto
✅ **Account lockout tracking** on users table
✅ **UTC timestamp storage** with display-time timezone conversion
✅ **Comprehensive validation** at database and application layers
✅ **Performance-optimized indexes** for common query patterns
✅ **ACID compliance** with transaction safety
✅ **Audit metadata** for change tracking
