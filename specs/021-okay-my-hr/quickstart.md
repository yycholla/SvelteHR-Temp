# Quickstart Guide: System Settings Implementation

**Feature**: 021-okay-my-hr
**Date**: 2025-11-11
**Estimated Time**: 3-5 days for full implementation

## Overview

This guide provides a step-by-step walkthrough for implementing the Functional System Settings feature from scratch.

## Prerequisites

**Required Tools**:

- Rust 1.75+ with `cargo`
- Node.js 20+ with `npm`
- PostgreSQL 14+
- Docker & Docker Compose (for local development)
- Kubernetes CLI `kubectl` (optional, for K8s deployment)

**Required Knowledge**:

- Rust async programming
- SeaORM migrations
- async-graphql schema design
- SvelteKit + Svelte 5 runes
- TypeScript
- GraphQL client (urql)

## Phase 1: Database Setup (Day 1 Morning)

### Step 1.1: Create SeaORM Migrations

```bash
# Navigate to backend directory
cd ../MountainHR-Backend

# Create migrations
cargo run -- migration generate create_system_settings
cargo run -- migration generate create_notification_channels
cargo run -- migration generate extend_users_for_auth_policies
```

### Step 1.2: Implement Migration Files

Copy migration code from `data-model.md` into the generated migration files:

**File**: `migration/src/m20251111_create_system_settings.rs`

- Implement `up()` method: CREATE TABLE system_settings with all fields
- Add CHECK constraint for singleton (id = 1)
- Insert default row with ON CONFLICT DO NOTHING
- Implement `down()` method: DROP TABLE system_settings

**File**: `migration/src/m20251111_create_notification_channels.rs`

- Enable pgcrypto extension
- CREATE TABLE notification_channels with JSONB config
- Create indexes on `enabled`, `channel_type`
- Implement down() method

**File**: `migration/src/m20251111_extend_users_for_auth_policies.rs`

- ALTER TABLE users ADD COLUMN fields
- Create indexes on `account_locked`, `failed_login_attempts`
- Implement down() method

### Step 1.3: Run Migrations

```bash
# Apply migrations
cargo run -- migration up

# Verify tables created
psql $DATABASE_URL -c "\d system_settings"
psql $DATABASE_URL -c "\d notification_channels"
psql $DATABASE_URL -c "\d users"
```

**Expected Output**: Tables created with correct schemas and constraints.

---

## Phase 2: Backend GraphQL API (Day 1 Afternoon - Day 2)

### Step 2.1: Generate SeaORM Entities

```bash
# Generate entities from database
sea-orm-cli generate entity \
  -u $DATABASE_URL \
  -o src/entities \
  --with-serde both

# Expected files:
# - src/entities/system_settings.rs
# - src/entities/notification_channels.rs
# - src/entities/users.rs (updated)
```

### Step 2.2: Define GraphQL Types

**File**: `src/graphql/types/system_settings.rs`

```rust
use async_graphql::{SimpleObject, Enum};
use chrono::{DateTime, Utc};

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(SimpleObject)]
pub struct SystemSettings {
    pub id: i32,
    pub system_name: String,
    pub system_timezone: String,
    pub session_timeout_minutes: i32,
    pub min_password_length: i32,
    pub max_login_attempts: i32,
    pub require_mfa: bool,
    pub password_expiration_enabled: bool,
    pub password_expiration_days: Option<i32>,
    pub https_enforced: bool,
    pub csp_policy: Option<String>,
    pub x_frame_options: bool,
    pub hsts_enabled: bool,
    pub cors_origins: Option<Vec<String>>,
    pub log_level_frontend: LogLevel,
    pub log_level_backend: LogLevel,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub updated_by: Option<User>,
}

// Implement From<entities::system_settings::Model> for SystemSettings
impl From<entities::system_settings::Model> for SystemSettings {
    fn from(model: entities::system_settings::Model) -> Self {
        // Convert entity to GraphQL type
        Self {
            id: model.id,
            system_name: model.system_name,
            // ... map all fields
        }
    }
}
```

