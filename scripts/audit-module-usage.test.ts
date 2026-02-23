import { describe, it, expect } from 'vitest';
import { isViolation, detectModule } from './audit-module-usage';

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
