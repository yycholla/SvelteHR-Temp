// src/adapters/graphql/GraphQLActivityLogAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLActivityLogAdapter } from './GraphQLActivityLogAdapter';
import { ActivityLog, ActivityAction, ResourceType } from '$domain/ActivityLog';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174001';
const VALID_UUID_3 = '323e4567-e89b-12d3-a456-426614174002';

/**
 * Mock GraphQLPort for testing
 */
class MockGraphQLPort implements GraphQLPort {
	private mockData: Record<string, unknown> = {};
	private shouldThrow = false;

	setMockData(data: Record<string, unknown>) {
		this.mockData = data;
		this.shouldThrow = false;
	}

	setShouldThrow(shouldThrow: boolean) {
		this.shouldThrow = shouldThrow;
	}

	async query<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL query failed');
		}
		return this.mockData as T;
	}

	async mutation<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL mutation failed');
		}
		return this.mockData as T;
	}
}

/**
 * Helper to create valid GraphQL activity log data
 */
function createGraphQLActivityLog(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_UUID,
		employeeId: VALID_UUID_2,
		action: 'create',
		resourceType: 'employee',
		resourceId: null,
		details: null,
		beforeSnapshot: null,
		afterSnapshot: null,
		isRollback: false,
		rolledBackLogId: null,
		ipAddress: null,
		userAgent: null,
		createdAt: '2025-01-15T09:00:00.000Z',
		...overrides
	};
}

/**
 * Helper to create a domain ActivityLog entity for create() tests
 */
function createDomainLog(): ActivityLog {
	const actionResult = ActivityAction.create('create');
	const typeResult = ResourceType.create('employee');

	const logResult = ActivityLog.create({
		id: VALID_UUID,
		employeeId: VALID_UUID_2,
		action: actionResult.value,
		resourceType: typeResult.value,
		createdAt: new Date('2025-01-15T09:00:00.000Z')
	});

	if (logResult.isError) throw new Error('Test setup failed');
	return logResult.value;
}

