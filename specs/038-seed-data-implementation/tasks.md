# Tasks: Comprehensive Development Seed Data with Audit Logging

**Input**: Design documents from `/specs/038-seed-data-implementation/`
**Branch**: `038-seed-data-implementation`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/seed-binary.md, quickstart.md

**Organization**: Tasks are organized by implementation phase following the dependency order from plan.md. All user stories are served by a single seed-data binary, so tasks are not split by story but by technical component.

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- Single Rust project: `graphql-rust-server/src/`, `graphql-rust-server/tests/`
- New module: `src/seed_data/` with builders submodule
- New binary: `src/bin/seed_data.rs`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Project structure, dependencies, and module scaffolding

- [ ] T001 Add seed-data binary target to `graphql-rust-server/Cargo.toml` [[bin]] section
- [ ] T002 Add `fake` dependency to `graphql-rust-server/Cargo.toml` with features ["derive", "chrono", "uuid"]
- [ ] T003 Create seed_data module structure: `src/seed_data/mod.rs`
- [ ] T004 [P] Create `src/seed_data/config.rs` stub file
- [ ] T005 [P] Create `src/seed_data/context.rs` stub file
- [ ] T006 [P] Create `src/seed_data/audit.rs` stub file
- [ ] T007 [P] Create `src/seed_data/dependencies.rs` stub file
- [ ] T008 Create `src/seed_data/builders/mod.rs` directory and module
- [ ] T009 Add `pub mod seed_data;` to `src/lib.rs`
- [ ] T010 Create binary entry point stub at `src/bin/seed_data.rs`

**Checkpoint**: Project structure complete, compiles without errors

---

## Phase 2: Core Infrastructure (Foundational)

**Purpose**: Core types, environment safety, and audit integration that ALL builders depend on

**⚠️ CRITICAL**: No entity builder implementation can begin until this phase is complete

### Configuration & Context

- [ ] T011 Implement `VolumeTarget` enum in `src/seed_data/config.rs` (Small, Medium, Large)
- [ ] T012 Implement `EntityType` enum in `src/seed_data/config.rs` with all 25+ entity variants
- [ ] T013 Implement `SeedConfig` struct in `src/seed_data/config.rs` with from_env() method
- [ ] T014 Implement `SeedContext` struct in `src/seed_data/context.rs` with system_user_id, batch_id, started_at
- [ ] T015 Implement `EntitySeedResult` struct in `src/seed_data/context.rs` with created/skipped/failed counts
- [ ] T016 Implement `SeedResult` struct in `src/seed_data/context.rs` with aggregation methods

### Safety & Error Handling

- [ ] T017 Implement `check_environment_safety()` function in `src/bin/seed_data.rs` (FR-015 contract)
- [ ] T018 Implement `SeedError` enum in `src/seed_data/mod.rs` with all error variants
- [ ] T019 Add error handling and Result<> types to all public functions in seed_data module

### Audit Integration

- [ ] T020 Implement `log_seed_creation()` helper in `src/seed_data/audit.rs` using activity_log::ActiveModel
- [ ] T021 Implement `initialize_seed_context()` in `src/seed_data/context.rs` to find/create system user
- [ ] T022 Add batch_id and source="seed_data" tags to audit log details JSON

### Dependency Management

- [ ] T023 Define `SEEDING_ORDER` constant in `src/seed_data/dependencies.rs` with 5-phase structure
- [ ] T024 Implement dependency resolution logic for circular Department ↔ User relationship

**Checkpoint**: Foundation ready - all builder modules can now use SeedContext, SeedConfig, and audit logging

---

## Phase 3: Foundation Entity Builders (No Dependencies)

**Purpose**: Entities with no foreign key dependencies - can be created first

**Goal**: Roles, Permissions, LeaveTypes seeded and available for dependent entities

### Tests (Write First, Ensure They Fail)

- [ ] T025 [P] Contract test for environment safety check in `tests/contract/test_seed_data.rs::test_blocks_without_environment_flags`
- [ ] T026 [P] Contract test for idempotent execution in `tests/contract/test_seed_data.rs::test_idempotent_execution`
- [ ] T027 [P] Unit test for role builder in `src/seed_data/builders/role_builder.rs::tests::test_seed_roles_idempotent`

### Implementation

