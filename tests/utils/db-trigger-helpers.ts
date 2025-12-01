// Database Trigger Test Helpers
// Provides direct PostgreSQL access for testing audit log triggers
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Created: 2025-10-02

import { Pool, type PoolClient, type QueryResult } from 'pg';
import { nanoid } from 'nanoid';

// Test database configuration
const TEST_DB_CONFIG = {
	host: process.env.TEST_DB_HOST || 'localhost',
	port: parseInt(process.env.TEST_DB_PORT || '5432'),
	database: process.env.TEST_DB_NAME || 'sveltekit_hr_test',
	user: process.env.TEST_DB_USER || 'postgres',
	password: process.env.TEST_DB_PASSWORD || 'postgres'
};

// Global pool for test database connections
let testPool: Pool | null = null;

/**
 * Test database interface for trigger integration tests
 */
export interface TestDatabase {
	client: PoolClient;
	query: <T = any>(sql: string, params?: any[]) => Promise<QueryResult<any>>;
	setUserContext: (userId: string, ipAddress?: string, userAgent?: string) => Promise<void>;
	setBatchContext: (batchId: string) => Promise<void>;
	clearContext: () => Promise<void>;
	release: () => void;
}

/**
 * Activity log entry interface (matches database schema)
 */
export interface ActivityLogEntry {
	id: string;
	employee_id: string | null;
	action: 'CREATE' | 'UPDATE' | 'DELETE';
	resource_type: string;
	resource_id: string;
	before_snapshot: any | null;
	after_snapshot: any | null;
	ip_address: string | null;
	user_agent: string | null;
	batch_id: string | null;
	is_rollback: boolean;
	rolled_back_log_id: string | null;
	created_at: Date;
}

/**
 * Initialize test database connection pool
 */
export async function initializeTestPool(): Promise<void> {
	if (testPool) {
		return;
	}

	testPool = new Pool({
		...TEST_DB_CONFIG,
		max: 10,
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 5000
	});

	// Test connection
	const client = await testPool.connect();
	try {
		await client.query('SELECT NOW()');
	} finally {
		client.release();
	}
}

/**
 * Close test database connection pool
 */
export async function closeTestPool(): Promise<void> {
	if (testPool) {
		await testPool.end();
		testPool = null;
	}
}

/**
 * Create test database connection with helper methods
 */
export async function createTestDatabase(): Promise<TestDatabase> {
	if (!testPool) {
		await initializeTestPool();
	}

	const client = await testPool!.connect();

	const testDb: TestDatabase = {
		client,

		query: async <T = any>(sql: string, params: any[] = []): Promise<QueryResult<any>> => {
			return client.query<T>(sql, params);
		},

		setUserContext: async (
			userId: string,
			ipAddress: string = '192.168.1.100',
			userAgent: string = 'Test/1.0'
		): Promise<void> => {
			await client.query(`SET LOCAL app.current_user_id = $1`, [userId]);
			await client.query(`SET LOCAL app.current_ip_address = $1`, [ipAddress]);
			await client.query(`SET LOCAL app.current_user_agent = $1`, [userAgent]);
		},

		setBatchContext: async (batchId: string): Promise<void> => {
			await client.query(`SET LOCAL app.current_batch_id = $1`, [batchId]);
		},

		clearContext: async (): Promise<void> => {
			try {
				await client.query(`RESET app.current_user_id`);
				await client.query(`RESET app.current_ip_address`);
				await client.query(`RESET app.current_user_agent`);
				await client.query(`RESET app.current_batch_id`);
			} catch (error) {
				// Ignore errors for variables that don't exist
			}
		},

		release: (): void => {
			client.release();
		}
	};

	return testDb;
}

/**
 * Clean up test database connection
 */
export async function cleanupTestDatabase(db: TestDatabase): Promise<void> {
	await db.clearContext();
	db.release();
}

/**
 * Query activity logs by resource
 */
