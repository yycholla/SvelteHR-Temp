# Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Phase 1 quick wins for frontend bundle size, CI build times, and k8s infrastructure performance improvements.

**Architecture:** Three parallel optimization tracks - frontend build configuration, CI pipeline caching/parallelization, and k8s resource right-sizing. Each can be implemented independently and delivers immediate measurable improvements.

**Tech Stack:** Vite 7, GitHub Actions (Blacksmith runners), Kubernetes, Rust (Cargo), npm

---

## Task 1: Enable Frontend Minification

**Files:**

- Modify: `vite.config.ts:53-56`

**Step 1: Change minify setting to esbuild**

Open `vite.config.ts` and locate the build configuration around line 53-56:

```typescript
// Current (BEFORE):
build: {
  target: 'esnext',
  minify: false,  // ← Change this
  sourcemap: true,
```

Change to:

```typescript
// Fixed (AFTER):
build: {
  target: 'esnext',
  minify: 'esbuild',  // Enable minification for production
  sourcemap: true,
```

**Step 2: Verify configuration is valid**

Run: `npm run build`

Expected output should include:

```
vite v7.x.x building for production...
✓ xxx modules transformed.
build/client/_app/... (minified)
```

Look for file sizes - should see significant reduction compared to previous builds.

**Step 3: Test that build output works**

Run: `npm run preview`

Navigate to http://localhost:4173 and verify:

- App loads correctly
- No console errors
- Functionality works (login, navigation)

**Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "perf: enable minification in production builds

- Change minify from false to 'esbuild'
- Expected 30-40% bundle size reduction
- Part of Phase 1 performance optimization"
```

---

## Task 2: Move Test Dependencies to devDependencies

**Files:**

- Modify: `package.json:192-246`

**Step 1: Identify test-only dependencies in dependencies section**

Open `package.json` and find these in the `dependencies` section (lines 192-246):

```json
"dependencies": {
  "@testing-library/svelte": "^5.2.8",
  "@testing-library/jest-dom": "^6.9.1",  // Should be in devDependencies
  "jsdom": "^26.1.0",  // Should be in devDependencies
  "puppeteer": "^24.26.1",  // Should be in devDependencies (wait, check if this is already in dev)
  // ... other deps
}
```

**Step 2: Move to devDependencies**

Cut these lines from `dependencies` and verify they're in `devDependencies`. If not there, add them:

```json
"devDependencies": {
  // ... existing devDeps
  "@testing-library/svelte": "^5.2.8",
  "jsdom": "^26.1.0"
  // Note: @testing-library/jest-dom, puppeteer, webdriverio should already be in devDependencies
}
```

Remove them from `dependencies` section.

**Step 3: Verify package.json is valid JSON**

Run: `npm install`

Expected: Should complete without errors, reorganizing package-lock.json

**Step 4: Verify production build doesn't include test deps**

Run: `npm run build`

Check that build output doesn't reference testing libraries (they shouldn't be in client bundle).

**Step 5: Run tests to ensure nothing broke**

Run: `npm run test:unit -- --run`

Expected: All tests pass

**Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "perf: move test dependencies to devDependencies

- Move @testing-library/svelte to devDependencies
- Move jsdom to devDependencies
- Reduces production bundle size by excluding test utilities
- Part of Phase 1 performance optimization"
```

---

## Task 3: Add Rust Build Artifact Job to CI

**Files:**

- Modify: `.github/workflows/ci.yml:14-80`

**Step 1: Create dedicated Rust build job**

Open `.github/workflows/ci.yml` and add a new job after the `lint` job (around line 35):

