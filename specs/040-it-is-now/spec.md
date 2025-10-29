# Feature Specification: Production Docker Deployment with CI/CD and Caddy

**Feature Branch**: `040-it-is-now`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "it is now time to get my docker system that has been running in the @dev-containers/ directory to production with full build out and CI/CD for local systems. I would also love to get this loading through caddy and provide a .env.example in our github so this can be easily setup and run on our server and we can use github or gitlab ci/cd to make incremental changes to prod."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production Deployment Setup (Priority: P1)

As a **DevOps engineer**, I want to deploy the SvelteHR application to a production server using a single command with proper environment configuration, so that the application runs reliably with all services orchestrated correctly.

**Why this priority**: This is the foundation for all production operations. Without a working production deployment, the application cannot serve real users. This provides immediate business value by making the application accessible.

**Independent Test**: Can be fully tested by running `docker compose -f docker-compose.prod.yml up -d` on a fresh server with properly configured `.env` file, and verifying all services start healthy and the application is accessible via Caddy reverse proxy.

**Acceptance Scenarios**:

1. **Given** a fresh Ubuntu/Debian server with Docker installed, **When** I clone the repository, copy `.env.example` to `.env`, fill in production secrets, and run `docker compose -f docker-compose.prod.yml up -d`, **Then** all services (PostgreSQL, Redis, Rust GraphQL, Frontend, Caddy) start successfully and pass health checks
2. **Given** the production stack is running, **When** I access the configured domain (e.g., `https://hr.example.com`), **Then** Caddy automatically provisions SSL certificates via Let's Encrypt and serves the application over HTTPS
3. **Given** the production environment is configured, **When** I check service logs via `docker compose logs`, **Then** I see no critical errors and all services report healthy status
4. **Given** production is running, **When** a service crashes, **Then** Docker automatically restarts it according to the restart policy

---

### User Story 2 - CI/CD Pipeline for Automated Deployments (Priority: P1)

As a **developer**, I want to push code changes to the main branch and have them automatically built, tested, and deployed to production, so that updates reach users quickly without manual intervention.

**Why this priority**: Automation reduces human error, speeds up deployment cycles, and enables rapid iteration. This is critical for maintaining development velocity and ensuring consistent deployments.

**Independent Test**: Can be fully tested by creating a small code change (e.g., update README), pushing to main branch, and verifying the CI/CD pipeline automatically builds Docker images, runs tests, and deploys to the production server.

**Acceptance Scenarios**:

1. **Given** GitHub Actions is configured, **When** I push code to the main branch, **Then** the pipeline automatically triggers, builds Docker images for frontend and backend, runs tests, and pushes images to GitLab Container Registry
2. **Given** new Docker images are pushed to the registry, **When** the deployment step runs, **Then** the pipeline SSH's into the production server, pulls the latest images, and performs a rolling update with zero downtime
3. **Given** the deployment pipeline is running, **When** tests fail during the CI stage, **Then** the pipeline stops before deployment and notifies developers via GitHub Actions notifications
4. **Given** a deployment completes, **When** I check the production environment, **Then** the new version is live and all health checks pass

---

### User Story 3 - Environment Configuration Management (Priority: P2)

As a **system administrator**, I want a comprehensive `.env.example` file in the repository that documents all required environment variables with descriptions, so that I can easily configure new environments without guessing configuration options.

**Why this priority**: Proper documentation reduces setup time and prevents configuration errors. While not blocking initial deployment, it's essential for maintainability and team onboarding.

**Independent Test**: Can be fully tested by a new team member following the `.env.example` file to set up a staging environment from scratch, verifying all required variables are documented and the application starts successfully.

**Acceptance Scenarios**:

1. **Given** the `.env.example` file exists in the repository, **When** I review it, **Then** I see all required environment variables with descriptions, example values, and security notes
2. **Given** I'm setting up a new environment, **When** I copy `.env.example` to `.env` and fill in my values, **Then** the application starts without "missing environment variable" errors
3. **Given** sensitive secrets are required, **When** I review the `.env.example`, **Then** placeholder values like `<SECURE_PASSWORD>` clearly indicate where secrets must be generated
4. **Given** optional configuration exists, **When** I review the `.env.example`, **Then** optional variables have sensible defaults that work for most use cases

---

### User Story 4 - Caddy Reverse Proxy Integration (Priority: P2)

As a **DevOps engineer**, I want Caddy to act as the reverse proxy and handle SSL certificate provisioning automatically, so that I don't have to manually configure Nginx or manage Let's Encrypt certificates.

**Why this priority**: Caddy simplifies SSL management compared to Nginx. While the application could work with Nginx, Caddy reduces operational complexity and is specifically requested by the user.

