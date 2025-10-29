# Contract: Docker Compose Production Configuration

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This contract defines the structure and requirements for `docker-compose.prod.yml`, ensuring consistent service orchestration, networking, health checks, and volume management across production deployments.

## Service Contracts

### PostgreSQL Service

**Service Name**: `postgres`

**Container Configuration**:
```yaml
image: postgres:15-alpine
container_name: sveltehr-postgres-prod
restart: unless-stopped
```

**Environment Variables** (Required):
- `POSTGRES_DB`: Database name (from .env)
- `POSTGRES_USER`: Database user (from .env, cannot be 'root')
- `POSTGRES_PASSWORD`: Secure password ≥16 chars (from .env)
- `POSTGRES_INITDB_ARGS`: '--encoding=UTF-8 --lc-collate=en_US.UTF-8 --lc-ctype=en_US.UTF-8'

**Volumes**:
- `postgres_data:/var/lib/postgresql/data` (persistent data)
- `./db/backups:/var/backups/postgresql` (backup storage)

**Ports**:
- Internal: 5432 (exposed to Docker network only, NOT to host)

**Health Check**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

**Resource Limits** (commented, optional):
```yaml
# deploy:
#   resources:
#     limits:
#       memory: 1G
#       cpus: '0.5'
```

**Network**: `sveltehr-network` (bridge)

---

### Redis Service

**Service Name**: `redis`

**Container Configuration**:
```yaml
image: redis:7-alpine
container_name: sveltehr-redis-prod
restart: unless-stopped
```

**Command**:
```yaml
command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**Volumes**:
- `redis_data:/data` (AOF persistence)

**Ports**:
- Internal: 6379 (exposed to Docker network only)

**Health Check**:
```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 3s
  retries: 3
  start_period: 10s
```

**Resource Limits** (commented, optional):
```yaml
# deploy:
#   resources:
#     limits:
#       memory: 256M
#       cpus: '0.25'
```

**Network**: `sveltehr-network`

---

### Rust GraphQL Backend Service

**Service Name**: `hr-graphql-rust`

**Container Configuration**:
```yaml
image: registry.gitlab.com/${GITLAB_PROJECT}/backend:${IMAGE_TAG}
container_name: sveltehr-graphql-rust-prod
restart: unless-stopped
user: rust  # Non-root user
```

**Build** (for local testing):
```yaml
build:
  context: ./graphql-rust-server
  dockerfile: Dockerfile.prod
  target: production
```

**Environment Variables** (Required):
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret
- `SERVICE_AUTH_KEY`: Service-to-service auth
- `CORS_ALLOWED_ORIGINS`: Allowed CORS origins
- `RUST_LOG`: Logging configuration
- `HOST`: 0.0.0.0
- `PORT`: 4000

**Ports**:
- Internal: 4000 (GraphQL API, exposed to Docker network only)

**Health Check**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s  # Longer for migration execution
```

**Depends On**:
```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
```

**Resource Limits** (commented, optional):
```yaml
# deploy:
#   resources:
#     limits:
#       memory: 512M
#       cpus: '0.5'
```

**Network**: `sveltehr-network`

---

### SvelteKit Frontend Service

**Service Name**: `frontend`

**Container Configuration**:
```yaml
image: registry.gitlab.com/${GITLAB_PROJECT}/frontend:${IMAGE_TAG}
container_name: sveltehr-frontend-prod
restart: unless-stopped
user: svelte  # Non-root user
```

**Build** (for local testing):
```yaml
build:
  context: .
  dockerfile: Dockerfile
  target: production
```

