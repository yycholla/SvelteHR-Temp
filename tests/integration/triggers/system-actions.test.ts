// T016: System vs User Actions Test (TDD RED - Expected to FAIL)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Tests differentiation between user-initiated and system-automated actions

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import {
	createTestDatabase,
	cleanupTestDatabase,
	queryActivityLogs,
	generateTestEmployee,
	cleanupTestRecords,
	initializeTestPool,
	closeTestPool,
	type TestDatabase
} from '../../utils/db-trigger-helpers';
import { nanoid } from 'nanoid';

describe('System vs user actions differentiation (FR-005, FR-010)', () => {
	let db: TestDatabase;
	let departmentId: string;
	let employeeIds: string[];

	beforeAll(async () => {
		await initializeTestPool();
	});

	afterAll(async () => {
		await closeTestPool();
	});

	beforeEach(async () => {
		db = await createTestDatabase();
		departmentId = nanoid();
		employeeIds = [];
	});

	afterEach(async () => {
		await cleanupTestRecords(db, ['employees', 'activity_logs'], employeeIds);
		await cleanupTestDatabase(db);
	});

	it('should set employee_id to NULL for system-automated actions', async () => {
		// RED: This test WILL FAIL (trigger not differentiating)

		// Don't set user context - simulates system action
		await db.clearContext();

		const employeeId = nanoid();
		employeeIds.push(employeeId);

		const employee = generateTestEmployee({
			id: employeeId,
			first_name: 'System',
			last_name: 'Created',
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
		expect(auditLogs[0].resource_type).toBe('employees');
	});

	it('should set employee_id for user-initiated actions', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		const userId = nanoid();
		await db.setUserContext(userId);

		const employeeId = nanoid();
		employeeIds.push(employeeId);

		const employee = generateTestEmployee({
			id: employeeId,
			first_name: 'User',
			last_name: 'Created',
			email: 'user@test.com',
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
		expect(auditLogs[0].employee_id).toBe(userId); // User action
		expect(auditLogs[0].action).toBe('CREATE');
	});

	it('should differentiate between user and system actions in same session', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		const userId = nanoid();

		// User action
		await db.setUserContext(userId);
		const userEmployeeId = nanoid();
		employeeIds.push(userEmployeeId);

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[userEmployeeId, 'User', 'Action', 'useraction@test.com', departmentId]
		);

		// System action (clear context)
		await db.clearContext();
		const systemEmployeeId = nanoid();
		employeeIds.push(systemEmployeeId);

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[systemEmployeeId, 'System', 'Action', 'systemaction@test.com', departmentId]
		);

		// Check user action log
		const userLogs = await queryActivityLogs(db, 'employees', userEmployeeId);
		expect(userLogs).toHaveLength(1);
		expect(userLogs[0].employee_id).toBe(userId);

		// Check system action log
		const systemLogs = await queryActivityLogs(db, 'employees', systemEmployeeId);
		expect(systemLogs).toHaveLength(1);
		expect(systemLogs[0].employee_id).toBeNull();
	});

	it('should handle missing user context gracefully without failing operation', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		// Ensure no user context is set
		await db.clearContext();

		const employeeId = nanoid();
		employeeIds.push(employeeId);

		// This should NOT throw an error, even without user context
		await expect(async () => {
			await db.query(
				`
        INSERT INTO employees (id, first_name, last_name, email, department_id)
        VALUES ($1, $2, $3, $4, $5)
      `,
				[employeeId, 'NoContext', 'User', 'nocontext@test.com', departmentId]
			);
		}).resolves;

		// Audit log should still be created
		const auditLogs = await queryActivityLogs(db, 'employees', employeeId);
		expect(auditLogs).toHaveLength(1);
		expect(auditLogs[0].employee_id).toBeNull();
	});

	it('should track ip_address and user_agent only for user actions', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		const userId = nanoid();

		// User action with full context
		await db.setUserContext(userId, '10.0.0.5', 'UserAgent/2.0');
		const userEmployeeId = nanoid();
		employeeIds.push(userEmployeeId);

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[userEmployeeId, 'User', 'WithContext', 'withcontext@test.com', departmentId]
		);

		// System action without context
		await db.clearContext();
		const systemEmployeeId = nanoid();
		employeeIds.push(systemEmployeeId);

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[systemEmployeeId, 'System', 'NoContext', 'nocontext@test.com', departmentId]
		);

		// Check user action has context
		const userLogs = await queryActivityLogs(db, 'employees', userEmployeeId);
		expect(userLogs[0].ip_address).toBe('10.0.0.5');
		expect(userLogs[0].user_agent).toBe('UserAgent/2.0');

		// Check system action has no context
		const systemLogs = await queryActivityLogs(db, 'employees', systemEmployeeId);
		expect(systemLogs[0].ip_address).toBeNull();
		expect(systemLogs[0].user_agent).toBeNull();
	});
});
