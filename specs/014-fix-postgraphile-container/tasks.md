# Tasks: Fix PostgreSQL Container Schema Initialization

**Input**: Design documents from `/specs/014-fix-postgraphile-container/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Tech stack: SQL, Docker Compose, Node.js 20, PostgreSQL 15-alpine
   → Structure: Web app (SvelteKit frontend + PostGraphile backend)
   → Libraries: PostgreSQL, PostGraphile, Docker, uuid-ossp, pgcrypto
2. Load optional design documents:
   → data-model.md: Database schemas (hr_public, hr_private, hr_hidden)
   → contracts/: container-startup.yml, postgraphile-integration.yml
   → research.md: Category-based file organization decisions
3. Generate tasks by category:
   → Setup: Initialization file organization, container configuration
   → Tests: Shell/Docker validation, schema integrity tests
   → Core: SQL initialization files, role/permission setup
   → Integration: PostGraphile connectivity, volume persistence
   → Polish: Performance validation, error handling, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Project structure**: Web app with `dev-containers/` for Docker setup
- **Initialization files**: `migrations/` directory with numbered SQL files
- **Container config**: `dev-containers/docker-compose.dev.yml`

## Phase 3.1: Setup & File Organization

- [x] T001 Create organized initialization file structure in `migrations/` directory
- [x] T002 [P] Backup existing initialization files to preserve development data
- [x] T003 [P] Update Docker volume configuration in `dev-containers/docker-compose.dev.yml`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T004 [P] Container startup validation test using shell/Docker commands in `tests/container/test_startup.sh`
- [x] T005 [P] Schema integrity test using PostgreSQL queries in `tests/container/test_schema_validation.sh`
- [x] T006 [P] Role permissions test using psql commands in `tests/container/test_roles.sh`
- [x] T007 [P] PostGraphile connectivity test using curl/GraphQL in `tests/integration/test_postgraphile.sh`
- [x] T008 [P] Performance timing test (30-second target) using shell timing in `tests/performance/test_startup_time.sh`
- [x] T009 [P] Data persistence test using Docker volume commands in `tests/integration/test_data_persistence.sh`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [x] T010 [P] Create `migrations/01-roles.sql` with PostgreSQL roles and extensions setup
- [x] T011 [P] Create `migrations/02-schema.sql` with complete HR schema tables and constraints
- [x] T012 [P] Create `migrations/03-data.sql` with seed data and default admin user
- [x] T013 [P] Create `migrations/04-indexes.sql` with performance indexes and complex constraints
- [x] T014 Update `dev-containers/docker-compose.dev.yml` with proper volume mounts and health checks
- [x] T015 Configure PostgreSQL initialization timeout and error handling

## Phase 3.4: Integration & Configuration

- [x] T016 Validate PostgreSQL container health check configuration
- [x] T017 Test PostGraphile role-based security integration
- [x] T018 Configure container networking for frontend connectivity
- [x] T019 Implement proper error logging for initialization failures
- [x] T020 Validate data volume persistence across container restarts

## Phase 3.5: Polish & Validation

- [x] T021 [P] Add comprehensive error messages for debugging in initialization scripts
- [x] T022 [P] Create container troubleshooting documentation in `dev-containers/TROUBLESHOOTING.md`
- [x] T023 [P] Performance optimization for initialization speed
- [x] T024 Run complete quickstart validation per `quickstart.md`
- [x] T025 Validate all acceptance scenarios from feature specification

## Dependencies

- Setup (T001-T003) before tests (T004-T009)
- Tests (T004-T009) before implementation (T010-T015)
- T010 (roles) blocks T011 (schema) - roles must exist first
- T011 (schema) blocks T012 (data) - tables must exist before data
- T012 (data) blocks T013 (indexes) - data should exist before performance indexes
- T014-T015 (container config) before integration (T016-T020)
- Implementation before polish (T021-T025)

## Parallel Example

```bash
# Launch T004-T009 together (different shell test files):
Task: "Container startup validation test using shell/Docker commands in tests/container/test_startup.sh"
Task: "Schema integrity test using PostgreSQL queries in tests/container/test_schema_validation.sh"
Task: "Role permissions test using psql commands in tests/container/test_roles.sh"
Task: "PostGraphile connectivity test using curl/GraphQL in tests/integration/test_postgraphile.sh"
Task: "Performance timing test using shell timing in tests/performance/test_startup_time.sh"
Task: "Data persistence test using Docker volume commands in tests/integration/test_data_persistence.sh"

# Launch T010-T013 together (different SQL files):
Task: "Create migrations/01-roles.sql with PostgreSQL roles and extensions setup"
Task: "Create migrations/02-schema.sql with complete HR schema tables and constraints"
Task: "Create migrations/03-data.sql with seed data and default admin user"
Task: "Create migrations/04-indexes.sql with performance indexes and complex constraints"
```

## Task Details

### T001: Create organized initialization file structure

**File**: `migrations/` directory structure
**Description**: Reorganize existing initialization files into the category-based approach (roles, schema, data, indexes) as defined in research.md. Ensure alphabetical ordering for predictable execution.
**Success Criteria**: Four categorized SQL files ready for PostgreSQL initialization

### T004: Container startup validation test

**File**: `tests/container/test_startup.sh`
**Description**: Create shell script that validates PostgreSQL container starts successfully within 30 seconds and accepts connections using Docker commands and psql. Must fail initially to demonstrate TDD approach.
**Success Criteria**: Shell test fails before implementation, passes after container configuration

### T007: PostGraphile connectivity test

**File**: `tests/integration/test_postgraphile.sh`
**Description**: Create shell script that validates PostGraphile can connect to initialized database and expose GraphQL schema with proper role-based access control using curl commands.
**Success Criteria**: GraphQL endpoint responds with expected schema structure via HTTP requests

### T010: Create roles and extensions SQL

**File**: `migrations/01-roles.sql`
**Description**: Create PostgreSQL roles (hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin) and enable required extensions (uuid-ossp, pgcrypto). Include basic permissions and schema creation.
**Success Criteria**: All roles created with proper hierarchy and permissions

### T014: Update Docker Compose configuration

**File**: `dev-containers/docker-compose.dev.yml`
**Description**: Update PostgreSQL service configuration with proper volume mounts, health checks, environment variables, and initialization file mapping.
**Success Criteria**: Container starts reliably with categorized SQL files executed in order

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Follow TDD strictly - no implementation without failing tests
- Commit after each task completion
- Pay attention to file execution order (01, 02, 03, 04)

## Validation Checklist

_GATE: Checked by main() before returning_

- [x] All contracts have corresponding tests (container-startup.yml → T004-T006, postgraphile-integration.yml → T007)
- [x] All entities have model tasks (Database schemas → T010-T013 SQL files)
- [x] All tests come before implementation (T004-T009 before T010-T015)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

## Context Integration

**From Research Decisions**:

- Category-based file organization (01-roles, 02-schema, 03-data, 04-indexes)
- Fail-fast error handling with clear messages
- 30-second performance target
- Complete data persistence including debugging data

**From Contracts**:

- Container health endpoint validation
- Schema validation with table count verification
- PostGraphile GraphQL interface compatibility
- Role-based security model preservation

**From Data Model**:

- Three-schema structure (hr_public, hr_private, hr_hidden)
- 16+ core tables with proper relationships
- RBAC with 5-tier role hierarchy
- RLS policies and security constraints