- [ ] T028 [P] Implement `seed_roles()` in `src/seed_data/builders/role_builder.rs` (4 fixed roles)
- [ ] T029 [P] Implement `seed_permissions()` in `src/seed_data/builders/permission_builder.rs` (~30 permissions)
- [ ] T030 [P] Implement `seed_leave_types()` in `src/seed_data/builders/leave_builder.rs` (5-7 types)
- [ ] T031 Implement `seed_role_permissions()` in `src/seed_data/builders/role_builder.rs` (role-permission mappings)
- [ ] T032 Add skip-existing checks using unique identifiers for all foundation builders
- [ ] T033 Add audit logging calls to all foundation builders using `log_seed_creation()`

**Checkpoint**: Foundation entities (roles, permissions, leave types) seed successfully with audit logs

---

## Phase 4: Core Entity Builders (Foundation Dependencies)

**Purpose**: Departments and Users with circular dependency resolution

**Goal**: Core organizational structure established for operational entities

### Tests (Write First)

- [ ] T034 [P] Contract test for dependency ordering in `tests/contract/test_seed_data.rs::test_dependency_ordering`
- [ ] T035 [P] Unit test for department builder in `src/seed_data/builders/department_builder.rs::tests::test_seed_departments`
- [ ] T036 [P] Unit test for user builder in `src/seed_data/builders/user_builder.rs::tests::test_seed_users_with_roles`

### Implementation

- [ ] T037 Implement `seed_departments()` in `src/seed_data/builders/department_builder.rs` (10 depts, manager_id=NULL initially)
- [ ] T038 Implement `seed_users()` in `src/seed_data/builders/user_builder.rs` (10-50 users with realistic names via fake-rs)
- [ ] T039 Implement user email generation pattern (user1@mountainhr.dev ... userN@) with idempotency checks
- [ ] T040 Implement bcrypt password hashing for all users (use pre-computed hash for "password123")
- [ ] T041 Implement department assignment for users (assign to existing departments)
- [ ] T042 Implement manager hierarchy assignment for users (self-referential user.manager_id)
- [ ] T043 Implement `update_department_managers()` in `src/seed_data/builders/department_builder.rs` (resolve circular dependency)
- [ ] T044 Implement `seed_user_role_assignments()` in `src/seed_data/builders/user_builder.rs` (assign roles per distribution)
- [ ] T045 Add audit logging for all core entity creations

**Checkpoint**: Departments and users with role assignments seed successfully, circular dependency resolved

---

## Phase 5: Extended Entity Builders (Core Dependencies)

**Purpose**: Employee-related entities that depend on users

**Goal**: Rich employee profiles for realistic testing

### Tests (Write First)

- [ ] T046 [P] Unit test for employee skill builder in `src/seed_data/builders/employee_builder.rs::tests::test_seed_employee_skills`
- [ ] T047 [P] Unit test for leave balance builder in `src/seed_data/builders/leave_builder.rs::tests::test_seed_leave_balances`

### Implementation (All Parallel - Different Entities)

- [ ] T048 [P] Implement `seed_leave_balances()` in `src/seed_data/builders/leave_builder.rs` (user × leave_type matrix)
- [ ] T049 [P] Implement `seed_employee_skills()` in `src/seed_data/builders/employee_builder.rs` (2-5 skills per user)
- [ ] T050 [P] Implement `seed_employee_certifications()` in `src/seed_data/builders/employee_builder.rs` (0-2 per user)
- [ ] T051 [P] Implement `seed_emergency_contacts()` in `src/seed_data/builders/employee_builder.rs` (1-2 per user)
- [ ] T052 [P] Implement `seed_user_addresses()` in `src/seed_data/builders/employee_builder.rs` (1 per user)
- [ ] T053 Use fake-rs library for realistic names, phone numbers, addresses, skill names
- [ ] T054 Add audit logging for all extended entity creations

**Checkpoint**: Employee profiles enriched with skills, certifications, contacts, addresses

---

## Phase 6: Operational Entity Builders (Multiple Dependencies)

**Purpose**: Business operational data that depends on multiple entity types

**Goal**: Realistic leave requests, events, documents, reviews, tasks, time entries

### Tests (Write First)

- [ ] T055 [P] Contract test for audit logging in `tests/contract/test_seed_data.rs::test_creates_audit_logs`
- [ ] T056 [P] Contract test for execution time in `tests/contract/test_seed_data.rs::test_execution_time_under_30_seconds`

### Implementation (Sequential by Dependencies)

#### Leave & Time Off
- [ ] T057 Implement `seed_leave_requests()` in `src/seed_data/builders/leave_builder.rs` (30-50 requests, mixed statuses)

#### Events & Calendar
- [ ] T058 [P] Implement `seed_events()` in `src/seed_data/builders/event_builder.rs` (20-30 events, past/current/future)
- [ ] T059 Implement `seed_event_attendees()` in `src/seed_data/builders/event_builder.rs` (3-10 per event, mixed RSVP)