**Independent Test**: Can be fully tested in two stages: (1) initially with DOMAIN=localhost verifying self-signed certificates work, (2) later by setting DOMAIN to a real domain and verifying Let's Encrypt certificates are automatically provisioned.

**Acceptance Scenarios**:

1. **Given** DOMAIN=localhost in .env file, **When** Caddy starts, **Then** it automatically generates self-signed certificates and serves the application on https://localhost
2. **Given** DOMAIN is set to a real domain (e.g., hr.example.com) pointing to the server, **When** Caddy starts, **Then** it automatically provisions a valid SSL certificate from Let's Encrypt within 60 seconds
3. **Given** Caddy is running, **When** users access the application via HTTP (port 80), **Then** Caddy automatically redirects to HTTPS (port 443)
4. **Given** multiple services are running (frontend on 3000, GraphQL on 4000), **When** Caddy receives requests, **Then** it correctly routes `/` to the frontend and `/graphql` to the GraphQL API
5. **Given** Caddy is configured, **When** I change DOMAIN from localhost to a real domain in .env and restart, **Then** Caddy switches from self-signed to Let's Encrypt certificates without Caddyfile modification

---

### User Story 5 - Local Production Testing (Priority: P3)

As a **developer**, I want to run the production Docker Compose stack locally before deploying to production, so that I can verify the production configuration works correctly in a safe environment.

**Why this priority**: Pre-deployment validation reduces production incidents. While important, this is less critical than actually having production deployment working.

**Independent Test**: Can be fully tested by running `docker compose -f docker-compose.prod.yml up` locally with local environment variables, and verifying all services start and the application functions identically to production.

**Acceptance Scenarios**:

1. **Given** I'm on my development machine, **When** I run `docker compose -f docker-compose.prod.yml up` with a local `.env` file, **Then** the entire production stack starts locally
2. **Given** the local production stack is running, **When** I access `http://localhost:3000`, **Then** I see the production-built frontend (not dev mode)
3. **Given** I'm testing locally, **When** I simulate environment variable changes, **Then** the application respects the new configuration without code changes
4. **Given** local testing is complete, **When** I stop the containers, **Then** data persists in Docker volumes and the environment is ready for the next test

---

### User Story 6 - Container Registry Integration (Priority: P3)

As a **DevOps engineer**, I want CI/CD to push built Docker images to GitLab Container Registry, so that production deployments pull pre-built images rather than building on the server.

**Why this priority**: Using a registry enables faster deployments and better version control. However, the system can initially deploy by building directly on the server.

**Independent Test**: Can be fully tested by triggering the CI pipeline, verifying images are pushed to the registry with proper tags (latest + commit SHA), and confirming production pulls from the registry.

**Acceptance Scenarios**:

1. **Given** the CI pipeline runs, **When** Docker images are built, **Then** they are tagged with both `latest` and the git commit SHA
2. **Given** images are tagged, **When** the push step executes, **Then** images are successfully pushed to GitLab Container Registry using automatic CI/CD authentication
3. **Given** production deployment runs, **When** the server pulls images, **Then** it uses the registry rather than building locally, reducing deployment time
4. **Given** a deployment fails, **When** I need to rollback, **Then** I can easily pull the previous image version by commit SHA tag

---

### Edge Cases

- **What happens when Let's Encrypt rate limits are hit?** Caddy should retry with exponential backoff; initial testing with DOMAIN=localhost avoids rate limits entirely; when switching to production domain, Caddy's built-in Let's Encrypt staging support can be used for testing
- **What happens when the database migration fails during deployment?** The CI/CD pipeline should stop the deployment immediately; the automated pg_dump backup taken before migration allows manual database restoration if needed; containers rollback to the last known good state
- **How does the system handle secrets rotation?** When secrets change in `.env`, the CI/CD pipeline should support redeploying services with new environment variables without data loss
- **What happens if the container registry is unavailable?** The deployment should fail gracefully with clear error messages, and the production server should continue running the current version
- **How does the system handle zero-downtime deployments?** Use Docker's rolling update strategy with health checks to ensure new containers are healthy before stopping old ones
- **What happens when disk space runs out on the production server?** Docker should be configured with log rotation and periodic cleanup of old images/backups to prevent disk exhaustion; without initial resource limits, disk monitoring is critical during the baseline measurement period

## Requirements *(mandatory)*

### Functional Requirements

#### Production Docker Compose Setup (FR-001 to FR-010)

