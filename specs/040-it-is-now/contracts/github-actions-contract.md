# Contract: GitHub Actions CI/CD Pipeline

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This contract defines the GitHub Actions workflow for automated building, testing, and deploying the SvelteHR application to production servers with GitLab Container Registry integration.

## Workflow Metadata

**Workflow File**: `.github/workflows/deploy-production.yml`

**Trigger Configuration**:
```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  workflow_dispatch:  # Manual trigger option
```

**Concurrency Control**:
```yaml
concurrency:
  group: production-deployment
  cancel-in-progress: false  # Don't cancel running deployments
```

---

## Job Structure

### Job 1: Lint and Type Check

**Job Name**: `lint`

**Runs On**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Run Prettier check (`npm run format -- --check`)
5. Run ESLint (`npm run lint`)
6. Run TypeScript check (`npm run check`)

**Success Criteria**:
- All linters pass with exit code 0
- No formatting issues
- No TypeScript errors

**Timeout**: 10 minutes

**Example**:
```yaml
lint:
  runs-on: ubuntu-latest
  timeout-minutes: 10
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run Prettier
      run: npm run format -- --check

    - name: Run ESLint
      run: npm run lint

    - name: TypeScript check
      run: npm run check
```

---

### Job 2: Test Frontend

**Job Name**: `test-frontend`

**Depends On**: `lint`

**Runs On**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run unit tests (`npm run test:unit -- --run`)
5. Upload test results

**Success Criteria**:
- All unit tests pass
- Test coverage meets minimum threshold (if configured)

**Timeout**: 15 minutes

**Example**:
```yaml
test-frontend:
  needs: lint
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run unit tests
      run: npm run test:unit -- --run

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: frontend-test-results
        path: test-results/
```

---

### Job 3: Test Backend

**Job Name**: `test-backend`

**Depends On**: `lint`

**Runs On**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Rust toolchain (stable)
3. Cache cargo dependencies
4. Run backend tests (`cargo test --manifest-path graphql-rust-server/Cargo.toml`)
5. Upload test results

**Success Criteria**:
- All Rust tests pass
- No compilation errors

**Timeout**: 20 minutes

**Example**:
```yaml
test-backend:
  needs: lint
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@v4

    - name: Setup Rust
      uses: actions-rust-lang/setup-rust-toolchain@v1
      with:
        toolchain: stable

    - name: Cache cargo
      uses: actions/cache@v4
      with:
        path: |
          ~/.cargo/registry
          ~/.cargo/git
          graphql-rust-server/target
        key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

    - name: Run backend tests
      run: cargo test --manifest-path graphql-rust-server/Cargo.toml
```

---

### Job 4: Build and Push Images

**Job Name**: `build-push`

**Depends On**: `[test-frontend, test-backend]`

**Runs On**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Set up Docker Buildx
3. Login to GitLab Container Registry
4. Extract metadata (tags, labels)
5. Build and push frontend image
6. Build and push backend image

**Success Criteria**:
- Both images build successfully
- Images pushed to GitLab registry
- Images tagged with `latest` and `sha-{commit}`

**Timeout**: 30 minutes

**Required Secrets**:
- `GITLAB_USERNAME`: GitLab username
- `GITLAB_TOKEN`: GitLab personal access token with read_registry and write_registry scopes

**Example**:
```yaml
build-push:
  needs: [test-frontend, test-backend]
  runs-on: ubuntu-latest
  timeout-minutes: 30
  outputs:
    frontend-digest: ${{ steps.build-frontend.outputs.digest }}
    backend-digest: ${{ steps.build-backend.outputs.digest }}
  steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to GitLab Container Registry
      uses: docker/login-action@v3
      with:
        registry: registry.gitlab.com
        username: ${{ secrets.GITLAB_USERNAME }}
        password: ${{ secrets.GITLAB_TOKEN }}

    - name: Extract metadata
      id: meta-frontend
      uses: docker/metadata-action@v5
      with:
        images: registry.gitlab.com/${{ secrets.GITLAB_USERNAME }}/sveltehr/frontend
        tags: |
          type=raw,value=latest
          type=sha,prefix=sha-

    - name: Build and push frontend
      id: build-frontend
      uses: docker/build-push-action@v5
      with:
        context: .
        file: ./Dockerfile
        push: true
        tags: ${{ steps.meta-frontend.outputs.tags }}
        labels: ${{ steps.meta-frontend.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        target: production

    - name: Extract metadata (backend)
      id: meta-backend
      uses: docker/metadata-action@v5
      with:
        images: registry.gitlab.com/${{ secrets.GITLAB_USERNAME }}/sveltehr/backend
        tags: |
          type=raw,value=latest
          type=sha,prefix=sha-

    - name: Build and push backend
      id: build-backend
      uses: docker/build-push-action@v5
      with:
        context: ./graphql-rust-server
        file: ./graphql-rust-server/Dockerfile.prod
        push: true
        tags: ${{ steps.meta-backend.outputs.tags }}
        labels: ${{ steps.meta-backend.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        target: production
```

