// src/adapters/graphql/GraphQLTaskAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLTaskAdapter } from './GraphQLTaskAdapter';
import { TaskNotFoundError } from '$domain/Task';
import { Client } from '@urql/core';

// Mock URQL client
function createMockClient(responses: Record<string, unknown>): Client {
	return {
		query: (query: unknown, variables: unknown) => ({
			toPromise: async () => responses['query'] ?? { data: null, error: null }
		}),
		mutation: (mutation: unknown, variables: unknown) => ({
			toPromise: async () => responses['mutation'] ?? { data: null, error: null }
		})
	} as unknown as Client;
}

describe('GraphQLTaskAdapter', () => {
	describe('findById', () => {
		it('should return task when found', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						task: {
							id: 'task-123',
							title: 'Test Task',
							description: 'Test description',
							status: 'TODO',
							priority: 'HIGH',
							assigneeId: null,
							dueDate: null,
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z',
							// Extra GraphQL fields we ignore
							departmentId: null,
							projectId: null,
							estimatedHours: null,
							actualHours: null,
							tags: []
						}
					}
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.findById('task-123');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('task-123');
			expect(result.value.title.value).toBe('Test Task');
		});

		it('should return error when task not found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { task: null }
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TaskNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Network error' }
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.findById('task-123');

			expect(result.isError).toBe(true);
		});
	});

	describe('create', () => {
		it('should create task', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						createTask: {
							id: 'task-new',
							title: 'New Task',
							description: 'Description',
							status: 'TODO',
							priority: 'MEDIUM',
							assigneeId: 'user-456',
							dueDate: null,
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z',
							// Extra GraphQL fields
							departmentId: null,
							projectId: null,
							estimatedHours: null,
							actualHours: null,
							tags: []
						}
					}
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.create({
				title: 'New Task',
				description: 'Description',
				assigneeId: 'user-456'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('New Task');
			expect(result.value.assigneeId).toBe('user-456');
		});
	});

	describe('update', () => {
		it('should update task', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						updateTask: {
							id: 'task-123',
							title: 'Updated Task',
							description: 'Updated description',
							status: 'IN_PROGRESS',
							priority: 'HIGH',
							assigneeId: null,
							dueDate: null,
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T12:00:00Z',
							// Extra GraphQL fields
							departmentId: null,
							projectId: null,
							estimatedHours: null,
							actualHours: null,
							tags: []
						}
					}
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.update('task-123', {
				title: 'Updated Task'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated Task');
		});
	});

	describe('findAll', () => {
		it('should return all tasks', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						tasks: [
							{
								id: 'task-1',
								title: 'Task 1',
								description: 'Description 1',
								status: 'TODO',
								priority: 'HIGH',
								assigneeId: null,
								dueDate: null,
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								departmentId: null,
								projectId: null,
								estimatedHours: null,
								actualHours: null,
								tags: []
							},
							{
								id: 'task-2',
								title: 'Task 2',
								description: 'Description 2',
								status: 'IN_PROGRESS',
								priority: 'MEDIUM',
								assigneeId: 'user-456',
								dueDate: null,
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								departmentId: null,
								projectId: null,
								estimatedHours: null,
								actualHours: null,
								tags: []
							}
						]
					}
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0].title.value).toBe('Task 1');
			expect(result.value[1].title.value).toBe('Task 2');
		});

		it('should skip invalid tasks', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						tasks: [
							{
								id: 'task-1',
								title: 'Valid Task',
								description: 'Description',
								status: 'TODO',
								priority: 'HIGH',
								assigneeId: null,
								dueDate: null,
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								departmentId: null,
								projectId: null,
								estimatedHours: null,
								actualHours: null,
								tags: []
							},
							{
								id: 'task-2',
								title: '', // Invalid - empty title
								description: 'Description',
								status: 'TODO',
								priority: 'HIGH',
								assigneeId: null,
								dueDate: null,
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								departmentId: null,
								projectId: null,
								estimatedHours: null,
								actualHours: null,
								tags: []
							}
						]
					}
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1); // Only valid task
			expect(result.value[0].title.value).toBe('Valid Task');
		});
	});

	describe('delete', () => {
		it('should delete task', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						deleteTask: true
					}
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.delete('task-123');

			expect(result.isOk).toBe(true);
		});
	});

	describe('findSubtasks', () => {
		it('should find subtasks of parent', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						tasks: [
							{
								id: 'subtask-1',
								title: 'Subtask 1',
								description: 'Description',
								status: 'TODO',
								priority: 'MEDIUM',
								assigneeId: null,
								dueDate: null,
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								departmentId: null,
								projectId: null,
								estimatedHours: null,
								actualHours: null,
								tags: []
							}
						]
					}
				}
			});

			const adapter = new GraphQLTaskAdapter(mockClient, 'user-123');
			const result = await adapter.findSubtasks('parent-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].title.value).toBe('Subtask 1');
		});
	});
});
