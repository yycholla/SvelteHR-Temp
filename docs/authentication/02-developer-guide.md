# JWT Authentication Developer Guide

## Architecture Overview

SvelteHR uses JWT (JSON Web Token) authentication with RS256 (RSA-2048) signing for secure, stateless authentication across the frontend and backend.

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (SvelteKit)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐    ┌──────────────────────┐       │
│  │ JWT Auth Store       │    │ JWT GraphQL Client   │       │
│  │ (jwt-auth.svelte.ts) │───▶│ (jwt-client.ts)      │       │
│  │                      │    │                      │       │
│  │ • Token storage      │    │ • Auth exchange      │       │
│  │ • Auto-refresh       │    │ • Error detection    │       │
│  │ • Session restore    │    │ • Token injection    │       │
│  │ • Permission checks  │    │ • Auto-retry         │       │
│  └──────────────────────┘    └──────────────────────┘       │
│            ▲                            │                    │
│            │                            ▼                    │
│            │                  GraphQL Request with           │
│            │                  Authorization Header           │
│            │                            │                    │
└────────────┼────────────────────────────┼────────────────────┘
             │                            │
             │ HTTPS / Cookies            │
             │                            ▼
┌────────────┼───────────────────────────────────────────────┐
│            │         Backend (Rust/Axum)                  │
├────────────┼───────────────────────────────────────────────┤
│            │                                                │
│  ┌─────────▼──────────────────────────────────────┐       │
│  │ JWT Middleware (jwt_auth_middleware.rs)        │       │
│  │ • Extract Bearer token                         │       │
│  │ • Validate signature                           │       │
│  │ • Check expiration                             │       │
│  │ • Verify revocation                            │       │
│  │ • Extract UserContext                          │       │
│  └─────────┬──────────────────────────────────────┘       │
│            ▼                                                │
│  ┌──────────────────────────────────────┐                 │
│  │ GraphQL Handler                      │                 │
│  │ • Extract UserContext from request   │                 │
│  │ • Add to GraphQL context             │                 │
│  │ • Route to resolver                  │                 │
│  └─────────┬───────────────────────────┘                  │
│            ▼                                                │
│  ┌──────────────────────────────────────┐                 │
│  │ GraphQL Resolver                     │                 │
│  │ • Access UserContext                 │                 │
│  │ • Check permissions/roles            │                 │
│  │ • Execute business logic             │                 │
│  │ • Return result                      │                 │
│  └─────────┬───────────────────────────┘                  │
│            ▼                                                │
│  ┌──────────────────────────────────────┐                 │
│  │ Database                             │                 │
│  │ • User data                          │                 │
│  │ • Roles & permissions                │                 │
│  │ • Refresh tokens                     │                 │
│  └──────────────────────────────────────┘                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Frontend Implementation

### 1. JWT Auth Store (`src/lib/stores/jwt-auth.svelte.ts`)

The central authentication state management using Svelte 5 runes.

#### Key Features

```typescript
class JwtAuthStore {
	// Reactive state
	accessToken: string | null = $state(null);
	user: AuthUser | null = $state(null);
	isLoading: boolean = $state(false);
	error: string | null = $state(null);

	// Derived state
	isAuthenticated: boolean = $derived(!!this.accessToken && !!this.user);

	// Public methods
	async login(email: string, password: string): Promise<void>;
	async refreshAccessToken(): Promise<boolean>;
	async logout(): Promise<void>;
	hasPermission(permission: string): boolean;
	hasRole(role: string): boolean;
}
```

#### Usage in Components

```svelte
<script lang="ts">
	import { jwtAuth } from '$lib/stores/jwt-auth.svelte';

	// Check authentication status
	let isLoggedIn = $derived(jwtAuth.isAuthenticated);

	// Access current user
	let user = $derived(jwtAuth.user);

	// Check permissions
	if (jwtAuth.hasPermission('employees:edit')) {
		// Show edit button
	}

	// Handle login
	async function handleLogin(email: string, password: string) {
		const result = await jwtAuth.login(email, password);
		if (result.success) {
			// Redirect to dashboard
			goto('/dashboard');
		} else {
			// Show error message
			console.error(result.error);
		}
	}

	// Handle logout
	async function handleLogout() {
		await jwtAuth.logout();
		goto('/auth/login');
	}
</script>

<!-- Conditional rendering based on auth state -->
{#if isLoggedIn}
	<p>Welcome, {user?.displayName}!</p>
	<button onclick={handleLogout}>Logout</button>
{:else}
	<p>Please login</p>
{/if}
```

