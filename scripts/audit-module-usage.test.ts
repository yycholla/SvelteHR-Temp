import { describe, it, expect } from 'vitest';
import {
	isViolation,
	detectModule,
	scanRouteFile,
	categorizeByModule,
	calculateStats,
	generateMarkdownReport,
	generateJsonReport,
	type AuditStats
} from './audit-module-usage';

describe('isViolation', () => {
	it('should detect direct GraphQL client import', () => {
		const code = `import { client } from '$lib/graphql/client';`;
		expect(isViolation(code)).toBe(true);
	});

	it('should detect JWT GraphQL client import', () => {
		const code = `import { jwtGraphQLClient } from '$lib/graphql/jwt-client';`;
		expect(isViolation(code)).toBe(true);
	});

	it('should detect inline GraphQL query definition', () => {
		const code = `const GET_TASKS = \`query GetTasks { tasks { id } }\`;`;
		expect(isViolation(code)).toBe(true);
	});

	it('should NOT detect service layer usage', () => {
		const code = `import { createTaskService } from '$lib/server/services';`;
		expect(isViolation(code)).toBe(false);
	});

	it('should handle empty strings', () => {
		expect(isViolation('')).toBe(false);
	});

	it('should detect GraphQL query with different quote styles', () => {
		const code = `const GET_DATA = "query GetData { data { id } }";`;
		expect(isViolation(code)).toBe(true);
	});
});

describe('detectModule', () => {
	it('should extract Task from tasks route', () => {
		const path = 'src/routes/dashboard/tasks/+page.server.ts';
		expect(detectModule(path)).toBe('Task');
	});

	it('should extract Event from events create route', () => {
		const path = 'src/routes/dashboard/events/create/+page.server.ts';
		expect(detectModule(path)).toBe('Event');
	});

	it('should extract PerformanceReview from performance-reviews route', () => {
		const path = 'src/routes/dashboard/performance-reviews/+page.server.ts';
		expect(detectModule(path)).toBe('PerformanceReview');
	});

	it('should return Unknown for unrecognized paths', () => {
		const path = 'src/routes/api/something/+page.server.ts';
		expect(detectModule(path)).toBe('Unknown');
	});
});

describe('scanRouteFile', () => {
	it('should identify violation with direct import', () => {
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
		expect(result.path).toBe('src/routes/dashboard/tasks/+page.server.ts');
		expect(result.suggestion).toContain('createTaskService');
	});

	it('should identify compliant route with service layer', () => {
		const mockContent = `
import { createTaskService } from '$lib/server/services';
export const load = async (event) => {
	const service = createTaskService(event);
};
`;
		const result = scanRouteFile('src/routes/dashboard/tasks/+page.server.ts', mockContent);

		expect(result.isViolation).toBe(false);
		expect(result.module).toBe('Task');
		expect(result.path).toBe('src/routes/dashboard/tasks/+page.server.ts');
		expect(result.violationType).toEqual([]);
		expect(result.suggestion).toBe('');
	});

	it('should detect inline GraphQL query violation', () => {
		const mockContent = `
const GET_EVENTS = \`query GetEvents { events { id } }\`;
export const load = async () => {
	// using inline query
};
`;
		const result = scanRouteFile('src/routes/dashboard/events/+page.server.ts', mockContent);

		expect(result.isViolation).toBe(true);
		expect(result.violationType).toContain('inline-query');
		expect(result.module).toBe('Event');
		expect(result.suggestion).toContain('createEventService');
	});

	it('should detect multiple violation types', () => {
		const mockContent = `
import { client } from '$lib/graphql/client';
const GET_GOALS = \`query GetGoals { goals { id } }\`;
export const load = async () => {
	const result = await client.query(GET_GOALS);
};
`;
		const result = scanRouteFile('src/routes/dashboard/goals/+page.server.ts', mockContent);

		expect(result.isViolation).toBe(true);
		expect(result.violationType).toContain('direct-import');
		expect(result.violationType).toContain('inline-query');
		expect(result.module).toBe('Goal');
		expect(result.suggestion).toContain('createGoalService');
	});

	it('should handle performance-reviews module naming', () => {
		const mockContent = `
import { client } from '$lib/graphql/client';
export const load = async () => {
	const result = await client.query(GET_REVIEWS);
};
`;
		const result = scanRouteFile(
			'src/routes/dashboard/performance-reviews/+page.server.ts',
			mockContent
		);

		expect(result.isViolation).toBe(true);
		expect(result.module).toBe('PerformanceReview');
		expect(result.suggestion).toContain('createPerformanceReviewService');
	});

	it('should handle unknown modules gracefully', () => {
		const mockContent = `
import { client } from '$lib/graphql/client';
export const load = async () => {
	const result = await client.query(GET_DATA);
};
`;
		const result = scanRouteFile('src/routes/api/unknown/+page.server.ts', mockContent);

		expect(result.isViolation).toBe(true);
		expect(result.module).toBe('Unknown');
		expect(result.suggestion).toContain('service layer');
	});
});

