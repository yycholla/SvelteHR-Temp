# GitHub Secrets Configuration Guide

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This guide explains how to configure GitHub Secrets for the automated CI/CD deployment pipeline. These secrets are encrypted at rest and only exposed to GitHub Actions workflows during execution.

## Required Secrets

All secrets must be added to your GitHub repository before the deployment workflow can run successfully.

### Secret List

| Secret Name | Description | Format | Example |
|-------------|-------------|--------|---------|
| `GITLAB_USERNAME` | GitLab username for container registry | String | `john_doe` |
| `GITLAB_TOKEN` | GitLab personal access token | String | `glpat-xxxxxxxxxxxxx` |
| `DEPLOY_HOST` | Production server hostname or IP | String | `hr.example.com` or `192.168.1.100` |
| `DEPLOY_USER` | SSH username for deployment | String | `deploy` |
| `SSH_PRIVATE_KEY` | SSH private key (base64 encoded) | Base64 | `LS0tLS1CRUdJTi...` |
| `PRODUCTION_ENV` | Production .env contents (base64 encoded) | Base64 | `RE9NQUlOPWhy...` |
| `PRODUCTION_DOMAIN` | Production domain for deployment URL | String | `hr.example.com` |

## Step-by-Step Setup

### Step 1: Create GitLab Personal Access Token

**Purpose**: Allows GitHub Actions to push Docker images to GitLab Container Registry.

**Instructions**:

1. Go to GitLab: https://gitlab.com
2. Click your avatar → **Settings** → **Access Tokens**
3. Click **Add new token**
4. Configure the token:
   - **Token name**: `github-actions-sveltehr`
   - **Expiration date**: 1 year from now (or no expiration)
   - **Select scopes**:
     - ✅ `read_registry` - Pull images from registry
     - ✅ `write_registry` - Push images to registry
