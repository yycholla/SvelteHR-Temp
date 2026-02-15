// src/adapters/graphql/GraphQLTimeOffBalanceAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLTimeOffBalanceAdapter } from './GraphQLTimeOffBalanceAdapter';
import {
	TimeOffBalanceNotFoundError,
	InvalidAccrualCalculationError
} from '$domain/TimeOffBalance';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// Mock GraphQLPort
function createMockGraphQLPort(responses: {
	query?: unknown;
	mutation?: unknown;
	queryError?: Error;
	mutationError?: Error;
}): GraphQLPort {
	return {
		query: async () => {
			if (responses.queryError) throw responses.queryError;
			return responses.query ?? null;
		},
		mutation: async () => {
			if (responses.mutationError) throw responses.mutationError;
			return responses.mutation ?? null;
		}
	} as GraphQLPort;
}

// Helper to create valid balance data
function createValidBalanceData() {
	return {
		id: '550e8400-e29b-41d4-a716-446655440000',
		employeeId: '660e8400-e29b-41d4-a716-446655440001',
		leaveType: 'vacation',
		year: 2026,
		totalHours: 160,
		usedHours: 40,
		accrualRate: 5,
		accrualPeriod: 'month',
		carryoverHours: 20
	};
}

describe('GraphQLTimeOffBalanceAdapter', () => {
	describe('findById', () => {
		it('should return balance when found', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalance: createValidBalanceData()
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findById('550e8400-e29b-41d4-a716-446655440000');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.value.totalHours.value).toBe(160);
			expect(result.value.usedHours.value).toBe(40);
		});

		it('should return error when balance not found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { timeOffBalance: null }
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findById('balance-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceNotFoundError);
		});

		it('should return error when balance data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalance: {
						...createValidBalanceData(),
						totalHours: -100 // Invalid negative hours
					}
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findById('balance-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceNotFoundError);
		});
	});

	describe('findByEmployeeId', () => {
		it('should return all balances for employee', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalancesByEmployee: [createValidBalanceData()]
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByEmployeeId('660e8400-e29b-41d4-a716-446655440001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].employeeId).toBe('660e8400-e29b-41d4-a716-446655440001');
		});

		it('should return empty array when no balances found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { timeOffBalancesByEmployee: [] }
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});

		it('should skip invalid balance records (resilient)', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalancesByEmployee: [
						createValidBalanceData(),
						{ ...createValidBalanceData(), totalHours: -100 }, // Invalid
						createValidBalanceData()
					]
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2); // Only valid records
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Database error')
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByEmployeeId('employee-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAccrualCalculationError);
		});
	});

	describe('findByEmployeeIdAndType', () => {
		it('should return balances for employee and type', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalancesByType: [createValidBalanceData()]
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByEmployeeIdAndType(
				'660e8400-e29b-41d4-a716-446655440001',
				'vacation'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].leaveType.value).toBe('vacation');
		});

		it('should return empty array when no balances found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { timeOffBalancesByType: [] }
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByEmployeeIdAndType('employee-123', 'sick');

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});
	});

	describe('findByPeriod', () => {
		it('should return all balances for period', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalancesByPeriod: [createValidBalanceData()]
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByPeriod(2026);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].period.year).toBe(2026);
		});

		it('should return empty array when no balances found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { timeOffBalancesByPeriod: [] }
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findByPeriod(2025);

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});
	});

	describe('findAll', () => {
		it('should return all balances without filter', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalances: [createValidBalanceData()]
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return all balances with filter', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					timeOffBalances: [createValidBalanceData()]
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findAll({
				employeeId: '660e8400-e29b-41d4-a716-446655440001',
				year: 2026
			});

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Database error')
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAccrualCalculationError);
		});
	});

	describe('create', () => {
		it('should create balance successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					createTimeOffBalance: createValidBalanceData()
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.create({
				employeeId: '660e8400-e29b-41d4-a716-446655440001',
				leaveType: 'vacation',
				year: 2026,
				totalHours: 160,
				accrualRate: 5,
				accrualPeriod: 'month'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.totalHours.value).toBe(160);
		});

		it('should handle creation errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Creation failed')
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.create({
				employeeId: 'emp-123',
				leaveType: 'vacation',
				year: 2026,
				totalHours: 160,
				accrualRate: 5,
				accrualPeriod: 'month'
			});

			expect(result.isError).toBe(true);
		});

		it('should return error when created balance data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					createTimeOffBalance: {
						...createValidBalanceData(),
						totalHours: -100
					}
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.create({
				employeeId: 'emp-123',
				leaveType: 'vacation',
				year: 2026,
				totalHours: 160,
				accrualRate: 5,
				accrualPeriod: 'month'
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update balance successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateTimeOffBalance: {
						...createValidBalanceData(),
						totalHours: 200
					}
				}
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.update('550e8400-e29b-41d4-a716-446655440000', {
				totalHours: 200
			});

			expect(result.isOk).toBe(true);
			expect(result.value.totalHours.value).toBe(200);
		});

		it('should return not found error when balance does not exist', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { updateTimeOffBalance: null }
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.update('nonexistent', { totalHours: 200 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceNotFoundError);
		});

		it('should handle update errors with "not found" message', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Balance not found')
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.update('balance-123', { totalHours: 200 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceNotFoundError);
		});
	});

	describe('delete', () => {
		it('should delete balance successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { deleteTimeOffBalance: true }
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.delete('550e8400-e29b-41d4-a716-446655440000');

			expect(result.isOk).toBe(true);
		});

		it('should return error when balance not found', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { deleteTimeOffBalance: false }
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.delete('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceNotFoundError);
		});

		it('should handle delete errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Delete failed')
			});

			const adapter = new GraphQLTimeOffBalanceAdapter(mockPort);
			const result = await adapter.delete('balance-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceNotFoundError);
		});
	});
});
