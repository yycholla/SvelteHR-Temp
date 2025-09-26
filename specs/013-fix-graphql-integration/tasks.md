# Tasks: GraphQL Integration Error Resolution

**Input**: Design documents from `/specs/013-fix-graphql-integration/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Tech stack: SvelteKit 2.22.0, URQL 5.0.0, PostGraphile 4.14.1, GraphQL 15.10.1
   → Structure: Web application (frontend + backend)
2. Load design documents:
   → data-model.md: 4 entities (DataRequest, ErrorResponse, UserSession, ApplicationPage)
   → contracts/: 2 files (GraphQL schema + TypeScript interfaces)
   → quickstart.md: Implementation patterns and test scenarios
3. Generate tasks for GraphQL integration fix across all application pages
4. Apply TDD methodology: Tests → Implementation → Integration → Polish
5. Ensure standardized error handling with 5-second timeout, 3 retries, 30-minute cache
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `src/` at repository root
- **Tests**: `tests/` organized by type (contract, integration, unit, e2e)
- **GraphQL**: `src/lib/graphql/` for operations and client configuration
- **Types**: `src/lib/types/` for TypeScript interfaces
- **Utils**: `src/lib/utils/` for error handling utilities

## Phase 3.1: Setup & Infrastructure

- [x] **T001** [P] Create GraphQL error handling type definitions in `src/lib/types/graphql-contracts.ts`
  - **MCP Discovery**: Use `mcp__serena__list_dir("src/lib/types")` to analyze existing type structure
  - **MCP Implementation**: Use `mcp__serena__insert_after_symbol()` for new type definitions if types exist, otherwise create new file
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` to verify no existing conflicts
- [x] **T002** [P] Create standardized error handling utilities in `src/lib/utils/graphql-error-handling.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/utils")` to understand existing utility patterns
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` or create new file following existing patterns
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` for any existing error handling utilities
- [x] **T003** [P] Create retry handler utilities in `src/lib/utils/retry-handler.ts`
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("retry")` to find existing retry logic
  - **MCP Implementation**: Use `mcp__serena__insert_after_symbol()` in utils directory following established patterns
  - **MCP Validation**: Use `mcp__serena__think_about_task_adherence()` to verify retry logic meets 3-attempt requirement
- [x] **T004** [P] Create cache invalidation utilities in `src/lib/utils/cache-management.ts`
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("cache")` to analyze existing cache implementation
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` for existing cache utilities or create new
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` to ensure 30-minute TTL compatibility

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests

- [x] **T005** [P] Contract test GetCompleteDashboardData operation in `tests/contract/dashboard-operations.test.ts`
- [x] **T006** [P] Contract test VerifyUserAuthentication operation in `tests/contract/auth-operations.test.ts`
- [x] **T007** [P] Contract test GetEmployees operation in `tests/contract/employees-operations.test.ts`
- [x] **T008** [P] Contract test GetDepartments operation in `tests/contract/departments-operations.test.ts`
- [x] **T009** [P] Contract test RetryFailedOperation operation in `tests/contract/retry-operations.test.ts`
- [x] **T010** [P] Contract test InvalidateCache operation in `tests/contract/cache-operations.test.ts`

### Integration Tests for Error Scenarios

- [ ] **T011** [P] Integration test network timeout handling in `tests/integration/network-timeout.test.ts`
- [ ] **T012** [P] Integration test authentication error handling in `tests/integration/auth-error.test.ts`
- [ ] **T013** [P] Integration test permission error handling in `tests/integration/permission-error.test.ts`
- [ ] **T014** [P] Integration test retry mechanism (3 attempts) in `tests/integration/retry-logic.test.ts`
- [ ] **T015** [P] Integration test cache TTL (30 minutes) in `tests/integration/cache-ttl.test.ts`
- [ ] **T016** [P] Integration test error message display in `tests/integration/error-display.test.ts`

### Page-Level Integration Tests

