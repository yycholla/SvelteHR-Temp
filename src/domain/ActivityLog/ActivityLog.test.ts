// src/domain/ActivityLog/ActivityLog.test.ts
import { describe, it, expect } from 'vitest';
import { ActivityLog } from './ActivityLog';
import { ActivityAction } from './value-objects/ActivityAction';
import { ResourceType } from './value-objects/ResourceType';
import { IpAddress } from './value-objects/IpAddress';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174001';
const VALID_UUID_3 = '323e4567-e89b-12d3-a456-426614174002';

function createValidAction(value = 'create') {
	return ActivityAction.create(value).value;
}

function createValidResourceType(value = 'employee') {
	return ResourceType.create(value).value;
}

function createValidLog(overrides: Partial<Parameters<typeof ActivityLog.create>[0]> = {}) {
	return ActivityLog.create({
		id: VALID_UUID,
		employeeId: VALID_UUID_2,
		action: createValidAction(),
		resourceType: createValidResourceType(),
		createdAt: new Date('2025-01-15T09:00:00.000Z'),
		...overrides
	});
}

describe('ActivityLog', () => {
	describe('create()', () => {
		it('should create a valid ActivityLog with minimal fields', () => {
			const result = createValidLog();
			expect(result.isOk).toBe(true);
		});

		it('should store the correct id', () => {
			const result = createValidLog();
			expect(result.value.id).toBe(VALID_UUID);
		});

		it('should store the correct employeeId', () => {
			const result = createValidLog();
			expect(result.value.employeeId).toBe(VALID_UUID_2);
		});

		it('should store the correct action', () => {
			const result = createValidLog();
			expect(result.value.action.value).toBe('create');
		});

		it('should store the correct resourceType', () => {
			const result = createValidLog();
			expect(result.value.resourceType.value).toBe('employee');
		});

		it('should default optional fields to null', () => {
			const result = createValidLog();
			expect(result.value.resourceId).toBeNull();
			expect(result.value.details).toBeNull();
			expect(result.value.beforeSnapshot).toBeNull();
			expect(result.value.afterSnapshot).toBeNull();
			expect(result.value.rolledBackLogId).toBeNull();
			expect(result.value.ipAddress).toBeNull();
		});

		it('should default isRollback to false', () => {
			const result = createValidLog();
			expect(result.value.isRollback).toBe(false);
		});

		it('should accept resourceId', () => {
			const result = createValidLog({ resourceId: VALID_UUID_3 });
			expect(result.value.resourceId).toBe(VALID_UUID_3);
		});

		it('should accept details', () => {
			const details = { field: 'name', newValue: 'John' };
			const result = createValidLog({ details });
			expect(result.value.details).toEqual(details);
		});

		it('should accept beforeSnapshot', () => {
			const snapshot = { name: 'Old Name' };
			const result = createValidLog({ beforeSnapshot: snapshot });
			expect(result.value.beforeSnapshot).toEqual(snapshot);
		});

		it('should accept afterSnapshot', () => {
			const snapshot = { name: 'New Name' };
			const result = createValidLog({ afterSnapshot: snapshot });
			expect(result.value.afterSnapshot).toEqual(snapshot);
		});

		it('should accept isRollback = true', () => {
			const result = createValidLog({ isRollback: true });
			expect(result.value.isRollback).toBe(true);
		});

		it('should accept rolledBackLogId', () => {
			const result = createValidLog({ rolledBackLogId: VALID_UUID_3 });
			expect(result.value.rolledBackLogId).toBe(VALID_UUID_3);
		});

		it('should accept ipAddress', () => {
			const ipResult = IpAddress.create('192.168.1.1');
			const result = createValidLog({ ipAddress: ipResult.value });
			expect(result.value.ipAddress?.value).toBe('192.168.1.1');
		});

		it('should return error for invalid id (non-UUID)', () => {
			const result = createValidLog({ id: 'not-a-uuid' });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid activity log ID');
		});

		it('should return error for empty id', () => {
			const result = createValidLog({ id: '' });
			expect(result.isError).toBe(true);
		});

		it('should return error for invalid employeeId (non-UUID)', () => {
			const result = createValidLog({ employeeId: 'not-a-uuid' });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid employee ID');
		});

		it('should return error for invalid rolledBackLogId (non-UUID)', () => {
			const result = createValidLog({ rolledBackLogId: 'not-a-uuid' });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid rolled back log ID');
		});

		it('should return error for invalid createdAt', () => {
			const result = createValidLog({ createdAt: new Date('invalid') });
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid createdAt date');
		});

		it('should make a defensive copy of createdAt', () => {
			const date = new Date('2025-01-15T09:00:00.000Z');
			const result = createValidLog({ createdAt: date });
			// Mutate original date
			date.setFullYear(2000);
			// Entity date should remain unchanged
			expect(result.value.createdAt.getFullYear()).toBe(2025);
		});
	});

	describe('createdAt getter', () => {
		it('should return a defensive copy of createdAt', () => {
			const result = createValidLog();
			const date1 = result.value.createdAt;
			date1.setFullYear(2000);
			const date2 = result.value.createdAt;
			expect(date2.getFullYear()).toBe(2025);
		});
	});

	describe('isWriteAction()', () => {
		it('should return true for create action', () => {
			const result = createValidLog({ action: createValidAction('create') });
			expect(result.value.isWriteAction()).toBe(true);
		});

		it('should return true for update action', () => {
			const result = createValidLog({ action: createValidAction('update') });
			expect(result.value.isWriteAction()).toBe(true);
		});

		it('should return true for delete action', () => {
			const result = createValidLog({ action: createValidAction('delete') });
			expect(result.value.isWriteAction()).toBe(true);
		});

		it('should return false for view action', () => {
			const result = createValidLog({ action: createValidAction('view') });
			expect(result.value.isWriteAction()).toBe(false);
		});

		it('should return false for login action', () => {
			const result = createValidLog({ action: createValidAction('login') });
			expect(result.value.isWriteAction()).toBe(false);
		});
	});

	describe('hasSnapshot()', () => {
		it('should return false when no snapshots', () => {
			const result = createValidLog();
			expect(result.value.hasSnapshot()).toBe(false);
		});

		it('should return true when beforeSnapshot is set', () => {
			const result = createValidLog({ beforeSnapshot: { name: 'Old' } });
			expect(result.value.hasSnapshot()).toBe(true);
		});

		it('should return true when afterSnapshot is set', () => {
			const result = createValidLog({ afterSnapshot: { name: 'New' } });
			expect(result.value.hasSnapshot()).toBe(true);
		});

		it('should return true when both snapshots are set', () => {
			const result = createValidLog({
				beforeSnapshot: { name: 'Old' },
				afterSnapshot: { name: 'New' }
			});
			expect(result.value.hasSnapshot()).toBe(true);
		});
	});

	describe('wasRolledBack()', () => {
		it('should return false by default', () => {
			const result = createValidLog();
			expect(result.value.wasRolledBack()).toBe(false);
		});

		it('should return true when isRollback is true', () => {
			const result = createValidLog({ isRollback: true });
			expect(result.value.wasRolledBack()).toBe(true);
		});

		it('should return false when isRollback is false', () => {
			const result = createValidLog({ isRollback: false });
			expect(result.value.wasRolledBack()).toBe(false);
		});
	});
});
