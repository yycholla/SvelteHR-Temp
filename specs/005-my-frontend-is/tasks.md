# Tasks: Fix Authentication Redirect Loop

**Input**: Design documents from `/specs/005-my-frontend-is/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: SvelteKit, PostGraphile, Urql, JWT, Playwright
   → Structure: Web app (frontend SvelteKit + backend PostGraphile)
2. Load design documents:
   → data-model.md: 4 entities (User Session, Auth Token, Navigation State, Role Permissions)
   → contracts/: 2 files (auth-api.yaml, navigation-flow.yaml)
   → research.md: SvelteKit auth patterns, PostGraphile JWT integration
   → quickstart.md: 4 test scenarios
3. Generate tasks by category:
   → Setup: Playwright config, dev environment
   → Tests: Contract tests, E2E tests for redirect scenarios
   → Core: Auth store fixes, navigation guards, session management
   → Integration: Token validation, redirect prevention
   → Polish: Performance tests, error handling, documentation
4. Apply TDD rules: All tests before implementation
5. Mark [P] for different files/independent tasks
6. SUCCESS: 28 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in descriptions

## Path Conventions
- **Frontend**: `src/` (SvelteKit components, stores, services)
- **E2E Tests**: `e2e/` (Playwright tests)
- **Unit Tests**: `src/` (colocated with components using .test.ts)

## Phase 3.1: Setup

- [ ] T001 Configure Playwright for authentication redirect testing in `playwright.config.ts`
- [ ] T002 [P] Verify dev environment setup: SvelteKit on localhost:5175, PostGraphile on localhost:4000
- [ ] T003 [P] Create test user verification script in `scripts/verify-test-user.js`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [ ] T004 [P] Contract test GraphQL authentication endpoint in `e2e/contracts/auth-api.spec.ts`
- [ ] T005 [P] Contract test navigation flow redirects in `e2e/contracts/navigation-flow.spec.ts`

### Integration Tests (E2E)
- [ ] T006 [P] E2E test for redirect loop reproduction in `e2e/auth/redirect-loop-reproduction.spec.ts`
- [ ] T007 [P] E2E test for successful admin login flow in `e2e/auth/admin-login-success.spec.ts`
- [ ] T008 [P] E2E test for already authenticated user redirect in `e2e/auth/already-authenticated.spec.ts`
- [ ] T009 [P] E2E test for token expiration handling in `e2e/auth/token-expiration.spec.ts`
- [ ] T010 [P] E2E test for multiple browser tabs auth state in `e2e/auth/multi-tab-auth.spec.ts`

### Component Tests
- [ ] T011 [P] Auth store state management test in `src/lib/stores/auth.test.ts`
- [ ] T012 [P] AuthGuard component test in `src/lib/components/auth/AuthGuard.test.ts`
- [ ] T013 [P] Navigation state tracking test in `src/lib/services/navigationState.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Authentication Store Fixes
- [ ] T014 Fix AuthGuard to prevent multiple validateSession calls in `src/lib/components/auth/AuthGuard.svelte`
- [ ] T015 Optimize auth store to use single source of truth in `src/lib/stores/auth.ts`
- [ ] T016 [P] Create navigation state service in `src/lib/services/navigationState.ts`

### Route Protection & Redirects
- [ ] T017 Fix admin layout to check existing auth state first in `src/routes/admin/+layout.svelte`
- [ ] T018 Fix login page redirect logic in `src/routes/login/+page.svelte`
- [ ] T019 Fix root page redirect handling in `src/routes/+page.svelte`
- [ ] T020 Update server hooks to prevent auth loops in `src/hooks.server.ts`

### Session Management
- [ ] T021 [P] Implement session storage flag management in `src/lib/utils/sessionFlags.ts`
- [ ] T022 [P] Add token validation utilities in `src/lib/utils/tokenValidation.ts`
- [ ] T023 [P] Create redirect loop prevention utilities in `src/lib/utils/redirectPrevention.ts`

## Phase 3.4: Integration

- [ ] T024 Integrate navigation state service with auth store in `src/lib/stores/auth.ts`
- [ ] T025 Add comprehensive auth flow logging in `src/lib/services/authService.ts`
- [ ] T026 Implement error handling for auth failures in `src/lib/stores/auth.ts`

## Phase 3.5: Polish

