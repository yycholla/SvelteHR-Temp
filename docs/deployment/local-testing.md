# Local Production Testing Guide

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This guide explains how to run the production Docker Compose stack locally for pre-deployment validation. This allows developers to test production builds, configurations, and deployment scenarios before pushing to production servers.

## Why Test Production Builds Locally?

**Benefits**:
- ✅ Validate production Docker builds work correctly
- ✅ Test production environment variables and configuration
- ✅ Verify health checks and service dependencies
- ✅ Debug production-specific issues before deployment
- ✅ Test automatic HTTPS with self-signed certificates
- ✅ Validate database migrations in production mode
- ✅ Ensure multi-stage Docker builds are optimized

## Prerequisites

Before testing production builds locally, ensure you have:

- Docker Engine 20.10+ installed
- Docker Compose v2.20+ installed
- Minimum 4GB RAM available for Docker
- 10GB free disk space for images and volumes
- All source code up to date (`git pull`)

**Verify installations**:

```bash
# Check Docker version
docker --version
# Docker version 24.0.0 or higher

# Check Docker Compose version
docker compose version
# Docker Compose version v2.20.0 or higher

# Check available resources
docker system df
docker system info | grep -E "Total Memory|CPUs"
```

## Quick Start

**1. Create local production environment file**:

```bash
# Copy example to local production config
cp .env.example .env.local

# Edit with local production values
nano .env.local
```

**2. Set local production environment variables**:

```bash
# Source the local environment file
export $(cat .env.local | grep -v '^#' | xargs)

# Or use docker compose --env-file flag (recommended)
```

**3. Build and start production stack locally**:

```bash
# Build fresh images (first time or after code changes)
docker compose -f docker-compose.prod.yml --env-file .env.local build

# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.local up -d

# Watch logs
docker compose -f docker-compose.prod.yml logs -f
```

**4. Access the application**:

- Application: https://localhost (self-signed certificate)
- GraphQL Playground: https://localhost/graphql
- Caddy Admin API: http://localhost:2019

**5. Stop and cleanup**:

```bash
# Stop services (preserves volumes)
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (fresh start)
docker compose -f docker-compose.prod.yml down -v
```

## Local Production Environment Configuration

### `.env.local` Example

Create `.env.local` file with these values for local production testing:

```bash
# =============================================================================
# Local Production Testing Configuration (.env.local)
# =============================================================================
# Use this file for testing production builds locally with self-signed HTTPS
# DO NOT commit this file to version control
# =============================================================================

# -----------------------------------------------------------------------------
# Domain Configuration (CRITICAL for Caddy SSL)
# -----------------------------------------------------------------------------
# For local testing, use 'localhost' to enable self-signed certificates
DOMAIN=localhost
TLS_EMAIL=dev@localhost

# -----------------------------------------------------------------------------
# Database Configuration
# -----------------------------------------------------------------------------
POSTGRES_DB=hr_system_local_prod
POSTGRES_USER=postgres
POSTGRES_PASSWORD=local_dev_password_123  # Change for real production!

# PostgreSQL initialization arguments (optional)
POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=en_US.UTF-8 --lc-ctype=en_US.UTF-8

# -----------------------------------------------------------------------------
# Redis Configuration
# -----------------------------------------------------------------------------
REDIS_URL=redis://redis:6379

# -----------------------------------------------------------------------------
# Authentication Secrets
# -----------------------------------------------------------------------------
# Use different secrets than development mode
JWT_SECRET=local_prod_jwt_secret_min_32_chars_required_here_change_me
JWT_REFRESH_SECRET=local_prod_jwt_refresh_secret_change_me_too
SERVICE_AUTH_KEY=local_prod_service_auth_key_change_me_also

# JWT token expiration (production values)
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
# For local testing, allow localhost with HTTPS
CORS_ALLOWED_ORIGINS=https://localhost,http://localhost:3000

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
# Use debug level for local testing
RUST_LOG=info,hr_graphql_server=debug,sea_orm=debug
RUST_BACKTRACE=1

# -----------------------------------------------------------------------------
# Node.js Configuration
# -----------------------------------------------------------------------------
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Frontend API URL (internal Docker network)
PUBLIC_API_URL=http://hr-graphql-rust:4000

# -----------------------------------------------------------------------------
# GitLab Container Registry (Optional for Local Testing)
# -----------------------------------------------------------------------------
# Leave empty to build images locally instead of pulling from registry
GITLAB_REGISTRY=
GITLAB_PROJECT=
IMAGE_TAG=latest

# -----------------------------------------------------------------------------
# Optional Features
# -----------------------------------------------------------------------------
# Enable metrics (optional)
ENABLE_METRICS=false

# ACME CA (use Let's Encrypt staging for testing, optional)
# ACME_CA=https://acme-staging-v02.api.letsencrypt.org/directory

# =============================================================================
# Security Notes for Local Production Testing
# =============================================================================
# ⚠️ These are LOCAL TESTING values - DO NOT use in real production!
# ✅ Always use strong, randomly-generated secrets in production
# ✅ Never commit .env.local to version control
# ✅ Use different secrets for local testing vs production
# =============================================================================
```

