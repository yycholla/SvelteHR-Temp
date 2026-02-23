# Module Usage Verification and Enforcement Design

**Date**: 2026-02-23
**Status**: Approved
**Approach**: Incremental with Continuous Validation

## Executive Summary

This design implements a comprehensive system to ensure hexagonal architecture modules are properly used throughout the application. While all 23 modules have been migrated to hexagonal architecture (domain → service → adapter), many routes still bypass the service layer and use direct GraphQL. This design provides audit, migration, and enforcement tooling to fix violations and prevent regressions.

**Timeline**: 3-4 weeks
**Scope**: ~80 routes across 23 modules
**Current State**: 15% compliant (12/80 routes)
**Target State**: 100% compliant with automated enforcement

## Problem Statement

### Current Situation

**Backend**: All 23 modules follow hexagonal architecture

- Employee, Department, Task, Event, Goal, etc.
- Domain layer → Service layer → Adapter layer → GraphQL

**Frontend/Routes**: Inconsistent usage

- ✅ **Compliant** (~15%): Employees, Departments use `createXXXService(event)`
- ❌ **Violations** (~85%): Tasks, Events, Training, etc. use direct GraphQL

### Example Violation

```typescript
// ❌ BAD: dashboard/tasks/+page.server.ts (current)
import { client } from '$lib/graphql/client';

const GET_TASKS_QUERY = `
  query GetTasks {
    tasks { id title status }
  }
`;

const result = await client.query(GET_TASKS_QUERY);
```

```typescript
// ✅ GOOD: dashboard/employees/+page.server.ts (compliant)
import { createEmployeeService } from '$lib/server/services';

const service = createEmployeeService(event);
const result = await service.getEmployees(filters);
```

### Impact

**Without enforcement:**

- Inconsistent architecture (some routes bypass service layer)
- Harder to maintain (GraphQL scattered across routes)
- Harder to test (mocking GraphQL vs mocking services)
- Easy to regress (no automated checks)

**With this system:**

- Consistent architecture (all routes use service layer)
- Centralized business logic (services, not routes)
- Easier testing (mock services, not GraphQL)
- Automated enforcement (ESLint + CI/CD)

## Approach: Incremental with Continuous Validation

### Phase 1: Audit + Dashboard (Days 1-2)

- Automated audit script with detailed reporting
- Interactive dashboard: violations by module, progress tracking
- Commit audit tooling for reuse

### Phase 2: Soft Enforcement (Day 2)