describe('GraphQLActivityLogAdapter', () => {
	let adapter: GraphQLActivityLogAdapter;
	let mockGraphQL: MockGraphQLPort;

	beforeEach(() => {
		mockGraphQL = new MockGraphQLPort();
		adapter = new GraphQLActivityLogAdapter(mockGraphQL);
	});

	describe('findById()', () => {
		it('should return a log when found', async () => {
			mockGraphQL.setMockData({
				activityLog: createGraphQLActivityLog()
			});

			const result = await adapter.findById(VALID_UUID);
			expect(result.isOk).toBe(true);
			expect(result.value?.id).toBe(VALID_UUID);
		});

		it('should return null when log is not found', async () => {
			mockGraphQL.setMockData({ activityLog: null });

			const result = await adapter.findById(VALID_UUID);
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when GraphQL throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findById(VALID_UUID);
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when data has invalid action', async () => {
			mockGraphQL.setMockData({
				activityLog: createGraphQLActivityLog({ action: 'invalid_action' })
			});

			const result = await adapter.findById(VALID_UUID);
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when data has invalid resource type', async () => {
			mockGraphQL.setMockData({
				activityLog: createGraphQLActivityLog({ resourceType: 'invalid_type' })
			});

			const result = await adapter.findById(VALID_UUID);
			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should map all fields correctly', async () => {
			mockGraphQL.setMockData({
				activityLog: createGraphQLActivityLog({
					action: 'update',
					resourceType: 'department',
					resourceId: VALID_UUID_3,
					details: { field: 'name' },
					beforeSnapshot: { name: 'Old' },
					afterSnapshot: { name: 'New' },
					isRollback: true,
					rolledBackLogId: VALID_UUID_3,
					ipAddress: '192.168.1.1'
				})
			});

			const result = await adapter.findById(VALID_UUID);
			expect(result.isOk).toBe(true);
			const log = result.value!;
			expect(log.action.value).toBe('update');
			expect(log.resourceType.value).toBe('department');
			expect(log.resourceId).toBe(VALID_UUID_3);
			expect(log.details).toEqual({ field: 'name' });
			expect(log.beforeSnapshot).toEqual({ name: 'Old' });
			expect(log.afterSnapshot).toEqual({ name: 'New' });
			expect(log.isRollback).toBe(true);
			expect(log.rolledBackLogId).toBe(VALID_UUID_3);
			expect(log.ipAddress?.value).toBe('192.168.1.1');
		});
	});

	describe('findByEmployeeId()', () => {
		it('should return logs for an employee', async () => {
			mockGraphQL.setMockData({
				activityLogsByEmployee: [
					createGraphQLActivityLog(),
					createGraphQLActivityLog({ id: VALID_UUID_3 })
				]
			});

			const result = await adapter.findByEmployeeId(VALID_UUID_2);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no logs found', async () => {
			mockGraphQL.setMockData({ activityLogsByEmployee: [] });

			const result = await adapter.findByEmployeeId(VALID_UUID_2);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid logs (resilient)', async () => {
			mockGraphQL.setMockData({
				activityLogsByEmployee: [
					createGraphQLActivityLog(),
					createGraphQLActivityLog({ id: VALID_UUID_3, action: 'invalid_action' })
				]
			});

			const result = await adapter.findByEmployeeId(VALID_UUID_2);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when GraphQL throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findByEmployeeId(VALID_UUID_2);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch activity logs for employee');
		});

		it('should handle null response gracefully', async () => {
			mockGraphQL.setMockData({ activityLogsByEmployee: null });

			const result = await adapter.findByEmployeeId(VALID_UUID_2);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('findByResourceType()', () => {
		it('should return logs for a resource type', async () => {
			mockGraphQL.setMockData({
				activityLogsByResourceType: [createGraphQLActivityLog()]
			});

			const typeResult = ResourceType.create('employee');
			const result = await adapter.findByResourceType(typeResult.value);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return empty array when no logs found', async () => {
			mockGraphQL.setMockData({ activityLogsByResourceType: [] });

			const typeResult = ResourceType.create('department');
			const result = await adapter.findByResourceType(typeResult.value);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid logs (resilient)', async () => {
			mockGraphQL.setMockData({
				activityLogsByResourceType: [
					createGraphQLActivityLog(),
					createGraphQLActivityLog({ id: VALID_UUID_3, resourceType: 'invalid_type' })
				]
			});

			const typeResult = ResourceType.create('employee');
			const result = await adapter.findByResourceType(typeResult.value);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when GraphQL throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const typeResult = ResourceType.create('employee');
			const result = await adapter.findByResourceType(typeResult.value);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch activity logs by resource type');
		});
	});

	describe('findByDateRange()', () => {
		it('should return logs within date range', async () => {
			mockGraphQL.setMockData({
				activityLogsByDateRange: [createGraphQLActivityLog()]
			});

			const from = new Date('2025-01-01T00:00:00.000Z');
			const to = new Date('2025-12-31T23:59:59.000Z');
			const result = await adapter.findByDateRange(from, to);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return empty array when no logs in range', async () => {
			mockGraphQL.setMockData({ activityLogsByDateRange: [] });

			const from = new Date('2020-01-01T00:00:00.000Z');
			const to = new Date('2020-12-31T23:59:59.000Z');
			const result = await adapter.findByDateRange(from, to);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return error when GraphQL throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const from = new Date('2025-01-01T00:00:00.000Z');
			const to = new Date('2025-12-31T23:59:59.000Z');
			const result = await adapter.findByDateRange(from, to);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch activity logs by date range');
		});
	});

	describe('findAll()', () => {
		it('should return all logs', async () => {
			mockGraphQL.setMockData({
				activityLogs: [createGraphQLActivityLog(), createGraphQLActivityLog({ id: VALID_UUID_3 })]
			});

			const result = await adapter.findAll();
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no logs', async () => {
			mockGraphQL.setMockData({ activityLogs: [] });

			const result = await adapter.findAll();
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid logs (resilient)', async () => {
			mockGraphQL.setMockData({
				activityLogs: [
					createGraphQLActivityLog(),
					createGraphQLActivityLog({ id: VALID_UUID_3, action: 'BAD_ACTION' })
				]
			});

			const result = await adapter.findAll();
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when GraphQL throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findAll();
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to fetch activity logs');
		});

		it('should handle null response gracefully', async () => {
			mockGraphQL.setMockData({ activityLogs: null });

			const result = await adapter.findAll();
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('create()', () => {
		it('should create and return an activity log', async () => {
			mockGraphQL.setMockData({
				createActivityLog: createGraphQLActivityLog()
			});

			const log = createDomainLog();
			const result = await adapter.create(log);
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
		});

		it('should return error when mutation returns null', async () => {
			mockGraphQL.setMockData({ createActivityLog: null });

			const log = createDomainLog();
			const result = await adapter.create(log);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to create activity log');
		});

		it('should return error when mutation returns invalid data', async () => {
			mockGraphQL.setMockData({
				createActivityLog: createGraphQLActivityLog({ action: 'bad_action' })
			});

			const log = createDomainLog();
			const result = await adapter.create(log);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid activity log data returned from create');
		});

		it('should return error when GraphQL throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const log = createDomainLog();
			const result = await adapter.create(log);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to create activity log');
		});
	});

	describe('deleteOlderThan()', () => {
		it('should return the count of deleted logs', async () => {
			mockGraphQL.setMockData({ deleteActivityLogsOlderThan: 5 });

			const result = await adapter.deleteOlderThan(new Date('2025-01-01T00:00:00.000Z'));
			expect(result.isOk).toBe(true);
			expect(result.value).toBe(5);
		});

		it('should return 0 when no logs deleted', async () => {
			mockGraphQL.setMockData({ deleteActivityLogsOlderThan: 0 });

			const result = await adapter.deleteOlderThan(new Date('2020-01-01T00:00:00.000Z'));
			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should return 0 when response is null', async () => {
			mockGraphQL.setMockData({ deleteActivityLogsOlderThan: null });

			const result = await adapter.deleteOlderThan(new Date());
			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should return error when GraphQL throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.deleteOlderThan(new Date());
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Failed to delete activity logs');
		});
	});
});