#### Documents
- [ ] T060 [P] Implement `seed_documents()` in `src/seed_data/builders/document_builder.rs` (25-40 metadata records, no files)

#### Performance Reviews
- [ ] T061 [P] Implement `seed_review_cycles()` in `src/seed_data/builders/review_builder.rs` (2-3 cycles)
- [ ] T062 Implement `seed_performance_reviews()` in `src/seed_data/builders/review_builder.rs` (15-30 reviews)

#### Tasks & Assignments
- [ ] T063 [P] Implement `seed_tasks()` in `src/seed_data/builders/task_builder.rs` (40-60 tasks, mixed statuses)
- [ ] T064 Implement `seed_task_assignees()` in `src/seed_data/builders/task_builder.rs` (1-3 per task)

#### Time Tracking
- [ ] T065 [P] Implement `seed_time_entries()` in `src/seed_data/builders/time_builder.rs` (100-150 entries, past 2 weeks)

#### Audit Logging
- [ ] T066 Add audit logging calls to all operational builders
- [ ] T067 Verify batch_id consistency across all audit log entries

**Checkpoint**: All operational entities seeded with realistic relationships and audit trail

---

## Phase 7: Binary Entry Point & Orchestration

**Purpose**: Wire all builders together in correct dependency order

**Goal**: Functional seed-data binary that executes full seeding workflow

- [ ] T068 Implement `main()` function in `src/bin/seed_data.rs` with full workflow
- [ ] T069 Call `check_environment_safety()` before any database operations (fail fast)
- [ ] T070 Implement database connection setup using `create_db_connection()`
- [ ] T071 Call `initialize_seed_context()` to set up system user and batch_id
- [ ] T072 Implement orchestrator to call builders in SEEDING_ORDER from dependencies.rs
- [ ] T073 Implement continue-on-failure error handling (log and continue per FR-012)
- [ ] T074 Implement `SeedResult` aggregation across all entity types
- [ ] T075 Implement console output formatting (INFO logs during execution, summary at end)
- [ ] T076 Implement exit code logic (0=success, 1=safety, 2=db error, 3=partial failure)

**Checkpoint**: Binary compiles and executes full seeding workflow with proper error handling

---

## Phase 8: Integration Tests

**Purpose**: Validate complete seed data system against contract requirements

**Goal**: All contract tests pass, success criteria verified

### Contract Tests (From contracts/seed-binary.md)

- [ ] T077 [P] Implement `test_blocks_without_environment_flags()` verifying FR-015 production safety
- [ ] T078 [P] Implement `test_allows_with_enable_flag()` verifying ENABLE_SEED_DATA=true works
- [ ] T079 [P] Implement `test_allows_with_development_environment()` verifying ENVIRONMENT=development works
- [ ] T080 [P] Implement `test_idempotent_execution()` verifying skip-existing strategy (run twice)
- [ ] T081 [P] Implement `test_creates_audit_logs()` verifying 100% audit log coverage
- [ ] T082 [P] Implement `test_dependency_ordering()` verifying foreign key constraint satisfaction
- [ ] T083 Implement `test_execution_time_under_30_seconds()` with SeedConfig::default()

### Integration Scenarios

- [ ] T084 [P] Test fresh database seeding (all records created, zero skipped)
- [ ] T085 [P] Test re-run seeding (all records skipped, zero created)
- [ ] T086 [P] Test partial failure handling (mock failure, verify continues)
- [ ] T087 [P] Test audit log batch_id grouping (verify all logs have same batch_id)

**Checkpoint**: All 10 success criteria (SC-001 through SC-010) verified via tests

---

## Phase 9: Container Integration

**Purpose**: Integrate seed-data binary into Docker container startup workflow

**Goal**: Automatic seeding on container startup in development environments

- [ ] T088 Update `graphql-rust-server/Dockerfile` to build seed-data binary in release mode
- [ ] T089 Create `graphql-rust-server/entrypoint.sh` startup script
- [ ] T090 Add migration execution to entrypoint.sh (run first)
- [ ] T091 Add conditional seed-data execution to entrypoint.sh (check ENABLE_SEED_DATA or ENVIRONMENT)
- [ ] T092 Add error handling in entrypoint.sh (log warning but continue if seed fails)
- [ ] T093 Add server startup to entrypoint.sh (exec hr-graphql-server)
- [ ] T094 Make entrypoint.sh executable (chmod +x)
- [ ] T095 Update `graphql-rust-server/docker-compose.yml` to add ENABLE_SEED_DATA environment variable
- [ ] T096 Set ENABLE_SEED_DATA=true in docker-compose.yml for development service
- [ ] T097 Add SEED_VOLUME_TARGET=small environment variable (optional)
- [ ] T098 Update Dockerfile ENTRYPOINT to use entrypoint.sh