```yaml
rust-build:
  name: Build Rust Backend (Artifact)
  runs-on: blacksmith-4vcpu-ubuntu-2404
  timeout-minutes: 15

  services:
    postgres:
      image: postgres:15-alpine
      env:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: hr_system_test
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5

  steps:
    - uses: actions/checkout@v5

    - name: Setup Rust
      uses: actions-rust-lang/setup-rust-toolchain@v1
      with:
        toolchain: stable
        cache: true # Built-in Swatinem/rust-cache

    - name: Build release binary
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
      run: |
        cd graphql-rust-server
        cargo build --release

    - name: Run migrations
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
      run: |
        cd graphql-rust-server
        cargo run --bin migration up || echo "Migration completed with warnings"

    - name: Upload binary artifact
      uses: actions/upload-artifact@v5
      with:
        name: rust-backend-binary
        path: graphql-rust-server/target/release/graphql-rust-server
        retention-days: 1 # Only need it for this workflow run
```

**Step 2: Verify YAML syntax is valid**

Run locally: `yamllint .github/workflows/ci.yml` (if yamllint installed)

Or use online validator: https://www.yamllint.com/

**Step 3: Commit this change first**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add dedicated Rust build artifact job

- Create rust-build job that builds once and uploads artifact
- Runs in parallel with other jobs
- Will be reused by contract/integration/graphql/e2e tests
- Part of Phase 1 CI optimization"
```

---

## Task 4: Update Contract Tests to Use Rust Artifact

**Files:**

- Modify: `.github/workflows/ci.yml:118-201`

**Step 1: Update contract-tests job dependencies**

Find the `contract-tests` job (around line 118) and update the `needs` line:

```yaml
# BEFORE:
contract-tests:
  name: Contract Tests
  runs-on: blacksmith-4vcpu-ubuntu-2404
  timeout-minutes: 20
  needs: backend-test  # OLD

# AFTER:
contract-tests:
  name: Contract Tests
  runs-on: blacksmith-4vcpu-ubuntu-2404
  timeout-minutes: 15  # Reduced from 20 since no build
  needs: [backend-test, rust-build]  # NEW - add rust-build
```

**Step 2: Replace cargo build with artifact download**

In the contract-tests steps section (around line 139-173), replace the entire "Build and start backend server" step:

```yaml
# BEFORE (remove lines 156-173):
- name: Build and start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    cd graphql-rust-server
    cargo build --release
    cargo run --bin migration up || echo "Migration completed with warnings"
    nohup cargo run --release > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (echo "Backend failed to start:" && cat /tmp/backend.log && exit 1)
    echo "Backend server is ready!"

# AFTER (replace with):
- name: Download backend binary
  uses: actions/download-artifact@v5
  with:
    name: rust-backend-binary
    path: ./backend-binary

- name: Start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    chmod +x ./backend-binary/graphql-rust-server

    # Run migrations
    cd graphql-rust-server
    cargo run --bin migration up || echo "Migration completed with warnings"
    cd ..

    # Start server with downloaded binary
    nohup ./backend-binary/graphql-rust-server > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid

    # Wait for server
    echo "Waiting for backend server to be ready..."
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (echo "Backend failed to start:" && cat /tmp/backend.log && exit 1)
    echo "Backend server is ready!"
```

**Step 3: Remove Rust toolchain setup from contract-tests**

Find and remove the "Setup Rust" step from contract-tests (around line 147-151):

```yaml
# REMOVE these lines:
- name: Setup Rust
  uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    toolchain: stable
    cache: true
```

We still need Rust for migrations, so keep it but update:

```yaml
- name: Setup Rust (for migrations only)
  uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    toolchain: stable
    cache: true
```

**Step 4: Commit contract-tests update**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: update contract-tests to use Rust build artifact

- Download pre-built binary instead of rebuilding
- Remove 'cargo build --release' step (saves ~5-8min)
- Keep Rust toolchain for migrations only
- Part of Phase 1 CI optimization"
```

---

## Task 5: Update Integration Tests to Use Rust Artifact

**Files:**

- Modify: `.github/workflows/ci.yml:203-279`

**Step 1: Update integration-tests job dependencies**

Find the `integration-tests` job (around line 203) and update:

