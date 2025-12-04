/**
 * Integration Test: Migration Validation Detects Errors
 *
 * Tests the complete workflow from quickstart.md Workflow 4:
 * - Create valid migrations (proper naming, sequence)
 * - Create invalid migrations:
 *   - Wrong naming pattern (add_users_table.sql)
 *   - Duplicate sequence (20251003_005_test.sql when 005 exists)
 *   - Modified applied migration (change checksum)
 *   - Missing rollback file
 * - Run validate-migrations CLI
 * - Assert: 4 errors detected, specific error codes match
 *
 * This validates the complete migration validation workflow.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Client } from 'pg';
import { spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const TEST_MIGRATIONS_DIR = join(process.cwd(), 'migrations/test-validation');
const VALIDATE_CLI_PATH = join(process.cwd(), 'scripts/db/validate-migrations.ts');
const TEST_DB_NAME = `hr_test_validation_${Date.now()}`;
const TEST_DB_URL = `postgresql://localhost/${TEST_DB_NAME}`;

describe('Integration: Migration Validation Error Detection', () => {
	let adminClient: Client;
	let testClient: Client;

	beforeAll(async () => {
		// Create test database for checksum testing
		adminClient = new Client({ connectionString: 'postgresql://localhost/postgres' });
		await adminClient.connect();
		await adminClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);

		testClient = new Client({ connectionString: TEST_DB_URL });
		await testClient.connect();

		// Create schema_migrations table
		await testClient.query(`
			CREATE TABLE IF NOT EXISTS schema_migrations (
				id SERIAL PRIMARY KEY,
				filename TEXT NOT NULL UNIQUE,
				checksum TEXT NOT NULL,
				applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
				applied_by TEXT NOT NULL,
				execution_time_ms INTEGER NOT NULL,
				success BOOLEAN NOT NULL DEFAULT true
			);
		`);
	});

	afterAll(async () => {
		await testClient?.end();
		await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
		await adminClient.end();
	});

	beforeEach(() => {
		// Create test migrations directory
		if (!existsSync(TEST_MIGRATIONS_DIR)) {
			mkdirSync(TEST_MIGRATIONS_DIR, { recursive: true });
		}

		// Create valid migrations
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251003_001_create_users_table.sql'),
			`BEGIN;\nCREATE TABLE users (id SERIAL PRIMARY KEY);\nCOMMIT;`
		);
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251003_002_add_email_users.sql'),
			`BEGIN;\nALTER TABLE users ADD COLUMN email TEXT;\nCOMMIT;`
		);
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251003_003_add_name_users.sql'),
			`BEGIN;\nALTER TABLE users ADD COLUMN name TEXT;\nCOMMIT;`
		);
	});

	afterEach(() => {
		// Clean up test files
		if (existsSync(TEST_MIGRATIONS_DIR)) {
			rmSync(TEST_MIGRATIONS_DIR, { recursive: true, force: true });
		}
	});

	it('should pass validation for correctly formatted migrations', async () => {
		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR
		]);

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('valid');

		const output = JSON.parse(result.stdout);
		expect(output.valid).toBe(true);
		expect(output.migrationsChecked).toBe(3);
		expect(output.errors.length).toBe(0);
	});

	it('should detect invalid naming pattern (INVALID_NAMING)', async () => {
		// Create file with invalid name
		writeFileSync(join(TEST_MIGRATIONS_DIR, 'add_users_table.sql'), 'SELECT 1;');

		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR
		]);

		expect(result.exitCode).toBe(1);

		const output = JSON.parse(result.stdout);
		expect(output.valid).toBe(false);

		const namingError = output.errors.find((e: any) => e.code === 'INVALID_NAMING');
		expect(namingError).toBeDefined();
		expect(namingError.migration).toBe('add_users_table.sql');
		expect(namingError.expectedPattern).toBe('^\\d{8}_\\d{3}_[a-z0-9_]+\\.sql$');
	});

	it('should detect duplicate sequence numbers (DUPLICATE_SEQUENCE)', async () => {
		// Create duplicate sequence
		writeFileSync(join(TEST_MIGRATIONS_DIR, '20251003_001_duplicate_sequence.sql'), 'SELECT 1;');

		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR
		]);

		expect(result.exitCode).toBe(1);

		const output = JSON.parse(result.stdout);
		const duplicateError = output.errors.find((e: any) => e.code === 'DUPLICATE_SEQUENCE');
		expect(duplicateError).toBeDefined();
		expect(duplicateError.message).toContain('001');
		expect(duplicateError.conflictingMigration).toContain('20251003_001_create_users_table.sql');
	});

	it('should warn on large sequence gaps (SEQUENCE_GAP)', async () => {
		// Create large gap (003 → 010)
		writeFileSync(join(TEST_MIGRATIONS_DIR, '20251003_010_large_gap.sql'), 'SELECT 1;');

		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR
		]);

		const output = JSON.parse(result.stdout);
		const gapWarning = output.warnings.find((w: any) => w.code === 'SEQUENCE_GAP');
		expect(gapWarning).toBeDefined();
		expect(gapWarning.message).toMatch(/003.*010/);
	});

	it('should detect checksum mismatch for applied migrations (CHECKSUM_MISMATCH)', async () => {
		// Record migration as applied with original checksum
		const migrationPath = join(TEST_MIGRATIONS_DIR, '20251003_001_create_users_table.sql');
		const originalContent = readFileSync(migrationPath, 'utf-8');
		const originalChecksum = createHash('sha256').update(originalContent).digest('hex');

		await testClient.query(
			`
			INSERT INTO schema_migrations (filename, checksum, applied_by, execution_time_ms)
			VALUES ($1, $2, 'test_user', 100)
		`,
			['20251003_001_create_users_table.sql', originalChecksum]
		);

		// Modify the migration file
		writeFileSync(
			migrationPath,
			`BEGIN;\nCREATE TABLE users (id SERIAL PRIMARY KEY, modified TEXT);\nCOMMIT;`
		);

		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--database-url',
			TEST_DB_URL
		]);

		expect(result.exitCode).toBe(1);

		const output = JSON.parse(result.stdout);
		const checksumError = output.errors.find((e: any) => e.code === 'CHECKSUM_MISMATCH');
		expect(checksumError).toBeDefined();
		expect(checksumError.migration).toBe('20251003_001_create_users_table.sql');
		expect(checksumError.expectedChecksum).toBe(originalChecksum);
		expect(checksumError.actualChecksum).not.toBe(originalChecksum);
	});

	it('should detect SQL syntax errors (SQL_SYNTAX_ERROR)', async () => {
		// Create file with invalid SQL
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251003_004_invalid_syntax.sql'),
			'INVALID SQL SYNTAX HERE;'
		);

		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--check-syntax',
			'true'
		]);

		expect(result.exitCode).toBe(1);

		const output = JSON.parse(result.stdout);
		const syntaxError = output.errors.find((e: any) => e.code === 'SQL_SYNTAX_ERROR');
		expect(syntaxError).toBeDefined();
		expect(syntaxError.migration).toBe('20251003_004_invalid_syntax.sql');
	});

	it('should warn about missing rollback files (MISSING_ROLLBACK)', async () => {
		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--check-rollbacks',
			'true'
		]);

		const output = JSON.parse(result.stdout);
		const rollbackWarnings = output.warnings.filter((w: any) => w.code === 'MISSING_ROLLBACK');

		expect(rollbackWarnings.length).toBe(3); // All 3 migrations missing rollbacks
		expect(rollbackWarnings[0].migration).toContain('20251003_001_create_users_table.sql');
	});

	it('should pass when rollback files exist', async () => {
		// Create rollback files
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251003_001_create_users_table.rollback.sql'),
			'DROP TABLE users;'
		);
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251003_002_add_email_users.rollback.sql'),
			'ALTER TABLE users DROP COLUMN email;'
		);
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251003_003_add_name_users.rollback.sql'),
			'ALTER TABLE users DROP COLUMN name;'
		);

		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--check-rollbacks',
			'true'
		]);

		const output = JSON.parse(result.stdout);
		const rollbackWarnings = output.warnings.filter((w: any) => w.code === 'MISSING_ROLLBACK');

		expect(rollbackWarnings.length).toBe(0);
	});

	it('should fail on warnings in strict mode', async () => {
		// Create gap (warning in normal mode, error in strict mode)
		writeFileSync(join(TEST_MIGRATIONS_DIR, '20251003_010_gap.sql'), 'SELECT 1;');

		const normalResult = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--strict',
			'false'
		]);

		expect(normalResult.exitCode).toBe(0); // Warnings don't fail

		const strictResult = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR,
			'--strict',
			'true'
		]);

		expect(strictResult.exitCode).toBe(1); // Warnings fail in strict mode
	});

	it('should detect multiple error types in single validation run', async () => {
		// Create multiple invalid migrations
		writeFileSync(join(TEST_MIGRATIONS_DIR, 'invalid_name.sql'), 'SELECT 1;');
		writeFileSync(join(TEST_MIGRATIONS_DIR, '20251003_001_duplicate.sql'), 'SELECT 1;');
		writeFileSync(join(TEST_MIGRATIONS_DIR, '20251003_005_Invalid_Uppercase.sql'), 'SELECT 1;');

		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR
		]);

		expect(result.exitCode).toBe(1);

		const output = JSON.parse(result.stdout);
		expect(output.errors.length).toBeGreaterThanOrEqual(3);

		const errorCodes = output.errors.map((e: any) => e.code);
		expect(errorCodes).toContain('INVALID_NAMING');
		expect(errorCodes).toContain('DUPLICATE_SEQUENCE');
	});

	it('should output validation summary with counts', async () => {
		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR
		]);

		const output = JSON.parse(result.stdout);

		expect(output).toHaveProperty('valid');
		expect(output).toHaveProperty('migrationsChecked');
		expect(output).toHaveProperty('errors');
		expect(output).toHaveProperty('warnings');
		expect(output).toHaveProperty('summary');
		expect(output.summary).toHaveProperty('totalErrors');
		expect(output.summary).toHaveProperty('totalWarnings');
	});

	it('should list validation checks performed', async () => {
		const result = await runCommand('tsx', [
			VALIDATE_CLI_PATH,
			'--migrations-path',
			TEST_MIGRATIONS_DIR
		]);

		const output = JSON.parse(result.stdout);

		expect(Array.isArray(output.checksPerformed)).toBe(true);
		expect(output.checksPerformed).toContain('Naming pattern validation');
		expect(output.checksPerformed).toContain('Sequential ordering validation');
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