- [ ] T027 [P] Performance test for <200ms auth validation in `e2e/performance/auth-performance.spec.ts`
- [ ] T028 [P] Update authentication flow documentation in `docs/authentication.md`

## Dependencies

**Phase Gates**:
- Tests (T004-T013) MUST complete and FAIL before implementation (T014-T026)
- Setup (T001-T003) before all other phases
- Core implementation (T014-T023) before integration (T024-T026)
- Integration before polish (T027-T028)

**Task Dependencies**:
- T014 blocks T015, T024 (auth store changes)
- T016 blocks T024 (navigation service integration)
- T021, T022, T023 block T024, T025, T026 (utility integration)
- T017, T018, T019 must coordinate on session storage usage

## Parallel Execution Examples

### Phase 3.1 Setup (parallel)
```
Task: "Verify dev environment setup: SvelteKit on localhost:5175, PostGraphile on localhost:4000"
Task: "Create test user verification script in scripts/verify-test-user.js"
```

### Phase 3.2 Contract Tests (parallel)
```
Task: "Contract test GraphQL authentication endpoint in e2e/contracts/auth-api.spec.ts"
Task: "Contract test navigation flow redirects in e2e/contracts/navigation-flow.spec.ts"
```

### Phase 3.2 E2E Tests (parallel)
```
Task: "E2E test for redirect loop reproduction in e2e/auth/redirect-loop-reproduction.spec.ts"
Task: "E2E test for successful admin login flow in e2e/auth/admin-login-success.spec.ts"
Task: "E2E test for already authenticated user redirect in e2e/auth/already-authenticated.spec.ts"
Task: "E2E test for token expiration handling in e2e/auth/token-expiration.spec.ts"
Task: "E2E test for multiple browser tabs auth state in e2e/auth/multi-tab-auth.spec.ts"
```

### Phase 3.2 Component Tests (parallel)
```
Task: "Auth store state management test in src/lib/stores/auth.test.ts"
Task: "AuthGuard component test in src/lib/components/auth/AuthGuard.test.ts"
Task: "Navigation state tracking test in src/lib/services/navigationState.test.ts"
```

### Phase 3.3 Utility Creation (parallel)
```
Task: "Implement session storage flag management in src/lib/utils/sessionFlags.ts"
Task: "Add token validation utilities in src/lib/utils/tokenValidation.ts"
Task: "Create redirect loop prevention utilities in src/lib/utils/redirectPrevention.ts"
```

## Task Details

### T001: Configure Playwright for authentication redirect testing
**File**: `playwright.config.ts`
**Goal**: Update Playwright config to handle authentication flows and cookies
**Acceptance**: Config supports login state persistence, multiple browser contexts

### T006: E2E test for redirect loop reproduction
**File**: `e2e/auth/redirect-loop-reproduction.spec.ts`
**Goal**: Create failing test that demonstrates the current redirect loop bug
**Acceptance**: Test consistently reproduces infinite redirects between /login and /admin

### T014: Fix AuthGuard to prevent multiple validateSession calls
**File**: `src/lib/components/auth/AuthGuard.svelte`
**Goal**: Ensure AuthGuard only calls validateSession once per app lifecycle
**Acceptance**: Console shows only one "AuthGuard: Initializing authentication" message

### T015: Optimize auth store to use single source of truth
**File**: `src/lib/stores/auth.ts`
**Goal**: Remove redundant validateSession calls from other components
**Acceptance**: Only AuthGuard manages authentication state initialization

### T017: Fix admin layout to check existing auth state first
**File**: `src/routes/admin/+layout.svelte`
**Goal**: Check authentication state before triggering new validation
**Acceptance**: No repeated "Admin layout: User is authorized" messages

## Notes

- [P] tasks = different files, no dependencies
- All tests must fail before implementing fixes (TDD)
- Commit after each task completion
- Monitor console for validation call frequency during development
- Use browser dev tools to track redirect count and timing

## Validation Checklist

- [x] All contracts have corresponding tests (T004-T005)
- [x] All entities have implementation tasks (User Session→T015, Auth Token→T022, Navigation State→T016, Role Permissions→existing)
- [x] All tests come before implementation (T004-T013 before T014-T026)
- [x] Parallel tasks truly independent ([P] marks different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD enforced: Tests must fail before implementation