#### Authentication Flow

```typescript
// 1. Login with credentials
const result = await jwtAuth.login('user@example.com', 'password');

// 2. GraphQL mutation executes
// 3. Backend validates credentials
// 4. Backend returns tokens + user info
// 5. jwtAuth stores:
//    - accessToken in memory (15 min TTL)
//    - refreshToken in HTTP-only cookie (7 day TTL)
//    - user info in state
// 6. Schedules auto-refresh 1 min before expiry
```

#### Token Refresh

```typescript
// Called automatically 1 minute before expiry
const success = await jwtAuth.refreshAccessToken();

// OR called manually if needed
if (!jwtAuth.isAuthenticated) {
	const restored = await jwtAuth.refreshAccessToken();
	if (!restored) {
		// Refresh failed, redirect to login
	}
}
```

### 2. JWT GraphQL Client (`src/lib/graphql/jwt-client.ts`)

URQL client with automatic JWT injection and error handling.

#### Features

- **Auto Token Injection:** Adds `Authorization: Bearer <token>` header
- **Error Detection:** Detects UNAUTHENTICATED errors
- **Auto Refresh:** Triggers refresh on auth errors
- **Auto Retry:** Retries request after refresh
- **SSR Support:** Factory function for server-side use

#### Creating a JWT Client

```typescript
import { createJwtGraphQLClient, createServerJwtClient } from '$lib/graphql/jwt-client';

// Browser client (auto-initialized)
import { jwtGraphQLClient } from '$lib/graphql/jwt-client';

const result = await jwtGraphQLClient.query(QUERY, variables).toPromise();

// Server-side client
export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const accessToken = cookies.get('access_token');
	const client = createServerJwtClient(fetch, accessToken);

	const result = await client.query(QUERY, variables).toPromise();
	return result.data;
};
```

#### Auth Exchange Implementation

```typescript
const jwtAuthExchange = authExchange<AuthState>(async (utils) => {
	return {
		// 1. Add token to every operation
		addAuthToOperation(operation) {
			const token = jwtAuth.accessToken;
			if (!token) return operation;

			return utils.appendHeaders(operation, {
				Authorization: `Bearer ${token}`
			});
		},

		// 2. Detect auth errors
		didAuthError(error, operation) {
			return (
				error.graphQLErrors.some((err) => err.extensions?.code === 'UNAUTHENTICATED') ||
				(error.networkError as any)?.statusCode === 401
			);
		},

		// 3. Refresh token on error
		async refreshAuth() {
			const success = await jwtAuth.refreshAccessToken();
			return { token: success ? jwtAuth.accessToken : null };
		}
	};
});
```

### 3. Login Component

```svelte
<!-- src/lib/components/auth/LoginForm.svelte -->
<script lang="ts">
	import { jwtAuth } from '$lib/stores/jwt-auth.svelte';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';

	async function handleSubmit() {
		const result = await jwtAuth.login(email, password);

		if (result.success) {
			// User authenticated, redirect
			await goto('/dashboard');
		} else {
			// Show error message
			console.error(result.error);
		}
	}
</script>

<form onsubmit|preventDefault={handleSubmit}>
	<input bind:value={email} type="email" placeholder="Email" required />
	<input bind:value={password} type="password" placeholder="Password" required />

	{#if jwtAuth.error}
		<p class="error">{jwtAuth.error}</p>
	{/if}

	<button disabled={jwtAuth.isLoading}>
		{jwtAuth.isLoading ? 'Logging in...' : 'Login'}
	</button>
</form>
```

## Backend Implementation

### 1. JWT Service (`src/auth/jwt_service.rs`)

Core JWT token generation and validation logic.

#### Token Generation

```rust
use crate::auth::{JwtService, AccessTokenClaims};

// Generate access token (15 minutes)
let access_token = jwt_service
  .generate_access_token(
    user_id,
    "user@example.com".to_string(),
    "John Doe".to_string(),
    department_id,
  )
  .await?;

// Generate refresh token (7 days)
let (refresh_token, refresh_token_plaintext) = jwt_service
  .generate_refresh_token(user_id, "device-id")
  .await?;
```