- Add ESLint rules in **warn mode** (shows violations but doesn't fail)
- Add TypeScript hints for service usage
- Developers see warnings but can still work

### Phase 3: Validated Migration (Weeks 1-3)

- Migrate module-by-module with validation gates:
  1. Pick module (e.g., Tasks)
  2. Update all Task routes to use TaskService
  3. Run tests - must pass 100%
  4. Commit with audit report update
- Repeat for all 23 modules

### Phase 4: Hard Enforcement (Week 4)

- Once all violations fixed, promote warnings → errors
- Update CI/CD to enforce
- Add pre-commit hooks

### Why This Approach?

- **Early visibility**: Audit + warnings immediately
- **Prevents regressions**: Soft enforcement from day 1
- **Validated progress**: Tests must pass per module
- **Safe promotion**: Only enforce errors when 100% clean

## Architecture

### System Overview

Three-layer verification system:

**1. Audit Layer** (Scanning & Reporting)

```
scripts/audit-module-usage.ts
    ↓ scans
src/routes/**/*.server.ts
    ↓ detects
Direct GraphQL vs Service Layer
    ↓ reports
docs/audits/module-usage-audit.{json,md}
```

**2. Enforcement Layer** (Static Analysis)

```
ESLint rules
    ↓ checks
Imports & inline queries
    ↓ warns/errors
Developer feedback
    ↓ blocks
Pre-commit + CI/CD
```

**3. Migration Layer** (Automated Fixes)

```
Migration helper
    ↓ generates
Service layer boilerplate
    ↓ runs
Automated tests
    ↓ verifies
Validation gates pass
```

### Directory Structure

```
scripts/
  audit-module-usage.ts          # Audit script (main)
  migrate-route-to-service.ts    # Migration helper (optional)

docs/
  audits/
    2026-02-23-module-usage-audit.md       # Human-readable report
    module-usage-audit.json                # Machine-readable data

.eslintrc.js                     # ESLint rules (warn → error)
package.json                     # npm scripts
```

### Data Flow

```
┌─────────────────┐
│ Audit Script    │
└────────┬────────┘
         │ scans
         ↓
┌─────────────────┐
│ Route Files     │
│ (80+ files)     │
└────────┬────────┘
         │ analyzes
         ↓
┌─────────────────┐
│ Violation       │
│ Detection       │
└────────┬────────┘
         │ categorizes
         ↓
┌─────────────────┐
│ Report          │
│ Generation      │
└────────┬────────┘
         │ outputs
         ↓
┌─────────────────┐
│ JSON + Markdown │
│ Reports         │
└─────────────────┘
```

## Components

### Component 1: Audit Script

**File**: `scripts/audit-module-usage.ts`

**Purpose**: Scan all routes, identify violations, generate reports

**Key Functions**:

```typescript
interface AuditResult {
	timestamp: string;
	totalRoutes: number;
	compliant: number;
	violations: number;
	complianceRate: string;
	byModule: Record<string, ModuleStats>;
	violationDetails: ViolationDetail[];
}

interface ModuleStats {
	total: number;
	compliant: number;
	violations: number;
}

interface ViolationDetail {
	path: string;
	module: string;
	violationType: 'direct-import' | 'inline-query';
	line?: number;
	suggestion: string;
}

async function auditRoutes(): Promise<AuditResult> {
	// 1. Find all +page.server.ts and +server.ts files
	const routes = await glob('src/routes/**/*.server.ts');

	// 2. Parse each file
	const results = await Promise.all(routes.map(analyzeRoute));

	// 3. Categorize by module
	const byModule = categorizeByModule(results);

	// 4. Calculate statistics
	const stats = calculateStats(results);

	// 5. Generate reports
	await generateReports(stats);

	return stats;
}

function isViolation(fileContent: string): boolean {
	// Returns true if:
	// - Imports from '$lib/graphql/client' or '$lib/graphql/jwt-client'
	// - Has inline GraphQL queries (const GET_*, QUERY_*, MUTATION_*)

	// Returns false if:
	// - Imports from '$lib/server/services' (createXXXService)

	const hasDirectImport = /from ['"](\$lib\/graphql\/(client|jwt-client))['"]/.test(fileContent);
	const hasInlineQuery = /const\s+(GET|QUERY|MUTATION)_[A-Z_]+\s*=\s*`/.test(fileContent);

	return hasDirectImport || hasInlineQuery;
}

function detectModule(filePath: string): string {
	// Extract module name from path
	// Example: 'src/routes/dashboard/tasks/+page.server.ts' → 'Task'
	const match = filePath.match(
		/\/(tasks|events|employees|departments|training|goals|performance-reviews)\//
	);
	return match ? capitalize(match[1].replace(/-/g, ' ')) : 'Unknown';
}
```

**Output Format**:

```json
{
	"timestamp": "2026-02-23T10:30:00Z",
	"totalRoutes": 80,
	"compliant": 12,
	"violations": 68,
	"complianceRate": "15%",
	"byModule": {
		"Employee": { "total": 6, "compliant": 6, "violations": 0 },
		"Department": { "total": 4, "compliant": 4, "violations": 0 },
		"Task": { "total": 5, "compliant": 0, "violations": 5 },
		"Event": { "total": 4, "compliant": 0, "violations": 4 },
		"Training": { "total": 3, "compliant": 0, "violations": 3 }
	},
	"violationDetails": [
		{
			"path": "src/routes/dashboard/tasks/+page.server.ts",
			"module": "Task",
			"violationType": "inline-query",
			"line": 45,
			"suggestion": "Replace with: import { createTaskService } from '$lib/server/services'"
		}
	]
}
```

**Markdown Output**:

```markdown
# Module Usage Audit Report

