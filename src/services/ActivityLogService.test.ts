// src/services/ActivityLogService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivityLogService } from './ActivityLogService';
import { ActivityLog, ActivityAction, ResourceType, ActivityLogNotFoundError } from '$domain/ActivityLog';
import type { ActivityLogError } from '$domain/ActivityLog';
import { Result } from '$domain/Result';
import type { ActivityLogRepository } from './ports/ActivityLogRepository';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174001';
const VALID_UUID_3 = '323e4567-e89b-12d3-a456-426614174002';

function createTestLog(overrides: Record<string, unknown> = {}): ActivityLog {
	const actionResult = ActivityAction.create('create');
	const typeResult = ResourceType.create('employee');

	const logResult = ActivityLog.create({
		id: VALID_UUID,
		employeeId: VALID_UUID_2,
		action: actionResult.value,
		resourceType: typeResult.value,
		createdAt: new Date('2025-01-15T09:00:00.000Z'),
		...overrides
	});

	if (logResult.isError) throw new Error(`Test setup failed: ${logResult.error.message}`);
	return logResult.value;
}

/**
 * Mock repository for testing
 */
class MockActivityLogRepository implements ActivityLogRepository {
	private logs: ActivityLog[] = [];
	private shouldThrow = false;
	private throwError: ActivityLogError | null = null;

	setLogs(logs: ActivityLog[]) {
		this.logs = logs;
	}

	setShouldThrow(error: ActivityLogError) {
		this.shouldThrow = true;
		this.throwError = error;
	}

	resetShouldThrow() {
		this.shouldThrow = false;
		this.throwError = null;
	}

	private getError(): ActivityLogError {
		return this.throwError ?? new ActivityLogNotFoundError('mock-error');
	}

	async findById(id: string): Promise<Result<ActivityLog | null, ActivityLogError>> {
		if (this.shouldThrow) return Result.error(this.getError());
		const log = this.logs.find((l) => l.id === id) ?? null;
		return Result.ok(log);
	}

	async findByEmployeeId(
		employeeId: string,
		_limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		if (this.shouldThrow) return Result.error(this.getError());
		return Result.ok(this.logs.filter((l) => l.employeeId === employeeId));
	}

	async findByResourceType(
		resourceType: ReturnType<typeof ResourceType.create>['value'] extends infer T ? T : never,
		_limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		if (this.shouldThrow) return Result.error(this.getError());
		return Result.ok(
			this.logs.filter((l) => l.resourceType.value === (resourceType as { value: string }).value)
		);
	}

	async findByDateRange(
		from: Date,
		to: Date,
		_limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		if (this.shouldThrow) return Result.error(this.getError());
		return Result.ok(
			this.logs.filter((l) => l.createdAt >= from && l.createdAt <= to)
		);
	}

	async findAll(_limit?: number): Promise<Result<ActivityLog[], ActivityLogError>> {
		if (this.shouldThrow) return Result.error(this.getError());
		return Result.ok([...this.logs]);
	}

	async create(log: ActivityLog): Promise<Result<ActivityLog, ActivityLogError>> {
		if (this.shouldThrow) return Result.error(this.getError());
		this.logs.push(log);
		return Result.ok(log);
	}

	async deleteOlderThan(date: Date): Promise<Result<number, ActivityLogError>> {
		if (this.shouldThrow) return Result.error(this.getError());
		const before = this.logs.length;
		this.logs = this.logs.filter((l) => l.createdAt >= date);
		return Result.ok(before - this.logs.length);
	}
}

