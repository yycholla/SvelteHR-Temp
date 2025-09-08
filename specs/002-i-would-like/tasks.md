# Tasks: GelDB Login Page Integration (Using Built-in Auth Extension)

**Input**: Design documents from `/home/yycholla/Documents/SvelteHR/specs/002-i-would-like/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅)

**🔄 UPDATED APPROACH**: Leverage GelDB auth extension's built-in endpoints instead of creating custom auth routes

## Execution Flow (main)

```
1. ✅ Load plan.md from feature directory
   → Extract: SvelteKit + existing MountainHR-Backend integration
   → Tech stack: TypeScript 5.0, SvelteKit 2.22.0, GelDB built-in auth
2. ✅ Load design documents:
   → data-model.md: RBAC::User (existing), AuthSession, AuthEvent (new)
   → contracts/: Updated to reflect GelDB built-in auth usage
   → research.md: Frontend-backend integration via GelDB endpoints
3. Generate tasks by category:
   → Setup: Schema updates, GelDB redirect configuration
   → Tests: Integration tests for GelDB auth flow
   → Core: Frontend redirect handlers, session management
   → Integration: Backend identity sync, token validation
   → Polish: E2E tests, performance validation
4. Task rules applied:
   → Different files = mark [P] for parallel execution
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Tasks numbered sequentially (T001-T033)
6. Dependencies: Backend schema → Frontend handlers → Integration → Tests
7. Parallel execution examples included
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from `/home/yycholla/Documents/SvelteHR/`

## Phase 3.1: Backend Schema Updates (MountainHR-Backend) ✅

- [x] T001 Update RBAC::User schema with identity_id field in `/home/yycholla/Documents/MountainHR-Backend/dbschema/rbac.gel`
- [x] T002 Add AuthEventType enum to default.gel in `/home/yycholla/Documents/MountainHR-Backend/dbschema/default.gel`
- [x] T003 Create AuthSession type in `/home/yycholla/Documents/MountainHR-Backend/dbschema/default.gel`
- [x] T004 Create AuthEvent type for audit logging in `/home/yycholla/Documents/MountainHR-Backend/dbschema/default.gel`

## Phase 3.2: Environment Configuration ✅

- [x] T005 [P] Configure SvelteKit environment variables in `/home/yycholla/Documents/SvelteHR/.env.local`
- [x] T006 [P] Verify MountainHR-Backend GelDB configuration in `/home/yycholla/Documents/MountainHR-Backend/geldb-config.json`

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Integration Tests (Updated for GelDB Built-in Auth)

- [x] T007 [P] Integration test complete GelDB auth flow in `src/tests/integration/geldb-auth-flow.test.ts`
- [x] T008 [P] Integration test RBAC role-based access in `src/tests/integration/rbac-access.test.ts`
- [x] T009 [P] Integration test backend identity sync in `src/tests/integration/identity-sync.test.ts`
- [x] T010 [P] Integration test session management in `src/tests/integration/session-management.test.ts`

### Contract Tests (API Endpoints Only)

- [x] T011 [P] Contract test GET /api/auth/verify in `src/tests/contract/auth-verify.test.ts`
- [x] T012 [P] Contract test GET /api/auth/permissions in `src/tests/contract/auth-permissions.test.ts`
- [x] T013 [P] Contract test POST /api/permissions/check in `src/tests/contract/rbac-permissions-check.test.ts`
- [x] T014 [P] Contract test GET /api/users/{userId}/permissions in `src/tests/contract/rbac-user-permissions.test.ts`
- [x] T015 [P] Contract test GET /api/roles in `src/tests/contract/rbac-roles.test.ts`

## Phase 3.4: Core Implementation (ONLY after tests are failing)

### GelDB Integration Services

- [ ] T016 [P] Create GelDBRedirectService for built-in auth URLs in `src/lib/services/auth/geldb-redirect.service.ts`
- [ ] T017 [P] Create GelDBTokenService for token validation in `src/lib/services/auth/geldb-token.service.ts`
- [ ] T018 [P] Create SessionService for frontend session management in `src/lib/services/auth/session.service.ts`
- [ ] T019 Create AuthService facade for GelDB integration in `src/lib/services/auth/auth.service.ts`

### Backend API Integration

- [ ] T020 [P] Create MountainHRApiClient extension for identity sync in `src/lib/api/identity-client.ts`
- [ ] T021 [P] Create IdentityManager for RBAC::User sync in `src/lib/api/identity-manager.ts`
- [ ] T022 [P] Create auth request interceptor in `src/lib/api/auth-interceptor.ts`

### SvelteKit Route Handlers (Minimal)

- [ ] T023 Create login redirect handler in `src/routes/login/+page.server.ts`
- [ ] T024 Create auth callback handler in `src/routes/auth/callback/+page.server.ts`
- [ ] T025 Create logout handler in `src/routes/auth/logout/+page.server.ts`
- [ ] T026 Create auth verify API route in `src/routes/api/auth/verify/+server.ts`
- [ ] T027 Create permissions API route in `src/routes/api/auth/permissions/+server.ts`
- [ ] T028 Create permissions check API route in `src/routes/api/permissions/check/+server.ts`

