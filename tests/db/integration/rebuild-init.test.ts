/**
 * Integration Test: Rebuild Init Script → Validate Equivalence
 *
 * Tests the complete workflow from quickstart.md Workflow 5:
 * - Create database A from init script
 * - Create database B from sequential migrations
 * - Run rebuild-init-script CLI
 * - Create database C from new init script
 * - Compare schemas: A = B = C (identical)
 * - Assert: validation passed
 *
 * This validates that init script = cumulative migrations (FR-002).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const ADMIN_DB_URL = 'postgresql://localhost/postgres';
const REBUILD_CLI_PATH = join(process.cwd(), 'scripts/db/rebuild-init-script.ts');
const ORIGINAL_INIT_PATH = join(process.cwd(), 'migrations/00_init_schema.sql');
const REBUILT_INIT_PATH = join(process.cwd(), 'migrations/test_rebuilt_init.sql');
const MIGRATIONS_DIR = join(process.cwd(), 'migrations');
const TEST_MIGRATIONS_DIR = join(process.cwd(), 'migrations/test-rebuild');

describe('Integration: Rebuild Init Script and Validate Equivalence', () => {
	let adminClient: Client;
	const testDbNames: string[] = [];

	beforeAll(async () => {
		adminClient = new Client({ connectionString: ADMIN_DB_URL });
		await adminClient.connect();

		// Create test migrations directory
		if (!existsSync(TEST_MIGRATIONS_DIR)) {
			mkdirSync(TEST_MIGRATIONS_DIR, { recursive: true });
		}

		// Create simple test migrations
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251001_001_create_users.sql'),
			`
			BEGIN;
			CREATE SCHEMA IF NOT EXISTS hr_public;
			CREATE TABLE hr_public.users (
				id SERIAL PRIMARY KEY,
				name TEXT NOT NULL,
				email TEXT UNIQUE
			);
			COMMIT;
			`
		);

		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251001_002_create_departments.sql'),
			`
			BEGIN;
			CREATE TABLE hr_public.departments (
				id SERIAL PRIMARY KEY,
				name TEXT NOT NULL
			);
			ALTER TABLE hr_public.users
				ADD COLUMN department_id INTEGER REFERENCES hr_public.departments(id);
			COMMIT;
			`
		);

		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251001_003_add_indexes.sql'),
			`
			BEGIN;
			CREATE INDEX idx_users_email ON hr_public.users(email);
			CREATE INDEX idx_users_department ON hr_public.users(department_id);
			COMMIT;
			`
		);
	});

	afterAll(async () => {
		// Drop all test databases
		for (const dbName of testDbNames) {
			await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
		}
		await adminClient.end();

		// Clean up test files
		if (existsSync(TEST_MIGRATIONS_DIR)) {
			rmSync(TEST_MIGRATIONS_DIR, { recursive: true, force: true });
		}
		if (existsSync(REBUILT_INIT_PATH)) {
			rmSync(REBUILT_INIT_PATH, { force: true });
		}
	});

	it('should rebuild init script from sequential migrations', async () => {
		const result = await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH
		]);

		expect(result.exitCode).toBe(0);
		expect(existsSync(REBUILT_INIT_PATH)).toBe(true);

		// Verify init script has header
		const content = readFileSync(REBUILT_INIT_PATH, 'utf-8');
		expect(content).toContain('SvelteHR Database Initialization');
		expect(content).toContain('Generated:');
		expect(content).toContain('DO NOT EDIT MANUALLY');
		expect(content).toContain('BEGIN;');
		expect(content).toContain('COMMIT;');
	});

	it('should validate init script equals cumulative migrations (FR-002)', async () => {
		// Run rebuild with validation
		const result = await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH,
			'--validate',
			'true'
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('validation');
		expect(result.stdout).toMatch(/PASSED|SUCCESS/i);

		// Parse JSON output
		const output = JSON.parse(result.stdout);
		expect(output.validationPassed).toBe(true);
		expect(output.migrationsApplied).toBe(3);
		expect(output.tablesCreated).toBeGreaterThanOrEqual(2); // users, departments
	});

	it('should create identical schemas: init script = sequential migrations', async () => {
		// Create database A from rebuilt init script
		const dbA = `hr_test_rebuild_a_${Date.now()}`;
		testDbNames.push(dbA);
		await adminClient.query(`CREATE DATABASE ${dbA}`);
		await runCommand('psql', [`postgresql://localhost/${dbA}`, '-f', REBUILT_INIT_PATH]);

		// Create database B from sequential migrations
		const dbB = `hr_test_rebuild_b_${Date.now()}`;
		testDbNames.push(dbB);
		await adminClient.query(`CREATE DATABASE ${dbB}`);

		const migrationFiles = readdirSync(TEST_MIGRATIONS_DIR)
			.filter((f) => f.endsWith('.sql'))
			.sort();

		for (const file of migrationFiles) {
			await runCommand('psql', [
				`postgresql://localhost/${dbB}`,
				'-f',
				join(TEST_MIGRATIONS_DIR, file)
			]);
		}

		// Compare schemas
		const clientA = new Client({ connectionString: `postgresql://localhost/${dbA}` });
		const clientB = new Client({ connectionString: `postgresql://localhost/${dbB}` });

		await clientA.connect();
		await clientB.connect();

		const schemaA = await getSchemaSnapshot(clientA);
		const schemaB = await getSchemaSnapshot(clientB);

		await clientA.end();
		await clientB.end();

		// Schemas must be identical
		expect(schemaA.tables).toEqual(schemaB.tables);
		expect(schemaA.columns).toEqual(schemaB.columns);
		expect(schemaA.indexes).toEqual(schemaB.indexes);
	});

	it('should complete rebuild in under 10 seconds', async () => {
		const startTime = Date.now();

		await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH,
			'--validate',
			'true'
		]);

		const duration = Date.now() - startTime;

		// Performance goal: rebuild + validation < 10s
		expect(duration).toBeLessThan(10000);
	});

	it('should create temporary database with unique name', async () => {
		const result = await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH
		]);

		const output = JSON.parse(result.stdout);
		expect(output.tempDatabaseName).toMatch(/hr_temp_\d{8}_\d{6}/);
	});

	it('should clean up temporary database when requested', async () => {
		const result = await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH,
			'--clean-database',
			'true'
		]);

		expect(result.exitCode).toBe(0);

		const output = JSON.parse(result.stdout);
		const tempDbName = output.tempDatabaseName;

		// Verify temp database was dropped
		const dbCheckResult = await adminClient.query(
			`
			SELECT datname FROM pg_database WHERE datname = $1
		`,
			[tempDbName]
		);

		expect(dbCheckResult.rows.length).toBe(0);
	});

	it('should preserve temporary database when requested', async () => {
		const result = await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH,
			'--clean-database',
			'false'
		]);

		expect(result.exitCode).toBe(0);

		const output = JSON.parse(result.stdout);
		const tempDbName = output.tempDatabaseName;
		testDbNames.push(tempDbName); // Track for cleanup

		// Verify temp database still exists
		const dbCheckResult = await adminClient.query(
			`
			SELECT datname FROM pg_database WHERE datname = $1
		`,
			[tempDbName]
		);

		expect(dbCheckResult.rows.length).toBe(1);
	});

	it('should export complete schema with all objects', async () => {
		await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH
		]);

		const content = readFileSync(REBUILT_INIT_PATH, 'utf-8');

		// Verify all schema objects are included
		expect(content).toContain('CREATE SCHEMA');
		expect(content).toContain('CREATE TABLE');
		expect(content).toContain('users');
		expect(content).toContain('departments');
		expect(content).toContain('CREATE INDEX');
		expect(content).toContain('ALTER TABLE');
		expect(content).toContain('REFERENCES');
	});

	it('should handle migration errors gracefully', async () => {
		// Create migration with syntax error
		writeFileSync(join(TEST_MIGRATIONS_DIR, '20251001_004_invalid.sql'), 'INVALID SQL SYNTAX;');

		const result = await runCommand('tsx', [
			REBUILD_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--init-script-path',
			REBUILT_INIT_PATH
		]);

		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain('error');
		expect(result.stderr).toContain('20251001_004_invalid.sql');

		// Cleanup invalid migration
		rmSync(join(TEST_MIGRATIONS_DIR, '20251001_004_invalid.sql'));
	});
});

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
			resolve({ exitCode: code ?? 2, stdout, stderr });
		});

		proc.on('error', (error) => {
			resolve({ exitCode: 2, stdout, stderr: stderr + error.message });
		});
	});
}

async function getSchemaSnapshot(client: Client): Promise<{
	tables: string[];
	columns: Array<{ table: string; column: string; type: string }>;
	indexes: string[];
}> {
	const tablesResult = await client.query(`
		SELECT table_name FROM information_schema.tables
		WHERE table_schema = 'hr_public'
		ORDER BY table_name
	`);

	const columnsResult = await client.query(`
		SELECT table_name, column_name, data_type
		FROM information_schema.columns
		WHERE table_schema = 'hr_public'
		ORDER BY table_name, ordinal_position
	`);

	const indexesResult = await client.query(`
		SELECT indexname FROM pg_indexes
		WHERE schemaname = 'hr_public'
		ORDER BY indexname
	`);

	return {
		tables: tablesResult.rows.map((r) => r.table_name),
		columns: columnsResult.rows.map((r) => ({
			table: r.table_name,
			column: r.column_name,
			type: r.data_type
		})),
		indexes: indexesResult.rows.map((r) => r.indexname)
	};
}
