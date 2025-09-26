# Quickstart: MCP-First and Test-First Svelte 5 Compatibility

**Branch**: `015-using-npm-run` | **Date**: 2025-09-26 | **Phase**: 1

## Prerequisites

- Node.js environment with npm available
- SvelteHR project repository checked out
- Serena MCP server active and accessible
- Vitest and Playwright test frameworks configured
- Constitutional compliance understanding

## Constitutional Workflow

### Step 1: MCP Onboarding (MANDATORY)

Before any coding task, verify MCP onboarding:

```typescript
// CRITICAL: First step for every development session
mcp__serena__check_onboarding_performed();
```

**Expected Response**:

```json
{
	"onboarding_complete": true,
	"memories_available": ["project_overview", "codebase_architecture", "code_style_conventions"],
	"constitutional_compliance": true
}
```

**If onboarding not complete**: Must complete onboarding before proceeding

### Step 2: MCP Code Discovery (MANDATORY)

Use Serena MCP tools for code analysis:

```typescript
// CRITICAL: Analyze codebase before any changes
mcp__serena__list_dir('src/lib/components/ui');
mcp__serena__find_file('*.svelte', 'src/routes');
mcp__serena__get_symbols_overview('src/lib/components/ui/toast-container.svelte');
mcp__serena__search_for_pattern('\\$errorStore\\.errors', { context_lines_after: 2 });
```

**Expected Discovery**:

- File locations and structure
- Symbol definitions and relationships
- Problematic patterns identified
- Impact analysis completed

### Step 3: Test-First Development (RED Phase - MANDATORY)

Write failing tests before any implementation:

```typescript
// CRITICAL: Test must fail initially
describe('Store Subscription Compatibility', () => {
	test('errorStore subscription works with Svelte 5 runes', () => {
		const component = render(ToastContainer);

		// This should fail initially due to $errorStore.errors syntax
		expect(component.queryByText('Test error')).not.toBeInTheDocument();
		errorStore.errors.add({ id: 'test', message: 'Test error' });
		expect(component.getByText('Test error')).toBeInTheDocument();
	});
});
```

**Validation**:

```bash
# Test MUST fail before implementation
npm run test -- toast-container.test.ts
# Expected: FAIL - TypeError: Cannot read property 'subscribe' of undefined
```

### Step 4: MCP Implementation (GREEN Phase - MANDATORY)

Use Serena MCP tools for surgical modifications:

```typescript
// CRITICAL: Use MCP tools, never manual editing
mcp__serena__think_about_task_adherence();

// Analyze current implementation
mcp__serena__find_symbol('script', 'src/lib/components/ui/toast-container.svelte', {
	include_body: true
});

// Make surgical edit
mcp__serena__replace_symbol_body(
	'script',
	'src/lib/components/ui/toast-container.svelte',
	corrected_script_content
);

// Validate impact
mcp__serena__find_referencing_symbols('errorStore', 'src/lib/stores/error.ts');
```

**Validation**:

```bash
# Test MUST pass after implementation
npm run test -- toast-container.test.ts
# Expected: PASS - Component subscribes correctly
```

### Step 5: Build Validation (MANDATORY)

Verify zero tolerance requirement:

```bash
# CRITICAL: Must achieve zero warnings
npm run build
```

**Expected Output (Success)**:

```
✓ Building for production...
✓ Generated build in 12.34s
✓ Zero warnings detected
✓ Zero errors detected
```

**Expected Output (Failure)**:

```
⚠ Building for production...
⚠ 3 warnings detected:
  - [Must use MCP tools to analyze and fix]
```

### Step 6: Refactor Phase (MANDATORY)

Improve code quality while keeping tests passing:

```typescript
// CRITICAL: Maintain test passing status
mcp__serena__replace_symbol_body(
  "script",
  "src/lib/components/ui/toast-container.svelte",
  improved_script_content_with_types
)

// Verify tests still pass
npm run test -- toast-container.test.ts
```

## Test Categories and Patterns

### 1. Store Subscription Tests (Vitest)

**File**: `src/lib/components/ui/toast-container.test.ts`

```typescript
import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import ToastContainer from './toast-container.svelte';
import { errorStore } from '$lib/stores/error';

describe('Store Subscription Compatibility', () => {
	test('errorStore subscription works with Svelte 5 runes', () => {
		// RED: This should fail initially
		const component = render(ToastContainer);
		expect(component.queryByText('Test error')).not.toBeInTheDocument();

		errorStore.errors.add({ id: 'test', message: 'Test error' });
		expect(component.getByText('Test error')).toBeInTheDocument();
	});
});
```

### 2. State Reference Capture Tests (Vitest)

**File**: `src/routes/dashboard/employees/directory/+page.test.ts`

```typescript
import { render } from '@testing-library/svelte';
import { describe, test, expect } from 'vitest';
import EmployeeDirectory from './+page.svelte';

describe('State Reference Capture', () => {
	test('filters state reactivity works correctly', () => {
		// RED: This should fail initially
		const mockFilters = { searchTerm: '', departmentFilter: 'all' };
		const component = render(EmployeeDirectory, { data: { filters: mockFilters } });

		// Test that state changes are properly captured and reactive
		expect(component.getByDisplayValue('')).toBeInTheDocument();
	});
});
```

### 3. Runtime Error Prevention (Playwright E2E)