**Generated**: 2026-02-23 10:30:00
**Compliance**: 15% (12/80 routes)

## Summary

- ✅ **Compliant**: 12 routes
- ❌ **Violations**: 68 routes

## By Module

| Module     | Total | Compliant | Violations | Rate |
| ---------- | ----- | --------- | ---------- | ---- |
| Employee   | 6     | 6         | 0          | 100% |
| Department | 4     | 4         | 0          | 100% |
| Task       | 5     | 0         | 5          | 0%   |
| Event      | 4     | 0         | 4          | 0%   |

## Violations

### Task Module (5 violations)

- `src/routes/dashboard/tasks/+page.server.ts` (inline-query, line 45)
- `src/routes/dashboard/tasks/[id]/+page.server.ts` (direct-import, line 12)
```

**Usage**:

```bash
npm run audit:routes
# → Generates reports in docs/audits/
# → Displays summary in console
```

---

### Component 2: ESLint Rule

**File**: `.eslintrc.js`

**Purpose**: Prevent direct GraphQL usage in routes

**Implementation**:

```javascript
module.exports = {
	overrides: [
		{
			files: ['src/routes/**/*.server.ts', 'src/routes/**/*.server.js'],
			rules: {
				// Block direct GraphQL client imports
				'no-restricted-imports': [
					'warn',
					{
						// Start with 'warn', promote to 'error' later
						patterns: [
							{
								group: ['$lib/graphql/client', '$lib/graphql/jwt-client'],
								message:
									'Routes must use service layer. Import from "$lib/server/services" instead.\nExample: import { createTaskService } from "$lib/server/services"'
							}
						]
					}
				],

				// Block inline GraphQL queries
				'no-restricted-syntax': [
					'warn',
					{
						selector: 'VariableDeclarator[id.name=/^(GET|QUERY|MUTATION)_/]',
						message:
							'Inline GraphQL queries not allowed in routes. Use service layer methods instead.'
					}
				]
			}
		}
	]
};
```

**Promotion Path**:

```javascript
// Phase 2 (Day 2): Warn mode
'no-restricted-imports': ['warn', { ... }]

// Phase 4 (Week 4): Error mode (after migration complete)
'no-restricted-imports': ['error', { ... }]
```

**Developer Experience**:

```
⚠  warning  Routes must use service layer
   Import from "$lib/server/services" instead
   Example: import { createTaskService } from "$lib/server/services"

   src/routes/dashboard/tasks/+page.server.ts:10:8
```

---

### Component 3: Migration Helper (Optional)

**File**: `scripts/migrate-route-to-service.ts`

**Purpose**: Semi-automated route refactoring

**Capabilities**:

1. Detect which service to use based on route path or GraphQL query
2. Generate boilerplate code for service usage
3. Update imports automatically
4. Run tests to verify migration

**Usage**:

```bash
npm run migrate-route src/routes/dashboard/tasks/+page.server.ts

# Output:
# Analyzing route...
# Detected module: Task
# Suggested service: createTaskService
#
# Changes:
# - Remove: import { client } from '$lib/graphql/client'
# + Add: import { createTaskService } from '$lib/server/services'
#
# - Remove: const result = await client.query(GET_TASKS_QUERY)
# + Add: const result = await taskService.getAllTasks(filters)
#
# Apply changes? (y/n)
```

**Note**: This is optional - manual migration is often clearer for complex routes.

---

## Migration Strategy

### Module-by-Module Approach

**Order of Migration** (based on complexity):

1. **Wave 1** (Simple, low dependency):
   - Training (3 routes)
   - Compliance (2 routes)
   - Documents (4 routes)

2. **Wave 2** (Medium complexity):
   - Tasks (5 routes)
   - Goals (4 routes)
   - Events (4 routes)

3. **Wave 3** (Complex, high integration):
   - Performance Reviews (3 routes)
   - Onboarding (5 routes)
   - Attendance (3 routes)

4. **Wave 4** (Remaining modules):
   - Time Off Balance, Compensation, HrReport, etc.

### Per-Module Migration Process

```
┌─────────────────────┐
│ 1. Pick Module      │
│    (e.g., Tasks)    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ 2. Identify Routes  │
│    (5 task routes)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ 3. Migrate Routes   │
│    One by one       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ 4. Run Tests        │
│    Must pass 100%   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ 5. Commit           │
│    Per module       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ 6. Re-run Audit     │
│    Track progress   │
└─────────────────────┘
```

### Example Migration: Tasks Module

**Before** (`dashboard/tasks/+page.server.ts`):

```typescript
import type { PageServerLoad } from './$types';
import { client } from '$lib/graphql/client';

