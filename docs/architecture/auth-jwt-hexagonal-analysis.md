# Auth/JWT Module - Hexagonal Architecture Analysis

**Status**: ⚠️ In Progress - 45% Hexagonal Compliance
**Date**: 2026-02-11
**Analyst**: Architecture Review Agent
**Module**: `graphql-rust-server/src/auth/`

---

## Executive Summary

The Authentication/JWT module has **partial hexagonal architecture compliance** with clear separation of concerns in some areas but significant framework coupling in others. The module demonstrates good practices in domain modeling (Claims, UserContext) but lacks the full ports/adapters abstraction that would make it truly framework-independent.

**Key Strengths:**

- Well-defined domain entities (AccessTokenClaims, RefreshTokenClaims, UserContext)
- Comprehensive error handling with domain-specific error types
- Strong business rules (token rotation, replay detection, revocation)
- Good separation between JWT operations and HTTP middleware

**Key Weaknesses:**

- JwtService is tightly coupled to infrastructure (SeaORM, jsonwebtoken)
- No domain service layer - business logic mixed with database queries
- Authorization logic coupled to async-graphql framework
- Missing repository abstractions for database operations
- Token storage implementation details leak into service layer

---

## Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     HTTP Layer (Axum)                           │
│  - jwt_auth_middleware                                          │
│  - optional_jwt_auth_middleware                                 │
│  - admin_jwt_auth_middleware                                    │
└───────────────────┬─────────────────────────────────────────────┘
                    │ extracts Bearer token, calls JwtService
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│             JWT Service (Infrastructure + Domain)               │
│  JwtService {                                                   │
│    - generate_access_token()      [DB + Domain]                 │
│    - validate_access_token()      [JWT lib + DB]                │
│    - generate_refresh_token()     [DB + Crypto]                 │
│    - refresh_access_token()       [DB + JWT + Domain]           │
│    - revoke_all_user_tokens()     [DB]                          │
│    - check_token_revocation()     [DB]                          │
│    - load_user_roles_permissions() [DB]                         │
│  }                                                              │
│  Dependencies: DatabaseConnection, JwtConfig, JwtKeys           │
└───────────────────┬─────────────────────────────────────────────┘
                    │ uses
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Domain Entities (Pure)                          │
│  - AccessTokenClaims   [domain value object]                    │
│  - RefreshTokenClaims  [domain value object]                    │
│  - UserContext         [domain entity]                          │
│  - JwtConfig           [configuration value object]             │
│  - JwtError            [domain error type]                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Authorization Utils (GraphQL Coupled)              │
│  - require_admin()                                              │
│  - require_permission()                                         │
│  - can_manage_user()           [DB queries]                     │
│  - can_access_department()     [DB queries]                     │
│  Dependencies: async-graphql::Error, SeaORM                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Database Models (Infrastructure)                   │
│  - refresh_token::Model    [SeaORM entity]                      │
│  - user::Model             [SeaORM entity]                      │
│  - role::Model             [SeaORM entity]                      │
│  - permission::Model       [SeaORM entity]                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Domain Analysis

### ✅ Domain Concepts (Well-Defined)

The auth module has clear domain concepts that **should remain in domain layer**:

#### 1. **Token Claims (Domain Value Objects)**

- `AccessTokenClaims` - User identity, roles, permissions, department
- `RefreshTokenClaims` - Minimal info for token rotation
- **Domain Invariants:**
  - Token expiration rules (is_expired)
  - Permission checking (has_permission, has_role)
  - UUID parsing for user_id, department_id

**Status**: ✅ Already pure domain code (no framework dependencies)

#### 2. **User Context (Domain Entity)**

- `UserContext` - Authenticated user with RBAC context
- **Domain Invariants:**
  - Role hierarchy (Admin > HR Manager > Manager)
  - Permission wildcard support ("\*" grants all)
  - System user concept (Uuid::nil())

**Status**: ✅ Already pure domain code

#### 3. **JWT Configuration (Domain Value Object)**

- `JwtConfig` - TTL durations, issuer, audience
- `JwtKeys` - RSA key pair abstraction
- **Domain Rules:**
  - Access token TTL (15 min default)
  - Refresh token TTL (7 days default)
  - RS256 algorithm requirement

