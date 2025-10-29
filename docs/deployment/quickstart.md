# Production Deployment Quickstart Guide

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Target Audience**: DevOps Engineers, System Administrators
**Estimated Time**: 10-15 minutes (manual) | 5 minutes (CI/CD)
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This guide provides step-by-step instructions to deploy the SvelteHR application to production with:
- ✅ **Automatic HTTPS** via Caddy (localhost self-signed OR production Let's Encrypt)
- ✅ **5 production services**: PostgreSQL, Redis, Rust GraphQL, SvelteKit, Caddy
- ✅ **Health monitoring** for all services
- ✅ **Automated database migrations** on startup
- ✅ **Zero-downtime deployments** via Docker Compose
- ✅ **CI/CD automation** via GitHub Actions + GitLab Container Registry

## Prerequisites

Before starting, ensure you have:

### Server Requirements

- [x] **Ubuntu 22.04 LTS** or **Debian 11+** server
- [x] **2+ CPU cores**, **4GB+ RAM**, **20GB+ storage**
- [x] **Root or sudo access** to the server
- [x] **SSH access** enabled
- [x] **Firewall configured** (allow ports 22, 80, 443)

### Software Requirements

- [x] **Docker Engine 24.0+**
- [x] **Docker Compose v2.20+**
- [x] **Git**

### Optional Requirements

- [x] **Domain name** pointed to server IP (for production Let's Encrypt)
- [x] **GitLab account** (for container registry and CI/CD)
- [x] **GitHub account** (for CI/CD with GitHub Actions)

### Quick Docker Installation

If Docker is not installed:

```bash
# Install Docker and Docker Compose v2
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
# Expected: Docker version 24.0.0+

docker compose version
# Expected: Docker Compose version v2.20.0+
```

### System Preparation

```bash
# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Configure firewall (if using ufw)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Create deployment directory
sudo mkdir -p /opt/sveltehr
sudo mkdir -p /var/backups/postgresql
sudo chown -R $USER:$USER /opt/sveltehr /var/backups/postgresql

# Verify system resources
free -h  # Check RAM
df -h    # Check disk space
```

---

## Deployment Path Selection

Choose your deployment path:

### Path A: Manual Local Deployment (Localhost Mode)

**Use for**:
- Local development testing of production builds
- Internal testing before production
- Learning the deployment system

**Time**: 10 minutes
**Domain**: localhost (self-signed HTTPS)
**Go to**: [Step 1 - Manual Deployment](#step-1-clone-repository)

### Path B: CI/CD Automated Deployment (Production Mode)

**Use for**:
- Production deployments to real domain
- Automated deployments on git push
- Team workflows with continuous delivery

**Time**: 15 minutes setup + 15 minutes CI/CD run
**Domain**: Your production domain (Let's Encrypt HTTPS)
**Go to**: [CI/CD Setup](#cicd-setup-automated-deployments)

---

## Path A: Manual Deployment

### Step 1: Clone Repository

```bash
# Clone repository
git clone https://github.com/Mountain-Care-Rx/SvelteHR.git
cd SvelteHR

# Optional: Checkout production deployment branch (if not merged to main)
# git checkout 040-it-is-now

# Verify required files exist
ls -la docker-compose.prod.yml Caddyfile .env.example
```

**Expected output**:
```
-rw-r--r-- 1 user user  9234 Oct 28 12:00 docker-compose.prod.yml
-rw-r--r-- 1 user user  5432 Oct 28 12:00 Caddyfile
-rw-r--r-- 1 user user  4567 Oct 28 12:00 .env.example
```

### Step 2: Configure Environment Variables

#### Option 1: Localhost Mode (Self-Signed HTTPS)

```bash
# Copy example environment file
cp .env.example .env

# Generate secure random secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
SERVICE_AUTH_KEY=$(openssl rand -base64 32)

# Create .env file with localhost configuration
cat > .env << EOF
# =============================================================================
# Localhost Production Testing Configuration
# =============================================================================

# Domain Configuration (localhost = self-signed HTTPS)
DOMAIN=localhost
TLS_EMAIL=  # Not required for localhost

# Database Configuration
POSTGRES_DB=hr_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Redis Configuration
REDIS_URL=redis://redis:6379

# Authentication Secrets
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SERVICE_AUTH_KEY=$SERVICE_AUTH_KEY

# JWT Expiration
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://localhost

# Logging Configuration
RUST_LOG=info,hr_graphql_server=debug
RUST_BACKTRACE=0

# Node.js Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
PUBLIC_API_URL=http://hr-graphql-rust:4000

# GitLab Container Registry (empty = build locally)
GITLAB_REGISTRY=
GITLAB_PROJECT=
IMAGE_TAG=latest
EOF

echo "✅ Environment file created for localhost mode"
echo "🔐 Secrets generated and saved to .env"
```

#### Option 2: Production Mode (Let's Encrypt HTTPS)

```bash
# Copy example environment file
cp .env.example .env

# Generate secure random secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
SERVICE_AUTH_KEY=$(openssl rand -base64 32)

# Edit .env file
nano .env
```

**Required changes**:
```bash
# Change DOMAIN to your actual domain
DOMAIN=hr.example.com  # Replace with YOUR domain

# Add TLS email for Let's Encrypt notifications
TLS_EMAIL=admin@example.com  # Replace with YOUR email

# Use the generated secrets (already in .env if using script above)
POSTGRES_PASSWORD=<generated value>
JWT_SECRET=<generated value>
JWT_REFRESH_SECRET=<generated value>
SERVICE_AUTH_KEY=<generated value>

# Update CORS for your domain
CORS_ALLOWED_ORIGINS=https://hr.example.com

# Optional: For GitLab registry (see CI/CD section)
# GITLAB_PROJECT=your_username/sveltehr
# IMAGE_TAG=sha-abc1234567
```

**Verify DNS** (production mode only):
```bash
# Check domain points to server
dig +short hr.example.com
# Should return your server IP address

# Or use nslookup
nslookup hr.example.com
```

### Step 3: Validate Environment Configuration

```bash
# Run validation script
./scripts/validate-env.sh .env

# Expected output:
# ✅ All required variables are set
# ✅ POSTGRES_PASSWORD meets minimum length requirement (≥16)
# ✅ JWT_SECRET meets minimum length requirement (≥32)
# ✅ DOMAIN is set to 'localhost' or valid domain
# ✅ Configuration is valid for production
```

If validation fails, review error messages and fix `.env` file.

### Step 4: Deploy the Stack

```bash
# Build and start all services in background
docker compose -f docker-compose.prod.yml up -d

# Monitor startup logs (Ctrl+C to exit, services continue running)
docker compose -f docker-compose.prod.yml logs -f
```

**Expected output**:
```
[+] Running 10/10
 ✔ Network sveltehr-network               Created     0.1s
 ✔ Volume "sveltehr_postgres_prod_data"   Created     0.0s
 ✔ Volume "sveltehr_redis_prod_data"      Created     0.0s
 ✔ Volume "sveltehr_caddy_prod_data"      Created     0.0s
 ✔ Volume "sveltehr_caddy_prod_config"    Created     0.0s
 ✔ Container sveltehr-postgres-prod       Started     0.5s
 ✔ Container sveltehr-redis-prod          Started     0.5s
 ✔ Container sveltehr-graphql-rust-prod   Started     1.2s
 ✔ Container sveltehr-frontend-prod       Started     1.5s
 ✔ Container sveltehr-caddy-prod          Started     1.8s
```

**Startup timeline**:
- **PostgreSQL**: ~10-15 seconds (database initialization)
- **Redis**: ~5 seconds (cache ready)
- **Backend (Rust GraphQL)**: ~30-60 seconds (includes database migrations)
- **Frontend (SvelteKit)**: ~15-20 seconds (app server startup)
- **Caddy**: ~5-10 seconds (localhost) OR ~30-60 seconds (Let's Encrypt)

**Watch for migration messages**:
```
hr-graphql-rust  | Running database migrations...
hr-graphql-rust  | Applying migration: m20231201_000001_create_users
hr-graphql-rust  | Applying migration: m20231201_000002_create_departments
hr-graphql-rust  | ✅ All migrations completed successfully
```

### Step 5: Verify Deployment

#### Check Service Health

```bash
# Check all services are running and healthy
docker compose -f docker-compose.prod.yml ps
```

**Expected output** (all services should show "Up (healthy)"):
```
NAME                           STATUS              PORTS
sveltehr-caddy-prod            Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp, 0.0.0.0:2019->2019/tcp
sveltehr-frontend-prod         Up (healthy)        3000/tcp
sveltehr-graphql-rust-prod     Up (healthy)        4000/tcp
sveltehr-postgres-prod         Up (healthy)        5432/tcp
sveltehr-redis-prod            Up (healthy)        6379/tcp
```

**If any service shows "starting" or "unhealthy"**:
```bash
# Wait 30 seconds and check again
sleep 30
docker compose -f docker-compose.prod.yml ps

# If still unhealthy, check logs
docker compose -f docker-compose.prod.yml logs <service-name>
```

#### Test Application Access

**Localhost mode**:
```bash
# Test HTTPS (self-signed certificate, -k flag ignores cert warning)
curl -k https://localhost/health

# Expected output:
# {"status":"healthy","timestamp":"2025-10-28T12:00:00Z","service":"sveltehr-frontend"}

# Test GraphQL API
curl -k https://localhost/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Expected output:
# {"data":{"__typename":"Query"}}
```

**Production mode**:
```bash
# Test HTTPS (Let's Encrypt certificate, no -k flag needed)
curl https://hr.example.com/health

# Expected output:
# {"status":"healthy","timestamp":"2025-10-28T12:00:00Z","service":"sveltehr-frontend"}

# Verify Let's Encrypt certificate
echo | openssl s_client -connect hr.example.com:443 -servername hr.example.com 2>/dev/null | \
  openssl x509 -noout -issuer -dates

# Expected issuer: C=US, O=Let's Encrypt, CN=R3
# Expected dates: Valid for 90 days
```

#### Check Logs for Errors

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# View specific service logs
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml logs hr-graphql-rust
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs caddy

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

### Step 6: Access the Application

#### Localhost Mode

Open browser and navigate to:
- **Application**: https://localhost
- **GraphQL Playground** (if enabled): https://localhost/graphql

**Browser warning**: You'll see "Your connection is not private" - this is **expected** for self-signed certificates.

**To proceed**:
- **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"

#### Production Mode

Open browser and navigate to:
- **Application**: https://hr.example.com
- **GraphQL API**: https://hr.example.com/graphql

**No browser warning** - Let's Encrypt certificates are automatically trusted by all browsers.

### Step 7: Post-Deployment Verification

```bash
# Verify all health checks pass
for service in postgres redis hr-graphql-rust frontend caddy; do
  health=$(docker inspect sveltehr-${service}-prod --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-health-check")
  echo "Service: $service - Health: $health"
done

# Expected output:
# Service: postgres - Health: healthy
# Service: redis - Health: healthy
# Service: hr-graphql-rust - Health: healthy
# Service: frontend - Health: healthy
# Service: caddy - Health: healthy

# Check resource usage
docker stats --no-stream

# Expected resource usage (approximate):
# postgres:       50-100 MB RAM,  1-5% CPU
# redis:          20-50 MB RAM,   0-2% CPU
# hr-graphql-rust: 100-200 MB RAM, 1-10% CPU
# frontend:       100-150 MB RAM, 1-5% CPU
# caddy:          30-50 MB RAM,   0-2% CPU
```

---

## Path B: CI/CD Setup (Automated Deployments)

### Overview

The CI/CD pipeline automatically:
1. ✅ Runs linters (Prettier, ESLint, TypeScript check)
2. ✅ Runs all tests (frontend unit tests, backend tests)
3. ✅ Builds Docker images (multi-stage optimized builds)
4. ✅ Pushes images to GitLab Container Registry
5. ✅ Deploys to production server via SSH
6. ✅ Backs up database before deployment
7. ✅ Verifies health checks after deployment
8. ✅ Cleans up old backups and images

**Total pipeline time**: ~15 minutes

### Prerequisites for CI/CD

- [x] GitHub repository with code pushed
- [x] GitLab account (for free container registry)
- [x] Production server set up with Path A completed
- [x] SSH access to production server

### Step 1: Create GitLab Personal Access Token

**See detailed guide**: `docs/deployment/gitlab-token-setup.md`

**Quick steps**:

1. Go to GitLab: https://gitlab.com
2. Click your **avatar** (top-right) → **Settings** → **Access Tokens**
3. Click **Add new token**
4. Configure token:
   - **Token name**: `github-actions-sveltehr`
   - **Expiration date**: 1 year from now (or no expiration)
   - **Select scopes**:
     - ✅ `read_registry` - Pull images from registry
     - ✅ `write_registry` - Push images to registry
     - ❌ All other scopes - DO NOT SELECT
5. Click **Create personal access token**
6. **CRITICAL**: Copy the token immediately (it's only shown once)
   - Token format: `glpat-xxxxxxxxxxxxxxxxxxxxx`

**Save token securely**:
```bash
# Save to encrypted file (or use password manager)
echo "glpat-xxxxxxxxxxxxxxxxxxxxx" > gitlab-token.txt
chmod 600 gitlab-token.txt
```

### Step 2: Generate SSH Key Pair for Deployment

**See detailed guide**: `docs/deployment/github-secrets.md`

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key

# This creates:
# - ~/.ssh/deploy_key (private key) - DO NOT SHARE
# - ~/.ssh/deploy_key.pub (public key) - Add to server
```

**Add public key to production server**:
```bash
# Copy public key to server
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@hr.example.com

# Or manually add to authorized_keys
cat ~/.ssh/deploy_key.pub | ssh deploy@hr.example.com \
  "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

**Verify SSH key works**:
```bash
# Test connection with private key
ssh -i ~/.ssh/deploy_key deploy@hr.example.com

# If successful, you should be logged in without password
```

**Base64 encode private key** for GitHub Secrets:
```bash
# Encode private key (Linux/macOS)
cat ~/.ssh/deploy_key | base64 -w 0 > ~/deploy_key.b64

# View encoded key (copy this for GitHub Secrets)
cat ~/deploy_key.b64
```

**Security**: Delete local private key after encoding:
```bash
# AFTER adding to GitHub Secrets
rm ~/.ssh/deploy_key
rm ~/deploy_key.b64
```

### Step 3: Prepare Production Environment File

```bash
# Create production .env file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Critical production values**:
```bash
# Domain Configuration
DOMAIN=hr.example.com  # Your actual domain
TLS_EMAIL=admin@example.com  # For Let's Encrypt

# Database Configuration
POSTGRES_DB=hr_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<SECURE_RANDOM_32+_CHARACTERS>

# Authentication Secrets
JWT_SECRET=<SECURE_RANDOM_256BIT_SECRET>
JWT_REFRESH_SECRET=<SECURE_RANDOM_256BIT_SECRET>
SERVICE_AUTH_KEY=<SECURE_RANDOM_256BIT_SECRET>

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://hr.example.com

# GitLab Container Registry
GITLAB_PROJECT=your_gitlab_username/sveltehr
IMAGE_TAG=latest  # Will be overridden by CI/CD with commit SHA
```

**Validate configuration**:
```bash
./scripts/validate-env.sh .env.production

# All checks should pass
```

**Base64 encode .env.production** for GitHub Secrets:
```bash
# Encode entire .env.production file
cat .env.production | base64 -w 0 > .env.production.b64

# View encoded file (copy this for GitHub Secrets)
cat .env.production.b64
```

**Security**: Delete files after adding to GitHub Secrets:
```bash
# AFTER adding to GitHub Secrets
rm .env.production
rm .env.production.b64
```

### Step 4: Add GitHub Secrets

**See detailed guide**: `docs/deployment/github-secrets.md`

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

| Secret Name | Description | Value |
|-------------|-------------|-------|
| `GITLAB_USERNAME` | Your GitLab username | `john_doe` |
| `GITLAB_TOKEN` | GitLab personal access token | `glpat-xxxxxxxxxxxxx` |
| `DEPLOY_HOST` | Production server hostname/IP | `hr.example.com` or `192.168.1.100` |
| `DEPLOY_USER` | SSH deployment user | `deploy` |
| `SSH_PRIVATE_KEY` | Base64-encoded private key | Contents of `deploy_key.b64` |
| `PRODUCTION_ENV` | Base64-encoded .env file | Contents of `.env.production.b64` |
| `PRODUCTION_DOMAIN` | Production domain | `hr.example.com` |

### Step 5: Configure Production Server

```bash
# SSH to production server
ssh deploy@hr.example.com

# Create deploy user (if not exists)
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Create deployment directories
sudo mkdir -p /opt/sveltehr
sudo mkdir -p /var/backups/postgresql
sudo chown -R deploy:deploy /opt/sveltehr /var/backups/postgresql

# Verify docker group membership
groups deploy
# Should include "docker"

# Test Docker access
sudo -u deploy docker ps
# Should work without "permission denied"
```

### Step 6: Test CI/CD Pipeline

**Trigger pipeline**:
```bash
# Make a small change and push to main
echo "# Test CI/CD deployment" >> README.md
git add README.md
git commit -m "Test: Trigger CI/CD pipeline"
git push origin main
```

**Monitor pipeline**:
1. Go to GitHub repository → **Actions**
2. Click on the latest workflow run: **Deploy to Production**
3. Watch progress:
   - ✅ Lint and Type Check (~2 minutes)
   - ✅ Test Frontend (~3 minutes)
   - ✅ Test Backend (~5 minutes)
   - ✅ Build and Push Images (~10 minutes)
   - ✅ Deploy to Production (~5 minutes)

**Expected total time**: ~15 minutes

**Pipeline success**:
```
✅ All jobs completed successfully
✅ Images pushed to GitLab Container Registry
✅ Deployment completed
✅ All services healthy
```

### Step 7: Verify CI/CD Deployment

```bash
# SSH to production server
ssh deploy@hr.example.com

# Check deployed images
docker images | grep sveltehr

# Expected output:
# registry.gitlab.com/username/sveltehr/frontend   sha-abc1234   ...
# registry.gitlab.com/username/sveltehr/backend    sha-abc1234   ...

# Check running containers
docker compose -f /opt/sveltehr/docker-compose.prod.yml ps

# All services should show "Up (healthy)"

# Test application
curl https://hr.example.com/health

# Expected: {"status":"healthy"}
```

---

## Common Post-Deployment Tasks

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f hr-graphql-rust

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100

# Errors only
docker compose -f docker-compose.prod.yml logs | grep -i error
```

### Restart Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart frontend

# Recreate service (pulls new image if available)
docker compose -f docker-compose.prod.yml up -d --force-recreate frontend
```

### Update Deployment

**Manual update**:
```bash
# Pull latest images from GitLab registry
docker compose -f docker-compose.prod.yml pull

# Recreate containers with new images
docker compose -f docker-compose.prod.yml up -d --no-build

# Verify update
docker compose -f docker-compose.prod.yml ps
docker images | grep sveltehr
```

**Automatic update** (CI/CD):
- Push code to `main` branch
- GitHub Actions automatically deploys

### Backup Database

**Manual backup**:
```bash
# Create backup
docker exec sveltehr-postgres-prod pg_dump -U postgres hr_system > \
  backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql

# Move to backup directory
mv backup_*.sql /var/backups/postgresql/
```

**Automated backups**:
- CI/CD pipeline automatically backs up before deployment
- Location: `/var/backups/postgresql/backup_YYYYMMDD_HHMMSS.sql`
- Retention: 7 days (older backups auto-deleted)

### Restore Database

```bash
# Stop backend to prevent new connections
docker compose -f docker-compose.prod.yml stop hr-graphql-rust

# Restore from backup
cat /var/backups/postgresql/backup_20251028_120000.sql | \
  docker exec -i sveltehr-postgres-prod psql -U postgres -d hr_system

# Restart backend
docker compose -f docker-compose.prod.yml start hr-graphql-rust

# Verify
docker compose -f docker-compose.prod.yml ps
```

### Monitor Resource Usage

```bash
# Real-time resource monitoring
docker stats

# Check disk space
df -h
docker system df

# Cleanup old images and containers
docker system prune -a --filter "until=72h"

# Expected freed space: 1-5 GB depending on usage
```

### Switch from Localhost to Production Domain

```bash
# 1. Update .env file
nano .env
# Change: DOMAIN=localhost → DOMAIN=hr.example.com
# Add: TLS_EMAIL=admin@example.com

# 2. Restart Caddy to get Let's Encrypt certificate
docker compose -f docker-compose.prod.yml restart caddy

# 3. Monitor certificate provisioning
docker compose -f docker-compose.prod.yml logs -f caddy

# Expected: "certificate obtained successfully"

# 4. Verify new certificate
echo | openssl s_client -connect hr.example.com:443 -servername hr.example.com 2>/dev/null | \
  openssl x509 -noout -issuer

# Expected issuer: Let's Encrypt Authority (R3)
```

---

## Troubleshooting

**See comprehensive guide**: `docs/deployment/troubleshooting.md`

### Services Won't Start

```bash
# Check logs for specific service
docker compose -f docker-compose.prod.yml logs <service-name>

# Common issues:
# - Port already in use → Change port in .env or stop conflicting service
# - Missing environment variables → Verify .env file exists and has all required values
# - Insufficient resources → Check: docker stats, free -h, df -h
```

### Certificate Provisioning Fails (Production Mode)

```bash
# Check Caddy logs
docker compose -f docker-compose.prod.yml logs caddy | grep -i "acme\|certificate\|error"

# Common issues:
# - DNS not pointing to server → Verify: dig +short hr.example.com
# - Port 80 not accessible → Check firewall: sudo ufw status
# - Let's Encrypt rate limit → Use ACME_CA staging URL for testing
```

### Health Checks Failing

```bash
# Check service health status
docker inspect sveltehr-<service>-prod --format='{{.State.Health.Status}}'

# Test health endpoint directly
docker exec sveltehr-graphql-rust-prod curl -f http://localhost:4000/health
docker exec sveltehr-frontend-prod curl -f http://localhost:3000/health

# Check logs for errors
docker compose -f docker-compose.prod.yml logs <service-name> --tail=50
```

### Database Connection Errors

```bash
# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres | grep -i "error\|fatal"

# Verify connection string
docker exec -it sveltehr-graphql-rust-prod env | grep DATABASE_URL

# Expected: postgresql://postgres:<password>@postgres:5432/hr_system

# Test connection manually
docker exec -it sveltehr-postgres-prod psql -U postgres -d hr_system
```

---

## Rollback Procedures

**See comprehensive guide**: `docs/deployment/rollback.md`

### Quick Rollback (Application-Only)

**Time**: ~3 minutes

```bash
# 1. Identify previous working version
docker inspect sveltehr-frontend-prod --format='{{.Config.Image}}'
# Current: sha-def7890abc (BROKEN)
# Previous: sha-abc1234567 (WORKING)

# 2. Update .env with previous IMAGE_TAG
sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=sha-abc1234567/' .env

# 3. Pull and restart
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --no-build

# 4. Verify
docker compose -f docker-compose.prod.yml ps
```

### Emergency Rollback (Database + Application)

**Time**: ~7 minutes | **Risk**: Data loss possible

```bash
# 1. Stop Caddy (maintenance mode)
docker compose -f docker-compose.prod.yml stop caddy

# 2. Restore database from backup
cat /var/backups/postgresql/backup_20251028_143000.sql | \
  docker exec -i sveltehr-postgres-prod psql -U postgres -d hr_system

# 3. Rollback application code
sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=sha-abc1234567/' .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build

# 4. Re-enable access
docker compose -f docker-compose.prod.yml start caddy

# 5. Verify
docker compose -f docker-compose.prod.yml ps
curl https://hr.example.com/health
```

---

## Security Checklist

After deployment, verify:

- [ ] All environment variables use secure random values (≥32 characters)
- [ ] `.env` file has restricted permissions: `chmod 600 .env`
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Database passwords are not default values
- [ ] SSH keys are used for deployment (no passwords)
- [ ] Only Caddy exposes ports to host (80, 443)
- [ ] Services run as non-root users inside containers
- [ ] Backups are created before each deployment
- [ ] Old backups are cleaned up automatically (7-day retention)
- [ ] GitLab token has minimal scopes (read_registry, write_registry only)
- [ ] GitHub Secrets are configured correctly
- [ ] Firewall allows only required ports (22, 80, 443)

---

## Next Steps

After successful deployment:

### 1. Configure Monitoring (Recommended)

- Set up Prometheus + Grafana for metrics
- Configure Sentry for error tracking
- Enable application performance monitoring
- Set up alerts for service health failures

**See**: `docs/deployment/monitoring.md`

### 2. Setup Automated Backups (Recommended)

- Configure daily database backups to cloud storage (S3, Backblaze B2)
- Verify backup restoration procedures
- Document disaster recovery plan
- Test recovery drills quarterly

### 3. Harden Security (Recommended)

- Configure firewall rules (allow only 22, 80, 443)
- Enable fail2ban for SSH brute-force protection
- Set up intrusion detection (OSSEC, Wazuh)
- Schedule regular security updates: `apt update && apt upgrade`
- Rotate secrets every 90 days

**See**: `docs/deployment/production-security.md`

### 4. Performance Optimization (After Baseline)

- Add resource limits to `docker-compose.prod.yml` based on `docker stats`
- Configure Redis eviction policies
- Optimize PostgreSQL configuration
- Enable CDN for static assets
- Configure HTTP/2 push in Caddy

**See**: `docs/deployment/monitoring.md`

### 5. Documentation (Recommended)

- Document custom configurations
- Create runbooks for common operations
- Update team wiki with deployment procedures
- Schedule regular disaster recovery drills

**See**: `docs/deployment/runbooks/`

---

## Support & Resources

**Documentation**:
- Container Registry: `docs/deployment/container-registry.md`
- Local Testing: `docs/deployment/local-testing.md`
- Rollback Procedures: `docs/deployment/rollback.md`
- Troubleshooting: `docs/deployment/troubleshooting.md`
- GitHub Secrets: `docs/deployment/github-secrets.md`
- GitLab Token Setup: `docs/deployment/gitlab-token-setup.md`
- Monitoring: `docs/deployment/monitoring.md`
- Security: `docs/deployment/production-security.md`

**Technical Specifications**:
- Contracts: `/specs/040-it-is-now/contracts/`
- Architecture: `/specs/040-it-is-now/plan.md`
- Requirements: `/specs/040-it-is-now/spec.md`

**Emergency Contact**:
- On-Call Engineer: [PHONE NUMBER]
- DevOps Team: [EMAIL/SLACK]

---

## Deployment Complete! 🎉

Your SvelteHR application is now running in production with:

✅ **Automatic HTTPS** via Caddy (localhost self-signed OR Let's Encrypt)
✅ **5 production services** with health monitoring
✅ **Automated database migrations** on startup
✅ **Zero-downtime deployments** via Docker Compose
✅ **CI/CD automation** via GitHub Actions
✅ **Automated backups** before deployments
✅ **Container registry integration** (GitLab)
✅ **Rollback capability** within 5 minutes

**Access your application**:
- Localhost: https://localhost
- Production: https://hr.example.com

**Next deployment**:
- Manual: `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d --no-build`
- Automatic: `git push origin main` (CI/CD handles everything)

**Need help?** Check troubleshooting guide or review logs: `docker compose -f docker-compose.prod.yml logs -f`
