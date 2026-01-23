# PR #64 CI Failures - Layered Fix Design

**Date:** 2026-01-15
**Status:** Approved
**Focus Areas:** CI Infrastructure, Code Quality, Performance Evaluation

## Overview

Fix all 8 CI failures on PR #64 using a layered approach that separates infrastructure fixes, code quality fixes, and performance evaluation.

## Problem Statement

PR #64 (performance optimization) has 8 failing CI checks:

- **6 NEW failures** introduced by PR #64
- **2 PRE-EXISTING failures** also failing on main branch

### NEW Failures

1. **Lint & Type Check** - 15 files need Prettier formatting
2. **Rust Tests (Smart Selection)** - Mold linker not available in CI
3. **Frontend Tests (contract)** - Backend not running + Playwright/Vitest framework confusion
4. **Frontend Tests (integration)** - PostgreSQL not running on port 5432
5. **Benchmark Comparison** - Rust benchmark code won't compile (12 type errors)
6. **Lighthouse Performance Audit** - Performance metrics exceed thresholds

### PRE-EXISTING Failures

7. **Backend Tests (Rust)** - Unused variable `sql` in `query_debugger.rs:223` (same on main and PR #64)
8. **Unit Tests (Frontend)** - Identical test results on main and PR #64, job fails due to artifact storage quota

## Strategy

### Why Layered Approach

The failures fall into three distinct categories:

1. **CI Infrastructure** - Broken test environment setup
2. **Code Quality** - Linting, formatting, unused code
3. **Performance Metrics** - Lighthouse thresholds need evaluation

**Benefits:**

- Each PR has single responsibility
- Easier code review (smaller, focused changes)
- Can merge CI fixes independently to unblock other work
- Lighthouse metrics evaluated on stable CI baseline
- Failed fixes don't block unrelated work

### Three-PR Strategy

#### PR #66: CI Infrastructure Fixes

- Mold linker configuration
- Backend service startup for contract tests
- PostgreSQL service for integration tests
- Playwright/Vitest framework confusion

#### PR #67: Code Quality Fixes

- Prettier formatting (15 files)
- Rust benchmark type annotations
- Unused variable cleanup

#### PR #64 (Revised): Performance Evaluation

- Rebase on fixed main
- Investigate Lighthouse metrics regression
- Adjust performance optimization strategy if needed

## PR #66: CI Infrastructure Fixes

**Branch:** `fix/ci-infrastructure` (from current main)

### 1. Mold Linker Issue

**Problem:** CI doesn't have mold linker, but local Rust config requires it

**Solution:** Conditional linker configuration

Create `.cargo/config.toml`:

```toml
[target.x86_64-unknown-linux-gnu]
linker = "clang"
# Only use mold locally where it's available
# CI will use default lld linker
```

Developers can override locally:

```bash
export RUSTFLAGS="-C link-arg=-fuse-ld=mold"
```

### 2. Backend Service Not Running

**Problem:** Contract tests expect backend on port 4000, workflow doesn't start it

**Solution:** Start backend in Smart Test Selection workflow

Modify `.github/workflows/smart-tests.yml`:

```yaml
contract:
  services:
    postgres:
      image: postgres:15-alpine
      env:
        POSTGRES_PASSWORD: postgres
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432
  steps:
    - uses: actions/checkout@v5
    - name: Set up Node
      uses: actions/setup-node@v6
      with:
        node-version: 22
        cache: 'npm'
    - name: Install dependencies
      run: npm ci
    - name: Set up Rust
      uses: actions-rust-lang/setup-rust-toolchain@v1
      with:
        toolchain: stable
        cache: true
    - name: Build and start Rust backend
      run: |
        cd graphql-rust-server
        cargo build --release
        nohup cargo run --release > /tmp/backend.log 2>&1 &
        sleep 5  # Wait for backend startup
    - name: Run contract tests
      run: npm run test:contract
```

### 3. PostgreSQL Not Running

**Problem:** Integration tests need PostgreSQL on port 5432

**Solution:** Add postgres service to integration job (same as contract)

### 4. Playwright/Vitest Framework Confusion

**Problem:** Two contract test files use Playwright syntax in Vitest suite

**Files:**

- `tests/contract/health-check.spec.ts`
- `tests/contract/seed-data.spec.ts`

**Solution:** Convert to Vitest syntax

```typescript
// Before (Playwright)
import { test, expect } from '@playwright/test';

test.describe('Health Check', () => {
	test('should return 200', async () => {
		// ...
	});
});

// After (Vitest)
import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
	it('should return 200', async () => {
		// ...
	});
});
```

### Files Changed (PR #66)

- `.cargo/config.toml` (create)
- `.github/workflows/smart-tests.yml` (modify contract + integration jobs)
- `tests/contract/health-check.spec.ts` (convert to Vitest)
- `tests/contract/seed-data.spec.ts` (convert to Vitest)

### Testing (PR #66)

- Push to `fix/ci-infrastructure` branch
- Verify Smart Test Selection workflow passes
- Verify contract tests run successfully with backend
- Verify integration tests run successfully with PostgreSQL
- Verify Rust tests compile without mold linker

## PR #67: Code Quality Fixes

**Branch:** `fix/code-quality` (from main after PR #66 merges)

### 1. Prettier Formatting

**Problem:** 15 files modified in PR #64 weren't formatted per PR #65 Prettier rules

**File Types:**

- 9 Markdown files (.md)
- 4 Svelte files (.svelte)
- 1 HTML file (.html)
- 1 TypeScript file (.ts)

**Solution:**

**Step 1:** Verify Prettier configuration includes all file types

Check `.prettierrc` or `package.json`:

```json
{
	"overrides": [
		{
			"files": "*.svelte",
			"options": {
				"parser": "svelte"
			}
		},
		{
			"files": ["*.md", "*.html"],
			"options": {
				"parser": "html"
			}
		}
	]
}
```

**Step 2:** Verify required Prettier plugins

Check `package.json` has:

- `prettier-plugin-svelte` (for .svelte files)

**Step 3:** Run Prettier

```bash
# Dry-run to verify changes
npx prettier --check \
  @AGENT.md \
  @fix_plan.md \
  docs/PASSWORD_RESET_FLOW.md \
  docs/performance-optimization-phase1-results.md \
  docs/plans/2026-01-15-performance-optimization-design.md \
  graphql-rust-server/src/templates/password_reset_email.html \
  PROMPT.md \
  README-WEBHOOK-DEV.md \
  src/lib/components/webhooks/WebhookSyncModal.svelte \
  src/routes/admin/settings/integrations/+page.svelte \
  src/routes/admin/settings/integrations/webhooks/+page.svelte \
  src/routes/api/webhooks/process/[batch_id]/progress/+server.ts \
  src/routes/auth/forgot-password/+page.svelte \
  src/routes/auth/reset-password/+page.svelte \
  WEBHOOK_IMPLEMENTATION.md

# Apply formatting
npx prettier --write [same file list]
```

### 2. Rust Benchmark Type Annotations

**Problem:** 12 type annotation errors in `benches/resolver_benchmarks.rs`

**Solution:** Add explicit types to closure parameters

**Location 1:** Line 275

```rust
// Before
group.bench_function("complex", |b| {
    b.to_async(&rt).iter(|| async {

// After
group.bench_function("complex", |b: &mut criterion::Bencher| {
    b.to_async(&rt).iter(|| async {
```

**Location 2:** Line 310

```rust
// Before
|b, &count| {
    b.to_async(&rt).iter(|| {

// After
|b: &mut criterion::Bencher, &count| {
    b.to_async(&rt).iter(|| {
```

### 3. Unused Variable

**Problem:** Unused variable `sql` in `graphql-rust-server/src/utils/query_debugger.rs:223`

**Solution:** Prefix with underscore to indicate intentionally unused

```rust
// Before
let sql = query.to_string();

// After
let _sql = query.to_string();
```

If the variable is truly not needed, remove the line entirely.

### Files Changed (PR #67)

- `.prettierrc` or `package.json` (verify/update if needed)
- 15 files (Prettier formatting)
- `graphql-rust-server/benches/resolver_benchmarks.rs` (type annotations)
- `graphql-rust-server/src/utils/query_debugger.rs` (unused variable)

### Testing (PR #67)

- `npm run lint` - should pass
- `npm run check` - should pass
- `npm run format` - should show no changes
- `cd graphql-rust-server && cargo test` - should pass
- `cd graphql-rust-server && cargo bench` - should compile

## PR #64 Revision: Performance Evaluation

**Branch:** `feature/performance-optimization` (rebase on main after PR #66 & #67 merge)

### Current Situation

Lighthouse metrics are **worse** than thresholds despite this being a "performance optimization" PR:

- **FCP:** 3156-3303ms (expected ≤1800ms) - **75% slower**
- **TTI:** 4012-4034ms (expected ≤3800ms) - **6% slower**
- **LCP:** 3156-3303ms (expected ≤2500ms) - **26% slower**
- **Speed Index:** 3156-3303ms (expected ≤3000ms) - **5% slower**

### Root Cause Analysis Required

PR #64 added:

- Minification enabled (`minify: 'esbuild'`)
- Manual chunk splitting for vendor code
- Dynamic imports for heavy components

**Expected:** Metrics improve (smaller bundles, faster load)
**Actual:** Metrics degraded

**Possible Causes:**

1. Chunk splitting created too many chunks (HTTP overhead)
2. Lazy loading delays critical content rendering
3. Initial bundle still too large despite splitting
4. Minification not applied correctly
5. Build artifacts not optimized for production

### Investigation Steps

After rebasing PR #64 on fixed main:

1. **Run production build locally**

   ```bash
   npm run build
   ```

2. **Analyze bundle sizes**

   ```bash
   npm run build -- --analyze
   # OR use vite-bundle-visualizer
   ```

3. **Compare actual chunks to design expectations**
   - Review `docs/plans/2026-01-15-performance-optimization-design.md`
   - Check if manual chunks match design
   - Verify vendor splitting is working

4. **Test Lighthouse locally**

   ```bash
   npm run preview
   # Run Lighthouse against localhost:4173
   ```

5. **Identify specific bottlenecks**
   - Which chunks are too large?
   - Which resources block rendering?
   - Is lazy loading helping or hurting?

### Potential Fixes

Based on investigation, adjust `vite.config.ts`:

**Option A:** Reduce chunk granularity (fewer chunks)
**Option B:** Preload critical chunks
**Option C:** Adjust lazy loading strategy
**Option D:** Optimize asset inlining threshold

### Decision Point

**Do NOT relax Lighthouse thresholds** until root cause is understood.

Performance optimization PR should improve metrics, not degrade them. If optimization strategy is flawed, fix the strategy rather than accepting worse performance.

## Success Metrics

### PR #66 Success

- ✅ Smart Test Selection workflow passes
- ✅ Contract tests run with backend service
- ✅ Integration tests run with PostgreSQL
- ✅ Rust tests compile without mold linker

### PR #67 Success

- ✅ Lint & Type Check passes
- ✅ All 15 files formatted correctly
- ✅ Rust benchmarks compile
- ✅ Backend tests pass

### PR #64 Success (After Revision)

- ✅ Lighthouse metrics **improve** from baseline
- ✅ FCP ≤ 1800ms
- ✅ TTI ≤ 3800ms
- ✅ LCP ≤ 2500ms
- ✅ Speed Index ≤ 3000ms
- ✅ All CI checks pass

## Timeline

- **PR #66:** 2-3 hours implementation + review
- **PR #67:** 1-2 hours implementation + review
- **PR #64 rebase:** 30 min rebase + 2-4 hours investigation/fixes

**Total:** 5-9 hours across 3 PRs

## Risk Mitigation

1. **CI config changes break other workflows**
   - Test Smart Test Selection thoroughly
   - Verify Full CI workflow still works
   - Check that backend/postgres services don't conflict

2. **Prettier config changes break existing files**
   - Use `--check` before `--write`
   - Review changes before committing
   - Run full lint suite after formatting

3. **Lighthouse investigation reveals fundamental issues**
   - Be prepared to revise performance optimization strategy
   - May need to remove lazy loading or adjust chunk splitting
   - Document findings for future optimization work

4. **Rebase conflicts**
   - PR #64 has been rebased multiple times already
   - Carefully resolve conflicts with PR #66/#67 changes
   - Re-test thoroughly after rebase

## Next Steps

1. ✅ Design approved
2. Create implementation plan using `superpowers:writing-plans`
3. Ask user: "Ready to set up for implementation?"
4. Execute PR #66 (CI Infrastructure)
5. Execute PR #67 (Code Quality)
6. Execute PR #64 revision (Performance Evaluation)

---

**Design by:** Claude Code Agent
**Approved by:** User (2026-01-15)
