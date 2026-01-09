// T005: Employee UPDATE Trigger Test (TDD RED - Expected to FAIL)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Tests that UPDATE operations on employees table create audit log entries with before/after snapshots

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	type TestDatabase,
	cleanupTestDatabase,
	cleanupTestRecords,
	closeTestPool,
	createTestDatabase,
	generateTestEmployee,
	initializeTestPool,
	queryActivityLogs
} from '../../utils/db-trigger-helpers';
import { nanoid } from 'nanoid';

describe('Employee UPDATE trigger (FR-002)', () => {
	let db: TestDatabase;
	let testUserId: string;
	let employeeId: string;
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
		employeeId = nanoid();
		departmentId = nanoid();

		// Pre-insert employee for update tests
		const employee = generateTestEmployee({
			id: employeeId,
			first_name: 'Original',
			last_name: 'Name',
			email: 'original@test.com',
			department_id: departmentId
		});

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[employee.id, employee.first_name, employee.last_name, employee.email, employee.department_id]
		);
	});

	afterEach(async () => {
		await cleanupTestRecords(db, ['employees', 'activity_logs'], [employeeId]);
		await cleanupTestDatabase(db);
	});

	it('should create audit log entry with before and after snapshots when employee is updated', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId, '192.168.1.200', 'UpdateTest/1.0');

		// Update employee
		await db.query(
			`
      UPDATE employees
      SET first_name = $1, last_name = $2
      WHERE id = $3
    `,
			['Updated', 'User', employeeId]
		);

		// Query audit logs (excluding INSERT log from beforeEach)
		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);
		const updateLog = auditLogs.find((log) => log.action === 'UPDATE');

		expect(updateLog).toBeTruthy();
		expect(updateLog!.action).toBe('UPDATE');
		expect(updateLog!.employee_id).toBe(testUserId);
		expect(updateLog!.resource_type).toBe('employees');
		expect(updateLog!.resource_id).toBe(employeeId);

		// Verify before_snapshot has original values
		expect(updateLog!.before_snapshot).toBeTruthy();
		expect(updateLog!.before_snapshot.first_name).toBe('Original');
		expect(updateLog!.before_snapshot.last_name).toBe('Name');
		expect(updateLog!.before_snapshot.email).toBe('original@test.com');

		// Verify after_snapshot has updated values
		expect(updateLog!.after_snapshot).toBeTruthy();
		expect(updateLog!.after_snapshot.first_name).toBe('Updated');
		expect(updateLog!.after_snapshot.last_name).toBe('User');
		expect(updateLog!.after_snapshot.email).toBe('original@test.com'); // Unchanged

		expect(updateLog!.ip_address).toBe('192.168.1.200');
		expect(updateLog!.user_agent).toBe('UpdateTest/1.0');
	});

	it('should capture field-level changes in snapshots', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);

		// Update only email field
		await db.query(
			`
      UPDATE employees
      SET email = $1
      WHERE id = $2
    `,
			['newemail@test.com', employeeId]
		);

		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);
		const updateLog = auditLogs.find((log) => log.action === 'UPDATE');

		expect(updateLog).toBeTruthy();

		// before_snapshot should have old email
		expect(updateLog!.before_snapshot.email).toBe('original@test.com');

		// after_snapshot should have new email
		expect(updateLog!.after_snapshot.email).toBe('newemail@test.com');

		// Other fields should remain unchanged in both snapshots
		expect(updateLog!.before_snapshot.first_name).toBe(updateLog!.after_snapshot.first_name);
		expect(updateLog!.before_snapshot.last_name).toBe(updateLog!.after_snapshot.last_name);
	});

	it('should create separate audit logs for multiple sequential updates', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);

		// First update
		await db.query(
			`
      UPDATE employees SET first_name = $1 WHERE id = $2
    `,
			['FirstUpdate', employeeId]
		);

		// Second update
		await db.query(
			`
      UPDATE employees SET last_name = $1 WHERE id = $2
    `,
			['SecondUpdate', employeeId]
		);

		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);
		const updateLogs = auditLogs.filter((log) => log.action === 'UPDATE');

		expect(updateLogs).toHaveLength(2);

		// First update log
		expect(updateLogs[1].before_snapshot.first_name).toBe('Original');
		expect(updateLogs[1].after_snapshot.first_name).toBe('FirstUpdate');
		expect(updateLogs[1].after_snapshot.last_name).toBe('Name'); // Unchanged

		// Second update log (should use state after first update)
		expect(updateLogs[0].before_snapshot.first_name).toBe('FirstUpdate');
		expect(updateLogs[0].before_snapshot.last_name).toBe('Name');
		expect(updateLogs[0].after_snapshot.last_name).toBe('SecondUpdate');
	});
});
