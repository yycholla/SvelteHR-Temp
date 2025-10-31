# Docker Networking for Production Deployment

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This document describes the Docker networking architecture for the SvelteHR production deployment, including service discovery, inter-service communication, and security considerations.

## Network Configuration

### Bridge Network

The production stack uses a single bridge network for all services:

```yaml
networks:
  sveltehr-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Key Characteristics**:
- **Driver**: `bridge` (default Docker bridge network)
- **Subnet**: `172.20.0.0/16` (provides ~65,534 IP addresses)
- **Isolation**: Services on this network cannot be accessed from the host network except through exposed ports
- **Service Discovery**: Built-in DNS resolution via Docker

## Service Discovery

### DNS-Based Service Names

All services communicate using Docker's built-in DNS service discovery:

| Service Name | Internal Address | Internal Port | Purpose |
|--------------|------------------|---------------|---------|
| `postgres` | Dynamic (DNS) | 5432 | PostgreSQL database |
| `redis` | Dynamic (DNS) | 6379 | Redis cache |
| `hr-graphql-rust` | Dynamic (DNS) | 4000 | Rust GraphQL backend |
| `frontend` | Dynamic (DNS) | 3000 | SvelteKit frontend |
| `caddy` | Dynamic (DNS) | 80, 443, 2019 | Reverse proxy |

### Connection Examples

**Backend connecting to PostgreSQL**:
```bash
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

**Backend connecting to Redis**:
```bash
REDIS_URL=redis://redis:6379
```

**Frontend connecting to Backend**:
```bash
PUBLIC_API_URL=http://hr-graphql-rust:4000
```

**Caddy proxying to services**:
```caddyfile
reverse_proxy frontend:3000       # Frontend service
reverse_proxy hr-graphql-rust:4000  # Backend service
```

## Port Exposure

### External Port Mapping

Only Caddy exposes ports to the host network:

```yaml
caddy:
  ports:
    - "80:80"      # HTTP (redirects to HTTPS)
    - "443:443"    # HTTPS (main application traffic)
    - "2019:2019"  # Admin API (optional, for debugging)
```

### Internal Ports (No Host Exposure)

All other services are accessible only within the Docker network:

- **PostgreSQL**: Port 5432 (internal only)
- **Redis**: Port 6379 (internal only)
- **Backend**: Port 4000 (internal only)
- **Frontend**: Port 3000 (internal only)

This configuration provides security by default - no direct access to backend services from outside the container network.

## Inter-Service Communication

### Service-to-Service Flow

```
Internet → Caddy (80/443) → Frontend (3000) → Backend (4000) → PostgreSQL (5432)
                                                              ↘ Redis (6379)
```

**Request Flow**:
1. **External HTTP/HTTPS** → Caddy (ports 80, 443)
2. **Caddy** routes based on path:
   - `/` → Frontend service (port 3000)
   - `/graphql`, `/api` → Backend service (port 4000)
3. **Backend** communicates with:
   - PostgreSQL (port 5432) for data persistence
   - Redis (port 6379) for caching
4. **Frontend** communicates with:
   - Backend (port 4000) for GraphQL API calls

### WebSocket Support

Caddy automatically handles WebSocket upgrade requests for GraphQL subscriptions:

```caddyfile
@websocket {
    header Connection *Upgrade*
    header Upgrade websocket
}

reverse_proxy @websocket hr-graphql-rust:4000 {
    transport http {
        read_timeout 0
        write_timeout 0
    }
}
```

## Network Security

### Isolation Principles

1. **No Direct External Access**: Backend services are NOT exposed to the host network
2. **Single Entry Point**: All external traffic goes through Caddy
3. **Internal Communication Only**: Services communicate only within Docker network
4. **Caddy as Security Gateway**: Caddy enforces HTTPS, security headers, rate limiting

### Security Headers (Applied by Caddy)

```caddyfile
header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    X-XSS-Protection "1; mode=block"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server  # Remove server identification
}
```

### CORS Configuration

CORS is enforced at the backend level:

```bash
CORS_ALLOWED_ORIGINS=https://hr.example.com
```

For localhost testing:
```bash
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://localhost
```

## Network Performance

### DNS Caching

Docker's embedded DNS server caches service name resolutions for 10 seconds by default. This is sufficient for production use.

### Connection Pooling

Services use connection pooling to minimize overhead:

**Backend (SeaORM)**:
```bash
MAX_CONNECTIONS=100
MIN_CONNECTIONS=5
CONNECTION_TIMEOUT=30
IDLE_TIMEOUT=600
```

**Redis**:
```bash
REDIS_MAX_CONNECTIONS=50
```

## Troubleshooting

### Verify Network Connectivity

**Check if service is reachable from another container**:
```bash
docker exec sveltehr-frontend-prod ping postgres
docker exec sveltehr-frontend-prod curl http://hr-graphql-rust:4000/health
```

**Check DNS resolution**:
```bash
docker exec sveltehr-frontend-prod nslookup postgres
docker exec sveltehr-frontend-prod nslookup hr-graphql-rust
```

### Inspect Network

**List all networks**:
```bash
docker network ls
```

**Inspect the sveltehr-network**:
```bash
docker network inspect sveltehr-network
```

**See which containers are connected**:
```bash
docker network inspect sveltehr-network --format='{{range .Containers}}{{.Name}} - {{.IPv4Address}}{{println}}{{end}}'
```

### Common Issues

**Issue**: Service cannot connect to PostgreSQL
```
Error: connection refused to postgres:5432
```

**Solution**:
1. Verify PostgreSQL is healthy: `docker ps --filter name=postgres`
2. Check depends_on is configured in docker-compose.prod.yml
3. Verify DATABASE_URL uses service name `postgres`, not `localhost`

**Issue**: Frontend cannot reach backend
```
Error: ECONNREFUSED to hr-graphql-rust:4000
```

**Solution**:
1. Verify backend is healthy: `docker exec sveltehr-graphql-rust-prod curl http://localhost:4000/health`
2. Check CORS_ALLOWED_ORIGINS includes frontend origin
3. Verify both services are on the same network

**Issue**: WebSocket connections fail through Caddy
```
Error: WebSocket connection failed
```

**Solution**:
1. Verify Caddyfile includes WebSocket upgrade headers
2. Check backend health endpoint
3. Test WebSocket directly: `wscat -c wss://hr.example.com/graphql`

## Network Best Practices

1. **Always use service names** for inter-service communication, never IP addresses
2. **Never expose database ports** to the host network in production
3. **Use Caddy as the only entry point** for external traffic
4. **Configure health checks** to ensure services are ready before accepting connections
5. **Use depends_on with service_healthy** to ensure startup order
6. **Monitor network traffic** with `docker stats` to identify bottlenecks

## References

- Docker Compose Networking: https://docs.docker.com/compose/networking/
- Caddy Reverse Proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Service Discovery: https://docs.docker.com/config/containers/container-networking/#dns-services
