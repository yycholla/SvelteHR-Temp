# Quickstart: Production Deployment

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Target Audience**: DevOps Engineers, System Administrators
**Estimated Time**: 10-15 minutes
**Date**: 2025-10-28

## Prerequisites

Before starting, ensure you have:

- [ ] Ubuntu 22.04 LTS or Debian 11 server with root/sudo access
- [ ] Docker Engine 24+ installed
- [ ] Docker Compose v2.20+ installed
- [ ] 2+ CPU cores, 4GB+ RAM, 20GB+ storage
- [ ] Domain name (optional for localhost mode) pointed to server IP
- [ ] SSH access to the server
- [ ] Git installed

**Quick Docker Installation** (if needed):
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Step 1: Clone Repository and Checkout Feature Branch

```bash
# Clone repository
git clone https://github.com/yourusername/SvelteHR.git
cd SvelteHR

# Checkout production deployment branch
git checkout 040-it-is-now

# Verify files exist
ls -la docker-compose.prod.yml Caddyfile .env.example
```

**Expected Output**:
```
-rw-r--r-- 1 user user  5432 Oct 28 12:00 docker-compose.prod.yml
-rw-r--r-- 1 user user  2145 Oct 28 12:00 Caddyfile
-rw-r--r-- 1 user user  3678 Oct 28 12:00 .env.example
```

---

## Step 2: Configure Environment Variables

### Option A: Localhost Mode (Testing/Development)

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env
```

**Required Changes for Localhost Mode**:
```bash
# Deployment Mode - KEEP AS localhost for testing
DOMAIN=localhost

# Database Configuration - GENERATE SECURE PASSWORDS
POSTGRES_DB=hr_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32)  # Auto-generated

# Secrets - GENERATE SECURE RANDOM VALUES
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
SERVICE_AUTH_KEY=$(openssl rand -base64 32)

# Optional: Remove TLS_EMAIL (not needed for localhost)
# TLS_EMAIL=  # Not required for localhost mode
```

**Quick Setup Script**:
```bash
#!/bin/bash
# save as: setup-env-localhost.sh

cp .env.example .env

# Generate secure random values
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
SERVICE_AUTH_KEY=$(openssl rand -base64 32)

# Update .env file
sed -i "s/<GENERATE_32_CHAR_RANDOM>/$POSTGRES_PASSWORD/g" .env
sed -i "s/<GENERATE_256BIT_RANDOM>/$JWT_SECRET/" .env
sed -i "0,/<GENERATE_256BIT_RANDOM>/s//<GENERATE_256BIT_RANDOM>/$JWT_REFRESH_SECRET/" .env
sed -i "0,/<GENERATE_256BIT_RANDOM>/s//<GENERATE_256BIT_RANDOM>/$SERVICE_AUTH_KEY/" .env

echo "✅ Environment file configured for localhost mode"
echo "Secrets generated and saved to .env"
```

### Option B: Production Mode (Real Domain)

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env
```

**Required Changes for Production Mode**:
```bash
# Deployment Mode - SET TO YOUR DOMAIN
DOMAIN=hr.example.com  # Replace with your actual domain

# Database Configuration - GENERATE SECURE PASSWORDS
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Secrets - GENERATE SECURE RANDOM VALUES
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
SERVICE_AUTH_KEY=$(openssl rand -base64 32)

# TLS Configuration - REQUIRED for production
TLS_EMAIL=admin@example.com  # For Let's Encrypt notifications
```

**Important**: Ensure your domain DNS A record points to the server IP address:
```bash
# Verify DNS
dig +short hr.example.com
# Should return your server IP

# Or use nslookup
nslookup hr.example.com
```

---

## Step 3: Initial Deployment

### Deploy the Stack

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d

# Monitor startup (Ctrl+C to exit, services continue running)
docker compose -f docker-compose.prod.yml logs -f
```

**Expected Output**:
```
[+] Running 10/10
 ✔ Network sveltehr-network          Created
 ✔ Volume "postgres_data"             Created
 ✔ Volume "redis_data"                Created
 ✔ Volume "caddy_data"                Created
 ✔ Volume "caddy_config"              Created
 ✔ Container sveltehr-postgres-prod   Started
 ✔ Container sveltehr-redis-prod      Started
 ✔ Container sveltehr-graphql-rust-prod Started
 ✔ Container sveltehr-frontend-prod   Started
 ✔ Container sveltehr-caddy-prod      Started
