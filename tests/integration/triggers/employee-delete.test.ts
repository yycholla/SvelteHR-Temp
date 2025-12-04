// T006: Employee DELETE Trigger Test (TDD RED - Expected to FAIL)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Tests that DELETE operations on employees table create audit log entries with before_snapshot only

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	type TestDatabase,
	cleanupTestDatabase,
	closeTestPool,
	createTestDatabase,
	generateTestEmployee,
	initializeTestPool,
	queryActivityLogs
} from '../../utils/db-trigger-helpers';
import { nanoid } from 'nanoid';

describe('Employee DELETE trigger (FR-003)', () => {
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

		// Pre-insert employee for delete tests
		const employee = generateTestEmployee({
			id: employeeId,
			first_name: 'ToDelete',
			last_name: 'Employee',
			email: 'delete@test.com',
			department_id: departmentId,
			status: 'ACTIVE'
		});

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
			[
				employee.id,
				employee.first_name,
				employee.last_name,
				employee.email,
				employee.department_id,
				employee.status
			]
		);
	});

	afterEach(async () => {
		await cleanupTestDatabase(db);
	});

	it('should create audit log entry with before_snapshot when employee is deleted', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId, '192.168.1.300', 'DeleteTest/1.0');

		// Delete employee
		await db.query(
			`
      DELETE FROM employees WHERE id = $1
    `,
			[employeeId]
		);

		// Query audit logs
		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);
		const deleteLog = auditLogs.find((log) => log.action === 'DELETE');

		expect(deleteLog).toBeTruthy();
		expect(deleteLog!.action).toBe('DELETE');
		expect(deleteLog!.employee_id).toBe(testUserId);
		expect(deleteLog!.resource_type).toBe('employees');
		expect(deleteLog!.resource_id).toBe(employeeId);

		// Verify before_snapshot has all data from deleted record
		expect(deleteLog!.before_snapshot).toBeTruthy();
		expect(deleteLog!.before_snapshot.id).toBe(employeeId);
		expect(deleteLog!.before_snapshot.first_name).toBe('ToDelete');
		expect(deleteLog!.before_snapshot.last_name).toBe('Employee');
		expect(deleteLog!.before_snapshot.email).toBe('delete@test.com');
		expect(deleteLog!.before_snapshot.department_id).toBe(departmentId);
		expect(deleteLog!.before_snapshot.status).toBe('ACTIVE');

		// Verify after_snapshot is NULL for DELETE operations
		expect(deleteLog!.after_snapshot).toBeNull();

		expect(deleteLog!.ip_address).toBe('192.168.1.300');
		expect(deleteLog!.user_agent).toBe('DeleteTest/1.0');
	});

	it('should preserve complete record state in before_snapshot', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);

		// Delete employee
		await db.query('DELETE FROM employees WHERE id = $1', [employeeId]);

		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);
		const deleteLog = auditLogs.find((log) => log.action === 'DELETE');

		expect(deleteLog).toBeTruthy();

		// before_snapshot should contain all columns
		const snapshot = deleteLog!.before_snapshot;
		expect(snapshot).toHaveProperty('id');
		expect(snapshot).toHaveProperty('first_name');
		expect(snapshot).toHaveProperty('last_name');
		expect(snapshot).toHaveProperty('email');
		expect(snapshot).toHaveProperty('department_id');
		expect(snapshot).toHaveProperty('status');

		// Verify values
		expect(snapshot.id).toBe(employeeId);
		expect(snapshot.first_name).toBe('ToDelete');
	});

	it('should track both update and delete operations', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);

		// First update the employee
		await db.query(
			`
      UPDATE employees SET first_name = $1 WHERE id = $2
    `,
			['Modified', employeeId]
		);

		// Then delete it
		await db.query('DELETE FROM employees WHERE id = $1', [employeeId]);

		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);

		// Should have INSERT (from beforeEach), UPDATE, and DELETE logs
		expect(auditLogs.length).toBeGreaterThanOrEqual(2);

		const deleteLog = auditLogs.find((log) => log.action === 'DELETE');
		const updateLog = auditLogs.find((log) => log.action === 'UPDATE');

		expect(deleteLog).toBeTruthy();
		expect(updateLog).toBeTruthy();

		// DELETE before_snapshot should reflect the state after UPDATE
		expect(deleteLog!.before_snapshot.first_name).toBe('Modified');
	});
});