describe('categorizeByModule', () => {
	it('should group violations by module', () => {
		const violations = [
			{
				path: 'src/routes/dashboard/tasks/a/+page.server.ts',
				module: 'Task',
				isViolation: true,
				violationType: ['direct-import'],
				suggestion: 'Use createTaskService'
			},
			{
				path: 'src/routes/dashboard/tasks/b/+page.server.ts',
				module: 'Task',
				isViolation: true,
				violationType: ['inline-query'],
				suggestion: 'Use createTaskService'
			},
			{
				path: 'src/routes/dashboard/events/a/+page.server.ts',
				module: 'Event',
				isViolation: true,
				violationType: ['direct-import'],
				suggestion: 'Use createEventService'
			}
		];

		const result = categorizeByModule(violations);

		expect(result.Task).toHaveLength(2);
		expect(result.Event).toHaveLength(1);
		expect(result.Task[0].path).toContain('tasks/a');
		expect(result.Task[1].path).toContain('tasks/b');
		expect(result.Event[0].path).toContain('events/a');
	});

	it('should handle empty violations array', () => {
		const result = categorizeByModule([]);
		expect(result).toEqual({});
	});
});

describe('calculateStats', () => {
	it('should calculate statistics for mixed routes', () => {
		const allRoutes = [
			{
				path: 'src/routes/dashboard/tasks/a/+page.server.ts',
				module: 'Task',
				isViolation: true,
				violationType: ['direct-import'],
				suggestion: 'Use createTaskService'
			},
			{
				path: 'src/routes/dashboard/tasks/b/+page.server.ts',
				module: 'Task',
				isViolation: false,
				violationType: [],
				suggestion: ''
			},
			{
				path: 'src/routes/dashboard/events/a/+page.server.ts',
				module: 'Event',
				isViolation: true,
				violationType: ['inline-query'],
				suggestion: 'Use createEventService'
			}
		];

		const stats = calculateStats(allRoutes);

		expect(stats.totalRoutes).toBe(3);
		expect(stats.compliant).toBe(1);
		expect(stats.violations).toBe(2);
		expect(stats.complianceRate).toBe('33%');
		expect(stats.byModule.Task.total).toBe(2);
		expect(stats.byModule.Task.compliant).toBe(1);
		expect(stats.byModule.Task.violations).toBe(1);
		expect(stats.byModule.Event.total).toBe(1);
		expect(stats.byModule.Event.compliant).toBe(0);
		expect(stats.byModule.Event.violations).toBe(1);
		expect(stats.violationDetails).toHaveLength(2);
		expect(stats.timestamp).toBeDefined();
	});

	it('should calculate 100% compliance rate correctly', () => {
		const allRoutes = [
			{
				path: 'src/routes/dashboard/tasks/a/+page.server.ts',
				module: 'Task',
				isViolation: false,
				violationType: [],
				suggestion: ''
			},
			{
				path: 'src/routes/dashboard/events/a/+page.server.ts',
				module: 'Event',
				isViolation: false,
				violationType: [],
				suggestion: ''
			}
		];

		const stats = calculateStats(allRoutes);

		expect(stats.totalRoutes).toBe(2);
		expect(stats.compliant).toBe(2);
		expect(stats.violations).toBe(0);
		expect(stats.complianceRate).toBe('100%');
	});

	it('should handle empty routes array', () => {
		const stats = calculateStats([]);

		expect(stats.totalRoutes).toBe(0);
		expect(stats.compliant).toBe(0);
		expect(stats.violations).toBe(0);
		expect(stats.complianceRate).toBe('0%');
		expect(stats.byModule).toEqual({});
		expect(stats.violationDetails).toEqual([]);
	});
});

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
				suggestion:
					"Replace direct GraphQL client imports with: import { createTaskService } from '$lib/server/services'"
			},
			{
				path: 'src/routes/dashboard/tasks/edit/+page.server.ts',
				module: 'Task',
				isViolation: true,
				violationType: ['inline-query'],
				suggestion:
					'Remove inline GraphQL queries and use createTaskService from the service layer instead'
			}
		]
	};

	describe('generateMarkdownReport', () => {
		it('should generate valid markdown with summary', () => {
			const markdown = generateMarkdownReport(mockStats);

			expect(markdown).toContain('# Module Usage Audit Report');
			expect(markdown).toContain('**Generated**:');
			expect(markdown).toContain('**Compliance**: 30% (3/10 routes)');
			expect(markdown).toContain('## Summary');
			expect(markdown).toContain('✅ **Compliant**: 3 routes');
			expect(markdown).toContain('❌ **Violations**: 7 routes');
		});

		it('should include by-module breakdown table', () => {
			const markdown = generateMarkdownReport(mockStats);

			expect(markdown).toContain('## By Module');
			expect(markdown).toContain('| Module | Total | Compliant | Violations | Rate |');
			expect(markdown).toContain('| Task   | 5     | 1         | 4          | 20%  |');
			expect(markdown).toContain('| Event  | 3     | 2         | 1          | 67%  |');
			expect(markdown).toContain('| Employee | 2   | 0         | 2          | 0%   |');
		});

		it('should include violation details section', () => {
			const markdown = generateMarkdownReport(mockStats);

			expect(markdown).toContain('## Violations');
			expect(markdown).toContain('### Task Module (4 violations)');
			expect(markdown).toContain('src/routes/dashboard/tasks/+page.server.ts');
			expect(markdown).toContain('(direct-import)');
			expect(markdown).toContain('**Suggestion**:');
		});
	});

	describe('generateJsonReport', () => {
		it('should generate valid JSON', () => {
			const json = generateJsonReport(mockStats);
			const parsed = JSON.parse(json);

			expect(parsed.totalRoutes).toBe(10);
			expect(parsed.compliant).toBe(3);
			expect(parsed.violations).toBe(7);
			expect(parsed.complianceRate).toBe('30%');
		});

		it('should include all AuditStats fields', () => {
			const json = generateJsonReport(mockStats);
			const parsed = JSON.parse(json);

			expect(parsed.timestamp).toBe('2026-02-23T10:00:00Z');
			expect(parsed.byModule).toEqual(mockStats.byModule);
			expect(parsed.violationDetails).toHaveLength(2);
			expect(parsed.violationDetails[0].path).toBe('src/routes/dashboard/tasks/+page.server.ts');
		});

		it('should be parseable back to AuditStats', () => {
			const json = generateJsonReport(mockStats);
			const parsed: AuditStats = JSON.parse(json);

			expect(parsed.totalRoutes).toBe(mockStats.totalRoutes);
			expect(parsed.compliant).toBe(mockStats.compliant);
			expect(parsed.violations).toBe(mockStats.violations);
			expect(parsed.complianceRate).toBe(mockStats.complianceRate);
			expect(parsed.byModule).toEqual(mockStats.byModule);
			expect(parsed.violationDetails).toEqual(mockStats.violationDetails);
		});
	});
});