- **FR-001**: System MUST provide a production-ready `docker-compose.prod.yml` file that orchestrates PostgreSQL, Redis, Rust GraphQL server, SvelteKit frontend, and Caddy reverse proxy
- **FR-002**: System MUST replace the existing Nginx-based setup with Caddy for automatic HTTPS certificate provisioning via ACME (Let's Encrypt)
- **FR-003**: System MUST use the existing Rust GraphQL server (SeaORM + async-graphql) instead of Hasura/PostGraphile from the old `docker-compose.prod.yml`
- **FR-004**: Production containers MUST use optimized production Dockerfiles with multi-stage builds (separate build and runtime stages)
- **FR-005**: System MUST configure proper health checks for all services with appropriate intervals, timeouts, and retry counts
- **FR-006**: System MUST implement restart policies (`unless-stopped` or `always`) for all production services to ensure automatic recovery
- **FR-007**: System MUST prepare docker-compose.prod.yml with commented resource limit examples; initial deployment runs without hard limits to establish baseline usage metrics for future tuning
- **FR-008**: System MUST use named Docker volumes for persistent data (PostgreSQL, Redis, uploaded files) to survive container restarts
- **FR-009**: System MUST configure proper inter-service networking with service discovery using Docker Compose service names
- **FR-010**: System MUST support running the production stack locally for pre-deployment validation

#### Environment Configuration (FR-011 to FR-015)

- **FR-011**: System MUST provide a comprehensive `.env.example` file documenting all required and optional environment variables
- **FR-012**: The `.env.example` MUST include descriptions, security notes, and example values for each variable
- **FR-012a**: The `.env.example` MUST document DOMAIN variable with examples for both modes: `DOMAIN=localhost` (default/testing) and `DOMAIN=hr.example.com` (production with Let's Encrypt)
- **FR-013**: System MUST clearly indicate which variables require secure random values (e.g., `JWT_SECRET`, `POSTGRES_PASSWORD`)
- **FR-014**: System MUST support environment-specific configuration (development, staging, production) via separate `.env` files
- **FR-015**: System MUST NOT commit actual `.env` files to version control (must be in `.gitignore`)

#### Caddy Reverse Proxy (FR-016 to FR-022)

- **FR-016**: System MUST configure Caddy as the main reverse proxy handling all incoming HTTP/HTTPS traffic
- **FR-017**: Caddy MUST support two operational modes: (1) localhost with automatic self-signed certificates for initial testing, (2) production domain with automatic Let's Encrypt certificates when DOMAIN environment variable is set
- **FR-018**: Caddy MUST automatically redirect HTTP (port 80) traffic to HTTPS (port 443) in both localhost and production domain modes
- **FR-019**: Caddy MUST route requests to the frontend service (SvelteKit on port 3000) for web pages, using either localhost or configured DOMAIN
- **FR-020**: Caddy MUST route `/graphql` and `/api` paths to the Rust GraphQL server (port 4000)
- **FR-021**: Caddy MUST support WebSocket connections for GraphQL subscriptions and real-time features
- **FR-022**: Caddy configuration (Caddyfile) MUST use environment variable substitution for DOMAIN to enable switching between localhost and production modes without editing the Caddyfile

#### CI/CD Pipeline (FR-023 to FR-035)

- **FR-023**: System MUST provide CI/CD configuration for GitHub Actions (`.github/workflows/deploy-production.yml`) with GitLab Container Registry integration
- **FR-023a**: GitHub Actions MUST authenticate to GitLab Container Registry using GitLab personal access token or deploy token stored in GitHub Secrets
- **FR-024**: CI pipeline MUST trigger automatically on push to main/master branch
- **FR-025**: CI pipeline MUST run the following stages: lint, type-check, test, build, push, deploy
- **FR-026**: System MUST build separate Docker images for the Rust GraphQL backend and SvelteKit frontend
- **FR-027**: CI pipeline MUST run frontend tests (`npm run test:unit`) and type checking (`npm run check`) before building
- **FR-028**: CI pipeline MUST run backend tests (`cargo test`) before building the Rust GraphQL server
- **FR-029**: Built Docker images MUST be tagged with both `latest` and the git commit SHA for version tracking
- **FR-030**: CI pipeline MUST push built images to GitLab Container Registry with automatic authentication via CI/CD tokens
- **FR-031**: Deployment step MUST SSH into the production server using secure credentials (SSH keys, not passwords)
- **FR-032**: Deployment MUST pull the latest images from the registry and update running containers
- **FR-033**: Deployment MUST perform rolling updates with zero downtime using Docker Compose's update strategy
- **FR-034**: Pipeline MUST stop deployment if any tests fail or builds break
- **FR-035**: System MUST send notifications (email, Slack, or GitHub notifications) on deployment success or failure

#### Database Migrations (FR-036 to FR-040)

- **FR-036**: System MUST run SeaORM database migrations automatically during container startup (Rust GraphQL server)
- **FR-037**: Migrations MUST be idempotent (safe to run multiple times)
- **FR-038**: System MUST support rollback mechanisms for failed migrations
- **FR-039**: Production deployment MUST automatically execute pg_dump backup before running migrations, stored locally on production server with timestamp naming (e.g., `backup_YYYY-MM-DD_HH-MM-SS.sql`)
- **FR-040**: Migration logs MUST be accessible via Docker logs for troubleshooting
- **FR-040a**: Database backups MUST be retained for at least 7 days with automatic cleanup of older backups to prevent disk exhaustion

#### Security (FR-041 to FR-047)

- **FR-041**: All services MUST run as non-root users inside containers for security
- **FR-042**: System MUST enforce HTTPS-only access in production (no unencrypted HTTP traffic)
- **FR-043**: Sensitive environment variables (JWT secrets, database passwords) MUST use secure random generation
- **FR-044**: System MUST implement rate limiting on Caddy to prevent abuse
- **FR-045**: Docker images MUST be scanned for vulnerabilities during CI pipeline
- **FR-046**: System MUST configure proper CORS policies to allow only authorized domains
- **FR-047**: SSH access for CI/CD deployment MUST use key-based authentication with restricted permissions

#### Monitoring & Logging (FR-048 to FR-052)

- **FR-048**: All services MUST log to stdout/stderr for Docker log collection
- **FR-049**: System MUST configure log rotation to prevent disk space exhaustion
- **FR-050**: Production deployment MUST include health check endpoints for all services
- **FR-051**: System MUST support optional integration with monitoring tools (Prometheus, Grafana, Datadog)
- **FR-052**: Deployment pipeline MUST verify services are healthy after deployment before marking success
- **FR-053**: System SHOULD provide documentation on monitoring container resource usage via `docker stats` to inform future resource limit configuration

### Key Entities

- **Production Stack**: The complete set of Docker containers running in production (PostgreSQL, Redis, Rust GraphQL, Frontend, Caddy)
- **Environment Configuration**: Collection of environment variables defined in `.env` files that configure services for different environments
- **Docker Image**: Pre-built container images stored in a registry, versioned by commit SHA and tagged as `latest`
- **CI/CD Pipeline**: Automated workflow that builds, tests, and deploys the application triggered by git commits
- **Caddy Service**: Reverse proxy container responsible for HTTPS termination, SSL certificate management, and request routing
- **Health Check**: Automated verification that a service is running correctly, used by Docker and CI/CD for deployment validation
- **Container Registry**: GitLab Container Registry storage for versioned Docker images with built-in authentication via CI/CD tokens
- **Migration**: Database schema change managed by SeaORM, applied automatically during service startup

## Clarifications

### Session 2025-10-28

- Q: Which container registry should the CI/CD pipeline use? → A: GitLab Container Registry (free private registry included)
- Q: How should database backups be performed before migrations in production? → A: Automated pg_dump in CI/CD pipeline before deployment - Stored locally on production server
- Q: Should the CI/CD implementation prioritize GitHub Actions or GitLab CI, or provide equal support for both? → A: GitHub Actions only (pushes to GitLab Container Registry)
- Q: What resource limits should be configured for production containers? → A: No hard limits initially - Monitor first, then set limits based on actual usage patterns
- Q: How should Caddy be configured for domain and SSL certificates? → A: Localhost with self-signed cert initially, with DOMAIN environment variable for switching to real domain with Let's Encrypt later

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can deploy the entire production stack on a fresh server in under 10 minutes using documented steps
- **SC-002**: Code pushed to the main branch is automatically deployed to production within 15 minutes (build + test + deploy)
- **SC-003**: Caddy automatically provisions self-signed certificates for localhost mode immediately, and valid Let's Encrypt certificates within 60 seconds when configured with a real domain
- **SC-004**: Production deployments achieve zero downtime with rolling updates, maintaining 100% uptime during updates
- **SC-005**: All services pass health checks consistently (≥99.9% health check success rate) in production
- **SC-006**: The `.env.example` file documents 100% of required environment variables with clear descriptions
- **SC-007**: CI/CD pipeline fails and stops deployment if any test fails, preventing broken code from reaching production
- **SC-008**: Database migrations complete successfully in under 30 seconds on typical dataset sizes (500-5000 events, 100-1000 employees)
- **SC-009**: Rollback to previous version can be completed in under 5 minutes by changing image tags and redeploying
- **SC-010**: Production logs are accessible via `docker compose logs` with proper timestamps and severity levels for troubleshooting