const GET_TASKS_QUERY = `
  query GetTasks($limit: Int!, $offset: Int!) {
    tasks(limit: $limit, offset: $offset) {
      id
      title
      status
      priority
      dueDate
    }
  }
`;

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 20;
	const offset = (page - 1) * limit;

	const result = await client.query(GET_TASKS_QUERY, { limit, offset }).toPromise();

	if (result.error) {
		return { tasks: [] };
	}

	return { tasks: result.data?.tasks || [] };
};
```

**After**:

```typescript
import type { PageServerLoad } from './$types';
import { createTaskService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	const { url } = event;

	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 20;

	const taskService = createTaskService(event);
	const result = await taskService.getAllTasks({
		page,
		limit
		// Add any filters from URL params
	});

	if (result.isError) {
		logger.error(`Failed to load tasks: ${result.error.message}`);
		return { tasks: [] };
	}

	return { tasks: result.value };
};
```

**Changes**:

- ✅ Import service instead of GraphQL client
- ✅ Use `createTaskService(event)` for authentication
- ✅ Use `getAllTasks()` instead of raw query
- ✅ Use `Result<T, E>` pattern instead of GraphQL errors
- ✅ Domain entities instead of raw GraphQL data

**Validation**:

```bash
# Run tests
npx vitest run src/routes/dashboard/tasks

# Re-run audit
npm run audit:routes
# → Progress: 17/80 (21%)
```

---

## Error Handling

### Audit Script Errors

**File Access Errors**:

```typescript
try {
	const content = await fs.readFile(filePath, 'utf-8');
} catch (error) {
	logger.warn(`Skipping unreadable file: ${filePath}`);
	stats.skippedFiles.push({ path: filePath, reason: 'unreadable' });
	continue; // Don't fail entire audit
}
```

**Parse Errors**:

```typescript
try {
	const ast = parseTypeScript(content);
} catch (error) {
	logger.warn(`Skipping unparseable file: ${filePath}`);
	stats.skippedFiles.push({ path: filePath, reason: 'parse-error' });
	continue; // Don't fail entire audit
}
```

**Graceful Degradation**:

- If 1 file fails → skip it, continue audit
- If entire audit fails → exit with error code, show partial results
- Always save partial results before exiting

### Migration Errors

**Test Failures**:

```typescript
const testResult = await runTests(`src/routes/dashboard/tasks`);

if (!testResult.success) {
	logger.error('Tests failed after migration!');
	logger.info('Rolling back changes...');
	await git.restore(modifiedFiles);
	throw new Error(`Migration failed: ${testResult.failures.length} tests failed`);
}
```

**Rollback Strategy**:

- Each migration commits immediately after verification
- If tests fail → `git restore` modified files
- Manual intervention required (don't auto-fix)

### ESLint Error Handling

**Warn Mode** (During Migration):

```javascript
'no-restricted-imports': ['warn', { ... }]
// Shows warning but doesn't block commit
```

**Error Mode** (After Migration):

```javascript
'no-restricted-imports': ['error', { ... }]
// Blocks commit if violation found
```

**Override Escape Hatch** (Emergency Only):

```typescript
// In rare cases where direct GraphQL is truly needed:
// eslint-disable-next-line no-restricted-imports
import { client } from '$lib/graphql/client';
// Justification: [specific reason why service layer cannot be used]
```

### Result Pattern in Migrated Code

**Before** (GraphQL errors):

```typescript
const result = await client.query(GET_TASKS);
if (result.error) {
	// CombinedError - hard to handle specifically
	return { tasks: [] };
}
```

**After** (Domain errors):

```typescript
const result = await taskService.getAllTasks(filters);
if (result.isError) {
	// Typed domain error - specific handling
	const error = result.error;
	logger.error(`Failed to load tasks: ${error.message}`);
	return { tasks: [], error: error.message };
}
```

---

## Testing Strategy

### 1. Audit Script Tests

**File**: `scripts/audit-module-usage.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
	isViolation,
	detectModule,
	categorizeByModule,
	calculateCompliance
} from './audit-module-usage';