### Environment Variable Validation

Before starting, validate your `.env.local` file:

```bash
# Run validation script
./scripts/validate-env.sh .env.local

# Expected output:
# ✅ All required variables are set
# ✅ Passwords meet minimum length requirements
# ✅ Configuration is valid for production
```

## Development vs Production Differences

### Environment Variables

| Variable | Development | Production (Local) | Production (Server) |
|----------|-------------|-------------------|---------------------|
| `DOMAIN` | localhost (dev server) | localhost (self-signed) | hr.example.com (Let's Encrypt) |
| `NODE_ENV` | development | production | production |
| `RUST_LOG` | debug | info,debug | info,warn |
| `RUST_BACKTRACE` | 1 | 1 (local), 0 (server) | 0 |
| `PUBLIC_API_URL` | http://localhost:8080 | http://hr-graphql-rust:4000 | http://hr-graphql-rust:4000 |
| `DATABASE_URL` | External host | Docker network | Docker network |
| Secrets | Development values | Test values | Strong random values |

### Docker Build Targets

**Development** (`docker-compose.dev.yml`):
- Uses `doppler` stage with hot-reloading
- Mounts source code as volumes
- Instant code changes without rebuild
- Doppler secrets integration
- Development dependencies included

**Production** (`docker-compose.prod.yml`):
- Uses `production` stage (optimized builds)
- No source code volumes (baked into image)
- Requires rebuild for code changes
- Environment variables from `.env` file
- Production dependencies only (no dev deps)

### Build Process

**Development**:
```bash
# No build needed - uses volumes
docker compose up -d
# Code changes reflect immediately
```

**Production (Local)**:
```bash
# Must rebuild after code changes
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
# Code changes require rebuild
```

### Service Startup

**Development**:
- Services start with hot-reload enabled
- Frontend: Vite dev server on port 5173
- Backend: Cargo watch with auto-restart
- Doppler secrets fetched on startup

**Production**:
- Services start from compiled/built artifacts
- Frontend: Node.js serving built output on port 3000
- Backend: Rust release binary
- Environment variables from `.env` file

### HTTPS and TLS

**Development**:
- HTTP only (no TLS)
- Accessed via `http://localhost:5173`
- No certificate required

**Production (Local)**:
- HTTPS with self-signed certificate
- Accessed via `https://localhost`
- Browser warning (expected for self-signed)
- Caddy automatically generates certificate

**Production (Server)**:
- HTTPS with Let's Encrypt certificate
- Accessed via `https://hr.example.com`
- Valid, trusted certificate
- Automatic renewal every 90 days

### Port Exposure

**Development**:
- Frontend: 5173 (Vite)
- Backend: 8080 (direct access)
- PostgreSQL: 5432 (exposed for local tools)
- Redis: 6379 (exposed for redis-cli)

**Production**:
- Caddy: 80, 443 (HTTP/HTTPS)
- Admin API: 2019 (Caddy admin)
- All other services internal (no port exposure)

## Common Testing Workflows

### 1. Test Production Build After Code Changes

```bash
# 1. Make code changes
git pull  # or edit files

# 2. Rebuild production images
docker compose -f docker-compose.prod.yml --env-file .env.local build

# 3. Restart stack with new images
docker compose -f docker-compose.prod.yml --env-file .env.local up -d

# 4. Check logs for errors
docker compose -f docker-compose.prod.yml logs -f

# 5. Test application
curl -k https://localhost/health
```

### 2. Test Database Migrations

```bash
# 1. Stop stack (keep volumes)
docker compose -f docker-compose.prod.yml down

# 2. Update migration files in graphql-rust-server/migration/

# 3. Start stack (migrations run automatically)
docker compose -f docker-compose.prod.yml --env-file .env.local up -d

# 4. Check migration logs
docker compose -f docker-compose.prod.yml logs hr-graphql-rust | grep migration

# Expected output:
# "Applying migration: m20231201_000001_create_users"
# "Migration successful"
```

### 3. Test Health Checks

```bash
# Check all services are healthy
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                         STATUS
# sveltehr-postgres-prod       Up (healthy)
# sveltehr-redis-prod          Up (healthy)
# sveltehr-graphql-rust-prod   Up (healthy)
# sveltehr-frontend-prod       Up (healthy)
# sveltehr-caddy-prod          Up (healthy)

# Manually test health endpoints
curl -k https://localhost/health  # Frontend
curl http://localhost:4000/health  # Backend (internal)
```

### 4. Test Caddy HTTPS Configuration

```bash
# 1. Start stack
docker compose -f docker-compose.prod.yml --env-file .env.local up -d

# 2. Verify self-signed certificate
openssl s_client -connect localhost:443 -servername localhost < /dev/null

# Expected output should include:
# "subject=CN = localhost"
# "issuer=CN = Caddy Local Authority"

# 3. Test HTTP to HTTPS redirect
curl -I http://localhost
# Should return 301 or 308 redirect to https://localhost

# 4. Check Caddy admin API
curl http://localhost:2019/config/ | jq
```

### 5. Test Environment Variable Substitution

```bash
# 1. Edit .env.local to change DOMAIN
echo "DOMAIN=test.localhost" >> .env.local

# 2. Restart Caddy only
docker compose -f docker-compose.prod.yml --env-file .env.local restart caddy

# 3. Verify new domain
curl -k https://test.localhost
```

### 6. Test Volume Persistence

```bash
# 1. Start stack and create test data
docker compose -f docker-compose.prod.yml --env-file .env.local up -d
# (create user, add data via application)

# 2. Stop stack (preserves volumes)
docker compose -f docker-compose.prod.yml down

# 3. Start stack again
docker compose -f docker-compose.prod.yml --env-file .env.local up -d

# 4. Verify data persisted
# (login, check data still exists)

# 5. List volumes
docker volume ls | grep sveltehr
```

## Troubleshooting Local Production Testing

### Issue: Services Fail to Start

**Symptoms**:
```
Error: failed to start container
```

**Solutions**:

1. **Check Docker resources**:
   ```bash
   docker system df
   docker system prune  # Cleanup if needed
   ```

2. **Check logs for specific service**:
   ```bash
   docker compose -f docker-compose.prod.yml logs <service_name>
   ```

3. **Verify environment variables**:
   ```bash
   ./scripts/validate-env.sh .env.local
   ```

### Issue: Health Checks Fail

**Symptoms**:
```
sveltehr-frontend-prod   Up (health: starting)
```

**Solutions**:

1. **Check service logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs frontend
   ```

2. **Inspect health check command**:
   ```bash
   docker inspect sveltehr-frontend-prod | jq '.[0].State.Health'
   ```

3. **Manually test health endpoint**:
   ```bash
   docker exec sveltehr-frontend-prod curl http://localhost:3000/health
   ```

### Issue: Browser Certificate Warning

**Symptoms**:
Browser shows "Your connection is not private" for https://localhost

**Solution**:

This is **expected behavior** for self-signed certificates in local testing.

**Accept the warning**:
- Chrome/Edge: Click "Advanced" → "Proceed to localhost (unsafe)"
- Firefox: Click "Advanced" → "Accept the Risk and Continue"

**Or trust the certificate** (optional):
```bash
# Export Caddy's self-signed certificate
docker exec sveltehr-caddy-prod cat /data/caddy/certificates/local/localhost/localhost.crt > caddy-local.crt

# Trust certificate (varies by OS)
# macOS:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain caddy-local.crt

# Linux:
sudo cp caddy-local.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

### Issue: Port Already in Use

**Symptoms**:
```
Error: bind: address already in use
```

**Solutions**:

1. **Check what's using ports 80/443**:
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. **Stop conflicting services**:
   ```bash
   # Stop development docker-compose if running
   docker compose down

   # Stop system web servers
   sudo systemctl stop nginx
   sudo systemctl stop apache2
   ```

3. **Change Caddy ports** (temporary workaround):
   Edit `docker-compose.prod.yml`:
   ```yaml
   ports:
     - "8080:80"   # Use 8080 instead
     - "8443:443"  # Use 8443 instead
   ```

### Issue: Database Connection Fails

**Symptoms**:
```
Error: could not connect to database
```

**Solutions**:

1. **Verify PostgreSQL is healthy**:
   ```bash
   docker compose -f docker-compose.prod.yml ps postgres
   # Should show "Up (healthy)"
   ```

2. **Check DATABASE_URL format**:
   ```bash
   # Should be: postgresql://user:password@postgres:5432/dbname
   echo $DATABASE_URL
   ```

3. **Test database connection manually**:
   ```bash
   docker exec -it sveltehr-postgres-prod psql -U postgres -d hr_system_local_prod
   ```

### Issue: Frontend Can't Reach Backend

**Symptoms**:
Frontend shows "API connection failed"

**Solutions**:

1. **Verify backend is healthy**:
   ```bash
   docker compose -f docker-compose.prod.yml ps hr-graphql-rust
   ```

2. **Check PUBLIC_API_URL is correct**:
   ```bash
   # For production, should use internal Docker network
   # .env.local should have:
   PUBLIC_API_URL=http://hr-graphql-rust:4000
   ```

3. **Test backend from frontend container**:
   ```bash
   docker exec sveltehr-frontend-prod curl http://hr-graphql-rust:4000/health
   ```

### Issue: Code Changes Not Reflected

**Symptom**: Made code changes but application behavior unchanged

**Cause**: Production builds bake code into images (no hot-reload)

**Solution**: Rebuild images after code changes
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Performance Testing

### Measure Production Build Performance

**Build time measurement**:
```bash
time docker compose -f docker-compose.prod.yml build --no-cache

# Expected times:
# Frontend: 3-5 minutes
# Backend: 5-10 minutes (with cargo-chef caching)
```

**Image size analysis**:
```bash
docker images | grep sveltehr

# Expected sizes (approximate):
# Frontend: 150-200 MB
# Backend: 80-120 MB
```

**Startup time measurement**:
```bash
# Clean start
docker compose -f docker-compose.prod.yml down -v

# Measure startup
time docker compose -f docker-compose.prod.yml --env-file .env.local up -d

# Expected: 60-90 seconds until all services healthy
```

### Load Testing

**Simple load test** with `hey`:
```bash
# Install hey (if not installed)
go install github.com/rakyll/hey@latest

# Test frontend
hey -n 1000 -c 10 https://localhost/

# Test GraphQL endpoint
hey -n 1000 -c 10 -m POST https://localhost/graphql
```

## Cleanup and Reset

### Remove All Local Production Data

**Complete cleanup** (removes volumes, networks, images):

```bash
# 1. Stop and remove containers + volumes
docker compose -f docker-compose.prod.yml down -v

# 2. Remove local production images
docker rmi $(docker images | grep sveltehr | awk '{print $3}')

# 3. Remove dangling images
docker image prune -af

# 4. Verify cleanup
docker ps -a | grep sveltehr
docker volume ls | grep sveltehr

# 5. Remove .env.local
rm .env.local
```

### Reset to Fresh State

```bash
# Remove everything
docker compose -f docker-compose.prod.yml down -v
docker image prune -af

# Fresh start
cp .env.example .env.local
# Edit .env.local with local values
docker compose -f docker-compose.prod.yml --env-file .env.local build
docker compose -f docker-compose.prod.yml --env-file .env.local up -d
```

## Best Practices for Local Production Testing

### Before Every Production Deployment

1. ✅ **Test production builds locally first**
   ```bash
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   ```

2. ✅ **Run all tests in production mode**
   ```bash
   npm run test:unit -- --run
   npm run test:e2e
   ```

3. ✅ **Validate environment configuration**
   ```bash
   ./scripts/validate-env.sh .env.local
   ```

4. ✅ **Check health of all services**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   # All should show "Up (healthy)"
   ```

5. ✅ **Test database migrations**
   - Ensure migrations run successfully
   - Check no data loss on upgrade

6. ✅ **Verify HTTPS configuration**
   - Test certificate generation
   - Verify HTTP→HTTPS redirect

### Security Considerations

- ⚠️ **Never use local testing secrets in production**
- ⚠️ **Never commit `.env.local` to version control**
- ⚠️ **Use different secrets for local vs production**
- ⚠️ **Don't expose admin ports (2019) in production**

### Development Workflow Integration

**Recommended workflow**:

1. Develop in development mode (`docker compose up`)
2. Before PR: Test in local production mode
3. After PR merge: CI/CD deploys to production
4. If issues found: Debug in local production mode first

## Additional Resources

- **Production Deployment Guide**: `docs/deployment/quickstart.md`
- **Environment Variables**: `.env.example`
- **GitHub Actions CI/CD**: `.github/workflows/deploy-production.yml`
- **Docker Networking**: `docs/deployment/docker-networking.md`
- **Health Checks**: `docs/deployment/health-checks.md`
- **Security**: `docs/deployment/production-security.md`

## Summary

Local production testing allows you to validate:
- ✅ Production Docker builds work correctly
- ✅ Environment variables are configured properly
- ✅ Health checks pass for all services
- ✅ Database migrations execute successfully
- ✅ HTTPS works with self-signed certificates
- ✅ Service dependencies are correct
- ✅ Resource usage is acceptable

**Always test production builds locally before deploying to production servers.**