**Status**: ⚠️ Partially coupled (depends on jsonwebtoken crate)

#### 4. **Authentication Errors (Domain Errors)**

- `JwtError` - Comprehensive error taxonomy
- **Domain Error Cases:**
  - TokenExpired, InvalidSignature
  - TokenRevoked, FamilyRevoked (replay detection)
  - RefreshTokenReused (security event)

**Status**: ✅ Pure domain errors (thiserror just for ergonomics)

---

### ⚠️ Business Rules (Should Be Domain Services)

The following business rules are currently **embedded in JwtService** but should be extracted to a **domain service layer**:

#### Token Rotation Strategy

```rust
// Current location: JwtService::refresh_access_token()
// Should be: AuthenticationService::rotate_refresh_token()

- Single-use refresh tokens
- Token family tracking
- Replay attack detection → revoke entire family
- Last-used timestamp marking
```

#### Token Revocation Policy

```rust
// Current location: JwtService::revoke_all_user_tokens()
// Should be: AuthenticationService::revoke_user_session()

- Update user.tokens_valid_after timestamp
- Mark all refresh tokens as revoked
- Invalidate tokens issued before timestamp
```

#### Permission Loading

```rust
// Current location: JwtService::load_user_roles_permissions()
// Should be: AuthorizationService::get_user_permissions()

- Load role assignments
- Load role permissions
- Admin gets wildcard permission "*"
- Deduplicate permissions
```

---

## Framework Coupling Analysis

### 🔴 High Coupling - Requires Refactoring

#### 1. **JwtService (70% Infrastructure, 30% Domain)**

**Direct Dependencies:**

```rust
use sea_orm::{DatabaseConnection, EntityTrait, ActiveModelTrait, ...};
use jsonwebtoken::{encode, decode, Algorithm, Header, Validation};
use sha2::{Digest, Sha256};
use rand::RngCore;
```

**Problem Areas:**

##### a) Database Operations Mixed with Business Logic

```rust
pub async fn generate_access_token(&self, ...) -> Result<String, JwtError> {
    // DOMAIN: Load roles/permissions
    let (roles, permissions) = self.load_user_roles_permissions(user_id).await?;

    // DOMAIN: Create claims
    let claims = AccessTokenClaims { ... };

    // INFRASTRUCTURE: Encode with jsonwebtoken
    let token = encode(&header, &claims, &self.keys.encoding_key)?;
}
```

**Should Be:**

```rust
// Domain Layer
impl AuthenticationService {
    pub fn create_access_token_claims(
        user: &User,
        roles: Vec<Role>,
        permissions: Vec<Permission>,
    ) -> AccessTokenClaims { ... }
}

// Adapter Layer
impl JwtTokenEncoder for JwtAdapterImpl {
    fn encode_token(&self, claims: &AccessTokenClaims) -> Result<String, JwtError> {
        encode(&header, &claims, &self.keys.encoding_key)
    }
}
```

##### b) Token Hash Storage Embedded in Service

```rust
pub async fn generate_refresh_token(&self, ...) -> Result<(String, String), JwtError> {
    let random_bytes = [0u8; 32];
    rng.fill_bytes(&mut random_bytes);
    let plaintext_token = hex::encode(&random_bytes);

    // Hash token for storage
    let token_hash = self.hash_token(&plaintext_token);

    // Store in database
    let refresh_token = refresh_token::ActiveModel { ... };
    refresh_token.insert(&self.db).await?;
}
```

**Should Be:**

```rust
// Domain Service
impl TokenRotationService {
    pub fn generate_token_pair(&self, user_id: Uuid, family_id: Uuid) -> TokenPair {
        // Pure business logic - no DB, no HTTP
    }
}

// Repository Port
trait RefreshTokenRepository {
    async fn store(&self, token: RefreshToken) -> Result<(), RepositoryError>;
    async fn find_by_hash(&self, hash: &str) -> Result<Option<RefreshToken>, RepositoryError>;
}

// SeaORM Adapter
impl RefreshTokenRepository for SeaOrmRefreshTokenRepository { ... }
```

#### 2. **Authorization Utilities (90% GraphQL-Coupled)**

**Dependencies:**

```rust
use async_graphql::{Error, ErrorExtensions};
use sea_orm::{DatabaseConnection, EntityTrait};
```