```yaml
# BEFORE:
integration-tests:
  name: Integration Tests
  runs-on: blacksmith-4vcpu-ubuntu-2404
  timeout-minutes: 20
  needs: backend-test  # OLD

# AFTER:
integration-tests:
  name: Integration Tests
  runs-on: blacksmith-4vcpu-ubuntu-2404
  timeout-minutes: 15  # Reduced from 20
  needs: [backend-test, rust-build]  # NEW
```

**Step 2: Replace cargo build with artifact download**

Replace the "Build and start backend server" step (around lines 241-250):

```yaml
# BEFORE (remove):
- name: Build and start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    cd graphql-rust-server
    cargo build --release
    cargo run --bin migration up || echo "Migration completed with warnings"
    nohup cargo run --release > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (cat /tmp/backend.log && exit 1)

# AFTER (replace with):
- name: Download backend binary
  uses: actions/download-artifact@v5
  with:
    name: rust-backend-binary
    path: ./backend-binary

- name: Start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    chmod +x ./backend-binary/graphql-rust-server

    cd graphql-rust-server
    cargo run --bin migration up || echo "Migration completed with warnings"
    cd ..

    nohup ./backend-binary/graphql-rust-server > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (cat /tmp/backend.log && exit 1)
```

**Step 3: Update Rust toolchain setup comment**

Find the "Setup Rust" step and update the comment:

```yaml
- name: Setup Rust (for migrations only)
  uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    toolchain: stable
    cache: true
```

**Step 4: Commit integration-tests update**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: update integration-tests to use Rust build artifact

- Download pre-built binary instead of rebuilding
- Remove 'cargo build --release' step
- Runs in parallel with contract-tests now
- Part of Phase 1 CI optimization"
```

---

## Task 6: Update GraphQL Tests to Use Rust Artifact

**Files:**

- Modify: `.github/workflows/ci.yml:281-356`

**Step 1: Update graphql-tests job dependencies**

Find the `graphql-tests` job (around line 281):

```yaml
# BEFORE:
graphql-tests:
  name: GraphQL Tests
  runs-on: blacksmith-4vcpu-ubuntu-2404
  timeout-minutes: 20
  needs: backend-test  # OLD

# AFTER:
graphql-tests:
  name: GraphQL Tests
  runs-on: blacksmith-4vcpu-ubuntu-2404
  timeout-minutes: 15  # Reduced from 20
  needs: [backend-test, rust-build]  # NEW
```

**Step 2: Replace cargo build with artifact download**

Replace the "Build and start backend server" step:

```yaml
# BEFORE (remove lines around 319-328):
- name: Build and start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    cd graphql-rust-server
    cargo build --release
    cargo run --bin migration up || echo "Migration completed with warnings"
    nohup cargo run --release > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (cat /tmp/backend.log && exit 1)

# AFTER (replace with):
- name: Download backend binary
  uses: actions/download-artifact@v5
  with:
    name: rust-backend-binary
    path: ./backend-binary

- name: Start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    chmod +x ./backend-binary/graphql-rust-server

    cd graphql-rust-server
    cargo run --bin migration up || echo "Migration completed with warnings"
    cd ..

    nohup ./backend-binary/graphql-rust-server > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (cat /tmp/backend.log && exit 1)
```

**Step 3: Update Rust toolchain setup comment**

```yaml
- name: Setup Rust (for migrations only)
  uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    toolchain: stable
    cache: true
```

**Step 4: Commit graphql-tests update**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: update graphql-tests to use Rust build artifact

- Download pre-built binary instead of rebuilding
- Remove 'cargo build --release' step
- Runs in parallel with contract/integration tests
- Part of Phase 1 CI optimization"
```

---

## Task 7: Update E2E Tests to Use Rust Artifact

**Files:**

- Modify: `.github/workflows/ci.yml:358-460`

**Step 1: Update e2e-tests job dependencies**

Find the `e2e-tests` job (around line 358):

