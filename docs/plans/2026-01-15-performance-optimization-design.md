# Performance Optimization Design

**Date:** 2026-01-15
**Status:** Approved
**Focus Areas:** Frontend Bundle Size, CI Build Times, K8s Infrastructure Costs

## Overview

This design addresses performance bottlenecks across three critical areas: frontend load times, CI build duration, and k8s resource efficiency. The approach prioritizes quick wins that deliver immediate, measurable improvements before comprehensive auditing.

## Strategy

**Approach:** Quick wins first - implement obvious improvements immediately, then measure remaining issues.

**Expected Timeline:**

- Frontend fixes: 1-2 hours implementation
- CI fixes: 2-3 hours implementation
- K8s fixes: 2-4 hours audit + implementation

## Part 1: Frontend Bundle Optimization

### Current State

- Production builds ship **unminified code** (`minify: false`)
- Poor chunk splitting (only `svelte` in manual chunks)
- 200+ dependencies with heavy libraries bundled together
- Test dependencies incorrectly in `dependencies` instead of `devDependencies`
- No route-based lazy loading for heavy features

### Quick Wins

#### 1. Enable Minification

**Change:** `vite.config.ts` - `minify: false` → `minify: 'esbuild'`
**Impact:** 30-40% size reduction immediately

#### 2. Aggressive Chunk Splitting

Split large vendors into separate chunks for parallel loading and better caching:

```javascript
manualChunks: {
  // Core framework
  'vendor-svelte': ['svelte'],

  // GraphQL stack (used on most pages)
  'vendor-graphql': ['@urql/svelte', '@urql/core', 'graphql', '@urql/exchange-auth', '@urql/exchange-graphcache'],

  // Heavy data processing (lazy-load on reports/documents)
  'vendor-xlsx': ['xlsx'],
  'vendor-documents': ['pdfkit', 'file-saver', 'sharp'],

  // Charts (lazy-load on reports/dashboard)
  'vendor-charts': ['chart.js', 'recharts', 'd3-scale', 'd3-shape', 'layerchart'],

  // Calendar (lazy-load on /calendar route)
  'vendor-calendar': [
    '@fullcalendar/core',
    '@fullcalendar/daygrid',
    '@fullcalendar/interaction',
    '@fullcalendar/timegrid',
    '@fullcalendar/rrule'
  ],

  // UI libraries (used across app)
  'vendor-ui': ['bits-ui', '@vincjo/datatables', 'svelte-select', 'embla-carousel-svelte']
}
```

#### 3. Move Test Dependencies to devDependencies

Move from `dependencies` to `devDependencies`:

- `@testing-library/svelte`
- `@testing-library/jest-dom`
- `jsdom`
- `webdriverio`
- `puppeteer`

These are incorrectly bundled in production builds.

#### 4. Route-Based Code Splitting

Implement lazy loading for heavy routes:

```javascript
// In route files, use dynamic imports:
// /reports/+page.svelte
const ChartsModule = import('$lib/components/charts');
const XlsxExport = import('$lib/utils/xlsx-export');

// /calendar/+page.svelte
const CalendarModule = import('$lib/components/calendar');

// /hr/documents/+page.svelte
const PdfGenerator = import('$lib/utils/pdf-generator');
```

### Expected Impact

- **Bundle size:** 2-3MB → 800KB-1.2MB initial load (60-70% reduction)
- **Time-to-interactive:** 70-80% faster on 3G connections
- **Cache efficiency:** Better granular caching (charts chunk only invalidates when charts updated)

## Part 2: CI Build Time Optimization

### Current State

- Rust backend rebuilt **4 times** in every CI run (contract, integration, graphql, e2e)
- Each rebuild takes ~8min without cache, ~5min with partial cache
- Playwright browsers re-downloaded in every E2E run (~350MB)
- Jobs run sequentially when they could be parallel
- Total CI time: **45-60 minutes** for full runs

### Quick Wins

#### 1. Rust Build Caching & Deduplication

**Problem:** Backend rebuilt in every test job
**Solution:** Build once, reuse artifact

