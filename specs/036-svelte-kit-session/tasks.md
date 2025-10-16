# Tasks: SvelteKit Session Authentication Migration

**Input**: Design documents from `/specs/036-svelte-kit-session/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test tasks included - tests not requested in feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/` for Rust API, `src/` for SvelteKit frontend
- All paths are absolute from repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize Rust backend project with axum-login dependencies
- [ ] T003 Initialize SvelteKit frontend project with session handling dependencies
- [ ] T004 [P] Configure linting and formatting tools for both frontend and backend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Setup PostgreSQL database schema for session storage
- [x] T006 [P] Implement axum-login authentication backend in graphql-rust-server/src/auth/mod.rs
- [x] T007 [P] Configure session store with secure cookie settings in graphql-rust-server/src/main.rs
- [x] T008 [P] Setup basic API routing structure in graphql-rust-server/src/handlers.rs
- [x] T009 Create base User entity model in graphql-rust-server/src/models/user.rs
- [x] T010 Configure error handling and logging infrastructure in graphql-rust-server/src/lib.rs

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Complete Session Authentication Migration (Priority: P1) 🎯 MVP

**Goal**: Migrate the entire SvelteKit application from JWT token-based authentication to session-based authentication using axum-login backend system.

**Independent Test**: Can be fully tested by verifying users can login, access protected pages, and logout successfully using session cookies instead of JWT tokens.

### Implementation for User Story 1

- [x] T011 [P] [US1] Create UserSession entity in backend/src/models/session.rs
- [x] T012 [P] [US1] Create AuthenticationState client store in src/lib/stores/auth.ts
- [x] T013 [P] [US1] Create SessionCookie utility in src/lib/auth/session.ts
- [x] T014 [US1] Implement session-based login endpoint in backend/src/routes/auth.rs
- [x] T015 [US1] Implement session-based logout endpoint in backend/src/routes/auth.rs
- [x] T016 [US1] Implement session validation endpoint in backend/src/routes/auth.rs
- [x] T017 [US1] Update SvelteKit hooks for session validation in src/hooks.server.ts
- [x] T018 [US1] Update GraphQL client to remove JWT headers in src/lib/graphql/client.ts
- [x] T019 [US1] Implement session migration logic for existing JWT tokens in src/lib/auth/migration.ts
- [x] T020 [US1] Update protected page load functions in src/routes/protected/+page.server.ts
- [x] T021 [US1] Add session expiration handling in src/lib/auth/session.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Remove JWT Dependencies (Priority: P2)

**Goal**: Remove all JWT token handling, parsing, and validation logic from the client-side code to eliminate security risks and complexity associated with client-side token management.

**Independent Test**: Can be fully tested by verifying no JWT tokens are stored, parsed, or sent in client code, and all authentication flows work through server-side sessions.

### Implementation for User Story 2

- [ ] T022 [P] [US2] Remove JWT token storage from localStorage in src/lib/auth/jwt-utils.ts
- [ ] T023 [P] [US2] Remove JWT parsing logic from src/lib/auth/secure-auth-service.ts
- [ ] T024 [P] [US2] Remove JWT validation functions from src/lib/auth/jwt-utils.ts
- [ ] T025 [P] [US2] Remove Authorization headers from GraphQL requests in src/lib/graphql/client.ts
- [ ] T026 [P] [US2] Remove JWT refresh logic from src/lib/stores/auth.ts
- [ ] T027 [US2] Update authentication store to use session state in src/lib/stores/auth.ts
- [ ] T028 [US2] Clean up JWT-related imports and dependencies in package.json

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Update Server-Side Authentication (Priority: P2)

**Goal**: Update the SvelteKit server hooks to work with session-based authentication instead of JWT validation to ensure proper user context and authorization.

**Independent Test**: Can be fully tested by verifying server hooks properly extract user context from sessions and enforce authorization without JWT processing.

### Implementation for User Story 3

- [ ] T029 [P] [US3] Update server hooks to extract user from session in src/hooks.server.ts
- [ ] T030 [P] [US3] Remove JWT validation from server hooks in src/hooks.server.ts
- [ ] T031 [P] [US3] Update authorization checks in load functions in src/routes/protected/+page.server.ts
- [ ] T032 [P] [US3] Implement session-based user context extraction in src/lib/auth/context.ts
- [ ] T033 [US3] Update error handling for session failures in src/hooks.server.ts
- [ ] T034 [US3] Add session validation middleware in src/hooks.server.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T035 [P] Documentation updates in docs/
- [ ] T036 Code cleanup and refactoring across frontend and backend
- [ ] T037 Performance optimization for session handling
- [ ] T038 Security hardening for session management
- [ ] T039 Run quickstart.md validation
- [ ] T040 Update README with session authentication details

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Create UserSession entity in backend/src/models/session.rs"
Task: "Create AuthenticationState client store in src/lib/stores/auth.ts"
Task: "Create SessionCookie utility in src/lib/auth/session.ts"

# Launch all endpoints for User Story 1 together:
Task: "Implement session-based login endpoint in backend/src/routes/auth.rs"
Task: "Implement session-based logout endpoint in backend/src/routes/auth.rs"
Task: "Implement session validation endpoint in backend/src/routes/auth.rs"
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
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence</content>