- [x] **T017** [P] Integration test dashboard page data loading in `tests/integration/dashboard-page.test.ts`
- [x] **T018** [P] Integration test login page authentication in `tests/integration/login-page.test.ts`
- [x] **T019** [P] Integration test employee management page in `tests/integration/employee-page.test.ts`
- [x] **T020** [P] Integration test departments page in `tests/integration/departments-page.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Error Handling Infrastructure

- [x] **T021** [P] Implement DataRequest entity model in `src/lib/models/data-request.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/models")` to understand existing model patterns
  - **MCP Requirements**: Implement with fields: id, operationName, variables, userCredentials, status, retryAttempts, createdAt, completedAt, timeoutMs
  - **MCP Validation Rules**: retryAttempts (0-3), timeoutMs (≤5000ms), operationName (non-empty), userCredentials (valid)
  - **MCP Implementation**: Use `mcp__serena__insert_after_symbol()` to add to existing models or create new file
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate no conflicts with existing request types
- [x] **T022** [P] Implement ErrorResponse entity model in `src/lib/models/error-response.ts`
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("error")` to analyze existing error handling patterns
  - **MCP Requirements**: Implement with fields: id, type, originalError, userMessage, technicalDetails, suggestedActions, timestamp, isRetryable, severity
  - **MCP Validation Rules**: userMessage (non-empty, user-friendly), suggestedActions (≥1 action), timestamp (valid ISO), severity (determines UI treatment)
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` for existing error types or create new
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to ensure error types align with spec requirements
- [x] **T023** [P] Implement UserSession entity model in `src/lib/models/user-session.ts`
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("session|auth")` to find existing session management
  - **MCP Requirements**: Implement with fields: id, userId, jwtToken, permissions, roles, isAuthenticated, expiresAt, lastActivity
  - **MCP Validation Rules**: jwtToken (valid JWT when authenticated), expiresAt (future when authenticated), permissions (non-empty when authenticated), userId (exists when authenticated)
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` for existing session types or extend them
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate compatibility with auth store
- [x] **T024** [P] Implement ApplicationPage entity model in `src/lib/models/application-page.ts`
  - **MCP Discovery**: Use `mcp__serena__list_dir("src/routes")` to understand page structure and requirements
  - **MCP Requirements**: Implement with fields: id, title, requiredOperations, loadingState, errorState, cachePolicy, lastDataRefresh, retryConfiguration
  - **MCP Validation Rules**: requiredOperations (non-empty for data pages), cachePolicy.ttlMinutes (≤30), lastDataRefresh (updated on success), errorState (cleared on retry success)
  - **MCP Implementation**: Use `mcp__serena__insert_after_symbol()` to add page model following established patterns
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to ensure compatibility with existing page components

### GraphQL Operations Standardization

- [ ] **T025** Fix dashboard operations function signatures in `src/lib/graphql/dashboard-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/dashboard-operations.ts")` to analyze current functions
  - **MCP Analysis**: Use `mcp__serena__find_referencing_symbols()` to identify all components using dashboard operations
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to fix `getCompleteDashboardData(userId: string, userRole: string)` signature
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to ensure compliance with standardized error handling
- [ ] **T026** Fix login operations function signatures in `src/lib/graphql/auth-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/auth-operations.ts")` to identify auth functions
  - **MCP Analysis**: Use `mcp__serena__find_referencing_symbols()` to locate login page dependencies
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to standardize authentication operation signatures
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate auth store compatibility
- [ ] **T027** [P] Fix employee operations function signatures in `src/lib/graphql/employee-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/employee-operations.ts")` to analyze employee functions
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized GetEmployees operation pattern
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to ensure employee page compatibility
- [ ] **T028** [P] Fix department operations function signatures in `src/lib/graphql/department-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/department-operations.ts")` to analyze department functions
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement GetDepartments operation with includeEmployeeCount parameter
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate departments page integration
- [ ] **T029** [P] Fix performance management operations in `src/lib/graphql/performance-management-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/performance-management-operations.ts")` to identify performance functions
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply standardized error handling patterns
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to ensure 5-second timeout and 3-retry compliance
- [ ] **T030** [P] Fix goals/OKR operations in `src/lib/graphql/goals-okrs-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/goals-okrs-operations.ts")` to analyze goals functions
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply standardized operation signatures
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to ensure goals page compatibility
- [ ] **T031** [P] Fix team management operations in `src/lib/graphql/team-management-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/team-management-operations.ts")` to identify team functions
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized team operation patterns
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate teams page integration
- [ ] **T032** [P] Fix leave management operations in `src/lib/graphql/leave-management-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/leave-management-operations.ts")` to analyze leave functions
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply standardized error handling for leave operations
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to ensure leave approval pages compatibility
- [ ] **T033** [P] Fix team reports operations in `src/lib/graphql/team-reports-operations.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/team-reports-operations.ts")` to identify report functions
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized report operation patterns
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate reports page integration

