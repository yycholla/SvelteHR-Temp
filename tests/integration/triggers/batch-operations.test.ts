// T015: Batch Operation Tracking Test (TDD RED - Expected to FAIL)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Tests that multiple operations with same batch_id are properly tracked

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	type TestDatabase,
	cleanupTestDatabase,
	cleanupTestRecords,
	closeTestPool,
	createTestDatabase,
	generateTestEmployee,
	initializeTestPool,
	queryActivityLogsByBatch
} from '../../utils/db-trigger-helpers';
import { nanoid } from 'nanoid';

describe('Batch operation tracking (FR-020)', () => {
	let db: TestDatabase;
	let testUserId: string;
	let batchId: string;
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
		testUserId = nanoid();
		batchId = nanoid();
		departmentId = nanoid();
		employeeIds = [];
	});

	afterEach(async () => {
		await cleanupTestRecords(db, ['employees', 'activity_logs'], employeeIds);
		await cleanupTestDatabase(db);
	});

	it('should assign same batch_id to all operations in a batch', async () => {
		// RED: This test WILL FAIL (trigger not handling batch_id)

		await db.setUserContext(testUserId);
		await db.setBatchContext(batchId);

		// Create multiple employees in the same batch
		for (let i = 0; i < 3; i++) {
			const employeeId = nanoid();
			employeeIds.push(employeeId);

			const employee = generateTestEmployee({
				id: employeeId,
				first_name: `BatchEmployee${i}`,
				last_name: 'Test',
				email: `batch${i}@test.com`,
				department_id: departmentId
			});

			await db.query(
				`
        INSERT INTO employees (id, first_name, last_name, email, department_id)
        VALUES ($1, $2, $3, $4, $5)
      `,
				[
					employee.id,
					employee.first_name,
					employee.last_name,
					employee.email,
					employee.department_id
				]
			);
		}

		// Query all logs with this batch_id
		const batchLogs = await queryActivityLogsByBatch(db, batchId);

		// Should have 3 audit logs, all with the same batch_id
		expect(batchLogs).toHaveLength(3);
		expect(batchLogs.every((log) => log.batch_id === batchId)).toBe(true);
		expect(batchLogs.every((log) => log.action === 'CREATE')).toBe(true);
		expect(batchLogs.every((log) => log.resource_type === 'employees')).toBe(true);
	});

	it('should track batch operations across different tables', async () => {
		// RED: This test WILL FAIL (trigger not implemented for all tables)

		await db.setUserContext(testUserId);
		await db.setBatchContext(batchId);

		// Create employee in batch
		const employeeId = nanoid();
		employeeIds.push(employeeId);

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[employeeId, 'Batch', 'User', 'batch@test.com', departmentId]
		);

		// Create department in same batch
		const deptId = nanoid();
		await db.query(
			`
      INSERT INTO departments (id, name, description, budget)
      VALUES ($1, $2, $3, $4)
    `,
			[deptId, 'Batch Department', 'Created in batch', 100000]
		);

		// Query all logs with this batch_id
		const batchLogs = await queryActivityLogsByBatch(db, batchId);

		expect(batchLogs.length).toBeGreaterThanOrEqual(2);
		expect(batchLogs.every((log) => log.batch_id === batchId)).toBe(true);

		// Should have logs from different resource types
		const resourceTypes = new Set(batchLogs.map((log) => log.resource_type));
		expect(resourceTypes.has('employees')).toBe(true);
		expect(resourceTypes.has('departments')).toBe(true);
	});

	it('should differentiate batches by unique batch_id', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);

		// Batch 1
		const batch1Id = nanoid();
		await db.setBatchContext(batch1Id);

		const employee1Id = nanoid();
		employeeIds.push(employee1Id);
		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[employee1Id, 'Batch1', 'User', 'batch1@test.com', departmentId]
		);

		// Batch 2
		const batch2Id = nanoid();
		await db.setBatchContext(batch2Id);

		const employee2Id = nanoid();
		employeeIds.push(employee2Id);
		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[employee2Id, 'Batch2', 'User', 'batch2@test.com', departmentId]
		);

		// Query both batches
		const batch1Logs = await queryActivityLogsByBatch(db, batch1Id);
		const batch2Logs = await queryActivityLogsByBatch(db, batch2Id);

		expect(batch1Logs).toHaveLength(1);
		expect(batch2Logs).toHaveLength(1);
		expect(batch1Logs[0].batch_id).toBe(batch1Id);
		expect(batch2Logs[0].batch_id).toBe(batch2Id);
		expect(batch1Logs[0].after_snapshot.first_name).toBe('Batch1');
		expect(batch2Logs[0].after_snapshot.first_name).toBe('Batch2');
	});

	it('should handle NULL batch_id for non-batch operations', async () => {
		// RED: This test WILL FAIL (trigger not implemented yet)

		await db.setUserContext(testUserId);
		// Don't set batch context - this is a standalone operation

		const employeeId = nanoid();
		employeeIds.push(employeeId);

		await db.query(
			`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
			[employeeId, 'Standalone', 'User', 'standalone@test.com', departmentId]
		);

		const allLogs = await db.query(`SELECT * FROM activity_logs WHERE resource_id = $1`, [
			employeeId
		]);

		expect(allLogs.rows).toHaveLength(1);
		expect(allLogs.rows[0].batch_id).toBeNull();
	});
});
