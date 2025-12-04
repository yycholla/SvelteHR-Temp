# Container Registry Integration Guide

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This guide explains the GitLab Container Registry integration for SvelteHR production deployments. The CI/CD pipeline automatically builds, tags, and pushes Docker images to GitLab Container Registry, which production servers pull during deployment.

## Why GitLab Container Registry?

**Benefits over Docker Hub**:

- ✅ **Free private container registry** with unlimited storage for private projects
- ✅ **No rate limits** for authenticated pulls (Docker Hub limits: 200 pulls/6h for free tier)
- ✅ **Integrated with GitLab CI/CD** (but we use GitHub Actions)
- ✅ **Fast push/pull speeds** with global CDN
- ✅ **Built-in vulnerability scanning** for security analysis
- ✅ **Automatic cleanup policies** to manage storage
- ✅ **Versioned images** with tag management

**Comparison**:

| Feature                | GitLab Container Registry | Docker Hub (Free) | Docker Hub (Pro) |
| ---------------------- | ------------------------- | ----------------- | ---------------- |
| Private repos          | Unlimited                 | 1                 | Unlimited        |
| Pull rate limit        | None (authenticated)      | 200/6h            | 5,000/day        |
| Storage                | Unlimited                 | 500MB             | Unlimited        |
| Vulnerability scanning | ✅ Built-in               | ❌                | ✅               |
| Cost                   | Free                      | Free              | $5/month         |

## Registry URL Format

### Image Naming Convention

**Format**:

```
registry.gitlab.com/{username}/{project}/{service}:{tag}
```

**Components**:

- `registry.gitlab.com` - GitLab Container Registry host
- `{username}` - Your GitLab username (from `GITLAB_USERNAME` secret)
- `{project}` - Project name (default: `sveltehr`)
- `{service}` - Service name (`frontend` or `backend`)
- `{tag}` - Image tag (`latest` or `sha-{commit}`)

### SvelteHR Image URLs

**Frontend**:

```
registry.gitlab.com/your_username/sveltehr/frontend:latest
registry.gitlab.com/your_username/sveltehr/frontend:sha-abc1234567
```

**Backend**:

```
registry.gitlab.com/your_username/sveltehr/backend:latest
registry.gitlab.com/your_username/sveltehr/backend:sha-abc1234567
```

### Environment Variable Configuration

**In `.env` file**:

```bash
# GitLab Container Registry Configuration
GITLAB_REGISTRY=registry.gitlab.com
GITLAB_PROJECT=your_username/sveltehr
IMAGE_TAG=latest  # or sha-abc1234567 for specific version
```

**In `docker-compose.prod.yml`**:

```yaml
services:
  frontend:
    image: ${GITLAB_REGISTRY:-registry.gitlab.com}/${GITLAB_PROJECT}/frontend:${IMAGE_TAG:-latest}

  hr-graphql-rust:
    image: ${GITLAB_REGISTRY:-registry.gitlab.com}/${GITLAB_PROJECT}/backend:${IMAGE_TAG:-latest}
```

**Default behavior** (when variables not set):

- Registry: `registry.gitlab.com`
- Tag: `latest`

## Image Tagging Strategy

### Dual-Tagging System

Every CI/CD build creates **two tags** for each image:

**1. `latest` tag** - Always points to most recent build

```
registry.gitlab.com/username/sveltehr/frontend:latest
```

- Use in production for automatic updates
- Overwritten on every deployment
- Simple but no version control

**2. `sha-{commit}` tag** - Immutable version tied to git commit

```
registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567
```

- Permanent, never overwritten
- Enables precise rollbacks
- Traceable to source code commit

### Tag Examples

**After commit `abc1234567`**:

Frontend images:

- `registry.gitlab.com/username/sveltehr/frontend:latest`
- `registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567`

Backend images:

- `registry.gitlab.com/username/sveltehr/backend:latest`
- `registry.gitlab.com/username/sveltehr/backend:sha-abc1234567`

**After commit `def7890abc`** (later):

Frontend images:

- `registry.gitlab.com/username/sveltehr/frontend:latest` ← **updated**
- `registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567` ← still exists
- `registry.gitlab.com/username/sveltehr/frontend:sha-def7890abc` ← **new**

