# PR #64 CI Failures - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 8 CI failures on PR #64 using a three-PR layered approach (infrastructure, code quality, performance evaluation)

**Architecture:** Three sequential PRs branching from main - PR #66 fixes CI infrastructure (mold linker, services, test framework), PR #67 fixes code quality (prettier, type annotations), PR #64 rebases and investigates Lighthouse regression

**Tech Stack:** GitHub Actions workflows, Cargo (Rust), Vite, Prettier, Vitest, Playwright

---

## Task 1: Create PR #66 Branch (CI Infrastructure)

**Files:**

- Branch: Create `fix/ci-infrastructure` from main

**Step 1: Switch to main branch and pull latest**

```bash
cd /home/chanway/Projects/SvelteHR
git checkout main
git pull origin main
```

Run: `git status`
Expected: "On branch main, Your branch is up to date"

**Step 2: Create and checkout new branch**

```bash
git checkout -b fix/ci-infrastructure
```

Run: `git branch`
Expected: Shows `* fix/ci-infrastructure`

**Step 3: Verify clean working directory**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 4: Commit branch creation**

No commit needed yet - just branch creation.

---

## Task 2: Fix Mold Linker Configuration

**Files:**

- Create: `.cargo/config.toml`

**Step 1: Create Cargo configuration file**

Create `.cargo/config.toml` with conditional linker setup:

```toml
# Rust linker configuration
# CI environments use default clang linker
# Developers can override locally with: export RUSTFLAGS="-C link-arg=-fuse-ld=mold"

[target.x86_64-unknown-linux-gnu]
linker = "clang"
```

**Step 2: Verify file syntax**

```bash
cat .cargo/config.toml
```

Expected: File contents display correctly

**Step 3: Test Rust compilation still works**

```bash
cd graphql-rust-server
cargo check
```

Expected: Compilation succeeds without mold linker errors

**Step 4: Commit**

```bash
cd ..
git add .cargo/config.toml
git commit -m "fix(ci): Use default clang linker instead of mold

Mold linker is not available in CI environments. Configure Cargo to use
clang as linker, allowing CI builds to succeed while developers can
still use mold locally via RUSTFLAGS environment variable.

Fixes: Rust Tests (Smart Selection) compilation failure"
```

---

## Task 3: Fix Backend Service for Contract Tests

**Files:**

- Modify: `.github/workflows/smart-tests.yml`

**Step 1: Read current smart-tests workflow**

```bash
cat .github/workflows/smart-tests.yml | head -100
```

Expected: View workflow structure to understand where to add backend service

**Step 2: Locate contract test job**

```bash
grep -n "contract:" .github/workflows/smart-tests.yml
```

Expected: Find line number where contract job is defined

**Step 3: Add postgres service and backend startup to contract job**

Modify `.github/workflows/smart-tests.yml` in the `contract` job:

```yaml
contract:
  name: Frontend Tests (Smart Selection) (contract)
  runs-on: blacksmith-4vcpu-ubuntu-2404
  if: needs.check-changes.outputs.run_contract == 'true'
  needs: [backend-test, check-changes]
  services:
    postgres:
      image: postgres:15-alpine
      env:
        POSTGRES_DB: postgres
        POSTGRES_USER: postgres
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

    # Add Rust toolchain and backend startup
    - name: Set up Rust
      uses: actions-rust-lang/setup-rust-toolchain@v1
      with:
        toolchain: stable
        cache: true

    - name: Build and start Rust backend
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
      run: |
        cd graphql-rust-server
        cargo build --release
        nohup cargo run --release > /tmp/backend.log 2>&1 &
        sleep 5
        echo "Backend started, checking health..."
        curl -f http://localhost:4000/health || (cat /tmp/backend.log && exit 1)

    - name: Run affected contract tests
      run: npm run test:contract
```

**Step 4: Verify YAML syntax**