#### Token Claims

**Access Token Claims:**

```rust
pub struct AccessTokenClaims {
  pub sub: String,              // User ID
  pub email: String,
  pub roles: Vec<String>,
  pub permissions: Vec<String>,
  pub exp: i64,                 // Expiration (Unix timestamp)
  pub iat: i64,                 // Issued at
  pub jti: String,              // JWT ID (unique)
  pub iss: String,              // Issuer
  pub aud: String,              // Audience
}
```

**Refresh Token Claims:**

```rust
pub struct RefreshTokenClaims {
  pub sub: String,              // User ID
  pub exp: i64,
  pub iat: i64,
  pub jti: String,
  pub token_family_id: String,  // For rotation detection
}
```

#### Token Validation

```rust
// Validate token signature and claims
let claims = jwt_service
  .validate_access_token(&token_string)
  .await?;

// Claims are automatically extracted
let user_id = Uuid::parse_str(&claims.sub)?;
let email = claims.email;
let roles = claims.roles;
```

#### Token Revocation

```rust
// Revoke all user tokens (on logout)
jwt_service.revoke_user_tokens(user_id).await?;

// Revoke specific refresh token family
jwt_service.revoke_token_family(token_family_id).await?;

// Check if token is revoked
if jwt_service.is_token_revoked(&token).await? {
  return Err(JwtError::TokenRevoked);
}
```

### 2. JWT Middleware (`src/middleware/jwt_auth.rs`)

Axum middleware that validates JWT and extracts UserContext.

#### Middleware Configuration

```rust
use crate::middleware::JwtAuthMiddleware;

let router = Router::new()
  .route("/graphql", post(graphql_handler))
  .layer(JwtAuthMiddleware::new(jwt_service))
  // Other middleware...
```

#### UserContext Extraction

```rust
pub struct UserContext {
  pub user_id: Uuid,
  pub email: Option<String>,
  pub roles: Vec<String>,
  pub permissions: Vec<String>,
  pub department_id: Option<Uuid>,
  pub organization_id: Option<Uuid>,
}

// In middleware:
let user_context = UserContext {
  user_id: Uuid::parse_str(&claims.sub)?,
  email: Some(claims.email),
  roles: claims.roles,
  permissions: claims.permissions,
  department_id: claims.department_id,
  organization_id: claims.organization_id,
};

// Store in request extensions
request.extensions_mut().insert(user_context);
```

### 3. GraphQL Integration

#### Using UserContext in Resolvers

```rust
use async_graphql::*;
use crate::auth::UserContext;

#[Object]
impl QueryRoot {
  async fn me(&self, ctx: &Context<'_>) -> Result<User> {
    // Extract user context
    let user_context = ctx.data::<UserContext>()?;

    // Access user information
    let user_id = user_context.user_id;
    let roles = &user_context.roles;

    // Fetch user from database
    let user = User::find_by_id(user_id).one(db).await?;

    Ok(user)
  }

  async fn employees(&self, ctx: &Context<'_>) -> Result<Vec<Employee>> {
    let user_context = ctx.data::<UserContext>()?;

    // Check permission
    if !user_context.permissions.contains(&"employees:read".to_string()) {
      return Err(Error::new("Forbidden: Missing employees:read permission"));
    }

    // Fetch employees
    Ok(Employee::find().all(db).await?)
  }
}
```

#### Authorization Guards

```rust
use crate::middleware::{RequireRole, RequirePermission};

#[Object]
impl MutationRoot {
  #[graphql(guard = "RequireRole::new(\"Admin\")")]
  async fn delete_user(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
    // Only Admin role can execute
    Ok(true)
  }

  #[graphql(guard = "RequirePermission::new(\"users:delete\")")]
  async fn delete_employee(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
    // Only users with users:delete permission
    Ok(true)
  }
}
```

### 4. Login Mutation