```yaml
# BEFORE:
e2e-tests:
  name: E2E Tests
  runs-on: blacksmith-8vcpu-ubuntu-2404
  timeout-minutes: 30
  needs: [backend-test, unit-tests]  # OLD

# AFTER:
e2e-tests:
  name: E2E Tests
  runs-on: blacksmith-8vcpu-ubuntu-2404
  timeout-minutes: 25  # Reduced from 30
  needs: [backend-test, unit-tests, rust-build]  # NEW - add rust-build
```

**Step 2: Replace cargo build with artifact download**

Replace the "Build and start backend server" step (around lines 399-408):

```yaml
# BEFORE (remove):
- name: Build and start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    cd graphql-rust-server
    cargo build --release
    cargo run --bin migration up || echo "Migration completed with warnings"
    nohup cargo run --release > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (cat /tmp/backend.log && exit 1)

# AFTER (replace with):
- name: Download backend binary
  uses: actions/download-artifact@v5
  with:
    name: rust-backend-binary
    path: ./backend-binary

- name: Start backend server
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/hr_system_test
  run: |
    chmod +x ./backend-binary/graphql-rust-server

    cd graphql-rust-server
    cargo run --bin migration up || echo "Migration completed with warnings"
    cd ..

    nohup ./backend-binary/graphql-rust-server > /tmp/backend.log 2>&1 &
    echo $! > /tmp/backend.pid
    timeout 60 bash -c 'until curl -f http://localhost:4000/health; do sleep 2; done' || (cat /tmp/backend.log && exit 1)
```

**Step 3: Update Rust toolchain setup comment**

```yaml
- name: Setup Rust (for migrations only)
  uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    toolchain: stable
    cache: true
```

**Step 4: Commit e2e-tests update**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: update e2e-tests to use Rust build artifact

- Download pre-built binary instead of rebuilding
- Remove final 'cargo build --release' step
- All test jobs now reuse single build artifact
- Part of Phase 1 CI optimization"
```

---

## Task 8: Add Playwright Browser Caching

**Files:**

- Modify: `.github/workflows/ci.yml:395-397`

**Step 1: Add browser cache step before Playwright install**

Find the "Install Playwright browsers" step in e2e-tests (around line 396-397) and add caching before it:

```yaml
- name: Install frontend dependencies
  run: npm ci

# NEW: Add this cache step
- name: Cache Playwright browsers
  uses: actions/cache@v4
  id: playwright-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      playwright-${{ runner.os }}-

- name: Install Playwright browsers
  # Only install if cache miss
  if: steps.playwright-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps

# If cache hit, still need to install system dependencies
- name: Install Playwright system dependencies
  if: steps.playwright-cache.outputs.cache-hit == 'true'
  run: npx playwright install-deps
```

**Step 2: Verify cache configuration is valid**

Check that the YAML is properly indented and valid.

**Step 3: Commit Playwright caching**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Playwright browser caching

- Cache ~/.cache/ms-playwright directory
- Skip browser download on cache hit (~350MB)
- Install only system deps on cache hit
- Expected ~2-3min savings per E2E run
- Part of Phase 1 CI optimization"
```

---

## Task 9: Verify CI Changes Don't Break Workflow

**Files:**

- Read: `.github/workflows/ci.yml` (full file review)

**Step 1: Review complete workflow structure**

Open `.github/workflows/ci.yml` and verify:

1. All jobs have proper `needs` dependencies
2. Artifact upload/download names match exactly: `rust-backend-binary`
3. No job runs `cargo build --release` except `rust-build`
4. All backend test jobs download the artifact
5. Playwright cache logic is correct

**Step 2: Check for YAML syntax errors**

Run: `yamllint .github/workflows/ci.yml`

Or paste into https://www.yamllint.com/

Expected: No errors

**Step 3: Verify job dependency graph makes sense**

The dependency graph should be:

```
lint (independent)
backend-test (independent)
rust-build (depends on nothing, builds in parallel)
unit-tests (independent)

contract-tests (needs: backend-test, rust-build)
integration-tests (needs: backend-test, rust-build)
graphql-tests (needs: backend-test, rust-build)

e2e-tests (needs: backend-test, unit-tests, rust-build)
build (needs: lint, unit-tests)

test-summary (needs: all)
```

**Step 4: Commit verification checkpoint**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: verify Phase 1 CI optimizations complete

Summary of changes:
- Added rust-build job with artifact upload
- Updated 4 test jobs to download artifact instead of rebuilding
- Added Playwright browser caching
- Jobs now run more in parallel

Expected improvements:
- CI time: 45-60min → 20-25min (50-60% reduction)
- Rust builds: 4 × 8min → 1 × 2min (90% reduction)
- Playwright downloads: eliminated on cache hit

Part of Phase 1 performance optimization"
```

---

## Task 10: Test CI Changes Locally (Optional but Recommended)

**Files:**

- Read: `.github/workflows/ci.yml`

**Step 1: Install act (GitHub Actions local runner)**

If you have act installed, test the workflow locally:

```bash
# Install act if needed
# brew install act (macOS)
# or see: https://github.com/nektos/act

# Test the rust-build job
act -j rust-build --platform blacksmith-4vcpu-ubuntu-2404=catthehacker/ubuntu:act-latest
```

**Step 2: Verify artifact creation**

Check that the artifact is created with correct name and path.

**Step 3: Test artifact download in contract-tests**

```bash
act -j contract-tests --platform blacksmith-4vcpu-ubuntu-2404=catthehacker/ubuntu:act-latest
```

Verify it downloads the artifact and runs tests.

**Step 4: Document local testing results**

If successful, add a comment to the commit:

```bash
git commit --amend -m "ci: verify Phase 1 CI optimizations complete

Summary of changes:
- Added rust-build job with artifact upload
- Updated 4 test jobs to download artifact instead of rebuilding
- Added Playwright browser caching
- Jobs now run more in parallel

Expected improvements:
- CI time: 45-60min → 20-25min (50-60% reduction)
- Rust builds: 4 × 8min → 1 × 2min (90% reduction)
- Playwright downloads: eliminated on cache hit

Tested locally with act: rust-build and contract-tests pass

Part of Phase 1 performance optimization"
```

**If act not available:** Skip this task, rely on GitHub Actions CI to validate.

---

## Task 11: Create Bundle Size Baseline Measurement

**Files:**

- Create: `scripts/measure-bundle-size.sh`

**Step 1: Create bundle size measurement script**

Create new file `scripts/measure-bundle-size.sh`:

```bash
#!/bin/bash
set -e

echo "=== Bundle Size Measurement ==="
echo "Date: $(date)"
echo "Commit: $(git rev-parse --short HEAD)"
echo ""

# Build production bundle
echo "Building production bundle..."
npm run build