describe('ActivityLogService', () => {
	let service: ActivityLogService;
	let repository: MockActivityLogRepository;

	beforeEach(() => {
		repository = new MockActivityLogRepository();
		service = new ActivityLogService(repository);
	});

	describe('getById()', () => {
		it('should return a log when found', async () => {
			const log = createTestLog();
			repository.setLogs([log]);

			const result = await service.getById(VALID_UUID);
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
		});

		it('should return ActivityLogNotFoundError when not found', async () => {
			repository.setLogs([]);

			const result = await service.getById(VALID_UUID);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ActivityLogNotFoundError);
			expect(result.error.message).toContain(VALID_UUID);
		});

		it('should propagate repository errors', async () => {
			repository.setShouldThrow(new ActivityLogNotFoundError('repo-error'));

			const result = await service.getById(VALID_UUID);
			expect(result.isError).toBe(true);
		});
	});

	describe('getByEmployeeId()', () => {
		it('should return logs for a given employee', async () => {
			const log1 = createTestLog({ id: VALID_UUID, employeeId: VALID_UUID_2 });
			const log2 = createTestLog({ id: VALID_UUID_3, employeeId: VALID_UUID_2 });
			repository.setLogs([log1, log2]);

			const result = await service.getByEmployeeId(VALID_UUID_2);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no logs found', async () => {
			repository.setLogs([]);

			const result = await service.getByEmployeeId(VALID_UUID_2);
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should propagate repository errors', async () => {
			repository.setShouldThrow(new ActivityLogNotFoundError('error'));

			const result = await service.getByEmployeeId(VALID_UUID_2);
			expect(result.isError).toBe(true);
		});
	});

	describe('getByResourceType()', () => {
		it('should return logs for a valid resource type', async () => {
			const log = createTestLog();
			repository.setLogs([log]);

			const result = await service.getByResourceType('employee');
			expect(result.isOk).toBe(true);
		});

		it('should return error for invalid resource type', async () => {
			const result = await service.getByResourceType('invalid_type');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid resource type');
		});

		it('should propagate repository errors', async () => {
			repository.setShouldThrow(new ActivityLogNotFoundError('error'));

			const result = await service.getByResourceType('employee');
			expect(result.isError).toBe(true);
		});
	});

	describe('getByDateRange()', () => {
		it('should return logs within date range', async () => {
			const log = createTestLog();
			repository.setLogs([log]);

			const from = new Date('2025-01-01T00:00:00.000Z');
			const to = new Date('2025-12-31T23:59:59.000Z');
			const result = await service.getByDateRange(from, to);
			expect(result.isOk).toBe(true);
		});

		it('should return error when from date is after to date', async () => {
			const from = new Date('2025-12-31T00:00:00.000Z');
			const to = new Date('2025-01-01T00:00:00.000Z');
			const result = await service.getByDateRange(from, to);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('from date must be before to date');
		});

		it('should return error for invalid from date', async () => {
			const result = await service.getByDateRange(new Date('invalid'), new Date());
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid date range');
		});

		it('should return error for invalid to date', async () => {
			const result = await service.getByDateRange(new Date(), new Date('invalid'));
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid date range');
		});
	});

	describe('getAll()', () => {
		it('should return all logs', async () => {
			const log1 = createTestLog();
			const log2 = createTestLog({ id: VALID_UUID_3, employeeId: VALID_UUID_2 });
			repository.setLogs([log1, log2]);

			const result = await service.getAll();
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no logs', async () => {
			const result = await service.getAll();
			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should propagate repository errors', async () => {
			repository.setShouldThrow(new ActivityLogNotFoundError('error'));

			const result = await service.getAll();
			expect(result.isError).toBe(true);
		});
	});

	describe('create()', () => {
		it('should create a log with valid input', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_UUID_2,
				action: 'create',
				resourceType: 'employee'
			});
			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
		});

		it('should create a log with all optional fields', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_UUID_2,
				action: 'update',
				resourceType: 'employee',
				resourceId: VALID_UUID_3,
				details: { field: 'name' },
				beforeSnapshot: { name: 'Old' },
				afterSnapshot: { name: 'New' },
				isRollback: false,
				ipAddress: '192.168.1.1'
			});
			expect(result.isOk).toBe(true);
		});

		it('should return error for invalid action', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_UUID_2,
				action: 'invalid_action',
				resourceType: 'employee'
			});
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid activity action');
		});

		it('should return error for invalid resource type', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_UUID_2,
				action: 'create',
				resourceType: 'invalid_type'
			});
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid resource type');
		});

		it('should return error for invalid IP address', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_UUID_2,
				action: 'create',
				resourceType: 'employee',
				ipAddress: 'a'.repeat(46) // exceeds 45 chars
			});
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('45 characters');
		});

		it('should propagate repository errors', async () => {
			repository.setShouldThrow(new ActivityLogNotFoundError('error'));

			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_UUID_2,
				action: 'create',
				resourceType: 'employee'
			});
			expect(result.isError).toBe(true);
		});
	});

	describe('purgeOlderThan()', () => {
		it('should delete logs older than given date and return count', async () => {
			const oldLog = createTestLog({ createdAt: new Date('2020-01-01T00:00:00.000Z') });
			const newLog = createTestLog({ id: VALID_UUID_3, createdAt: new Date('2025-01-15T00:00:00.000Z') });
			repository.setLogs([oldLog, newLog]);

			const cutoff = new Date('2023-01-01T00:00:00.000Z');
			const result = await service.purgeOlderThan(cutoff);
			expect(result.isOk).toBe(true);
			expect(result.value).toBe(1);
		});

		it('should return 0 when no logs are older than the cutoff', async () => {
			const newLog = createTestLog({ createdAt: new Date('2025-01-15T00:00:00.000Z') });
			repository.setLogs([newLog]);

			const cutoff = new Date('2020-01-01T00:00:00.000Z');
			const result = await service.purgeOlderThan(cutoff);
			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should return error for invalid date', async () => {
			const result = await service.purgeOlderThan(new Date('invalid'));
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid date for purge operation');
		});

		it('should propagate repository errors', async () => {
			repository.setShouldThrow(new ActivityLogNotFoundError('error'));

			const result = await service.purgeOlderThan(new Date());
			expect(result.isError).toBe(true);
		});
	});
});