**Checkpoint**: Container starts, runs migrations, runs seed-data, starts server automatically

---

## Phase 10: Documentation & Verification

**Purpose**: Final documentation updates and end-to-end verification

**Goal**: Feature complete, all success criteria validated, ready for deployment

- [ ] T099 [P] Add seed-data binary usage documentation to `graphql-rust-server/README.md`
- [ ] T100 [P] Document environment variables in README (ENABLE_SEED_DATA, SEED_VOLUME_TARGET, etc.)
- [ ] T101 [P] Add troubleshooting section to README (based on quickstart.md)
- [ ] T102 Test container startup end-to-end (docker-compose up from scratch)
- [ ] T103 Verify seed data visible in GraphQL playground (query users, departments, etc.)
- [ ] T104 Verify audit logs created (query activity_logs with batch_id)
- [ ] T105 Test login with seeded users (admin@mountainhr.dev, user1@mountainhr.dev)
- [ ] T106 Measure and document actual execution time (should be <30s)
- [ ] T107 Verify idempotent re-run (restart container, verify skips existing)
- [ ] T108 Run full test suite: `cargo test --bin seed-data`
- [ ] T109 Verify all 10 success criteria from spec.md are met
- [ ] T110 Update quickstart.md with any implementation-specific notes (if needed)

**Checkpoint**: Feature complete and verified - ready for merge to main

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Core Infrastructure)**: Depends on Phase 1 completion - **BLOCKS ALL builders**
- **Phase 3 (Foundation Builders)**: Depends on Phase 2 completion
- **Phase 4 (Core Builders)**: Depends on Phase 3 completion (needs roles, permissions, leave types)
- **Phase 5 (Extended Builders)**: Depends on Phase 4 completion (needs users and departments)
- **Phase 6 (Operational Builders)**: Depends on Phase 5 completion (needs enriched user profiles)
- **Phase 7 (Binary Orchestration)**: Depends on Phases 3-6 completion (all builders ready)
- **Phase 8 (Integration Tests)**: Depends on Phase 7 completion (binary functional)
- **Phase 9 (Container Integration)**: Depends on Phase 8 completion (tests passing)
- **Phase 10 (Documentation)**: Depends on Phase 9 completion (container working)

### Within Each Phase

- **Setup tasks**: Can run in parallel except T009 (depends on T003-T008)
- **Core Infrastructure**: T011-T016 parallel, T017-T019 parallel, T020-T022 sequential, T023-T024 parallel
- **Foundation Builders**: T025-T027 (tests) parallel, T028-T030 (builders) parallel, T031-T033 sequential
- **Core Builders**: T034-T036 (tests) parallel, T037-T045 mostly sequential due to circular dependency
- **Extended Builders**: T046-T047 (tests) parallel, T048-T052 (builders) all parallel, T053-T054 apply to all
- **Operational Builders**: T055-T056 (tests) parallel, builders mostly parallel within categories
- **Binary**: T068-T076 mostly sequential (orchestration logic)
- **Integration Tests**: T077-T083 (contract tests) all parallel, T084-T087 (integration) all parallel
- **Container**: T088-T098 mostly sequential (build steps)
- **Documentation**: T099-T101 parallel, T102-T110 sequential (verification steps)

### Critical Path

```
T001-T010 (Setup) →
T011-T024 (Core Infrastructure) →
T028-T033 (Foundation Builders) →
T037-T045 (Core Builders) →
T048-T054 (Extended Builders) →
T057-T067 (Operational Builders) →
T068-T076 (Binary Orchestration) →
T077-T087 (Integration Tests) →
T088-T098 (Container Integration) →
T102-T110 (Verification)
```

**Estimated Total Duration**: 40-60 developer hours (as per plan.md)

---

## Parallel Execution Examples

### Phase 1: Setup (Parallel Module Creation)

```bash
# These 4 tasks can run in parallel - different files:
Task: "Create src/seed_data/config.rs stub file"
Task: "Create src/seed_data/context.rs stub file"
Task: "Create src/seed_data/audit.rs stub file"
Task: "Create src/seed_data/dependencies.rs stub file"
```

### Phase 3: Foundation Entity Builders

