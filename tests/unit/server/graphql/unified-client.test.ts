/**
 * UnifiedGraphQLClient and GraphQLQueryBuilder Unit Tests
 * Phase 1 Foundation - Workstream 1A
 *
 * Tests the unified GraphQL client and query builder utilities that
 * standardize GraphQL operations across the application.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedGraphQLClient, createGraphQLClient } from '$lib/server/graphql/unified-client';
import { GraphQLQueryBuilder } from '$lib/server/graphql/query-builder';
import type { RequestEvent } from '@sveltejs/kit';

// Mock dependencies
vi.mock('$lib/graphql/client', () => ({
	createUrqlClient: vi.fn(() => ({
		query: vi.fn((query, variables) => ({
			toPromise: async () => ({
				data: { tasks: [{ id: '1', title: 'Test Task' }] },
				error: null
			})
		})),
		mutation: vi.fn((mutation, variables) => ({
			toPromise: async () => ({
				data: { createTask: { id: '1', title: 'New Task' } },
				error: null
			})
		}))
	}))
}));

vi.mock('$lib/utils/logger', () => ({
	logger: {
		error: vi.fn()
	}
}));

describe('UnifiedGraphQLClient', () => {
	let mockEvent: Partial<RequestEvent>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			request: {
				headers: new Headers({ cookie: 'session=test-session' })
			} as Request,
			locals: {},
			url: new URL('http://localhost:5173/dashboard/tasks')
		};
	});

	describe('Constructor', () => {
		it('should create instance with cookies from request', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			expect(client).toBeDefined();
			expect(createUrqlClient).toHaveBeenCalledWith(
				undefined,
				undefined,
				undefined,
				'session=test-session'
			);
		});

		it('should handle missing cookies', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');

			mockEvent.request = {
				headers: new Headers()
			} as Request;

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			expect(createUrqlClient).toHaveBeenCalledWith(undefined, undefined, undefined, '');
		});
	});

	describe('query()', () => {
		it('should execute query successfully', async () => {
			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			const result = await client.query('query GetTasks { tasks { id title } }', { limit: 20 });

			expect(result).toBeDefined();
		});

		it('should extract data from specified path', async () => {
			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			const result = await client.query(
				'query GetTasks { tasks { id title } }',
				{ limit: 20 },
				{ dataPath: 'tasks' }
			);

			expect(result).toEqual([{ id: '1', title: 'Test Task' }]);
		});

		it('should return full data when no dataPath specified', async () => {
			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			const result = await client.query('query GetTasks { tasks { id title } }', { limit: 20 });

			expect(result).toHaveProperty('tasks');
		});

		it('should handle query errors', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const { logger } = await import('$lib/utils/logger');

			vi.mocked(createUrqlClient).mockReturnValueOnce({
				query: vi.fn(() => ({
					toPromise: async () => ({
						data: null,
						error: { message: 'GraphQL error', graphQLErrors: [] }
					})
				})),
				mutation: vi.fn()
			} as any);

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			await expect(
				client.query('query GetTasks { tasks { id } }', {}, { operationName: 'GetTasks' })
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith(
				'[GetTasks] Query error',
				expect.objectContaining({ message: 'GraphQL error' })
			);
		});

		it('should throw custom error message when provided', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');

			vi.mocked(createUrqlClient).mockReturnValueOnce({
				query: vi.fn(() => ({
					toPromise: async () => ({
						data: null,
						error: { message: 'GraphQL error', graphQLErrors: [] }
					})
				})),
				mutation: vi.fn()
			} as any);

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			await expect(
				client.query(
					'query GetTasks { tasks { id } }',
					{},
					{ errorMessage: 'Failed to load tasks' }
				)
			).rejects.toThrow('Failed to load tasks');
		});

		it('should throw error when no data returned', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');

			vi.mocked(createUrqlClient).mockReturnValueOnce({
				query: vi.fn(() => ({
					toPromise: async () => ({
						data: null,
						error: null
					})
				})),
				mutation: vi.fn()
			} as any);

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			await expect(client.query('query GetTasks { tasks { id } }')).rejects.toThrow(
				'No data returned from GraphQL query'
			);
		});

		it('should log errors with operation name', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const { logger } = await import('$lib/utils/logger');

			vi.mocked(createUrqlClient).mockReturnValueOnce({
				query: vi.fn(() => ({
					toPromise: async () => {
						throw new Error('Network error');
					}
				})),
				mutation: vi.fn()
			} as any);

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			await expect(
				client.query('query GetTasks { tasks { id } }', {}, { operationName: 'GetTasks' })
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith('[GetTasks] Query failed', expect.any(Error));
		});

		it('should handle undefined variables', async () => {
			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			const result = await client.query('query GetTasks { tasks { id } }');

			expect(result).toBeDefined();
		});
	});

	describe('mutate()', () => {
		it('should execute mutation successfully', async () => {
			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			const result = await client.mutate('mutation CreateTask($input: CreateTaskInput!) { ... }', {
				input: { title: 'New Task' }
			});

			expect(result).toBeDefined();
		});

		it('should handle mutation errors', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const { logger } = await import('$lib/utils/logger');

			vi.mocked(createUrqlClient).mockReturnValueOnce({
				query: vi.fn(),
				mutation: vi.fn(() => ({
					toPromise: async () => ({
						data: null,
						error: { message: 'Mutation error', graphQLErrors: [] }
					})
				}))
			} as any);

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			await expect(
				client.mutate('mutation CreateTask { ... }', {}, { operationName: 'CreateTask' })
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith(
				'[CreateTask] Mutation error',
				expect.objectContaining({ message: 'Mutation error' })
			);
		});

		it('should throw custom error message when provided', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');

			vi.mocked(createUrqlClient).mockReturnValueOnce({
				query: vi.fn(),
				mutation: vi.fn(() => ({
					toPromise: async () => ({
						data: null,
						error: { message: 'Mutation error', graphQLErrors: [] }
					})
				}))
			} as any);

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			await expect(
				client.mutate('mutation CreateTask { ... }', {}, { errorMessage: 'Failed to create task' })
			).rejects.toThrow('Failed to create task');
		});

		it('should log errors with operation name', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');
			const { logger } = await import('$lib/utils/logger');

			vi.mocked(createUrqlClient).mockReturnValueOnce({
				query: vi.fn(),
				mutation: vi.fn(() => ({
					toPromise: async () => {
						throw new Error('Network error');
					}
				}))
			} as any);

			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			await expect(
				client.mutate('mutation CreateTask { ... }', {}, { operationName: 'CreateTask' })
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith('[CreateTask] Mutation failed', expect.any(Error));
		});

		it('should handle undefined variables', async () => {
			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			const result = await client.mutate('mutation CreateTask { ... }');

			expect(result).toBeDefined();
		});
	});

	describe('getClient()', () => {
		it('should return underlying urql client', () => {
			const client = new UnifiedGraphQLClient(mockEvent as RequestEvent);

			const urqlClient = client.getClient();

			expect(urqlClient).toBeDefined();
			expect(urqlClient).toHaveProperty('query');
			expect(urqlClient).toHaveProperty('mutation');
		});
	});

	describe('createGraphQLClient() factory', () => {
		it('should create new client instance', () => {
			const client = createGraphQLClient(mockEvent as RequestEvent);

			expect(client).toBeInstanceOf(UnifiedGraphQLClient);
		});

		it('should pass event to constructor', async () => {
			const { createUrqlClient } = await import('$lib/graphql/client');

			createGraphQLClient(mockEvent as RequestEvent);

			expect(createUrqlClient).toHaveBeenCalledWith(
				undefined,
				undefined,
				undefined,
				'session=test-session'
			);
		});
	});
});

describe('GraphQLQueryBuilder', () => {
	describe('select()', () => {
		it('should add fields to selection', () => {
			const builder = new GraphQLQueryBuilder();

			builder.select('id', 'name', 'email');

			expect(builder['fields']).toEqual(['id', 'name', 'email']);
		});

		it('should support chaining', () => {
			const builder = new GraphQLQueryBuilder();

			const result = builder.select('id').select('name').select('email');

			expect(result).toBe(builder);
			expect(builder['fields']).toEqual(['id', 'name', 'email']);
		});

		it('should accumulate fields across multiple calls', () => {
			const builder = new GraphQLQueryBuilder().select('id', 'name').select('email', 'createdAt');

			expect(builder['fields']).toEqual(['id', 'name', 'email', 'createdAt']);
		});
	});

	describe('where()', () => {
		it('should add filter condition', () => {
			const builder = new GraphQLQueryBuilder();

			builder.where('status', 'ACTIVE');

			expect(builder['filters']).toEqual({ status: 'ACTIVE' });
		});

		it('should support chaining', () => {
			const builder = new GraphQLQueryBuilder();

			const result = builder.where('status', 'ACTIVE').where('role', 'ADMIN');

			expect(result).toBe(builder);
		});

		it('should accumulate multiple conditions', () => {
			const builder = new GraphQLQueryBuilder()
				.where('status', 'ACTIVE')
				.where('role', 'ADMIN')
				.where('department', 'Engineering');

			expect(builder['filters']).toEqual({
				status: 'ACTIVE',
				role: 'ADMIN',
				department: 'Engineering'
			});
		});

		it('should overwrite duplicate filter keys', () => {
			const builder = new GraphQLQueryBuilder()
				.where('status', 'ACTIVE')
				.where('status', 'INACTIVE');

			expect(builder['filters']).toEqual({ status: 'INACTIVE' });
		});
	});

	describe('paginate()', () => {
		it('should set pagination with limit and page', () => {
			const builder = new GraphQLQueryBuilder();

			builder.paginate(20, 2);

			expect(builder['pagination']).toEqual({ limit: 20, offset: 20 });
		});

		it('should default to page 1', () => {
			const builder = new GraphQLQueryBuilder();

			builder.paginate(20);

			expect(builder['pagination']).toEqual({ limit: 20, offset: 0 });
		});

		it('should support chaining', () => {
			const builder = new GraphQLQueryBuilder();

			const result = builder.paginate(20, 1);

			expect(result).toBe(builder);
		});

		it('should calculate offset correctly', () => {
			const builder1 = new GraphQLQueryBuilder().paginate(20, 1);
			expect(builder1['pagination'].offset).toBe(0);

			const builder2 = new GraphQLQueryBuilder().paginate(20, 2);
			expect(builder2['pagination'].offset).toBe(20);

			const builder3 = new GraphQLQueryBuilder().paginate(20, 5);
			expect(builder3['pagination'].offset).toBe(80);
		});
	});

	describe('orderBy()', () => {
		it('should add ordering field', () => {
			const builder = new GraphQLQueryBuilder();

			builder.orderBy('createdAt', 'DESC');

			expect(builder['orderByFields']).toEqual(['createdAt_DESC']);
		});

		it('should default to ASC direction', () => {
			const builder = new GraphQLQueryBuilder();

			builder.orderBy('name');

			expect(builder['orderByFields']).toEqual(['name_ASC']);
		});

		it('should support chaining', () => {
			const builder = new GraphQLQueryBuilder();

			const result = builder.orderBy('priority', 'DESC').orderBy('createdAt', 'ASC');

			expect(result).toBe(builder);
		});

		it('should maintain order of multiple fields', () => {
			const builder = new GraphQLQueryBuilder()
				.orderBy('priority', 'DESC')
				.orderBy('createdAt', 'ASC')
				.orderBy('title', 'ASC');

			expect(builder['orderByFields']).toEqual(['priority_DESC', 'createdAt_ASC', 'title_ASC']);
		});
	});

	describe('build()', () => {
		it('should build variables with all options', () => {
			const builder = new GraphQLQueryBuilder()
				.select('id', 'name')
				.where('status', 'ACTIVE')
				.paginate(20, 2)
				.orderBy('createdAt', 'DESC');

			const result = builder.build();

			expect(result).toEqual({
				first: 20,
				offset: 20,
				condition: { status: 'ACTIVE' },
				orderBy: ['createdAt_DESC']
			});
		});

		it('should omit empty filters', () => {
			const builder = new GraphQLQueryBuilder().paginate(20, 1);

			const result = builder.build();

			expect(result).toEqual({
				first: 20,
				offset: 0
			});
			expect(result).not.toHaveProperty('condition');
		});

		it('should omit empty pagination', () => {
			const builder = new GraphQLQueryBuilder().where('status', 'ACTIVE');

			const result = builder.build();

			expect(result).toEqual({
				condition: { status: 'ACTIVE' }
			});
			expect(result).not.toHaveProperty('first');
			expect(result).not.toHaveProperty('offset');
		});

		it('should omit empty ordering', () => {
			const builder = new GraphQLQueryBuilder().paginate(20, 1).where('status', 'ACTIVE');

			const result = builder.build();

			expect(result).not.toHaveProperty('orderBy');
		});

		it('should return empty object when nothing configured', () => {
			const builder = new GraphQLQueryBuilder();

			const result = builder.build();

			expect(result).toEqual({});
		});

		it('should handle multiple filters', () => {
			const builder = new GraphQLQueryBuilder()
				.where('status', 'ACTIVE')
				.where('role', 'ADMIN')
				.where('department', 'Engineering');

			const result = builder.build();

			expect(result.condition).toEqual({
				status: 'ACTIVE',
				role: 'ADMIN',
				department: 'Engineering'
			});
		});
	});

	describe('reset()', () => {
		it('should clear all fields', () => {
			const builder = new GraphQLQueryBuilder()
				.select('id', 'name')
				.where('status', 'ACTIVE')
				.paginate(20, 1)
				.orderBy('createdAt', 'DESC');

			builder.reset();

			expect(builder['fields']).toEqual([]);
			expect(builder['filters']).toEqual({});
			expect(builder['pagination']).toEqual({});
			expect(builder['orderByFields']).toEqual([]);
		});

		it('should support chaining after reset', () => {
			const builder = new GraphQLQueryBuilder()
				.where('status', 'ACTIVE')
				.reset()
				.where('status', 'INACTIVE')
				.paginate(10, 1);

			const result = builder.build();

			expect(result).toEqual({
				first: 10,
				offset: 0,
				condition: { status: 'INACTIVE' }
			});
		});

		it('should return builder instance for chaining', () => {
			const builder = new GraphQLQueryBuilder();

			const result = builder.reset();

			expect(result).toBe(builder);
		});
	});

	describe('Integration - Full workflow', () => {
		it('should build complex query variables', () => {
			const builder = new GraphQLQueryBuilder()
				.select('id', 'title', 'status', 'priority', 'assignee')
				.where('status', 'IN_PROGRESS')
				.where('priority', 'HIGH')
				.paginate(20, 3)
				.orderBy('priority', 'DESC')
				.orderBy('dueDate', 'ASC');

			const variables = builder.build();

			expect(variables).toEqual({
				first: 20,
				offset: 40,
				condition: {
					status: 'IN_PROGRESS',
					priority: 'HIGH'
				},
				orderBy: ['priority_DESC', 'dueDate_ASC']
			});
		});

		it('should allow builder reuse with reset', () => {
			const builder = new GraphQLQueryBuilder();

			// First query
			const query1 = builder.where('status', 'ACTIVE').paginate(20, 1).build();
			expect(query1).toHaveProperty('condition', { status: 'ACTIVE' });

			// Second query
			const query2 = builder.reset().where('status', 'INACTIVE').paginate(10, 1).build();
			expect(query2).toHaveProperty('condition', { status: 'INACTIVE' });
			expect(query2.first).toBe(10);
		});
	});
});