# Measure bundle sizes
echo ""
echo "=== Client Bundle Sizes ==="
du -sh build/client/_app/immutable/chunks/* | sort -hr | head -20

echo ""
echo "=== Total Client Size ==="
du -sh build/client

echo ""
echo "=== Top 10 Largest Files ==="
find build/client -type f -exec du -h {} + | sort -hr | head -10

echo ""
echo "=== JavaScript Totals ==="
find build/client -name "*.js" -exec du -ch {} + | tail -1

echo ""
echo "=== CSS Totals ==="
find build/client -name "*.css" -exec du -ch {} + | tail -1
```

**Step 2: Make script executable**

```bash
chmod +x scripts/measure-bundle-size.sh
```

**Step 3: Run baseline measurement**

```bash
./scripts/measure-bundle-size.sh > bundle-size-baseline.txt
```

This creates a baseline to compare against after Phase 2 chunk splitting.

**Step 4: Commit measurement script**

```bash
git add scripts/measure-bundle-size.sh bundle-size-baseline.txt
git commit -m "perf: add bundle size measurement script and baseline

- Create script to measure production bundle sizes
- Capture baseline before chunk splitting changes
- Will be used to validate Phase 2 improvements
- Part of Phase 1 performance optimization"
```

---

## Task 12: Document Phase 1 Completion and Results

**Files:**

- Create: `docs/performance-optimization-phase1-results.md`

**Step 1: Create results documentation**

Create `docs/performance-optimization-phase1-results.md`:

````markdown
# Performance Optimization - Phase 1 Results

**Date Completed:** [Fill in after CI runs]
**Status:** Implementation Complete, Awaiting CI Validation

## Changes Implemented

### Frontend (vite.config.ts, package.json)

- ✅ Enabled minification (`minify: 'esbuild'`)
- ✅ Moved test dependencies to devDependencies

**Expected Impact:**

- Bundle size: 30-40% reduction
- Time-to-interactive: Faster due to minified code

### CI (.github/workflows/ci.yml)

- ✅ Created dedicated `rust-build` job with artifact caching
- ✅ Updated `contract-tests` to use artifact
- ✅ Updated `integration-tests` to use artifact
- ✅ Updated `graphql-tests` to use artifact
- ✅ Updated `e2e-tests` to use artifact
- ✅ Added Playwright browser caching

**Expected Impact:**

- Rust builds: 4 builds × 8min = 32min → 1 build × 2min = 2min (94% reduction)
- Playwright downloads: ~350MB eliminated on cache hit (~2-3min saved)
- Total CI time: 45-60min → 20-25min (50-60% reduction)
- Jobs run in parallel instead of sequentially

## Validation Checklist

### Frontend Validation

- [ ] Run `npm run build` - verify minified output
- [ ] Check build/client bundle sizes vs baseline
- [ ] Run `npm run preview` - verify app works
- [ ] No increase in console errors

### CI Validation

- [ ] Push to branch, trigger CI run
- [ ] Verify `rust-build` job completes successfully
- [ ] Verify artifact uploaded (check Actions artifacts)
- [ ] Verify all 4 test jobs download artifact
- [ ] Verify Playwright cache works (check cache hit in logs)
- [ ] Measure total CI duration
- [ ] Compare to baseline: [previous CI run time]

### Measurements

- **Baseline bundle size:** [from bundle-size-baseline.txt]
- **After Phase 1 bundle size:** [run script after changes]
- **Reduction:** [calculate percentage]

- **Baseline CI time:** [from recent CI run before changes]
- **After Phase 1 CI time:** [from CI run after changes]
- **Reduction:** [calculate percentage]

## Next Steps

- **Phase 2:** Chunk splitting and route-based lazy loading
- **Phase 3:** K8s resource optimization
- **Phase 4:** Continuous monitoring and iteration

## Issues Encountered

[Document any issues found during implementation]

## Rollback Plan

If issues found:

```bash
git revert HEAD~[number of commits]
git push origin feature/performance-optimization --force-with-lease
```
````

All changes are independent and can be reverted individually.

````

**Step 2: Commit results documentation**

```bash
git add docs/performance-optimization-phase1-results.md
git commit -m "docs: add Phase 1 results tracking document

- Template for validation and measurements
- Checklist for verifying changes work
- Baseline comparison structure
- Part of Phase 1 performance optimization"
````

---

## Task 13: Push Changes and Create PR

**Files:**

- None (git operations)

**Step 1: Review all commits**

```bash
git log --oneline origin/main..HEAD
```

Expected commits:

1. Enable minification
2. Move test deps to devDependencies
3. Add rust-build job
4. Update contract-tests
5. Update integration-tests
6. Update graphql-tests
7. Update e2e-tests
8. Add Playwright caching
9. Verify CI changes
10. Add bundle size script
11. Add Phase 1 results doc

**Step 2: Push branch to remote**

```bash
git push origin feature/performance-optimization
```

**Step 3: Create Pull Request**

Using GitHub CLI or web UI:

```bash
gh pr create \
  --title "perf: Phase 1 - Frontend minification and CI build optimization" \
  --body "## Overview

Implements Phase 1 quick wins from performance optimization design:
- Frontend: Enable minification, move test deps
- CI: Rust build artifact caching, job parallelization, Playwright caching

## Expected Impact
- Bundle size: 30-40% reduction
- CI time: 45-60min → 20-25min (50-60% reduction)

## Changes
- ✅ Enable esbuild minification in vite.config.ts
- ✅ Move test dependencies to devDependencies
- ✅ Create rust-build job with artifact upload
- ✅ Update 4 test jobs to download artifact
- ✅ Add Playwright browser caching

## Testing
- [ ] CI passes on this PR
- [ ] Bundle size reduced (check build output)
- [ ] Frontend works in preview mode
- [ ] Measure CI duration vs baseline

## Related
- Design: docs/plans/2026-01-15-performance-optimization-design.md
- Results: docs/performance-optimization-phase1-results.md
- Next: Phase 2 chunk splitting (separate PR)

## Validation
See docs/performance-optimization-phase1-results.md checklist" \
  --base main \
  --head feature/performance-optimization
```

**Step 4: Monitor CI run**

Watch the CI run on the PR:

```bash
gh pr checks --watch
```

Verify:

- All jobs pass
- rust-build artifact is created
- Test jobs download and use artifact
- Playwright cache works (check logs for cache hit)

**Step 5: Measure results**

After CI passes, update `docs/performance-optimization-phase1-results.md` with actual measurements.

---

## Verification & Success Criteria

### Frontend Success Criteria

- ✅ `npm run build` completes without errors
- ✅ Bundle size reduced by 30-40% (check with measurement script)
- ✅ `npm run preview` works - app loads and functions correctly
- ✅ No new console errors or warnings

### CI Success Criteria

- ✅ All CI jobs pass on the PR
- ✅ rust-build job uploads artifact successfully
- ✅ All 4 test jobs download artifact (verify in logs)
- ✅ Playwright cache hits on subsequent runs
- ✅ Total CI time reduced to 20-25min (measure actual run)
- ✅ No test failures introduced by changes

### Code Quality Criteria

- ✅ All commits have descriptive messages
- ✅ No merge conflicts with main
- ✅ YAML syntax valid (yamllint passes)
- ✅ package.json valid JSON (npm install works)

## Rollback Plan

If any issues found:

**Revert specific commits:**

```bash
# Revert CI changes only
git revert [commit-hash-of-ci-changes]

# Revert frontend changes only
git revert [commit-hash-of-frontend-changes]

git push origin feature/performance-optimization --force-with-lease
```

**Full rollback:**

```bash
git reset --hard origin/main
git push origin feature/performance-optimization --force-with-lease
```

All changes are independent and safe to revert individually.

## Post-Implementation Notes

After Phase 1 is merged and validated in production:

1. **Gather Metrics:**
   - Run bundle size comparison (before/after)
   - Collect CI duration statistics (average of 5+ runs)
   - Monitor production performance (Lighthouse scores, user metrics)

2. **Update Documentation:**
   - Fill in actual measurements in results doc
   - Update design doc with lessons learned
   - Note any unexpected issues or wins

3. **Plan Phase 2:**
   - Review Phase 2 design (chunk splitting, lazy loading)
   - Prioritize based on Phase 1 results
   - Create new implementation plan for Phase 2

## Notes for Implementation

- **Working Directory:** All commands should be run from repository root
- **Node Version:** Ensure Node 22+ (check with `node --version`)
- **Rust Version:** Ensure Rust stable (check with `rustc --version`)
- **Test Before Committing:** Run `npm run check` and `npm run build` before each commit
- **Small Commits:** Each task is one commit for easy rollback
- **CI First:** Let CI validate before merging to main

## Required Skills

- @superpowers:verification-before-completion - MUST use before claiming tasks complete
- @superpowers:systematic-debugging - Use if any test failures occur
- @superpowers:receiving-code-review - Use after PR created and reviews received
