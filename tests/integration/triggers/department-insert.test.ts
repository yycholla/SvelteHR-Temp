// T007: Department INSERT Trigger Test (TDD RED - Expected to FAIL)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Tests that INSERT operations on departments table create audit log entries
// Pattern: Same as employee-insert.test.ts but for departments table

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	type TestDatabase,
	cleanupTestDatabase,
	cleanupTestRecords,
	closeTestPool,
	createTestDatabase,
	generateTestDepartment,
	initializeTestPool,
	queryActivityLogs
} from '../../utils/db-trigger-helpers';
import { nanoid } from 'nanoid';

describe('Department INSERT trigger (FR-001)', () => {
	let db: TestDatabase;
	let testUserId: string;
	let departmentId: string;

	beforeAll(async () => {
		await initializeTestPool();
	});

	afterAll(async () => {
		await closeTestPool();
	});

	beforeEach(async () => {
		db = await createTestDatabase();
		testUserId = nanoid();
		departmentId = nanoid();
	});

	afterEach(async () => {
		await cleanupTestRecords(db, ['departments', 'activity_logs'], [departmentId]);
		await cleanupTestDatabase(db);
	});

	it('should create audit log entry when department is inserted', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId, '192.168.1.150', 'Test/1.0');

		const department = generateTestDepartment({
			id: departmentId,
			name: 'Engineering',
			description: 'Software development team',
			budget: 500000
		});

		await db.query(
			`
      INSERT INTO departments (id, name, description, budget)
      VALUES ($1, $2, $3, $4)
    `,
			[department.id, department.name, department.description, department.budget]
		);

		const auditLogs = await queryActivityLogs(db, 'departments', departmentId);

		expect(auditLogs).toHaveLength(1);
		expect(auditLogs[0].action).toBe('CREATE');
		expect(auditLogs[0].employee_id).toBe(testUserId);
		expect(auditLogs[0].resource_type).toBe('departments');
		expect(auditLogs[0].resource_id).toBe(departmentId);
		expect(auditLogs[0].before_snapshot).toBeNull();
		expect(auditLogs[0].after_snapshot).toBeTruthy();
		expect(auditLogs[0].after_snapshot.name).toBe('Engineering');
		expect(auditLogs[0].after_snapshot.description).toBe('Software development team');
		expect(auditLogs[0].after_snapshot.budget).toBe(500000);
		expect(auditLogs[0].ip_address).toBe('192.168.1.150');
		expect(auditLogs[0].is_rollback).toBe(false);
	});

	it('should capture complete snapshot for department', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);

		const department = generateTestDepartment({
			id: departmentId,
			name: 'Marketing',
			description: 'Brand and communications',
			budget: 300000
		});

		await db.query(
			`
      INSERT INTO departments (id, name, description, budget)
      VALUES ($1, $2, $3, $4)
    `,
			[department.id, department.name, department.description, department.budget]
		);

		const auditLogs = await queryActivityLogs(db, 'departments', departmentId);

		expect(auditLogs).toHaveLength(1);
		expect(auditLogs[0].after_snapshot).toBeTruthy();
		expect(auditLogs[0].after_snapshot.id).toBe(departmentId);
		expect(auditLogs[0].after_snapshot.name).toBe('Marketing');
		expect(auditLogs[0].after_snapshot.budget).toBe(300000);
	});
});

// NOTE: T008 (department UPDATE) would follow the same pattern as employee-update.test.ts
// Additional table tests (T009-T014) follow the same pattern for:
// - users (INSERT, UPDATE)
// - roles (INSERT)
// - permissions (INSERT)
// - events (INSERT)
// - tasks (INSERT)