```

**Startup Timeline**:
- PostgreSQL: ~10-15 seconds
- Redis: ~5 seconds
- Backend (GraphQL): ~30-60 seconds (includes migrations)
- Frontend: ~15-20 seconds
- Caddy: ~5-10 seconds (localhost) or ~30-60 seconds (Let's Encrypt)

---

## Step 4: Verify Deployment

### Check Service Health

```bash
# Check all services are running and healthy
docker compose -f docker-compose.prod.yml ps

# Expected output: All services "Up" with "(healthy)"
```

**Example Output**:
```
NAME                             STATUS              PORTS
sveltehr-caddy-prod              Up (healthy)        0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
sveltehr-frontend-prod           Up (healthy)        3000/tcp
sveltehr-graphql-rust-prod       Up (healthy)        4000/tcp
sveltehr-postgres-prod           Up (healthy)        5432/tcp
sveltehr-redis-prod              Up (healthy)        6379/tcp
```

### Test Application Access

**Localhost Mode**:
```bash
# Test HTTPS (self-signed certificate)
curl -k https://localhost/

# Expected: HTML response from SvelteKit frontend

# Test GraphQL API
curl -k https://localhost/graphql -H "Content-Type: application/json" -d '{"query": "{ __typename }"}'

# Expected: {"data":{"__typename":"Query"}}
```

**Production Mode**:
```bash
# Test HTTPS (Let's Encrypt certificate)
curl https://hr.example.com/

# Test certificate validity
echo | openssl s_client -connect hr.example.com:443 -servername hr.example.com 2>/dev/null | openssl x509 -noout -dates

# Expected: Valid Let's Encrypt certificate
```

### Check Logs for Errors

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs

# View specific service logs
docker compose -f docker-compose.prod.yml logs postgres
docker compose -f docker-compose.prod.yml logs hr-graphql-rust
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs caddy

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f
```

---

## Step 5: Access the Application

### Localhost Mode

Open browser and navigate to:
- **Application**: https://localhost (accept self-signed certificate warning)
- **GraphQL Playground** (if enabled): https://localhost/graphql

**Browser Warning**: You'll see "Your connection is not private" - this is expected for self-signed certificates. Click "Advanced" → "Proceed to localhost".

### Production Mode

Open browser and navigate to:
- **Application**: https://hr.example.com
- **GraphQL API**: https://hr.example.com/graphql

**No browser warning** - Let's Encrypt certificates are automatically trusted.

---

## Step 6: Configure CI/CD (Optional - For Automated Deployments)

### GitHub Actions Setup

1. **Create GitLab Personal Access Token**:
   ```bash
   # Go to: GitLab → Settings → Access Tokens
   # Name: github-actions-deploy
   # Scopes: read_registry, write_registry
   # Copy token (shown only once)
   ```

2. **Generate SSH Key for Deployment**:
   ```bash
   # On your local machine
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key

   # Copy public key to server
   ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@hr.example.com

   # Base64 encode private key for GitHub Secrets
   cat ~/.ssh/deploy_key | base64 -w 0 > deploy_key.b64
   cat deploy_key.b64  # Copy output
   ```

3. **Add GitHub Secrets**:
   Go to: GitHub Repository → Settings → Secrets and variables → Actions → New repository secret

   Add these secrets:
   | Name | Value | Example |
   |------|-------|---------|
   | `GITLAB_USERNAME` | Your GitLab username | `john_doe` |
   | `GITLAB_TOKEN` | GitLab personal access token | `glpat-xxxxxxxxxxxxx` |
   | `DEPLOY_HOST` | Production server IP/hostname | `hr.example.com` or `192.168.1.100` |
   | `DEPLOY_USER` | SSH deployment user | `deploy` |
   | `SSH_PRIVATE_KEY` | Base64-encoded private key | (from deploy_key.b64) |
   | `PRODUCTION_ENV` | Base64-encoded .env file | (see below) |
   | `PRODUCTION_DOMAIN` | Production domain | `hr.example.com` |