### Page-Level Implementation (Sequential - modifying same components)

- [ ] **T034** Update dashboard page with standardized error handling in `src/routes/dashboard/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/+page.svelte")` to analyze current component structure
  - **MCP Analysis**: Use `mcp__serena__find_referencing_symbols("getCompleteDashboardData")` to understand current usage
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` for onMount function to implement standardized error handling pattern
  - **MCP Integration**: Add loading, error, retryAttempts state with Svelte 5 runes ($state), implement retry handler, timeout handling
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to ensure 5s timeout, 3 retries, user-friendly errors
- [ ] **T035** Update login page with standardized error handling in `src/routes/login/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/login/+page.svelte")` to analyze authentication flow
  - **MCP Analysis**: Use `mcp__serena__find_referencing_symbols("handleLoginSuccess")` to understand current auth handling
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` for login handlers to implement standardized auth error patterns
  - **MCP Integration**: Add authentication error boundaries, redirect handling, session validation with proper error messaging
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to ensure auth store integration remains intact
- [ ] **T036** Update main dashboard management page in `src/routes/dashboard/management/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/management/+page.svelte")` for current structure
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply standardized GraphQL error handling patterns
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to verify management-specific error scenarios
- [ ] **T037** Update leave approvals page in `src/routes/dashboard/management/leave-approvals/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/management/leave-approvals/+page.svelte")`
  - **MCP Analysis**: Use `mcp__serena__find_referencing_symbols()` to understand leave operation dependencies
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized error handling for leave operations
  - **MCP Verification**: Ensure leave approval workflow maintains proper error states and retry mechanisms
- [ ] **T038** Update reviews page in `src/routes/dashboard/management/reviews/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/management/reviews/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply standardized error patterns for performance review operations
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to ensure performance operation integration
- [ ] **T039** Update goals page in `src/routes/dashboard/management/goals/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/management/goals/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized error handling for goals/OKR operations
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to ensure goals-specific error scenarios are covered
- [ ] **T040** Update reports page in `src/routes/dashboard/management/reports/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/management/reports/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply standardized error handling for report generation operations
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate report operation dependencies
- [ ] **T041** Update teams page in `src/routes/dashboard/teams/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/teams/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized error handling for team management operations
  - **MCP Verification**: Ensure team operation error handling aligns with management workflow requirements
- [ ] **T042** Update admin page in `src/routes/dashboard/admin/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/dashboard/admin/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply admin-specific standardized error handling patterns
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to ensure admin operation compliance with error requirements
- [ ] **T043** Update departments page in `src/routes/departments/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/departments/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized error handling for department operations
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to ensure department operation integration
- [ ] **T044** Update profile page in `src/routes/profile/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/profile/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply standardized error patterns for profile operations
  - **MCP Verification**: Ensure profile update error handling includes proper user feedback and retry mechanisms
- [ ] **T045** Update settings page in `src/routes/settings/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/settings/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement settings-specific error handling patterns
  - **MCP Verification**: Use `mcp__serena__think_about_task_adherence()` to verify settings operation error compliance
- [ ] **T046** Update compliance page in `src/routes/compliance/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/compliance/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to apply compliance-specific standardized error handling
  - **MCP Verification**: Ensure compliance operation error handling meets regulatory display requirements
- [ ] **T047** Update tasks page in `src/routes/tasks/+page.svelte`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/tasks/+page.svelte")`
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to implement standardized error handling for task operations
  - **MCP Verification**: Use `mcp__serena__find_referencing_symbols()` to validate task operation dependencies

## Phase 3.4: Integration & Configuration

