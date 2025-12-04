// T004: Employee INSERT Trigger Test (TDD RED - Expected to FAIL)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Tests that INSERT operations on employees table create audit log entries

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

describe('Employee INSERT trigger (FR-001)', () => {
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
	});

	afterEach(async () => {
		// Cleanup test data
		await cleanupTestRecords(db, ['employees', 'activity_logs'], [employeeId]);
		await cleanupTestDatabase(db);
	});

	it('should create audit log entry when employee is inserted', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		// Set user context
		await db.setUserContext(testUserId, '192.168.1.100', 'Test/1.0');

		// Insert employee
		const employee = generateTestEmployee({
			id: employeeId,
			first_name: 'John',
			last_name: 'Doe',
			email: 'john.doe@test.com',
			department_id: departmentId
		});

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[employee.id, employee.first_name, employee.last_name, employee.email, employee.department_id]
		);

		// Assert audit log was created
		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);

		expect(auditLogs).toHaveLength(1);
		expect(auditLogs[0].action).toBe('CREATE');
		expect(auditLogs[0].employee_id).toBe(testUserId);
		expect(auditLogs[0].resource_type).toBe('employees');
		expect(auditLogs[0].resource_id).toBe(employeeId);
		expect(auditLogs[0].before_snapshot).toBeNull();
		expect(auditLogs[0].after_snapshot).toBeTruthy();
		expect(auditLogs[0].after_snapshot.first_name).toBe('John');
		expect(auditLogs[0].after_snapshot.last_name).toBe('Doe');
		expect(auditLogs[0].after_snapshot.email).toBe('john.doe@test.com');
		expect(auditLogs[0].ip_address).toBe('192.168.1.100');
		expect(auditLogs[0].user_agent).toBe('Test/1.0');
		expect(auditLogs[0].is_rollback).toBe(false);
	});

	it('should capture complete snapshot in after_snapshot', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);

		const employee = generateTestEmployee({
			id: employeeId,
			first_name: 'Jane',
			last_name: 'Smith',
			email: 'jane.smith@test.com',
			department_id: departmentId,
			hire_date: '2025-01-15',
			status: 'ACTIVE'
		});

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id, hire_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
			[
				employee.id,
				employee.first_name,
				employee.last_name,
				employee.email,
				employee.department_id,
				employee.hire_date,
				employee.status
			]
		);

		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);

		expect(auditLogs).toHaveLength(1);
		expect(auditLogs[0].after_snapshot).toBeTruthy();
		expect(auditLogs[0].after_snapshot.id).toBe(employeeId);
		expect(auditLogs[0].after_snapshot.first_name).toBe('Jane');
		expect(auditLogs[0].after_snapshot.last_name).toBe('Smith');
		expect(auditLogs[0].after_snapshot.email).toBe('jane.smith@test.com');
		expect(auditLogs[0].after_snapshot.department_id).toBe(departmentId);
		expect(auditLogs[0].after_snapshot.status).toBe('ACTIVE');
	});

	it('should handle system actions with no user context', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		// Don't set user context (system action)
		const employee = generateTestEmployee({
			id: employeeId,
			first_name: 'System',
			last_name: 'User',
			email: 'system@test.com',
			department_id: departmentId
		});

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[employee.id, employee.first_name, employee.last_name, employee.email, employee.department_id]
		);

		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);

		expect(auditLogs).toHaveLength(1);
		expect(auditLogs[0].employee_id).toBeNull(); // System action
		expect(auditLogs[0].action).toBe('CREATE');
		expect(auditLogs[0].after_snapshot.first_name).toBe('System');
	});
});