```bash
# Check YAML is valid
npx js-yaml .github/workflows/smart-tests.yml > /dev/null
```

Expected: No syntax errors

**Step 5: Commit**

```bash
git add .github/workflows/smart-tests.yml
git commit -m "fix(ci): Add backend service to contract tests

Contract tests expect GraphQL backend on port 4000 but Smart Test
Selection workflow wasn't starting it. Added:
- Postgres service for backend database
- Rust toolchain setup
- Backend build and startup with health check
- Proper environment variables

Fixes: Frontend Tests (contract) - ECONNREFUSED port 4000"
```

---

## Task 4: Fix PostgreSQL Service for Integration Tests

**Files:**

- Modify: `.github/workflows/smart-tests.yml`

**Step 1: Locate integration test job**

```bash
grep -n "integration:" .github/workflows/smart-tests.yml
```

Expected: Find line number where integration job is defined

**Step 2: Add postgres service to integration job**

Modify `.github/workflows/smart-tests.yml` in the `integration` job:

```yaml
integration:
  name: Frontend Tests (Smart Selection) (integration)
  runs-on: blacksmith-4vcpu-ubuntu-2404
  if: needs.check-changes.outputs.run_integration == 'true'
  needs: [backend-test, check-changes]
  services:
    postgres:
      image: postgres:15-alpine
      env:
        POSTGRES_DB: postgres
        POSTGRES_USER: postgres
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

    - name: Run affected integration tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
      run: npm run test:integration
```

**Step 3: Verify YAML syntax**

```bash
npx js-yaml .github/workflows/smart-tests.yml > /dev/null
```

Expected: No syntax errors

**Step 4: Commit**

```bash
git add .github/workflows/smart-tests.yml
git commit -m "fix(ci): Add PostgreSQL service to integration tests

Integration tests connect to PostgreSQL on port 5432 but Smart Test
Selection workflow wasn't providing it. Added postgres service with:
- Postgres 15 alpine image
- Health checks
- Port mapping
- Database connection environment variables

Fixes: Frontend Tests (integration) - ECONNREFUSED port 5432"
```

---

## Task 5: Convert Playwright Syntax to Vitest (health-check.spec.ts)

**Files:**

- Modify: `tests/contract/health-check.spec.ts`

**Step 1: Read current file to understand structure**

```bash
cat tests/contract/health-check.spec.ts
```

Expected: See Playwright imports and `test.describe()` syntax

**Step 2: Convert Playwright imports to Vitest**

Modify `tests/contract/health-check.spec.ts`:

```typescript
// Change FROM:
import { test, expect } from '@playwright/test';

// Change TO:
import { describe, it, expect } from 'vitest';
```

**Step 3: Convert test.describe to describe**

Search and replace in the file:

- `test.describe(` → `describe(`
- `test(` → `it(`

**Step 4: Verify file compiles**

```bash
npx tsc --noEmit tests/contract/health-check.spec.ts
```

Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add tests/contract/health-check.spec.ts
git commit -m "fix(tests): Convert health-check.spec.ts from Playwright to Vitest

This contract test was using Playwright syntax (test.describe) in a
Vitest suite, causing 'test.describe() not expected here' errors.

Changes:
- Import from 'vitest' instead of '@playwright/test'
- Use describe() instead of test.describe()
- Use it() instead of test()