describe('Audit Script', () => {
	describe('isViolation', () => {
		it('should detect direct GraphQL imports as violations', () => {
			const code = `import { client } from '$lib/graphql/client'`;
			expect(isViolation(code)).toBe(true);
		});

		it('should detect JWT client imports as violations', () => {
			const code = `import { jwtGraphQLClient } from '$lib/graphql/jwt-client'`;
			expect(isViolation(code)).toBe(true);
		});

		it('should detect inline GraphQL queries as violations', () => {
			const code = `const GET_TASKS = \`query { tasks { id } }\``;
			expect(isViolation(code)).toBe(true);
		});

		it('should detect service layer usage as compliant', () => {
			const code = `import { createTaskService } from '$lib/server/services'`;
			expect(isViolation(code)).toBe(false);
		});
	});

	describe('detectModule', () => {
		it('should extract module from path', () => {
			expect(detectModule('src/routes/dashboard/tasks/+page.server.ts')).toBe('Task');
			expect(detectModule('src/routes/dashboard/events/create/+page.server.ts')).toBe('Event');
		});
	});

	describe('categorizeByModule', () => {
		it('should group violations by module', () => {
			const violations = [
				{ path: 'dashboard/tasks/+page.server.ts', module: 'Task' },
				{ path: 'dashboard/tasks/[id]/+page.server.ts', module: 'Task' },
				{ path: 'dashboard/events/+page.server.ts', module: 'Event' }
			];

			const categorized = categorizeByModule(violations);

			expect(categorized.Task).toHaveLength(2);
			expect(categorized.Event).toHaveLength(1);
		});
	});

	describe('calculateCompliance', () => {
		it('should calculate compliance percentage', () => {
			const stats = { total: 80, compliant: 12, violations: 68 };
			expect(calculateCompliance(stats)).toBe(15);
		});
	});
});
```

**Run**: `npx vitest run scripts/audit-module-usage.test.ts`

---

### 2. Migration Validation Tests

**Per-Module Validation**:

```typescript
// File: scripts/validate-module-migration.test.ts

describe('Task Module Migration', () => {
	it('should have no direct GraphQL imports in task routes', async () => {
		const taskRoutes = await glob('src/routes/**/tasks/**/*.server.ts');

		for (const route of taskRoutes) {
			const content = await fs.readFile(route, 'utf-8');

			// Must not import direct GraphQL
			expect(content).not.toContain("from '$lib/graphql/client'");
			expect(content).not.toContain("from '$lib/graphql/jwt-client'");

			// Must not have inline queries
			expect(content).not.toMatch(/const\s+GET_[A-Z_]+\s*=/);
		}
	});

	it('should use TaskService in all task routes', async () => {
		const taskRoutes = await glob('src/routes/**/tasks/**/*.server.ts');

		for (const route of taskRoutes) {
			const content = await fs.readFile(route, 'utf-8');
			expect(content).toContain('createTaskService');
		}
	});

	it('should have all task route tests passing', async () => {
		const result = await execAsync('npx vitest run src/routes/**/tasks');
		expect(result.exitCode).toBe(0);
	});
});
```

**Run after each module migration**: `npm run validate:migration -- tasks`

---

### 3. ESLint Rule Tests

**File**: `tests/eslint-rules.test.ts`

```typescript
import { RuleTester } from 'eslint';
import noDirectGraphQL from '../.eslintrc.js';

