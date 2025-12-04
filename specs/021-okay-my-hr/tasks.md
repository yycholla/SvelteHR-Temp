# Tasks: Functional System Settings

**Input**: Design documents from `/specs/021-okay-my-hr/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/graphql-api.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `../MountainHR-Backend/` (Rust GraphQL API)
- **Frontend**: `./` (SvelteKit app in current repository)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification

- [ ] T001 Verify PostgreSQL 14+ running and accessible
- [ ] T002 Verify Rust 1.75+ toolchain installed (`cargo --version`)
- [ ] T003 Verify Node.js 20+ and npm installed (`node --version`)
- [ ] T004 [P] Verify backend dependencies in `../MountainHR-Backend/Cargo.toml` (async-graphql, sea-orm, chrono-tz)
- [ ] T005 [P] Verify frontend dependencies in `./package.json` (@urql/svelte, zod, @internationalized/date)
- [ ] T006 Create feature branch `021-okay-my-hr` if not exists

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Migrations (Backend)

- [ ] T007 [P] Create migration `../MountainHR-Backend/migration/src/m20251111_create_system_settings.rs` for SystemSettings table
- [ ] T008 [P] Create migration `../MountainHR-Backend/migration/src/m20251111_create_notification_channels.rs` for NotificationChannels table
- [ ] T009 [P] Create migration `../MountainHR-Backend/migration/src/m20251111_extend_users_for_auth_policies.rs` to add auth policy fields to users
- [ ] T010 Run migrations with `cargo run -- migration up` and verify schema created

### SeaORM Entity Generation (Backend)

- [ ] T011 [P] Generate SeaORM entity `../MountainHR-Backend/src/entities/system_settings.rs` from database
- [ ] T012 [P] Generate SeaORM entity `../MountainHR-Backend/src/entities/notification_channels.rs` from database
- [ ] T013 Update SeaORM entity `../MountainHR-Backend/src/entities/users.rs` with new auth policy fields

### GraphQL Type Definitions (Backend)

- [ ] T014 [P] Create GraphQL types in `../MountainHR-Backend/src/graphql/types/system_settings.rs` (SystemSettings, LogLevel enum)
- [ ] T015 [P] Create GraphQL types in `../MountainHR-Backend/src/graphql/types/notification_channel.rs` (NotificationChannel, ChannelConfig union, enums)

### Base Infrastructure (Backend)

- [ ] T016 Create encryption utilities in `../MountainHR-Backend/src/services/encryption.rs` for pgcrypto credential encryption
- [ ] T017 Create timezone utilities in `../MountainHR-Backend/src/utils/timezone.rs` for UTC conversion
- [ ] T018 Create validation module in `../MountainHR-Backend/src/utils/validators.rs` for settings input validation

### Frontend Base Setup

- [ ] T019 Create system settings store in `./src/lib/stores/system-settings.ts` with urql query setup
- [ ] T020 Create Zod schemas in `./src/lib/schemas/system-settings.ts` for client-side validation
- [ ] T021 Create GraphQL operations file `./src/lib/graphql/operations.ts` (empty, will be populated per story)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - System Branding Configuration (Priority: P1) 🎯 MVP

**Goal**: Allow administrators to configure system name and replace all hardcoded "MountainHR"/"SvelteHR" instances

**Independent Test**: Update system name in settings → Verify name appears in header, footer, page titles

### Backend Implementation for US1

- [ ] T022 [US1] Implement `systemSettings` query in `../MountainHR-Backend/src/graphql/query/system_settings.rs` with Admin RBAC guard
- [ ] T023 [US1] Implement `updateSystemSettings` mutation in `../MountainHR-Backend/src/graphql/mutation/system_settings.rs` with validation
- [ ] T024 [US1] Add system_name validation logic (3-255 chars, special char handling) to validators.rs
- [ ] T025 [US1] Register SystemSettings query and mutation in `../MountainHR-Backend/src/graphql/schema.rs`
- [ ] T026 [US1] Create unit test for system_name validation in `../MountainHR-Backend/tests/system_settings_test.rs`

### Frontend Implementation for US1

- [ ] T027 [US1] Add `SYSTEM_SETTINGS_QUERY` to `./src/lib/graphql/operations.ts`
- [ ] T028 [US1] Add `UPDATE_SYSTEM_SETTINGS_MUTATION` to `./src/lib/graphql/operations.ts`
- [ ] T029 [US1] Implement systemSettings query in system-settings store (load on app init)
- [ ] T030 [US1] Create derived store `systemName` in `./src/lib/stores/system-settings.ts`
- [ ] T031 [US1] Create settings page layout `./src/routes/admin/settings/+layout.svelte` with tabs
- [ ] T032 [US1] Create server-side load function `./src/routes/admin/settings/+page.server.ts` to fetch settings
- [ ] T033 [US1] Create GeneralSettings component `./src/lib/components/settings/GeneralSettings.svelte` with system name input
- [ ] T034 [US1] Create main settings page `./src/routes/admin/settings/+page.svelte` with form submission
- [ ] T035 [US1] Update root layout `./src/routes/+layout.svelte` to replace hardcoded "MountainHR" with `{$systemName}`
- [ ] T036 [US1] Scan and replace hardcoded instances: Search `src/` for "MountainHR" and "SvelteHR", replace with `{$systemName}`
- [ ] T037 [US1] Update `./src/app.html` title to use dynamic system name via svelte:head

### Testing for US1

- [ ] T038 [P] [US1] Create E2E test `./tests/e2e/system-settings.spec.ts` for system name update flow
- [ ] T039 [P] [US1] Create unit test `./tests/unit/settings-store.spec.ts` for store behavior

**Checkpoint**: At this point, User Story 1 should be fully functional - admin can change system name and see it throughout UI

---

## Phase 4: User Story 2 - Timezone Management (Priority: P1) 🎯 MVP

**Goal**: Configure system timezone with UTC storage and display-time conversion

**Independent Test**: Set timezone to "America/Denver" → Create timestamped record → Verify displays in Mountain Time

### Backend Implementation for US2

- [ ] T040 [US2] Add timezone validation to validators.rs (IANA timezone database check using chrono-tz)
- [ ] T041 [US2] Update `updateSystemSettings` mutation to accept systemTimezone field
- [ ] T042 [US2] Implement UTC timezone conversion utilities in timezone.rs (formatInSystemTz, parseFromSystemTz)
- [ ] T043 [US2] Verify all GraphQL resolvers return timestamps in ISO 8601 UTC format
- [ ] T044 [US2] Create unit test for timezone validation in `../MountainHR-Backend/tests/timezone_test.rs`

### Frontend Implementation for US2

- [ ] T045 [US2] Create timezone utility `./src/lib/utils/timezone.ts` with display-time conversion functions
- [ ] T046 [US2] Update GeneralSettings component to include timezone selector with IANA timezone options
- [ ] T047 [US2] Create derived store `systemTimezone` in system-settings store
- [ ] T048 [US2] Update all date formatting functions in `./src/lib/utils/` to use systemTimezone
- [ ] T049 [US2] Create formatDate utility that converts UTC to system timezone using @internationalized/date

### Testing for US2

- [ ] T050 [P] [US2] Add E2E test to system-settings.spec.ts for timezone change validation
- [ ] T051 [P] [US2] Create unit test `./tests/unit/timezone.spec.ts` for timezone conversion utilities

**Checkpoint**: Timezone configuration working - timestamps display in configured timezone

---

## Phase 5: User Story 3 - Authentication Security Configuration (Priority: P1) 🎯 MVP

**Goal**: Configure session timeout, password length, max login attempts with enforcement

**Independent Test**: Set session timeout to 5 min → Wait 5 min → User auto-logged out

### Backend Implementation for US3

- [ ] T052 [US3] Update `updateSystemSettings` mutation to accept auth policy fields (sessionTimeoutMinutes, minPasswordLength, maxLoginAttempts)
- [ ] T053 [US3] Add validation for auth policy fields in validators.rs (ranges: 5-1440 min, 8-128 chars, 3-100 attempts)
- [ ] T054 [US3] Implement JWT expiration logic based on sessionTimeoutMinutes in auth middleware
- [ ] T055 [US3] Implement account lockout logic in login mutation (increment failed_login_attempts, lock when >= max)
- [ ] T056 [US3] Implement `unlockUserAccount` mutation in `../MountainHR-Backend/src/graphql/mutation/user_management.rs`
- [ ] T057 [US3] Create password validation service that respects minPasswordLength from settings
- [ ] T058 [US3] Create unit test for account lockout logic in `../MountainHR-Backend/tests/auth_policy_test.rs`

### Frontend Implementation for US3

- [ ] T059 [US3] Create AuthSettings component `./src/lib/components/settings/AuthSettings.svelte` with auth policy inputs
- [ ] T060 [US3] Create session timeout manager `./src/lib/utils/session-manager.ts` (activity tracking + auto-logout)
- [ ] T061 [US3] Initialize session timeout manager in root layout on app load
- [ ] T062 [US3] Create password validator `./src/lib/utils/password-validator.ts` that reads minPasswordLength from settings
- [ ] T063 [US3] Update login page `./src/routes/login/+page.svelte` to display account locked error message
- [ ] T064 [US3] Update password change forms to use dynamic password validation
- [ ] T065 [US3] Add "session expired" modal component for graceful logout

### Testing for US3

- [ ] T066 [P] [US3] Add E2E test for session timeout enforcement
- [ ] T067 [P] [US3] Add E2E test for account lockout after max login attempts
- [ ] T068 [P] [US3] Add E2E test for password length validation
- [ ] T069 [P] [US3] Create unit test for session manager in `./tests/unit/session-manager.spec.ts`

**Checkpoint**: Authentication policies enforced - session timeout, password validation, account lockout all working

---

## Phase 6: User Story 4 - Notification Channel Configuration (Priority: P2)

**Goal**: Configure SMTP email and webhook notification channels with encrypted credentials

**Independent Test**: Configure SMTP → Send test email → Verify delivery

### Backend Implementation for US4

- [ ] T070 [P] [US4] Implement `notificationChannels` query in `../MountainHR-Backend/src/graphql/query/notification_channels.rs`
- [ ] T071 [P] [US4] Implement `createNotificationChannel` mutation in `../MountainHR-Backend/src/graphql/mutation/notification_channels.rs`
- [ ] T072 [US4] Implement `updateNotificationChannel` mutation
- [ ] T073 [US4] Implement `deleteNotificationChannel` mutation
- [ ] T074 [US4] Implement `sendTestEmail` mutation with SMTP connection validation
- [ ] T075 [US4] Implement SMTP validation service in `../MountainHR-Backend/src/services/smtp_validator.rs`
- [ ] T076 [US4] Implement webhook validation (URL format check) in validators.rs
- [ ] T077 [US4] Implement credential encryption in encryption.rs (encrypt smtp_password, auth_token before DB insert)
- [ ] T078 [US4] Implement credential decryption for notification sending
- [ ] T079 [US4] Implement notification sender service `../MountainHR-Backend/src/services/notification_sender.rs` (SMTP + webhook)
- [ ] T080 [US4] Implement best-effort webhook delivery (5s timeout, log failure, no retry)
- [ ] T081 [US4] Create unit test for SMTP validation in `../MountainHR-Backend/tests/notification_test.rs`

### Frontend Implementation for US4

- [ ] T082 [P] [US4] Create NotificationSettings component `./src/lib/components/settings/NotificationSettings.svelte`
- [ ] T083 [P] [US4] Create EmailChannelForm component `./src/lib/components/settings/EmailChannelForm.svelte`
- [ ] T084 [P] [US4] Create WebhookChannelForm component `./src/lib/components/settings/WebhookChannelForm.svelte`
- [ ] T085 [US4] Add notification channel mutations to operations.ts
- [ ] T086 [US4] Add notification channel queries to operations.ts
- [ ] T087 [US4] Implement "Send Test Email" button with mutation call
- [ ] T088 [US4] Add Zod schemas for email and webhook channel validation to system-settings.ts

### Testing for US4

- [ ] T089 [P] [US4] Add E2E test for SMTP configuration and test email
- [ ] T090 [P] [US4] Add E2E test for webhook configuration

**Checkpoint**: Notification channels working - can configure SMTP and webhooks

---

## Phase 7: User Story 5 - Security Settings Management (Priority: P2)

**Goal**: Configure HTTPS enforcement, CORS, security headers

**Independent Test**: Enable HTTPS enforcement → HTTP request redirects to HTTPS

### Backend Implementation for US5

- [ ] T091 [P] [US5] Create HTTPS enforcement middleware in `../MountainHR-Backend/src/middleware/https_enforcer.rs`
- [ ] T092 [P] [US5] Create CORS configuration middleware in `../MountainHR-Backend/src/middleware/cors_config.rs`
- [ ] T093 [P] [US5] Create security headers middleware in `../MountainHR-Backend/src/middleware/security_headers.rs` (CSP, X-Frame-Options, HSTS)
- [ ] T094 [US5] Update `updateSystemSettings` mutation to accept security fields (httpsEnforced, corsOrigins, cspPolicy, etc.)
- [ ] T095 [US5] Add CORS origins validation (URL format check) to validators.rs
- [ ] T096 [US5] Register middlewares in actix-web app configuration
- [ ] T097 [US5] Create unit test for HTTPS redirect logic in `../MountainHR-Backend/tests/security_test.rs`

### Frontend Implementation for US5

- [ ] T098 [US5] Create SecuritySettings component `./src/lib/components/settings/SecuritySettings.svelte` with security toggles and inputs
- [ ] T099 [US5] Add security settings Zod schemas for CORS origins array validation

### Testing for US5

- [ ] T100 [P] [US5] Add E2E test for HTTPS enforcement redirect
- [ ] T101 [P] [US5] Add E2E test for CORS origin validation

**Checkpoint**: Security settings working - HTTPS, CORS, headers all configurable

---

## Phase 8: User Story 6 - Developer Log Level Configuration (Priority: P3)

**Goal**: Configure log levels for frontend/backend containers with rolling restart

**Independent Test**: Set log level to DEBUG → Verify DEBUG logs appear in container logs

### Backend Implementation for US6

- [ ] T102 [P] [US6] Implement Kubernetes API client integration in `../MountainHR-Backend/src/services/container_restart.rs` (using kube crate)
- [ ] T103 [P] [US6] Implement Docker API client integration in container_restart.rs (using bollard crate)
- [ ] T104 [US6] Implement restart service with environment detection (K8s vs Docker)
- [ ] T105 [US6] Update `updateSystemSettings` mutation to trigger container restart when log levels change
- [ ] T106 [US6] Add logging for restart operations (log deployment name, new log level, timestamp)
- [ ] T107 [US6] Create integration test for restart trigger in `../MountainHR-Backend/tests/container_restart_test.rs`

### Frontend Implementation for US6

- [ ] T108 [US6] Create DeveloperSettings component `./src/lib/components/settings/DeveloperSettings.svelte` with log level selects
- [ ] T109 [US6] Add warning toast when log level changes: "Log level updated. Containers restarting (may take up to 2 minutes)"

### Testing for US6

- [ ] T110 [P] [US6] Add E2E test for log level change (verify mutation succeeds, container restart triggered)

**Checkpoint**: Log level configuration working - can set DEBUG/INFO/WARN/ERROR for frontend and backend

---

## Phase 9: Integration & Polish

**Purpose**: Cross-story integration, performance optimization, final testing

### Backend Integration

- [ ] T111 [P] Implement GraphQL subscription `systemSettingsUpdated` in `../MountainHR-Backend/src/graphql/subscription/system_settings.rs`
- [ ] T112 [P] Implement GraphQL subscription `notificationChannelUpdated`
- [ ] T113 Add settings cache invalidation on update (publish subscription events)
- [ ] T114 Implement in-memory settings cache with 5-minute TTL
- [ ] T115 Add comprehensive error handling with user-friendly error messages
- [ ] T116 Run `cargo test` and ensure all unit tests pass
- [ ] T117 Run `cargo clippy` and fix any warnings

### Frontend Integration

- [ ] T118 [P] Implement subscription handlers for systemSettingsUpdated in settings store
- [ ] T119 Add cache invalidation and re-fetch when subscription event received
- [ ] T120 Add success/error toast notifications for all mutations
- [ ] T121 Add form validation error display for all settings forms
- [ ] T122 Add loading states for all mutations (disable submit button, show spinner)
- [ ] T123 Run `npm run check` (TypeScript + Svelte validation)
- [ ] T124 Run `npm run lint` (Prettier + ESLint)
- [ ] T125 Run `npm run test:unit` and ensure unit tests pass

### E2E Testing

- [ ] T126 Run full E2E test suite `npm run test:e2e` and verify all tests pass
- [ ] T127 Add E2E test for complete admin workflow (login → settings → all changes → verify)
- [ ] T128 Test cross-browser compatibility (Chrome, Firefox, Safari)

### Performance & Optimization

- [ ] T129 [P] Verify settings query latency <50ms (check database query explain plan)
- [ ] T130 [P] Verify settings update latency <200ms
- [ ] T131 Add database indexes if query performance is slow (already defined in migrations)

### Documentation

- [ ] T132 [P] Update README.md with system settings feature description
- [ ] T133 [P] Document environment variables (SETTINGS_ENCRYPTION_KEY, LOG_LEVEL, etc.)
- [ ] T134 Create deployment runbook for production migration

**Checkpoint**: All user stories integrated, tests passing, ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1, US2, US3 (P1) should be completed first (MVP)
  - US4, US5 (P2) can be done in parallel after MVP
  - US6 (P3) can be done last
- **Integration & Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Branding)**: Can start after Foundational - No dependencies on other stories
- **US2 (Timezone)**: Can start after Foundational - No dependencies on other stories
- **US3 (Auth Policies)**: Can start after Foundational - No dependencies on other stories
- **US4 (Notifications)**: Can start after Foundational - Independent of other stories
- **US5 (Security)**: Can start after Foundational - Independent of other stories
- **US6 (Log Levels)**: Can start after Foundational - Independent of other stories

### Within Each User Story

- Backend implementation before frontend (need API available)
- Tests can be written in parallel with implementation
- Core GraphQL resolvers before frontend components
- Validation utilities before mutation implementations

### Parallel Opportunities

**Phase 2 (Foundational)**: Tasks T007-T009 (migrations), T011-T012 (entities), T014-T015 (types), T016-T018 (utils), T019-T021 (frontend setup) can all run in parallel

**Phase 3 (US1)**: Tasks T026, T038, T039 (tests) can run in parallel with implementation

**Phase 4 (US2)**: Tasks T044, T050, T051 (tests) can run in parallel

**Phase 5 (US3)**: Tasks T058, T066-T069 (tests) can run in parallel

**Phase 6 (US4)**: Tasks T070-T071, T082-T084 (parallel components), T089-T090 (tests) can run in parallel

**Phase 7 (US5)**: Tasks T091-T093 (middleware), T100-T101 (tests) can run in parallel

**Phase 8 (US6)**: Tasks T102-T103 (K8s + Docker clients), T110 (test) can run in parallel

**Phase 9 (Integration)**: Tasks T111-T112, T116-T117, T118-T119, T123-T125, T129-T130, T132-T134 can all run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 - System Branding
4. Complete Phase 4: US2 - Timezone
5. Complete Phase 5: US3 - Authentication
6. **STOP and VALIDATE**: Test all three P1 stories independently
7. Complete Phase 9: Integration & Polish
8. Deploy/demo MVP

**Estimated Duration**: 5-6 days for MVP (US1-US3 + Foundation + Polish)

### Incremental Delivery

1. Complete Foundation (Phase 1-2) → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (branding working!)
3. Add US2 → Test independently → Deploy/Demo (timezone working!)
4. Add US3 → Test independently → Deploy/Demo (auth policies working!)
5. Add US4 → Test independently → Deploy/Demo (notifications working!)
6. Add US5 → Test independently → Deploy/Demo (security working!)
7. Add US6 → Test independently → Deploy/Demo (log levels working!)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (2 days)
2. Once Foundational is done:
   - Developer A: User Story 1 (Branding)
   - Developer B: User Story 2 (Timezone)
   - Developer C: User Story 3 (Auth Policies)
3. Stories complete and integrate independently
4. Repeat for P2 and P3 stories

---

## Notes

- [P] tasks = different files, no dependencies (can run in parallel)
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Backend tasks in `../MountainHR-Backend/` (adjacent repository)
- Frontend tasks in `./` (current SvelteKit repository)
- Verify tests before moving to next phase
- Commit after each completed user story (checkpoint)
- Database migrations must be run before entity generation
- Settings cache invalidation critical for real-time updates
- Container restart (US6) requires Kubernetes/Docker API access
- Encryption key must be set in environment variable before production deployment