**Problem:**
All authorization functions return `async_graphql::Error` and perform direct DB queries.

```rust
pub async fn can_manage_user(
    db: &DatabaseConnection,  // <-- SeaORM dependency
    user_context: &UserContext,
    target_user_id: Uuid,
) -> Result<bool, Error> {     // <-- async_graphql::Error
    let target_user = user::Entity::find_by_id(target_user_id)  // <-- Direct DB query
        .one(db)
        .await?;
    // ...
}
```

**Should Be:**

```rust
// Domain Service
impl AuthorizationService {
    pub fn can_manage_user(
        &self,
        current_user: &UserContext,
        target_user: &User,
    ) -> AuthorizationDecision {
        if current_user.is_admin() { return Allow; }
        if target_user.manager_id == Some(current_user.user_id) { return Allow; }
        Deny("Not target user's manager")
    }
}

// Repository Port (for loading target user)
trait UserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, RepositoryError>;
}
```

#### 3. **Login Handler (95% Infrastructure)**

**Location:** `src/auth/handlers.rs`

**Problem:** Massive function with database queries, password hashing, JWT encoding all mixed together.

```rust
pub async fn login_handler(
    Extension(db): Extension<DatabaseConnection>,  // <-- Axum-specific
    Json(login_request): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, impl IntoResponse> {
    // 1. Query user from database
    let user = crate::models::user::Entity::find()...  // <-- Direct DB query

    // 2. Verify password
    let password_valid = verify(&login_request.password, &user.password_hash)?;

    // 3. Load roles/permissions
    let (roles, permissions) = crate::auth::get_user_roles_and_permissions(&db, user.id).await?;

    // 4. Generate JWT
    let token = generate_jwt_token(user.id, &user.email, &roles, &permissions)?;
}
```

**Should Be:**

```rust
// Domain Service (UseCase)
impl AuthenticationService {
    pub async fn authenticate_user(
        &self,
        credentials: Credentials,
    ) -> Result<AuthenticatedUser, AuthenticationError> {
        // 1. Load user via repository
        let user = self.user_repo.find_by_email(&credentials.email).await?;

        // 2. Verify password (domain logic)
        if !user.verify_password(&credentials.password)? {
            return Err(AuthenticationError::InvalidCredentials);
        }

        // 3. Load roles (via repository)
        let roles = self.role_repo.find_for_user(user.id).await?;

        // 4. Return domain result
        Ok(AuthenticatedUser { user, roles, permissions })
    }
}

// Axum Handler (Thin Adapter)
pub async fn login_handler(
    State(auth_service): State<AuthenticationService>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    let result = auth_service.authenticate_user(req.into()).await?;
    Ok(Json(result.into()))
}
```

---

### 🟡 Medium Coupling - Could Be Improved

#### 1. **Permission Loading (permissions.rs)**

**Current:** Direct SeaORM queries in a utility function.

```rust
pub async fn get_user_roles_and_permissions(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<(Vec<String>, Vec<String>), sea_orm::DbErr> {
    let role_assignments = crate::models::user_role_assignment::Entity::find()...
}
```

**Better:** Repository pattern with domain service.

#### 2. **Middleware (jwt_auth.rs)**

**Current:** Middleware directly calls JwtService and manipulates request extensions.

```rust
pub async fn jwt_auth_middleware(
    State(app_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Response {
    let token = extract_bearer_token(request.headers())?;
    let claims = app_state.jwt_service.validate_access_token(&token).await?;
    request.extensions_mut().insert(user_context);
}
```

**Better:** Middleware uses a thin adapter that calls domain services.

---

## Testability Assessment

### ✅ Current Testing Strengths

1. **Unit tests for pure domain logic:**
   - `jwt_claims.rs` - 31 tests, 100% pure (no I/O)
   - `jwt_config.rs` - 15 tests, mostly pure
   - `context.rs` - 4 tests, 100% pure
   - `jwt_auth middleware` - 6 tests for token extraction

2. **Error handling tests:**
   - JwtError display messages
   - Invalid UUID parsing
   - Expired token detection

### 🔴 Testing Challenges