## CI/CD Image Build and Push

### GitHub Actions Workflow

**Workflow file**: `.github/workflows/deploy-production.yml`

**Build and Push job**:

```yaml
build-push:
  needs: [test-frontend, test-backend]
  runs-on: ubuntu-latest

  steps:
    - uses: docker/setup-buildx-action@v3

    - uses: docker/login-action@v3
      with:
        registry: registry.gitlab.com
        username: ${{ secrets.GITLAB_USERNAME }}
        password: ${{ secrets.GITLAB_TOKEN }}

    - uses: docker/metadata-action@v5
      id: meta-frontend
      with:
        images: registry.gitlab.com/${{ secrets.GITLAB_USERNAME }}/sveltehr/frontend
        tags: |
          type=raw,value=latest
          type=sha,prefix=sha-

    - uses: docker/build-push-action@v5
      with:
        context: .
        file: ./Dockerfile
        push: true
        tags: ${{ steps.meta-frontend.outputs.tags }}
        target: production
```

### Build Process

**Stages**:

1. **Checkout code** from GitHub repository
2. **Setup Docker Buildx** for advanced builds
3. **Login to GitLab registry** using `GITLAB_TOKEN`
4. **Extract metadata** with `docker/metadata-action`
   - Generates `latest` tag
   - Generates `sha-{commit}` tag
5. **Build multi-stage Docker image** with BuildKit
6. **Push both tags** to GitLab Container Registry
7. **Cache layers** for faster subsequent builds

**Build optimization**:

- **BuildKit cache** (GitHub Actions cache)
- **Multi-stage builds** (separate build and runtime stages)
- **Layer caching** for dependencies
- **Parallel builds** for frontend and backend

### Viewing Build Logs

**In GitHub Actions**:

1. Go to repository → **Actions**
2. Select **Deploy to Production** workflow
3. Click on latest run
4. Expand **Build and Push Images** job
5. View logs for:
   - `Build and push frontend`
   - `Build and push backend`

**Expected output**:

```
#18 exporting to image
#18 pushing layers
#18 pushing manifest for registry.gitlab.com/username/sveltehr/frontend:latest
#18 pushing manifest for registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567
#18 DONE 15.2s
```

## Viewing Images in GitLab

### Navigate to Container Registry

1. Go to GitLab: https://gitlab.com
2. Navigate to your project: `https://gitlab.com/your_username/sveltehr`
3. Click **Deploy** → **Container Registry** in left sidebar

### Registry Interface

**You should see**:

**Frontend Images**:

- Repository: `sveltehr/frontend`
- Tags: `latest`, `sha-abc1234`, `sha-def7890`, etc.
- Size: ~150-200 MB per tag
- Pushed: Timestamp of last push

**Backend Images**:

- Repository: `sveltehr/backend`
- Tags: `latest`, `sha-abc1234`, `sha-def7890`, etc.
- Size: ~80-120 MB per tag
- Pushed: Timestamp of last push

### Image Details

**Click on any tag** to see:

- **Digest**: SHA256 hash of image
- **Size**: Compressed and uncompressed size
- **Created**: Build timestamp
- **Layers**: Individual layer sizes
- **Vulnerabilities**: Security scan results (if enabled)

### Delete Old Images

**Manual deletion**:

1. Navigate to Container Registry
2. Select image tag (e.g., `sha-old1234`)
3. Click trash icon → Confirm deletion

**Automated cleanup** (see Cleanup Policies section below)

## Pulling Images from Registry

### Authentication

**Login to GitLab Container Registry**:

```bash
# Using GitLab Personal Access Token
echo "$GITLAB_TOKEN" | docker login registry.gitlab.com -u your_username --password-stdin

# Expected output:
# Login Succeeded
```

**Production server authentication**:

- GitHub Actions uses `GITLAB_TOKEN` secret
- Deployment job authenticates before pulling
- Production server pulls authenticated images

### Manual Pull

**Pull latest version**:

```bash
docker pull registry.gitlab.com/your_username/sveltehr/frontend:latest
docker pull registry.gitlab.com/your_username/sveltehr/backend:latest
```