```rust
use async_graphql::*;

#[derive(InputObject)]
pub struct LoginInput {
  pub email: String,
  pub password: String,
  pub device_info: Option<String>,
  pub ip_address: Option<String>,
}

#[derive(Union)]
pub enum AuthResult {
  AuthSuccess(AuthSuccess),
  AuthError(AuthError),
}

#[derive(SimpleObject)]
pub struct AuthSuccess {
  pub user: User,
  pub tokens: TokenPair,
}

#[derive(SimpleObject)]
pub struct AuthError {
  pub code: String,
  pub message: String,
}

#[derive(SimpleObject)]
pub struct TokenPair {
  pub access_token: String,
  pub refresh_token: String,
  pub refresh_token_plaintext: String,  // Only for initial login
  pub token_type: String,               // "Bearer"
  pub expires_in: i32,                  // Seconds
}

#[Object]
impl MutationRoot {
  async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResult> {
    // Find user by email
    let user = User::find()
      .filter(user::Column::Email.eq(&input.email))
      .one(db)
      .await?;

    let Some(user) = user else {
      return Ok(AuthResult::AuthError(AuthError {
        code: "INVALID_CREDENTIALS".to_string(),
        message: "Invalid email or password".to_string(),
      }));
    };

    // Verify password
    if !verify_password(&input.password, &user.password_hash) {
      return Ok(AuthResult::AuthError(AuthError {
        code: "INVALID_CREDENTIALS".to_string(),
        message: "Invalid email or password".to_string(),
      }));
    }

    // Check if account is active
    if !user.is_active {
      return Ok(AuthResult::AuthError(AuthError {
        code: "ACCOUNT_DISABLED".to_string(),
        message: "Account is disabled".to_string(),
      }));
    }

    // Generate tokens
    let access_token = jwt_service
      .generate_access_token(user.id, user.email.clone(), user.display_name.clone(), user.department_id)
      .await?;

    let (refresh_token, refresh_token_plaintext) = jwt_service
      .generate_refresh_token(user.id, &input.device_info.unwrap_or_default())
      .await?;

    // Store refresh token in database
    let refresh_token_record = refresh_token::ActiveModel {
      id: Set(Uuid::new_v4()),
      user_id: Set(user.id),
      token_hash: Set(hash_token(&refresh_token)),
      family_id: Set(Uuid::new_v4()),
      issued_at: Set(Utc::now().naive_utc()),
      expires_at: Set((Utc::now() + Duration::days(7)).naive_utc()),
      is_revoked: Set(false),
      ..Default::default()
    };
    refresh_token_record.insert(db).await?;

    // Calculate token expiration
    let expires_in = jwt_service.config().access_ttl_secs() as i32;

    Ok(AuthResult::AuthSuccess(AuthSuccess {
      user: user.into(),
      tokens: TokenPair {
        access_token,
        refresh_token,
        refresh_token_plaintext,
        token_type: "Bearer".to_string(),
        expires_in,
      },
    }))
  }
}
```

### 5. Token Refresh Mutation

```rust
#[derive(InputObject)]
pub struct RefreshTokenInput {
  pub refresh_token: String,
  pub refresh_token_plaintext: String,
  pub device_info: Option<String>,
  pub ip_address: Option<String>,
}

#[Object]
impl MutationRoot {
  async fn refresh_token(
    &self,
    ctx: &Context<'_>,
    input: RefreshTokenInput,
  ) -> Result<AuthResult> {
    // Validate refresh token
    let claims = jwt_service.validate_refresh_token(&input.refresh_token).await?;

    let user_id = Uuid::parse_str(&claims.sub)?;

    // Check if token is revoked
    let token_record = refresh_token::Entity::find()
      .filter(refresh_token::Column::TokenHash.eq(hash_token(&input.refresh_token)))
      .one(db)
      .await?
      .ok_or(JwtError::RefreshTokenNotFound)?;

    if token_record.is_revoked {
      return Err(Error::new("Token has been revoked"));
    }

    // Detect replay attack (token reuse)
    if token_record.used_at.is_some() {
      // Token was already used! Revoke entire family
      jwt_service.revoke_token_family(token_record.family_id).await?;
      return Err(Error::new("Token replay detected - all tokens revoked"));
    }

    // Mark token as used
    let mut token_record = token_record.into_active_model();
    token_record.used_at = Set(Some(Utc::now().naive_utc()));
    token_record.update(db).await?;

    // Fetch user and generate new tokens
    let user = User::find_by_id(user_id).one(db).await?
      .ok_or_else(|| Error::new("User not found"))?;

    let access_token = jwt_service
      .generate_access_token(
        user.id,
        user.email.clone(),
        user.display_name.clone(),
        user.department_id,
      )
      .await?;

    let (refresh_token, refresh_token_plaintext) = jwt_service
      .generate_refresh_token(user.id, &input.device_info.unwrap_or_default())
      .await?;

    let expires_in = jwt_service.config().access_ttl_secs() as i32;

    Ok(AuthResult::AuthSuccess(AuthSuccess {
      user: user.into(),
      tokens: TokenPair {
        access_token,
        refresh_token,
        refresh_token_plaintext,
        token_type: "Bearer".to_string(),
        expires_in,
      },
    }))
  }
}
```