```yaml
# New job: rust-build (runs once)
rust-build:
  name: Build Rust Backend
  runs-on: blacksmith-4vcpu-ubuntu-2404
  steps:
    - uses: actions/checkout@v5
    - uses: actions-rust-lang/setup-rust-toolchain@v1
      with:
        toolchain: stable
        cache: true # Swatinem/rust-cache@v2 built-in
    - name: Build release binary
      run: |
        cd graphql-rust-server
        cargo build --release
    - name: Upload binary
      uses: actions/upload-artifact@v5
      with:
        name: rust-backend-binary
        path: graphql-rust-server/target/release/graphql-rust-server

# Update all test jobs to download instead of rebuild
contract-tests:
  needs: [backend-test, rust-build] # Add rust-build dependency
  steps:
    - uses: actions/download-artifact@v5
      with:
        name: rust-backend-binary
        path: ./backend-binary
    - name: Start backend (no build needed)
      run: |
        chmod +x ./backend-binary/graphql-rust-server
        nohup ./backend-binary/graphql-rust-server > /tmp/backend.log 2>&1 &
```

**Impact:** 4 builds × 8min = 32min → 1 build × 2min + downloads = ~3min (90% reduction)

#### 2. Parallelize Independent Jobs

Remove unnecessary `needs: backend-test` dependencies:

```yaml
# BEFORE: Sequential
contract-tests:
  needs: backend-test  # Waits for backend-test to finish

integration-tests:
  needs: backend-test  # Waits for backend-test to finish

graphql-tests:
  needs: backend-test  # Waits for backend-test to finish

# AFTER: Parallel (they all use same postgres service, don't need to wait)
contract-tests:
  needs: rust-build  # Only need the built binary

integration-tests:
  needs: rust-build

graphql-tests:
  needs: rust-build
```

**Impact:** Jobs run in parallel instead of sequential queue (20-30min saved)

#### 3. Playwright Browser Caching

```yaml
- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

- name: Install Playwright browsers
  run: npx playwright install --with-deps
```

**Impact:** 350MB download eliminated on cache hit (~2-3min saved per E2E run)

#### 4. npm Dependency Consistency

Ensure all jobs use cache consistently (some already do, make uniform):

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: 22
    cache: 'npm'
    cache-dependency-path: package-lock.json # Explicit path
```

#### 5. Smart Test Execution (Bonus)

Leverage existing `smart-tests.yml` workflow:

- Skip E2E/integration if only markdown/docs changed
- Skip Rust tests if only frontend files changed
- Use GitHub Actions path filters

### Expected Impact

- **Full CI runs:** 45-60min → 20-25min (50-60% reduction)
- **Frontend-only changes:** 45-60min → 5-10min (90% reduction)
- **Cache hit rates:** Improve from ~40% to ~80-90%

## Part 3: K8s Infrastructure Optimization

### Current State

- Likely over-provisioned resource requests/limits (common k8s antipattern)
- Static replica counts instead of autoscaling
- Large container images (possibly multi-stage builds not optimized)
- Potential zombie resources from old deployments
- Aggressive health check intervals

### Quick Wins

#### 1. Right-Size Resource Requests/Limits

**Audit current deployments** for actual usage vs allocated:

```yaml
# BEFORE (typical over-provisioning)
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"

# AFTER (right-sized for SvelteKit frontend)
resources:
  requests:
    memory: "128Mi"   # Actual usage: ~100-200MB
    cpu: "100m"       # Actual usage: ~50-100m
  limits:
    memory: "512Mi"   # Burst capacity
    cpu: "500m"       # Burst capacity

# AFTER (right-sized for Rust backend)
resources:
  requests:
    memory: "256Mi"   # Actual usage: ~200-400MB
    cpu: "200m"       # Actual usage: ~100-200m
  limits:
    memory: "1Gi"     # Burst capacity
    cpu: "1000m"      # Burst capacity