**File**: `src/graphql/types/notification_channel.rs`

```rust
use async_graphql::{Union, SimpleObject, Enum};
use serde_json::Value as JsonValue;

#[derive(Enum, Copy, Clone)]
pub enum ChannelType {
    Email,
    Webhook,
}

#[derive(Union)]
pub enum ChannelConfig {
    Email(EmailChannelConfig),
    Webhook(WebhookChannelConfig),
}

#[derive(SimpleObject)]
pub struct EmailChannelConfig {
    pub smtp_host: String,
    pub smtp_port: i32,
    pub smtp_username: String,
    pub from_address: String,
    pub use_tls: bool,
    // Note: smtp_password NOT exposed
}

#[derive(SimpleObject)]
pub struct WebhookChannelConfig {
    pub webhook_url: String,
    pub custom_headers: Option<JsonValue>,
    pub timeout_seconds: i32,
    // Note: auth_token NOT exposed
}

#[derive(SimpleObject)]
pub struct NotificationChannel {
    pub id: uuid::Uuid,
    pub channel_type: ChannelType,
    pub enabled: bool,
    pub config: ChannelConfig,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Step 2.3: Implement GraphQL Queries

**File**: `src/graphql/query/system_settings.rs`

```rust
use async_graphql::{Context, Object, Result};
use sea_orm::DatabaseConnection;

pub struct SystemSettingsQuery;

#[Object]
impl SystemSettingsQuery {
    #[graphql(guard = "RoleGuard::new(Role::Admin)")]
    async fn system_settings(&self, ctx: &Context<'_>) -> Result<SystemSettings> {
        let db = ctx.data::<DatabaseConnection>()?;

        let settings = entities::system_settings::Entity::find_by_id(1)
            .one(db)
            .await?
            .ok_or("System settings not found")?;

        Ok(settings.into())
    }

    #[graphql(guard = "RoleGuard::new(Role::Admin)")]
    async fn notification_channels(&self, ctx: &Context<'_>) -> Result<Vec<NotificationChannel>> {
        let db = ctx.data::<DatabaseConnection>()?;

        let channels = entities::notification_channels::Entity::find()
            .all(db)
            .await?;

        Ok(channels.into_iter().map(|c| c.into()).collect())
    }
}
```

### Step 2.4: Implement GraphQL Mutations

**File**: `src/graphql/mutation/system_settings.rs`

```rust
use async_graphql::{Context, Object, Result, InputObject};
use sea_orm::{DatabaseConnection, Set, ActiveModelTrait};

#[derive(InputObject)]
pub struct UpdateSystemSettingsInput {
    pub system_name: Option<String>,
    pub system_timezone: Option<String>,
    pub session_timeout_minutes: Option<i32>,
    // ... all optional fields
}

pub struct SystemSettingsMutation;

#[Object]
impl SystemSettingsMutation {
    #[graphql(guard = "RoleGuard::new(Role::Admin)")]
    async fn update_system_settings(
        &self,
        ctx: &Context<'_>,
        input: UpdateSystemSettingsInput,
    ) -> Result<SystemSettings> {
        let db = ctx.data::<DatabaseConnection>()?;
        let user = ctx.data::<CurrentUser>()?;

        // Validate input
        validate_system_settings_input(&input)?;

        // Fetch current settings
        let current = entities::system_settings::Entity::find_by_id(1)
            .one(db)
            .await?
            .ok_or("Settings not found")?;

        let mut active: entities::system_settings::ActiveModel = current.into();

        // Apply partial updates
        if let Some(name) = input.system_name {
            active.system_name = Set(name);
        }
        if let Some(tz) = input.system_timezone {
            active.system_timezone = Set(tz);
        }
        // ... update all fields

        active.updated_at = Set(chrono::Utc::now().into());
        active.updated_by = Set(Some(user.id));

        let updated = active.update(db).await?;

        // If log levels changed, trigger container restart
        if input.log_level_frontend.is_some() || input.log_level_backend.is_some() {
            trigger_container_restart(ctx, &updated).await?;
        }

        // Publish subscription event
        publish_settings_updated(ctx, &updated).await?;

        Ok(updated.into())
    }
}