const ruleTester = new RuleTester({
	parserOptions: { ecmaVersion: 2020, sourceType: 'module' }
});

ruleTester.run('no-direct-graphql-in-routes', noDirectGraphQL, {
	valid: [
		{
			code: `import { createTaskService } from '$lib/server/services'`,
			filename: 'src/routes/dashboard/tasks/+page.server.ts'
		},
		{
			code: `const service = createTaskService(event); const result = await service.getAllTasks();`,
			filename: 'src/routes/dashboard/tasks/+page.server.ts'
		}
	],

	invalid: [
		{
			code: `import { client } from '$lib/graphql/client'`,
			filename: 'src/routes/dashboard/tasks/+page.server.ts',
			errors: [{ message: /Use service layer/ }]
		},
		{
			code: `const GET_TASKS = \`query { tasks { id } }\``,
			filename: 'src/routes/dashboard/tasks/+page.server.ts',
			errors: [{ message: /Inline GraphQL queries not allowed/ }]
		}
	]
});
```

---

### 4. Integration Tests

**End-to-End Route Tests**:

```typescript
describe('Migrated Task Routes E2E', () => {
	test('GET /dashboard/tasks returns tasks via service layer', async () => {
		const response = await fetch('http://localhost:5173/dashboard/tasks');
		expect(response.status).toBe(200);

		const html = await response.text();
		expect(html).toContain('Tasks'); // Verify page renders
	});

	test('POST /dashboard/tasks/create creates task via service layer', async () => {
		const response = await fetch('http://localhost:5173/dashboard/tasks/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Test Task', priority: 'high' })
		});

		expect(response.status).toBe(201);
	});
});
```

**Run**: `npm run test:e2e:routes`

---

### 5. Regression Testing

**Full Suite After Each Module**:

```bash
# After migrating Tasks module
npm run audit:routes        # Verify progress decreased violations
npx vitest run --project unit-server  # All unit tests
mise run test:e2e          # All E2E tests
mise run check             # TypeScript
npm run build              # Verify build succeeds
```

**Success Criteria** (per module):

- ✅ Audit shows violations decreased
- ✅ All unit tests pass (5380+)
- ✅ All E2E tests pass
- ✅ No new TypeScript errors
- ✅ Build succeeds

---

## Timeline

### Phase 1: Audit + Dashboard (Days 1-2)

**Day 1:**

- Implement audit script
- Add unit tests
- Run initial audit → generate baseline report

**Day 2:**

- Refine report format (JSON + Markdown)
- Add progress tracking
- Commit audit tooling

**Deliverable**: Initial audit report showing 15% compliance

---

### Phase 2: Soft Enforcement (Day 2)

**Tasks:**

- Add ESLint rules (warn mode)
- Update .eslintrc.js
- Test linter on existing violations
- Commit enforcement tooling

**Deliverable**: ESLint warnings visible to developers

---

### Phase 3: Validated Migration (Weeks 1-3)

**Week 1: Simple Modules (Wave 1)**

- Training (3 routes)
- Compliance (2 routes)
- Documents (4 routes)
- **Target**: 30% compliance

**Week 2: Medium Modules (Wave 2)**

- Tasks (5 routes)
- Goals (4 routes)
- Events (4 routes)
- **Target**: 60% compliance

**Week 3: Complex Modules (Wave 3 + 4)**

- Performance Reviews (3 routes)
- Onboarding (5 routes)
- Attendance (3 routes)
- Remaining modules
- **Target**: 100% compliance

**Per Module**:

- Migrate routes (2-4 hours)
- Run tests (30 min)
- Commit (15 min)
- Re-run audit (5 min)

---

### Phase 4: Hard Enforcement (Week 4)

**Tasks:**

- Promote ESLint warnings → errors
- Add pre-commit hooks
- Update CI/CD to enforce
- Document patterns in CLAUDE.md
- Final audit report

**Deliverable**: 100% compliance with automated enforcement

---

## Success Criteria

### Immediate (After Phase 1)

- ✅ Audit script generates accurate reports
- ✅ Baseline compliance measured (15%)
- ✅ All violations documented

### Mid-term (After Phase 3)

- ✅ 100% routes use service layer
- ✅ All 5380+ unit tests passing
- ✅ No new TypeScript errors
- ✅ Build succeeds

### Long-term (After Phase 4)

- ✅ ESLint enforces service layer usage (error mode)
- ✅ CI/CD blocks direct GraphQL in routes
- ✅ Pattern documented for future development
- ✅ No regressions possible

---

## Maintenance

### Ongoing Monitoring

**Weekly Audit** (automated):

```bash
npm run audit:routes
# → Should always show 100% compliance
```

**CI/CD Check** (automated):

```yaml
# .github/workflows/ci.yml
- name: Verify Module Usage
  run: |
    npm run audit:routes
    # Fail if compliance < 100%
