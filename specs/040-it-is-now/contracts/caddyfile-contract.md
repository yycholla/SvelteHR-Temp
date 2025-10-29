# Contract: Caddyfile Configuration

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This contract defines the Caddyfile configuration for the Caddy reverse proxy, enabling automatic HTTPS, request routing, WebSocket support, and security headers for the SvelteHR application.

## Caddyfile Structure

### Dual-Mode Configuration

The Caddyfile supports two operational modes via environment variable substitution:

1. **Localhost Mode** (`DOMAIN=localhost`)
   - Self-signed TLS certificates
   - Development/testing use
   - No Let's Encrypt interaction

2. **Production Mode** (`DOMAIN=hr.example.com`)
   - Automatic Let's Encrypt TLS certificates
   - Production deployment
   - Automatic HTTPS

---

## Complete Caddyfile Contract

```caddyfile
# =============================================================================
# SvelteHR Caddy Reverse Proxy Configuration
# =============================================================================
# Environment Variables Required:
#   - DOMAIN: 'localhost' or production domain (e.g., 'hr.example.com')
# =============================================================================

{
    # Global options
    admin 0.0.0.0:2019
    persist_config off

    # Email for Let's Encrypt (only used when DOMAIN != localhost)
    email {$TLS_EMAIL}

    # Use Let's Encrypt staging server for testing (optional)
    # acme_ca {$ACME_CA:https://acme-v02.api.letsencrypt.org/directory}
}

# =============================================================================
# Main Site Configuration
# =============================================================================

{$DOMAIN} {
    # Enable automatic HTTPS
    # - For localhost: auto-generates self-signed certificate
    # - For real domain: uses Let's Encrypt ACME

    # Logging
    log {
        output stdout
        format json
        level INFO
    }

    # Security headers
    header {
        # HSTS (only for production domains)
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" {
            defer  # Only add after successful HTTPS
        }

        # Security headers (all modes)
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"

        # Content Security Policy (adjust as needed)
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss://{$DOMAIN};"

        # Remove server identification
        -Server
    }

    # Rate limiting (optional, uncomment if needed)
    # rate_limit {
    #     zone dynamic {
    #         key {http.request.remote.ip}
    #         events 100
    #         window 1m
    #     }
    # }

    # =============================================================================
    # Route: GraphQL API
    # =============================================================================

    @graphql {
        path /graphql
        path /graphql/*
    }

    handle @graphql {
        # WebSocket upgrade for GraphQL subscriptions
        @websocket {
            header Connection *Upgrade*
            header Upgrade websocket
        }

        reverse_proxy @websocket hr-graphql-rust:4000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}

            # WebSocket specific timeouts
            transport http {
                read_timeout 0
                write_timeout 0
            }
        }

        # Regular GraphQL requests (POST)
        reverse_proxy hr-graphql-rust:4000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}

            # Health check (passive)
            health_uri /health
            health_interval 30s
            health_timeout 5s
        }
    }

    # =============================================================================
    # Route: API Endpoints
    # =============================================================================

    @api {
        path /api
        path /api/*
    }

    handle @api {
        reverse_proxy hr-graphql-rust:4000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}

            # Health check
            health_uri /health
            health_interval 30s
            health_timeout 5s
        }
    }

    # =============================================================================
    # Route: Frontend Application (catch-all)
    # =============================================================================

    handle {
        # SvelteKit handles routing, pass everything to frontend
        reverse_proxy frontend:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}

            # Health check
            health_uri /health
            health_interval 30s
            health_timeout 5s
        }
    }

    # =============================================================================
    # Error Handling
    # =============================================================================

    handle_errors {
        @502 {
            expression {http.error.status_code} == 502
        }

        @503 {
            expression {http.error.status_code} == 503
        }

        @504 {
            expression {http.error.status_code} == 504
        }

        # Custom error pages (optional)
        handle @502 {
            respond "Backend service unavailable" 502
        }

        handle @503 {
            respond "Service temporarily unavailable" 503
        }

        handle @504 {
            respond "Gateway timeout" 504
        }

        # Default error handling
        respond "{http.error.status_code} {http.error.status_text}"
    }
}

# =============================================================================
# HTTP to HTTPS Redirect
# =============================================================================
# Caddy automatically handles this, but explicit configuration:

http://{$DOMAIN} {
    redir https://{$DOMAIN}{uri} permanent
}
```

---

## Configuration Contracts

### Environment Variables

**Required**:
```bash
DOMAIN=localhost  # or 'hr.example.com'
```

**Optional**:
```bash
TLS_EMAIL=admin@example.com     # Required for Let's Encrypt (DOMAIN != localhost)
ACME_CA=https://...             # Override ACME server (for staging)
```

**Validation**:
```typescript
// DOMAIN validation
if (DOMAIN === 'localhost' || DOMAIN.endsWith('.localhost')) {
  mode = 'self-signed';
  requiresEmail = false;
} else if (/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(DOMAIN)) {
  mode = 'letsencrypt';
  requiresEmail = true;
} else {
  throw new Error('Invalid DOMAIN format');
}
```

