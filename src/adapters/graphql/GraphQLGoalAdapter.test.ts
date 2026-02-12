// src/adapters/graphql/GraphQLGoalAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLGoalAdapter } from './GraphQLGoalAdapter';
import { GoalNotFoundError } from '$domain/Goal';
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

describe('GraphQLGoalAdapter', () => {
	describe('findById', () => {
		it('should return goal when found', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						employeeGoal: {
							id: 'goal-123',
							employeeId: 'emp-456',
							title: 'Complete Q1 OKRs',
							description: 'Achieve all Q1 objectives',
							targetDate: '2026-03-31T00:00:00Z',
							progress: 50,
							status: 'in_progress',
							priority: 'high',
							quarter: 'Q1',
							year: 2026,
							createdBy: 'user-123',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z',
							completedAt: null
						}
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.findById('goal-123');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('goal-123');
			expect(result.value.title.value).toBe('Complete Q1 OKRs');
			expect(result.value.progress.value).toBe(50);
		});

		it('should return error when goal not found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { employeeGoal: null }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Network error' }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.findById('goal-123');

			expect(result.isError).toBe(true);
		});
	});

	describe('findAll', () => {
		it('should return all goals', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						employeeGoals: [
							{
								id: 'goal-1',
								employeeId: 'emp-1',
								title: 'Goal 1',
								description: 'Description 1',
								targetDate: '2026-03-31T00:00:00Z',
								progress: 25,
								status: 'in_progress',
								priority: 'high',
								quarter: 'Q1',
								year: 2026,
								createdBy: 'user-123',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								completedAt: null
							},
							{
								id: 'goal-2',
								employeeId: 'emp-2',
								title: 'Goal 2',
								description: 'Description 2',
								targetDate: '2026-06-30T00:00:00Z',
								progress: 75,
								status: 'in_progress',
								priority: 'medium',
								quarter: 'Q2',
								year: 2026,
								createdBy: 'user-123',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								completedAt: null
							}
						]
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0].title.value).toBe('Goal 1');
			expect(result.value[1].title.value).toBe('Goal 2');
		});

		it('should return empty array when no goals found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { employeeGoals: [] }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should skip invalid goals', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						employeeGoals: [
							{
								id: 'goal-1',
								employeeId: 'emp-1',
								title: 'Valid Goal',
								description: 'Description',
								targetDate: '2026-03-31T00:00:00Z',
								progress: 50,
								status: 'in_progress',
								priority: 'high',
								quarter: 'Q1',
								year: 2026,
								createdBy: 'user-123',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								completedAt: null
							},
							{
								id: 'goal-2',
								employeeId: 'emp-2',
								title: '', // Invalid - empty title
								description: 'Description',
								targetDate: '2026-03-31T00:00:00Z',
								progress: 50,
								status: 'in_progress',
								priority: 'high',
								quarter: 'Q1',
								year: 2026,
								createdBy: 'user-123',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								completedAt: null
							}
						]
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1); // Only valid goal
			expect(result.value[0].title.value).toBe('Valid Goal');
		});
	});

	describe('create', () => {
		it('should create goal', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						createEmployeeGoal: {
							id: 'goal-new',
							employeeId: 'emp-456',
							title: 'New Goal',
							description: 'Goal description',
							targetDate: '2026-12-31T00:00:00Z',
							progress: 0,
							status: 'not_started',
							priority: 'medium',
							quarter: 'Q4',
							year: 2026,
							createdBy: 'user-123',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z',
							completedAt: null
						}
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.create({
				employeeId: 'emp-456',
				title: 'New Goal',
				description: 'Goal description',
				targetDate: '2026-12-31',
				createdBy: 'user-123'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('New Goal');
			expect(result.value.employeeId).toBe('emp-456');
		});

		it('should handle validation errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Validation failed' }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.create({
				employeeId: 'emp-456',
				title: 'New Goal',
				description: 'Description',
				targetDate: '2026-12-31',
				createdBy: 'user-123'
			});

			expect(result.isError).toBe(true);
		});

		it('should handle GraphQL errors during creation', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: null
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.create({
				employeeId: 'emp-456',
				title: 'New Goal',
				description: 'Description',
				targetDate: '2026-12-31',
				createdBy: 'user-123'
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update goal', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						updateEmployeeGoal: {
							id: 'goal-123',
							employeeId: 'emp-456',
							title: 'Updated Goal',
							description: 'Updated description',
							targetDate: '2026-12-31T00:00:00Z',
							progress: 80,
							status: 'in_progress',
							priority: 'high',
							quarter: 'Q4',
							year: 2026,
							createdBy: 'user-123',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T12:00:00Z',
							completedAt: null
						}
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.update('goal-123', {
				title: 'Updated Goal',
				progress: 80
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated Goal');
			expect(result.value.progress.value).toBe(80);
		});

		it('should return error when goal not found', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: { updateEmployeeGoal: null }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.update('nonexistent', {
				title: 'Updated Goal'
			});

			expect(result.isError).toBe(true);
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Update failed' }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.update('goal-123', {
				title: 'Updated Goal'
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('delete', () => {
		it('should delete goal', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						deleteEmployeeGoal: true
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.delete('goal-123');

			expect(result.isOk).toBe(true);
		});

		it('should return error when goal not found', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Goal not found' }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.delete('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(GoalNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Delete failed' }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.delete('goal-123');

			expect(result.isError).toBe(true);
		});
	});

	describe('getGoalsForEmployee', () => {
		it('should get goals for employee', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						employeeGoals: [
							{
								id: 'goal-1',
								employeeId: 'emp-123',
								title: 'Employee Goal 1',
								description: 'Description',
								targetDate: '2026-03-31T00:00:00Z',
								progress: 50,
								status: 'in_progress',
								priority: 'high',
								quarter: 'Q1',
								year: 2026,
								createdBy: 'user-123',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								completedAt: null
							}
						]
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.getGoalsForEmployee('emp-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].employeeId).toBe('emp-123');
		});

		it('should return empty array when no goals found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { employeeGoals: [] }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.getGoalsForEmployee('emp-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Query failed' }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.getGoalsForEmployee('emp-123');

			expect(result.isError).toBe(true);
		});
	});

	describe('getGoalsByStatus', () => {
		it('should get goals by status', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						employeeGoals: [
							{
								id: 'goal-1',
								employeeId: 'emp-123',
								title: 'Completed Goal',
								description: 'Description',
								targetDate: '2026-03-31T00:00:00Z',
								progress: 100,
								status: 'completed',
								priority: 'high',
								quarter: 'Q1',
								year: 2026,
								createdBy: 'user-123',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								completedAt: '2026-02-11T15:00:00Z'
							}
						]
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.getGoalsByStatus('completed');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].status.value).toBe('completed');
		});

		it('should return empty array when no goals with status found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { employeeGoals: [] }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.getGoalsByStatus('completed');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Query failed' }
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.getGoalsByStatus('completed');

			expect(result.isError).toBe(true);
		});
	});

	describe('mapToGoal', () => {
		it('should handle all fields correctly', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						employeeGoal: {
							id: 'goal-123',
							employeeId: 'emp-456',
							title: 'Complete Project',
							description: 'Detailed description',
							targetDate: '2026-12-31T00:00:00Z',
							progress: 65,
							status: 'in_progress',
							priority: 'high',
							quarter: 'Q4',
							year: 2026,
							createdBy: 'user-123',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T12:00:00Z',
							completedAt: null
						}
					}
				}
			});

			const adapter = new GraphQLGoalAdapter(mockClient);
			const result = await adapter.findById('goal-123');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('goal-123');
			expect(result.value.employeeId).toBe('emp-456');
			expect(result.value.title.value).toBe('Complete Project');
			expect(result.value.description.value).toBe('Detailed description');
			expect(result.value.progress.value).toBe(65);
			expect(result.value.status.value).toBe('in_progress');
			expect(result.value.priority.value).toBe('high');
			expect(result.value.quarter?.value).toBe(4);
			expect(result.value.year).toBe(2026);
			expect(result.value.createdBy).toBe('user-123');
			expect(result.value.completedAt).toBeUndefined();
		});
	});
});
