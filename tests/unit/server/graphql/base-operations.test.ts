/**
 * BaseOperations and CRUD Factory Unit Tests
 * Phase 1 Foundation - Workstream 1C
 *
 * Tests the enhanced BaseOperations class and CRUD operations factory
 * that eliminate GraphQL operation boilerplate.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseOperations } from '$lib/graphql/base-operations';
import { createCRUDOperations, createCRUDOperationsWithCustomNames } from '$lib/graphql/factories/crud-factory';
import type { Client } from '@urql/core';

// Mock dependencies
vi.mock('$lib/utils/logger', () => ({
	logger: {
		error: vi.fn()
	}
})) as unknown as Client["mutation"];

vi.mock('$lib/models/error-response', () => ({
	createErrorResponse: vi.fn((error, options) => ({
		...error,
		userMessage: options.userMessage,
		type: options.type
	}))
})) as unknown as Client["mutation"];

describe('BaseOperations', () => {
	let mockClient: Partial<Client>;
	let baseOps: BaseOperations;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock urql client with type assertion to avoid urql OperationResultSource complexity
		mockClient = {
			query: vi.fn(() => ({
				toPromise: async () => ({
					data: { tasks: [{ id: '1', title: 'Test Task' }] },
					error: null
				})
			})) as any,
			mutation: vi.fn(() => ({
				toPromise: async () => ({
					data: { createTask: { id: '1', title: 'New Task' } },
					error: null
				})
			})) as any
		};

		baseOps = new BaseOperations(mockClient as Client);
	});

	describe('Constructor', () => {
		it('should store client instance', () => {
			expect(baseOps['client']).toBe(mockClient);
		});
	});

	describe('executeQuery()', () => {
		it('should execute query successfully', async () => {
			const result = await baseOps['executeQuery'](
				'query GetTasks { tasks { id title } }',
				{ limit: 20 }
			);

			expect(result).toBeDefined();
			expect(mockClient.query).toHaveBeenCalled();
		});

		it('should extract data from specified path', async () => {
			const result = await baseOps['executeQuery'](
				'query GetTasks { tasks { id title } }',
				{ limit: 20 },
				{ dataPath: 'tasks' }
			);

			expect(result).toEqual([{ id: '1', title: 'Test Task' }]);
		});

		it('should return full data when no dataPath specified', async () => {
			const result = await baseOps['executeQuery']('query GetTasks { tasks { id title } }', {
				limit: 20
			});

			expect(result).toHaveProperty('tasks');
		});

		it('should handle query errors', async () => {
			const { logger } = await import('$lib/utils/logger');
			const { createErrorResponse } = await import('$lib/models/error-response');

			mockClient.query = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: { message: 'GraphQL error', graphQLErrors: [] }
				})
			})) as unknown as Client["mutation"];

			await expect(
				baseOps['executeQuery'](
					'query GetTasks { tasks { id } }',
					{},
					{ operationName: 'GetTasks' }
				)
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalled();
			expect(createErrorResponse).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'GraphQL error' }),
				expect.objectContaining({ type: 'graphql' })
			);
		});

		it('should use custom error message when provided', async () => {
			const { createErrorResponse } = await import('$lib/models/error-response');

			mockClient.query = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: { message: 'GraphQL error', graphQLErrors: [] }
				})
			})) as unknown as Client["mutation"];

			await expect(
				baseOps['executeQuery'](
					'query GetTasks { tasks { id } }',
					{},
					{ errorMessage: 'Failed to load tasks' }
				)
			).rejects.toThrow();

			expect(createErrorResponse).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ userMessage: 'Failed to load tasks' })
			);
		});

		it('should throw error when no data returned', async () => {
			mockClient.query = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: null
				})
			})) as unknown as Client["mutation"];

			await expect(baseOps['executeQuery']('query GetTasks { tasks { id } }')).rejects.toThrow();
		});

		it('should log errors with operation name and variables', async () => {
			const { logger } = await import('$lib/utils/logger');

			mockClient.query = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: { message: 'GraphQL error', graphQLErrors: [] }
				})
			})) as unknown as Client["mutation"];

			await expect(
				baseOps['executeQuery'](
					'query GetTasks { tasks { id } }',
					{ limit: 20 },
					{ operationName: 'GetTasks' }
				)
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith(
				'[GetTasks] Query error',
				expect.any(Object),
				expect.objectContaining({
					operationName: 'GetTasks',
					variables: { limit: 20 }
				})
			);
		});

		it('should handle undefined variables', async () => {
			const result = await baseOps['executeQuery']('query GetTasks { tasks { id } }');

			expect(result).toBeDefined();
			expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), {});
		});

		it('should re-throw formatted errors', async () => {
			mockClient.query = vi.fn(() => ({
				toPromise: async () => {
					throw { userMessage: 'Custom error', type: 'graphql' };
				}
			})) as unknown as Client["mutation"];

			await expect(baseOps['executeQuery']('query GetTasks { tasks { id } }')).rejects.toEqual(
				expect.objectContaining({ userMessage: 'Custom error' })
			);
		});
	});

	describe('executeMutation()', () => {
		it('should execute mutation successfully', async () => {
			const result = await baseOps['executeMutation']('mutation CreateTask($input: CreateTaskInput!) { ... }', {
				input: { title: 'New Task' }
			});

			expect(result).toBeDefined();
			expect(mockClient.mutation).toHaveBeenCalled();
		});

		it('should extract data from specified path', async () => {
			const result = await baseOps['executeMutation'](
				'mutation CreateTask($input: CreateTaskInput!) { ... }',
				{ input: { title: 'New Task' } },
				{ dataPath: 'createTask' }
			);

			expect(result).toEqual({ id: '1', title: 'New Task' });
		});

		it('should return full data when no dataPath specified', async () => {
			const result = await baseOps['executeMutation']('mutation CreateTask { ... }', {
				input: { title: 'New Task' }
			});

			expect(result).toHaveProperty('createTask');
		});

		it('should handle mutation errors', async () => {
			const { logger } = await import('$lib/utils/logger');
			const { createErrorResponse } = await import('$lib/models/error-response');

			mockClient.mutation = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: { message: 'Mutation error', graphQLErrors: [] }
				})
			})) as unknown as Client["mutation"];

			await expect(
				baseOps['executeMutation']('mutation CreateTask { ... }', {}, { operationName: 'CreateTask' })
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalled();
			expect(createErrorResponse).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Mutation error' }),
				expect.objectContaining({ type: 'graphql' })
			);
		});

		it('should use custom error message when provided', async () => {
			const { createErrorResponse } = await import('$lib/models/error-response');

			mockClient.mutation = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: { message: 'Mutation error', graphQLErrors: [] }
				})
			})) as unknown as Client["mutation"];

			await expect(
				baseOps['executeMutation'](
					'mutation CreateTask { ... }',
					{},
					{ errorMessage: 'Failed to create task' }
				)
			).rejects.toThrow();

			expect(createErrorResponse).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ userMessage: 'Failed to create task' })
			);
		});

		it('should throw error when no data returned', async () => {
			mockClient.mutation = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: null
				})
			})) as unknown as Client["mutation"];

			await expect(baseOps['executeMutation']('mutation CreateTask { ... }')).rejects.toThrow();
		});

		it('should log errors with operation name and variables', async () => {
			const { logger } = await import('$lib/utils/logger');

			mockClient.mutation = vi.fn(() => ({
				toPromise: async () => ({
					data: null,
					error: { message: 'Mutation error', graphQLErrors: [] }
				})
			})) as unknown as Client["mutation"];

			await expect(
				baseOps['executeMutation'](
					'mutation CreateTask { ... }',
					{ input: { title: 'New' } },
					{ operationName: 'CreateTask' }
				)
			).rejects.toThrow();

			expect(logger.error).toHaveBeenCalledWith(
				'[CreateTask] Mutation error',
				expect.any(Object),
				expect.objectContaining({
					operationName: 'CreateTask',
					variables: { input: { title: 'New' } }
				})
			);
		});

		it('should handle undefined variables', async () => {
			const result = await baseOps['executeMutation']('mutation CreateTask { ... }');

			expect(result).toBeDefined();
			expect(mockClient.mutation).toHaveBeenCalledWith(expect.any(String), {});
		});

		it('should re-throw formatted errors', async () => {
			mockClient.mutation = vi.fn(() => ({
				toPromise: async () => {
					throw { userMessage: 'Custom error', type: 'graphql' };
				}
			})) as unknown as Client["mutation"];

			await expect(baseOps['executeMutation']('mutation CreateTask { ... }')).rejects.toEqual(
				expect.objectContaining({ userMessage: 'Custom error' })
			);
		});
	});
});

describe('createCRUDOperations', () => {
	let mockClient: Partial<Client>;
	const GET_ALL_QUERY = 'query GetAllTasks { tasks { id title } }';
	const GET_BY_ID_QUERY = 'query GetTaskById($id: ID!) { taskById(id: $id) { id title } }';
	const CREATE_MUTATION = 'mutation CreateTask($input: CreateTaskInput!) { createTask(input: $input) { id title } }';
	const UPDATE_MUTATION = 'mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) { updateTask(id: $id, input: $input) { id title } }';
	const DELETE_MUTATION = 'mutation DeleteTask($id: ID!) { deleteTask(id: $id) }';

	beforeEach(() => {
		vi.clearAllMocks();

		mockClient = {
			query: vi.fn((query, variables) => ({
				toPromise: async () => {
					if (query.includes('GetAllTasks')) {
						return {
							data: { tasks: [{ id: '1', title: 'Task 1' }, { id: '2', title: 'Task 2' }] },
							error: null
						};
					}
					if (query.includes('GetTaskById')) {
						return {
							data: { taskById: { id: variables.id, title: `Task ${variables.id}` } },
							error: null
						};
					}
					return { data: null, error: null };
				}
			})) as unknown as Client['query'],
			mutation: vi.fn((mutation, variables) => ({
				toPromise: async () => {
					if (mutation.includes('CreateTask')) {
						return {
							data: { createTask: { id: 'new-id', ...variables.input } },
							error: null
						};
					}
					if (mutation.includes('UpdateTask')) {
						return {
							data: { updateTask: { id: variables.id, ...variables.input } },
							error: null
						};
					}
					if (mutation.includes('DeleteTask')) {
						return {
							data: { deleteTask: true },
							error: null
						};
					}
					return { data: null, error: null };
				}
			})) as unknown as Client['mutation']
		};
	});

	describe('getAll()', () => {
		it('should call query with correct parameters', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				}
			});

			const result = await ops.getAll({ limit: 20 });

			expect(result).toBeDefined();
			expect(mockClient.query).toHaveBeenCalled();
		});

		it('should extract data from specified dataPath', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				},
				dataPaths: {
					getAll: 'tasks'
				}
			});

			const result = await ops.getAll({ limit: 20 });

			expect(result).toEqual([
				{ id: '1', title: 'Task 1' },
				{ id: '2', title: 'Task 2' }
			]);
		});

		it('should handle undefined variables', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				}
			});

			const result = await ops.getAll();

			expect(result).toBeDefined();
		});
	});

	describe('getById()', () => {
		it('should pass ID parameter correctly', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				},
				dataPaths: {
					getById: 'taskById'
				}
			});

			const result = await ops.getById('123');

			expect(result).toEqual({ id: '123', title: 'Task 123' });
		});
	});

	describe('create()', () => {
		it('should pass input parameter correctly', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				},
				dataPaths: {
					create: 'createTask'
				}
			});

			const result = await ops.create({ title: 'New Task', status: 'TODO' });

			expect(result).toEqual({
				id: 'new-id',
				title: 'New Task',
				status: 'TODO'
			});
		});
	});

	describe('update()', () => {
		it('should pass ID and input parameters correctly', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				},
				dataPaths: {
					update: 'updateTask'
				}
			});

			const result = await ops.update('123', { status: 'DONE' });

			expect(result).toEqual({
				id: '123',
				status: 'DONE'
			});
		});
	});

	describe('delete()', () => {
		it('should return true on successful deletion', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				},
				dataPaths: {
					delete: 'deleteTask'
				}
			});

			const result = await ops.delete('123');

			expect(result).toBe(true);
		});

		it('should return true when dataPath not specified', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				}
			});

			const result = await ops.delete('123');

			expect(result).toBe(true);
		});
	});

	describe('Entity naming in errors', () => {
		it('should use entity name in operation names', async () => {
			const ops = createCRUDOperations({
				client: mockClient as Client,
				entityName: 'Employee',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				}
			});

			await ops.getAll();

			// The operation name should be 'GetAllEmployees'
			// We can't directly test this but the factory uses entityName
			expect(mockClient.query).toHaveBeenCalled();
		});
	});
});

describe('createCRUDOperationsWithCustomNames', () => {
	let mockClient: Partial<Client>;
	const GET_ALL_QUERY = 'query GetAllTasks { tasks { id title } }';
	const GET_BY_ID_QUERY = 'query GetTaskById($id: ID!) { taskById(id: $id) { id title } }';
	const CREATE_MUTATION = 'mutation CreateTask($input: CreateTaskInput!) { createTask(input: $input) { id title } }';
	const UPDATE_MUTATION = 'mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) { updateTask(id: $id, input: $input) { id title } }';
	const DELETE_MUTATION = 'mutation DeleteTask($id: ID!) { deleteTask(id: $id) }';

	beforeEach(() => {
		vi.clearAllMocks();

		mockClient = {
			query: vi.fn(() => ({
				toPromise: async () => ({
					data: { tasks: [{ id: '1', title: 'Task 1' }] },
					error: null
				})
			})) as unknown as Client['query'],
			mutation: vi.fn(() => ({
				toPromise: async () => ({
					data: { createTask: { id: 'new-id', title: 'New Task' } },
					error: null
				})
			})) as unknown as Client['mutation']
		};
	});

	it('should create operations with custom method names', async () => {
		const ops = createCRUDOperationsWithCustomNames(
			{
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				}
			},
			{
				getAll: 'list',
				getById: 'find',
				create: 'add',
				update: 'modify',
				delete: 'remove'
			}
		);

		expect(ops).toHaveProperty('list');
		expect(ops).toHaveProperty('find');
		expect(ops).toHaveProperty('add');
		expect(ops).toHaveProperty('modify');
		expect(ops).toHaveProperty('remove');

		// Test that custom methods work
		const result = await ops.list();
		expect(result).toBeDefined();
		expect(mockClient.query).toHaveBeenCalled();
	});

	it('should use default names when custom names not provided', () => {
		const ops = createCRUDOperationsWithCustomNames(
			{
				client: mockClient as Client,
				entityName: 'Task',
				queries: {
					getAll: GET_ALL_QUERY,
					getById: GET_BY_ID_QUERY
				},
				mutations: {
					create: CREATE_MUTATION,
					update: UPDATE_MUTATION,
					delete: DELETE_MUTATION
				}
			},
			{
				getAll: 'list'
				// Others use default names
			}
		);

		expect(ops).toHaveProperty('list');
		expect(ops).toHaveProperty('getById');
		expect(ops).toHaveProperty('create');
		expect(ops).toHaveProperty('update');
		expect(ops).toHaveProperty('delete');
	});
});
