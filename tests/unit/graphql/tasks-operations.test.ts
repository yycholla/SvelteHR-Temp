import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TasksOperations } from '$lib/graphql/tasks-operations';
import { Client } from '@urql/core';

// Mock urql Client
const mockQuery = vi.fn();
const mockMutation = vi.fn();

const mockClient = {
	query: mockQuery,
	mutation: mockMutation
} as unknown as Client;

describe('TasksOperations', () => {
	let service: TasksOperations;
	const userCredentials = {
		userId: '123',
		roles: ['user'],
		permissions: [],
		isAuthenticated: true
	} as any;

	beforeEach(() => {
		service = new TasksOperations(mockClient);
		vi.clearAllMocks();
	});

	describe('getAllTasks', () => {
		it('should fetch tasks successfully', async () => {
			const mockTasks = [{ id: '1', title: 'Test Task' }];
			mockQuery.mockReturnValue({
				toPromise: () => Promise.resolve({ data: { tasks: mockTasks }, error: undefined })
			});

			const result = await service.getAllTasks({ userCredentials });

			expect(result.tasks).toEqual(mockTasks);
			expect(result.totalCount).toBe(1);
			expect(mockQuery).toHaveBeenCalled();
		});
	});

	describe('createTask', () => {
		it('should create task successfully', async () => {
			const input = {
				title: 'New Task',
				status: 'TODO' as const,
				priority: 'MEDIUM' as const
			};
			const mockTask = { id: '1', ...input };

			mockMutation.mockReturnValue({
				toPromise: () => Promise.resolve({ data: { createTask: mockTask }, error: undefined })
			});

			const result = await service.createTask({ input, userCredentials });

			expect(result).toEqual(mockTask);
			expect(mockMutation).toHaveBeenCalled();
		});

		it('should validate input', async () => {
			const input = {
				title: '', // Invalid
				status: 'TODO' as const,
				priority: 'MEDIUM' as const
			};

			await expect(service.createTask({ input, userCredentials })).rejects.toThrow();
			expect(mockMutation).not.toHaveBeenCalled();
		});
	});
});