**Environment Variables** (Required):
- `NODE_ENV`: production
- `PUBLIC_API_URL`: Backend API URL (http://hr-graphql-rust:4000)
- `PORT`: 3000
- `HOST`: 0.0.0.0

**Ports**:
- Internal: 3000 (SvelteKit app, exposed to Docker network only)

**Health Check**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

**Depends On**:
```yaml
depends_on:
  hr-graphql-rust:
    condition: service_healthy
```

**Resource Limits** (commented, optional):
```yaml
# deploy:
#   resources:
#     limits:
#       memory: 256M
#       cpus: '0.25'
```

**Network**: `sveltehr-network`

---

### Caddy Reverse Proxy Service

**Service Name**: `caddy`

**Container Configuration**:
```yaml
image: caddy:2-alpine
container_name: sveltehr-caddy-prod
restart: unless-stopped
```

**Environment Variables** (Required):
- `DOMAIN`: Domain name or 'localhost' (from .env)

**Volumes**:
- `./Caddyfile:/etc/caddy/Caddyfile:ro` (configuration)
- `caddy_data:/data` (certificates, Let's Encrypt)
- `caddy_config:/config` (Caddy runtime config)

**Ports**:
- `80:80` (HTTP, redirects to HTTPS)
- `443:443` (HTTPS)
- `2019:2019` (Caddy admin API, optional)

**Health Check**:
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:2019/config/ || exit 1"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

**Depends On**:
```yaml
depends_on:
  frontend:
    condition: service_healthy
  hr-graphql-rust:
    condition: service_healthy
```

**Resource Limits** (commented, optional):
```yaml
# deploy:
#   resources:
#     limits:
#       memory: 128M
#       cpus: '0.1'
```

**Network**: `sveltehr-network`

---

## Network Contract

**Network Name**: `sveltehr-network`

**Configuration**:
```yaml
networks:
  sveltehr-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Service Discovery**:
- Services communicate via service names (e.g., `postgres`, `redis`, `hr-graphql-rust`)
- DNS resolution provided by Docker bridge network
- No IP address hardcoding allowed

---

## Volume Contract

**Named Volumes**:

```yaml
volumes:
  postgres_data:
    driver: local
    name: sveltehr_postgres_prod_data

  redis_data:
    driver: local
    name: sveltehr_redis_prod_data

  caddy_data:
    driver: local
    name: sveltehr_caddy_prod_data

  caddy_config:
    driver: local
    name: sveltehr_caddy_prod_config
```

**Persistence Requirements**:
- `postgres_data`: MUST persist across container recreation
- `redis_data`: SHOULD persist (cache, recoverable)
- `caddy_data`: MUST persist (Let's Encrypt certificates)
- `caddy_config`: SHOULD persist (Caddy runtime config)

**Backup Strategy**:
- PostgreSQL data: Backed up via pg_dump (not volume snapshots)
- Redis data: Not backed up (cache)
- Caddy data: Not backed up (auto-renewable certificates)

---

## Environment Variable Contract

**Required Variables** (must be in .env):
```bash
# Domain Configuration
DOMAIN=localhost  # or production domain

# Database
POSTGRES_DB=hr_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure_random_32+>

# Redis
REDIS_URL=redis://redis:6379

# Secrets
JWT_SECRET=<secure_random_32+>
JWT_REFRESH_SECRET=<secure_random_32+>
SERVICE_AUTH_KEY=<secure_random_32+>

# CORS
CORS_ALLOWED_ORIGINS=https://${DOMAIN}

# Logging
RUST_LOG=info,hr_graphql_server=debug
NODE_ENV=production

# GitLab Registry (for pulling images)
GITLAB_PROJECT=username/sveltehr
IMAGE_TAG=latest  # or sha-abc1234
```

**Optional Variables**:
```bash
# TLS (for Let's Encrypt mode)
TLS_EMAIL=admin@example.com

# Resource Monitoring
ENABLE_METRICS=false
```

---

## Health Check Contract

**General Requirements**:
- All services MUST implement health checks
- Health checks MUST NOT depend on external services (except dependencies)
- Health check endpoints MUST return HTTP 200 for healthy, non-200 for unhealthy
- Start period MUST account for initialization time (migrations, compilation)

**Timing Standards**:
| Service | Interval | Timeout | Retries | Start Period | Rationale |
|---------|----------|---------|---------|--------------|-----------|
| postgres | 10s | 5s | 5 | 30s | Database init time |
| redis | 10s | 3s | 3 | 10s | Fast startup |
| backend | 30s | 10s | 3 | 60s | Migration execution time |
| frontend | 30s | 10s | 3 | 30s | Build output loading |
| caddy | 30s | 5s | 3 | 10s | Config loading |

---

## Restart Policy Contract

**Standard Policy**: `restart: unless-stopped`

**Rationale**:
- Automatically recovers from crashes
- Does NOT restart if manually stopped
- Persists across Docker daemon restarts
- Preferred over `always` for production (allows manual intervention)

**Alternative Policies** (NOT used):
- `always`: Would restart even if manually stopped (too aggressive)
- `on-failure`: Only restarts on non-zero exit code (misses hangs)
- `no`: No automatic recovery (unacceptable for production)

---

## Deployment Workflow Contract

**Rolling Update Process**:
```bash
# 1. Pull new images
docker compose -f docker-compose.prod.yml pull

# 2. Recreate containers with new images (one at a time)
docker compose -f docker-compose.prod.yml up -d --no-build

# 3. Docker Compose automatically:
#    - Starts new container
#    - Waits for health check to pass
#    - Stops old container
#    - Removes old container
```

**Zero Downtime Requirements**:
- New container MUST pass health check before old container stops
- Caddy MUST continue serving traffic during update
- Database connections MUST gracefully reconnect
- In-flight requests MUST complete before container shutdown

**Rollback Procedure**:
```bash
# 1. Change IMAGE_TAG to previous version
export IMAGE_TAG=sha-previous123

# 2. Pull previous images
docker compose -f docker-compose.prod.yml pull

# 3. Recreate with previous images
docker compose -f docker-compose.prod.yml up -d --no-build
```

---

## Security Contract

**Container Security**:
- All application containers MUST run as non-root users
- Secrets MUST be provided via environment variables (NOT hardcoded)
- Container images MUST be scanned for vulnerabilities before deployment
- Only Caddy exposes ports to the host (80, 443)

**Network Security**:
- Internal services communicate via bridge network only
- No direct host network access for application services
- Caddy acts as the only ingress point

**Volume Security**:
- Volume data MUST NOT be world-readable on host
- Backup files MUST have restricted permissions (0600)

---

## Monitoring Contract

**Log Output**:
- All services MUST log to stdout/stderr
- Logs collected via `docker compose logs`
- JSON-structured logs preferred for backend services

**Log Rotation**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Metrics** (optional):
- Expose Prometheus metrics endpoints
- Caddy metrics at `:2019/metrics`
- Backend metrics at `:4000/metrics`

---

## Validation Checklist

Before deploying docker-compose.prod.yml:

- [ ] All required environment variables set in .env
- [ ] All service names follow convention (no uppercase, hyphens allowed)
- [ ] All health checks defined with appropriate timings
- [ ] Restart policy set to `unless-stopped` for all services
- [ ] Volumes use named volumes (not bind mounts for data)
- [ ] Network uses bridge driver
- [ ] No hardcoded IP addresses
- [ ] Depends_on with `condition: service_healthy` for dependencies
- [ ] Images tagged with commit SHA (not just `latest`)
- [ ] Resource limits commented with examples
- [ ] Security: non-root users, no exposed ports except Caddy

---

## Example docker-compose.prod.yml Structure

```yaml
version: '3.8'

services:
  postgres:
    # ... (as defined above)

  redis:
    # ... (as defined above)

  hr-graphql-rust:
    # ... (as defined above)

  frontend:
    # ... (as defined above)

  caddy:
    # ... (as defined above)

volumes:
  postgres_data:
  redis_data:
  caddy_data:
  caddy_config:

networks:
  sveltehr-network:
    driver: bridge
```

---

## Contract Version

**Version**: 1.0.0
**Compatibility**: Docker Compose v2.20+
**Last Updated**: 2025-10-28

**Breaking Changes**:
- None (initial version)

**Deprecations**:
- None

**Future Changes**:
- v1.1.0: May add resource limits as required (currently optional)
- v1.2.0: May add distributed tracing integration
