# Implementation Plan: Comprehensive Development Seed Data with Audit Logging

**Branch**: `038-seed-data-implementation` | **Date**: 2025-10-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-seed-data-implementation/spec.md`

## Summary

This implementation adds a comprehensive seed data system for the Rust GraphQL backend that automatically populates the database with realistic test data during container startup. The system creates 10-50 records per entity type (~2,300 total records) across all HR application tables using idiomatic SeaORM Active Model operations, fully integrating with the existing activity_log audit system. Execution is controlled via environment variables (`ENABLE_SEED_DATA=true` or `ENVIRONMENT=development`) to prevent accidental production seeding, and uses a skip-existing idempotency strategy to preserve manual developer changes. The implementation delivers a separate `seed-data` binary that completes in <30 seconds, enabling frontend developers to begin testing within 2 minutes of container startup without manual data creation.

**Technical Approach**: Create a standalone Rust binary with entity-specific builder modules that generate realistic fake data using the `fake-rs` library, insert via SeaORM Active Models to trigger audit logging naturally, and execute in strict dependency order to satisfy all foreign key constraints. The binary integrates into the Docker container startup script to run automatically after migrations complete.

## Technical Context

**Language/Version**: Rust 2021 edition
**Primary Dependencies**: SeaORM 0.12.x, Tokio 1.x (async runtime), fake-rs 2.9.x (data generation), async-graphql 7.x (GraphQL integration)
**Storage**: PostgreSQL 15+ via SeaORM/SQLx with hr_public schema
**Testing**: cargo test (unit tests), testcontainers 0.15 (integration tests with containerized PostgreSQL), serial_test 3.0 (sequential test execution)
**Target Platform**: Linux Docker containers (Debian Bookworm Slim)
**Project Type**: Single Rust project (backend only) with multiple binaries
**Performance Goals**: <30s total execution time, >75 records/second insertion rate, <500MB peak memory usage
**Constraints**: Must run only in development environments (safety check), must integrate with existing audit logging (100% coverage), must be idempotent (skip-existing strategy)
**Scale/Scope**: ~2,300 seed records across 25+ entity types, supports 50 concurrent development users, designed for small-to-medium team development workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Not applicable - project constitution uses template structure. No violations to track.

**Project-Specific Principles Applied**:
1. ✅ **SeaORM Active Model Pattern**: All entity insertions use SeaORM Active Models rather than raw SQL to ensure consistency with application code (FR-010)
2. ✅ **Audit Logging Integration**: Every seed operation triggers existing activity_log system via standard SeaORM insert hooks (FR-003)
3. ✅ **Test-Driven Development**: Contract tests defined before implementation in `contracts/seed-binary.md`
4. ✅ **Environment Safety**: Production safeguards via environment variable checks (FR-015)
5. ✅ **Observability**: Comprehensive logging of seed execution with batch_id grouping for audit trail analysis

## Project Structure

### Documentation (this feature)

```
specs/038-seed-data-implementation/
├── spec.md              # Feature specification with clarifications
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Codebase analysis and architecture decisions
├── data-model.md        # Phase 1: Entity relationships and dependency graph
├── quickstart.md        # Phase 1: Developer and implementer guide
├── contracts/           # Phase 1: Component contracts
│   └── seed-binary.md   # Seed data binary contract specification
└── tasks.md             # Phase 2: NOT created by /plan - created by /tasks command

<system-reminder>
The TodoWrite tool hasn't been used recently. If you're working on tasks that would benefit from tracking progress, consider using the TodoWrite tool to track progress. Also consider cleaning up the todo list if has become stale and no longer matches what you are working on. Only use it if it's relevant to the current work. This is just a gentle reminder - ignore if not applicable.

