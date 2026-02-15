// src/adapters/graphql/GraphQLCompensationAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLCompensationAdapter } from './GraphQLCompensationAdapter';
import { CompensationNotFoundError, InvalidCompensationError } from '$domain/Compensation';
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

// Helper to create valid compensation data
function createValidCompensationData() {
	return {
		id: '123e4567-e89b-12d3-a456-426614174000',
		employeeId: '123e4567-e89b-12d3-a456-426614174001',
		salary: 75000,
		currency: 'USD',
		salaryGrade: 'mid',
		compensationType: 'salary',
		paymentFrequency: 'monthly',
		effectiveDate: '2024-01-01T00:00:00Z',
		endDate: null,
		notes: 'Annual review increase'
	};
}

describe('GraphQLCompensationAdapter', () => {
	describe('findById', () => {
		it('should return compensation when found', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensation: createValidCompensationData()
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('123e4567-e89b-12d3-a456-426614174000');
			expect(result.value.salary.amount).toBe(75000);
			expect(result.value.salary.currency).toBe('USD');
		});

		it('should return error when compensation not found', async () => {
			const mockPort = createMockGraphQLPort({
				query: { compensation: null }
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CompensationNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findById('comp-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CompensationNotFoundError);
		});

		it('should return error when compensation data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensation: {
						...createValidCompensationData(),
						salary: -1000 // Invalid negative salary
					}
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findById('comp-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CompensationNotFoundError);
		});

		it('should handle compensation with end date', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensation: {
						...createValidCompensationData(),
						endDate: '2024-12-31T00:00:00Z'
					}
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findById('comp-123');

			expect(result.isOk).toBe(true);
			expect(result.value.endDate).not.toBeNull();
			expect(result.value.isActive).toBe(false);
		});

		it('should handle compensation without notes', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensation: {
						...createValidCompensationData(),
						notes: null
					}
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findById('comp-123');

			expect(result.isOk).toBe(true);
			expect(result.value.notes).toBeNull();
		});
	});

	describe('findByEmployeeId', () => {
		it('should return all compensations for employee', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensationsByEmployee: [
						createValidCompensationData(),
						{ ...createValidCompensationData(), id: 'comp-456', salary: 80000 }
					]
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0].salary.amount).toBe(75000);
			expect(result.value[1].salary.amount).toBe(80000);
		});

		it('should return empty array when no compensations found', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensationsByEmployee: []
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toEqual([]);
		});

		it('should filter out invalid compensation records', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensationsByEmployee: [
						createValidCompensationData(),
						{ ...createValidCompensationData(), salary: -1000 }, // Invalid
						{ ...createValidCompensationData(), id: 'comp-789', salary: 90000 }
					]
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2); // Only valid records
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				queryError: new Error('Network error')
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findByEmployeeId('employee-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});
	});

	describe('findActiveByEmployeeId', () => {
		it('should return active compensation', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					activeCompensation: createValidCompensationData()
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findActiveByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).not.toBeNull();
			expect(result.value!.isActive).toBe(true);
		});

		it('should return null when no active compensation exists', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					activeCompensation: null
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findActiveByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when active compensation data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					activeCompensation: {
						...createValidCompensationData(),
						salaryGrade: 'INVALID_GRADE'
					}
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findActiveByEmployeeId('employee-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('findAll', () => {
		it('should return all compensations without filter', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensations: [
						createValidCompensationData(),
						{ ...createValidCompensationData(), id: 'comp-456' }
					]
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return filtered compensations', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensations: [createValidCompensationData()]
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findAll({
				salaryGrade: 'mid',
				isActive: true
			});

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should skip invalid compensation records', async () => {
			const mockPort = createMockGraphQLPort({
				query: {
					compensations: [
						createValidCompensationData(),
						{ ...createValidCompensationData(), currency: '' }, // Invalid
						{ ...createValidCompensationData(), id: 'comp-789' }
					]
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});
	});

	describe('create', () => {
		it('should create compensation successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					createCompensation: createValidCompensationData()
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.create({
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				salary: 75000,
				currency: 'USD',
				salaryGrade: 'mid',
				compensationType: 'salary',
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.salary.amount).toBe(75000);
		});

		it('should return error when creation fails', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: { createCompensation: null }
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.create({
				employeeId: 'employee-123',
				salary: 75000,
				currency: 'USD',
				salaryGrade: 'mid',
				compensationType: 'salary',
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});

		it('should handle GraphQL mutation errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Database constraint violation')
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.create({
				employeeId: 'employee-123',
				salary: 75000,
				currency: 'USD',
				salaryGrade: 'mid',
				compensationType: 'salary',
				paymentFrequency: 'monthly',
				effectiveDate: '2024-01-01'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});
	});

	describe('update', () => {
		it('should update compensation successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateCompensation: {
						...createValidCompensationData(),
						salary: 80000
					}
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.update('comp-123', {
				salary: 80000,
				currency: 'USD'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.salary.amount).toBe(80000);
		});

		it('should return not found error when compensation does not exist', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Compensation not found')
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.update('nonexistent', {
				salary: 80000,
				currency: 'USD'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CompensationNotFoundError);
		});

		it('should return error when updated data is invalid', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					updateCompensation: {
						...createValidCompensationData(),
						compensationType: 'invalid_type'
					}
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.update('comp-123', {
				compensationType: 'invalid_type'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});
	});

	describe('terminate', () => {
		it('should terminate compensation successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					terminateCompensation: {
						...createValidCompensationData(),
						endDate: '2024-12-31T00:00:00Z'
					}
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.terminate('comp-123', '2024-12-31');

			expect(result.isOk).toBe(true);
			expect(result.value.endDate).not.toBeNull();
		});

		it('should return not found error when compensation does not exist', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Not found')
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.terminate('nonexistent', '2024-12-31');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CompensationNotFoundError);
		});
	});

	describe('delete', () => {
		it('should delete compensation successfully', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					deleteCompensation: true
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.delete('comp-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeUndefined();
		});

		it('should return error when deletion fails', async () => {
			const mockPort = createMockGraphQLPort({
				mutation: {
					deleteCompensation: false
				}
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.delete('comp-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CompensationNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockPort = createMockGraphQLPort({
				mutationError: new Error('Database error')
			});

			const adapter = new GraphQLCompensationAdapter(mockPort);
			const result = await adapter.delete('comp-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(CompensationNotFoundError);
		});
	});
});