1. **Cannot test business logic without database:**

   ```rust
   // This requires running PostgreSQL + seed data
   #[tokio::test]
   async fn test_token_rotation() {
       let db = setup_test_db().await;  // <-- Needs real DB
       let jwt_service = JwtService::new(config, keys, db);
       let result = jwt_service.refresh_access_token(...).await;
   }
   ```

2. **Cannot test authorization without GraphQL context:**

   ```rust
   // This function signature prevents pure unit testing
   pub async fn can_manage_user(
       db: &DatabaseConnection,  // <-- Can't mock without trait
       user_context: &UserContext,
       target_user_id: Uuid,
   ) -> Result<bool, Error>
   ```

3. **No integration test boundary:**
   - No clear separation between "test domain rules" and "test database queries"
   - Token generation tests mix cryptography + database + JWT encoding

---

## Hexagonal Architecture Migration Plan

### Phase 1: Extract Domain Layer (1-2 days)

**Goal:** Move all business logic to pure domain layer with zero framework dependencies.

#### Step 1.1: Create Domain Services

```rust
// src/auth/domain/authentication_service.rs
pub struct AuthenticationService;

impl AuthenticationService {
    /// Pure business logic - verify credentials
    pub fn verify_credentials(
        stored_hash: &str,
        provided_password: &str,
    ) -> Result<(), AuthenticationError> {
        bcrypt::verify(provided_password, stored_hash)
            .map_err(|_| AuthenticationError::InvalidCredentials)?;
        Ok(())
    }

    /// Domain rule: Create access token claims
    pub fn create_access_token_claims(
        user_id: Uuid,
        email: String,
        display_name: String,
        roles: Vec<String>,
        permissions: Vec<String>,
        department_id: Option<Uuid>,
        now: DateTime<Utc>,
        ttl: Duration,
    ) -> AccessTokenClaims {
        AccessTokenClaims {
            sub: user_id.to_string(),
            email,
            exp: (now + ttl).timestamp(),
            iat: now.timestamp(),
            jti: Uuid::new_v4().to_string(),
            roles,
            permissions,
            department_id: department_id.map(|id| id.to_string()),
            display_name,
            // issuer/audience from config
        }
    }

    /// Domain rule: Should revoke token family on reuse detection?
    pub fn should_revoke_family_on_reuse(&self, token: &RefreshToken) -> bool {
        token.last_used_at.is_some()  // Token was already used
    }
}
```

**Effort:** 4-6 hours
**Tests:** 20-30 new pure unit tests
**Files Created:**

- `src/auth/domain/mod.rs`
- `src/auth/domain/authentication_service.rs`
- `src/auth/domain/authorization_service.rs`
- `src/auth/domain/token_rotation_service.rs`

#### Step 1.2: Define Repository Ports

```rust
// src/auth/domain/repositories.rs

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, RepositoryError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, RepositoryError>;
    async fn update_tokens_valid_after(&self, id: Uuid, timestamp: DateTime<Utc>) -> Result<(), RepositoryError>;
}

#[async_trait]
pub trait RefreshTokenRepository: Send + Sync {
    async fn store(&self, token: RefreshToken) -> Result<(), RepositoryError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<RefreshToken>, RepositoryError>;
    async fn mark_as_used(&self, id: Uuid, timestamp: DateTime<Utc>) -> Result<(), RepositoryError>;
    async fn revoke_family(&self, family_id: Uuid) -> Result<u64, RepositoryError>;
    async fn delete_expired(&self, before: DateTime<Utc>) -> Result<u64, RepositoryError>;
}

#[async_trait]
pub trait RoleRepository: Send + Sync {
    async fn find_for_user(&self, user_id: Uuid) -> Result<Vec<Role>, RepositoryError>;
    async fn find_permissions_for_roles(&self, role_ids: Vec<Uuid>) -> Result<Vec<Permission>, RepositoryError>;
}

#[async_trait]
pub trait JwtEncoder: Send + Sync {
    fn encode_access_token(&self, claims: &AccessTokenClaims) -> Result<String, JwtError>;
    fn encode_refresh_token(&self, claims: &RefreshTokenClaims) -> Result<String, JwtError>;
    fn decode_access_token(&self, token: &str) -> Result<AccessTokenClaims, JwtError>;
    fn decode_refresh_token(&self, token: &str) -> Result<RefreshTokenClaims, JwtError>;
}
```