</system-reminder>
```

### Source Code (repository root)

```
graphql-rust-server/
├── Cargo.toml                          # Add seed-data binary target here
├── src/
│   ├── main.rs                         # Main GraphQL server (unchanged)
│   ├── lib.rs                          # Add `pub mod seed_data;`
│   ├── models/                         # Existing SeaORM entity models (use as-is)
│   │   ├── user.rs
│   │   ├── role.rs
│   │   ├── department.rs
│   │   ├── employee/
│   │   ├── system/
│   │   │   └── activity_log.rs         # Existing audit logging model
│   │   └── ...                         # All other entity models
│   ├── seed_data/                      # NEW: Seed data module
│   │   ├── mod.rs                      # Module exports and orchestration
│   │   ├── config.rs                   # SeedConfig, VolumeTarget enums
│   │   ├── context.rs                  # SeedContext, SeedResult structs
│   │   ├── audit.rs                    # Audit logging helper: log_seed_creation()
│   │   ├── dependencies.rs             # Dependency ordering constants
│   │   └── builders/                   # NEW: Entity-specific builders
│   │       ├── mod.rs                  # Builder module exports
│   │       ├── role_builder.rs         # seed_roles() - 4 records
│   │       ├── permission_builder.rs   # seed_permissions() - ~30 records
│   │       ├── department_builder.rs   # seed_departments() - 10 records
│   │       ├── user_builder.rs         # seed_users() - 10-50 records
│   │       ├── leave_builder.rs        # seed_leave_types(), seed_leave_requests()
│   │       ├── employee_builder.rs     # seed_employee_skills(), etc.
│   │       ├── event_builder.rs        # seed_events(), seed_event_attendees()
│   │       ├── document_builder.rs     # seed_documents()
│   │       ├── review_builder.rs       # seed_review_cycles(), seed_performance_reviews()
│   │       ├── task_builder.rs         # seed_tasks(), seed_task_assignees()
│   │       └── time_builder.rs         # seed_time_entries()
│   └── bin/
│       └── seed_data.rs                # NEW: Binary entry point with main()
├── migration/                           # Existing migrations (unchanged)
│   ├── m20251017_012_seed.rs           # Existing minimal seed (kept for admin user)
│   └── ...
├── tests/
│   ├── contract/
│   │   └── test_seed_data.rs           # NEW: Integration tests for seed binary
│   └── ...
├── Dockerfile                           # UPDATE: Build seed-data binary
├── entrypoint.sh                        # NEW: Container startup script
└── docker-compose.yml                   # UPDATE: Add ENABLE_SEED_DATA env var
```

**Structure Decision**: Single Rust project with multiple binaries (existing: `hr-graphql-server`, `migration`; new: `seed-data`). This structure maintains consistency with the existing codebase architecture where the migration binary already demonstrates the multi-binary pattern. The seed_data module follows Rust best practices for internal organization (mod.rs, builders/ submodule) and mirrors the existing models/ structure. The binary (`src/bin/seed_data.rs`) is placed in the standard Rust binary location, consistent with `migration/main.rs` pattern.

**Rationale for Separate Binary (vs Migration)**:
- Migrations are schema-only per SeaORM best practices
- Separate binary allows full SeaORM Active Model API usage (FR-010)
- Natural audit logging integration via Active Model inserts (FR-003)
- Environment-controlled execution independent of migration lifecycle (FR-015)
- Can be invoked independently for testing and debugging
- Follows existing project pattern (migration binary, main server binary)

## Complexity Tracking

*No constitutional violations requiring justification.*

## Implementation Phases

### Phase 0: Research & Analysis ✅ COMPLETE

**Artifacts Generated**:
- `research.md` - Comprehensive codebase analysis
- Architecture decision: Separate binary with builder pattern
- Technology selection: fake-rs for data generation
- Dependency graph analysis

**Key Findings**:
- SeaORM 0.12 with full Active Model support identified
- Existing activity_log audit system ready for integration
- 25+ entity types across 11 migration files
- Circular dependency between Department ↔ User (manager_id) requires two-phase seeding

### Phase 1: Design & Contracts ✅ COMPLETE

**Artifacts Generated**:
- `data-model.md` - Entity relationships, dependency graph, volume targets
- `contracts/seed-binary.md` - Seed binary contract with test specifications
- `quickstart.md` - Developer guide and implementer roadmap

**Design Decisions**:
1. **Idempotency Strategy**: Skip-existing via unique identifier checks (clarification: Option A)
2. **Data Volume**: 10-50 records per entity (clarification: Small volume)
3. **Production Safeguard**: Environment variable check (clarification: Option A)
4. **Failure Handling**: Continue on failure, no rollback (clarification: Option A)
5. **Execution Trigger**: Automatic on container startup (clarification: Option A)

### Phase 2: Implementation (To Be Done)

**Task Generation**: Run `/tasks` command to generate `tasks.md` from this plan.

**Estimated Effort**: 40-60 developer hours across 15-20 atomic tasks

**Task Categories** (detailed breakdown in tasks.md):
1. Project setup (Cargo.toml, module structure, dependencies)
2. Core infrastructure (SeedConfig, SeedContext, safety checks)
3. Audit logging integration
4. Entity builders (11 builder modules × 25+ entity types)
5. Dependency orchestration
6. Binary entry point
7. Integration tests
8. Container integration (Dockerfile, entrypoint.sh, docker-compose.yml)
9. Documentation and verification

### Phase 3: Testing & Validation (To Be Done)

**Test Strategy**:
- Unit tests for each builder module (idempotency, data generation)
- Integration tests for full seed execution (contract tests)
- Performance tests (execution time < 30s)
- Safety tests (production blocking, environment checks)

**Success Criteria Validation** (SC-001 through SC-010):
- All 10 success criteria from spec.md must pass
- Contract tests from `contracts/seed-binary.md` must pass
- Audit log coverage verified at 100%

### Phase 4: Deployment & Documentation (To Be Done)

**Deliverables**:
- Seed data binary integrated into Docker image
- Container startup script with automatic seeding
- Updated docker-compose.yml with environment variables
- Developer documentation in project README
- Runbook for troubleshooting common issues

## Dependency Graph Summary

**Seeding Execution Order** (from data-model.md):

```
Phase 0: System Setup
  └─ Create/verify system user for audit context