export async function queryActivityLogs(
	db: TestDatabase,
	resourceType: string,
	resourceId: string
): Promise<ActivityLogEntry[]> {
	const result = await db.query<ActivityLogEntry>(
		`
    SELECT * FROM activity_logs
    WHERE resource_type = $1 AND resource_id = $2
    ORDER BY created_at DESC
  `,
		[resourceType, resourceId]
	);

	return result.rows;
}

/**
 * Query activity logs by batch ID
 */
export async function queryActivityLogsByBatch(
	db: TestDatabase,
	batchId: string
): Promise<ActivityLogEntry[]> {
	const result = await db.query<ActivityLogEntry>(
		`
    SELECT * FROM activity_logs
    WHERE batch_id = $1
    ORDER BY created_at ASC
  `,
		[batchId]
	);

	return result.rows;
}

/**
 * Count activity logs for a resource
 */
export async function countActivityLogs(
	db: TestDatabase,
	resourceType: string,
	resourceId: string
): Promise<number> {
	const result = await db.query<{ count: string }>(
		`
    SELECT COUNT(*)::text as count FROM activity_logs
    WHERE resource_type = $1 AND resource_id = $2
  `,
		[resourceType, resourceId]
	);

	return parseInt(result.rows[0].count, 10);
}

/**
 * Generate test employee data
 */
export function generateTestEmployee(overrides: Partial<any> = {}) {
	const id = nanoid();
	return {
		id,
		first_name: 'Test',
		last_name: 'Employee',
		email: `test-${id}@example.com`,
		department_id: nanoid(),
		hire_date: new Date().toISOString(),
		status: 'ACTIVE',
		...overrides
	};
}

/**
 * Generate test department data
 */
export function generateTestDepartment(overrides: Partial<any> = {}) {
	const id = nanoid();
	return {
		id,
		name: `Test Department ${id}`,
		description: 'Test department for integration tests',
		budget: 100000,
		...overrides
	};
}

/**
 * Generate test user data
 */
export function generateTestUser(overrides: Partial<any> = {}) {
	const id = nanoid();
	return {
		id,
		email: `test-${id}@example.com`,
		password_hash: 'hashed_password',
		first_name: 'Test',
		last_name: 'User',
		...overrides
	};
}

/**
 * Clean up test records from database
 */
export async function cleanupTestRecords(
	db: TestDatabase,
	tables: string[],
	ids: string[]
): Promise<void> {
	for (const table of tables) {
		for (const id of ids) {
			try {
				await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
			} catch (error) {
				// Ignore errors for records that don't exist
				console.warn(`Failed to cleanup ${table} record ${id}:`, error);
			}
		}
	}

	// Clean up activity logs for test resources
	try {
		await db.query(
			`DELETE FROM activity_logs WHERE resource_id = ANY($1::text[])`,
			[ids]
		);
	} catch (error) {
		console.warn('Failed to cleanup activity_logs:', error);
	}
}

/**
 * Truncate activity logs table (use with caution in tests)
 */
export async function truncateActivityLogs(db: TestDatabase): Promise<void> {
	await db.query('TRUNCATE activity_logs CASCADE');
}

/**
 * Check if trigger exists
 */
export async function triggerExists(
	db: TestDatabase,
	triggerName: string,
	tableName: string
): Promise<boolean> {
	const result = await db.query<{ exists: boolean }>(
		`
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = $1
      AND tgrelid = $2::regclass
    ) as exists
  `,
		[triggerName, tableName]
	);

	return result.rows[0].exists;
}

/**
 * Check if function exists
 */
export async function functionExists(db: TestDatabase, functionName: string): Promise<boolean> {
	const result = await db.query<{ exists: boolean }>(
		`
    SELECT EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = $1
    ) as exists
  `,
		[functionName]
	);

	return result.rows[0].exists;
}

// Export all utilities
export default {
	initializeTestPool,
	closeTestPool,
	createTestDatabase,
	cleanupTestDatabase,
	queryActivityLogs,
	queryActivityLogsByBatch,
	countActivityLogs,
	generateTestEmployee,
	generateTestDepartment,
	generateTestUser,
	cleanupTestRecords,
	truncateActivityLogs,
	triggerExists,
	functionExists,
	TEST_DB_CONFIG
};
