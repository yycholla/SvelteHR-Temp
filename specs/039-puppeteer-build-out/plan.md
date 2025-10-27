# Implementation Plan: Comprehensive Puppeteer E2E Testing Suite

**Branch**: `039-puppeteer-build-out` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/039-puppeteer-build-out/spec.md`

## Summary

Build out a comprehensive Puppeteer E2E testing suite to verify all pages fetch real data from the Rust GraphQL API (not placeholder data) and validate functional page behaviors. The test suite will cover 10+ major routes (dashboard, employees, hr, admin, events, tasks, leave-requests) with parallel execution, automatic retry logic, isolated test database, and CI/CD integration that warns but doesn't block merges.

**Technical Approach**: Extend existing Puppeteer infrastructure (already migrated from Playwright) with comprehensive test coverage across all major user flows, implement isolated test database with seed data management, add data-testid attributes to UI components for reliable selectors, integrate with CI/CD for automated testing on every PR with artifact retention.

## Technical Context

**Language/Version**: TypeScript 5.0, Node.js 18+
**Primary Dependencies**: Puppeteer 24.26.1, Vitest 3.2.3, SvelteKit 2.22.0, GraphQL
**Storage**: PostgreSQL (isolated test database with seed data reset between runs)
**Testing**: Vitest test runner with Puppeteer integration, parallel execution, retry logic
**Target Platform**: Arch Linux (development), CI/CD platform (GitHub Actions or similar)
**Project Type**: Web application (SvelteKit frontend + Rust GraphQL backend)
**Performance Goals**: < 3s time to interactive per page, < 5s total dashboard load with multiple GraphQL queries
**Constraints**: Parallel test execution required, 2-3 retry attempts for flaky tests, 7-30 day artifact retention
**Scale/Scope**: 10+ major routes, 80% E2E test coverage of user-facing pages, 6 user stories with 20 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Project does not have a defined constitution (constitution.md is a template). No constitutional violations to track.

**Testing Principles Applied**:
- TDD approach: Tests define expected behavior before implementation
- Isolated test database with fresh seed data per run
- Parallel execution with test independence
- Comprehensive coverage (80% target)
- CI/CD integration with automated regression detection

## Project Structure

### Documentation (this feature)

```
specs/039-puppeteer-build-out/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output - Puppeteer best practices, data-testid patterns
├── data-model.md        # Phase 1 output - Test fixtures schema, seed data structure
├── quickstart.md        # Phase 1 output - Running tests locally, CI/CD setup
├── contracts/           # Phase 1 output - Test selector contracts, GraphQL response validation schemas
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Testing infrastructure (extends existing Puppeteer setup)
tests/
├── e2e/                           # Puppeteer E2E tests
│   ├── dashboard-data.puppeteer.test.ts          # ✅ Already exists (3 tests)
│   ├── form-interactions.puppeteer.test.ts       # ✅ Already exists (8 tests)
│   ├── events/
│   │   └── event-rsvp-workflow.puppeteer.test.ts # ✅ Already exists (7 tests)
│   ├── auth/                      # NEW: Authentication flow tests
│   │   ├── login.puppeteer.test.ts
│   │   ├── logout.puppeteer.test.ts
│   │   └── unauthorized-access.puppeteer.test.ts
│   ├── employees/                 # NEW: Employee management tests
│   │   ├── directory.puppeteer.test.ts
│   │   ├── search-filter.puppeteer.test.ts
│   │   └── profile.puppeteer.test.ts
│   ├── hr/                        # NEW: HR workflow tests
│   │   ├── leave-requests.puppeteer.test.ts
│   │   ├── reports.puppeteer.test.ts
│   │   └── approval-workflow.puppeteer.test.ts
│   ├── admin/                     # NEW: Admin functionality tests
│   │   ├── user-management.puppeteer.test.ts
│   │   └── permissions.puppeteer.test.ts
│   ├── tasks/                     # NEW: Task management tests
│   │   ├── task-list.puppeteer.test.ts
│   │   └── task-assignment.puppeteer.test.ts
│   ├── performance/               # NEW: Performance tests
│   │   ├── page-load-times.puppeteer.test.ts
│   │   └── loading-states.puppeteer.test.ts
│   └── graphql/                   # NEW: GraphQL validation tests
│       ├── response-validation.puppeteer.test.ts
│       └── schema-conformance.puppeteer.test.ts
├── utils/
│   ├── puppeteer-helpers.ts       # ✅ Already exists (350+ lines)
│   ├── test-selectors.ts          # NEW: Centralized data-testid selector definitions
│   ├── graphql-validators.ts      # NEW: GraphQL response validation functions
│   └── test-data-helpers.ts       # NEW: Test data generation and validation
├── fixtures/                      # NEW: Test fixtures and seed data
│   ├── users.json                 # Test user accounts (admin, hr, manager, employee)
│   ├── employees.json             # Employee test data
│   ├── events.json                # Event test data
│   ├── tasks.json                 # Task test data
│   └── leave-requests.json        # Leave request test data
└── setup/
    ├── vitest-setup-e2e-puppeteer.ts  # ✅ Already exists
    └── test-db-setup.ts               # NEW: Isolated test database setup/teardown