---

### Job 5: Deploy to Production

**Job Name**: `deploy`

**Depends On**: `build-push`

**Runs On**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup SSH key
3. Create .env file from secret
4. Backup database (pg_dump)
5. Pull new images on server
6. Deploy with docker compose
7. Verify health checks
8. Cleanup old backups

**Success Criteria**:
- SSH connection successful
- Database backup created
- All services healthy after deployment
- Health checks pass

**Timeout**: 20 minutes

**Required Secrets**:
- `DEPLOY_HOST`: Production server hostname/IP
- `DEPLOY_USER`: SSH username
- `SSH_PRIVATE_KEY`: SSH private key (base64 encoded)
- `PRODUCTION_ENV`: Production .env file contents (base64 encoded)

**Example**:
```yaml
deploy:
  needs: build-push
  runs-on: ubuntu-latest
  timeout-minutes: 20
  environment:
    name: production
    url: https://${{ secrets.PRODUCTION_DOMAIN }}
  steps:
    - uses: actions/checkout@v4

    - name: Setup SSH
      run: |
        mkdir -p ~/.ssh
        echo "${{ secrets.SSH_PRIVATE_KEY }}" | base64 -d > ~/.ssh/deploy_key
        chmod 600 ~/.ssh/deploy_key
        ssh-keyscan -H ${{ secrets.DEPLOY_HOST }} >> ~/.ssh/known_hosts

    - name: Create .env file
      run: |
        echo "${{ secrets.PRODUCTION_ENV }}" | base64 -d > .env.production

    - name: Backup database
      run: |
        ssh -i ~/.ssh/deploy_key ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
          "docker exec sveltehr-postgres-prod pg_dump -U postgres hr_system > /var/backups/postgresql/backup_$(date +%Y%m%d_%H%M%S).sql"

    - name: Copy files to server
      run: |
        scp -i ~/.ssh/deploy_key -r \
          docker-compose.prod.yml \
          Caddyfile \
          .env.production \
          ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}:/opt/sveltehr/

    - name: Deploy
      run: |
        ssh -i ~/.ssh/deploy_key ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} << 'EOF'
          cd /opt/sveltehr
          mv .env.production .env
          export IMAGE_TAG=sha-${{ github.sha }}
          docker compose -f docker-compose.prod.yml pull
          docker compose -f docker-compose.prod.yml up -d --no-build
        EOF

    - name: Verify deployment
      run: |
        ssh -i ~/.ssh/deploy_key ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
          "docker compose -f /opt/sveltehr/docker-compose.prod.yml ps --format json"

    - name: Wait for health checks
      run: |
        sleep 30
        ssh -i ~/.ssh/deploy_key ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} << 'EOF'
          cd /opt/sveltehr
          # Check all services are healthy
          for service in postgres redis hr-graphql-rust frontend caddy; do
            health=$(docker inspect --format='{{.State.Health.Status}}' sveltehr-${service}-prod 2>/dev/null || echo "no-health-check")
            if [ "$health" != "healthy" ] && [ "$health" != "no-health-check" ]; then
              echo "Service $service is not healthy: $health"
              exit 1
            fi
          done
          echo "All services healthy"
        EOF

    - name: Cleanup old backups
      run: |
        ssh -i ~/.ssh/deploy_key ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
          "find /var/backups/postgresql -name '*.sql' -mtime +7 -delete"

    - name: Cleanup old images
      run: |
        ssh -i ~/.ssh/deploy_key ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
          "docker image prune -af --filter 'until=72h'"
```

---

## Secrets Contract

### Required GitHub Secrets

| Secret Name | Description | Format | Example |
|-------------|-------------|--------|---------|
| `GITLAB_USERNAME` | GitLab username | String | `john_doe` |
| `GITLAB_TOKEN` | GitLab personal access token | String | `glpat-xxxxxxxxxxxxx` |
| `DEPLOY_HOST` | Production server hostname | String | `hr.example.com` or `192.168.1.100` |
| `DEPLOY_USER` | SSH deployment user | String | `deploy` |
| `SSH_PRIVATE_KEY` | SSH private key (base64) | Base64 | `LS0tLS1CRUdJTi...` |
| `PRODUCTION_ENV` | Production .env contents (base64) | Base64 | `RE9NQUlOPWhy...` |
| `PRODUCTION_DOMAIN` | Production domain (for URL) | String | `hr.example.com` |

### Secret Generation Commands

```bash
# Generate SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key

# Base64 encode private key
cat deploy_key | base64 -w 0 > deploy_key.b64

# Base64 encode .env file
cat .env.production | base64 -w 0 > .env.production.b64

# Add public key to server
ssh-copy-id -i deploy_key.pub deploy@hr.example.com
```

### GitLab Token Scopes