**Effort:** 2-3 hours
**Tests:** Ports don't need tests (they're interfaces)
**Files Created:**

- `src/auth/domain/repositories/mod.rs`
- `src/auth/domain/repositories/user_repository.rs`
- `src/auth/domain/repositories/refresh_token_repository.rs`
- `src/auth/domain/repositories/role_repository.rs`

---

### Phase 2: Implement Adapters (2-3 days)

**Goal:** Create concrete implementations of repository ports using SeaORM.

#### Step 2.1: SeaORM Repository Adapters

```rust
// src/auth/adapters/repositories/seaorm_user_repository.rs

pub struct SeaOrmUserRepository {
    db: DatabaseConnection,
}

#[async_trait]
impl UserRepository for SeaOrmUserRepository {
    async fn find_by_email(&self, email: &str) -> Result<Option<User>, RepositoryError> {
        let model = user::Entity::find()
            .filter(user::Column::Email.eq(email))
            .one(&self.db)
            .await
            .map_err(|e| RepositoryError::DatabaseError(e.to_string()))?;

        Ok(model.map(|m| User::from_db_model(m)))  // Map to domain entity
    }
}
```

**Effort:** 8-12 hours (3 repositories × 3-4 hours each)
**Tests:** Integration tests with test DB
**Files Created:**

- `src/auth/adapters/repositories/seaorm_user_repository.rs`
- `src/auth/adapters/repositories/seaorm_refresh_token_repository.rs`
- `src/auth/adapters/repositories/seaorm_role_repository.rs`

#### Step 2.2: JWT Encoder Adapter

```rust
// src/auth/adapters/jwt_encoder_impl.rs

pub struct JsonWebtokenEncoder {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    config: JwtConfig,
}

impl JwtEncoder for JsonWebtokenEncoder {
    fn encode_access_token(&self, claims: &AccessTokenClaims) -> Result<String, JwtError> {
        let mut claims = claims.clone();
        claims.iss = self.config.issuer.clone();
        claims.aud = self.config.audience.clone();

        encode(&Header::new(Algorithm::RS256), &claims, &self.encoding_key)
            .map_err(|e| JwtError::EncodingError(e))
    }
}
```

**Effort:** 3-4 hours
**Tests:** 10-15 unit tests
**Files Created:**

- `src/auth/adapters/jwt_encoder_impl.rs`

---

### Phase 3: Refactor JwtService to Use Case Layer (1-2 days)

**Goal:** Turn JwtService into a thin orchestration layer that delegates to domain services + repositories.

```rust
// src/auth/use_cases/authenticate_user.rs

pub struct AuthenticateUserUseCase {
    user_repo: Arc<dyn UserRepository>,
    role_repo: Arc<dyn RoleRepository>,
    jwt_encoder: Arc<dyn JwtEncoder>,
    auth_service: AuthenticationService,
}

impl AuthenticateUserUseCase {
    pub async fn execute(
        &self,
        email: String,
        password: String,
    ) -> Result<AuthenticationResult, AuthenticationError> {
        // 1. Load user from repository
        let user = self.user_repo
            .find_by_email(&email)
            .await?
            .ok_or(AuthenticationError::InvalidCredentials)?;

        // 2. Verify credentials (domain service)
        self.auth_service.verify_credentials(&user.password_hash, &password)?;

        // 3. Check if active (domain rule)
        if !user.is_active {
            return Err(AuthenticationError::AccountInactive);
        }

        // 4. Load roles (repository)
        let roles = self.role_repo.find_for_user(user.id).await?;
        let permissions = self.role_repo.find_permissions_for_roles(
            roles.iter().map(|r| r.id).collect()
        ).await?;

        // 5. Create token claims (domain service)
        let claims = self.auth_service.create_access_token_claims(
            user.id, user.email, user.display_name, roles, permissions, user.department_id,
            Utc::now(), Duration::minutes(15)
        );

        // 6. Encode token (adapter)
        let token = self.jwt_encoder.encode_access_token(&claims)?;

        Ok(AuthenticationResult { token, user, roles, permissions })
    }
}
```

**Effort:** 8-12 hours
**Tests:** 30-40 tests (mock repositories)
**Files Created:**