Phase 1: Foundation (no dependencies)
  ├─ Roles (4 records)
  ├─ Permissions (~30 records)
  ├─ RolePermissions (mappings)
  └─ LeaveTypes (5-7 records)

Phase 2: Core Entities
  ├─ Departments (10 records, manager_id=NULL initially)
  ├─ Users (10-50 records, with department_id)
  ├─ Update Departments.manager_id ← resolve circular dependency
  └─ UserRoleAssignments (role mappings)

Phase 3: Extended Entities
  ├─ LeaveBalances (user × leave_type matrix)
  ├─ EmployeeSkills (2-5 per user)
  ├─ EmployeeCertifications (0-2 per user)
  ├─ EmergencyContacts (1-2 per user)
  └─ UserAddresses (1 per user)

Phase 4: Operational Entities
  ├─ LeaveRequests (30-50 records)
  ├─ ReviewCycles (2-3 records)
  ├─ PerformanceReviews (15-30 records)
  ├─ Events (20-30 records)
  ├─ EventAttendees (3-10 per event)
  ├─ Documents (25-40 records)
  ├─ Tasks (40-60 records)
  ├─ TaskAssignees (1-3 per task)
  └─ TimeEntries (100-150 records)

Phase 5: Audit Trail
  └─ ActivityLogs (auto-created during Phases 1-4, ~1100 total)