---

### TLS/SSL Contract

**Localhost Mode** (`DOMAIN=localhost`):
```caddyfile
{$DOMAIN} {
    # Caddy automatically:
    # 1. Generates self-signed certificate
    # 2. Uses local certificate authority
    # 3. Certificate valid for 7 days, auto-renewed
}
```

**Production Mode** (`DOMAIN=hr.example.com`):
```caddyfile
{$DOMAIN} {
    # Caddy automatically:
    # 1. Requests certificate from Let's Encrypt
    # 2. Completes ACME challenge (HTTP-01)
    # 3. Stores certificate in /data/caddy
    # 4. Auto-renews before expiration

    # Requires:
    # - Domain DNS points to server
    # - Port 80 accessible (for HTTP-01 challenge)
    # - TLS_EMAIL set (for Let's Encrypt notifications)
}
```

**Certificate Storage**:
- Path: `/data/caddy/certificates/`
- Persistence: Via Docker volume `caddy_data:/data`
- Renewal: Automatic (30 days before expiration)

---

### Routing Contract

**Route Priority** (highest to lowest):
1. `/graphql` and `/graphql/*` → Backend GraphQL API
2. `/api` and `/api/*` → Backend REST API
3. Everything else (`/`) → Frontend SvelteKit app

**Path Matching Examples**:
| Request Path | Routed To | Service | Port |
|--------------|-----------|---------|------|
| `/` | Frontend | frontend | 3000 |
| `/login` | Frontend | frontend | 3000 |
| `/dashboard` | Frontend | frontend | 3000 |
| `/graphql` | Backend | hr-graphql-rust | 4000 |
| `/graphql?query=...` | Backend | hr-graphql-rust | 4000 |
| `/api/health` | Backend | hr-graphql-rust | 4000 |
| `/api/v2/employees` | Backend | hr-graphql-rust | 4000 |

---

### WebSocket Contract

**WebSocket Upgrade Detection**:
```caddyfile
@websocket {
    header Connection *Upgrade*
    header Upgrade websocket
}
```

**WebSocket Proxying**:
- Infinite read/write timeouts (no timeout for long-lived connections)
- Headers preserved (Host, X-Real-IP, X-Forwarded-For)
- Used for GraphQL subscriptions

**Client Connection Example**:
```typescript
// GraphQL subscription over WebSocket
const wsClient = createClient({
  url: 'wss://hr.example.com/graphql',  // Caddy handles upgrade
  // ...
});
```

---

### Security Headers Contract

**Strict-Transport-Security (HSTS)**:
- Only added after successful HTTPS (via `defer` directive)
- Max age: 1 year (31536000 seconds)
- Includes subdomains
- Preload eligible

**Content Security Policy**:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' wss://{$DOMAIN};
```

**Notes**:
- `'unsafe-inline'` and `'unsafe-eval'` required for Vite dev mode compatibility
- Adjust CSP for production hardening if needed
- `wss://` allows WebSocket connections

**Other Security Headers**:
| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | nosniff | Prevent MIME sniffing |
| `X-Frame-Options` | DENY | Prevent clickjacking |
| `X-XSS-Protection` | 1; mode=block | Enable XSS filtering |
| `Referrer-Policy` | strict-origin-when-cross-origin | Control referrer info |
| `-Server` | (removed) | Hide server version |

---

### Health Check Contract

**Backend Health Checks**:
```caddyfile
reverse_proxy hr-graphql-rust:4000 {
    health_uri /health
    health_interval 30s
    health_timeout 5s
}
```

**Health Check Behavior**:
- Passive health checking (doesn't affect user requests)
- Endpoint: `GET /health` (backend must implement)
- Interval: Every 30 seconds
- Timeout: 5 seconds
- Failure action: Mark backend as unhealthy, retry

**Expected Health Endpoint Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-28T12:00:00Z"
}
```

---

### Error Handling Contract

**Error Status Codes**:
- `502 Bad Gateway`: Backend service down or unreachable
- `503 Service Unavailable`: Backend temporarily unavailable
- `504 Gateway Timeout`: Backend took too long to respond

**Error Responses**:
```json
// Default error format (plain text)
502 Backend service unavailable

// Can be customized to JSON:
{
  "error": {
    "code": 502,
    "message": "Backend service unavailable"
  }
}
```

---

### Logging Contract

**Log Format**: JSON

**Log Fields**:
```json
{
  "level": "INFO",
  "ts": 1698504000.123,
  "logger": "http.log.access",
  "msg": "handled request",
  "request": {
    "remote_addr": "192.168.1.100",
    "proto": "HTTP/2.0",
    "method": "GET",
    "host": "hr.example.com",
    "uri": "/dashboard",
    "headers": {...}
  },
  "response": {
    "status": 200,
    "size": 4096,
    "headers": {...}
  },
  "duration": 0.045
}
```

**Log Output**: stdout (collected by Docker)

**Log Levels**:
- `DEBUG`: Verbose, all requests
- `INFO`: Standard, successful requests
- `WARN`: Warnings, retries
- `ERROR`: Errors, failed requests

---

### Admin API Contract

**Endpoint**: `http://0.0.0.0:2019`

