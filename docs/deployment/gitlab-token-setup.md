# GitLab Personal Access Token Setup

**Feature**: Production Docker Deployment with CI/CD and Caddy
**Version**: 1.0.0
**Date**: 2025-10-28

## Overview

This guide provides detailed instructions for creating a GitLab Personal Access Token that allows GitHub Actions to push Docker images to GitLab Container Registry.

## Why GitLab Container Registry?

**Benefits**:

- ✅ Free private container registry (unlimited storage for private projects)
- ✅ Integrated with GitLab CI/CD (but we're using GitHub Actions)
- ✅ No Docker Hub subscription required
- ✅ Fast push/pull speeds
- ✅ Built-in vulnerability scanning
- ✅ Automatic cleanup policies

## Required Token Scopes

Your GitLab Personal Access Token must have these scopes:

| Scope            | Permission                    | Why Required                               |
| ---------------- | ----------------------------- | ------------------------------------------ |
| `read_registry`  | Read (pull) container images  | Allows deployment server to pull images    |
| `write_registry` | Write (push) container images | Allows GitHub Actions to push built images |

**Note**: Do NOT grant additional scopes (principle of least privilege).

## Step-by-Step Token Creation

### Step 1: Access GitLab Token Settings

1. Log in to GitLab: https://gitlab.com
2. Click your **avatar** (top-right corner)
3. Select **Settings**
4. In the left sidebar, click **Access Tokens**

### Step 2: Create New Token

Click **Add new token** button.

### Step 3: Configure Token

**Token Settings**:

**Token name**:

```
github-actions-sveltehr
```

_Clear, descriptive name indicating usage_

**Expiration date**:

- **Recommended**: 1 year from today
- **Alternative**: No expiration (requires manual revocation)
- **Trade-off**: Longer expiration = less maintenance, shorter = more secure

**Select scopes**:

- ✅ `read_registry` - **REQUIRED**
- ✅ `write_registry` - **REQUIRED**
- ❌ All other scopes - **DO NOT SELECT**

### Step 4: Create and Save Token

1. Click **Create personal access token**
2. **CRITICAL**: Copy the token immediately - it's only shown once
3. Token format: `glpat-xxxxxxxxxxxxxxxxxxxxx` (starts with `glpat-`)

**Save the token securely**:

```bash
# Save to encrypted file
echo "glpat-xxxxxxxxxxxxxxxxxxxxx" > gitlab-token.txt
chmod 600 gitlab-token.txt

# Or use password manager (recommended)
```

⚠️ **WARNING**: If you lose this token, you cannot retrieve it. You'll need to create a new one.

## Step 5: Add Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the token:
   - **Name**: `GITLAB_TOKEN`
   - **Secret**: `glpat-xxxxxxxxxxxxxxxxxxxxx` (your actual token)
5. Click **Add secret**

## Verify Token Works

### Test 1: Manual Docker Login

```bash
# Login to GitLab Container Registry
echo "glpat-xxxxxxxxxxxxxxxxxxxxx" | docker login registry.gitlab.com -u your_username --password-stdin

# Expected output:
# Login Succeeded
```

### Test 2: Push Test Image

```bash
# Tag a test image
docker tag alpine:latest registry.gitlab.com/your_username/sveltehr/test:latest

# Push test image
docker push registry.gitlab.com/your_username/sveltehr/test:latest

# Expected output:
# latest: digest: sha256:xxxxx size: 1234
```

### Test 3: Pull Test Image

```bash
# Pull the test image
docker pull registry.gitlab.com/your_username/sveltehr/test:latest

# Expected output:
# Status: Downloaded newer image for registry.gitlab.com/your_username/sveltehr/test:latest
```

### Test 4: GitHub Actions Workflow

**Trigger the workflow**:

1. Push commit to `main` branch
2. Watch GitHub Actions → **Deploy to Production**
3. Check **Build and Push Images** job
4. Look for: "Login to GitLab Container Registry" step
5. Should show: `✓ Login succeeded`

## Token Security Best Practices

### 1. Never Commit Tokens to Git

```bash
# Add to .gitignore
echo "gitlab-token.txt" >> .gitignore
echo ".env*" >> .gitignore
```

### 2. Use Token Only in GitHub Secrets

- ✅ Store in GitHub Secrets (encrypted at rest)
- ❌ Do NOT hardcode in workflow files
- ❌ Do NOT share in plain text

### 3. Token Rotation Schedule

**Recommended**: Rotate tokens every **90 days**

**Rotation Process**:

1. Create new token with same scopes
2. Update GitHub Secret `GITLAB_TOKEN`
3. Test deployment
4. Revoke old token in GitLab

### 4. Monitor Token Usage

**GitLab Audit Log**:

1. Go to GitLab → **Settings** → **Access Tokens**
2. View **Active** tab
3. Check **Last Used** timestamp
4. Revoke any unused tokens

### 5. Limit Token Scope

- ✅ Only `read_registry` + `write_registry`
- ❌ Do NOT grant `api`, `read_api`, `write_repository`, etc.

## Troubleshooting

### Issue: "Authentication Required" Error

**Symptoms**:

```
Error: failed to authorize: failed to fetch oauth token: unexpected status: 401 Unauthorized
```

**Solutions**:

1. **Verify token is correct**:

   ```bash
   # Test token manually
   curl -H "PRIVATE-TOKEN: glpat-xxxxx" https://gitlab.com/api/v4/user
   # Should return user info
   ```

2. **Check token hasn't expired**:
   - Go to GitLab → Settings → Access Tokens
   - Check **Expiration** date
   - Create new token if expired

3. **Verify token has correct scopes**:
   - Token must have `read_registry` AND `write_registry`
   - Revoke and recreate with correct scopes if needed

### Issue: "Repository Not Found" Error

**Symptoms**:

```
Error: denied: requested access to the resource is denied
```

**Solutions**:

1. **Verify GitLab username in GitHub Secret**:
   - Check `GITLAB_USERNAME` matches your GitLab username exactly
   - Case-sensitive!

2. **Check image path format**:

   ```
   Correct: registry.gitlab.com/username/sveltehr/frontend:latest
   Wrong: registry.gitlab.com/username/frontend:latest
   ```

3. **Ensure GitLab project exists**:
   - Go to GitLab
   - Navigate to your profile
   - Create project named `sveltehr` if it doesn't exist
   - Project visibility: Private (recommended)

### Issue: "Rate Limit Exceeded" Error

**Symptoms**:

```
Error: toomanyrequests: You have reached your pull rate limit
```

**Solution**: This shouldn't happen with GitLab (no rate limits for authenticated users). If you see this:

1. Verify you're using `registry.gitlab.com` (not Docker Hub)
2. Check token is being used for authentication
3. Verify `docker login` succeeds before push

### Issue: Token Leaked in Logs

**If token is accidentally exposed**:

1. **Immediately revoke token** in GitLab:
   - Settings → Access Tokens → Revoke

2. **Create new token** with different value

3. **Update GitHub Secret** with new token

4. **Check for commits containing token**:

   ```bash
   git log -S "glpat-" --all
   ```

5. **If token in commit history**:
   - Use `git filter-branch` or BFG Repo-Cleaner
   - Force push to all branches
   - Contact GitHub support if public repository

## GitLab Container Registry Features

### View Pushed Images

1. Go to GitLab project: `https://gitlab.com/your_username/sveltehr`
2. Click **Deploy** → **Container Registry**
3. View images:
   - `frontend:latest`
   - `frontend:sha-abc1234`
   - `backend:latest`
   - `backend:sha-abc1234`

### Cleanup Policies

**Automatic image cleanup** (recommended):

1. Go to project → **Settings** → **Packages and registries**
2. Expand **Container Registry**
3. Configure cleanup policy:
   - **Expiration interval**: 90 days
   - **Keep tags matching**: `latest` (keep forever)
   - **Remove tags matching**: `sha-*` (cleanup old)
   - **Keep most recent**: 10 tags

### Vulnerability Scanning

GitLab automatically scans images for vulnerabilities:

1. Go to project → **Security & Compliance** → **Vulnerability Report**
2. View detected vulnerabilities in images
3. Update base images to fix vulnerabilities

## Alternative: Deploy Token (Advanced)

For production deployments, consider using **Deploy Tokens** instead of Personal Access Tokens:

**Benefits**:

- Not tied to user account
- Can be scoped to single project
- Easier to rotate without affecting other projects

**Instructions**:

1. Go to GitLab project → **Settings** → **Repository**
2. Expand **Deploy tokens**
3. Create token:
   - Name: `github-actions-deploy`
   - Scopes: `read_registry`, `write_registry`
4. Use token instead of Personal Access Token

## Security Checklist

Before going to production:

- [ ] Token has only required scopes (`read_registry`, `write_registry`)
- [ ] Token is stored in GitHub Secrets (encrypted)
- [ ] Token is NOT hardcoded in any files
- [ ] Token is NOT committed to git history
- [ ] Token expiration date is set (90-365 days)
- [ ] Token rotation schedule is documented
- [ ] Audit log monitoring is enabled
- [ ] Deploy user has tested token authentication
- [ ] Cleanup policies are configured in GitLab

## References

- GitLab Personal Access Tokens: https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html
- GitLab Container Registry: https://docs.gitlab.com/ee/user/packages/container_registry/
- Deploy Tokens: https://docs.gitlab.com/ee/user/project/deploy_tokens/
- Docker Login: https://docs.docker.com/engine/reference/commandline/login/
