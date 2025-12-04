/**
 * Integration Test: Fresh Database Initialization → Verify PASS
 *
 * Tests the complete workflow from quickstart.md Workflow 1:
 * - Create fresh PostgreSQL database
 * - Apply init script (migrations/00_init_schema.sql)
 * - Run verify-schema CLI
 * - Assert: Verdict = PASS, 22 tables created, 0 differences
 *
 * This is an E2E test that validates the complete initialization workflow.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Client } from 'pg';
import { spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB_NAME = `hr_test_fresh_init_${Date.now()}`;
const TEST_DB_URL = `postgresql://localhost/${TEST_DB_NAME}`;
const INIT_SCRIPT_PATH = join(process.cwd(), 'migrations/00_init_schema.sql');
const VERIFY_CLI_PATH = join(process.cwd(), 'scripts/db/verify-schema.ts');
const VERIFICATION_REPORTS_DIR = join(process.cwd(), 'verification-reports');

describe('Integration: Fresh Database Initialization', () => {
	let adminClient: Client;

	beforeAll(async () => {
		// Connect to postgres database to create test database
		adminClient = new Client({
			connectionString: 'postgresql://localhost/postgres'
		});
		await adminClient.connect();

		// Create test database
		await adminClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);
	});

	afterAll(async () => {
		// Drop test database
		await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
		await adminClient.end();
	});

	beforeEach(() => {
		// Ensure verification reports directory exists
		if (!existsSync(VERIFICATION_REPORTS_DIR)) {
			mkdirSync(VERIFICATION_REPORTS_DIR, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up verification reports
		const reportFiles = require('fs')
			.readdirSync(VERIFICATION_REPORTS_DIR)
			.filter((f: string) => f.includes('test'));
		reportFiles.forEach((f: string) => {
			rmSync(join(VERIFICATION_REPORTS_DIR, f), { force: true });
		});
	});

	it('should initialize fresh database with init script', async () => {
		// Step 1: Verify init script exists
		expect(existsSync(INIT_SCRIPT_PATH)).toBe(true);

		// Step 2: Apply init script to fresh database
		const psqlResult = await runCommand('psql', [TEST_DB_URL, '-f', INIT_SCRIPT_PATH]);

		expect(psqlResult.exitCode).toBe(0);
		expect(psqlResult.stderr).not.toContain('ERROR');

		// Step 3: Verify tables were created
		const testClient = new Client({ connectionString: TEST_DB_URL });
		await testClient.connect();

		const tablesResult = await testClient.query(`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'hr_public'
			ORDER BY table_name;
		`);

		await testClient.end();

		// Should have 22 tables (from spec.md FR-019)
		expect(tablesResult.rows.length).toBeGreaterThanOrEqual(22);

		// Verify key tables exist
		const tableNames = tablesResult.rows.map((r) => r.table_name);
		expect(tableNames).toContain('users');
		expect(tableNames).toContain('departments');
		expect(tableNames).toContain('events');
		expect(tableNames).toContain('activity_logs');
		expect(tableNames).toContain('rollback_requests');
		expect(tableNames).toContain('bulk_rollback_batches');
	});

	it('should verify fresh database schema matches version control (PASS verdict)', async () => {
		// Prerequisites: Database initialized with init script
		await runCommand('psql', [TEST_DB_URL, '-f', INIT_SCRIPT_PATH]);

		// Run verify-schema CLI
		const verifyResult = await runCommand('tsx', [
			VERIFY_CLI_PATH,
			'--environment',
			'development',
			'--database-url',
			TEST_DB_URL,
			'--output-format',
			'json',
			'--output-path',
			VERIFICATION_REPORTS_DIR
		]);

		// Should exit with code 0 (PASS)
		expect(verifyResult.exitCode).toBe(0);

		// Should output PASS verdict
		expect(verifyResult.stdout).toContain('PASS');

		// Verify JSON report exists and has correct structure
		const reportFiles = require('fs')
			.readdirSync(VERIFICATION_REPORTS_DIR)
			.filter((f: string) => f.endsWith('.json'));
		expect(reportFiles.length).toBeGreaterThan(0);

		const reportPath = join(VERIFICATION_REPORTS_DIR, reportFiles[0]);
		const report = JSON.parse(readFileSync(reportPath, 'utf-8'));

		// Validate VerificationReport structure
		expect(report.verdict).toBe('PASS');
		expect(report.environment).toBe('development');
		expect(report.diff.hasDifferences).toBe(false);
		expect(report.diff.summary.totalDifferences).toBe(0);
		expect(report.executionTimeMs).toBeLessThan(5000); // Performance requirement
	});

	it('should create functional database for frontend application', async () => {
		// Initialize database
		await runCommand('psql', [TEST_DB_URL, '-f', INIT_SCRIPT_PATH]);

		// Test that frontend can query database
		const testClient = new Client({ connectionString: TEST_DB_URL });
		await testClient.connect();

		// Simulate typical frontend queries
		const usersQuery = await testClient.query('SELECT COUNT(*) FROM hr_public.users');
		expect(usersQuery.rows[0].count).toBeDefined();

		const departmentsQuery = await testClient.query('SELECT COUNT(*) FROM hr_public.departments');
		expect(departmentsQuery.rows[0].count).toBeDefined();

		const eventsQuery = await testClient.query('SELECT COUNT(*) FROM hr_public.events');
		expect(eventsQuery.rows[0].count).toBeDefined();

		await testClient.end();
	});

	it('should complete initialization workflow in under 5 minutes', async () => {
		const startTime = Date.now();

		// Full workflow: init + verify
		await runCommand('psql', [TEST_DB_URL, '-f', INIT_SCRIPT_PATH]);
		await runCommand('tsx', [
			VERIFY_CLI_PATH,
			'--environment',
			'development',
			'--database-url',
			TEST_DB_URL
		]);

		const duration = Date.now() - startTime;

		// Success criterion from spec.md: 100% of developers can initialize in first attempt
		// Reasonable time: < 5 minutes total
		expect(duration).toBeLessThan(5 * 60 * 1000);
	});

	it('should produce identical schema across multiple fresh initializations', async () => {
		// Create first database
		const db1Name = `${TEST_DB_NAME}_1`;
		await adminClient.query(`CREATE DATABASE ${db1Name}`);
		await runCommand('psql', [`postgresql://localhost/${db1Name}`, '-f', INIT_SCRIPT_PATH]);

		// Create second database
		const db2Name = `${TEST_DB_NAME}_2`;
		await adminClient.query(`CREATE DATABASE ${db2Name}`);
		await runCommand('psql', [`postgresql://localhost/${db2Name}`, '-f', INIT_SCRIPT_PATH]);

		// Compare schemas
		const client1 = new Client({ connectionString: `postgresql://localhost/${db1Name}` });
		const client2 = new Client({ connectionString: `postgresql://localhost/${db2Name}` });

		await client1.connect();
		await client2.connect();

		const schema1 = await getSchemaSnapshot(client1);
		const schema2 = await getSchemaSnapshot(client2);

		await client1.end();
		await client2.end();

		// Cleanup
		await adminClient.query(`DROP DATABASE ${db1Name}`);
		await adminClient.query(`DROP DATABASE ${db2Name}`);

		// Schemas should be identical
		expect(schema1.tableCount).toBe(schema2.tableCount);
		expect(schema1.tableNames).toEqual(schema2.tableNames);
	});

	it('should validate all required tables from FR-019 are created', async () => {
		await runCommand('psql', [TEST_DB_URL, '-f', INIT_SCRIPT_PATH]);

		const testClient = new Client({ connectionString: TEST_DB_URL });
		await testClient.connect();

		const requiredTables = [
			'users',
			'departments',
			'events',
			'tasks',
			'activity_logs',
			'rollback_requests',
			'bulk_rollback_batches',
			'attendance_records',
			'compensation_bands',
			'emergency_contacts',
			'employee_goals',
			'employee_vehicles',
			'event_attendees',
			'hr_reports',
			'leave_requests',
			'notifications',
			'payroll_records',
			'performance_reviews',
			'review_templates',
			'time_off_balances',
			'time_off_policies',
			'user_role_assignments'
		];

		for (const table of requiredTables) {
			const result = await testClient.query(
				`
				SELECT table_name
				FROM information_schema.tables
				WHERE table_schema = 'hr_public'
				AND table_name = $1
			`,
				[table]
			);

			expect(result.rows.length).toBe(1);
		}

		await testClient.end();
	});
});

/**
 * Helper function to run shell commands
 */
async function runCommand(
	command: string,
	args: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		const proc = spawn(command, args);

		let stdout = '';
		let stderr = '';

		proc.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		proc.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			resolve({
				exitCode: code ?? 1,
				stdout,
				stderr
			});
		});

		proc.on('error', (error) => {
			resolve({
				exitCode: 1,
				stdout,
				stderr: stderr + error.message
			});
		});
	});
}

/**
 * Helper function to get schema snapshot for comparison
 */
async function getSchemaSnapshot(client: Client): Promise<{
	tableCount: number;
	tableNames: string[];
}> {
	const result = await client.query(`
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'hr_public'
		ORDER BY table_name;
	`);

	return {
		tableCount: result.rows.length,
		tableNames: result.rows.map((r) => r.table_name)
	};
}