# Frontend source (add data-testid attributes)
src/
├── routes/
│   ├── dashboard/
│   │   └── +page.svelte           # ADD: data-testid attributes for metrics
│   ├── employees/
│   │   └── +page.svelte           # ADD: data-testid attributes for directory
│   ├── hr/
│   │   └── +page.svelte           # ADD: data-testid attributes for HR workflows
│   ├── admin/
│   │   └── +page.svelte           # ADD: data-testid attributes for admin pages
│   ├── events/
│   │   └── +page.svelte           # ADD: data-testid attributes for events
│   └── tasks/
│       └── +page.svelte           # ADD: data-testid attributes for tasks
└── lib/
    └── components/
        └── ui/                      # ADD: data-testid attributes to all interactive components

# CI/CD configuration
.github/
└── workflows/
    └── puppeteer-e2e-tests.yml      # NEW: CI/CD workflow for Puppeteer tests

# Database scripts
scripts/
└── test-db/                         # NEW: Test database management scripts
    ├── create-test-db.sh
    ├── seed-test-data.sh
    └── reset-test-db.sh
```

**Structure Decision**: Web application structure with focus on extending existing testing infrastructure. The Puppeteer migration from Playwright is already complete (see `docs/PUPPETEER_MIGRATION_COMPLETE.md`), with 3 test files (23 tests total) already passing. This plan builds on that foundation to achieve comprehensive E2E coverage across all major routes and user workflows.

## Complexity Tracking

*No constitutional violations - constitution is not yet defined for this project.*

## Phase 0: Research & Discovery

### Research Questions

1. **Puppeteer Best Practices for SvelteKit**:
   - How to handle SvelteKit's client-side hydration in E2E tests?
   - Best practices for waiting for network idle with GraphQL queries?
   - How to intercept and validate GraphQL requests/responses?

2. **data-testid Naming Conventions**:
   - What naming pattern provides best balance between readability and maintainability?
   - How to handle dynamic IDs (e.g., `data-testid="employee-card-${id}"`)?
   - Should testid selectors be centralized or inline?

3. **Test Database Isolation**:
   - How to create isolated PostgreSQL test database with seed data?
   - How to reset database between test runs efficiently?
   - How to handle parallel test execution with shared database?

4. **GraphQL Response Validation**:
   - How to intercept GraphQL requests in Puppeteer?
   - How to validate response structure matches schema?
   - How to detect placeholder data vs real data programmatically?

5. **CI/CD Artifact Management**:
   - How to upload Puppeteer screenshots/videos to GitHub Actions artifacts?
   - How to configure artifact retention (7-30 days)?
   - How to generate HTML test reports?

### Research Deliverable

Create `/home/chanway/Projects/SvelteHR/specs/039-puppeteer-build-out/research.md` with findings on:
- Puppeteer + SvelteKit integration patterns
- data-testid best practices and naming conventions
- Test database isolation strategies
- GraphQL request interception techniques
- CI/CD artifact upload configuration

## Phase 1: Design & Contracts

### Data Model

Create `/home/chanway/Projects/SvelteHR/specs/039-puppeteer-build-out/data-model.md` defining:

1. **Test Fixtures Schema**:
   - Test user accounts (roles: admin, hr_manager, manager, employee)
   - Employee test data (realistic names, dates, departments)
   - Event test data (titles, dates, attendees, RSVP statuses)
   - Task test data (assignments, due dates, priorities)
   - Leave request test data (dates, statuses, approvals)

2. **Test Database Schema**:
   - Isolated test database structure
   - Seed data insertion scripts
   - Reset/cleanup procedures

3. **Test Selector Definitions**:
   - Centralized data-testid selector registry
   - Naming conventions (e.g., `[page]-[component]-[action]`)
   - Dynamic selector handling

### Contracts

Create `/home/chanway/Projects/SvelteHR/specs/039-puppeteer-build-out/contracts/` with:

1. **test-selectors.contract.ts**: TypeScript definitions for all data-testid selectors
2. **graphql-responses.contract.ts**: Expected GraphQL response structures for validation
3. **test-fixtures.contract.ts**: TypeScript interfaces for test fixture data
4. **ci-cd-artifacts.contract.md**: Artifact naming, retention, and upload specification

### Quickstart

Create `/home/chanway/Projects/SvelteHR/specs/039-puppeteer-build-out/quickstart.md` with:

1. **Local Development Setup**:
   ```bash
   # Create isolated test database
   npm run test:db:create

   # Seed test data
   npm run test:db:seed

   # Run Puppeteer tests
   npm run test:puppeteer

   # Run specific test suite
   npm run test:puppeteer:dashboard
   ```

2. **Debugging Failed Tests**:
   - Running tests in headed mode
   - Capturing screenshots on failure
   - Inspecting GraphQL request/response logs

3. **CI/CD Integration**:
   - GitHub Actions workflow configuration
   - Artifact upload setup
   - Notification configuration

## Phase 2: Task Generation

**NOTE**: Task generation will be handled by the `/tasks` command, not by `/plan`.

The task generation phase will create `/home/chanway/Projects/SvelteHR/specs/039-puppeteer-build-out/tasks.md` with implementation tasks organized by:

1. **Test Infrastructure** (FR-016, FR-017, FR-018, FR-019, FR-020):
   - Set up isolated test database with seed data
   - Configure parallel test execution
   - Implement automatic retry logic
   - Set up CI/CD artifact upload
   - Configure warning-based test failure policy

2. **Test Coverage Expansion** (FR-001, FR-002, FR-003):
   - Dashboard data validation tests
   - Employee directory tests
   - HR workflow tests
   - Admin functionality tests
   - Events and tasks tests
   - Leave request tests

3. **Page Functionality Tests** (FR-004, FR-005, FR-007, FR-008):
   - Form submission tests
   - Authentication flow tests
   - Search and filter tests
   - Pagination tests

4. **UI Reliability** (FR-009):
   - Add data-testid attributes to all components
   - Create centralized selector definitions
   - Update existing tests to use data-testid

5. **Error Handling & Edge Cases** (FR-013, FR-014):
   - Empty state tests
   - Error boundary tests
   - Network failure tests
   - Session expiration tests

6. **Performance & Validation** (FR-010, FR-015):
   - Page load time measurements
   - GraphQL response validation
   - Timestamp validation

## Progress Tracking

| Phase | Status | Artifacts | Notes |
|-------|--------|-----------|-------|
| Phase 0: Research | ✅ Complete | research.md | Research template created - requires actual research |
| Phase 1: Design | ✅ Complete | data-model.md, contracts/, quickstart.md | Design templates created - requires implementation |
| Phase 2: Tasks | ⏳ Pending | tasks.md (created by `/tasks` command) | Run `/tasks` to generate implementation tasks |

## Risk Assessment

### High Risk Items

1. **Test Database Isolation in Parallel Execution**:
   - **Risk**: Race conditions with shared database state
   - **Mitigation**: Each test gets isolated database snapshot or separate schema
   - **Alternative**: Run tests sequentially (slower but safer)

2. **Flaky Tests Due to Timing Issues**:
   - **Risk**: Network delays, slow GraphQL responses causing timeouts
   - **Mitigation**: Generous timeouts (10s default), proper `waitForNetworkIdle()`, retry logic
   - **Alternative**: Increase timeout values in vitest.config.ts

3. **CI/CD Performance Impact**:
   - **Risk**: Parallel tests consume significant CI/CD resources
   - **Mitigation**: Limit parallelism in CI/CD (e.g., 4 workers), use caching
   - **Alternative**: Run full suite only on main branch, subset on PRs

### Medium Risk Items

1. **data-testid Attribute Coverage**:
   - **Risk**: Missing data-testid on some components requires CSS selector fallback
   - **Mitigation**: Progressive rollout, prioritize P1 pages first
   - **Impact**: Tests less resilient to UI changes

2. **Test Data Seed Maintenance**:
   - **Risk**: Seed data becomes outdated as schema evolves
   - **Mitigation**: Script-based seed generation, versioned fixtures
   - **Impact**: Tests fail due to stale data

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Test Files | 20+ files | 3 files | 🔴 15% |
| Test Coverage | 80% routes | ~10% routes | 🔴 Low |
| data-testid Coverage | 95% interactive elements | ~5% | 🔴 Low |
| CI/CD Integration | Automated on every PR | Manual only | 🔴 Not configured |
| Test Execution Time | < 5 min (parallel) | ~2 min (3 tests) | 🟢 Fast |
| Test Reliability | < 5% flake rate | Unknown | 🟡 TBD |

## Dependencies

### Internal Dependencies

1. **Existing Puppeteer Infrastructure** (✅ Complete):
   - `tests/utils/puppeteer-helpers.ts` (350+ lines)
   - `tests/setup/vitest-setup-e2e-puppeteer.ts`
   - vitest.config.ts with e2e-puppeteer project
   - npm scripts for running tests

2. **GraphQL Backend** (✅ Available):
   - Rust GraphQL server running on http://localhost:4000
   - Existing queries for users, employees, events, tasks, leave requests

3. **SvelteKit Frontend** (✅ Available):
   - Running on http://localhost:5173
   - Dashboard, employees, hr, admin, events, tasks routes

### External Dependencies

1. **Puppeteer 24.26.1** (✅ Installed):
   - Better Arch Linux support than Playwright
   - Already verified working

2. **Vitest 3.2.3** (✅ Installed):
   - Test runner with Puppeteer integration
   - Parallel execution support

3. **PostgreSQL Test Database** (❌ Required):
   - Need isolated test database
   - Seed data scripts

4. **CI/CD Platform** (❌ Configuration Required):
   - GitHub Actions or similar
   - Artifact upload capability

## Implementation Sequence

1. **Phase 0: Research** (1-2 days)
   - Research Puppeteer + SvelteKit patterns
   - Research data-testid best practices
   - Research test database isolation strategies

2. **Phase 1: Design** (2-3 days)
   - Define test fixtures schema
   - Create selector contracts
   - Write quickstart guide

3. **Phase 2: Infrastructure** (3-5 days)
   - Set up isolated test database
   - Configure parallel execution
   - Implement retry logic
   - Set up CI/CD workflow

4. **Phase 3: Test Coverage** (10-15 days)
   - Add data-testid attributes to components
   - Write comprehensive E2E tests for all routes
   - Implement GraphQL validation tests
   - Add performance tests

5. **Phase 4: Validation** (2-3 days)
   - Run full test suite
   - Measure coverage
   - Fix flaky tests
   - Optimize CI/CD performance

**Total Estimated Time**: 3-4 weeks

## Next Steps

Run `/tasks` command to generate detailed implementation tasks in `tasks.md`.