- `src/auth/use_cases/authenticate_user.rs`
- `src/auth/use_cases/refresh_tokens.rs`
- `src/auth/use_cases/revoke_tokens.rs`

---

### Phase 4: Simplify Handlers (0.5-1 day)

**Goal:** Reduce handlers to thin adapters that call use cases.

```rust
// src/auth/handlers.rs (refactored)

pub async fn login_handler(
    State(app_state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    let result = app_state
        .auth_use_cases
        .authenticate_user
        .execute(req.email, req.password)
        .await
        .map_err(|e| match e {
            AuthenticationError::InvalidCredentials => StatusCode::UNAUTHORIZED,
            AuthenticationError::AccountInactive => StatusCode::FORBIDDEN,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })?;

    Ok(Json(LoginResponse::from_domain(result)))
}
```

**Effort:** 3-4 hours
**Tests:** E2E tests only (handlers don't need unit tests when thin)
**Files Modified:**

- `src/auth/handlers.rs`

---

## Implementation Checklist

### Domain Layer

- [ ] Create `src/auth/domain/` directory
- [ ] Extract `AuthenticationService` (verify credentials, create claims)
- [ ] Extract `AuthorizationService` (permission checks)
- [ ] Extract `TokenRotationService` (replay detection, family revocation)
- [ ] Define `UserRepository` trait
- [ ] Define `RefreshTokenRepository` trait
- [ ] Define `RoleRepository` trait
- [ ] Define `JwtEncoder` trait
- [ ] Write 50+ pure unit tests for domain services

### Adapter Layer

- [ ] Create `src/auth/adapters/` directory
- [ ] Implement `SeaOrmUserRepository`
- [ ] Implement `SeaOrmRefreshTokenRepository`
- [ ] Implement `SeaOrmRoleRepository`
- [ ] Implement `JsonWebtokenEncoder`
- [ ] Write integration tests for adapters

### Use Case Layer

- [ ] Create `src/auth/use_cases/` directory
- [ ] Implement `AuthenticateUserUseCase`
- [ ] Implement `RefreshTokensUseCase`
- [ ] Implement `RevokeTokensUseCase`
- [ ] Implement `ValidateTokenUseCase`
- [ ] Write tests with mocked repositories

### Handler Layer

- [ ] Refactor `login_handler` to call use cases
- [ ] Refactor middleware to call use cases
- [ ] Remove direct database queries from handlers

---

## Compliance Score: 45/100

### Scoring Breakdown

| Aspect                     | Score  | Notes                                      |
| -------------------------- | ------ | ------------------------------------------ |
| **Domain Layer**           | 70/100 | Good domain entities, but no services      |
| **Service Layer**          | 20/100 | JwtService is infrastructure, not domain   |
| **Adapter Layer**          | 30/100 | No repository abstractions                 |
| **Testability**            | 50/100 | Domain entities testable, services are not |
| **Framework Independence** | 20/100 | Tightly coupled to SeaORM + async-graphql  |
| **Ports/Adapters**         | 10/100 | No port definitions                        |

### What Would 100/100 Look Like?

```
Domain Layer (Pure Rust)
├── entities/ (AccessTokenClaims, UserContext, RefreshToken)
├── services/ (AuthenticationService, AuthorizationService)
├── repositories/ (UserRepository trait, RefreshTokenRepository trait)
├── errors/ (AuthenticationError, AuthorizationError)
└── value_objects/ (JwtConfig, TokenFamily)

Service Layer (Use Cases)
├── authenticate_user.rs
├── refresh_tokens.rs
├── revoke_tokens.rs
└── authorize_action.rs

Adapter Layer (Infrastructure)
├── repositories/
│   ├── seaorm_user_repository.rs
│   ├── seaorm_refresh_token_repository.rs
│   └── seaorm_role_repository.rs
├── encoders/
│   └── jsonwebtoken_encoder.rs
└── http/
    ├── jwt_middleware.rs
    └── login_handler.rs
```

**Key Difference:** Each layer can be tested independently, and infrastructure can be swapped without touching business logic.

---

## Effort Estimate

### Total Effort: 6-9 Person-Days

| Phase                 | Effort    | Risk                                |
| --------------------- | --------- | ----------------------------------- |
| Phase 1: Domain Layer | 1-2 days  | Low (pure refactoring)              |
| Phase 2: Adapters     | 2-3 days  | Medium (requires integration tests) |
| Phase 3: Use Cases    | 2-3 days  | Medium (orchestration logic)        |
| Phase 4: Handlers     | 0.5-1 day | Low (thin wrappers)                 |
| **Testing**           | 1-2 days  | Medium (new test suite)             |

### Risk Factors

1. **Breaking Changes**: All GraphQL resolvers currently expect `JwtService` in app state
2. **Database Schema**: Might discover missing indexes during repository implementation
3. **Token Revocation**: Current implementation uses `users.tokens_valid_after` timestamp - needs careful migration
4. **Backward Compatibility**: Existing JWT tokens must remain valid during refactor

---

## Comparison with Employee Module

The Employee module (already refactored) achieved **95/100** hexagonal compliance:

| Aspect             | Employee Module                       | Auth Module                      |
| ------------------ | ------------------------------------- | -------------------------------- |
| Domain Entities    | ✅ Pure (Employee, Email, PersonName) | ✅ Pure (Claims, UserContext)    |
| Domain Services    | ✅ EmployeeService (business logic)   | ❌ Missing (logic in JwtService) |
| Repository Ports   | ✅ EmployeeRepository trait           | ❌ No repository traits          |
| Adapters           | ✅ GraphQLEmployeeAdapter             | ❌ Direct SeaORM queries         |
| Testability        | ✅ 156 pure tests                     | ⚠️ 50% require database          |
| Framework Coupling | ✅ Isolated to adapter                | ❌ Mixed throughout              |

**Lesson Learned:** The Employee module refactor should serve as a **blueprint** for Auth refactoring.

---

## Recommendations

### Immediate Actions (High Priority)

1. **Start with Phase 1 (Domain Layer)** - Zero risk, high value
   - Extract `AuthenticationService` with pure business logic
   - Add 20-30 unit tests for domain rules
   - **No breaking changes** to existing code

2. **Define Repository Interfaces** - Clarifies architecture
   - Document what data access patterns auth module needs
   - Makes future adapter implementation straightforward

3. **Add Integration Tests** - Safety net for refactoring
   - Test current JwtService behavior end-to-end
   - Ensures refactored code maintains same semantics

### Long-term Goals (Lower Priority)

4. **Phase 2-4 Implementation** - After domain layer is solid
5. **Performance Benchmarking** - Compare before/after refactor
6. **Documentation Updates** - Update architecture diagrams
7. **Training Materials** - How to add new auth features using hexagonal pattern

---

## Conclusion

The Auth/JWT module demonstrates **partial hexagonal architecture adoption** with strong domain modeling but weak infrastructure abstraction. The refactoring path is clear and follows the successful Employee module pattern. With 6-9 person-days of effort, the module can achieve 90%+ hexagonal compliance while maintaining backward compatibility.

**Next Steps:**

1. Present this analysis to team lead
2. Get approval for Phase 1 (domain layer extraction)
3. Create detailed technical specification for repository ports
4. Begin implementation with pure domain services

---

## Appendix: Testing Strategy

### Current Tests (50 total)

- `jwt_claims.rs`: 31 tests (pure unit)
- `jwt_config.rs`: 15 tests (mostly pure)
- `context.rs`: 4 tests (pure unit)

### After Refactor (150+ tests)

- **Domain Layer**: 60-80 pure unit tests (no I/O)
  - AuthenticationService: 20-25 tests
  - AuthorizationService: 15-20 tests
  - TokenRotationService: 15-20 tests
  - Domain entities: 10-15 tests

- **Adapter Layer**: 30-40 integration tests (with test DB)
  - SeaORM repositories: 20-25 tests
  - JWT encoder: 10-15 tests

- **Use Case Layer**: 30-40 tests (mocked repositories)
  - Authenticate user: 10-15 tests
  - Refresh tokens: 10-15 tests
  - Revoke tokens: 5-10 tests

- **Handler Layer**: 10-15 E2E tests (HTTP + DB + JWT)

**Total:** 150+ tests with clear layer separation

---

_Report generated by Architecture Review Agent_
_Based on codebase analysis as of 2026-02-11_