```bash
# These 3 builders can run in parallel - different entities:
Task: "Implement seed_roles() in src/seed_data/builders/role_builder.rs"
Task: "Implement seed_permissions() in src/seed_data/builders/permission_builder.rs"
Task: "Implement seed_leave_types() in src/seed_data/builders/leave_builder.rs"
```

### Phase 5: Extended Entity Builders

```bash
# All 5 extended builders can run in parallel - different entities:
Task: "Implement seed_leave_balances() in src/seed_data/builders/leave_builder.rs"
Task: "Implement seed_employee_skills() in src/seed_data/builders/employee_builder.rs"
Task: "Implement seed_employee_certifications() in src/seed_data/builders/employee_builder.rs"
Task: "Implement seed_emergency_contacts() in src/seed_data/builders/employee_builder.rs"
Task: "Implement seed_user_addresses() in src/seed_data/builders/employee_builder.rs"
```

### Phase 8: Contract Tests

```bash
# All contract tests can run in parallel - independent test files:
Task: "Implement test_blocks_without_environment_flags() in tests/contract/test_seed_data.rs"
Task: "Implement test_allows_with_enable_flag() in tests/contract/test_seed_data.rs"
Task: "Implement test_idempotent_execution() in tests/contract/test_seed_data.rs"
Task: "Implement test_creates_audit_logs() in tests/contract/test_seed_data.rs"
Task: "Implement test_dependency_ordering() in tests/contract/test_seed_data.rs"
```

---

## Implementation Strategy

### Recommended Sequence (Single Developer)

1. **Days 1-2**: Complete Phases 1-2 (Setup + Core Infrastructure)
   - Focus: Get foundation right - config, context, safety checks, audit integration
   - Milestone: `cargo build` succeeds, core types compile

2. **Days 3-4**: Complete Phases 3-4 (Foundation + Core Builders)
   - Focus: Roles, permissions, departments, users with circular dependency resolution
   - Milestone: Can seed core entities and see audit logs

3. **Days 5-6**: Complete Phases 5-6 (Extended + Operational Builders)
   - Focus: Employee profiles, leave requests, events, documents, reviews, tasks, time
   - Milestone: All 2,300+ records seeding successfully

4. **Day 7**: Complete Phase 7 (Binary Orchestration)
   - Focus: Wire everything together in correct order
   - Milestone: `./seed-data` binary runs end-to-end

5. **Days 8-9**: Complete Phase 8 (Integration Tests)
   - Focus: Verify all contract requirements and success criteria
   - Milestone: All tests pass, <30s execution verified

6. **Day 10**: Complete Phases 9-10 (Container + Documentation)
   - Focus: Docker integration and final verification
   - Milestone: Container auto-seeds on startup, all docs updated

### Parallel Team Strategy (3 Developers)

**After Phase 2 (Foundation) completes**:

- **Developer A**: Phase 3-4 (Foundation & Core Builders)
- **Developer B**: Phase 5 (Extended Builders)
- **Developer C**: Phase 6 (Operational Builders)

Then converge for Phases 7-10 (orchestration, testing, container, docs).

---

## Success Criteria Checklist

Map tasks to success criteria from spec.md:

- [ ] **SC-001**: <2min container startup → Verify with T102, T106
- [ ] **SC-002**: 10-50 records per entity → Verify with T109, check SeedConfig defaults
- [ ] **SC-003**: 100% audit logging → Verify with T055, T081
- [ ] **SC-004**: <30s execution time → Verify with T056, T083, T106
- [ ] **SC-005**: Reset via restart → Verify with T107 (idempotent re-run)
- [ ] **SC-006**: Distinguishable audit logs → Verify with T087 (batch_id grouping)
- [ ] **SC-007**: Zero FK violations → Verify with T034, T082
- [ ] **SC-008**: No "no data" scenarios → Verify with T103 (all entities queryable)
- [ ] **SC-009**: Zero errors (fresh DB) → Verify with T084
- [ ] **SC-010**: Idempotent execution → Verify with T080, T085, T107

---

## Notes

- All tasks reference absolute file paths within `graphql-rust-server/` directory
- [P] markers indicate tasks that can safely run in parallel (different files)
- Tasks without [P] must run sequentially or have explicit dependencies
- Each phase builds on previous phases - respect dependency order
- Commit after completing each phase for rollback safety
- Run `cargo test` after each builder implementation to catch issues early
- Use `tracing::info!` for console output, not `println!`
- Follow existing SeaORM patterns from `src/models/` for consistency
- Reference `contracts/seed-binary.md` for exact contract requirements
- Use `quickstart.md` for implementation examples and troubleshooting