## Phase 3.5: Integration & Middleware

- [ ] T029 Update hooks.server.ts with GelDB auth middleware in `src/hooks.server.ts`
- [ ] T030 Create auth store for client-side state in `src/lib/stores/auth.store.ts`
- [ ] T031 Update app.d.ts with GelDB auth types in `src/app.d.ts`

## Phase 3.6: Polish & Validation

- [ ] T032 [P] End-to-end GelDB auth flow test in `e2e/geldb-auth-complete-flow.test.ts`
- [ ] T033 Update login page UI to redirect to GelDB in `src/routes/login/+page.svelte`

## Updated Architecture

### What GelDB Auth Extension Provides ✅

- **Built-in Auth UI**: `http://localhost:5656/db/main/ext/auth/ui`
- **OAuth Endpoints**: Complete OAuth/Magic Link flow
- **Token Management**: JWT token generation and validation
- **User Registration**: Automatic user creation in ext::auth::Identity

### What We Need to Build 🏗️

- **Frontend Redirects**: Direct users to GelDB built-in UI
- **Callback Handling**: Process auth results from GelDB
- **Identity Sync**: Link GelDB Identity to RBAC::User
- **Session Management**: Frontend session state
- **RBAC Integration**: Permission checking via backend

## Dependencies

**Critical Path Dependencies:**
- Backend Schema (T001-T004) ✅ → Frontend Services (T016-T022) 
- Services (T016-T022) → Route Handlers (T023-T028)
- Integration Tests (T007-T010) MUST fail before implementation starts
- Contract Tests (T011-T015) MUST fail before implementation starts
- Core Implementation (T016-T028) before Integration (T029-T031)
- Everything before Polish (T032-T033)

**Specific Blockers:**
- T001 (identity_id field) ✅ blocks T020 (identity sync)
- T019 (AuthService) blocks T029 (hooks middleware)
- T030 (auth store) blocks T033 (login page UI)

## Updated Flow

### Authentication Flow
1. **User** visits protected route → Frontend redirects to `/login`
2. **Login page** redirects to → `http://localhost:5656/db/main/ext/auth/ui`
3. **GelDB built-in UI** handles → Magic Link authentication 
4. **User** clicks magic link → GelDB validates and redirects to callback
5. **Frontend callback** receives → Auth code from GelDB
6. **Backend API call** exchanges → Code for JWT token via GelDB
7. **Backend syncs** GelDB Identity → RBAC::User with identity_id
8. **Frontend sets** session cookie → User authenticated

### What Changed ✨
- **❌ Removed**: Custom `/auth/login`, `/auth/callback` endpoints
- **❌ Removed**: PKCE implementation (GelDB handles it)
- **❌ Removed**: Magic Link email handling (GelDB provides)
- **✅ Added**: Redirect handlers to GelDB built-in UI
- **✅ Added**: Identity synchronization between GelDB ↔ RBAC
- **✅ Simplified**: Session management (frontend only)

## Parallel Execution Examples

### Phase 3.3: All Tests (Can run together)
```bash
# Launch T007-T015 together:
Task: "Integration test complete GelDB auth flow"
Task: "Integration test RBAC role-based access" 
Task: "Integration test backend identity sync"
Task: "Contract test GET /api/auth/verify"
Task: "Contract test POST /api/permissions/check"
```

### Phase 3.4: Services (Independent services can run together)
```bash
# Launch T016-T018, T020-T022 together:
Task: "Create GelDBRedirectService for built-in auth URLs"
Task: "Create GelDBTokenService for token validation"
Task: "Create SessionService for frontend session management"
Task: "Create MountainHRApiClient extension for identity sync"
Task: "Create IdentityManager for RBAC::User sync"
```

## Notes

**GelDB Built-in Auth Benefits:**
- Battle-tested OAuth/PKCE implementation
- Built-in Magic Link UI and email handling
- Automatic security best practices
- Reduced frontend complexity
- Focus on business logic, not auth infrastructure

**Implementation Focus:**
- **Frontend**: Session management and user experience
- **Backend**: Identity synchronization and RBAC integration
- **Integration**: Seamless handoff between GelDB auth and application

**TDD Enforcement:**
- ALL integration tests (T007-T010) and contract tests (T011-T015) must be written first
- Tests MUST FAIL before any implementation begins
- Verify each test fails with "not implemented" or connection errors
- Commit tests separately from implementation

**Total Tasks**: 33 (T001-T033) - Reduced from 39 due to leveraging GelDB built-in auth
**Parallel Batches**: 2 major batches (tests, services)
**Estimated Completion**: 2-3 days (reduced due to simpler architecture)