**Pull specific version**:

```bash
docker pull registry.gitlab.com/your_username/sveltehr/frontend:sha-abc1234567
docker pull registry.gitlab.com/your_username/sveltehr/backend:sha-abc1234567
```

### Deployment Pull

**In production deployment**:

```bash
# Set IMAGE_TAG environment variable
export IMAGE_TAG=sha-abc1234567

# Pull images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d
```

**What happens**:

1. Docker Compose reads `IMAGE_TAG` from environment
2. Substitutes into image names in `docker-compose.prod.yml`
3. Pulls images from GitLab Container Registry
4. Starts containers with pulled images

## Image Versioning and Rollback

### Current Version Tracking

**Check currently deployed version**:

```bash
# On production server
docker inspect sveltehr-frontend-prod --format='{{.Config.Image}}'
# Output: registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567

docker inspect sveltehr-graphql-rust-prod --format='{{.Config.Image}}'
# Output: registry.gitlab.com/username/sveltehr/backend:sha-abc1234567
```

**Get commit SHA from tag**:

```bash
# Extract commit SHA from image tag
FRONTEND_SHA=$(docker inspect sveltehr-frontend-prod --format='{{.Config.Image}}' | grep -oP 'sha-\K[a-f0-9]+')
echo $FRONTEND_SHA
# Output: abc1234567

# View commit in GitHub
# https://github.com/your_org/sveltehr/commit/abc1234567
```

### Rollback to Previous Version

**See**: `docs/deployment/rollback.md` for detailed rollback procedures

**Quick rollback**:

```bash
# 1. Find previous working version
docker images | grep sveltehr

# 2. Update .env with previous IMAGE_TAG
echo "IMAGE_TAG=sha-previous123" > .env

# 3. Redeploy
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-build

# 4. Verify
docker compose -f docker-compose.prod.yml ps
```

## Cleanup Policies

### Automatic Image Cleanup

**Configure in GitLab**:

1. Go to project → **Settings** → **Packages and registries**
2. Expand **Container Registry**
3. Click **Set cleanup policy**

**Recommended policy**:

```yaml
Enabled: Yes
Expiration interval: 90 days
Keep tags matching: latest
Remove tags matching: sha-*
Keep most recent: 10 tags
```

**What this does**:

- ✅ Keeps `latest` tag forever
- ✅ Keeps 10 most recent `sha-*` tags
- ✅ Deletes `sha-*` tags older than 90 days
- ✅ Runs cleanup automatically every day

**Benefits**:

- Saves storage space
- Keeps recent versions for rollback
- Prevents registry clutter
- Automatic maintenance (no manual cleanup)

### Manual Cleanup

**Delete specific tag**:

```bash
# Using GitLab API
curl --request DELETE \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/your_project_id/registry/repositories/repo_id/tags/sha-old1234"
```

**Clean local Docker cache**:

```bash
# Remove old local images
docker image prune -af --filter "until=72h"

# Remove specific image
docker rmi registry.gitlab.com/username/sveltehr/frontend:sha-old1234
```

## Security and Access Control

### GitLab Personal Access Token

**Token requirements**:

- **Scopes**: `read_registry`, `write_registry`
- **Expiration**: 90-365 days (or no expiration)
- **Name**: `github-actions-sveltehr` (descriptive)

**See**: `docs/deployment/gitlab-token-setup.md` for detailed token creation

### Registry Permissions

**Private registry** (recommended):

- Only accessible with authentication
- Requires GitLab account with project access
- GitHub Actions uses token for push
- Production server uses token for pull

**Public registry** (not recommended):

- Anyone can pull images
- Still requires authentication for push
- Exposes your application images publicly

### Token Rotation

**Recommended schedule**: Every 90 days

**Rotation process**:

1. Create new GitLab Personal Access Token
2. Update `GITLAB_TOKEN` in GitHub Secrets
3. Test CI/CD pipeline
4. Revoke old token in GitLab

**See**: `docs/deployment/gitlab-token-setup.md` → Token Rotation

## Troubleshooting

### Issue: Authentication Failed

**Symptoms**:

```
Error: failed to authorize: failed to fetch oauth token
```

