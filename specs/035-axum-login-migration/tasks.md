# Tasks: Axum-Login Migration

**Input**: Design documents from `/specs/035-axum-login-migration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test-First Development required per constitution - tests written before implementation, ensuring they fail initially.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `graphql-rust-server/src/` for Rust code
- **Frontend**: `src/` for SvelteKit code
- **Tests**: `graphql-rust-server/tests/` for backend tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Add axum-login and tower-sessions dependencies to graphql-rust-server/Cargo.toml
- [x] T002 [P] Configure development environment with updated docker-compose.dev.yml
- [x] T003 [P] Update Makefile with axum-login development commands

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create database migration for user_sessions table in migrations/
- [x] T005 [P] Implement SeaORM session store in graphql-rust-server/src/auth/session_store.rs
- [x] T006 [P] Create authentication backend trait in graphql-rust-server/src/auth/backend.rs
- [x] T007 [P] Update middleware structure for axum-login integration in graphql-rust-server/src/middleware/
- [x] T008 Configure session layer with secure cookie settings in graphql-rust-server/src/main.rs
- [x] T009 Update error handling for authentication failures in graphql-rust-server/src/error.rs

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Secure Employee Login (Priority: P1) 🎯 MVP

**Goal**: Enable secure employee authentication with credential validation and role-based access

**Independent Test**: Can be fully tested by verifying login API accepts valid credentials and rejects invalid ones, establishing authenticated sessions

### Tests for User Story 1 ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Contract test for login endpoint in graphql-rust-server/tests/contract/test_auth_login.rs
- [x] T011 [P] [US1] Integration test for login/logout flow in graphql-rust-server/tests/integration/test_auth_flow.rs

### Implementation for User Story 1

- [x] T012 [P] [US1] Update UserAccount entity with session relationships in graphql-rust-server/src/models/user.rs
- [x] T013 [P] [US1] Create UserSession entity in graphql-rust-server/src/models/user_session.rs
- [x] T014 [US1] Implement authentication backend with credential validation in graphql-rust-server/src/auth/backend.rs
- [x] T015 [US1] Create login handler with session creation in graphql-rust-server/src/handlers.rs
- [ ] T016 [US1] Update GraphQL login mutation in graphql-rust-server/src/schema/mutation.rs
- [ ] T017 [US1] Add session-based authentication middleware in graphql-rust-server/src/middleware/auth.rs
- [ ] T018 [US1] Update /auth/me endpoint for session validation in graphql-rust-server/src/auth/handlers.rs

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Persistent Session Management (Priority: P2)

**Goal**: Maintain user sessions across browser interactions with proper timeout handling

**Independent Test**: Can be fully tested by verifying sessions persist across page refreshes and expire after inactivity timeout

### Tests for User Story 2 ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T019 [P] [US2] Contract test for session persistence in graphql-rust-server/tests/contract/test_session_persistence.rs
- [ ] T020 [P] [US2] Integration test for session timeout behavior in graphql-rust-server/tests/integration/test_session_timeout.rs

### Implementation for User Story 2

- [ ] T021 [US2] Implement session activity tracking in graphql-rust-server/src/auth/session_store.rs
- [ ] T022 [US2] Add session refresh mechanism in graphql-rust-server/src/auth/handlers.rs
- [ ] T023 [US2] Update session expiration logic with 30-minute timeout in graphql-rust-server/src/auth/backend.rs
- [ ] T024 [US2] Implement single active session enforcement in graphql-rust-server/src/auth/backend.rs
- [ ] T025 [US2] Add session cleanup job for expired sessions in graphql-rust-server/src/main.rs
- [ ] T026 [US2] Update GraphQL refreshSession mutation in graphql-rust-server/src/schema/mutation.rs

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Secure Logout and Account Protection (Priority: P3)

**Goal**: Provide secure logout functionality and protect against unauthorized access attempts

**Independent Test**: Can be fully tested by verifying logout terminates sessions and security measures prevent brute force attacks

### Tests for User Story 3 ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T027 [P] [US3] Contract test for logout and security features in graphql-rust-server/tests/contract/test_security.rs
- [ ] T028 [P] [US3] Integration test for brute force protection in graphql-rust-server/tests/integration/test_brute_force.rs

### Implementation for User Story 3

- [ ] T029 [US3] Implement logout handler with session destruction in graphql-rust-server/src/auth/handlers.rs
- [ ] T030 [US3] Add progressive delay mechanism for failed login attempts in graphql-rust-server/src/auth/backend.rs
- [ ] T031 [US3] Implement account lockout after failed attempts in graphql-rust-server/src/auth/backend.rs
- [ ] T032 [US3] Add rate limiting per-IP and per-account in graphql-rust-server/src/middleware/rate_limit.rs
- [ ] T033 [US3] Update SecurityEvent logging for auth failures in graphql-rust-server/src/models/security_event.rs
- [ ] T034 [US3] Update GraphQL logout mutation in graphql-rust-server/src/schema/mutation.rs

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T035 [P] Update API documentation in contracts/auth-api.yaml
- [ ] T036 [P] Add comprehensive logging for authentication events in graphql-rust-server/src/main.rs
- [ ] T037 [P] Implement CSRF protection for session management in graphql-rust-server/src/middleware/csrf.rs
- [ ] T038 Add security headers and CORS configuration in graphql-rust-server/src/main.rs
- [ ] T039 [P] Performance optimization for session queries in graphql-rust-server/src/auth/session_store.rs
- [ ] T040 [P] Add frontend authentication state management in src/lib/auth/store.ts
- [ ] T041 [P] Create login/logout UI components in src/lib/components/auth/
- [ ] T042 [P] Implement route guards for protected pages in src/lib/auth/guards.ts
- [ ] T043 Update quickstart.md with complete setup instructions
- [ ] T044 Run security audit and penetration testing validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 session infrastructure but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses US1 login infrastructure but independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for login endpoint in graphql-rust-server/tests/contract/test_auth_login.rs"
Task: "Integration test for login/logout flow in graphql-rust-server/tests/integration/test_auth_flow.rs"

# Launch all models for User Story 1 together:
Task: "Update UserAccount entity with session relationships in graphql-rust-server/src/models/user.rs"
Task: "Create UserSession entity in graphql-rust-server/src/models/session.rs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (core login)
   - Developer B: User Story 2 (session management)
   - Developer C: User Story 3 (security features)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
