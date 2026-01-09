# Health Check Best Practices

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This document defines health check configurations for all services in the SvelteHR production stack. Health checks ensure services are ready before accepting traffic and enable automatic recovery from failures.

## Health Check Principles

### Why Health Checks Matter

1. **Startup Coordination**: Ensure dependencies are ready before starting dependent services
2. **Rolling Updates**: Verify new containers are healthy before stopping old ones
3. **Automatic Recovery**: Docker restarts unhealthy containers automatically
4. **Deployment Validation**: CI/CD pipeline verifies health before marking deployment successful
5. **Load Balancer Integration**: Caddy uses health checks for passive health monitoring

### Health Check Components

Every health check has these parameters:

- **test**: Command or script to determine health status (exit code 0 = healthy)
- **interval**: Time between health checks (e.g., 10s)
- **timeout**: Maximum time to wait for health check response
- **retries**: Number of consecutive failures before marking unhealthy
- **start_period**: Grace period during container initialization

## Service-Specific Health Checks

### PostgreSQL Health Check

**Configuration**:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

**Rationale**:

- **interval: 10s** - Check every 10 seconds (database state is stable)
- **timeout: 5s** - PostgreSQL should respond quickly
- **retries: 5** - Allow 50 seconds of failures before marking unhealthy
- **start_period: 30s** - Database initialization can take 20-30 seconds

**Health Check Command**:

- `pg_isready` checks if PostgreSQL is accepting connections
- Uses environment variables for user and database name
- Exit code 0 = accepting connections, non-zero = not ready

**Expected Startup Timeline**:

1. Container starts (0s)
2. PostgreSQL initializes (0-30s) - health checks don't count as failures
3. First health check after start_period (30s)
4. Marked healthy after first successful check (~30s)

### Redis Health Check

**Configuration**:

```yaml
healthcheck:
  test: ['CMD', 'redis-cli', 'ping']
  interval: 10s
  timeout: 3s
  retries: 3
  start_period: 10s
```

**Rationale**:

- **interval: 10s** - Frequent checks for fast failure detection
- **timeout: 3s** - Redis should respond almost instantly
- **retries: 3** - Allow 30 seconds of failures (conservative)
- **start_period: 10s** - Redis starts very quickly (usually <5 seconds)

**Health Check Command**:

- `redis-cli ping` returns `PONG` if Redis is healthy
- No authentication required (default configuration)
- Fast response time (<10ms typically)

**Expected Startup Timeline**:

1. Container starts (0s)
2. Redis initializes (0-5s)
3. First health check after start_period (10s)
4. Marked healthy after first successful check (~10s)

### Rust GraphQL Backend Health Check

**Configuration**:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'curl -f http://localhost:4000/health || exit 1']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

**Rationale**:

- **interval: 30s** - Less frequent (application state is more stable)
- **timeout: 10s** - Allow time for slow startup or migrations
- **retries: 3** - Allow 90 seconds of failures (migrations can be slow)
- **start_period: 60s** - Account for database migrations (can take 30-60s)

**Health Check Command**:

- `curl -f` fetches `/health` endpoint and fails on HTTP error codes
- Backend must implement `/health` endpoint returning HTTP 200
- Should verify database connectivity and critical dependencies

**Expected Health Endpoint Response**:

```json
{
	"status": "healthy",
	"timestamp": "2025-10-28T12:00:00Z",
	"checks": {
		"database": "connected",
		"redis": "connected"
	}
}
```

**Expected Startup Timeline**:

1. Container starts (0s)
2. Rust binary initialization (0-10s)
3. Database migrations run (10-60s) - health checks don't count as failures
4. First health check after start_period (60s)
5. Marked healthy after first successful check (~60s)

### SvelteKit Frontend Health Check

**Configuration**:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

**Rationale**:

- **interval: 30s** - Less frequent (static assets, stable state)
- **timeout: 10s** - Allow time for SSR rendering
- **retries: 3** - Allow 90 seconds of failures
- **start_period: 30s** - Node.js initialization and build loading (20-30s)

**Health Check Command**:

- `curl -f` fetches `/health` endpoint and fails on HTTP error codes
- Frontend must implement `/health` route returning HTTP 200
- Should verify backend API connectivity

**Expected Health Endpoint Implementation** (`src/routes/health/+server.ts`):

```typescript
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	try {
		// Verify backend is reachable
		const response = await fetch('http://hr-graphql-rust:4000/health', {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			return new Response(JSON.stringify({ status: 'unhealthy', reason: 'backend_unreachable' }), {
				status: 503,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(
			JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		return new Response(JSON.stringify({ status: 'unhealthy', error: error.message }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
```

**Expected Startup Timeline**:

1. Container starts (0s)
2. Node.js and SvelteKit initialization (0-30s)
3. First health check after start_period (30s)
4. Marked healthy after first successful check (~30s)

### Caddy Health Check

**Configuration**:

```yaml
healthcheck:
  test:
    ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:2019/config/ || exit 1']
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

**Rationale**:

- **interval: 30s** - Caddy is very stable once started
- **timeout: 5s** - Admin API responds quickly
- **retries: 3** - Allow 90 seconds of failures
- **start_period: 10s** - Caddy starts very quickly (<5 seconds)

**Health Check Command**:

- `wget --spider` checks if admin API is accessible without downloading
- Uses Caddy's admin API on port 2019
- Verifies Caddy is running and configuration is loaded

**Expected Startup Timeline**:

1. Container starts (0s)
2. Caddy loads Caddyfile and starts (0-5s)
3. Let's Encrypt provisioning (if production mode, 5-60s)
4. First health check after start_period (10s)
5. Marked healthy after first successful check (~10s for localhost, ~60s for production domain)

## Health Check Timing Summary

| Service    | Start Period | First Check | Expected Healthy | Total Startup          |
| ---------- | ------------ | ----------- | ---------------- | ---------------------- |
| PostgreSQL | 30s          | 30s         | ~30s             | ~30s                   |
| Redis      | 10s          | 10s         | ~10s             | ~10s                   |
| Backend    | 60s          | 60s         | ~60s             | ~60s (with migrations) |
| Frontend   | 30s          | 30s         | ~30s             | ~30s                   |
| Caddy      | 10s          | 10s         | ~10s (localhost) | ~10-60s                |

**Total Stack Startup Time**: ~60 seconds (worst case with migrations)

## Dependency Chain

Services must start in order due to `depends_on` with `service_healthy`:

```
PostgreSQL (30s)
    ↓
Redis (10s)
    ↓
Backend (60s) - waits for PostgreSQL + Redis
    ↓
Frontend (30s) - waits for Backend
    ↓
Caddy (10s) - waits for Frontend + Backend
```

**Total Sequential Startup**: ~60 seconds (overlapping with parallel health checks)

## Implementing Health Endpoints

### Backend Health Endpoint (Rust)

```rust
use actix_web::{get, web, HttpResponse};

#[derive(serde::Serialize)]
struct HealthResponse {
    status: String,
    timestamp: String,
    checks: HealthChecks,
}

#[derive(serde::Serialize)]
struct HealthChecks {
    database: String,
    redis: String,
}

#[get("/health")]
async fn health_check(
    db: web::Data<sea_orm::DatabaseConnection>,
    redis: web::Data<redis::Client>,
) -> HttpResponse {
    // Check database connectivity
    let db_status = match db.ping().await {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };

    // Check Redis connectivity
    let redis_status = match redis.get_connection() {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };

    if db_status == "connected" && redis_status == "connected" {
        HttpResponse::Ok().json(HealthResponse {
            status: "healthy".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            checks: HealthChecks {
                database: db_status.to_string(),
                redis: redis_status.to_string(),
            },
        })
    } else {
        HttpResponse::ServiceUnavailable().json(HealthResponse {
            status: "unhealthy".to_string(),
            timestamp: chrono::Utc::now().to_rfc3339(),
            checks: HealthChecks {
                database: db_status.to_string(),
                redis: redis_status.to_string(),
            },
        })
    }
}
```

## Troubleshooting Health Checks

### Check Container Health Status

```bash
# View health status of all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Inspect specific container health
docker inspect sveltehr-postgres-prod --format='{{.State.Health.Status}}'

# View health check logs
docker inspect sveltehr-postgres-prod --format='{{json .State.Health}}' | jq
```

### Common Issues

**Issue**: Container is "starting" forever

```
STATUS: health: starting (30 minutes ago)
```

**Solution**:

1. Check health check command manually:
   ```bash
   docker exec sveltehr-backend-prod curl -f http://localhost:4000/health
   ```
2. View container logs:
   ```bash
   docker logs sveltehr-backend-prod --tail 100
   ```
3. Verify start_period is long enough for initialization

**Issue**: Container is unhealthy after startup

```
STATUS: unhealthy
```

**Solution**:

1. Check recent health check failures:
   ```bash
   docker inspect sveltehr-backend-prod --format='{{json .State.Health.Log}}' | jq
   ```
2. Test health endpoint manually
3. Verify dependencies are healthy
4. Check application logs for errors

**Issue**: Service restarts repeatedly

```
STATUS: Restarting (5) 10 seconds ago
```

**Solution**:

1. Health check may be too strict (reduce retries)
2. Service may be crashing (check logs)
3. Dependencies may be unhealthy (check `depends_on`)

## Best Practices

1. **Always implement health endpoints** - Don't rely on process existence alone
2. **Verify critical dependencies** - Health checks should test database/cache connectivity
3. **Use appropriate start_period** - Account for migrations and initialization
4. **Test health checks locally** - Verify timing with `docker compose up`
5. **Monitor health check logs** - Identify patterns in failures
6. **Adjust retries conservatively** - Too few retries cause false positives
7. **Use depends_on: service_healthy** - Ensure proper startup order
8. **Document expected startup time** - Help debugging slow deployments

## References

- Docker Healthcheck: https://docs.docker.com/engine/reference/builder/#healthcheck
- Docker Compose Healthcheck: https://docs.docker.com/compose/compose-file/compose-file-v3/#healthcheck
- Actix-web Health Checks: https://actix.rs/docs/testing/