4. **Encode .env File**:
   ```bash
   # Create production .env file
   cat .env | base64 -w 0 > .env.prod.b64
   cat .env.prod.b64  # Copy output to PRODUCTION_ENV secret
   ```

5. **Test Automated Deployment**:
   ```bash
   # Make a small change and push
   echo "# Test deployment" >> README.md
   git add README.md
   git commit -m "Test: Trigger CI/CD pipeline"
   git push origin main

   # Watch GitHub Actions tab for pipeline execution
   ```

---

## Step 7: Verify Automated Deployment (If CI/CD Configured)

```bash
# Check GitHub Actions status
# Go to: GitHub Repository → Actions → Latest workflow run

# Expected stages:
# ✅ Lint and Type Check
# ✅ Test Frontend
# ✅ Test Backend
# ✅ Build and Push Images
# ✅ Deploy to Production

# On server, verify new images deployed
ssh deploy@hr.example.com
cd /opt/sveltehr
docker compose -f docker-compose.prod.yml ps
docker images | grep sveltehr
```

---

## Common Tasks

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f hr-graphql-rust

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
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

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Recreate containers with new images (zero downtime)
docker compose -f docker-compose.prod.yml up -d --no-build

# Verify update
docker compose -f docker-compose.prod.yml ps
```

### Backup Database

```bash
# Manual backup
docker exec sveltehr-postgres-prod pg_dump -U postgres hr_system > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql

# Automated backups (done by CI/CD before each deployment)
ls -lh /var/backups/postgresql/
```

### Restore Database

```bash
# Stop backend to prevent new connections
docker compose -f docker-compose.prod.yml stop hr-graphql-rust

# Restore from backup
cat backup_20251028_120000.sql | docker exec -i sveltehr-postgres-prod psql -U postgres -d hr_system

# Restart backend
docker compose -f docker-compose.prod.yml start hr-graphql-rust
```

### Monitor Resource Usage

```bash
# Real-time resource monitoring
docker stats

# Check disk space
df -h
docker system df

# Clean up old images and containers
docker system prune -a --volumes --filter "until=72h"
```

### Switch from Localhost to Production Domain

```bash
# 1. Update .env file
nano .env
# Change: DOMAIN=localhost to DOMAIN=hr.example.com
# Add: TLS_EMAIL=admin@example.com

# 2. Restart Caddy to get Let's Encrypt certificate
docker compose -f docker-compose.prod.yml restart caddy

# 3. Monitor certificate provisioning
docker compose -f docker-compose.prod.yml logs -f caddy

# Expected: "certificate obtained successfully"

# 4. Verify new certificate
echo | openssl s_client -connect hr.example.com:443 -servername hr.example.com 2>/dev/null | openssl x509 -noout -issuer

# Expected issuer: Let's Encrypt Authority
```

---

## Troubleshooting

### Services Won't Start

**Check logs**:
```bash
docker compose -f docker-compose.prod.yml logs <service-name>
```

**Common issues**:
- PostgreSQL: Port 5432 already in use → Change `POSTGRES_PORT` in .env
- Redis: Port 6379 already in use → Change `REDIS_PORT` in .env
- Missing environment variables → Verify .env file exists and has all required values

### Certificate Provisioning Fails (Production Mode)

**Check Caddy logs**:
```bash
docker compose -f docker-compose.prod.yml logs caddy | grep -i "acme\|certificate\|error"
```

**Common issues**:
- DNS not pointing to server → Verify with `dig +short hr.example.com`
- Port 80 not accessible → Check firewall: `sudo ufw status`
- Let's Encrypt rate limit hit → Use `TLS_STAGING=true` for testing

### Health Checks Failing

**Check service health**:
```bash
docker inspect sveltehr-<service>-prod --format='{{.State.Health.Status}}'
```

**Test health endpoint directly**:
```bash
# Backend
docker exec sveltehr-graphql-rust-prod curl -f http://localhost:4000/health

# Frontend
docker exec sveltehr-frontend-prod curl -f http://localhost:3000/health