### 6. Logout Mutation

```rust
#[derive(SimpleObject)]
pub struct LogoutResult {
  pub success: bool,
  pub message: String,
}

#[Object]
impl MutationRoot {
  async fn logout(&self, ctx: &Context<'_>) -> Result<LogoutResult> {
    let user_context = ctx.data::<UserContext>()?;

    // Revoke all tokens for this user
    jwt_service.revoke_user_tokens(user_context.user_id).await?;

    // Cookie handling happens on frontend

    Ok(LogoutResult {
      success: true,
      message: "Logged out successfully".to_string(),
    })
  }
}
```

## Data Flow Examples

### Complete Login Flow

```
1. User enters credentials in LoginForm
   ↓
2. Frontend calls jwtAuth.login(email, password)
   ↓
3. GraphQL mutation sent to backend with credentials
   ↓
4. Backend JWT middleware (optional auth) processes request
   ↓
5. Backend login resolver executes:
   a. Find user by email
   b. Verify password hash
   c. Generate access token (RS256 signed)
   d. Generate refresh token
   e. Store refresh token in DB
   f. Return tokens + user info
   ↓
6. Frontend receives response
   ↓
7. jwtAuth.setAuthData():
   a. Store access token in memory
   b. Store refresh token in HTTP-only cookie (automatic)
   c. Store user info in state
   d. Schedule auto-refresh at token_expiry - 60 seconds
   ↓
8. URQL authExchange initialized with token
   ↓
9. Redirect to dashboard
   ↓
User logged in! ✅
```

### Authenticated Request Flow

```
1. Component makes GraphQL request
   ↓
2. URQL authExchange.addAuthToOperation():
   a. Get accessToken from jwtAuth
   b. Add Authorization header: "Bearer <token>"
   ↓
3. Request sent to GraphQL endpoint with header
   ↓
4. Backend JWT middleware processes:
   a. Extract Bearer token from header
   b. Validate signature using public key
   c. Check expiration time
   d. Check revocation (tokens_valid_after)
   e. Extract claims
   f. Create UserContext
   g. Store in request.extensions()
   ↓
5. GraphQL handler executes:
   a. Extract UserContext from extensions
   b. Add to GraphQL context
   ↓
6. Resolver executes:
   a. Get UserContext from ctx.data()
   b. Check permissions
   c. Execute business logic
   ↓
7. Return result to frontend
   ↓
8. User sees data ✅
```

### Token Refresh Flow (Automatic)

```
1. jwtAuth schedules refresh at token_expiry - 60 seconds
   ↓
2. Timeout fires, calls jwtAuth.refreshAccessToken()
   ↓
3. GraphQL refreshToken mutation sent:
   a. Include refresh token JWT
   b. Include refresh token plaintext
   c. Include device info
   ↓
4. Backend validates refresh token:
   a. Verify signature
   b. Check expiration
   c. Lookup in database
   d. Detect replay (already used)
   e. Mark as used (one-time use)
   ↓
5. If valid:
   a. Generate new access token
   b. Generate new refresh token (rotation)
   c. Store new refresh token in DB
   d. Return new tokens
   ↓
6. Frontend updates:
   a. accessToken in memory
   b. refreshToken in HTTP-only cookie
   c. Reschedule next refresh
   ↓
7. User stays logged in ✅
```

### Token Refresh Flow (On Demand/Error)

