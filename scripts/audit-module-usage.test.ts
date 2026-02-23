import { describe, it, expect } from 'vitest';
import { isViolation, detectModule, scanRouteFile } from './audit-module-usage';

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