# PostgreSQL
docker exec sveltehr-postgres-prod pg_isready -U postgres -d hr_system
```

### Database Connection Errors

**Check PostgreSQL logs**:
```bash
docker compose -f docker-compose.prod.yml logs postgres | grep -i "error\|fatal"
```

**Verify connection string**:
```bash
# From backend container
docker exec -it sveltehr-graphql-rust-prod env | grep DATABASE_URL

# Expected: postgresql://postgres:<password>@postgres:5432/hr_system
```

### GraphQL API Not Responding

**Check backend logs**:
```bash
docker compose -f docker-compose.prod.yml logs hr-graphql-rust --tail=50
```

**Test API directly** (bypassing Caddy):
```bash
docker exec sveltehr-graphql-rust-prod curl http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### Frontend Not Loading

**Check frontend logs**:
```bash
docker compose -f docker-compose.prod.yml logs frontend --tail=50
```

**Test frontend directly** (bypassing Caddy):
```bash
docker exec sveltehr-frontend-prod curl http://localhost:3000/
```

**Check Caddy routing**:
```bash
docker exec sveltehr-caddy-prod wget -qO- http://localhost:2019/config/ | jq '.apps.http.servers'
```

---

## Rollback Procedure

### Quick Rollback (Using Previous Images)

```bash
# 1. Stop current deployment
docker compose -f docker-compose.prod.yml down

# 2. Set previous image tag
export IMAGE_TAG=sha-previous123  # Replace with actual previous commit SHA

# 3. Pull previous images
docker compose -f docker-compose.prod.yml pull

# 4. Start with previous images
docker compose -f docker-compose.prod.yml up -d

# 5. Verify services
docker compose -f docker-compose.prod.yml ps
```

**Estimated Time**: < 5 minutes

### Emergency Rollback (Using Database Backup)

```bash
# 1. Stop services
docker compose -f docker-compose.prod.yml stop

# 2. Restore database from backup
cat /var/backups/postgresql/backup_<timestamp>.sql | \
  docker exec -i sveltehr-postgres-prod psql -U postgres -d hr_system

# 3. Restart services
docker compose -f docker-compose.prod.yml start

# 4. Verify
docker compose -f docker-compose.prod.yml ps
```

---

## Security Checklist

After deployment, verify:

- [ ] All environment variables use secure random values (≥32 characters)
- [ ] .env file has restricted permissions: `chmod 600 .env`
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Database passwords are not default values
- [ ] SSH keys are used for deployment (no passwords)
- [ ] Only Caddy exposes ports to the host (80, 443)
- [ ] Services run as non-root users inside containers
- [ ] Backups are created before each deployment
- [ ] Old backups are cleaned up automatically (7-day retention)

---

## Next Steps

After successful deployment:

1. **Configure Monitoring** (optional):
   - Set up Prometheus + Grafana
   - Configure Sentry for error tracking
   - Enable application performance monitoring

2. **Setup Automated Backups** (recommended):
   - Configure daily database backups to cloud storage (S3, B2)
   - Verify backup restoration procedures
   - Document disaster recovery plan

3. **Harden Security** (recommended):
   - Configure firewall rules (allow only 22, 80, 443)
   - Enable fail2ban for SSH protection
   - Set up intrusion detection (OSSEC, Wazuh)
   - Regular security updates: `apt update && apt upgrade`

4. **Performance Optimization** (after baseline monitoring):
   - Add resource limits to docker-compose.prod.yml based on `docker stats`
   - Configure Redis eviction policies
   - Optimize PostgreSQL configuration
   - Enable CDN for static assets

5. **Documentation**:
   - Document custom configurations
   - Create runbooks for common operations
   - Update team wiki with deployment procedures
   - Schedule regular disaster recovery drills

---

## Support & Resources

- **Documentation**: `/docs/deployment/`
- **Contracts**: `/specs/040-it-is-now/contracts/`
- **Troubleshooting**: Check logs with `docker compose logs -f`
- **Emergency Contact**: [DevOps Team Email/Slack]

---

**Deployment Complete! 🎉**

Your SvelteHR application is now running in production with:
✅ Automatic HTTPS via Caddy
✅ Automated database migrations
✅ Health monitoring for all services
✅ Zero-downtime deployment capability
✅ Automated backups (via CI/CD)
