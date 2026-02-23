# Module Usage Verification and Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal**: Create audit, enforcement, and migration tooling to ensure all 80 routes use hexagonal architecture service layer instead of direct GraphQL.

**Architecture**: Three-layer system: Audit Layer (scanning/reporting) → Enforcement Layer (ESLint rules) → Migration Layer (validation tests). Incremental approach with soft enforcement during migration, hard enforcement after 100% compliance.

**Tech Stack**: TypeScript, Vitest, ESLint, glob, fast-glob, AST parsing (optional)

---

## Phase 1: Audit Script Foundation

### Task 1: Set Up Audit Script Structure

**Files:**

- Create: `scripts/audit-module-usage.ts`
- Create: `scripts/audit-module-usage.test.ts`
- Create: `docs/audits/.gitkeep`

**Step 1: Write the failing test**

```typescript
// scripts/audit-module-usage.test.ts
import { describe, it, expect } from 'vitest';
import { isViolation, detectModule } from './audit-module-usage';

describe('Audit Module Usage', () => {
	describe('isViolation', () => {
		it('should detect direct GraphQL client imports as violations', () => {
			const code = `import { client } from '$lib/graphql/client';`;
			expect(isViolation(code)).toBe(true);
		});

		it('should detect JWT client imports as violations', () => {
			const code = `import { jwtGraphQLClient } from '$lib/graphql/jwt-client';`;
			expect(isViolation(code)).toBe(true);
		});

		it('should detect inline GraphQL queries as violations', () => {
			const code = `const GET_TASKS = \`query GetTasks { tasks { id } }\`;`;
			expect(isViolation(code)).toBe(true);
		});

		it('should detect service layer usage as compliant', () => {
			const code = `import { createTaskService } from '$lib/server/services';`;
			expect(isViolation(code)).toBe(false);
		});

		it('should handle empty strings', () => {
			expect(isViolation('')).toBe(false);
		});
	});

	describe('detectModule', () => {
		it('should extract module from tasks path', () => {
			expect(detectModule('src/routes/dashboard/tasks/+page.server.ts')).toBe('Task');
		});

		it('should extract module from events path', () => {
			expect(detectModule('src/routes/dashboard/events/create/+page.server.ts')).toBe('Event');
		});

		it('should handle performance-reviews with hyphen', () => {
			expect(detectModule('src/routes/dashboard/performance-reviews/+page.server.ts')).toBe(
				'PerformanceReview'
			);
		});

		it('should return Unknown for non-module paths', () => {
			expect(detectModule('src/routes/+page.server.ts')).toBe('Unknown');
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: FAIL - "Cannot find module './audit-module-usage'"

**Step 3: Write minimal implementation**

```typescript
// scripts/audit-module-usage.ts

/**
 * Detects if route file contains violations (direct GraphQL usage)
 */
export function isViolation(fileContent: string): boolean {
	if (!fileContent || fileContent.trim() === '') {
		return false;
	}

	// Pattern 1: Direct GraphQL client imports
	const hasDirectImport =
		/from\s+['"](\$lib\/graphql\/client|(\$lib\/graphql\/jwt-client))['"]/.test(fileContent);

	// Pattern 2: Inline GraphQL queries
	const hasInlineQuery = /const\s+(GET|QUERY|MUTATION)_[A-Z_]+\s*=\s*`/.test(fileContent);

	return hasDirectImport || hasInlineQuery;
}

/**
 * Extracts module name from file path
 */
export function detectModule(filePath: string): string {
	// Match known module paths in routes
	const match = filePath.match(
		/\/(tasks|events|employees|departments|training|goals|performance-reviews|onboarding|documents|attendance|notifications|time-off-balance|compensation|hr-reports|emergency-contacts|vehicles|skills|certifications|user-settings|compliance|activity-logs|audit-log)\//
	);

	if (!match) {
		return 'Unknown';
	}

	// Convert kebab-case to PascalCase
	const moduleName = match[1];
	return moduleName
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: PASS (10/10 tests)

**Step 5: Commit**

```bash
git add scripts/audit-module-usage.ts scripts/audit-module-usage.test.ts docs/audits/.gitkeep
git commit -m "feat(audit): add violation detection and module extraction"
```

---

### Task 2: Implement Route Scanning

**Files:**

- Modify: `scripts/audit-module-usage.ts`
- Modify: `scripts/audit-module-usage.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to scripts/audit-module-usage.test.ts

import { scanRouteFile } from './audit-module-usage';

describe('scanRouteFile', () => {
	it('should identify violation with direct import', async () => {
		const mockContent = `
import { client } from '$lib/graphql/client';
export const load = async () => {
  const result = await client.query(GET_TASKS);
};
`;
		const result = scanRouteFile('src/routes/dashboard/tasks/+page.server.ts', mockContent);

		expect(result.isViolation).toBe(true);
		expect(result.violationType).toContain('direct-import');
		expect(result.module).toBe('Task');
	});

	it('should identify compliant route with service layer', async () => {
		const mockContent = `
import { createTaskService } from '$lib/server/services';
export const load = async (event) => {
  const service = createTaskService(event);
};
`;
		const result = scanRouteFile('src/routes/dashboard/tasks/+page.server.ts', mockContent);

		expect(result.isViolation).toBe(false);
		expect(result.module).toBe('Task');
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: FAIL - "scanRouteFile is not a function"

**Step 3: Write minimal implementation**

```typescript
// Add to scripts/audit-module-usage.ts

export interface RouteViolation {
	path: string;
	module: string;
	isViolation: boolean;
	violationType: string[];
	suggestion: string;
}

/**
 * Scans a single route file for violations
 */
export function scanRouteFile(filePath: string, content: string): RouteViolation {
	const module = detectModule(filePath);
	const isViolating = isViolation(content);

	const violationType: string[] = [];
	let suggestion = '';

	if (isViolating) {
		// Detect specific violation types
		if (/from\s+['"](\$lib\/graphql\/(client|jwt-client))['"]/.test(content)) {
			violationType.push('direct-import');
		}
		if (/const\s+(GET|QUERY|MUTATION)_[A-Z_]+\s*=\s*`/.test(content)) {
			violationType.push('inline-query');
		}

		// Generate suggestion based on module
		const serviceFactoryName = `create${module}Service`;
		suggestion = `Replace with: import { ${serviceFactoryName} } from '$lib/server/services'`;
	}

	return {
		path: filePath,
		module,
		isViolation: isViolating,
		violationType,
		suggestion
	};
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: PASS (12/12 tests)

**Step 5: Commit**

```bash
git add scripts/audit-module-usage.ts scripts/audit-module-usage.test.ts
git commit -m "feat(audit): add route file scanning with violation detection"
```

---

### Task 3: Implement Statistics and Categorization

**Files:**

- Modify: `scripts/audit-module-usage.ts`
- Modify: `scripts/audit-module-usage.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to scripts/audit-module-usage.test.ts

import { categorizeByModule, calculateStats } from './audit-module-usage';

describe('categorizeByModule', () => {
	it('should group violations by module', () => {
		const violations: RouteViolation[] = [
			{
				path: 'dashboard/tasks/+page.server.ts',
				module: 'Task',
				isViolation: true,
				violationType: ['direct-import'],
				suggestion: ''
			},
			{
				path: 'dashboard/tasks/[id]/+page.server.ts',
				module: 'Task',
				isViolation: true,
				violationType: ['inline-query'],
				suggestion: ''
			},
			{
				path: 'dashboard/events/+page.server.ts',
				module: 'Event',
				isViolation: true,
				violationType: ['direct-import'],
				suggestion: ''
			}
		];

		const categorized = categorizeByModule(violations);

		expect(categorized.Task).toHaveLength(2);
		expect(categorized.Event).toHaveLength(1);
	});
});

describe('calculateStats', () => {
	it('should calculate correct statistics', () => {
		const allRoutes: RouteViolation[] = [
			{ path: 'a', module: 'Task', isViolation: true, violationType: [], suggestion: '' },
			{ path: 'b', module: 'Task', isViolation: false, violationType: [], suggestion: '' },
			{ path: 'c', module: 'Event', isViolation: true, violationType: [], suggestion: '' }
		];

		const stats = calculateStats(allRoutes);

		expect(stats.totalRoutes).toBe(3);
		expect(stats.compliant).toBe(1);
		expect(stats.violations).toBe(2);
		expect(stats.complianceRate).toBe('33%');
		expect(stats.byModule.Task.total).toBe(2);
		expect(stats.byModule.Task.violations).toBe(1);
		expect(stats.byModule.Event.violations).toBe(1);
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: FAIL - "categorizeByModule is not a function"

**Step 3: Write minimal implementation**

```typescript
// Add to scripts/audit-module-usage.ts

export interface ModuleStats {
	total: number;
	compliant: number;
	violations: number;
}

export interface AuditStats {
	timestamp: string;
	totalRoutes: number;
	compliant: number;
	violations: number;
	complianceRate: string;
	byModule: Record<string, ModuleStats>;
	violationDetails: RouteViolation[];
}

/**
 * Groups violations by module
 */
export function categorizeByModule(violations: RouteViolation[]): Record<string, RouteViolation[]> {
	const byModule: Record<string, RouteViolation[]> = {};

	for (const violation of violations) {
		if (!byModule[violation.module]) {
			byModule[violation.module] = [];
		}
		byModule[violation.module].push(violation);
	}

	return byModule;
}

/**
 * Calculates overall statistics from all routes
 */
export function calculateStats(allRoutes: RouteViolation[]): AuditStats {
	const totalRoutes = allRoutes.length;
	const violations = allRoutes.filter((r) => r.isViolation);
	const compliant = totalRoutes - violations.length;
	const complianceRate = totalRoutes > 0 ? Math.round((compliant / totalRoutes) * 100) : 0;

	// Calculate per-module stats
	const byModule: Record<string, ModuleStats> = {};

	for (const route of allRoutes) {
		if (!byModule[route.module]) {
			byModule[route.module] = { total: 0, compliant: 0, violations: 0 };
		}

		byModule[route.module].total++;
		if (route.isViolation) {
			byModule[route.module].violations++;
		} else {
			byModule[route.module].compliant++;
		}
	}

	return {
		timestamp: new Date().toISOString(),
		totalRoutes,
		compliant,
		violations: violations.length,
		complianceRate: `${complianceRate}%`,
		byModule,
		violationDetails: violations
	};
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: PASS (14/14 tests)

**Step 5: Commit**

```bash
git add scripts/audit-module-usage.ts scripts/audit-module-usage.test.ts
git commit -m "feat(audit): add statistics calculation and module categorization"
```

---

### Task 4: Implement Report Generation

**Files:**

- Modify: `scripts/audit-module-usage.ts`
- Create: `scripts/audit-module-usage.test.ts` (test for report generation)

**Step 1: Write the failing test**

```typescript
// Add to scripts/audit-module-usage.test.ts

import { generateMarkdownReport, generateJsonReport } from './audit-module-usage';

describe('Report Generation', () => {
	const mockStats: AuditStats = {
		timestamp: '2026-02-23T10:00:00Z',
		totalRoutes: 10,
		compliant: 3,
		violations: 7,
		complianceRate: '30%',
		byModule: {
			Task: { total: 5, compliant: 1, violations: 4 },
			Event: { total: 3, compliant: 2, violations: 1 },
			Employee: { total: 2, compliant: 0, violations: 2 }
		},
		violationDetails: [
			{
				path: 'src/routes/dashboard/tasks/+page.server.ts',
				module: 'Task',
				isViolation: true,
				violationType: ['direct-import'],
				suggestion: 'Replace with: import { createTaskService } from "$lib/server/services"'
			}
		]
	};

	describe('generateMarkdownReport', () => {
		it('should generate valid markdown with summary', () => {
			const markdown = generateMarkdownReport(mockStats);

			expect(markdown).toContain('# Module Usage Audit Report');
			expect(markdown).toContain('**Compliance**: 30% (3/10 routes)');
			expect(markdown).toContain('## By Module');
			expect(markdown).toContain('| Task');
		});

		it('should include violation details', () => {
			const markdown = generateMarkdownReport(mockStats);

			expect(markdown).toContain('## Violations');
			expect(markdown).toContain('src/routes/dashboard/tasks/+page.server.ts');
			expect(markdown).toContain('direct-import');
		});
	});

	describe('generateJsonReport', () => {
		it('should generate valid JSON', () => {
			const json = generateJsonReport(mockStats);
			const parsed = JSON.parse(json);

			expect(parsed.totalRoutes).toBe(10);
			expect(parsed.compliant).toBe(3);
			expect(parsed.complianceRate).toBe('30%');
		});
	});
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: FAIL - "generateMarkdownReport is not a function"

**Step 3: Write minimal implementation**

```typescript
// Add to scripts/audit-module-usage.ts

/**
 * Generates markdown report from audit statistics
 */
export function generateMarkdownReport(stats: AuditStats): string {
	const lines: string[] = [];

	// Header
	lines.push('# Module Usage Audit Report');
	lines.push('');
	lines.push(`**Generated**: ${new Date(stats.timestamp).toLocaleString()}`);
	lines.push(
		`**Compliance**: ${stats.complianceRate} (${stats.compliant}/${stats.totalRoutes} routes)`
	);
	lines.push('');

	// Summary
	lines.push('## Summary');
	lines.push('');
	lines.push(`- ✅ **Compliant**: ${stats.compliant} routes`);
	lines.push(`- ❌ **Violations**: ${stats.violations} routes`);
	lines.push('');

	// By Module Table
	lines.push('## By Module');
	lines.push('');
	lines.push('| Module | Total | Compliant | Violations | Rate |');
	lines.push('| ------ | ----- | --------- | ---------- | ---- |');

	for (const [module, moduleStats] of Object.entries(stats.byModule)) {
		const rate =
			moduleStats.total > 0 ? Math.round((moduleStats.compliant / moduleStats.total) * 100) : 0;
		lines.push(
			`| ${module} | ${moduleStats.total} | ${moduleStats.compliant} | ${moduleStats.violations} | ${rate}% |`
		);
	}

	lines.push('');

	// Violation Details
	if (stats.violationDetails.length > 0) {
		lines.push('## Violations');
		lines.push('');

		// Group by module
		const byModule = categorizeByModule(stats.violationDetails);

		for (const [module, violations] of Object.entries(byModule)) {
			lines.push(`### ${module} Module (${violations.length} violations)`);
			lines.push('');

			for (const violation of violations) {
				lines.push(`- \`${violation.path}\` (${violation.violationType.join(', ')})`);
				if (violation.suggestion) {
					lines.push(`  - **Suggestion**: ${violation.suggestion}`);
				}
			}

			lines.push('');
		}
	}

	return lines.join('\n');
}

/**
 * Generates JSON report from audit statistics
 */
export function generateJsonReport(stats: AuditStats): string {
	return JSON.stringify(stats, null, 2);
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run scripts/audit-module-usage.test.ts
```

Expected: PASS (16/16 tests)

**Step 5: Commit**

```bash
git add scripts/audit-module-usage.ts scripts/audit-module-usage.test.ts
git commit -m "feat(audit): add markdown and JSON report generation"
```

---

### Task 5: Implement Main Audit Runner

**Files:**

- Modify: `scripts/audit-module-usage.ts`
- Modify: `package.json`

**Step 1: Add imports and main function**

```typescript
// Add to top of scripts/audit-module-usage.ts
import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';

// Add at end of file
/**
 * Main audit function - scans all route files
 */
export async function auditRoutes(): Promise<AuditStats> {
	console.log('🔍 Scanning route files...\n');

	// Find all server-side route files
	const routeFiles = await glob('src/routes/**/*.server.ts', {
		ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts']
	});

	console.log(`Found ${routeFiles.length} route files\n`);

	// Scan each file
	const results: RouteViolation[] = [];

	for (const filePath of routeFiles) {
		try {
			const content = await fs.readFile(filePath, 'utf-8');
			const result = scanRouteFile(filePath, content);
			results.push(result);
		} catch (error) {
			console.warn(`⚠️  Skipping unreadable file: ${filePath}`);
		}
	}

	// Calculate statistics
	const stats = calculateStats(results);

	// Generate reports
	const auditDir = 'docs/audits';
	await fs.mkdir(auditDir, { recursive: true });

	const timestamp = new Date().toISOString().split('T')[0];
	const markdownPath = path.join(auditDir, `${timestamp}-module-usage-audit.md`);
	const jsonPath = path.join(auditDir, 'module-usage-audit.json');

	await fs.writeFile(markdownPath, generateMarkdownReport(stats));
	await fs.writeFile(jsonPath, generateJsonReport(stats));

	console.log('📊 Audit Report:\n');
	console.log(`Total Routes: ${stats.totalRoutes}`);
	console.log(`✅ Compliant: ${stats.compliant}`);
	console.log(`❌ Violations: ${stats.violations}`);
	console.log(`📈 Compliance Rate: ${stats.complianceRate}\n`);

	console.log(`📄 Reports saved:`);
	console.log(`  - ${markdownPath}`);
	console.log(`  - ${jsonPath}\n`);

	return stats;
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
	auditRoutes()
		.then((stats) => {
			// Exit with error code if compliance is below threshold
			const complianceNum = parseInt(stats.complianceRate);
			if (complianceNum < 100) {
				console.log(`⚠️  Compliance below 100% (${stats.complianceRate})`);
				process.exit(1);
			}
		})
		.catch((error) => {
			console.error('❌ Audit failed:', error);
			process.exit(1);
		});
}
```

**Step 2: Add npm script**

```json
// Add to package.json scripts section
{
	"scripts": {
		"audit:routes": "tsx scripts/audit-module-usage.ts"
	}
}
```

**Step 3: Run audit script**

```bash
npm run audit:routes
```

Expected: Output shows compliance rate, generates reports in `docs/audits/`

**Step 4: Verify reports created**

```bash
ls -la docs/audits/
cat docs/audits/2026-02-23-module-usage-audit.md | head -20
```

Expected: Markdown report with summary table

**Step 5: Commit**

```bash
git add scripts/audit-module-usage.ts package.json docs/audits/*.md docs/audits/*.json
git commit -m "feat(audit): add main audit runner with report generation"
```

---

## Phase 2: ESLint Enforcement

### Task 6: Add ESLint Rules for Route Files

**Files:**

- Modify: `.eslintrc.cjs`

**Step 1: Read current ESLint config**

```bash
cat .eslintrc.cjs | grep -A 10 "overrides"
```

Expected: See existing overrides (if any)

**Step 2: Add route-specific ESLint rules**

```javascript
// Modify .eslintrc.cjs - add to overrides array

module.exports = {
	// ... existing config ...
	overrides: [
		// ... existing overrides ...
		{
			// Apply to server-side route files only
			files: ['src/routes/**/*.server.ts', 'src/routes/**/*.server.js'],
			rules: {
				// Block direct GraphQL client imports
				'no-restricted-imports': [
					'warn', // Start with warn, promote to 'error' after migration complete
					{
						patterns: [
							{
								group: ['$lib/graphql/client', '$lib/graphql/jwt-client'],
								message:
									'Routes must use service layer. Import from "$lib/server/services" instead.\nExample: import { createTaskService } from "$lib/server/services"'
							}
						]
					}
				],

				// Block inline GraphQL queries (variables starting with GET_, QUERY_, MUTATION_)
				'no-restricted-syntax': [
					'warn',
					{
						selector: 'VariableDeclarator[id.name=/^(GET|QUERY|MUTATION)_/]',
						message:
							'Inline GraphQL queries not allowed in routes. Use service layer methods instead.\nExample: const service = createTaskService(event); const result = await service.getAllTasks();'
					}
				]
			}
		}
	]
};
```

**Step 3: Test ESLint on known violation**

```bash
npx eslint src/routes/dashboard/tasks/+page.server.ts
```

Expected: See warnings about GraphQL imports (if violations exist)

**Step 4: Test ESLint on compliant route**

```bash
npx eslint src/routes/dashboard/employees/+page.server.ts
```

Expected: No warnings

**Step 5: Commit**

```bash
git add .eslintrc.cjs
git commit -m "feat(lint): add ESLint rules to detect direct GraphQL in routes"
```

---

### Task 7: Create Migration Validation Tests

**Files:**

- Create: `scripts/validate-module-migration.test.ts`

**Step 1: Write validation test template**

```typescript
// scripts/validate-module-migration.test.ts
import { describe, it, expect } from 'vitest';
import { glob } from 'glob';
import * as fs from 'fs/promises';

describe('Module Migration Validation', () => {
	describe('Task Module', () => {
		it('should have no direct GraphQL imports in task routes', async () => {
			const taskRoutes = await glob('src/routes/**/tasks/**/*.server.ts');

			for (const route of taskRoutes) {
				const content = await fs.readFile(route, 'utf-8');

				// Must not import direct GraphQL
				expect(content, `${route} has direct GraphQL import`).not.toContain(
					"from '$lib/graphql/client'"
				);
				expect(content, `${route} has JWT client import`).not.toContain(
					"from '$lib/graphql/jwt-client'"
				);
			}
		});

		it('should have no inline GraphQL queries in task routes', async () => {
			const taskRoutes = await glob('src/routes/**/tasks/**/*.server.ts');

			for (const route of taskRoutes) {
				const content = await fs.readFile(route, 'utf-8');

				// Must not have inline queries
				expect(content, `${route} has inline GraphQL query`).not.toMatch(
					/const\s+(GET|QUERY|MUTATION)_[A-Z_]+\s*=/
				);
			}
		});

		it('should use TaskService in all task routes', async () => {
			const taskRoutes = await glob('src/routes/**/tasks/**/*.server.ts');

			expect(taskRoutes.length, 'No task routes found').toBeGreaterThan(0);

			for (const route of taskRoutes) {
				const content = await fs.readFile(route, 'utf-8');
				expect(content, `${route} does not use createTaskService`).toContain('createTaskService');
			}
		});
	});

	// Template for other modules (add after Task migration)
	describe.skip('Event Module', () => {
		it('should use EventService in all event routes', async () => {
			const eventRoutes = await glob('src/routes/**/events/**/*.server.ts');

			for (const route of eventRoutes) {
				const content = await fs.readFile(route, 'utf-8');
				expect(content).toContain('createEventService');
			}
		});
	});
});
```

**Step 2: Run validation tests (will fail initially)**

```bash
npx vitest run scripts/validate-module-migration.test.ts
```

Expected: FAIL - Task routes still have violations

**Step 3: Commit validation framework**

```bash
git add scripts/validate-module-migration.test.ts
git commit -m "test(migration): add module migration validation tests"
```

---

## Phase 3: Example Migration - Tasks Module

### Task 8: Migrate dashboard/tasks/+page.server.ts

**Files:**

- Modify: `src/routes/dashboard/tasks/+page.server.ts`

**Step 1: Read current implementation**

```bash
cat src/routes/dashboard/tasks/+page.server.ts
```

Expected: See direct GraphQL usage

**Step 2: Create backup**

```bash
cp src/routes/dashboard/tasks/+page.server.ts src/routes/dashboard/tasks/+page.server.ts.backup
```

**Step 3: Replace with service layer implementation**

```typescript
// src/routes/dashboard/tasks/+page.server.ts
import type { PageServerLoad } from './$types';
import { createTaskService } from '$lib/server/services';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { url } = event;

	// Parse pagination from URL
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 20;

	// Parse filters from URL
	const status = url.searchParams.get('status') || undefined;
	const priority = url.searchParams.get('priority') || undefined;
	const assigneeId = url.searchParams.get('assignee') || undefined;

	// Create authenticated service
	const taskService = createTaskService(event);

	// Fetch tasks using service layer
	const result = await taskService.getAllTasks({
		page,
		limit,
		status,
		priority,
		assigneeId
	});

	if (result.isError) {
		logger.error(`Failed to load tasks: ${result.error.message}`);
		return {
			tasks: [],
			error: 'Failed to load tasks. Please try again.'
		};
	}

	// Map domain entities to serializable data
	const tasks = result.value.map((task) => ({
		id: task.id,
		title: task.title.value,
		description: task.description?.value,
		status: task.status,
		priority: task.priority,
		dueDate: task.dueDate?.value,
		assigneeId: task.assigneeId,
		parentTaskId: task.parentTaskId,
		createdAt: task.createdAt.toISOString(),
		updatedAt: task.updatedAt.toISOString()
	}));

	return { tasks };
};
```

**Step 4: Run tests for this route**

```bash
npx vitest run src/routes/dashboard/tasks
```

Expected: PASS (if route has tests) or no tests found

**Step 5: Run full test suite**

```bash
npx vitest run --project unit-server --no-coverage
```

Expected: All tests pass (5380+)

**Step 6: Test in browser**

```bash
mise run dev &
sleep 5
curl http://localhost:5173/dashboard/tasks | grep "Tasks"
```

Expected: Page renders successfully

**Step 7: Commit**

```bash
git add src/routes/dashboard/tasks/+page.server.ts
git commit -m "refactor(tasks): migrate dashboard/tasks route to service layer"
```

---

### Task 9: Migrate dashboard/tasks/[id]/+page.server.ts

**Files:**

- Modify: `src/routes/dashboard/tasks/[id]/+page.server.ts`

**Step 1: Read current implementation**

```bash
cat src/routes/dashboard/tasks/[id]/+page.server.ts
```

**Step 2: Replace with service layer implementation**

```typescript
// src/routes/dashboard/tasks/[id]/+page.server.ts
import type { PageServerLoad } from './$types';
import { createTaskService } from '$lib/server/services';
import { logger } from '$lib/utils/logger';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { params } = event;
	const taskId = params.id;

	// Create authenticated service
	const taskService = createTaskService(event);

	// Fetch task by ID
	const result = await taskService.getTaskById(taskId);

	if (result.isError) {
		logger.error(`Failed to load task ${taskId}: ${result.error.message}`);

		// Handle specific errors
		if (result.error.message.includes('not found')) {
			throw error(404, 'Task not found');
		}

		throw error(500, 'Failed to load task');
	}

	const task = result.value;

	// Fetch subtasks if needed
	let subtasks = [];
	const subtasksResult = await taskService.getSubtasks(taskId);

	if (subtasksResult.isOk) {
		subtasks = subtasksResult.value.map((t) => ({
			id: t.id,
			title: t.title.value,
			status: t.status
		}));
	}

	// Map domain entity to serializable data
	return {
		task: {
			id: task.id,
			title: task.title.value,
			description: task.description?.value,
			status: task.status,
			priority: task.priority,
			dueDate: task.dueDate?.value,
			assigneeId: task.assigneeId,
			parentTaskId: task.parentTaskId,
			createdAt: task.createdAt.toISOString(),
			updatedAt: task.updatedAt.toISOString()
		},
		subtasks
	};
};
```

**Step 3: Run tests**

```bash
npx vitest run --project unit-server --no-coverage
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/routes/dashboard/tasks/[id]/+page.server.ts
git commit -m "refactor(tasks): migrate task detail route to service layer"
```

---

### Task 10: Migrate dashboard/tasks/create/+page.server.ts (Actions)

**Files:**

- Modify: `src/routes/dashboard/tasks/create/+page.server.ts`

**Step 1: Read current implementation**

```bash
cat src/routes/dashboard/tasks/create/+page.server.ts 2>/dev/null || echo "File may not exist"
```

**Step 2: Replace with service layer implementation**

```typescript
// src/routes/dashboard/tasks/create/+page.server.ts
import type { Actions } from './$types';
import { createTaskService } from '$lib/server/services';
import { logger } from '$lib/utils/logger';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
	default: async (event) => {
		const { request } = event;
		const formData = await request.formData();

		const title = formData.get('title')?.toString();
		const description = formData.get('description')?.toString();
		const status = formData.get('status')?.toString();
		const priority = formData.get('priority')?.toString();
		const dueDate = formData.get('dueDate')?.toString();
		const assigneeId = formData.get('assigneeId')?.toString();

		// Basic validation
		if (!title || !status || !priority) {
			return fail(400, {
				error: 'Title, status, and priority are required',
				values: { title, description, status, priority, dueDate, assigneeId }
			});
		}

		// Create authenticated service
		const taskService = createTaskService(event);

		// Create task using service layer
		const result = await taskService.createTask({
			title,
			description,
			status,
			priority,
			dueDate,
			assigneeId
		});

		if (result.isError) {
			logger.error(`Failed to create task: ${result.error.message}`);

			return fail(400, {
				error: result.error.message,
				values: { title, description, status, priority, dueDate, assigneeId }
			});
		}

		const task = result.value;

		// Redirect to task detail page
		throw redirect(303, `/dashboard/tasks/${task.id}`);
	}
};
```

**Step 3: Run tests**

```bash
npx vitest run --project unit-server --no-coverage
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/routes/dashboard/tasks/create/+page.server.ts
git commit -m "refactor(tasks): migrate task creation route to service layer"
```

---

### Task 11: Run Validation Tests for Tasks Module

**Files:**

- Modify: `scripts/validate-module-migration.test.ts` (enable Task tests)

**Step 1: Enable Task validation tests**

```typescript
// Remove .skip from Task Module tests in scripts/validate-module-migration.test.ts

describe('Task Module', () => {
	// Tests should now run without .skip
});
```

**Step 2: Run validation tests**

```bash
npx vitest run scripts/validate-module-migration.test.ts
```

Expected: All Task Module tests PASS (no direct GraphQL, uses createTaskService)

**Step 3: Re-run audit script**

```bash
npm run audit:routes
```

Expected: Compliance rate increased (e.g., 15% → 21%)

**Step 4: Verify ESLint no longer warns on migrated files**

```bash
npx eslint src/routes/dashboard/tasks/**/*.server.ts
```

Expected: No warnings

**Step 5: Commit validation updates**

```bash
git add scripts/validate-module-migration.test.ts docs/audits/*.md docs/audits/*.json
git commit -m "test(tasks): enable validation tests after migration"
```

---

## Phase 4: Documentation and Remaining Migrations

### Task 12: Document Patterns in CLAUDE.md

**Files:**

- Modify: `CLAUDE.md`

**Step 1: Read current service layer documentation**

```bash
grep -A 20 "Service Layer" CLAUDE.md
```

**Step 2: Add module usage enforcement section**

````markdown
// Add to CLAUDE.md after "Employee Module Architecture" section

## Module Usage Enforcement

**ALL routes MUST use the service layer.** Direct GraphQL usage is prohibited in routes.

### Compliant Pattern

```typescript
// ✅ GOOD: Use service layer
import { createTaskService } from '$lib/server/services';

export const load: PageServerLoad = async (event) => {
	const service = createTaskService(event);
	const result = await service.getAllTasks(filters);

	if (result.isError) {
		logger.error(result.error.message);
		return { tasks: [] };
	}

	return { tasks: result.value };
};
```
````

### Prohibited Pattern

```typescript
// ❌ BAD: Direct GraphQL
import { client } from '$lib/graphql/client';

const GET_TASKS = `query GetTasks { ... }`;
const result = await client.query(GET_TASKS);
```

### Enforcement

- **ESLint**: Warns about direct GraphQL imports in route files
- **CI/CD**: Blocks PRs with violations (after 100% migration)
- **Audit**: Run `npm run audit:routes` to check compliance

### Available Services

All 23 modules have service factories in `$lib/server/services.ts`:

- `createEmployeeService(event)`
- `createDepartmentService(event)`
- `createTaskService(event)`
- `createEventService(event)`
- `createGoalService(event)`
- `createPerformanceReviewService(event)`
- `createTrainingService(event)`
- ... and 16 more

See [Module Usage Audit](docs/audits/module-usage-audit.json) for current compliance.

````

**Step 3: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: add module usage enforcement guidelines"
````

---

### Task 13: Template for Remaining Modules

**Files:**

- Create: `docs/migration-template.md`

**Step 1: Write migration template**

````markdown
# Module Migration Template

Use this template for each remaining module migration.

## Pre-Migration Checklist

- [ ] Identify all routes for this module
- [ ] Verify service factory exists in `$lib/server/services.ts`
- [ ] Review service methods available
- [ ] Back up current routes

## Migration Steps

### 1. Update Route File

```typescript
// BEFORE
import { client } from '$lib/graphql/client';
const result = await client.query(GET_XXX);

// AFTER
import { createXXXService } from '$lib/server/services';
const service = createXXXService(event);
const result = await service.getXXX(filters);
```
````

### 2. Update Error Handling

```typescript
// BEFORE
if (result.error) {
	return { data: [] };
}

// AFTER
if (result.isError) {
	logger.error(result.error.message);
	return { data: [] };
}
```

### 3. Map Domain Entities

```typescript
// Map domain entities to serializable data
const serializedData = result.value.map((item) => ({
	id: item.id,
	name: item.name.value, // Value objects
	status: item.status // Enums
}));
```

## Post-Migration Validation

- [ ] Run tests: `npx vitest run --project unit-server --no-coverage`
- [ ] Run ESLint: `npx eslint src/routes/**/[module]/**/*.server.ts`
- [ ] Run audit: `npm run audit:routes`
- [ ] Test in browser: `mise run dev`
- [ ] Commit: `git commit -m "refactor([module]): migrate to service layer"`

## Validation Tests

Enable validation tests in `scripts/validate-module-migration.test.ts`:

```typescript
describe('[Module] Module', () => {
	it('should have no direct GraphQL imports', async () => {
		const routes = await glob('src/routes/**/[module]/**/*.server.ts');
		for (const route of routes) {
			const content = await fs.readFile(route, 'utf-8');
			expect(content).not.toContain("from '$lib/graphql/client'");
		}
	});

	it('should use [Module]Service', async () => {
		const routes = await glob('src/routes/**/[module]/**/*.server.ts');
		for (const route of routes) {
			const content = await fs.readFile(route, 'utf-8');
			expect(content).toContain('create[Module]Service');
		}
	});
});
```

## Common Issues

### Issue: Service method not available

**Solution**: Add method to service layer first

### Issue: Tests fail after migration

**Solution**: Check domain entity mapping, ensure value objects extracted correctly

### Issue: ESLint still warns

**Solution**: Remove all GraphQL imports and inline queries

````

**Step 2: Commit template**

```bash
git add docs/migration-template.md
git commit -m "docs: add module migration template for remaining modules"
````

---

### Task 14: Promote ESLint to Error Mode (After 100% Compliance)

**Files:**

- Modify: `.eslintrc.cjs`

**Note:** This task should ONLY be executed after all modules are migrated and audit shows 100% compliance.

**Step 1: Verify 100% compliance**

```bash
npm run audit:routes
```

Expected: Compliance: 100% (80/80 routes)

**Step 2: Promote warnings to errors**

```javascript
// Modify .eslintrc.cjs

{
	files: ['src/routes/**/*.server.ts', 'src/routes/**/*.server.js'],
	rules: {
		'no-restricted-imports': [
			'error', // Changed from 'warn' to 'error'
			{
				patterns: [
					{
						group: ['$lib/graphql/client', '$lib/graphql/jwt-client'],
						message: 'Routes must use service layer...'
					}
				]
			}
		],
		'no-restricted-syntax': [
			'error', // Changed from 'warn' to 'error'
			{
				selector: 'VariableDeclarator[id.name=/^(GET|QUERY|MUTATION)_/]',
				message: 'Inline GraphQL queries not allowed...'
			}
		]
	}
}
```

**Step 3: Test ESLint in error mode**

```bash
npx eslint src/routes --max-warnings 0
```

Expected: No errors (all routes compliant)

**Step 4: Update package.json lint script**

```json
{
	"scripts": {
		"lint": "eslint src --max-warnings 0",
		"lint:fix": "eslint src --fix --max-warnings 0"
	}
}
```

**Step 5: Commit enforcement**

```bash
git add .eslintrc.cjs package.json
git commit -m "feat(lint): promote ESLint rules to error mode (100% compliance)"
```

---

### Task 15: Add CI/CD Enforcement

**Files:**

- Modify: `.github/workflows/ci.yml` (or equivalent)

**Step 1: Add audit check to CI**

```yaml
# Add to .github/workflows/ci.yml (or create if doesn't exist)

name: CI

on:
  pull_request:
  push:
    branches: [main, feat/*]

jobs:
  audit-module-usage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - name: Audit Module Usage
        run: |
          npm run audit:routes
          # Verify 100% compliance
          compliance=$(jq -r '.complianceRate' docs/audits/module-usage-audit.json | tr -d '%')
          if [ "$compliance" -lt 100 ]; then
            echo "❌ Module usage compliance is ${compliance}% (expected 100%)"
            exit 1
          fi
          echo "✅ Module usage compliance: ${compliance}%"
```

**Step 2: Add lint check to CI**

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm install
    - name: Run ESLint
      run: npm run lint
```

**Step 3: Test CI locally (if using act)**

```bash
act -j audit-module-usage
act -j lint
```

Expected: Both jobs pass

**Step 4: Commit CI configuration**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add module usage audit and lint enforcement"
```

---

## Execution Notes

### Dependencies

```bash
# Install required packages
npm install --save-dev glob @types/glob
```

### Module Migration Order

**Wave 1** (Simple, 3-5 routes each):

1. Training
2. Compliance
3. Documents
4. Skills/Certifications
5. User Settings

**Wave 2** (Medium, 4-5 routes each): 6. Tasks (EXAMPLE COMPLETE) 7. Goals 8. Events 9. Notifications 10. Attendance

**Wave 3** (Complex, 3-6 routes each): 11. Performance Reviews 12. Onboarding 13. Time Off Balance 14. Compensation 15. HR Reports

**Wave 4** (Remaining): 16. Emergency Contacts 17. Vehicles 18. Activity Logs/Audit 19. Leave Requests (if not compliant)

### Testing After Each Module

```bash
# Full test suite
npx vitest run --project unit-server --no-coverage

# E2E tests
mise run test:e2e

# TypeScript check
mise run check

# Build verification
npm run build
```

### Progress Tracking

After each module migration:

```bash
npm run audit:routes
git log --oneline | head -5
```

Expected: Compliance rate increases, commit history shows progress

---

## Success Criteria

### Phase 1 Complete (Audit Script)

- ✅ Audit script generates accurate reports
- ✅ Baseline compliance measured (~15%)
- ✅ JSON and Markdown reports in `docs/audits/`

### Phase 2 Complete (ESLint)

- ✅ ESLint rules active (warn mode)
- ✅ Developers see warnings in IDE
- ✅ No build failures (soft enforcement)

### Phase 3 Complete (Example Migration)

- ✅ Tasks module 100% compliant
- ✅ Validation tests pass
- ✅ ESLint no longer warns on task routes
- ✅ All tests pass (5380+)

### Phase 4 Complete (Full Migration)

- ✅ All 80 routes use service layer
- ✅ Audit shows 100% compliance
- ✅ ESLint in error mode
- ✅ CI/CD enforces compliance
- ✅ Documentation updated

---

## Timeline Estimates

- **Task 1-5** (Audit Script): 4-6 hours
- **Task 6-7** (ESLint): 2 hours
- **Task 8-11** (Example Migration): 3-4 hours
- **Task 12-13** (Documentation): 2 hours
- **Task 14-15** (Hard Enforcement): 1 hour

**Total**: ~12-15 hours for tooling + 20-30 hours for full migration

---

**End of Implementation Plan**
