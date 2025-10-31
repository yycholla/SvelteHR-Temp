# Tasks: Production Docker Deployment with CI/CD and Caddy

**Input**: Design documents from `/specs/040-it-is-now/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: This feature includes comprehensive contract tests and integration tests to ensure production-ready deployment infrastructure.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Root**: Configuration files at repository root (`docker-compose.prod.yml`, `Caddyfile`, `.env.example`)
- **CI/CD**: `.github/workflows/deploy-production.yml`
- **Backend**: `graphql-rust-server/Dockerfile.prod`
- **Frontend**: `Dockerfile` (modified for production builds)
- **Documentation**: `docs/deployment/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and validation of prerequisites

- [x] T001 Validate existing `docker-compose.dev.yml` in `dev-containers/` to understand current service architecture
- [x] T002 [P] Create `docs/deployment/` directory for production deployment documentation
- [x] T003 [P] Verify Docker Compose v2.20+ is available and configured correctly in development environment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create environment configuration schema validation script to ensure all required variables are present
- [x] T005 [P] Research and document Docker networking requirements for service-to-service communication
- [x] T006 [P] Research and document health check best practices for PostgreSQL, Redis, Rust backend, SvelteKit frontend, and Caddy
- [x] T007 Create base `.dockerignore` file (if not exists) to exclude unnecessary files from Docker builds
- [x] T008 Document production security requirements (non-root users, secret management, HTTPS enforcement)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Production Deployment Setup (Priority: P1) 🎯 MVP

**Goal**: Enable single-command production deployment with proper orchestration, health checks, and persistent data

**Independent Test**: Run `docker compose -f docker-compose.prod.yml up -d` on fresh server, verify all services start healthy and application is accessible

### Tests for User Story 1

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Contract test for docker-compose.prod.yml structure validation in `tests/deployment/test_docker_compose_contract.py` (verify all services defined, health checks present, volumes configured)
- [ ] T010 [P] [US1] Integration test for production stack startup in `tests/deployment/test_production_stack.py` (verify all services start and pass health checks)
- [ ] T011 [P] [US1] Contract test for PostgreSQL service configuration in `tests/deployment/test_postgres_contract.py` (verify persistence, health checks, environment variables)
- [ ] T012 [P] [US1] Contract test for Redis service configuration in `tests/deployment/test_redis_contract.py` (verify persistence, health checks, memory limits)

### Implementation for User Story 1

- [x] T013 [P] [US1] Create production PostgreSQL service definition in `docker-compose.prod.yml` with health checks, named volumes, and restart policy per contract
- [x] T014 [P] [US1] Create production Redis service definition in `docker-compose.prod.yml` with AOF persistence, health checks, and memory configuration per contract
- [x] T015 [US1] Create production Rust GraphQL backend service definition in `docker-compose.prod.yml` with depends_on, health checks, environment variables per contract
- [x] T016 [US1] Create production frontend service definition in `docker-compose.prod.yml` with depends_on backend, health checks, environment variables per contract
- [x] T017 [US1] Configure Docker network in `docker-compose.prod.yml` with bridge driver and service discovery per contract
- [x] T018 [US1] Configure named volumes in `docker-compose.prod.yml` (postgres_data, redis_data, caddy_data, caddy_config) per contract
- [x] T019 [P] [US1] Create production frontend Dockerfile multi-stage build in `Dockerfile` with build and runtime stages
- [x] T020 [P] [US1] Create production backend Dockerfile in `graphql-rust-server/Dockerfile.prod` with Rust release build and SeaORM migration execution
- [x] T021 [US1] Add commented resource limit examples to all services in `docker-compose.prod.yml` per FR-007 (memory, CPU constraints)
- [x] T022 [US1] Configure restart policies (`unless-stopped`) for all services in `docker-compose.prod.yml`
- [x] T023 [US1] Verify health check endpoints exist in backend (`/health`) and frontend (`/health`), add if missing

