# Helm Chart Migration Progress

## Overview
Converting SvelteHR from Kustomize to complete Helm chart with container optimizations and dependency management.

**Target:** Helm Chart v2.0.0 with multi-target Docker builds, Helm dependencies, and GitOps-ready configuration

---

## ✅ Phase 1: Chart Dependencies (COMPLETE)

### Updated Files:
1. `k8s/helm-charts/sveltehr/Chart.yaml`
   - ✅ Bumped to v2.0.0
   - ✅ Added CloudNativePG dependency (v0.18.2)
   - ✅ Added Bitnami Redis dependency (v18.6.1)
   - ✅ Added metadata annotations for features

---

## ✅ Phase 2: Core Templates (COMPLETE)

### New Templates Created:
1. ✅ `k8s/helm-charts/sveltehr/templates/postgres-cluster.yaml`
   - CloudNativePG Cluster resource
   - Support for dev (1 instance) and prod (3 instances HA)
   - Configurable storage, backup, monitoring
   - Auto-generated secrets for app user and superuser

2. ✅ `k8s/helm-charts/sveltehr/templates/migration-job.yaml`
   - **Helm pre-install/pre-upgrade hook**
   - Uses migration container image (multi-target build)
   - Init container waits for PostgreSQL
   - Proper error handling and logging

3. ✅ `k8s/helm-charts/sveltehr/templates/seed-job.yaml`
   - Helm test hook (manual execution)
   - Uses seed container image (multi-target build)
   - Creates initial admin user
   - Idempotent (safe to run multiple times)

---

## ⏳ Phase 3: Apply Container Optimizations (IN PROGRESS)

### Remaining Tasks:

#### 3.1 Update Backend Deployment
**File:** `k8s/helm-charts/sveltehr/templates/backend-deployment.yaml`

**Changes Needed:**
```yaml
# Update image reference
image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"

# Simplify command (no entrypoint script)
command: ["/bin/sh", "-c"]
args:
  - |
    export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    exec ./hr-graphql-server
```

#### 3.2 Update Frontend Deployment
**File:** `k8s/helm-charts/sveltehr/templates/frontend-deployment.yaml`

**Changes Needed:**
- Add BuildKit annotations
- Support for dev (port 5173) vs prod (port 3000)
- Document cache benefits

#### 3.3 Create RBAC Template
**New File:** `k8s/helm-charts/sveltehr/templates/rbac.yaml`

- Template from `k8s/base/rbac.yaml`
- Add conditional rendering with `rbac.enabled`

#### 3.4 Update _helpers.tpl
**File:** `k8s/helm-charts/sveltehr/templates/_helpers.tpl`

**Add Helpers:**
- Database connection string
- Image pull secrets
- Common environment variables

---

## ⏳ Phase 4: Values Files (IN PROGRESS)

### 4.1 Complete values-dev.yaml

**Sections to Add:**
```yaml
global:
  namespace: sveltehr-dev
  environment: development

# PostgreSQL configuration
postgresql:
  enabled: true
  instances: 1
  storage:
    size: 5Gi
    storageClass: local-path
  database: hr_system
  username: hr_user
  password: "dev-password"  # Override with External Secrets in prod
  backup:
    enabled: false

# Redis configuration
redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: false  # Disabled for dev
  master:
    persistence:
      size: 1Gi

# Backend configuration
backend:
  replicaCount: 1
  image:
    repository: ghcr.io/mountain-care-rx/sveltehr/backend-server
    tag: latest
    pullPolicy: IfNotPresent
  resources:
    requests:
      memory: 128Mi
      cpu: 100m
    limits:
      memory: 256Mi
      cpu: 200m

# Frontend configuration
frontend:
  replicaCount: 1
  service:
    port: 5173  # Vite dev server
  image:
    repository: ghcr.io/mountain-care-rx/sveltehr/frontend
    tag: latest
    pullPolicy: IfNotPresent
  resources:
    requests:
      memory: 64Mi
      cpu: 50m
    limits:
      memory: 128Mi
      cpu: 100m

# Migration job configuration
migration:
  enabled: true
  image:
    repository: ghcr.io/mountain-care-rx/sveltehr/backend-migration
    tag: latest
    pullPolicy: IfNotPresent
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  resources:
    requests:
      memory: 64Mi
      cpu: 50m
    limits:
      memory: 128Mi
      cpu: 200m

# Seed job configuration
seed:
  enabled: false  # Manual execution only
  image:
    repository: ghcr.io/mountain-care-rx/sveltehr/backend-seed
    tag: latest
  adminEmail: "admin@example.com"
  adminPassword: "admin"  # Change in production
```

### 4.2 Complete values-prod.yaml