Fixes: Frontend Tests (contract) - Playwright/Vitest framework confusion"
```

---

## Task 6: Convert Playwright Syntax to Vitest (seed-data.spec.ts)

**Files:**

- Modify: `tests/contract/seed-data.spec.ts`

**Step 1: Read current file**

```bash
cat tests/contract/seed-data.spec.ts
```

Expected: See Playwright imports and syntax

**Step 2: Convert imports and syntax (same as Task 5)**

Modify `tests/contract/seed-data.spec.ts`:

- Change imports from Playwright to Vitest
- Replace `test.describe(` with `describe(`
- Replace `test(` with `it(`

**Step 3: Verify file compiles**

```bash
npx tsc --noEmit tests/contract/seed-data.spec.ts
```

Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add tests/contract/seed-data.spec.ts
git commit -m "fix(tests): Convert seed-data.spec.ts from Playwright to Vitest

Same fix as health-check.spec.ts - convert from Playwright to Vitest
syntax to resolve framework confusion errors.

Fixes: Frontend Tests (contract) - Playwright/Vitest framework confusion"
```

---

## Task 7: Push PR #66 and Create Pull Request

**Files:**

- None (GitHub operations)

**Step 1: Push branch to remote**

```bash
git push -u origin fix/ci-infrastructure
```

Expected: Branch pushed successfully

**Step 2: Create pull request**

```bash
gh pr create --title "fix: CI infrastructure for Smart Test Selection" --body "$(cat <<'EOF'
## Summary
Fixes 4 CI infrastructure failures preventing Smart Test Selection from running:
- Mold linker not available in CI (Rust compilation fails)
- Backend service not running for contract tests
- PostgreSQL not running for integration tests
- Playwright/Vitest framework confusion in contract tests

## Changes
- Add `.cargo/config.toml` to use clang linker instead of mold
- Add backend service startup to contract tests workflow
- Add PostgreSQL service to integration tests workflow
- Convert 2 contract test files from Playwright to Vitest syntax

## Testing
- ✅ Rust compilation works without mold linker
- ✅ Contract tests can connect to backend on port 4000
- ✅ Integration tests can connect to PostgreSQL on port 5432
- ✅ Contract test files use correct Vitest syntax

## Fixes
- Rust Tests (Smart Selection) - mold linker compilation error
- Frontend Tests (contract) - backend connection + framework confusion
- Frontend Tests (integration) - PostgreSQL connection

Closes #XX (reference issue if exists)
EOF
)"
```

Expected: PR created with URL returned

**Step 3: Verify PR checks start running**

```bash
gh pr view --web
```

Expected: Browser opens to PR, CI checks are queued/running

---

## Task 8: Create PR #67 Branch (Code Quality)

**Files:**

- Branch: Create `fix/code-quality` from main

**Step 1: Wait for PR #66 to merge**

**IMPORTANT:** Do NOT proceed until PR #66 is reviewed, approved, and merged to main.

Check PR #66 status:

```bash
gh pr view fix/ci-infrastructure --json state,mergeable
```

Expected: `"state": "MERGED"`

**Step 2: Switch to main and pull latest**

```bash
git checkout main
git pull origin main
```

Expected: Includes PR #66 changes

**Step 3: Create and checkout code quality branch**

```bash
git checkout -b fix/code-quality
```

Run: `git branch`
Expected: Shows `* fix/code-quality`

---

## Task 9: Verify and Update Prettier Configuration

**Files:**

- Read: `.prettierrc` or `package.json`
- Possibly modify: `.prettierrc` or `package.json`

**Step 1: Check if .prettierrc exists**

```bash
cat .prettierrc 2>/dev/null || echo "No .prettierrc file"
```

Expected: Either shows config or "No .prettierrc file"

**Step 2: Check prettier config in package.json**

```bash
cat package.json | jq '.prettier'
```

Expected: Shows prettier configuration or null

**Step 3: Verify prettier-plugin-svelte is installed**

```bash
cat package.json | jq '.devDependencies["prettier-plugin-svelte"]'
```

Expected: Shows version number (e.g., "^3.2.0")

**Step 4: Check if configuration supports all file types**

Look for overrides for:

- `*.svelte` files
- `*.md` files
- `*.html` files

If configuration is missing or incomplete, update it:

```json
{
	"prettier": {
		"useTabs": true,
		"singleQuote": true,
		"trailingComma": "none",
		"printWidth": 100,
		"plugins": ["prettier-plugin-svelte"],
		"overrides": [
			{
				"files": "*.svelte",
				"options": {
					"parser": "svelte"
				}
			}
		]
	}
}
```

**Step 5: If changes were needed, commit**

```bash
# Only if config was updated
git add .prettierrc  # or package.json
git commit -m "chore: Ensure Prettier config supports all file types

Verify configuration includes parsers for .svelte, .md, and .html files
to support formatting of all 15 files that need formatting."
```

---

## Task 10: Run Prettier on 15 Files

**Files:**

- Modify: 15 files needing formatting (listed below)

**Step 1: Create list of files to format**

```bash
cat > /tmp/prettier-files.txt <<'EOF'
@AGENT.md
@fix_plan.md
docs/PASSWORD_RESET_FLOW.md
docs/performance-optimization-phase1-results.md
docs/plans/2026-01-15-performance-optimization-design.md
graphql-rust-server/src/templates/password_reset_email.html
PROMPT.md
README-WEBHOOK-DEV.md
src/lib/components/webhooks/WebhookSyncModal.svelte
src/routes/admin/settings/integrations/+page.svelte
src/routes/admin/settings/integrations/webhooks/+page.svelte
src/routes/api/webhooks/process/[batch_id]/progress/+server.ts
src/routes/auth/forgot-password/+page.svelte
src/routes/auth/reset-password/+page.svelte
WEBHOOK_IMPLEMENTATION.md
EOF
```

**Step 2: Dry-run to see what would change**

```bash
npx prettier --check $(cat /tmp/prettier-files.txt)
```

Expected: Shows which files need formatting

**Step 3: Apply formatting**

```bash
npx prettier --write $(cat /tmp/prettier-files.txt)
```

Expected: "Checking formatting... All matched files use Prettier code style!" or shows formatted files

**Step 4: Verify lint passes**

```bash
npm run lint
```

Expected: No linting errors

**Step 5: Commit**

```bash
git add -A
git commit -m "style: Format 15 files with Prettier

Apply Prettier formatting to files modified in PR #64 that weren't
formatted according to PR #65 rules. Includes:
- 9 Markdown files
- 4 Svelte files
- 1 HTML file
- 1 TypeScript file

Fixes: Lint & Type Check - Prettier formatting violations"
```

---

## Task 11: Fix Rust Benchmark Type Annotations

**Files:**

- Modify: `graphql-rust-server/benches/resolver_benchmarks.rs`

**Step 1: Read the file to find lines 275 and 310**

```bash
cat graphql-rust-server/benches/resolver_benchmarks.rs | sed -n '270,280p'
```

Expected: See closure without type annotation at line 275

```bash
cat graphql-rust-server/benches/resolver_benchmarks.rs | sed -n '305,315p'
```

Expected: See closure without type annotation at line 310

**Step 2: Add type annotation at line 275**

Modify `graphql-rust-server/benches/resolver_benchmarks.rs` line 275:

```rust
// FROM:
group.bench_function("complex", |b| {

// TO:
group.bench_function("complex", |b: &mut criterion::Bencher| {
```

**Step 3: Add type annotation at line 310**

Modify same file at line 310:

```rust
// FROM:
|b, &count| {

// TO:
|b: &mut criterion::Bencher, &count| {
```

**Step 4: Verify benchmark compiles**

```bash
cd graphql-rust-server
cargo bench --no-run
```

Expected: Compilation succeeds without type annotation errors

**Step 5: Commit**

```bash
cd ..
git add graphql-rust-server/benches/resolver_benchmarks.rs
git commit -m "fix(bench): Add explicit types to benchmark closures

Rust compiler requires type annotations for benchmark closure
parameters. Added '&mut criterion::Bencher' type to closures at:
- Line 275 (complex benchmark)
- Line 310 (parameterized benchmark)

Fixes: Benchmark Comparison - 12 type annotation errors"
```

---

## Task 12: Fix Unused Variable in query_debugger.rs

**Files:**

- Modify: `graphql-rust-server/src/utils/query_debugger.rs:223`

**Step 1: Read the context around line 223**

```bash
cat graphql-rust-server/src/utils/query_debugger.rs | sed -n '220,230p'
```

Expected: See `let sql = query.to_string();` line

**Step 2: Determine if variable is truly unused**

Check if `sql` is referenced later in the function:

```bash
cat graphql-rust-server/src/utils/query_debugger.rs | sed -n '223,250p' | grep -n "sql"
```

Expected: If only line 1 shows `sql`, it's unused. If other lines reference it, it's used for debugging.

**Step 3: Fix by prefixing with underscore**

Modify `graphql-rust-server/src/utils/query_debugger.rs` line 223:

```rust
// FROM:
let sql = query.to_string();

// TO:
let _sql = query.to_string();
```

This indicates the variable is intentionally unused (possibly for debugging).

**Step 4: Verify backend tests compile**

```bash
cd graphql-rust-server
cargo test --no-run
```

Expected: Compilation succeeds without unused variable warning

**Step 5: Commit**

```bash
cd ..
git add graphql-rust-server/src/utils/query_debugger.rs
git commit -m "fix(backend): Prefix unused sql variable with underscore

Variable 'sql' at line 223 is not used, causing compilation warning
with -D warnings flag. Prefixed with underscore to indicate intentional
(likely kept for debugging purposes).

Fixes: Backend Tests (Rust) - unused variable error"
```

---

## Task 13: Push PR #67 and Create Pull Request

**Files:**

- None (GitHub operations)

**Step 1: Run full test suite locally**

```bash
npm run lint
npm run check
npm run test
cd graphql-rust-server && cargo test && cd ..
```

Expected: All checks pass

**Step 2: Push branch to remote**

```bash
git push -u origin fix/code-quality
```

Expected: Branch pushed successfully

**Step 3: Create pull request**

```bash
gh pr create --title "fix: Code quality issues (formatting, type annotations, unused vars)" --body "$(cat <<'EOF'
## Summary
Fixes 3 code quality failures caught by linters and compilers:
- 15 files need Prettier formatting
- Rust benchmark type annotation errors
- Unused variable in backend code

## Changes
- Run Prettier on 15 files (9 .md, 4 .svelte, 1 .html, 1 .ts)
- Add explicit types to benchmark closure parameters
- Prefix unused `sql` variable with underscore

## Testing
- ✅ `npm run lint` passes
- ✅ `npm run check` passes
- ✅ `cargo test` passes
- ✅ `cargo bench --no-run` compiles successfully

## Fixes
- Lint & Type Check - Prettier formatting violations
- Benchmark Comparison - type annotation errors
- Backend Tests (Rust) - unused variable warning

Depends on: #XX (PR #66)
EOF
)"
```

Expected: PR created with URL returned

**Step 4: Verify PR checks pass**

```bash
gh pr view --web
```

Expected: All CI checks pass (green)

---

## Task 14: Rebase PR #64 on Updated Main

**Files:**

- Branch: `feature/performance-optimization`

**Step 1: Wait for PR #67 to merge**

**IMPORTANT:** Do NOT proceed until PR #67 is merged to main.

Check PR #67 status:

```bash
gh pr view fix/code-quality --json state
```

Expected: `"state": "MERGED"`

**Step 2: Switch to performance-optimization branch**

```bash
git checkout feature/performance-optimization
```

**Step 3: Fetch latest main**

```bash
git fetch origin main
```

**Step 4: Rebase on main**

```bash
git rebase origin/main
```

Expected: Rebase completes successfully (may have conflicts to resolve)

**Step 5: If conflicts, resolve them**

```bash
# If conflicts occur:
git status  # See conflicting files
# Edit conflicting files to resolve
git add <resolved-files>
git rebase --continue
```

**Step 6: Force push rebased branch**

```bash
git push --force-with-lease origin feature/performance-optimization
```

Expected: Branch updated on remote

---

## Task 15: Investigate Lighthouse Performance Regression

**Files:**

- None initially (investigation phase)

**Step 1: Run production build locally**

```bash
npm run build
```

Expected: Build completes successfully

**Step 2: Check build output sizes**

```bash
ls -lh .svelte-kit/output/client/_app/immutable/chunks/
```

Expected: See chunk file sizes

**Step 3: Run local preview server**

```bash
npm run preview &
sleep 3
```

Expected: Preview server running on port 4173

**Step 4: Run Lighthouse locally**

```bash
# Install Lighthouse if not already installed
npm install -g @lhci/cli

# Run Lighthouse audit
lhci autorun --collect.url=http://localhost:4173 --collect.numberOfRuns=1
```

Expected: Get Lighthouse scores (FCP, TTI, LCP, Speed Index)

**Step 5: Compare metrics to thresholds**

Current thresholds:

- FCP: ≤ 1800ms
- TTI: ≤ 3800ms
- LCP: ≤ 2500ms
- Speed Index: ≤ 3000ms

Actual metrics from investigation:

- FCP: ~3156-3303ms (75% slower than threshold)
- TTI: ~4012-4034ms (6% slower)
- LCP: ~3156-3303ms (26% slower)
- Speed Index: ~3156-3303ms (5% slower)

**Step 6: Analyze bundle with vite-bundle-visualizer**

```bash
npm install -D vite-bundle-visualizer
npm run build -- --mode analyze
```

Expected: Opens visualization showing chunk sizes

**Step 7: Document findings**

Create notes in `/tmp/lighthouse-investigation.md`:

```markdown
# Lighthouse Investigation - PR #64

## Current Metrics

- FCP: Xms (threshold: 1800ms)
- TTI: Xms (threshold: 3800ms)
- LCP: Xms (threshold: 2500ms)
- Speed Index: Xms (threshold: 3000ms)

## Bundle Analysis

- Total bundle size: X MB
- Largest chunks: [list]
- Number of chunks: X

## Root Cause Hypothesis

[Describe why metrics are worse]

## Proposed Fixes

[List specific changes to improve metrics]
```

**Step 8: Stop preview server**

```bash
killall node  # Or find and kill preview process
```

---

## Task 16: Fix Lighthouse Issues (Based on Investigation)

**Files:**

- Will depend on investigation findings
- Likely: `vite.config.ts`

**IMPORTANT:** The specific fixes will depend on what Task 15 uncovers. Common scenarios:

### Scenario A: Chunks are too granular

**Problem:** Too many small chunks cause HTTP overhead

**Fix:** Reduce chunk granularity in `vite.config.ts`:

```typescript
manualChunks: {
  // Combine related libraries
  'vendor-core': ['svelte', '@urql/svelte', '@urql/core', 'graphql'],
  'vendor-ui': ['bits-ui', '@vincjo/datatables', 'svelte-select'],
  // Remove overly specific chunks
}
```

### Scenario B: Lazy loading delays critical content

**Problem:** Important content is lazy-loaded, delaying FCP/LCP

**Fix:** Remove lazy loading from critical components, preload important chunks

### Scenario C: Initial bundle still too large

**Problem:** Main chunk includes too much code

**Fix:** More aggressive code splitting for routes:

```typescript
// In route files
export const load = async () => {
	const heavy = await import('$lib/heavy-module');
	// ...
};
```

**Step 1-N:** Will be determined based on investigation

**Final Step: Commit fixes**

```bash
git add <modified-files>
git commit -m "perf: Fix Lighthouse regression

[Describe specific changes based on investigation]

Metrics improved:
- FCP: Xms → Yms
- LCP: Xms → Yms
- etc.

Related: Performance optimization PR #64"
```

---

## Task 17: Verify All CI Checks Pass

**Files:**

- None (verification only)

**Step 1: Push updated PR #64**

```bash
git push --force-with-lease origin feature/performance-optimization
```

Expected: Branch updated

**Step 2: Wait for CI to complete**

```bash
gh pr checks feature/performance-optimization --watch
```

Expected: All checks pass (green)

**Step 3: Verify each check individually**

```bash
gh pr view 64 --json statusCheckRollup --jq '.statusCheckRollup[] | {name: .name, conclusion: .conclusion}'
```

Expected output:

```json
{"name":"Lint & Type Check","conclusion":"SUCCESS"}
{"name":"Rust Tests (Smart Selection)","conclusion":"SUCCESS"}
{"name":"Frontend Tests (contract)","conclusion":"SUCCESS"}
{"name":"Frontend Tests (integration)","conclusion":"SUCCESS"}
{"name":"Benchmark Comparison","conclusion":"SUCCESS"}
{"name":"Lighthouse Performance Audit","conclusion":"SUCCESS"}
{"name":"Backend Tests (Rust)","conclusion":"SUCCESS"}
{"name":"Unit Tests (Frontend)","conclusion":"SUCCESS"}
```

**Step 4: If any check fails, investigate and fix**

```bash
# For each failed check:
gh run view --job <job-id> --log
# Identify issue, fix, commit, push
```

---

## Task 18: Update PR #64 Description

**Files:**

- None (GitHub PR metadata)

**Step 1: Update PR description to reflect fixes**

```bash
gh pr edit 64 --body "$(cat <<'EOF'
## Summary
Performance optimizations for SvelteKit application:
- Enable minification in production builds
- Implement manual chunk splitting for vendor libraries
- Add dynamic imports for heavy components

## Changes
- Update `vite.config.ts` with minification and chunk splitting strategy
- Add lazy loading utilities
- Implement lazy-loaded components in dashboard, reports, time-off pages

## Performance Improvements
**After investigation and fixes:**
- FCP: X% improvement
- LCP: X% improvement
- TTI: X% improvement
- Speed Index: X% improvement

**Bundle size:**
- Before: X MB
- After: Y MB (Z% reduction)

## Testing
- ✅ All CI checks pass
- ✅ Lighthouse metrics meet thresholds
- ✅ Build produces optimized chunks
- ✅ No runtime errors or regressions

## Depends On
- #XX (PR #66 - CI infrastructure fixes)
- #XX (PR #67 - Code quality fixes)
EOF
)"
```

**Step 2: Request review**

```bash
gh pr ready 64  # Mark as ready for review if draft
```

---

## Success Criteria

### PR #66 Success

- ✅ Smart Test Selection workflow passes
- ✅ Contract tests connect to backend on port 4000
- ✅ Integration tests connect to PostgreSQL on port 5432
- ✅ Rust tests compile without mold linker
- ✅ Contract tests use Vitest syntax (no Playwright confusion)

### PR #67 Success

- ✅ Lint & Type Check passes
- ✅ All 15 files formatted with Prettier
- ✅ Rust benchmarks compile with type annotations
- ✅ Backend tests pass (unused variable fixed)

### PR #64 Success

- ✅ All 8 CI checks pass (green)
- ✅ Lighthouse metrics meet or exceed thresholds:
  - FCP ≤ 1800ms
  - TTI ≤ 3800ms
  - LCP ≤ 2500ms
  - Speed Index ≤ 3000ms
- ✅ Bundle size reduced from baseline
- ✅ No functional regressions

## Rollback Plan

If issues arise:

**PR #66:** Revert `.github/workflows/smart-tests.yml` changes, remove `.cargo/config.toml`

**PR #67:** Revert formatting commits (won't break functionality)

**PR #64:** Revert to commit before Lighthouse fixes, investigate further

---

**Total Estimated Time:** 6-10 hours across 3 PRs

**Execution Order:**

1. PR #66 (2-3 hours) → Merge
2. PR #67 (1-2 hours) → Merge
3. PR #64 investigation + fixes (3-5 hours) → Merge