**Checkpoint**: At this point, User Story 1 should be fully functional - production stack starts locally with `docker compose -f docker-compose.prod.yml up -d`

---

## Phase 4: User Story 3 - Environment Configuration Management (Priority: P2)

**Goal**: Comprehensive `.env.example` file documenting all required environment variables with descriptions

**Independent Test**: New team member follows `.env.example` to set up staging environment from scratch, application starts successfully

### Tests for User Story 3

- [ ] T024 [P] [US3] Contract test for `.env.example` completeness in `tests/deployment/test_env_contract.py` (verify all required variables documented, descriptions present)
- [ ] T025 [P] [US3] Integration test for environment variable validation in `tests/deployment/test_env_validation.py` (verify startup with example values)

### Implementation for User Story 3

- [x] T026 [US3] Create comprehensive `.env.example` file at repository root with all variables from data-model.md
- [x] T027 [US3] Document database configuration variables in `.env.example` (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_INITDB_ARGS)
- [x] T028 [US3] Document Redis configuration variables in `.env.example` (REDIS_URL, Redis memory settings)
- [x] T029 [US3] Document backend configuration variables in `.env.example` (DATABASE_URL, JWT_SECRET, SERVICE_AUTH_KEY, CORS_ALLOWED_ORIGINS, RUST_LOG)
- [x] T030 [US3] Document frontend configuration variables in `.env.example` (NODE_ENV, PUBLIC_API_URL, PORT, HOST)
- [x] T031 [US3] Document DOMAIN variable in `.env.example` with examples for both localhost and production modes per FR-012a
- [x] T032 [US3] Document GitLab Container Registry variables in `.env.example` (GITLAB_PROJECT, IMAGE_TAG) per contract
- [x] T033 [US3] Add security notes for sensitive variables requiring secure random generation (JWT_SECRET, POSTGRES_PASSWORD, SERVICE_AUTH_KEY)
- [x] T034 [US3] Add optional variables section in `.env.example` (TLS_EMAIL, ENABLE_METRICS, ACME_CA for Let's Encrypt staging)
- [x] T035 [US3] Verify `.env` files are in `.gitignore` to prevent committing secrets

**Checkpoint**: Environment configuration is fully documented - new environments can be set up following `.env.example`

---

## Phase 5: User Story 4 - Caddy Reverse Proxy Integration (Priority: P2)

**Goal**: Caddy handles SSL certificate provisioning automatically with dual-mode support (localhost self-signed / production Let's Encrypt)

**Independent Test**: (1) Test with DOMAIN=localhost verifying self-signed certificates, (2) Test with DOMAIN=hr.example.com verifying Let's Encrypt certificates

### Tests for User Story 4

- [ ] T036 [P] [US4] Contract test for Caddyfile configuration in `tests/deployment/test_caddy_contract.py` (verify DOMAIN variable substitution, route definitions, TLS configuration)
- [ ] T037 [P] [US4] Integration test for localhost mode in `tests/deployment/test_caddy_localhost.py` (verify self-signed certificates, HTTPS redirect, routing)
- [ ] T038 [P] [US4] Integration test for WebSocket support in `tests/deployment/test_caddy_websocket.py` (verify GraphQL subscriptions work through Caddy)

### Implementation for User Story 4

- [x] T039 [US4] Create `Caddyfile` at repository root with global options (admin API, email, persist_config) per contract
- [x] T040 [US4] Configure DOMAIN variable substitution in `Caddyfile` to support both localhost and production modes per FR-022
- [x] T041 [US4] Configure automatic HTTPS in `Caddyfile` (localhost → self-signed, real domain → Let's Encrypt) per contract
- [x] T042 [US4] Configure frontend route (`/`) in `Caddyfile` to proxy to `frontend:3000` per contract
- [x] T043 [US4] Configure GraphQL route (`/graphql`, `/graphql/*`) in `Caddyfile` to proxy to `hr-graphql-rust:4000` with WebSocket support per contract
- [x] T044 [US4] Configure API route (`/api`, `/api/*`) in `Caddyfile` to proxy to `hr-graphql-rust:4000` per contract
- [x] T045 [US4] Configure security headers in `Caddyfile` (HSTS, X-Content-Type-Options, X-Frame-Options, CSP) per contract
- [x] T046 [US4] Configure HTTP to HTTPS redirect in `Caddyfile` for both localhost and production modes per contract
- [x] T047 [US4] Configure health check endpoints in `Caddyfile` for backend services (passive health checking) per contract
- [x] T048 [US4] Configure error handling in `Caddyfile` (502, 503, 504 custom responses) per contract
- [x] T049 [US4] Add Caddy service definition to `docker-compose.prod.yml` with volume mounts for Caddyfile, caddy_data, caddy_config per contract
- [x] T050 [US4] Configure Caddy health check in `docker-compose.prod.yml` (admin API endpoint check) per contract
- [x] T051 [US4] Configure Caddy port mappings in `docker-compose.prod.yml` (80:80, 443:443, 2019:2019 admin API) per contract

**Checkpoint**: Caddy is fully configured - HTTPS works in both localhost and production modes, routes traffic correctly

---

## Phase 6: User Story 2 - CI/CD Pipeline for Automated Deployments (Priority: P1)

**Goal**: GitHub Actions automatically builds, tests, and deploys on push to main, with GitLab Container Registry integration

**Independent Test**: Push code change to main, verify CI/CD pipeline builds images, runs tests, and deploys to production server

### Tests for User Story 2

- [ ] T052 [P] [US2] Contract test for GitHub Actions workflow in `tests/deployment/test_github_actions_contract.py` (verify all jobs defined, secrets documented, stages correct)
- [ ] T053 [P] [US2] Integration test for CI/CD pipeline simulation in `tests/deployment/test_cicd_integration.py` (verify build, test, push workflow)

### Implementation for User Story 2

- [x] T054 [US2] Create `.github/workflows/deploy-production.yml` with workflow metadata (name, triggers, concurrency control) per contract
- [x] T055 [US2] Implement lint job in GitHub Actions workflow (checkout, setup Node.js 20, npm ci, Prettier, ESLint, TypeScript check) per contract
- [x] T056 [US2] Implement test-frontend job in GitHub Actions workflow (depends on lint, npm ci, test:unit, upload test results) per contract
- [x] T057 [US2] Implement test-backend job in GitHub Actions workflow (depends on lint, Rust setup, cargo cache, cargo test) per contract
- [x] T058 [US2] Implement build-push job in GitHub Actions workflow (depends on test jobs, Docker Buildx, GitLab registry login, metadata extraction) per contract
- [x] T059 [US2] Configure frontend image build and push in GitHub Actions (multi-stage Dockerfile, BuildKit cache, tags: latest + sha) per contract
- [x] T060 [US2] Configure backend image build and push in GitHub Actions (Dockerfile.prod, BuildKit cache, tags: latest + sha) per contract
- [x] T061 [US2] Implement deploy job in GitHub Actions workflow (depends on build-push, SSH setup, environment setup) per contract
- [x] T062 [US2] Configure SSH key setup in deploy job (base64 decode, known_hosts, key permissions) per contract
- [x] T063 [US2] Implement pg_dump backup step in deploy job (automated backup before migration with timestamp) per FR-039, contract
- [x] T064 [US2] Implement file copy to server in deploy job (docker-compose.prod.yml, Caddyfile, .env.production via scp) per contract
- [x] T065 [US2] Implement deployment execution in deploy job (SSH, docker compose pull, docker compose up -d --no-build) per contract
- [x] T066 [US2] Implement health check verification in deploy job (wait 30s, verify all services healthy) per contract
- [x] T067 [US2] Implement backup cleanup in deploy job (find backups older than 7 days, delete) per FR-040a, contract
- [x] T068 [US2] Implement old image cleanup in deploy job (docker image prune with 72h filter) per contract
- [x] T069 [US2] Document required GitHub Secrets in `docs/deployment/github-secrets.md` (GITLAB_USERNAME, GITLAB_TOKEN, DEPLOY_HOST, DEPLOY_USER, SSH_PRIVATE_KEY, PRODUCTION_ENV, PRODUCTION_DOMAIN) per contract
- [x] T070 [US2] Document GitLab personal access token creation in `docs/deployment/gitlab-token-setup.md` (required scopes: read_registry, write_registry) per contract

**Checkpoint**: CI/CD pipeline is fully functional - code pushed to main automatically deploys to production

---

## Phase 7: User Story 5 - Local Production Testing (Priority: P3)

**Goal**: Developers can run production Docker Compose stack locally for pre-deployment validation

**Independent Test**: Run `docker compose -f docker-compose.prod.yml up` locally, verify production build works identically to production server

### Tests for User Story 5

- [ ] T071 [P] [US5] Integration test for local production stack in `tests/deployment/test_local_production.py` (verify stack starts locally, production builds used)

### Implementation for User Story 5

- [x] T072 [US5] Create local testing guide in `docs/deployment/local-testing.md` with steps for running production stack locally
- [x] T073 [US5] Add build context to docker-compose.prod.yml for local testing (frontend and backend services) per contract
- [x] T074 [US5] Document differences between dev and production modes in `docs/deployment/local-testing.md` (environment variables, build targets)
- [x] T075 [US5] Create local `.env.local` example in `docs/deployment/local-testing.md` for localhost testing

**Checkpoint**: Local production testing is documented and functional - developers can validate production config before deployment

---

## Phase 8: User Story 6 - Container Registry Integration (Priority: P3)

**Goal**: CI/CD pushes Docker images to GitLab Container Registry with proper versioning (latest + commit SHA)

**Independent Test**: Trigger CI pipeline, verify images pushed to registry with proper tags, confirm production pulls from registry

### Tests for User Story 6

- [ ] T076 [P] [US6] Contract test for image tagging strategy in `tests/deployment/test_registry_contract.py` (verify latest + sha tags applied)

### Implementation for User Story 6

- [x] T077 [US6] Configure GitLab Container Registry authentication in GitHub Actions workflow (docker/login-action with GITLAB_TOKEN) - already implemented in T058
- [x] T078 [US6] Configure image metadata extraction in GitHub Actions workflow (docker/metadata-action with latest + sha tags) - already implemented in T059, T060
- [x] T079 [US6] Update docker-compose.prod.yml image references to use GitLab registry with IMAGE_TAG variable per contract
- [x] T080 [US6] Document registry URL format in `docs/deployment/container-registry.md` (registry.gitlab.com/{username}/sveltehr/{service}:{tag})
- [x] T081 [US6] Document rollback procedure in `docs/deployment/rollback.md` (change IMAGE_TAG to previous SHA, redeploy)

**Checkpoint**: Container registry integration complete - production pulls pre-built images, rollback is simplified

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, final documentation, and validation

- [x] T082 [P] Create comprehensive quickstart guide in `docs/deployment/quickstart.md` based on `/specs/040-it-is-now/quickstart.md`
- [ ] T083 [P] Create troubleshooting guide in `docs/deployment/troubleshooting.md` with common issues and diagnostics per contract
- [ ] T084 [P] Create deployment runbook in `docs/deployment/runbooks/standard-deployment.md` with step-by-step deployment procedure
- [x] T085 [P] Create emergency rollback runbook in `docs/deployment/runbooks/emergency-rollback.md` with 5-minute rollback target - COMPLETED in rollback.md
- [ ] T086 [P] Create monitoring guide in `docs/deployment/monitoring.md` with docker stats examples and resource monitoring per FR-053
- [ ] T087 [P] Document log access and rotation in `docs/deployment/logging.md` (docker compose logs, log rotation configuration)
- [ ] T088 [P] Create security checklist in `docs/deployment/security-checklist.md` (non-root users, SSH keys, HTTPS enforcement, secrets rotation)
- [ ] T089 [US1] Validate all success criteria from spec.md (SC-001 through SC-010) with actual timing measurements
- [ ] T090 [P] Code cleanup: Remove old Nginx configuration references from repository
- [x] T091 [P] Code cleanup: Archive old `docker-compose.prod.yml` to `docker-compose.prod.yml.hasura.backup` if it exists - COMPLETED in Phase 3
- [ ] T092 Run complete quickstart.md validation on fresh server (end-to-end deployment test)
- [x] T093 [P] Performance optimization: Verify Docker BuildKit cache is working in CI/CD pipeline - COMPLETED in Phase 6 GitHub Actions
- [ ] T094 [P] Security hardening: Add vulnerability scanning to CI/CD pipeline per FR-045 (optional, Trivy integration)
- [x] T095 [P] Add health check monitoring documentation to `docs/deployment/health-checks.md` with expected success rates - COMPLETED in Phase 2

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (Production Deployment Setup) - P1 priority, MVP critical
  - US3 (Environment Configuration) - P2 priority, can start after Foundational
  - US4 (Caddy Reverse Proxy) - P2 priority, depends on US1 (docker-compose.prod.yml exists)
  - US2 (CI/CD Pipeline) - P1 priority, depends on US1, US3, US4 (docker-compose.prod.yml, .env.example, Caddyfile exist)
  - US5 (Local Production Testing) - P3 priority, depends on US1 (docker-compose.prod.yml exists)
  - US6 (Container Registry Integration) - P3 priority, depends on US2 (CI/CD pipeline exists)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - MVP CRITICAL
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P2)**: Depends on US1 completion (requires docker-compose.prod.yml to add Caddy service)
- **User Story 2 (P1)**: Depends on US1, US3, US4 completion (requires docker-compose.prod.yml, .env.example, Caddyfile)
- **User Story 5 (P3)**: Depends on US1 completion (requires docker-compose.prod.yml)
- **User Story 6 (P3)**: Depends on US2 completion (requires CI/CD pipeline)

### Recommended Execution Sequence

1. **Phase 1: Setup** (T001-T003) - Quick validation
2. **Phase 2: Foundational** (T004-T008) - Research and prerequisites
3. **Phase 3: User Story 1** (T009-T023) - Production deployment foundation (MVP)
4. **Phase 4: User Story 3** (T024-T035) - Environment documentation (parallel with US4)
5. **Phase 5: User Story 4** (T036-T051) - Caddy integration (after US1)
6. **Phase 6: User Story 2** (T052-T070) - CI/CD automation (after US1, US3, US4)
7. **Phase 7: User Story 5** (T071-T075) - Local testing docs (parallel with US6)
8. **Phase 8: User Story 6** (T076-T081) - Registry integration (after US2)
9. **Phase 9: Polish** (T082-T095) - Documentation and validation

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Contract tests can run in parallel [P]
- Docker Compose service definitions can be created in parallel [P]
- Dockerfiles can be created in parallel [P]
- Configuration files (Caddyfile, .env.example) are sequential within their story
- CI/CD job implementations are sequential (dependencies between jobs)

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T005, T006 can run in parallel after T004
- **User Story 1 Tests**: T009, T010, T011, T012 can all run in parallel
- **User Story 1 Implementation**: T013, T014 can run in parallel; T019, T020 can run in parallel
- **User Story 3 Tests**: T024, T025 can run in parallel
- **User Story 4 Tests**: T036, T037, T038 can run in parallel
- **User Story 2 Tests**: T052, T053 can run in parallel
- **User Story 5 Tests**: T071 standalone
- **User Story 6 Tests**: T076 standalone
- **Phase 9 (Polish)**: T082, T083, T084, T085, T086, T087, T088 can all run in parallel; T090, T091, T093, T094, T095 can run in parallel after documentation

---

## Parallel Example: User Story 1 (Production Deployment Setup)

```bash
# Launch all contract tests for User Story 1 together:
Task: "Contract test for docker-compose.prod.yml structure validation in tests/deployment/test_docker_compose_contract.py"
Task: "Integration test for production stack startup in tests/deployment/test_production_stack.py"
Task: "Contract test for PostgreSQL service configuration in tests/deployment/test_postgres_contract.py"
Task: "Contract test for Redis service configuration in tests/deployment/test_redis_contract.py"

# Launch PostgreSQL and Redis service definitions together:
Task: "Create production PostgreSQL service definition in docker-compose.prod.yml"
Task: "Create production Redis service definition in docker-compose.prod.yml"

# Launch Dockerfile creation together:
Task: "Create production frontend Dockerfile multi-stage build in Dockerfile"
Task: "Create production backend Dockerfile in graphql-rust-server/Dockerfile.prod"
```

---

## Parallel Example: User Story 2 (CI/CD Pipeline)

```bash
# Launch contract tests together:
Task: "Contract test for GitHub Actions workflow in tests/deployment/test_github_actions_contract.py"
Task: "Integration test for CI/CD pipeline simulation in tests/deployment/test_cicd_integration.py"

# Note: CI/CD job implementations are sequential due to dependencies
# (lint → test-frontend/test-backend → build-push → deploy)
```

---

## Parallel Example: Phase 9 (Polish)

```bash
# Launch all documentation tasks together:
Task: "Create comprehensive quickstart guide in docs/deployment/quickstart.md"
Task: "Create troubleshooting guide in docs/deployment/troubleshooting.md"
Task: "Create deployment runbook in docs/deployment/runbooks/standard-deployment.md"
Task: "Create emergency rollback runbook in docs/deployment/runbooks/emergency-rollback.md"
Task: "Create monitoring guide in docs/deployment/monitoring.md"
Task: "Document log access and rotation in docs/deployment/logging.md"
Task: "Create security checklist in docs/deployment/security-checklist.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T009-T023)
4. **STOP and VALIDATE**: Test User Story 1 independently - production stack starts with `docker compose -f docker-compose.prod.yml up -d`
5. Deploy/demo if ready - this is the MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy locally (MVP! - manual production deployment works)
3. Add User Story 3 → Environment variables fully documented
4. Add User Story 4 → Caddy integration complete → Deploy/Demo (HTTPS with automatic SSL)
5. Add User Story 2 → CI/CD automation → Deploy/Demo (automated deployments)
6. Add User Story 5 → Local testing validated
7. Add User Story 6 → Registry integration → Deploy/Demo (optimized deployments with pre-built images)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T009-T023) - Production deployment foundation
   - Developer B: User Story 3 (T024-T035) - Environment documentation
3. After US1 completes:
   - Developer A: User Story 4 (T036-T051) - Caddy integration
   - Developer C: User Story 5 (T071-T075) - Local testing docs
4. After US1, US3, US4 complete:
   - Developer A: User Story 2 (T052-T070) - CI/CD pipeline
5. After US2 completes:
   - Developer B: User Story 6 (T076-T081) - Registry integration
6. All developers: Phase 9 (T082-T095) - Polish and documentation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4, US5, US6)
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Focus on US1 first (production deployment foundation) as it's the MVP and most critical
- US2 (CI/CD) depends on US1, US3, US4 being complete
- US4 (Caddy) depends on US1 (docker-compose.prod.yml must exist)
- All configuration files use environment variable substitution for flexibility
- All Docker images use multi-stage builds for optimization
- All services have comprehensive health checks per contracts
- All documentation references contracts for authoritative specifications