**Production Overrides:**
```yaml
global:
  namespace: sveltehr-prod
  environment: production

postgresql:
  instances: 3  # High availability
  storage:
    size: 100Gi
    storageClass: fast-ssd
  backup:
    enabled: true
    destinationPath: "s3://sveltehr-backups/"
    retentionPolicy: "30d"
    schedule: "0 2 * * *"

redis:
  architecture: replication
  replica:
    replicaCount: 3
  sentinel:
    enabled: true
    quorum: 2
  auth:
    enabled: true
    password: ""  # From Doppler External Secrets

backend:
  replicaCount: 3
  resources:
    requests:
      memory: 512Mi
      cpu: 250m
    limits:
      memory: 1Gi
      cpu: 500m

frontend:
  replicaCount: 2
  service:
    port: 3000  # Production build
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 200m

externalSecrets:
  enabled: true
  doppler:
    project: "sveltehr"
    config: "prod"
    serviceToken: "dp.st.prod...."

ingress:
  enabled: true
  host: "hr.yycholla.com"
  tls:
    enabled: true

podDisruptionBudget:
  enabled: true
  minAvailable: 1
```

---

## ⏳ Phase 5-8: Scripts and Workflows (PENDING)

### Remaining Files to Update:

1. **Build Script:**
   - `k8s/scripts/build-and-push-local.sh` → `build-and-push.sh`
   - Add GHCR authentication
   - Update image naming for multi-target builds

2. **Deployment Script:**
   - `k8s/deploy.sh`
   - Replace Kustomize with Helm commands
   - Add dependency update step

3. **GitHub Actions:**
   - `.github/workflows/docker-build.yml`
   - Update registry to GHCR
   - Add proper image tags

4. **ArgoCD:**
   - `k8s/argocd/sveltehr-application.yaml`
   - Update values file paths
   - Create dev Application manifest

---

## 📊 Progress Summary

| Phase | Status | Completion |
|-------|--------|-----------|
| Phase 1: Chart Dependencies | ✅ Complete | 100% |
| Phase 2: Core Templates | ✅ Complete | 100% |
| Phase 3: Container Optimizations | ⏳ In Progress | 20% |
| Phase 4: Values Files | ⏳ In Progress | 0% |
| Phase 5: Build Scripts | ⏳ Pending | 0% |
| Phase 6: GitHub Actions | ⏳ Pending | 0% |
| Phase 7: ArgoCD | ⏳ Pending | 0% |
| Phase 8: Deploy Script | ⏳ Pending | 0% |
| **Overall** | **⏳ In Progress** | **40%** |

---

## 🎯 Next Steps

### Immediate Actions Needed:

1. **Complete Phase 3:**
   - Update backend/frontend deployment templates
   - Create RBAC template
   - Enhance _helpers.tpl

2. **Complete Phase 4:**
   - Finish values-dev.yaml
   - Finish values-prod.yaml

3. **Test Dependency Management:**
   ```bash
   cd k8s/helm-charts/sveltehr
   helm dependency update
   helm dependency list
   ```

4. **Dry-Run Deployment:**
   ```bash
   helm install sveltehr . \
     --namespace sveltehr-dev \
     --create-namespace \
     --values values-dev.yaml \
     --dry-run --debug
   ```

---

## 🚀 Testing Checklist (After Completion)

- [ ] Helm dependency update works
- [ ] Dry-run passes without errors
- [ ] PostgreSQL cluster created with correct instances
- [ ] Redis installed via Bitnami chart
- [ ] Migration job runs as pre-install hook
- [ ] Backend deployment uses server image
- [ ] Frontend deployment works
- [ ] All secrets created properly
- [ ] Service endpoints accessible
- [ ] ArgoCD sync succeeds

---

## 📝 Files Created So Far

### New Files (4):
1. ✅ `k8s/helm-charts/sveltehr/templates/postgres-cluster.yaml`
2. ✅ `k8s/helm-charts/sveltehr/templates/migration-job.yaml`
3. ✅ `k8s/helm-charts/sveltehr/templates/seed-job.yaml`
4. ✅ `HELM-MIGRATION-PROGRESS.md` (this file)

### Modified Files (1):
1. ✅ `k8s/helm-charts/sveltehr/Chart.yaml`

### Files Still to Create/Modify (11):
1. ⏳ `k8s/helm-charts/sveltehr/templates/rbac.yaml`
2. ⏳ `k8s/helm-charts/sveltehr/templates/_helpers.tpl`
3. ⏳ `k8s/helm-charts/sveltehr/templates/backend-deployment.yaml`
4. ⏳ `k8s/helm-charts/sveltehr/templates/frontend-deployment.yaml`
5. ⏳ `k8s/helm-charts/sveltehr/values-dev.yaml`
6. ⏳ `k8s/helm-charts/sveltehr/values-prod.yaml`
7. ⏳ `k8s/scripts/build-and-push.sh`
8. ⏳ `k8s/deploy.sh`
9. ⏳ `.github/workflows/docker-build.yml`
10. ⏳ `k8s/argocd/sveltehr-application.yaml`
11. ⏳ `k8s/helm-charts/sveltehr/README.md`

---

## 💡 Key Benefits Achieved So Far

1. ✅ **Dependency Management:** PostgreSQL and Redis managed as Helm dependencies
2. ✅ **Migration Hooks:** Guaranteed migration execution before deployments
3. ✅ **Multi-Target Builds:** Separate images for server, migration, seed
4. ✅ **GitOps Ready:** Chart structure compatible with ArgoCD
5. ✅ **Environment Flexibility:** Dev/prod configuration via values files

---

**Status:** 40% Complete | Continue with Phase 3 (Container Optimizations)

**Last Updated:** 2025-11-01