```
1. URQL detects UNAUTHENTICATED error
   ↓
2. authExchange.didAuthError() returns true
   ↓
3. authExchange.refreshAuth() called
   ↓
4. Same as token refresh above
   ↓
5. After refresh succeeds:
   a. Original request automatically retried
   b. User sees results (seamless)
   ↓
If refresh fails:
   a. jwtAuth.logout() called
   b. User redirected to login
```

## GraphQL Operations

### Login

```graphql
mutation Login($email: String!, $password: String!) {
	login(input: { email: $email, password: $password }) {
		... on AuthSuccess {
			user {
				id
				email
				displayName
				roles
				permissions
			}
			tokens {
				accessToken
				refreshToken
				refreshTokenPlaintext
				tokenType
				expiresIn
			}
		}
		... on AuthError {
			code
			message
		}
	}
}
```

### Refresh Token

```graphql
mutation RefreshToken($refreshToken: String!, $refreshTokenPlaintext: String!) {
	refreshToken(
		input: { refreshToken: $refreshToken, refreshTokenPlaintext: $refreshTokenPlaintext }
	) {
		... on AuthSuccess {
			user {
				id
				email
				displayName
				roles
				permissions
			}
			tokens {
				accessToken
				refreshToken
				refreshTokenPlaintext
				tokenType
				expiresIn
			}
		}
		... on AuthError {
			code
			message
		}
	}
}
```

### Logout

```graphql
mutation Logout {
	logout {
		success
		message
	}
}
```

### Get Current User

```graphql
query Me {
	me {
		id
		email
		displayName
		roles
		permissions
		isActive
	}
}
```

## Testing JWT Authentication

### Unit Tests (Frontend)

```typescript
// src/lib/stores/jwt-auth.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { jwtAuth } from '$lib/stores/jwt-auth.svelte';

describe('JwtAuthStore', () => {
	beforeEach(() => {
		jwtAuth.clearAuthData();
	});

	it('should initialize with null tokens', () => {
		expect(jwtAuth.accessToken).toBeNull();
		expect(jwtAuth.isAuthenticated).toBe(false);
	});

	it('should login successfully', async () => {
		const result = await jwtAuth.login('test@example.com', 'password');

		expect(result.success).toBe(true);
		expect(jwtAuth.accessToken).toBeDefined();
		expect(jwtAuth.user).toBeDefined();
		expect(jwtAuth.isAuthenticated).toBe(true);
	});

	it('should handle login errors', async () => {
		const result = await jwtAuth.login('invalid@example.com', 'wrong');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(jwtAuth.isAuthenticated).toBe(false);
	});

	it('should check permissions correctly', () => {
		jwtAuth.user = {
			id: '123',
			email: 'test@example.com',
			displayName: 'Test User',
			roles: ['Manager'],
			permissions: ['employees:read', 'employees:edit'],
			isActive: true,
			forcePasswordChange: false
		};

		expect(jwtAuth.hasPermission('employees:read')).toBe(true);
		expect(jwtAuth.hasPermission('employees:delete')).toBe(false);
		expect(jwtAuth.hasRole('Manager')).toBe(true);
		expect(jwtAuth.hasRole('Admin')).toBe(false);
	});
});
```

### Integration Tests (Backend)

```rust
// tests/integration/test_auth_flow.rs
#[tokio::test]
async fn test_login_flow() {
    let db = setup_test_db().await;
    let jwt_service = setup_jwt_service(&db).await;
    let client = setup_test_client().await;

    // Create test user
    let user = create_test_user(&db, "test@example.com", "password").await;

    // Login request
    let response = client
        .post("/graphql")
        .json(&json!({
            "query": "mutation { login(input: { email: \"test@example.com\", password: \"password\" }) { ... } }"
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), 200);

    let body: serde_json::Value = response.json().await.unwrap();
    let tokens = &body["data"]["login"]["tokens"];

    assert!(tokens["accessToken"].is_string());
    assert!(tokens["refreshToken"].is_string());
}

#[tokio::test]
async fn test_token_refresh() {
    let db = setup_test_db().await;
    let jwt_service = setup_jwt_service(&db).await;

    let user = create_test_user(&db, "test@example.com", "password").await;
    let (refresh_token, plaintext) = jwt_service.generate_refresh_token(user.id, "device").await.unwrap();

    // Refresh request
    let new_access_token = jwt_service
        .refresh_access_token(&refresh_token, &plaintext, user.id)
        .await
        .unwrap();

    assert!(new_access_token.contains('.'));
}
```