**Solutions**:

1. Verify `GITLAB_TOKEN` is valid and not expired
2. Check token has `read_registry` and `write_registry` scopes
3. Verify `GITLAB_USERNAME` matches your GitLab username
4. Test authentication manually:
   ```bash
   echo "$GITLAB_TOKEN" | docker login registry.gitlab.com -u your_username --password-stdin
   ```

### Issue: Image Not Found

**Symptoms**:

```
Error: manifest for registry.gitlab.com/username/sveltehr/frontend:latest not found
```

**Solutions**:

1. Verify image was pushed successfully in GitHub Actions logs
2. Check GitLab Container Registry for image existence
3. Ensure `GITLAB_PROJECT` environment variable is correct:
   ```bash
   echo $GITLAB_PROJECT
   # Should be: your_username/sveltehr
   ```
4. Verify tag exists:
   ```bash
   docker manifest inspect registry.gitlab.com/username/sveltehr/frontend:latest
   ```

### Issue: Rate Limit Exceeded

**Symptoms**:

```
Error: toomanyrequests: You have reached your pull rate limit
```

**This should NOT happen with GitLab** (no rate limits for authenticated users).

If you see this error:

1. Verify you're using `registry.gitlab.com` (not Docker Hub)
2. Check authentication is working
3. Ensure `docker login` succeeded

### Issue: Build Failed in CI/CD

**Symptoms**:

```
Error: failed to solve: failed to push
```

**Solutions**:

1. Check GitHub Actions logs for specific error
2. Verify `GITLAB_TOKEN` secret is set correctly
3. Check GitLab project exists at correct path
4. Verify Docker build completes successfully:
   ```bash
   docker build -f Dockerfile --target production -t test .
   ```

## Monitoring and Metrics

### Registry Storage Usage

**View in GitLab**:

1. Go to project → **Settings** → **Packages and registries**
2. View **Storage used**

**Check via API**:

```bash
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "https://gitlab.com/api/v4/projects/your_project_id/registry/repositories"
```

### Pull Statistics

**Track image pulls**:

- GitLab does not provide pull statistics for Container Registry
- Monitor via deployment logs
- Track via production server metrics

### Vulnerability Scanning

**View security scan results**:

1. Go to GitLab project → **Security & Compliance**
2. View **Vulnerability Report**
3. Check for detected CVEs in images

**Update vulnerable dependencies**:

1. Update base images in Dockerfiles
2. Rebuild images via CI/CD
3. Redeploy to production

## Best Practices

### 1. Always Use Specific Tags in Production

**❌ Bad** (using `latest`):

```yaml
image: registry.gitlab.com/username/sveltehr/frontend:latest
```

**✅ Good** (using commit SHA):

```yaml
image: registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567
```

**Why**: Enables precise rollbacks and version tracking

### 2. Keep Recent Tags for Rollback

Configure cleanup policy to keep 10-20 recent `sha-*` tags:

- Allows rollback to recent versions
- Prevents accidental deletion of recent images
- Balances storage usage vs rollback capability

### 3. Monitor Registry Storage

- Set up GitLab notifications for storage usage
- Implement cleanup policies to prevent unbounded growth
- Review and delete very old images manually if needed

### 4. Secure Token Management

- Rotate tokens every 90 days
- Use minimal scopes (`read_registry`, `write_registry` only)
- Store tokens only in GitHub Secrets (encrypted)
- Never commit tokens to source code

### 5. Test Image Pulls Locally

Before deploying:

```bash
# Pull image locally to verify it exists
docker pull registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567

# Test image works
docker run -it registry.gitlab.com/username/sveltehr/frontend:sha-abc1234567
```

## Additional Resources

- **GitLab Container Registry Docs**: https://docs.gitlab.com/ee/user/packages/container_registry/
- **GitLab Personal Access Tokens**: https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html
- **Docker Login**: https://docs.docker.com/engine/reference/commandline/login/
- **Rollback Procedures**: `docs/deployment/rollback.md`
- **GitHub Secrets Setup**: `docs/deployment/github-secrets.md`
- **GitLab Token Setup**: `docs/deployment/gitlab-token-setup.md`