- [ ] **T048** Update URQL client configuration for enhanced error handling in `src/lib/graphql/client.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/graphql/client.ts")` to understand current URQL client structure
  - **MCP Implementation**: Use `mcp__serena__find_symbol("createClient", "src/lib/graphql/client.ts")` then `mcp__serena__replace_symbol_body()` for client configuration updates
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` to verify all GraphQL operations use the updated client configuration

- [ ] **T049** Integrate error boundaries with Svelte components in `src/lib/components/error-boundary.svelte`
  - **MCP Discovery**: Use `mcp__serena__list_dir("src/lib/components")` to check existing error handling components
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` for existing error boundary or `mcp__serena__insert_after_symbol()` to create new one
  - **MCP Validation**: Use `mcp__serena__search_for_pattern("ErrorBoundary|error.*boundary")` to verify integration across components

- [ ] **T050** Update authentication store with error handling in `src/lib/stores/auth.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/lib/stores/auth.ts")` to analyze current auth store structure
  - **MCP Implementation**: Use `mcp__serena__find_symbol("authStore", "src/lib/stores/auth.ts")` then `mcp__serena__replace_symbol_body()` for enhanced error handling
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols("authStore", "src/lib/stores/auth.ts")` to ensure all usage points handle new error states

- [ ] **T051** Configure performance monitoring for GraphQL operations in `src/lib/performance/graphql-performance-exchange.ts`
  - **MCP Discovery**: Use `mcp__serena__list_dir("src/lib")` to check for existing performance directory or create structure
  - **MCP Implementation**: Use `mcp__serena__insert_after_symbol()` for new performance monitoring exchange implementation
  - **MCP Validation**: Use `mcp__serena__think_about_task_adherence()` to ensure performance monitoring integrates with URQL client

## Phase 3.5: Polish & Validation

### Unit Tests

- [ ] **T052** [P] Unit tests for error classification logic in `tests/unit/error-classification.test.ts`
  - **MCP Discovery**: Use `mcp__serena__find_symbol("classifyError", "src/lib/utils/graphql-error-handling.ts")` to understand error classification logic
  - **MCP Implementation**: Create comprehensive test cases covering all error types and edge cases
  - **MCP Validation**: Use `mcp__serena__think_about_task_adherence()` to ensure tests cover all error classification scenarios

- [ ] **T053** [P] Unit tests for retry delay calculation in `tests/unit/retry-delays.test.ts`
  - **MCP Discovery**: Use `mcp__serena__find_symbol("calculateRetryDelay", "src/lib/utils/retry-handler.ts")` to understand delay calculation logic
  - **MCP Implementation**: Test exponential backoff, maximum delay limits, and edge cases
  - **MCP Validation**: Verify test coverage includes all retry scenarios and delay calculations

- [ ] **T054** [P] Unit tests for cache TTL validation in `tests/unit/cache-validation.test.ts`
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("cache.*ttl|ttl.*cache", "src/lib/utils")` to find all cache TTL implementations
  - **MCP Implementation**: Test 30-minute TTL compliance, cache invalidation, and expiration logic
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` to ensure all cache usage points are tested

- [ ] **T055** [P] Unit tests for user message generation in `tests/unit/user-messages.test.ts`
  - **MCP Discovery**: Use `mcp__serena__find_symbol("createUserMessage", "src/lib/utils/graphql-error-handling.ts")` to analyze message generation logic
  - **MCP Implementation**: Test all error types produce appropriate user-friendly messages
  - **MCP Validation**: Verify message quality and actionable guidance for all error scenarios

### End-to-End Tests

- [ ] **T056** [P] E2E test complete dashboard workflow in `tests/e2e/dashboard-flow.test.ts`
  - **MCP Discovery**: Use `mcp__serena__get_symbols_overview("src/routes/+page.svelte")` to understand dashboard data flow and components
  - **MCP Implementation**: Test loading states, error scenarios, retry logic, and successful data display
  - **MCP Validation**: Use `mcp__serena__think_about_task_adherence()` to ensure all dashboard GraphQL integration scenarios are covered

- [ ] **T057** [P] E2E test authentication error recovery in `tests/e2e/auth-recovery-flow.test.ts`
  - **MCP Discovery**: Use `mcp__serena__find_symbol("VerifyUserAuthentication", "src/lib/graphql/auth-operations.ts")` to understand auth error scenarios
  - **MCP Implementation**: Test token expiration, unauthorized access, and recovery workflows
  - **MCP Validation**: Verify all auth error paths lead to appropriate user actions and recovery

- [ ] **T058** [P] E2E test network error handling across pages in `tests/e2e/network-error-flow.test.ts`
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("networkError|timeout", "src/lib")` to find all network error handling implementations
  - **MCP Implementation**: Test network timeouts, connection failures, and retry mechanisms across all pages
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` to ensure consistent error handling across all GraphQL operations

### Performance & Monitoring

- [ ] **T059** Performance validation: GraphQL responses <200ms p95
  - **MCP Discovery**: Use `mcp__serena__find_symbol("graphql-performance-exchange", "src/lib/performance")` to understand current performance monitoring
  - **MCP Implementation**: Implement automated performance validation with benchmarks and alerts
  - **MCP Validation**: Use `mcp__serena__think_about_task_adherence()` to ensure all operations meet <200ms p95 requirement

- [ ] **T060** Performance validation: Page load times <5 seconds
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("timeout.*5000|5.*second", "src/lib")` to verify all timeout configurations
  - **MCP Implementation**: Automated page load testing with performance budgets and monitoring
  - **MCP Validation**: Verify all pages meet <5 second load time requirement under various conditions

