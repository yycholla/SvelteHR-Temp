# Semantic Versioning & Release Workflow

## Overview

SvelteHR uses **semantic versioning** (e.g., `1.2.3`, `0.0.100`) for production releases. Docker images are automatically built and tagged when version tags are pushed to the repository.

## Version Format

- ✅ **Clean semver**: `1.2.3` (no "v" prefix)
- ✅ **Multi-digit support**: `0.0.100`, `1.20.300`
- ❌ **No pre-release tags**: Beta/alpha suffixes not supported currently

## Build Triggers

Docker builds **only** run for:

1. **Push to `main` branch** → Creates `latest` tag
2. **Semantic version tags** (e.g., `1.2.3`) → Creates versioned images

Builds **do NOT** run for:
- ❌ Pull requests
- ❌ Other branches (develop, feature branches)
- ❌ Non-semantic tags

## Creating a Release

### Option 1: Using the Release Script (Recommended)

```bash
# Bump patch version (1.2.3 -> 1.2.4)
./scripts/release.sh patch

# Bump minor version (1.2.3 -> 1.3.0)
./scripts/release.sh minor

# Bump major version (1.2.3 -> 2.0.0)
./scripts/release.sh major

# Create specific version
./scripts/release.sh 1.5.0

# Multi-digit versions work too
./scripts/release.sh 0.0.100
```

The script will:
1. Show recent commits since last release
2. Ask for confirmation
3. Create and push the tag
4. Trigger Docker builds automatically

### Option 2: Using GitHub CLI

```bash
# Trigger the release workflow
gh workflow run release.yml -f version=1.2.3

# Or auto-bump
gh workflow run release.yml -f bump=patch
```

### Option 3: Manual Git Tags

```bash
# Create and push tag manually
git tag 1.2.3
git push origin 1.2.3
```

## What Happens After Tagging

1. **Docker Build Workflow** triggers automatically
2. **Images are built** and pushed to GHCR:
   - `ghcr.io/mountain-care-rx/sveltehr/backend-server:1.2.3`
   - `ghcr.io/mountain-care-rx/sveltehr/backend-server:1.2`
   - `ghcr.io/mountain-care-rx/sveltehr/backend-server:1`
   - `ghcr.io/mountain-care-rx/sveltehr/frontend:1.2.3`
   - `ghcr.io/mountain-care-rx/sveltehr/frontend:1.2`
   - `ghcr.io/mountain-care-rx/sveltehr/frontend:1`
3. **Your Helm update workflow** detects new images
4. **ArgoCD** deploys the new version

## Version Tag Strategy

When you push tag `1.2.3`, the following image tags are created:

- `1.2.3` - Exact version (pinned)
- `1.2` - Minor version (receives patch updates)
- `1` - Major version (receives minor + patch updates)
- `latest` - Latest stable release (only from main branch)

## Development vs Production

### Development (main branch pushes)
- Trigger: Push to `main`
- Image tag: `latest`
- Use case: Continuous deployment to dev environment

### Production (version tags)
- Trigger: Push version tag (e.g., `1.2.3`)
- Image tags: `1.2.3`, `1.2`, `1`, `latest`
- Use case: Stable releases for production

## Monitoring Builds

```bash
# Watch the current workflow run
gh run watch

# List recent workflow runs
gh run list --workflow=docker-build.yml

# View specific run logs
gh run view <run-id> --log
```

## Rollback

To rollback to a previous version:

```bash
# Option 1: Update Helm values manually
# Edit k8s/helm-charts/sveltehr/values-prod.yaml
backend:
  image:
    tag: "1.2.2"  # Previous version

# Option 2: Use ArgoCD CLI
argocd app set sveltehr-prod --helm-set backend.image.tag=1.2.2

# Option 3: Re-tag and push
git tag -f 1.2.3 <previous-commit-sha>
git push origin 1.2.3 --force
```

## Best Practices

1. **Always tag from `main`** - Ensure code is merged before tagging
2. **Use semantic versioning** - Follow semver conventions:
   - `MAJOR`: Breaking changes
   - `MINOR`: New features (backward compatible)
   - `PATCH`: Bug fixes
3. **Write good commit messages** - They appear in release notes
4. **Test before tagging** - Ensure CI passes on main
5. **Document breaking changes** - Update migration guides

## Examples

### Typical Release Flow

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Verify CI is passing
gh run list --branch main --limit 1

# 3. Create release
./scripts/release.sh patch

# 4. Monitor build
gh run watch

# 5. Verify images
docker pull ghcr.io/mountain-care-rx/sveltehr/frontend:1.2.3
```

### Versioning Scenarios

```bash
# Initial release
./scripts/release.sh 0.1.0

# Bug fix
./scripts/release.sh patch  # 0.1.0 -> 0.1.1

# New feature
./scripts/release.sh minor  # 0.1.1 -> 0.2.0

# Breaking change
./scripts/release.sh major  # 0.2.0 -> 1.0.0

# Specific version (pre-1.0 development)
./scripts/release.sh 0.0.100  # Multi-digit patch number
```

## Troubleshooting

### Build Failed After Tagging

```bash
# Check workflow run
gh run list --workflow=docker-build.yml --limit 5

# View logs
gh run view <run-id> --log-failed

# Re-trigger build (if it was a transient failure)
gh workflow run docker-build.yml
```

### Tag Already Exists

```bash
# Delete local tag
git tag -d 1.2.3

# Delete remote tag (careful!)
git push origin :refs/tags/1.2.3

# Create new tag
git tag 1.2.3
git push origin 1.2.3
```

### Wrong Version Tagged

```bash
# Delete the wrong tag
git push origin :refs/tags/1.2.3

# Create correct tag
./scripts/release.sh 1.2.4
```

## CI/CD Pipeline

```
┌─────────────────┐
│  Push to main   │ ──┐
└─────────────────┘   │
                      ├──> Docker Build ──> ghcr.io (latest)
┌─────────────────┐   │
│  Push tag 1.2.3 │ ──┘
└─────────────────┘
         │
         ├──> Docker Build ──> ghcr.io (1.2.3, 1.2, 1, latest)
         │
         └──> GitHub Release
                    │
                    ├──> Your Helm Update Workflow
                    │
                    └──> ArgoCD Sync ──> Kubernetes
```