5. Click **Create personal access token**
6. **IMPORTANT**: Copy the token immediately (it's only shown once)
7. Save the token securely - you'll need it for the next step

**Token Format**: `glpat-xxxxxxxxxxxxxxxxxxxxx` (starts with `glpat-`)

### Step 2: Generate SSH Key Pair

**Purpose**: Secure, passwordless SSH access for GitHub Actions to deploy to production server.

**Instructions**:

```bash
# Generate ED25519 key pair (more secure than RSA)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key

# This creates two files:
# - deploy_key (private key) - DO NOT SHARE
# - deploy_key.pub (public key) - Add to server
```

**Add Public Key to Production Server**:

```bash
# Copy public key to server
ssh-copy-id -i deploy_key.pub deploy@hr.example.com

# Or manually add to authorized_keys
cat deploy_key.pub | ssh deploy@hr.example.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**Verify SSH Key Works**:

```bash
# Test connection with private key
ssh -i deploy_key deploy@hr.example.com

# If successful, you should be logged in without a password
```

**Base64 Encode Private Key for GitHub Secrets**:

```bash
# Encode private key (Linux/macOS)
cat deploy_key | base64 -w 0 > deploy_key.b64

# View encoded key
cat deploy_key.b64
```

**Security Notes**:
- ⚠️ NEVER commit the private key to version control
- ⚠️ Delete the local `deploy_key` file after encoding
- ⚠️ Keep the `.b64` file secure or delete after uploading to GitHub

### Step 3: Prepare Production Environment File

**Purpose**: Store production environment variables securely in GitHub Secrets.

**Instructions**:

```bash
# 1. Create production .env file from example
cp .env.example .env.production

# 2. Edit .env.production with production values
nano .env.production

# CRITICAL: Fill in all required values:
# - DOMAIN=hr.example.com (your actual domain)
# - TLS_EMAIL=admin@example.com
# - POSTGRES_PASSWORD=<secure_random_32+>
# - JWT_SECRET=<secure_random_256bit>
# - JWT_REFRESH_SECRET=<secure_random_256bit>
# - SERVICE_AUTH_KEY=<secure_random_256bit>
# - CORS_ALLOWED_ORIGINS=https://hr.example.com
# - GITLAB_PROJECT=<your_gitlab_username>/sveltehr
# - IMAGE_TAG=latest

# 3. Validate configuration
./scripts/validate-env.sh .env.production

# 4. Base64 encode the entire file
cat .env.production | base64 -w 0 > .env.production.b64

# 5. View encoded file
cat .env.production.b64
```

**Security Notes**:
- ⚠️ NEVER commit `.env.production` to version control
- ⚠️ Delete `.env.production` and `.env.production.b64` after uploading to GitHub
- ⚠️ Use secure random generation for all secrets

### Step 4: Add Secrets to GitHub Repository

**Instructions**:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret one by one:

**Secret 1: GITLAB_USERNAME**
- Name: `GITLAB_USERNAME`
- Secret: Your GitLab username (e.g., `john_doe`)

**Secret 2: GITLAB_TOKEN**
- Name: `GITLAB_TOKEN`
- Secret: GitLab personal access token from Step 1 (e.g., `glpat-xxxxxxxxxxxxx`)

**Secret 3: DEPLOY_HOST**
- Name: `DEPLOY_HOST`
- Secret: Production server hostname or IP (e.g., `hr.example.com` or `192.168.1.100`)

**Secret 4: DEPLOY_USER**
- Name: `DEPLOY_USER`
- Secret: SSH username (e.g., `deploy`)

**Secret 5: SSH_PRIVATE_KEY**
- Name: `SSH_PRIVATE_KEY`
- Secret: Contents of `deploy_key.b64` (entire base64 string)

**Secret 6: PRODUCTION_ENV**
- Name: `PRODUCTION_ENV`
- Secret: Contents of `.env.production.b64` (entire base64 string)

**Secret 7: PRODUCTION_DOMAIN**
- Name: `PRODUCTION_DOMAIN`
- Secret: Production domain (e.g., `hr.example.com`)

### Step 5: Verify Secrets Configuration

**Checklist**:

- [ ] All 7 secrets are added to GitHub repository
- [ ] GitLab token has `read_registry` and `write_registry` scopes
- [ ] SSH public key is in `~/.ssh/authorized_keys` on production server
- [ ] SSH connection works with private key (tested manually)
- [ ] Production .env file has all required variables with secure values
- [ ] DOMAIN in production .env is set to actual domain (not localhost)
- [ ] TLS_EMAIL is set (required for Let's Encrypt)
- [ ] All sensitive values are randomly generated (not defaults)

## Production Server Prerequisites

Before the CI/CD pipeline can deploy, ensure the production server is configured:

### 1. Create Deploy User

```bash
# On production server as root or sudo user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Allow deploy user to run docker commands without sudo
sudo visudo
# Add: deploy ALL=(ALL) NOPASSWD: /usr/bin/docker-compose, /usr/bin/docker
```

### 2. Create Required Directories

```bash
# Create deployment directory
sudo mkdir -p /opt/sveltehr
sudo chown deploy:deploy /opt/sveltehr

# Create backup directory
sudo mkdir -p /var/backups/postgresql
sudo chown deploy:deploy /var/backups/postgresql
```

### 3. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose v2
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker compose version
# Should show: Docker Compose version v2.20+
```

### 4. Configure Firewall

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (ensure this is allowed before enabling firewall!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### 5. Configure DNS

Point your domain to the production server:

```
A Record: hr.example.com → <server_ip_address>
```

Wait for DNS propagation (can take up to 48 hours, usually <1 hour).

**Verify DNS**:

```bash
dig hr.example.com +short
# Should return your server IP address
```

## Testing the Pipeline

### Manual Workflow Trigger

1. Go to GitHub repository → **Actions**
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

### Monitor Deployment

1. Watch workflow progress in Actions tab
2. Check each job:
   - ✅ Lint and Type Check (~2 minutes)
   - ✅ Test Frontend (~3 minutes)
   - ✅ Test Backend (~5 minutes)
   - ✅ Build and Push Images (~10 minutes)
   - ✅ Deploy to Production (~5 minutes)

3. Expected total time: **~15 minutes**

### Verify Deployment Success

```bash
# SSH to production server
ssh deploy@hr.example.com

# Check running containers
docker ps

# Verify all services are healthy
docker compose -f /opt/sveltehr/docker-compose.prod.yml ps

# Check service health
for service in postgres redis hr-graphql-rust frontend caddy; do
  docker inspect --format='{{.State.Health.Status}}' sveltehr-${service}-prod
done

# All should return "healthy"
```

**Access Application**:

Visit: https://hr.example.com

- Should show valid SSL certificate (Let's Encrypt)
- Should redirect HTTP → HTTPS
- Application should load successfully

## Troubleshooting

### Issue: GitLab Token Authentication Failed

**Symptoms**:
```
Error: failed to authorize: failed to fetch oauth token
```

**Solution**:
1. Verify `GITLAB_TOKEN` has correct scopes (`read_registry`, `write_registry`)
2. Check token hasn't expired (GitLab tokens expire after set duration)
3. Regenerate token with correct scopes
4. Update GitHub Secret

### Issue: SSH Connection Failed

**Symptoms**:
```
Permission denied (publickey)
```

**Solution**:
1. Verify SSH public key is in `~/.ssh/authorized_keys` on server
2. Check file permissions:
   ```bash
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```
3. Verify `DEPLOY_USER` exists on server
4. Test SSH connection manually with private key

### Issue: Deployment Fails - Database Backup Error

**Symptoms**:
```
pg_dump: error: connection to server failed
```

**Solution**:
1. Verify PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```
2. Check if this is first deployment (no existing database):
   - If first deployment, skip backup or create empty backup:
   ```bash
   # In workflow, add conditional:
   if docker ps | grep sveltehr-postgres-prod; then
     docker exec sveltehr-postgres-prod pg_dump ...
   fi
   ```

### Issue: Health Checks Fail After Deployment

**Symptoms**:
```
Service frontend is not healthy: starting
```

**Solution**:
1. Check service logs:
   ```bash
   docker logs sveltehr-frontend-prod --tail 100
   ```
2. Verify environment variables are set correctly
3. Check database migrations completed successfully
4. Increase wait time in workflow (currently 30s)

## Security Best Practices

### Secret Rotation

**Recommended Schedule**:
- SSH keys: Every 90 days
- GitLab tokens: Every 90 days
- JWT secrets: Every 180 days
- Database passwords: Every 180 days

**Rotation Process**:
1. Generate new secret
2. Update GitHub Secret
3. Trigger redeployment
4. Verify application works
5. Remove old secret

### Least Privilege

- Deploy user has minimal permissions (only Docker commands)
- GitLab token has only required scopes
- SSH key is deployment-specific (not personal developer key)

### Audit and Monitoring

- Review GitHub Actions logs regularly
- Monitor failed deployment attempts
- Set up alerts for deployment failures
- Track secret access patterns

## References

- GitHub Actions Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- GitLab Personal Access Tokens: https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html
- SSH Key Generation: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent
- Docker Compose: https://docs.docker.com/compose/