**File**: `tests/e2e/svelte5-compatibility.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Dashboard loads without JavaScript errors', async ({ page }) => {
	const consoleErrors = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') consoleErrors.push(msg.text());
	});

	await page.goto('/dashboard');
	await page.waitForLoadState('networkidle');

	// RED: This should fail initially due to store subscription errors
	expect(consoleErrors).toHaveLength(0);
});
```

## Constitutional Compliance Checklist

### Before Each Task

- [ ] ✅ `mcp__serena__check_onboarding_performed()` completed
- [ ] ✅ MCP code discovery performed
- [ ] ✅ Failing test written (RED phase)
- [ ] ✅ Test failure confirmed and analyzed

### During Implementation

- [ ] ✅ `mcp__serena__think_about_task_adherence()` called
- [ ] ✅ Only MCP tools used for code changes
- [ ] ✅ `mcp__serena__replace_symbol_body()` for surgical edits
- [ ] ✅ Impact analysis with `mcp__serena__find_referencing_symbols()`

### After Implementation

- [ ] ✅ Test passes (GREEN phase)
- [ ] ✅ Build achieves zero warnings
- [ ] ✅ Refactoring completed (REFACTOR phase)
- [ ] ✅ `mcp__serena__think_about_whether_you_are_done()` called

## Batch Testing Protocol

### Batch 1: Critical Store Subscription Fixes

**Target**: Runtime errors that break functionality
**Files**: Components with `$errorStore.errors` patterns
**Tests**: Store subscription unit tests
**Validation**: Test toast notifications and error handling

**Constitutional Workflow**:

1. MCP Discovery → Identify all store subscription issues
2. RED Phase → Write failing unit tests for each component
3. GREEN Phase → Fix with `mcp__serena__replace_symbol_body()`
4. REFACTOR → Improve error handling and TypeScript types

### Batch 2: Critical State Reference Capture

**Target**: State reactivity failures
**Files**: Components with `$state(filters.property)` patterns
**Tests**: State reactivity unit tests
**Validation**: Test component reactivity and data flow

**Constitutional Workflow**:

1. MCP Discovery → Analyze state reference patterns
2. RED Phase → Write failing reactivity tests
3. GREEN Phase → Fix with proper reactive patterns
4. REFACTOR → Optimize state management patterns

### Batch 3: Event Handler Migration

**Target**: Event handler deprecation warnings
**Files**: Components using `on:event` syntax
**Tests**: User interaction E2E tests
**Validation**: Test form submissions and interactions

**Constitutional Workflow**:

1. MCP Discovery → Find all deprecated event handlers
2. RED Phase → Write failing interaction tests
3. GREEN Phase → Migrate to `onevent` attributes
4. REFACTOR → Improve event handling patterns

## User Validation Protocol

After each batch, provide feedback in this format:

```markdown
## Constitutional Compliance Validation

**Batch ID**: [mcp-store-fixes-001 | mcp-state-fixes-002 | etc.]
**MCP Tools Used**: [list of Serena MCP tools used]
**Test Coverage**: [unit/integration/e2e tests written and passing]
**Constitutional Compliance**: ✅/❌

### Build Results

- ✅/❌ `npm run build` completes with zero warnings
- ✅/❌ Zero errors detected
- ✅/❌ MCP analysis performed on all changes

### Test Results

- ✅/❌ RED phase: Tests failed initially
- ✅/❌ GREEN phase: Tests pass after implementation
- ✅/❌ REFACTOR phase: Code improved while tests pass
- ✅/❌ Test coverage >90% maintained

### Runtime Validation

- ✅/❌ Dashboard loads correctly
- ✅/❌ No JavaScript errors in console
- ✅/❌ All functionality preserved

### Constitutional Compliance

- ✅/❌ MCP-First Development followed
- ✅/❌ Test-First Development followed
- ✅/❌ No manual editing performed
- ✅/❌ All quality gates passed

### Response Required

Please respond with:

- ✅ CONSTITUTIONAL_PASS - Ready for next batch
- ❌ CONSTITUTIONAL_FAIL - [describe violations found]

**Do not proceed to next batch until user confirms CONSTITUTIONAL_PASS.**
```

## Error Recovery

### MCP Tool Failures

- If MCP tool fails → Use alternative MCP tool approach
- If onboarding fails → Complete onboarding before proceeding
- If analysis incomplete → Retry with different parameters
- **NEVER** fall back to manual editing (constitutional violation)

### Test Failures

- If test won't fail initially → Review test to ensure it captures actual issue
- If test fails after fix → Use MCP tools to analyze and adjust
- If test becomes flaky → Rewrite with more stable patterns
- **NEVER** skip tests (constitutional violation)

### Constitutional Violations

- If manual editing detected → Revert and use MCP tools
- If TDD cycle broken → Return to RED phase
- If onboarding skipped → Complete before any coding
- **ALL** violations must be remedied before proceeding

## Completion Criteria

### Individual Task Complete

- ✅ RED-GREEN-REFACTOR cycle completed
- ✅ MCP tools used for all code changes
- ✅ Tests passing with >90% coverage
- ✅ Build achieves zero warnings
- ✅ Constitutional compliance verified

### Batch Complete

- ✅ All tasks in batch meet individual criteria
- ✅ User validation confirms CONSTITUTIONAL_PASS
- ✅ No regressions in functionality
- ✅ Performance maintained or improved

### Project Complete

- ✅ All critical/breaking issues resolved (focus on breaking first)
- ✅ Zero tolerance requirement met
- ✅ Full constitutional compliance maintained
- ✅ User confirms all functionality preserved