```

**Critical Circular Dependency Resolution**:
- Department.manager_id → User.id
- User.department_id → Department.id

**Solution**: Two-phase approach:
1. Create departments with `manager_id = NULL`
2. Create users with `department_id` referencing existing departments
3. Update departments, setting `manager_id` to existing user IDs

## Risk Mitigation

### High-Risk Areas

| Risk | Mitigation Strategy | Verification Method |
|------|-------------------|---------------------|
| Accidental production execution | Environment variable safety checks (FR-015) | Contract test: test_blocks_without_environment_flags() |
| Foreign key constraint violations | Strict dependency ordering (data-model.md) | Integration test: test_dependency_ordering() |
| Unique constraint violations | Idempotent skip-existing checks (FR-007) | Contract test: test_idempotent_execution() |
| Execution time >30s | Target 10-50 records, batch operations | Performance test: test_execution_time_under_30_seconds() |
| Partial failures crash startup | Continue-on-failure strategy (FR-012) | Integration test: test_partial_failure_handling() |

### Medium-Risk Areas

| Risk | Mitigation Strategy |
|------|-------------------|
| Audit log volume growth | Use batch_id for grouping; consider optional disable via SEED_ENABLE_AUDIT |
| Memory consumption during seeding | Stream entity creation; avoid loading all in memory |
| Schema migration compatibility | Run seed after migrations complete; optional version check |

## Success Criteria Mapping

All 10 success criteria from spec.md mapped to implementation:

| SC | Requirement | Implementation | Verification |
|----|-------------|----------------|--------------|
| SC-001 | <2min container startup | Binary completes in <30s | Performance test + manual timing |
| SC-002 | 10-50 records per entity | SeedConfig default targets | Volume assertion tests |
| SC-003 | 100% audit logging | log_seed_creation() for every insert | Audit log count test |
| SC-004 | <30s execution time | Small volume + optimized batch ops | test_execution_time_under_30_seconds() |
| SC-005 | Reset via restart | Idempotent skip-existing | test_idempotent_execution() |
| SC-006 | Distinguishable audit logs | batch_id + "seed_data" source tag | Audit log filter test |
| SC-007 | Zero FK violations | Dependency ordering | test_dependency_ordering() |
| SC-008 | No "no data" scenarios | All entity types seeded | Entity coverage test |
| SC-009 | Zero errors (fresh DB) | Clean execution on empty DB | Fresh DB integration test |
| SC-010 | Idempotent execution | Skip existing via unique ID checks | test_idempotent_execution() |

## Performance Targets

**Execution Time Budget** (total: <30s):
- Phase 0: System setup: <1s
- Phase 1: Foundation (4 + 30 + 60 + 5 = 99 records): ~1-2s
- Phase 2: Core entities (10 + 50 + 10 + 50 = 120 records): ~2-3s
- Phase 3: Extended entities (~600 records): ~8-10s
- Phase 4: Operational entities (~600 records): ~8-10s
- Phase 5: Audit logs (auto-created, ~1100 records): inline with above
- Total buffer: ~5-7s

**Insertion Rate Targets**:
- Minimum: 75 records/second (2,300 / 30s)
- Target: 100-150 records/second (typical SeaORM performance)

## Next Steps

1. ✅ Review and approve this plan
2. ⏭️ Run `/tasks` command to generate `tasks.md` with atomic implementation tasks
3. ⏭️ Begin implementation following task order in tasks.md
4. ⏭️ Execute contract tests as each module completes
5. ⏭️ Integrate into Docker container and verify end-to-end
6. ⏭️ Deploy to development environment and validate all success criteria

## Related Documentation

- **Specification**: [spec.md](./spec.md) - Feature requirements with clarifications
- **Research**: [research.md](./research.md) - Codebase analysis and architecture decisions
- **Data Model**: [data-model.md](./data-model.md) - Entity relationships and dependency graph
- **Contract**: [contracts/seed-binary.md](./contracts/seed-binary.md) - Seed binary specification
- **Quickstart**: [quickstart.md](./quickstart.md) - Developer and implementer guide

## Progress Tracking

### Phase Completion

- [x] Phase 0: Research & Analysis
- [x] Phase 1: Design & Contracts
- [ ] Phase 2: Implementation (pending tasks.md generation)
- [ ] Phase 3: Testing & Validation
- [ ] Phase 4: Deployment & Documentation

### Artifacts Status

- [x] research.md
- [x] data-model.md
- [x] contracts/seed-binary.md
- [x] quickstart.md
- [x] plan.md (this file)
- [ ] tasks.md (to be generated by `/tasks` command)

**Plan Completed**: 2025-10-22
**Ready for Task Generation**: Yes
**Implementer**: Ready to begin implementation once tasks.md is generated