```

**Action:** Run profiling to determine actual resource usage, adjust accordingly.

#### 2. Horizontal Pod Autoscaling (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sveltehr-frontend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sveltehr-frontend
  minReplicas: 2 # HA requirement
  maxReplicas: 10 # Based on peak load
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Impact:** Scale down during off-hours, scale up during peak load automatically.

#### 3. Image Optimization

**Frontend Dockerfile** (multi-stage):

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage (nginx)
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

**Backend Dockerfile** (Rust):

```dockerfile
FROM rust:1.75 AS builder
WORKDIR /app
COPY . .
RUN cargo build --release
RUN strip target/release/graphql-rust-server  # Remove debug symbols

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/graphql-rust-server /usr/local/bin/
RUN apt-get update && apt-get install -y libpq5 ca-certificates && rm -rf /var/lib/apt/lists/*
CMD ["graphql-rust-server"]
```

**Impact:** 1GB+ images → 100-300MB (faster pulls, less registry storage)

#### 4. Resource Cleanup

Audit and remove:

- Unused services/deployments in `k8s/` manifests
- Old PersistentVolumeClaims (PVCs) from deleted deployments
- Orphaned ConfigMaps and Secrets
- Zombie pods from failed deployments

```bash
# Find resources not used in 30+ days
kubectl get pvc --all-namespaces -o json | jq '.items[] | select(.status.lastProbeTime < "30d")'
kubectl get configmap --all-namespaces -o json | jq '.items[] | select(.metadata.creationTimestamp < "30d")'
```

#### 5. Efficient Health Checks

Reduce probe frequency for non-critical services:

```yaml
# BEFORE (aggressive)
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10      # Every 10 seconds
  timeoutSeconds: 5
  failureThreshold: 3

# AFTER (efficient)
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 30      # Every 30 seconds (3x less API calls)
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 15      # Every 15 seconds
  timeoutSeconds: 3
  failureThreshold: 2
```

**Impact:** Reduce CPU usage from health checks, faster pod startup (fewer premature restarts).

### Expected Impact

- **Resource costs:** 30-50% reduction in k8s resource allocation
- **Pod startup time:** 20-40% faster (smaller images, better health checks)
- **Auto-scaling efficiency:** Respond to load changes in 30-60s instead of manual scaling

## Implementation Priority

### Phase 1: Immediate Wins (Day 1)

1. Frontend minification (5 min)
2. Move test deps to devDependencies (10 min)
3. CI Rust build artifact caching (30 min)
4. CI job parallelization (15 min)

**Expected Impact:** 40-50% improvement across all areas

### Phase 2: Chunk Splitting & Route Lazy Loading (Day 2-3)

1. Implement manual chunks in vite.config.ts (1 hour)
2. Add dynamic imports for heavy routes (2-3 hours)
3. Test bundle sizes and caching behavior (1 hour)

**Expected Impact:** Additional 30-40% frontend improvement

### Phase 3: K8s Optimization (Week 2)

1. Audit actual resource usage (2 hours - monitoring/profiling)
2. Implement HPAs for frontend/backend (1 hour)
3. Optimize Docker images (2 hours)
4. Clean up unused resources (1-2 hours)

**Expected Impact:** 30-50% cost reduction

### Phase 4: Measure & Iterate (Ongoing)

1. Set up bundle size monitoring in CI
2. Track CI build times in GitHub Actions insights
3. Monitor k8s resource utilization with Prometheus/Grafana
4. Identify next bottlenecks based on data

## Success Metrics

### Frontend

- **Bundle size:** Target < 1MB initial load (currently 2-3MB)
- **Time-to-interactive:** Target < 2s on 4G (currently 4-6s)
- **Lighthouse score:** Target > 90 performance (currently ~60-70)

### CI

- **Full run time:** Target < 25min (currently 45-60min)
- **Frontend-only runs:** Target < 10min (currently 45-60min)
- **Cache hit rate:** Target > 80% (currently ~40%)

### K8s

- **CPU utilization:** Target 60-80% (currently likely 20-40%)
- **Memory utilization:** Target 70-85% (currently likely 30-50%)
- **Cost reduction:** Target 30-50% monthly k8s spend

## Risk Mitigation

1. **Bundle splitting complexity:** Test thoroughly in staging before production
2. **CI caching issues:** Keep fallback to full rebuild if artifact missing
3. **K8s resource starvation:** Start with conservative limits, adjust based on monitoring
4. **Breaking changes:** Feature flag route lazy loading, rollback plan ready

## Next Steps

1. Validate design with team
2. Create isolated git worktree for implementation
3. Write detailed implementation plan with test strategy
4. Execute Phase 1 quick wins
5. Measure impact, adjust plan for Phases 2-4