```

### Adding New Routes

**Developer Workflow**:

1. Create new route file
2. ESLint shows warning if using direct GraphQL
3. Import service from `$lib/server/services`
4. Tests must pass before commit
5. Pre-commit hook blocks direct GraphQL

**Example**:

```typescript
// ✅ Good: New route using service layer
import { createTaskService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	const service = createTaskService(event);
	// ...
};
```

### Adding New Modules

**When new module is added** (e.g., "Payroll"):

1. Create domain/service/adapter layers (hexagonal architecture)
2. Add service factory to `$lib/server/services.ts`
3. Use service in routes (not direct GraphQL)
4. ESLint enforces pattern automatically

---

## Risks and Mitigations

### Risk 1: Migration Introduces Bugs

**Mitigation**:

- Validation gates: tests must pass per module
- Manual testing after each module
- Rollback on test failure

### Risk 2: ESLint False Positives

**Mitigation**:

- Escape hatch available (eslint-disable-line)
- Only applies to route files (not all files)
- Warn mode first, error mode after validation

### Risk 3: Developer Resistance

**Mitigation**:

- Clear documentation of patterns
- Examples in CLAUDE.md
- Soft enforcement (warnings) during migration
- Hard enforcement only after 100% compliant

### Risk 4: Timeline Slips

**Mitigation**:

- Modular approach (can pause between modules)
- Parallel work possible (different modules)
- Optional migration helper tool

---

## References

- Hexagonal Architecture Migration: 23/23 modules complete
- Client-Side Service Container: `docs/plans/2026-02-23-client-service-container-design.md`
- Service Layer: `src/lib/server/services.ts`
- Domain Modules: `src/domain/*/`

---

## Appendices

### Appendix A: Module Inventory

| Module             | Routes | Current State | Priority |
| ------------------ | ------ | ------------- | -------- |
| Employee           | 6      | ✅ Compliant  | -        |
| Department         | 4      | ✅ Compliant  | -        |
| Task               | 5      | ❌ Violations | High     |
| Event              | 4      | ❌ Violations | High     |
| Training           | 3      | ❌ Violations | Medium   |
| Goal               | 4      | ❌ Violations | Medium   |
| Performance Review | 3      | ❌ Violations | Medium   |
| Onboarding         | 5      | ❌ Violations | Low      |
| Document           | 4      | ❌ Violations | Low      |
| Attendance         | 3      | ❌ Violations | Low      |
| ...                | ...    | ...           | ...      |

### Appendix B: Example Commands

```bash
# Audit
npm run audit:routes

# Migrate (optional helper)
npm run migrate-route src/routes/dashboard/tasks/+page.server.ts

# Validate migration
npm run validate:migration -- tasks

# Enforce (after migration)
npm run lint -- --fix
```

### Appendix C: Service Layer Cheat Sheet

```typescript
// ❌ OLD: Direct GraphQL
import { client } from '$lib/graphql/client';
const result = await client.query(GET_TASKS);

// ✅ NEW: Service Layer
import { createTaskService } from '$lib/server/services';
const service = createTaskService(event);
const result = await service.getAllTasks(filters);

// Error handling
if (result.isError) {
	logger.error(result.error.message);
	return { tasks: [] };
}

return { tasks: result.value };
```

---

**End of Design Document**