fn validate_system_settings_input(input: &UpdateSystemSettingsInput) -> Result<()> {
    if let Some(name) = &input.system_name {
        if name.len() < 3 || name.len() > 255 {
            return Err("System name must be 3-255 characters".into());
        }
    }

    if let Some(tz) = &input.system_timezone {
        chrono_tz::Tz::from_str(tz)
            .map_err(|_| "Invalid IANA timezone")?;
    }

    if let Some(timeout) = input.session_timeout_minutes {
        if timeout < 5 || timeout > 1440 {
            return Err("Session timeout must be 5-1440 minutes".into());
        }
    }

    // ... validate all fields

    Ok(())
}

async fn trigger_container_restart(ctx: &Context<'_>, settings: &entities::system_settings::Model) -> Result<()> {
    // TODO: Implement Kubernetes/Docker API integration
    // For now, log the request
    tracing::info!(
        "Container restart requested: frontend={}, backend={}",
        settings.log_level_frontend,
        settings.log_level_backend
    );
    Ok(())
}
```

### Step 2.5: Register Schema

**File**: `src/graphql/schema.rs`

```rust
use async_graphql::{EmptySubscription, MergedObject, Schema};

#[derive(MergedObject, Default)]
pub struct Query(
    // ... existing queries
    system_settings::SystemSettingsQuery,
);

#[derive(MergedObject, Default)]
pub struct Mutation(
    // ... existing mutations
    system_settings::SystemSettingsMutation,
);

pub type AppSchema = Schema<Query, Mutation, EmptySubscription>;

pub fn build_schema(db: DatabaseConnection) -> AppSchema {
    Schema::build(Query::default(), Mutation::default(), EmptySubscription)
        .data(db)
        .finish()
}
```

### Step 2.6: Test Backend API

```bash
# Start backend server
cargo run

# Test query with GraphQL Playground
open http://localhost:8080/graphql

# Run query:
query {
  systemSettings {
    id
    systemName
    systemTimezone
  }
}

# Expected: Returns default settings
```

---

## Phase 3: Frontend Implementation (Day 3)

### Step 3.1: Generate GraphQL Types

**File**: `src/lib/graphql/operations.ts`

```typescript
import { gql } from '@urql/svelte';

export const SYSTEM_SETTINGS_QUERY = gql`
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
`;

export const UPDATE_SYSTEM_SETTINGS_MUTATION = gql`
	mutation UpdateSystemSettings($input: UpdateSystemSettingsInput!) {
		updateSystemSettings(input: $input) {
			id
			systemName
			systemTimezone
			sessionTimeoutMinutes
			logLevelFrontend
			logLevelBackend
			updatedAt
		}
	}
`;
```

### Step 3.2: Create Settings Store

**File**: `src/lib/stores/system-settings.ts`

```typescript
import { writable, derived } from 'svelte/store';
import { query } from '@urql/svelte';
import { SYSTEM_SETTINGS_QUERY } from '$lib/graphql/operations';
import { urqlClient } from '$lib/graphql/client';

// Query store
export const systemSettingsQuery = query({
	client: urqlClient,
	query: SYSTEM_SETTINGS_QUERY
});

// Derived stores for specific settings
export const systemName = derived(
	systemSettingsQuery,
	($query) => $query.data?.systemSettings?.systemName ?? 'MoncuraHR'
);

export const systemTimezone = derived(
	systemSettingsQuery,
	($query) => $query.data?.systemSettings?.systemTimezone ?? 'UTC'
);

// Initialize on app load
export function initSystemSettings() {
	systemSettingsQuery.reexecute({ requestPolicy: 'network-only' });
}
```

### Step 3.3: Replace Hardcoded System Names

**Find and Replace**:

```bash
# Find all instances of hardcoded names
cd src
grep -r "MountainHR\|SvelteHR" .

