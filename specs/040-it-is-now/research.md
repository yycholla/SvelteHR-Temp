# Production Docker Deployment Research

**Research Date:** 2025-10-28
**Target Architecture:** SvelteKit + Rust GraphQL (async-graphql + SeaORM)
**Focus:** Production-ready multi-container deployment with zero downtime

---

## 1. Docker Compose Production Patterns

### 1.1 Health Check Configuration Best Practices

Health checks are critical in production environments to ensure containers are not just running, but actually functional. A container in a "running" state doesn't guarantee the application inside is operational.

#### Why Health Checks Matter

- **Silent Failures:** Services can crash after startup or wait on unavailable dependencies while appearing healthy
- **Automatic Recovery:** Orchestrators can restart unhealthy containers automatically
- **Load Balancer Integration:** Only healthy containers receive traffic
- **Cascade Prevention:** Prevents cascading failures in microservices architectures

#### Configuration Parameters

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s        # How often to check (default: 30s)
  timeout: 10s         # Max time for check to complete (default: 30s)
  retries: 3           # Consecutive failures before unhealthy (default: 3)
  start_period: 40s    # Grace period for initialization (default: 0s)
```

**Parameter Tuning Guidelines:**

- **interval:** 30s is production standard; reduce to 10s for critical services
- **timeout:** Should be less than interval; typical range 5-10s
- **retries:** 3 is standard; increase to 5 for services with transient failures
- **start_period:** Set to 2-3x your typical startup time to avoid false negatives

#### Service-Specific Health Check Commands

**HTTP/REST Services:**
```yaml
# Using curl (most common)
test: ["CMD", "curl", "-f", "http://localhost:8080/health"]

# Using wget (if curl unavailable)
test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1"]