### E2E Tests (Frontend)

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('JWT Authentication', () => {
	test('login flow', async ({ page }) => {
		await page.goto('/auth/login');

		// Fill login form
		await page.fill('input[type="email"]', 'test@example.com');
		await page.fill('input[type="password"]', 'password');

		// Submit form
		await page.click('button[type="submit"]');

		// Wait for redirect to dashboard
		await expect(page).toHaveURL('/dashboard');

		// Verify user is logged in
		await expect(page.locator('text=Welcome')).toBeVisible();
	});

	test('logout flow', async ({ page, context }) => {
		await loginUser(page);

		// Click logout
		await page.click('[data-testid="user-menu"]');
		await page.click('[data-testid="logout-btn"]');

		// Verify redirected to login
		await expect(page).toHaveURL('/auth/login');
	});

	test('session restoration', async ({ page, context }) => {
		await loginUser(page);

		// Reload page
		await page.reload();

		// Should be logged in still (refresh token in cookie)
		await expect(page.locator('text=Welcome')).toBeVisible();
	});
});
```

## Configuration

### Frontend Configuration

```typescript
// src/lib/graphql/jwt-client.ts
const graphqlEndpoint = 'http://localhost:8080/graphql';

// Or use environment variable
const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_URL || '/graphql';
```

### Backend Configuration

```rust
// .env
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_ACCESS_TOKEN_TTL_SECS=900        // 15 minutes
JWT_REFRESH_TOKEN_TTL_SECS=604800    // 7 days
JWT_ISSUER="svelteHR"
JWT_AUDIENCE="svelteHR"
```

## Error Handling

### Common Error Codes

| Code                  | Meaning              | Action                         |
| --------------------- | -------------------- | ------------------------------ |
| `INVALID_CREDENTIALS` | Email/password wrong | Retry with correct credentials |
| `ACCOUNT_DISABLED`    | Account is inactive  | Contact admin                  |
| `TOKEN_EXPIRED`       | Access token expired | Auto-refresh triggers          |
| `INVALID_TOKEN`       | Token corrupted      | Logout and re-login            |
| `UNAUTHENTICATED`     | No token provided    | Logout and re-login            |

### GraphQL Error Handling

```typescript
const result = await graphqlClient.query(QUERY, variables).toPromise();

if (result.error) {
	const graphQLError = result.error.graphQLErrors[0];

	switch (graphQLError.extensions?.code) {
		case 'UNAUTHENTICATED':
			// Token invalid, trigger refresh
			await jwtAuth.refreshAccessToken();
			break;
		case 'FORBIDDEN':
			// User doesn't have permission
			console.error('Access denied');
			break;
		default:
			// Handle other errors
			console.error(graphQLError.message);
	}
}
```

## Troubleshooting

### Token Not Being Sent

Check if auth exchange is properly configured:

```typescript
// Verify authExchange is in exchanges array
const client = new Client({
	exchanges: [
		cacheExchange,
		jwtAuthExchange, // Must be before fetchExchange
		fetchExchange
	]
});
```

### Infinite Redirect Loop

Check refresh logic:

1. Verify refresh endpoint returns new token
2. Check refresh token not expired
3. Verify error handling doesn't call refresh again

### Token Expiring Too Quickly

Check TTL configuration:

```rust
// In JWT config
JWT_ACCESS_TOKEN_TTL_SECS=900  // seconds (15 min)
```

Verify auto-refresh timing:

```typescript
// jwtAuth schedules refresh at expiry - 60 seconds
// So for 900 second token, refresh at 840 seconds
```

## Security Considerations

See [Security Guide](03-security-guide.md) for detailed security implementation.

## Related Documentation

- **User Guide:** [01-user-guide.md](01-user-guide.md)
- **Security Guide:** [03-security-guide.md](03-security-guide.md)
- **Migration Guide:** [04-migration-guide.md](04-migration-guide.md)
- **Architecture:** `docs/architecture/jwt-frontend-architecture.md`
- **Key Management:** `docs/security/jwt-secrets-management.md`