# Replace in components
# Example: src/lib/components/Header.svelte
```

**Before**:

```svelte
<header>
	<h1>MountainHR</h1>
</header>
```

**After**:

```svelte
<script>
	import { systemName } from '$lib/stores/system-settings';
</script>

<header>
	<h1>{$systemName}</h1>
</header>
```

### Step 3.4: Create Settings UI Page

**File**: `src/routes/admin/settings/+page.svelte`

```svelte
<script lang="ts">
	import { mutation } from '@urql/svelte';
	import { UPDATE_SYSTEM_SETTINGS_MUTATION } from '$lib/graphql/operations';
	import { systemSettingsQuery } from '$lib/stores/system-settings';
	import { toast } from 'svelte-sonner';
	import { systemSettingsSchema } from '$lib/schemas/system-settings';

	let { data } = $props();

	// Form state
	let formData = $state({
		systemName: data.settings.systemName,
		systemTimezone: data.settings.systemTimezone,
		sessionTimeoutMinutes: data.settings.sessionTimeoutMinutes
		// ... all fields
	});

	const updateSettings = mutation({
		query: UPDATE_SYSTEM_SETTINGS_MUTATION
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();

		// Validate with Zod
		const result = systemSettingsSchema.safeParse(formData);
		if (!result.success) {
			toast.error('Validation failed');
			return;
		}

		// Execute mutation
		const { data, error } = await updateSettings({ input: formData });

		if (error) {
			toast.error(error.message);
		} else {
			toast.success('Settings updated successfully');
			systemSettingsQuery.reexecute({ requestPolicy: 'network-only' });
		}
	}
</script>

<form onsubmit={handleSubmit}>
	<div class="form-section">
		<h2>General Settings</h2>

		<label>
			System Name
			<input type="text" bind:value={formData.systemName} required />
		</label>

		<label>
			Timezone
			<select bind:value={formData.systemTimezone}>
				<option value="UTC">UTC</option>
				<option value="America/New_York">America/New_York</option>
				<option value="America/Denver">America/Denver</option>
				<!-- Add all IANA timezones -->
			</select>
		</label>
	</div>

	<div class="form-section">
		<h2>Authentication Settings</h2>

		<label>
			Session Timeout (minutes)
			<input type="number" bind:value={formData.sessionTimeoutMinutes} min="5" max="1440" />
		</label>

		<label>
			Minimum Password Length
			<input type="number" bind:value={formData.minPasswordLength} min="8" max="128" />
		</label>

		<label>
			Max Login Attempts
			<input type="number" bind:value={formData.maxLoginAttempts} min="3" max="100" />
		</label>

		<label>
			<input type="checkbox" bind:checked={formData.requireMfa} />
			Require MFA for all users
		</label>
	</div>

	<div class="form-section">
		<h2>Developer Settings</h2>

		<label>
			Frontend Log Level
			<select bind:value={formData.logLevelFrontend}>
				<option value="DEBUG">DEBUG</option>
				<option value="INFO">INFO</option>
				<option value="WARN">WARN</option>
				<option value="ERROR">ERROR</option>
			</select>
		</label>

		<label>
			Backend Log Level
			<select bind:value={formData.logLevelBackend}>
				<option value="DEBUG">DEBUG</option>
				<option value="INFO">INFO</option>
				<option value="WARN">WARN</option>
				<option value="ERROR">ERROR</option>
			</select>
		</label>
	</div>

	<button type="submit">Save Settings</button>
</form>
```

### Step 3.5: Server-Side Data Loading

**File**: `src/routes/admin/settings/+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { urqlClient } from '$lib/graphql/client';
import { SYSTEM_SETTINGS_QUERY } from '$lib/graphql/operations';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('hr_token');

	// Fetch settings server-side
	const result = await urqlClient
		.query(
			SYSTEM_SETTINGS_QUERY,
			{},
			{
				fetchOptions: {
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			}
		)
		.toPromise();

	if (result.error) {
		throw error(500, 'Failed to load settings');
	}

	return {
		settings: result.data.systemSettings
	};
};
```

---

## Phase 4: Advanced Features (Day 4)

### Step 4.1: Implement Session Timeout

**File**: `src/lib/utils/session-manager.ts`

```typescript
import { goto } from '$app/navigation';
import { systemSettingsQuery } from '$lib/stores/system-settings';

let inactivityTimer: number | null = null;

export function initSessionTimeout() {
	const settings = get(systemSettingsQuery);
	const timeoutMs = settings.data?.systemSettings?.sessionTimeoutMinutes * 60 * 1000 || 3600000;

	function resetTimer() {
		if (inactivityTimer) clearTimeout(inactivityTimer);

		inactivityTimer = setTimeout(() => {
			// Log out user
			localStorage.removeItem('hr_token');
			goto('/login?reason=session_expired');
		}, timeoutMs);
	}

	// Reset timer on user activity
	window.addEventListener('mousemove', resetTimer);
	window.addEventListener('keypress', resetTimer);
	window.addEventListener('click', resetTimer);

	resetTimer();
}
```

### Step 4.2: Implement Password Validation

**File**: `src/lib/utils/password-validator.ts`

```typescript
import { systemSettingsQuery } from '$lib/stores/system-settings';
import { get } from 'svelte/store';

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
	const settings = get(systemSettingsQuery);
	const minLength = settings.data?.systemSettings?.minPasswordLength || 12;

	const errors: string[] = [];

	if (password.length < minLength) {
		errors.push(`Password must be at least ${minLength} characters`);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
```

### Step 4.3: Implement Account Lockout UI

**File**: `src/routes/login/+page.svelte`

```svelte
<script lang="ts">
	import { mutation } from '@urql/svelte';
	import { LOGIN_MUTATION } from '$lib/graphql/operations';

	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');

	const login = mutation({ query: LOGIN_MUTATION });

	async function handleLogin() {
		const result = await login({ email, password });

		if (result.error) {
			const message = result.error.message;

			if (message.includes('account locked')) {
				errorMessage =
					'Your account has been locked due to too many failed login attempts. Please contact an administrator.';
			} else if (message.includes('invalid credentials')) {
				errorMessage = 'Invalid email or password. Please try again.';
			} else {
				errorMessage = 'Login failed. Please try again.';
			}
		} else {
			// Successful login
			goto('/dashboard');
		}
	}
</script>

<form onsubmit={handleLogin}>
	<input type="email" bind:value={email} required />
	<input type="password" bind:value={password} required />

	{#if errorMessage}
		<div class="error">{errorMessage}</div>
	{/if}

	<button type="submit">Log In</button>
</form>
```

---

## Phase 5: Testing (Day 5)

### Step 5.1: Unit Tests (Backend)

**File**: `tests/system_settings_test.rs`

```rust
#[tokio::test]
async fn test_update_system_settings_validates_timezone() {
    let db = setup_test_db().await;
    let schema = build_schema(db);
    let admin_ctx = create_admin_context();

    let mutation = r#"
        mutation {
            updateSystemSettings(input: { systemTimezone: "Invalid/Timezone" }) {
                id
            }
        }
    "#;

    let result = schema.execute(Request::new(mutation).data(admin_ctx)).await;
    assert!(result.errors.len() > 0);
    assert_eq!(result.errors[0].message, "Invalid IANA timezone");
}

#[tokio::test]
async fn test_singleton_constraint_enforced() {
    let db = setup_test_db().await;

    // Attempt to insert second row
    let result = entities::system_settings::ActiveModel {
        id: Set(2),
        ..Default::default()
    }.insert(&db).await;

    assert!(result.is_err());
}
```

### Step 5.2: Integration Tests (Frontend)

**File**: `tests/e2e/system-settings.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('System Settings', () => {
	test('admin can update system name', async ({ page }) => {
		await loginAsAdmin(page);
		await page.goto('/admin/settings');

		await page.fill('[name="systemName"]', 'TestCorp HR');
		await page.click('button[type="submit"]');

		await expect(page.locator('.toast-success')).toContainText('Settings updated');

		// Verify name appears in header
		await page.goto('/dashboard');
		await expect(page.locator('header h1')).toContainText('TestCorp HR');
	});

	test('admin can change log level and trigger restart', async ({ page }) => {
		await loginAsAdmin(page);
		await page.goto('/admin/settings');

		await page.selectOption('[name="logLevelFrontend"]', 'DEBUG');
		await page.click('button[type="submit"]');

		await expect(page.locator('.toast-success')).toContainText('Settings updated');
		// Verify container restart triggered (check logs or status)
	});

	test('session timeout enforced after configured duration', async ({ page }) => {
		await loginAsAdmin(page);
		await page.goto('/admin/settings');

		// Set timeout to 1 minute for testing
		await page.fill('[name="sessionTimeoutMinutes"]', '1');
		await page.click('button[type="submit"]');

		// Wait 61 seconds
		await page.waitForTimeout(61000);

		// Attempt to navigate
		await page.goto('/dashboard');

		// Should be redirected to login
		await expect(page).toHaveURL(/\/login\?reason=session_expired/);
	});
});
```

---

## Verification Checklist

### Backend

- [ ] Migrations run successfully
- [ ] Singleton constraint enforced (cannot insert id != 1)
- [ ] GraphQL queries return correct data
- [ ] Mutations validate input (timezone, ranges)
- [ ] RBAC guards prevent non-admin access
- [ ] Unit tests pass (`cargo test`)

### Frontend

- [ ] System name replaced across all UI components
- [ ] Settings form loads current values
- [ ] Form submission updates backend
- [ ] Validation errors displayed correctly
- [ ] Toast notifications work
- [ ] E2E tests pass (`npm run test:e2e`)

### Integration

- [ ] Backend API accessible at http://localhost:8080/graphql
- [ ] Frontend connects to backend
- [ ] GraphQL subscriptions work (if implemented)
- [ ] Session timeout enforced
- [ ] Account lockout works after max attempts

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution**:

```bash
# Drop and recreate database
dropdb mountain_hr_dev
createdb mountain_hr_dev
cargo run -- migration up
```

### Issue: GraphQL guard always returns unauthorized

**Solution**: Verify JWT token contains correct role claim:

```rust
// In auth middleware
let claims = decode_jwt(&token)?;
ctx.insert(CurrentUser {
    id: claims.sub,
    roles: claims.roles, // Must include "Admin"
});
```

### Issue: Frontend store not reactive

**Solution**: Ensure `$` prefix used for store subscriptions:

```svelte
<!-- Wrong -->
<h1>{systemName}</h1>

<!-- Correct -->
<h1>{$systemName}</h1>
```

### Issue: Container restart not working

**Solution**: Verify Kubernetes/Docker API client configured:

```bash
# Test K8s connection
kubectl get pods

# Check environment variable
echo $KUBECONFIG
```

---

## Next Steps

After completing this quickstart:

1. **Add Notification Channels**: Implement email/webhook channel configuration
2. **Implement Subscriptions**: Add real-time settings updates via GraphQL subscriptions
3. **Add Audit Logging**: Track all settings changes in audit_log table
4. **Deploy to Production**: Configure HTTPS enforcement, secrets management
5. **Monitor Performance**: Add metrics for settings queries, container restart duration

## Support

**Documentation**:

- Full specification: `specs/021-okay-my-hr/spec.md`
- Data model: `specs/021-okay-my-hr/data-model.md`
- API contract: `specs/021-okay-my-hr/contracts/graphql-api.md`

**Resources**:

- SeaORM Docs: https://www.sea-ql.org/SeaORM/docs/
- async-graphql: https://async-graphql.github.io/async-graphql/en/
- SvelteKit: https://kit.svelte.dev/docs

**Estimated Timeline**: 3-5 days for experienced developer, 5-7 days for team unfamiliar with stack.