- [ ] **T061** Validate cache hit rates and TTL compliance
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("cache.*30.*minute|ttl.*30", "src/lib")` to find all 30-minute TTL implementations
  - **MCP Implementation**: Implement cache metrics collection and validation
  - **MCP Validation**: Use `mcp__serena__think_about_task_adherence()` to ensure 30-minute TTL is consistently enforced

- [ ] **T062** Validate retry mechanism compliance (max 3 attempts)
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("retry.*3|maxRetries.*3", "src/lib")` to verify all retry configurations
  - **MCP Implementation**: Automated testing of retry limits and exponential backoff
  - **MCP Validation**: Verify all operations respect 3-retry maximum across all error scenarios

### Documentation & Cleanup

- [ ] **T063** [P] Update component documentation with error handling patterns
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("@component|@doc|/\\*\\*", "src/lib/components")` to find existing documentation patterns
  - **MCP Implementation**: Update all GraphQL-integrated components with error handling documentation
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` to ensure all components using GraphQL operations are documented

- [ ] **T064** [P] Create troubleshooting guide for common GraphQL errors
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("error.*code|graphQLError", "src/lib")` to catalog all error types and codes
  - **MCP Implementation**: Create comprehensive troubleshooting documentation with examples and solutions
  - **MCP Validation**: Use `mcp__serena__think_about_task_adherence()` to ensure guide covers all identified error scenarios

- [ ] **T065** Code cleanup: Remove temporary fixes and deprecated patterns
  - **MCP Discovery**: Use `mcp__serena__search_for_pattern("TODO|FIXME|HACK|temporary|deprecated", "src/lib")` to find cleanup candidates
  - **MCP Implementation**: Use `mcp__serena__replace_symbol_body()` to remove temporary code and apply final patterns
  - **MCP Validation**: Use `mcp__serena__find_referencing_symbols()` to ensure cleanup doesn't break dependencies

- [ ] **T066** Final integration testing across all application pages
  - **MCP Discovery**: Use `mcp__serena__list_dir("src/routes", recursive=true)` to identify all pages requiring integration testing
  - **MCP Implementation**: Comprehensive end-to-end validation of all GraphQL integration improvements
  - **MCP Validation**: Use `mcp__serena__think_about_whether_you_are_done()` to confirm all requirements are met and no errors remain

## Dependencies

**Critical Dependencies**:

- T001-T004 (Infrastructure) before all other tasks
- T005-T020 (Tests) before T021-T047 (Implementation)
- T021-T024 (Models) before T025-T033 (Operations)
- T025-T033 (Operations) before T034-T047 (Pages)
- T048-T051 (Integration) before T052-T066 (Polish)

**Sequential Dependencies**:

- T034-T047 must run sequentially (same component/store files)
- T025 blocks T034 (dashboard operations → dashboard page)
- T026 blocks T035 (auth operations → login page)

## Parallel Execution Examples

### Phase 1: Infrastructure Setup (Run Together)

```bash
# T001-T004: Infrastructure tasks
Task("Create GraphQL error types", "src/lib/types/graphql-contracts.ts")
Task("Create error handling utilities", "src/lib/utils/graphql-error-handling.ts")
Task("Create retry handler", "src/lib/utils/retry-handler.ts")
Task("Create cache management", "src/lib/utils/cache-management.ts")
```

### Phase 2: Contract Tests (Run Together)

```bash
# T005-T010: Contract tests
Task("Test dashboard operations", "tests/contract/dashboard-operations.test.ts")
Task("Test auth operations", "tests/contract/auth-operations.test.ts")
Task("Test employee operations", "tests/contract/employee-operations.test.ts")
Task("Test department operations", "tests/contract/department-operations.test.ts")
Task("Test retry operations", "tests/contract/retry-operations.test.ts")
Task("Test cache operations", "tests/contract/cache-operations.test.ts")
```

### Phase 3: Integration Tests (Run Together)

```bash
# T011-T020: Integration tests
Task("Test network timeout", "tests/integration/network-timeout.test.ts")
Task("Test auth errors", "tests/integration/auth-error.test.ts")
Task("Test permission errors", "tests/integration/permission-error.test.ts")
Task("Test retry logic", "tests/integration/retry-logic.test.ts")
```

### Phase 4: Entity Models (Run Together)

```bash
# T021-T024: Entity models
Task("DataRequest model", "src/lib/models/data-request.ts")
Task("ErrorResponse model", "src/lib/models/error-response.ts")
Task("UserSession model", "src/lib/models/user-session.ts")
Task("ApplicationPage model", "src/lib/models/application-page.ts")
```

### Phase 5: GraphQL Operations (Run Together)

```bash
# T027-T033: Operations (excluding T025-T026 due to page dependencies)
Task("Fix employee operations", "src/lib/graphql/employee-operations.ts")
Task("Fix department operations", "src/lib/graphql/department-operations.ts")
Task("Fix performance operations", "src/lib/graphql/performance-management-operations.ts")
Task("Fix goals operations", "src/lib/graphql/goals-okrs-operations.ts")
```

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **Sequential tasks**: T034-T047 (pages) must run one at a time due to shared stores/components
- **Critical verification**: All tests must fail before implementation begins (TDD requirement)
- **Performance targets**: <200ms p95 GraphQL responses, <5 second page loads, 30-minute cache TTL
- **Error handling**: All pages must implement 5-second timeout, 3 retry attempts, detailed user messages
- **Commit strategy**: Commit after each task completion
- **Branch strategy**: All work on `013-fix-graphql-integration` branch

## Validation Checklist

_GATE: Checked before task completion_

- [ ] All GraphQL operations use standardized function signatures
- [ ] All pages implement consistent error handling patterns
- [ ] All timeout handling set to 5 seconds maximum
- [ ] All retry logic limited to 3 attempts maximum
- [ ] All cache TTL set to 30 minutes with invalidation
- [ ] All user error messages are friendly and actionable
- [ ] All technical error details available in development mode
- [ ] No "$.get(...).map is not a function" errors remain
- [ ] Performance targets met: <200ms p95, <5s page loads
- [ ] All tests passing (contract, integration, unit, e2e)
- [ ] TypeScript compilation successful with no errors

## Success Criteria

1. **Functional Requirements Met**: All application pages load data without GraphQL integration errors
2. **Error Handling Standardized**: Consistent timeout, retry, and user messaging patterns
3. **Performance Targets Achieved**: <200ms p95 GraphQL responses, <5 second page loads
4. **User Experience Improved**: Clear error messages, loading states, and recovery options
5. **Developer Experience Enhanced**: Standardized patterns, comprehensive tests, maintainable code
6. **System Reliability**: 30-minute cache TTL with proper invalidation, 3-retry limit respected

**Total Tasks**: 66 tasks
**Estimated Completion Time**: 8-12 hours (with parallel execution)
**Critical Path**: Setup → Tests → Models → Operations → Pages → Integration → Polish