**Available Endpoints**:
- `GET /config/`: View current configuration
- `POST /load`: Load new configuration
- `GET /metrics`: Prometheus metrics (if enabled)

**Security**:
- Bound to `0.0.0.0` (accessible within Docker network)
- NOT exposed to host (no port mapping)
- Use for health checks and debugging

**Example Usage**:
```bash
# Inside Caddy container
wget -qO- http://localhost:2019/config/ | jq

# From another container
curl http://caddy:2019/config/
```

---

### Rate Limiting Contract (Optional)

**Configuration** (commented out by default):
```caddyfile
rate_limit {
    zone dynamic {
        key {http.request.remote.ip}
        events 100
        window 1m
    }
}
```

**Behavior**:
- Limits: 100 requests per minute per IP
- Action: Returns HTTP 429 (Too Many Requests)
- Bypass: Not implemented (all IPs limited)

**Activation**:
Uncomment in Caddyfile and reload:
```bash
docker exec sveltehr-caddy-prod caddy reload --config /etc/caddy/Caddyfile
```

---

## Docker Integration Contract

### Volume Mounts

**Caddyfile**:
```yaml
volumes:
  - ./Caddyfile:/etc/caddy/Caddyfile:ro
```
- Read-only mount
- Changes require container restart or reload

**Certificate Storage**:
```yaml
volumes:
  - caddy_data:/data
```
- Persistent named volume
- Stores Let's Encrypt certificates
- MUST persist across container restarts

**Configuration Cache**:
```yaml
volumes:
  - caddy_config:/config
```
- Caddy runtime configuration
- SHOULD persist (not critical)

---

### Environment Variable Injection

**In docker-compose.prod.yml**:
```yaml
caddy:
  image: caddy:2-alpine
  environment:
    - DOMAIN=${DOMAIN}
    - TLS_EMAIL=${TLS_EMAIL:-}
```

**Caddyfile Usage**:
```caddyfile
{$DOMAIN} {
    # Uses value from environment
}
```

---

### Port Mapping

**Required Ports**:
```yaml
ports:
  - "80:80"    # HTTP (for ACME challenge and redirect)
  - "443:443"  # HTTPS (main application traffic)
  - "2019:2019"  # Admin API (optional, for debugging)
```

**Security Note**:
- Only Caddy exposes ports to host
- All backend services accessed via Docker network

---

## Hot Reload Contract

### Configuration Reload

**Without Downtime**:
```bash
# Edit Caddyfile
nano /opt/sveltehr/Caddyfile

# Reload Caddy (zero downtime)
docker exec sveltehr-caddy-prod caddy reload --config /etc/caddy/Caddyfile
```

**Supported Changes**:
- Route modifications
- Header changes
- Reverse proxy targets
- Security policies

**Unsupported Changes** (require restart):
- Global options changes
- Admin API port changes
- Volume mount changes

---

## Testing Contract

### Localhost Mode Testing

```bash
# 1. Set environment
export DOMAIN=localhost

# 2. Start stack
docker compose -f docker-compose.prod.yml up -d

# 3. Verify HTTPS with self-signed cert
curl -k https://localhost/

# 4. Check certificate
echo | openssl s_client -connect localhost:443 -servername localhost 2>/dev/null | openssl x509 -noout -text

# Expected: Self-signed certificate, issuer = Caddy Local Authority
```

### Production Mode Testing

```bash
# 1. Set environment
export DOMAIN=hr.example.com

# 2. Start stack
docker compose -f docker-compose.prod.yml up -d

# 3. Verify Let's Encrypt cert
curl https://hr.example.com/

# 4. Check certificate
echo | openssl s_client -connect hr.example.com:443 -servername hr.example.com 2>/dev/null | openssl x509 -noout -text

# Expected: Let's Encrypt certificate, issuer = Let's Encrypt Authority
```

---

## Troubleshooting Contract

### Common Issues

**Issue**: Certificate provisioning fails
```bash
# Check logs
docker logs sveltehr-caddy-prod

# Look for ACME challenge errors
# Common causes:
# - Port 80 not accessible from internet
# - DNS not pointing to server
# - Let's Encrypt rate limit hit
```

**Issue**: WebSocket connections fail
```bash
# Check WebSocket upgrade headers
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
  https://hr.example.com/graphql

# Expected: HTTP 101 Switching Protocols
```

**Issue**: Backend health checks failing
```bash
# Test backend health endpoint directly
curl http://localhost:4000/health

# Check Caddy admin API
curl http://localhost:2019/config/ | jq '.apps.http.servers'
```

---

## Contract Version

**Version**: 1.0.0
**Caddy Version**: 2.x
**Last Updated**: 2025-10-28

**Breaking Changes**:
- None (initial version)

**Deprecations**:
- None

**Future Changes**:
- v1.1.0: May add rate limiting by default
- v1.2.0: May add GeoIP-based access control
- v1.3.0: May add WAF integration
