import { describe, expect, it } from 'vitest';
import {
	isViolation,
	detectModule,
	scanRouteFile,
	calculateStats,
	categorizeByModule,
	type RouteViolation
} from '../../../scripts/audit-module-usage';

describe('audit-module-usage', () => {
	describe('isViolation', () => {
		it('detects direct GraphQL client imports', () => {
			const code = "import { client as urqlClient } from '$lib/graphql/client';";
			expect(isViolation(code)).toBe(true);
		});

		it('detects JWT client imports', () => {
			const code = "import { jwtGraphQLClient } from '$lib/graphql/jwt-client';";
			expect(isViolation(code)).toBe(true);
		});

		it('detects inline GraphQL query declarations', () => {
			const code = 'const taskQuery = `query GetTasks { tasks { id } }`;';
			expect(isViolation(code)).toBe(true);
		});

		it('does not flag service-layer usage', () => {
			const code = "import { createTaskService } from '$lib/server/services';";
			expect(isViolation(code)).toBe(false);
		});

		it('does not flag GraphQLClient route helper import', () => {
			const code = "import { GraphQLClient } from '$lib/server/graphql-client';";
			expect(isViolation(code)).toBe(false);
		});
	});

	describe('module detection', () => {
		it('maps known dashboard modules', () => {
			expect(detectModule('src/routes/dashboard/tasks/+page.server.ts')).toBe('Task');
			expect(detectModule('src/routes/dashboard/onboarding/[id]/+page.server.ts')).toBe(
				'Onboarding'
			);
		});

		it('returns Unknown for unmapped modules', () => {
			expect(detectModule('src/routes/admin/forms/[id]/+page.server.ts')).toBe('Unknown');
		});
	});

	describe('scanRouteFile', () => {
		it('reports violation details', () => {
			const routePath = 'src/routes/dashboard/onboarding/[id]/+page.server.ts';
			const code = [
				"import { client as urqlClient } from '$lib/graphql/client';",
				'const blocksQuery = `query GetBlocks { blocks { id } }`;'
			].join('\n');

			const result = scanRouteFile(routePath, code);

			expect(result.isViolation).toBe(true);
			expect(result.module).toBe('Onboarding');
			expect(result.violationType).toContain('direct-import');
			expect(result.violationType).toContain('inline-query');
		});
	});

	describe('aggregation helpers', () => {
		it('calculates stats and categorization', () => {
			const routes: RouteViolation[] = [
				{
					path: 'src/routes/dashboard/tasks/+page.server.ts',
					module: 'Task',
					isViolation: true,
					violationType: ['direct-import'],
					suggestion: 'Use createTaskService'
				},
				{
					path: 'src/routes/dashboard/tasks/[id]/+page.server.ts',
					module: 'Task',
					isViolation: false,
					violationType: [],
					suggestion: ''
				},
				{
					path: 'src/routes/dashboard/events/+page.server.ts',
					module: 'Event',
					isViolation: false,
					violationType: [],
					suggestion: ''
				}
			];

			const byModule = categorizeByModule(routes.filter((r) => r.isViolation));
			expect(byModule.Task).toHaveLength(1);

			const stats = calculateStats(routes);
			expect(stats.totalRoutes).toBe(3);
			expect(stats.violations).toBe(1);
			expect(stats.compliant).toBe(2);
			expect(stats.byModule.Task.violations).toBe(1);
			expect(stats.byModule.Event.compliant).toBe(1);
		});
	});
});