Required scopes for `GITLAB_TOKEN`:
- `read_registry` - Pull images from registry
- `write_registry` - Push images to registry

**Token Creation**:
1. Go to GitLab → Settings → Access Tokens
2. Create Personal Access Token
3. Select scopes: `read_registry`, `write_registry`
4. Copy token (shown only once)
5. Add to GitHub Secrets

---

## Image Tagging Strategy

**Tag Format**:
```
registry.gitlab.com/{username}/sveltehr/{service}:{tag}
```

**Tags Applied**:
1. `latest` - Always points to most recent successful build
2. `sha-{commit}` - Git commit SHA (first 7 chars)

**Examples**:
```
registry.gitlab.com/john_doe/sveltehr/frontend:latest
registry.gitlab.com/john_doe/sveltehr/frontend:sha-abc1234
registry.gitlab.com/john_doe/sveltehr/backend:latest
registry.gitlab.com/john_doe/sveltehr/backend:sha-abc1234
```

**Usage in docker-compose.prod.yml**:
```yaml
services:
  frontend:
    image: registry.gitlab.com/${GITLAB_USERNAME}/sveltehr/frontend:${IMAGE_TAG}
```

---

## Rollback Contract

### Automatic Rollback Triggers

The pipeline does NOT automatically rollback. Instead:
- Failed deployments stop at the failing step
- Previous version continues running
- Manual rollback required

### Manual Rollback Procedure

**Via GitHub Actions**:
1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Select branch with working commit
4. Workflow runs with older commit SHA

**Via Server SSH**:
```bash
# SSH to server
ssh deploy@hr.example.com

# Set previous image tag
export IMAGE_TAG=sha-previous123

# Pull previous images
cd /opt/sveltehr
docker compose -f docker-compose.prod.yml pull

# Deploy previous version
docker compose -f docker-compose.prod.yml up -d --no-build

# Verify health
docker compose -f docker-compose.prod.yml ps
```

---

## Notification Contract

**Success Notification**:
- GitHub UI shows green checkmark
- Commit status updated
- GitHub environment deployment logged

**Failure Notification**:
- GitHub UI shows red X
- Commit status shows failure
- Failed step logs available
- Email notification (if configured in GitHub settings)

**Optional Slack Integration**:
```yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Production deployment failed for commit ${{ github.sha }}"
      }
```

---

## Performance Optimization

**Caching Strategy**:
- npm dependencies cached via `actions/setup-node` with `cache: 'npm'`
- cargo dependencies cached via `actions/cache`
- Docker layer cache via BuildKit GHA cache backend

**Parallel Execution**:
- Frontend and backend tests run in parallel
- Total pipeline time: ~15 minutes (vs ~35 minutes sequential)

**Resource Limits**:
- Each job timeout: 10-30 minutes
- Total workflow timeout: 45 minutes

---

## Error Handling

**Lint Failure**:
- Pipeline stops before tests
- No deployment
- Developer notified via commit status

**Test Failure**:
- Pipeline stops before build
- No images pushed
- Failed tests logged

**Build Failure**:
- Pipeline stops before deploy
- No images pushed to registry
- Build logs available

**Deploy Failure**:
- Previous version continues running
- Failed deployment logged
- Manual intervention required

**Health Check Failure**:
- Deployment marked as failed
- Services may be in mixed state
- Rollback procedure documented

---

## Monitoring & Observability

**Pipeline Metrics**:
- Job duration tracking
- Success/failure rate
- Deployment frequency

**Log Collection**:
- All job output captured in GitHub Actions UI
- Retained for 90 days (GitHub default)
- Can be exported to external logging

**Deployment History**:
- GitHub Environments track deployment history
- Commit SHA linked to each deployment
- Rollback reference available

---

## Security Best Practices

**Secret Management**:
- All secrets stored in GitHub Secrets (encrypted at rest)
- Secrets never logged or printed
- SSH keys rotated regularly

**Container Security**:
- Images scanned before deployment (optional, add Trivy)
- Non-root users in containers
- Minimal base images

**Network Security**:
- SSH with key-based auth only
- No password authentication
- Known hosts verification

---

## Validation Checklist

Before deploying workflow:

- [ ] All required secrets added to GitHub repository settings
- [ ] GitLab personal access token has correct scopes
- [ ] SSH key added to production server authorized_keys
- [ ] Production .env file base64 encoded correctly
- [ ] Deploy user has Docker permissions on server
- [ ] /opt/sveltehr directory exists with correct permissions
- [ ] Workflow YAML syntax valid (validate locally)
- [ ] Test on a staging branch first

---

## Contract Version

**Version**: 1.0.0
**Compatibility**: GitHub Actions
**Last Updated**: 2025-10-28

**Breaking Changes**:
- None (initial version)

**Deprecations**:
- None

**Future Changes**:
- v1.1.0: May add Trivy security scanning
- v1.2.0: May add automated rollback on health check failure
- v1.3.0: May add smoke tests post-deployment