# Using nc (netcat) for basic port check
test: ["CMD-SHELL", "nc -z localhost 8080 || exit 1"]
```

**PostgreSQL:**
```yaml
test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]
interval: 10s
timeout: 5s
retries: 5
start_period: 30s
```

**Redis:**
```yaml
test: ["CMD", "redis-cli", "ping"]
interval: 10s
timeout: 3s
retries: 5
```

**GraphQL Backend (Rust):**
```yaml
# Health endpoint check
test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
interval: 30s
timeout: 10s
retries: 3
start_period: 60s  # Rust release builds may take longer to initialize
```

#### Environment-Specific Configuration

Use environment variables for flexibility:

```yaml
healthcheck:
  test: ${DOCKER_HEALTHCHECK_TEST:-curl -f http://localhost:8080/health}
  interval: ${DOCKER_HEALTHCHECK_INTERVAL:-30s}
```

**Development Override:**
```bash
export DOCKER_HEALTHCHECK_TEST="/bin/true"  # Effectively disables checks
```

#### Common Pitfalls to Avoid

1. **Missing Dependencies:** Ensure curl/wget is installed in your image
2. **Too Aggressive:** Short intervals can add unnecessary CPU load
3. **Too Lenient:** Long intervals delay failure detection
4. **Wrong Endpoint:** Health checks should verify actual functionality, not just process existence
5. **Security Surface:** curl/wget add attack surface; consider minimal alternatives

#### Debugging Unhealthy Containers

```bash
# Check health status
docker ps

# View health check logs
docker inspect <container_id> | jq '.[0].State.Health'

# Manually run health check inside container
docker exec <container_id> curl -f http://localhost:8080/health

# View container logs
docker compose logs <service_name>
```

---

### 1.2 Restart Policy Strategies

Restart policies control container behavior after crashes or host reboots.

#### Policy Comparison

| Policy | Description | Use Case |
|--------|-------------|----------|
| `no` | Never restart (default) | Development, one-off tasks |
| `always` | Always restart, even after manual stop | Critical infrastructure (dangerous in some cases) |
| `unless-stopped` | Restart unless manually stopped | **Production standard** |
| `on-failure[:max-retries]` | Restart only on non-zero exit | Services with initialization dependencies |

#### Production Recommendation: unless-stopped

```yaml
services:
  backend:
    restart: unless-stopped
```

**Why unless-stopped is preferred:**

- Restarts automatically after crashes
- Restarts after host reboot
- Respects manual `docker stop` commands (unlike `always`)
- Prevents restart loops if manually stopped for maintenance

#### When to Use on-failure

```yaml
services:
  worker:
    restart: on-failure:5  # Maximum 5 restart attempts
```

**Use cases:**
- Services with external dependencies that may be temporarily unavailable
- Prevents infinite restart loops on persistent configuration errors
- Good for initialization-sensitive services

#### Combining with Health Checks

```yaml
services:
  api:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

This combination ensures:
1. Container restarts on crashes
2. Health checks validate actual functionality
3. Orchestrators can take action on unhealthy containers

---

### 1.3 Resource Limits

Resource limits prevent runaway containers from consuming all system resources.

#### When to Use Resource Limits

**Production:** Set limits for all services to prevent resource starvation
**Development:** Often unnecessary unless testing resource constraints
**CPU-Intensive Services:** Always set CPU limits (e.g., video processing, ML)
**Memory-Intensive Services:** Always set memory limits (e.g., databases, caches)

#### Configuration Syntax

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'      # Maximum CPU cores
          memory: 1G       # Maximum memory
        reservations:
          cpus: '0.5'      # Guaranteed CPU
          memory: 512M     # Guaranteed memory
```

**Note:** `deploy` section works in Docker Swarm and Docker Compose v3+ with `docker compose` command.

#### Determining Appropriate Values

**Memory Limits:**
1. Monitor baseline usage: `docker stats --no-stream`
2. Add 20-30% buffer for spikes
3. Test under load

**Example calculation:**
- Baseline: 512MB
- Peak: 700MB
- Limit: 700MB × 1.3 = 910MB → Round to 1GB

**CPU Limits:**
- Set based on available cores and priority
- `1.0` = 100% of one core
- `0.5` = 50% of one core
- Leave headroom for system processes

#### Service-Specific Recommendations

**PostgreSQL:**
```yaml
postgres:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      reservations:
        cpus: '1.0'
        memory: 1G
```

**Rust GraphQL Backend:**
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1.5'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

**Caddy Reverse Proxy:**
```yaml
caddy:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 256M
      reservations:
        cpus: '0.1'
        memory: 128M
```

#### Memory Limit Behaviors

- **Soft Limit:** Container can exceed if host has available memory
- **Hard Limit:** Container is killed (OOM) if exceeded
- Docker Compose uses hard limits by default

**OOM Killer Protection:**
```yaml
services:
  critical-service:
    oom_kill_disable: true  # Prevent OOM killer (use with caution)
```

---

### 1.4 Rolling Update Strategies for Zero Downtime

Standard `docker compose up -d` causes 10-20 seconds of downtime during updates. Zero-downtime deployments require specialized strategies.

#### Problem with Default Behavior

```bash
docker compose up -d
# 1. Stop old container
# 2. Remove old container
# 3. Create new container
# 4. Start new container
# Result: 10-20s downtime
```

#### Solution 1: Docker Rollout Plugin (Recommended)

**Installation:**
```bash
# Download and install docker-rollout
curl -fsSL https://github.com/wowu/docker-rollout/releases/latest/download/docker-rollout -o ~/.docker/cli-plugins/docker-rollout
chmod +x ~/.docker/cli-plugins/docker-rollout
```

**Usage:**
```bash
# Replace docker compose up -d with:
docker rollout <service_name>
```

**How it works:**
1. Scales service to 2x current instances
2. Waits for new containers to pass health checks
3. Updates load balancer/proxy to route traffic to new instances
4. Removes old containers

**Requirements:**
- Health checks must be configured
- Reverse proxy (Traefik/Caddy) with dynamic backend detection

#### Solution 2: Manual Blue-Green Deployment

**docker-compose.yml:**
```yaml
services:
  backend-blue:
    image: myapp:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
    labels:
      - "traefik.enable=false"  # Initially disabled

  backend-green:
    image: myapp:previous
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
    labels:
      - "traefik.enable=true"   # Currently active
```

**Deployment script:**
```bash
#!/bin/bash
# 1. Update blue environment
docker compose up -d backend-blue

# 2. Wait for health check
timeout 60 bash -c 'until docker compose ps backend-blue | grep -q healthy; do sleep 2; done'

# 3. Switch traffic to blue
docker compose exec traefik # Update config to route to blue

# 4. Remove green
docker compose stop backend-green
docker compose rm -f backend-green
```

#### Solution 3: Docker Swarm with Rolling Updates

**Convert to Swarm:**
```bash
docker swarm init
docker stack deploy -c docker-compose.yml myapp
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  backend:
    image: myapp:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1          # Update 1 container at a time
        delay: 10s              # Wait 10s between updates
        failure_action: rollback
        monitor: 60s            # Monitor for 60s after update
        max_failure_ratio: 0.3
      rollback_config:
        parallelism: 1
        delay: 5s
```

**Update command:**
```bash
docker service update --image myapp:new-version myapp_backend
```

#### Prerequisites for Zero-Downtime Deployments

1. **Stateless Application:** Any instance can handle any request
2. **Health Checks:** Docker must know when service is ready
3. **Reverse Proxy:** Load balancer must support dynamic backends
4. **Database Migrations:** Must be backward compatible

#### Comparison of Approaches

| Approach | Complexity | Downtime | Best For |
|----------|------------|----------|----------|
| docker-rollout | Low | 0s | Docker Compose users |
| Blue-Green | Medium | 0s | Manual control needed |
| Docker Swarm | High | 0s | Large-scale deployments |
| Kubernetes | Very High | 0s | Enterprise/complex apps |

---

### 1.5 Secrets Management Patterns

Secrets are sensitive data like passwords, API keys, and certificates that must be protected.

#### Docker Secrets vs Environment Variables

**Security Comparison:**

| Aspect | Environment Variables | Docker Secrets |
|--------|----------------------|----------------|
| Visibility | `docker inspect` shows values | Not visible in inspect |
| Storage | Plain text in config | Encrypted at rest and in transit |
| Access | Available to all processes | Mounted as files in /run/secrets |
| Logging Risk | May leak to logs | Less likely to leak |
| Commit Risk | Often committed to git | Managed separately |
| Swarm Support | Yes | Yes |
| Compose Support | Yes | Limited (v3.1+) |

#### Why Environment Variables Are Risky

1. **Easy Inspection:** `docker inspect` exposes all ENV vars including passwords
2. **Process Visibility:** All processes with equal/higher privileges can access
3. **Accidental Commits:** Often forgotten in docker-compose.yml
4. **Logging Exposure:** Exception handlers may dump full context to logs
5. **Backup Leaks:** Plain text values in backups and lost hard drives

#### Production Best Practice: Docker Secrets

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password

  backend:
    image: myapp:latest
    secrets:
      - db_password
      - jwt_secret
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret

secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

**Application Code (Rust example):**
```rust
use std::fs;

fn read_secret(secret_name: &str) -> Result<String, std::io::Error> {
    let secret_path = format!("/run/secrets/{}", secret_name);
    fs::read_to_string(secret_path)
        .map(|s| s.trim().to_string())
}

// Usage
let db_password = read_secret("db_password")?;
```

**Benefits:**
- Secrets mounted as tmpfs (RAM-only, never written to disk)
- Automatically unmounted when container stops
- Encrypted in Swarm mode
- Not visible in `docker inspect`

#### When Environment Variables Are Acceptable

Environment variables may be acceptable if:
- Used only in isolated development environments
- No one else can access the Docker host
- Secrets are rotated frequently
- Alternative secret managers are unavailable

**Mitigation strategies:**
```yaml
# Use .env file (never commit to git)
services:
  backend:
    env_file:
      - .env.production  # Add to .gitignore

# Or external file
services:
  backend:
    environment:
      DB_PASSWORD: ${DB_PASSWORD}  # Loaded from host environment
```

#### Advanced: External Secret Managers

**HashiCorp Vault Integration:**
```yaml
services:
  backend:
    image: myapp:latest
    environment:
      VAULT_ADDR: https://vault.example.com
      VAULT_TOKEN_FILE: /run/secrets/vault_token
    secrets:
      - vault_token
    entrypoint:
      - /bin/sh
      - -c
      - |
        export DB_PASSWORD=$$(vault kv get -field=password secret/db)
        exec /app/backend
```

#### Best Practices Summary

1. **Use Docker Secrets** for production when possible
2. **Never commit secrets** to version control
3. **Rotate secrets regularly** (every 90 days minimum)
4. **Principle of least privilege:** Each service gets only its needed secrets
5. **Audit secret access** through logging and monitoring
6. **Review logging configurations** to prevent accidental secret exposure
7. **Use individual secrets** per service, not shared secrets

---

## 2. Caddy Reverse Proxy

### 2.1 Automatic HTTPS with Let's Encrypt

Caddy's killer feature is automatic HTTPS with zero configuration.

#### How Automatic HTTPS Works

1. Caddy detects domain names in Caddyfile
2. Requests certificates from Let's Encrypt via ACME protocol
3. Handles HTTP-01 or TLS-ALPN-01 challenges automatically
4. Stores certificates in persistent storage
5. Auto-renews certificates before expiration
6. Redirects HTTP → HTTPS automatically

#### Basic Configuration

**Caddyfile (automatic HTTPS):**
```caddyfile
example.com {
    reverse_proxy backend:8080
}
```

That's it! Caddy will:
- Obtain certificate from Let's Encrypt
- Set up HTTPS on port 443
- Redirect HTTP (port 80) to HTTPS
- Renew certificate automatically

#### Requirements for Let's Encrypt

1. **Valid domain:** Must resolve to your server's public IP
2. **Port 80/443 open:** Required for ACME challenges
3. **Persistent storage:** Certificates stored in `/data/caddy`
4. **No existing service** on port 80/443

#### Docker Compose Configuration

```yaml
version: '3.8'

services:
  caddy:
    image: caddy:2.8-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data  # CRITICAL: Persists certificates
      - caddy_config:/config
    environment:
      - DOMAIN=${DOMAIN:-example.com}
    networks:
      - web

volumes:
  caddy_data:  # Must be persistent to avoid rate limits
  caddy_config:

networks:
  web:
    driver: bridge
```

**CRITICAL:** The `caddy_data` volume MUST be persistent. Losing certificates triggers re-issuance and can hit Let's Encrypt rate limits (50 certificates per domain per week).

---

### 2.2 Self-Signed Certificates for Localhost

For development and internal networks, Caddy can generate self-signed certificates.

#### Automatic Self-Signed Certificates

**Caddyfile:**
```caddyfile
localhost {
    reverse_proxy backend:8080
}

# Or internal hostname
internal.local {
    tls internal  # Force self-signed
    reverse_proxy backend:8080
}
```

Caddy automatically generates self-signed certs for:
- `localhost`
- `*.localhost` (wildcard)
- IP addresses (e.g., `127.0.0.1`)
- Internal/non-public domains

#### Custom Self-Signed Certificate

**Generate certificate:**
```bash
# Using openssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout localhost.key \
  -out localhost.crt \
  -subj "/CN=localhost"

# Using Caddy
caddy trust
```

**Caddyfile:**
```caddyfile
localhost {
    tls localhost.crt localhost.key
    reverse_proxy backend:8080
}
```

#### Development Configuration

```yaml
services:
  caddy:
    image: caddy:2.8-alpine
    ports:
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./certs:/certs:ro  # Custom certificates
    command: caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
```

#### Trust Self-Signed Certificates

**Browser:**
- Accept the security warning (development only)

**System-wide (Linux):**
```bash
# Copy certificate
sudo cp localhost.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# Or use Caddy's trust command
caddy trust
```

**curl:**
```bash
curl --cacert localhost.crt https://localhost
# Or skip verification (insecure, dev only)
curl -k https://localhost
```

---

### 2.3 Environment Variable Substitution in Caddyfile

Caddy supports environment variable substitution for dynamic configuration.

#### Syntax

```caddyfile
{$VARIABLE_NAME}           # Required variable
{$VARIABLE_NAME:default}   # Optional with default value
```

#### Production Example

**Caddyfile:**
```caddyfile
{$DOMAIN:example.com} {
    reverse_proxy {$BACKEND_HOST:backend}:{$BACKEND_PORT:8080}

    header {
        # Security headers
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    encode gzip

    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

**docker-compose.yml:**
```yaml
services:
  caddy:
    image: caddy:2.8-alpine
    environment:
      - DOMAIN=api.example.com
      - BACKEND_HOST=backend
      - BACKEND_PORT=8080
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_logs:/var/log/caddy
```

#### Multi-Environment Configuration

**docker-compose.prod.yml:**
```yaml
services:
  caddy:
    environment:
      - DOMAIN=api.example.com
      - BACKEND_HOST=backend
```

**docker-compose.dev.yml:**
```yaml
services:
  caddy:
    environment:
      - DOMAIN=localhost
      - BACKEND_HOST=backend
```

**Usage:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

### 2.4 WebSocket Proxying for GraphQL Subscriptions

GraphQL subscriptions require WebSocket support, which Caddy handles automatically.

#### Automatic WebSocket Detection

Caddy automatically upgrades connections to WebSocket when it detects:
- `Connection: Upgrade` header
- `Upgrade: websocket` header

**Caddyfile (no special config needed):**
```caddyfile
api.example.com {
    reverse_proxy backend:8080
}
```

This handles both HTTP and WebSocket connections!

#### Explicit WebSocket Configuration

For fine-grained control:

```caddyfile
api.example.com {
    # Match WebSocket requests
    @websockets {
        header Connection *Upgrade*
        header Upgrade websocket
    }

    # Route WebSocket to backend
    reverse_proxy @websockets backend:8080 {
        # WebSocket-specific timeouts
        flush_interval -1          # Disable buffering
        transport http {
            read_timeout 0         # No timeout for long-lived connections
            write_timeout 0
        }
    }

    # Route other requests
    reverse_proxy backend:8080
}
```

#### Stream Timeout Configuration

For long-lived WebSocket connections:

```caddyfile
api.example.com {
    reverse_proxy backend:8080 {
        # Close connections after 24 hours (optional)
        @websockets header Connection *Upgrade*
        flush_interval -1

        # Prevent abrupt closure during config reload
        stream_timeout 24h
        stream_close_delay 5m
    }
}
```

**Parameters:**
- `stream_timeout`: Maximum duration for active streams
- `stream_close_delay`: Grace period during Caddy config reload

#### GraphQL Subscription Example

**Rust Backend (async-graphql):**
```rust
// WebSocket endpoint at /graphql/ws
use async_graphql_axum::{GraphQLProtocol, GraphQLWebSocket};

async fn graphql_ws(
    schema: Extension<Schema>,
    protocol: GraphQLProtocol,
    websocket: WebSocketUpgrade,
) -> Response {
    websocket
        .protocols(ALL_WEBSOCKET_PROTOCOLS)
        .on_upgrade(move |stream| {
            GraphQLWebSocket::new(stream, schema.clone(), protocol)
                .serve()
        })
}
```

**Caddyfile:**
```caddyfile
api.example.com {
    # GraphQL HTTP queries
    reverse_proxy /graphql backend:8080

    # GraphQL subscriptions (WebSocket)
    reverse_proxy /graphql/ws backend:8080 {
        @websockets header Connection *Upgrade*
        flush_interval -1
    }
}
```

#### Testing WebSocket Connections

```bash
# Using wscat
npm install -g wscat
wscat -c wss://api.example.com/graphql/ws

# Using curl (upgrade request)
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  https://api.example.com/graphql/ws
```

---

### 2.5 Security Headers and Rate Limiting

#### Security Headers

**Caddyfile:**
```caddyfile
example.com {
    reverse_proxy backend:8080

    header {
        # HSTS (force HTTPS for 1 year)
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

        # Prevent MIME sniffing
        X-Content-Type-Options "nosniff"

        # Clickjacking protection
        X-Frame-Options "DENY"

        # XSS protection
        X-XSS-Protection "1; mode=block"

        # Control referrer information
        Referrer-Policy "strict-origin-when-cross-origin"

        # Content Security Policy
        Content-Security-Policy "default-src 'self'"

        # Disable FLoC tracking
        Permissions-Policy "interest-cohort=()"

        # Remove server identification
        -Server
        -X-Powered-By
    }
}
```

#### Rate Limiting (via caddy-security plugin)

Caddy doesn't have built-in rate limiting, but caddy-security plugin provides it:

**Build custom Caddy with plugin:**
```dockerfile
FROM caddy:2.8-builder AS builder

RUN xcaddy build \
    --with github.com/greenpau/caddy-security

FROM caddy:2.8-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

**Caddyfile with rate limiting:**
```caddyfile
{
    order authenticate before respond
    order authorize before reverse_proxy

    security {
        authentication {
            rate_limit {
                default allow 100 per hour

                # Stricter for login endpoints
                login allow 5 per minute
            }
        }
    }
}

api.example.com {
    route /api/login {
        rate_limit login
        reverse_proxy backend:8080
    }

    route /api/* {
        rate_limit default
        reverse_proxy backend:8080
    }
}
```

#### Alternative: Application-Level Rate Limiting

For simpler deployments, implement rate limiting in your application:

**Rust (tower-http):**
```rust
use tower_http::limit::RateLimitLayer;
use std::time::Duration;

let app = Router::new()
    .route("/graphql", post(graphql_handler))
    .layer(RateLimitLayer::new(
        100,                           // 100 requests
        Duration::from_secs(60),      // per minute
    ));
```

---

## 3. GitHub Actions + GitLab Container Registry

### 3.1 Authentication to GitLab Container Registry from GitHub Actions

#### Prerequisites

1. **GitLab Deploy Token:**
   - Navigate to: GitLab Project → Settings → Repository → Deploy Tokens
   - Name: `github-actions-deploy`
   - Scopes: `read_registry`, `write_registry`
   - Copy username and token (shown once)

2. **GitHub Secrets:**
   - Navigate to: GitHub Repo → Settings → Secrets and Variables → Actions
   - Add secrets:
     - `GITLAB_DEPLOY_USERNAME`: Deploy token username
     - `GITLAB_DEPLOY_TOKEN`: Deploy token value

#### GitHub Actions Workflow

**.github/workflows/deploy.yml:**
```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: registry.gitlab.com
  IMAGE_NAME: your-group/your-project/backend

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitLab Container Registry
        uses: docker/login-action@v3
        with:
          registry: registry.gitlab.com
          username: ${{ secrets.GITLAB_DEPLOY_USERNAME }}
          password: ${{ secrets.GITLAB_DEPLOY_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

#### Important Notes

1. **SSH Limitation:** Deploy tokens do NOT support SSH, only HTTPS
2. **Registry URL:** Must be exactly `registry.gitlab.com` for GitLab.com
3. **Self-Hosted GitLab:** Use `registry.your-gitlab.com`
4. **Token Scopes:**
   - `read_registry`: Pull images (required for cache)
   - `write_registry`: Push images (required for deployment)

---

### 3.2 Multi-Stage Docker Build Optimization in CI

Multi-stage builds reduce final image size and CI build time through layer caching.

#### Basic Multi-Stage Pattern

**Dockerfile (SvelteKit):**
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV ORIGIN=https://example.com

RUN addgroup -g 1001 -S nodejs && \
    adduser -S sveltekit -u 1001

COPY --from=builder --chown=sveltekit:nodejs /app/build ./build
COPY --from=builder --chown=sveltekit:nodejs /app/package.json ./
COPY --from=deps --chown=sveltekit:nodejs /app/node_modules ./node_modules

USER sveltekit
EXPOSE 3000

CMD ["node", "build"]
```

**Size comparison:**
- Without multi-stage: ~800MB
- With multi-stage: ~150MB

---

### 3.3 SSH Deployment Strategies with Key-Based Auth

#### Prerequisites

1. **SSH Key Pair:**
```bash
# Generate key (on local machine)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key
# Do NOT set a passphrase (for automation)

# Copy public key to server
ssh-copy-id -i ~/.ssh/deploy_key.pub user@server.com
```

2. **GitHub Secret:**
```bash
# Add private key to GitHub Secrets as SSH_PRIVATE_KEY
cat ~/.ssh/deploy_key
```

#### Deployment Workflow

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure SSH
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SSH_KNOWN_HOSTS: ${{ secrets.SSH_KNOWN_HOSTS }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          echo "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts

      - name: Deploy via SSH
        env:
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
        run: |
          ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no \
            $SERVER_USER@$SERVER_HOST << 'EOF'
            cd /opt/myapp

            # Authenticate to GitLab registry
            echo ${{ secrets.GITLAB_DEPLOY_TOKEN }} | \
              docker login registry.gitlab.com \
              -u ${{ secrets.GITLAB_DEPLOY_USERNAME }} --password-stdin

            # Pull latest image
            docker compose pull

            # Rolling update (zero downtime)
            docker rollout backend

            # Cleanup
            docker image prune -f
          EOF
```

#### Alternative: Using appleboy/ssh-action

```yaml
- name: Deploy via SSH
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.SERVER_HOST }}
    username: ${{ secrets.SERVER_USER }}
    key: ${{ secrets.SSH_PRIVATE_KEY }}
    script: |
      cd /opt/myapp
      docker compose pull
      docker rollout backend
      docker image prune -f
```

#### Security Best Practices

1. **Dedicated Deploy User:**
```bash
# On server
sudo adduser --disabled-password deploy
sudo usermod -aG docker deploy

# Restrict sudo access
sudo visudo
# Add: deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose
```

2. **SSH Hardening:**
```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Restart SSH
sudo systemctl restart sshd
```

3. **Firewall Rules:**
```bash
# Allow SSH only from GitHub Actions IP ranges
sudo ufw allow from 140.82.112.0/20 to any port 22
sudo ufw enable
```

---

### 3.4 Rollback Mechanisms for Failed Deployments

#### Strategy 1: Image Tags with Git SHA

**Workflow:**
```yaml
- name: Build and push
  uses: docker/build-push-action@v5
  with:
    tags: |
      registry.gitlab.com/group/project:${{ github.sha }}
      registry.gitlab.com/group/project:latest
```

**Rollback:**
```bash
# List available versions
docker images registry.gitlab.com/group/project

# Rollback to specific SHA
docker compose stop backend
docker run -d --name backend \
  registry.gitlab.com/group/project:abc123def \
  # ... other options
```

#### Strategy 2: docker compose down + up

**docker-compose.yml:**
```yaml
services:
  backend:
    image: registry.gitlab.com/group/project:${IMAGE_TAG:-latest}
```

**Rollback script:**
```bash
#!/bin/bash
PREVIOUS_TAG="abc123def"  # Get from deployment history

# Stop current version
docker compose down

# Start previous version
IMAGE_TAG=$PREVIOUS_TAG docker compose up -d

# Verify health
timeout 60 bash -c 'until docker compose ps backend | grep -q healthy; do sleep 2; done'
```

#### Strategy 3: Automated Rollback on Failure

**.github/workflows/deploy.yml:**
```yaml
jobs:
  deploy:
    steps:
      # ... build and push steps ...

      - name: Deploy new version
        id: deploy
        run: |
          ssh user@server 'cd /opt/app && docker rollout backend'

      - name: Health check
        id: healthcheck
        run: |
          sleep 10
          response=$(curl -f https://api.example.com/health || echo "failed")
          if [[ "$response" == "failed" ]]; then
            echo "Health check failed!"
            exit 1
          fi

      - name: Rollback on failure
        if: failure() && steps.deploy.conclusion == 'success'
        run: |
          echo "Deployment failed, rolling back..."
          ssh user@server << 'EOF'
            cd /opt/app
            docker compose down
            IMAGE_TAG=${{ env.PREVIOUS_TAG }} docker compose up -d
          EOF
```

#### Strategy 4: Blue-Green with Automatic Rollback

**deploy-script.sh (on server):**
```bash
#!/bin/bash
set -e

# Determine current active environment
CURRENT=$(docker compose ps -q backend-green > /dev/null 2>&1 && echo "green" || echo "blue")
NEW=$([ "$CURRENT" = "blue" ] && echo "green" || echo "blue")

echo "Current: $CURRENT, Deploying to: $NEW"

# Deploy new version
docker compose up -d backend-$NEW

# Wait for health check
timeout 60 bash -c "until docker compose ps backend-$NEW | grep -q healthy; do sleep 2; done" || {
  echo "Health check failed, aborting deployment"
  docker compose stop backend-$NEW
  exit 1
}

# Run smoke tests
curl -f https://api.example.com/health || {
  echo "Smoke test failed, rolling back"
  docker compose stop backend-$NEW
  exit 1
}

# Switch traffic to new version (update Caddy config)
# ... traffic switching logic ...

# Stop old version
docker compose stop backend-$CURRENT

echo "Deployment successful: $NEW is now active"
```

---

### 3.5 Image Tagging Strategies

#### Recommended Tagging Strategy

Tag images with multiple identifiers for flexibility:

```yaml
- name: Docker metadata
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: registry.gitlab.com/group/project
    tags: |
      # Git branch
      type=ref,event=branch

      # Pull request
      type=ref,event=pr

      # Git tag (semver)
      type=semver,pattern={{version}}
      type=semver,pattern={{major}}.{{minor}}
      type=semver,pattern={{major}}

      # Git commit SHA
      type=sha,prefix={{branch}}-,format=short

      # Latest (only on main branch)
      type=raw,value=latest,enable={{is_default_branch}}
```

**Results in tags:**
- `registry.gitlab.com/group/project:main`
- `registry.gitlab.com/group/project:main-a1b2c3d`
- `registry.gitlab.com/group/project:latest`
- `registry.gitlab.com/group/project:v1.2.3`
- `registry.gitlab.com/group/project:v1.2`
- `registry.gitlab.com/group/project:v1`

#### Tag Selection in Production

**docker-compose.prod.yml:**
```yaml
services:
  backend:
    # Use specific SHA for production (immutable)
    image: registry.gitlab.com/group/project:main-${DEPLOY_SHA}
```

**Deployment:**
```bash
# Deploy specific version
DEPLOY_SHA=a1b2c3d docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

#### Cleanup Old Images

```yaml
- name: Cleanup old images
  run: |
    ssh user@server << 'EOF'
      # Keep last 5 versions
      docker images registry.gitlab.com/group/project --format "{{.ID}} {{.CreatedAt}}" | \
        tail -n +6 | \
        awk '{print $1}' | \
        xargs -r docker rmi -f
    EOF
```

---

## 4. Database Backup Automation

### 4.1 pg_dump Automation in CI/CD Pipelines

#### Backup Workflow

**.github/workflows/backup.yml:**
```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:       # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest

    steps:
      - name: Backup PostgreSQL
        run: |
          # SSH into server and create backup
          ssh -i ~/.ssh/deploy_key ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << 'EOF'
            BACKUP_DIR="/backup/postgres"
            BACKUP_FILE="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql.gz"

            mkdir -p $BACKUP_DIR

            # Create compressed backup
            docker exec postgres pg_dump -U myuser mydb | gzip > $BACKUP_FILE

            # Verify backup
            gunzip -t $BACKUP_FILE || {
              echo "Backup verification failed!"
              exit 1
            }

            echo "Backup created: $BACKUP_FILE"
          EOF

      - name: Upload to cloud storage
        run: |
          # Example: Upload to S3
          ssh -i ~/.ssh/deploy_key ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << 'EOF'
            aws s3 cp /backup/postgres/db-$(date +%Y%m%d)*.sql.gz \
              s3://my-backups/postgres/ \
              --storage-class GLACIER
          EOF
```

---

### 4.2 Backup Retention Policies and Cleanup

#### Retention Strategy

**Common retention schedule:**
- Daily backups: Keep last 7 days
- Weekly backups: Keep last 4 weeks
- Monthly backups: Keep last 12 months

#### Cleanup Script

**cleanup-backups.sh:**
```bash
#!/bin/bash
BACKUP_DIR="/backup/postgres"

# Delete daily backups older than 7 days
find $BACKUP_DIR -name "db-*.sql.gz" -type f -mtime +7 -delete

# Keep one backup per week for last 4 weeks
# (assumes daily backups exist)
for week in {1..4}; do
  start_date=$(date -d "$week weeks ago monday" +%Y%m%d)
  end_date=$(date -d "$week weeks ago sunday" +%Y%m%d)

  # Keep newest backup from this week
  find $BACKUP_DIR -name "db-*.sql.gz" -type f \
    -newermt "$start_date" ! -newermt "$end_date" | \
    sort -r | tail -n +2 | xargs -r rm
done

# Keep one backup per month for last 12 months
for month in {1..12}; do
  month_date=$(date -d "$month months ago" +%Y%m)

  find $BACKUP_DIR -name "db-$month_date*.sql.gz" -type f | \
    sort -r | tail -n +2 | xargs -r rm
done

echo "Backup cleanup completed"
```

---

### 4.3 Restoration Procedures

#### Restore from Backup

```bash
#!/bin/bash
BACKUP_FILE="/backup/postgres/db-20241028-020000.sql.gz"

# Stop application (prevent writes during restore)
docker compose stop backend

# Drop and recreate database
docker exec -i postgres psql -U postgres << EOF
DROP DATABASE IF EXISTS mydb;
CREATE DATABASE mydb;
GRANT ALL PRIVILEGES ON DATABASE mydb TO myuser;
EOF

# Restore from backup
gunzip -c $BACKUP_FILE | docker exec -i postgres psql -U myuser mydb

# Verify restoration
docker exec postgres psql -U myuser mydb -c "SELECT COUNT(*) FROM users;"

# Restart application
docker compose start backend
```

---

### 4.4 Zero-Downtime Backup Approaches

#### Strategy 1: Read Replica Backup

```yaml
services:
  postgres-primary:
    image: postgres:17-alpine
    environment:
      POSTGRES_REPLICATION_MODE: master

  postgres-replica:
    image: postgres:17-alpine
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_HOST: postgres-primary
```

**Backup from replica:**
```bash
docker exec postgres-replica pg_dump -U myuser mydb | gzip > backup.sql.gz
```

#### Strategy 2: Sidecar Backup Container

**docker-compose.yml:**
```yaml
services:
  postgres:
    image: postgres:17-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backup:
    image: kartoza/pg-backup:17-3.5
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DBNAME: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASS_FILE: /run/secrets/db_password
      CRON_SCHEDULE: "0 2 * * *"  # 2 AM daily
      BACKUP_DIR: /backups
      REMOVE_BEFORE: 7  # Keep last 7 days
    volumes:
      - ./backups:/backups
    secrets:
      - db_password
    depends_on:
      - postgres
```

---

## 5. Rust Production Docker Builds

### 5.1 Multi-Stage Dockerfile Patterns for Rust

#### Optimized Rust Dockerfile

**Dockerfile:**
```dockerfile
# Stage 1: Dependencies (cargo-chef for caching)
FROM lukemathwalker/cargo-chef:latest-rust-1.80 AS chef
WORKDIR /app

# Stage 2: Recipe generation
FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo chef prepare --recipe-path recipe.json

# Stage 3: Build dependencies
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json

# Build dependencies (cached unless Cargo.toml changes)
RUN cargo chef cook --release --recipe-path recipe.json

# Copy source and build application
COPY . .
RUN cargo build --release

# Stage 4: Runtime
FROM debian:bookworm-slim AS runtime
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/backend /usr/local/bin/backend

# Create non-root user
RUN useradd -m -u 1001 appuser && \
    chown appuser:appuser /usr/local/bin/backend

USER appuser
EXPOSE 8080

CMD ["backend"]
```

**Size comparison:**
- Builder stage: ~2.5GB
- Runtime stage: ~150MB

---

### 5.2 cargo build --release Optimization

#### Build Performance Optimization

**Cargo.toml:**
```toml
[profile.release]
opt-level = 3           # Maximum optimization
lto = "fat"             # Link-time optimization
codegen-units = 1       # Single codegen unit (slower build, faster binary)
strip = true            # Strip symbols (smaller binary)
panic = 'abort'         # Don't unwind on panic

[profile.release-fast-build]
inherits = "release"
lto = "thin"            # Faster LTO
codegen-units = 16      # Faster builds
```

**Usage:**
```bash
# Production build (smaller, slower to compile)
cargo build --release

# Fast iteration (during development)
cargo build --profile release-fast-build
```

#### Docker Build Cache Optimization

**.dockerignore:**
```
target/
.git/
.env
*.log
node_modules/
```

**Build command:**
```bash
# Use BuildKit cache mounts
DOCKER_BUILDKIT=1 docker build \
  --cache-from registry.gitlab.com/group/project:buildcache \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t registry.gitlab.com/group/project:latest \
  .
```

---

### 5.3 SeaORM Migration Automation on Container Startup

#### Migration Runner Script

**entrypoint.sh:**
```bash
#!/bin/bash
set -e

echo "Running database migrations..."

# Run SeaORM migrations
/usr/local/bin/backend migrate up

if [ $? -eq 0 ]; then
  echo "Migrations completed successfully"
else
  echo "Migration failed!"
  exit 1
fi

echo "Starting application..."
exec /usr/local/bin/backend
```

**Dockerfile addition:**
```dockerfile
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

#### Rust Migration Code

**src/main.rs:**
```rust
use sea_orm_migration::prelude::*;

async fn run_migrations(db: &DatabaseConnection) -> Result<(), DbErr> {
    Migrator::up(db, None).await?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Database connection
    let db = Database::connect(&db_url).await?;

    // Run migrations on startup
    run_migrations(&db).await?;

    // Start server
    start_server(db).await?;

    Ok(())
}
```

---

### 5.4 Minimal Base Images (Alpine vs Debian)

#### Image Size Comparison

| Base Image | Size | SSL/TLS | glibc | Use Case |
|------------|------|---------|-------|----------|
| `alpine:3.19` | ~7MB | LibreSSL | musl | Smallest, may have compatibility issues |
| `debian:bookworm-slim` | ~80MB | OpenSSL | glibc | Best compatibility, production recommended |
| `ubuntu:22.04` | ~80MB | OpenSSL | glibc | Good compatibility, slightly larger |
| `scratch` | 0MB | None | None | Static binaries only |

#### Alpine Linux Dockerfile

```dockerfile
FROM rust:1.80-alpine AS builder
RUN apk add --no-cache musl-dev openssl-dev postgresql-dev

WORKDIR /app
COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM alpine:3.19
RUN apk add --no-cache ca-certificates libpq
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/backend /usr/local/bin/
CMD ["backend"]
```

**Pros:**
- Smallest image size (~20MB total)
- Fast download times

**Cons:**
- musl libc can have compatibility issues
- Some crates may not compile
- OpenSSL issues common

#### Debian Slim Dockerfile (Recommended)

```dockerfile
FROM rust:1.80-slim-bookworm AS builder
RUN apt-get update && apt-get install -y \
    pkg-config libssl-dev libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    ca-certificates libssl3 libpq5 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/backend /usr/local/bin/
CMD ["backend"]
```

**Pros:**
- Excellent compatibility
- Standard glibc
- Reliable SSL/TLS

**Cons:**
- Larger size (~150MB total)

#### Production Recommendation

**Use Debian Slim for production** unless:
- You have strict size requirements (<50MB)
- You've thoroughly tested Alpine compatibility
- You're using only pure Rust dependencies

---

## 6. Security Considerations

### 6.1 Image Scanning

**GitHub Actions workflow:**
```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'registry.gitlab.com/group/project:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

---

### 6.2 Non-Root User

Always run containers as non-root:

```dockerfile
RUN useradd -m -u 1001 appuser
USER appuser
```

---

### 6.3 Read-Only Filesystem

```yaml
services:
  backend:
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

---

## 7. Performance Optimization

### 7.1 BuildKit Cache

**GitHub Actions:**
```yaml
- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
    cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
```

---

### 7.2 Layer Optimization

**Good:**
```dockerfile
# Install dependencies in one layer
RUN apt-get update && apt-get install -y \
    pkg1 pkg2 pkg3 \
    && rm -rf /var/lib/apt/lists/*
```

**Bad:**
```dockerfile
# Each RUN creates a new layer
RUN apt-get update
RUN apt-get install pkg1
RUN apt-get install pkg2
```

---

## 8. Monitoring and Logging

### 8.1 Structured Logging

**Caddy:**
```caddyfile
log {
    output file /var/log/caddy/access.log {
        roll_size 100mb
        roll_keep 10
    }
    format json
}
```

**Rust (tracing):**
```rust
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

tracing_subscriber::registry()
    .with(tracing_subscriber::fmt::layer().json())
    .init();
```

---

### 8.2 Health Monitoring

**docker-compose.yml:**
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    labels:
      - "com.centurylinklabs.watchtower.enable=true"
```

---

## 9. Common Pitfalls

### 9.1 Let's Encrypt Rate Limits

- **50 certificates per domain per week**
- Use staging endpoint for testing: `https://acme-staging-v02.api.letsencrypt.org/directory`
- MUST persist Caddy's `/data` volume

### 9.2 Docker Compose Version

- Use `docker compose` (v2), not `docker-compose` (v1)
- V2 is significantly faster and actively maintained

### 9.3 Database Connection Pooling

```rust
// SeaORM connection pooling
let db = Database::connect(
    DatabaseConnection::new(ConnectionOptions {
        max_connections: 100,
        min_connections: 5,
        connect_timeout: Duration::from_secs(8),
        acquire_timeout: Duration::from_secs(8),
        idle_timeout: Duration::from_secs(8),
        max_lifetime: Duration::from_secs(3600),
        sqlx_logging: true,
        ..Default::default()
    })
).await?;
```

---

## 10. Production Deployment Checklist

### Pre-Deployment

- [ ] Health checks configured for all services
- [ ] Restart policy set to `unless-stopped`
- [ ] Resource limits configured
- [ ] Secrets managed via Docker secrets or external vault
- [ ] SSL/TLS certificates configured (Let's Encrypt or self-signed)
- [ ] Database backups automated
- [ ] Monitoring and logging enabled
- [ ] Zero-downtime deployment strategy selected

### Deployment

- [ ] Image built and pushed to registry
- [ ] SSH access to server configured
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Health checks pass after deployment

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Verify health endpoints
- [ ] Test critical user flows
- [ ] Check resource usage
- [ ] Verify backup creation

---

## 11. Recommended Tools

| Category | Tool | Purpose |
|----------|------|---------|
| Zero-Downtime | docker-rollout | Rolling updates for Compose |
| Backup | kartoza/pg-backup | Automated PostgreSQL backups |
| Secrets | Doppler / HashiCorp Vault | Secret management |
| Monitoring | Grafana + Prometheus | Metrics and dashboards |
| Logging | Loki + Promtail | Centralized logging |
| Security | Trivy | Container vulnerability scanning |
| CI/CD | GitHub Actions | Build and deploy automation |

---

## 12. References

### Documentation
- Docker Compose: https://docs.docker.com/compose/
- Caddy: https://caddyserver.com/docs/
- GitHub Actions: https://docs.github.com/en/actions
- SeaORM: https://www.sea-ql.org/SeaORM/
- GitLab Container Registry: https://docs.gitlab.com/ee/user/packages/container_registry/

### Tools
- docker-rollout: https://github.com/wowu/docker-rollout
- cargo-chef: https://github.com/LukeMathWalker/cargo-chef
- Trivy: https://github.com/aquasecurity/trivy

### Articles
- "Fast Rust Docker Builds with cargo-chef" by Luca Palmieri
- "Zero-Downtime Deployments with Docker Compose" (Reintech)
- "Docker Secrets vs Environment Variables" (Spacelift)

---

**End of Research Document**
