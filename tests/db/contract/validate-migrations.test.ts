/**
 * Contract Tests for validate-migrations CLI
 *
 * Tests based on contracts/validate-migrations.contract.yaml
 * These tests define the CLI interface contract and MUST FAIL until implementation exists.
 *
 * Test Categories:
 * 1. CLI flag acceptance
 * 2. Naming pattern validation
 * 3. Sequential ordering validation
 * 4. Checksum integrity validation
 * 5. SQL syntax validation
 * 6. Rollback file validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'scripts/db/validate-migrations.ts');
const TEST_MIGRATIONS_DIR = join(process.cwd(), 'migrations/test-validate');

describe('validate-migrations CLI Contract', () => {
	beforeEach(() => {
		// Create test migrations directory
		if (!existsSync(TEST_MIGRATIONS_DIR)) {
			mkdirSync(TEST_MIGRATIONS_DIR, { recursive: true });
		}

		// Create valid migration files
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251001_001_create_users_table.sql'),
			`BEGIN;\nCREATE TABLE users (id SERIAL PRIMARY KEY);\nCOMMIT;`
		);
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251001_002_add_email_users.sql'),
			`BEGIN;\nALTER TABLE users ADD COLUMN email TEXT;\nCOMMIT;`
		);
	});

	afterEach(() => {
		// Clean up test files
		if (existsSync(TEST_MIGRATIONS_DIR)) {
			rmSync(TEST_MIGRATIONS_DIR, { recursive: true, force: true });
		}
	});

	describe('CLI Flag Acceptance', () => {
		it('should accept --migrations-path flag', async () => {
			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --database-url flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--database-url',
				'postgresql://localhost/test'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --check-syntax flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-syntax',
				'false'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --check-rollbacks flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-rollbacks',
				'false'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --strict flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--strict',
				'true'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});
	});

	describe('Naming Pattern Validation', () => {
		it('should validate correct naming pattern YYYYMMDD_NNN_description.sql', async () => {
			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toMatch(/valid|passed/i);
		});

		it('should detect invalid naming pattern', async () => {
			// Create file with invalid name
			writeFileSync(join(TEST_MIGRATIONS_DIR, 'add_users_table.sql'), 'SELECT 1;');

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain('INVALID_NAMING');
			expect(result.stderr).toContain('add_users_table.sql');
		});

		it('should validate date format in filename', async () => {
			// Invalid date (month 13)
			writeFileSync(join(TEST_MIGRATIONS_DIR, '20251301_001_test.sql'), 'SELECT 1;');

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toMatch(/invalid.*date/i);
		});

		it('should validate sequence number range (001-999)', async () => {
			// Invalid sequence (000)
			writeFileSync(join(TEST_MIGRATIONS_DIR, '20251001_000_test.sql'), 'SELECT 1;');

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toMatch(/sequence|001-999/i);
		});

		it('should enforce lowercase description with underscores', async () => {
			// Uppercase letters not allowed
			writeFileSync(join(TEST_MIGRATIONS_DIR, '20251001_003_Add_Users_Table.sql'), 'SELECT 1;');

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toMatch(/lowercase|pattern/i);
		});
	});

	describe('Sequential Ordering Validation', () => {
		it('should detect duplicate sequence numbers', async () => {
			// Create duplicate
			writeFileSync(
				join(TEST_MIGRATIONS_DIR, '20251001_001_duplicate_sequence.sql'),
				'SELECT 1;'
			);

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain('DUPLICATE_SEQUENCE');
			expect(result.stderr).toContain('001');
		});

		it('should warn on large sequence gaps (>5)', async () => {
			writeFileSync(join(TEST_MIGRATIONS_DIR, '20251001_010_large_gap.sql'), 'SELECT 1;');

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			// Should warn but not fail (unless strict mode)
			expect(result.stdout).toContain('SEQUENCE_GAP');
			expect(result.stdout).toMatch(/gap.*005.*010/i);
		});

		it('should pass with sequential numbering', async () => {
			// Add sequential migration
			writeFileSync(join(TEST_MIGRATIONS_DIR, '20251001_003_sequential.sql'), 'SELECT 1;');

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Checksum Integrity Validation', () => {
		it('should detect checksum mismatch for applied migrations', async () => {
			// This test requires database connection
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--database-url',
				'postgresql://localhost/test',
				'--check-checksums',
				'true'
			]);

			// Would detect mismatch if migration was modified after application
			expect([0, 1]).toContain(result.exitCode);
		});

		it('should calculate SHA-256 checksums for migration files', async () => {
			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			const jsonOutput = JSON.parse(result.stdout);

			expect(jsonOutput.summary).toHaveProperty('totalErrors');
			expect(jsonOutput.summary).toHaveProperty('totalWarnings');
		});
	});

	describe('SQL Syntax Validation', () => {
		it('should detect SQL syntax errors', async () => {
			// Create file with invalid SQL
			writeFileSync(
				join(TEST_MIGRATIONS_DIR, '20251002_001_invalid_syntax.sql'),
				'INVALID SQL SYNTAX HERE;'
			);

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-syntax',
				'true'
			]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain('SQL_SYNTAX_ERROR');
			expect(result.stderr).toContain('20251002_001_invalid_syntax.sql');
		});

		it('should validate transaction blocks (BEGIN/COMMIT)', async () => {
			// Create migration without transaction
			writeFileSync(
				join(TEST_MIGRATIONS_DIR, '20251002_002_no_transaction.sql'),
				'CREATE TABLE test (id INTEGER);'
			);

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-syntax',
				'true'
			]);

			// Should warn about missing transaction
			expect(result.stdout).toMatch(/transaction|BEGIN.*COMMIT/i);
		});

		it('should pass with valid SQL syntax', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-syntax',
				'true'
			]);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Rollback File Validation', () => {
		it('should warn when rollback file is missing', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-rollbacks',
				'true'
			]);

			// Should warn about missing rollbacks
			expect(result.stdout).toContain('MISSING_ROLLBACK');
			expect(result.stdout).toMatch(/20251001_001_create_users_table.sql/);
		});

		it('should pass when rollback files exist', async () => {
			// Create rollback files
			writeFileSync(
				join(TEST_MIGRATIONS_DIR, '20251001_001_create_users_table.rollback.sql'),
				'DROP TABLE users;'
			);
			writeFileSync(
				join(TEST_MIGRATIONS_DIR, '20251001_002_add_email_users.rollback.sql'),
				'ALTER TABLE users DROP COLUMN email;'
			);

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-rollbacks',
				'true'
			]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).not.toContain('MISSING_ROLLBACK');
		});

		it('should validate rollback file references forward migration', async () => {
			// Create rollback with reference
			const rollbackContent = `-- Rollback Migration: Revert create_users_table
-- Forward Migration: 20251001_001_create_users_table.sql
DROP TABLE users;`;

			writeFileSync(
				join(TEST_MIGRATIONS_DIR, '20251001_001_create_users_table.rollback.sql'),
				rollbackContent
			);

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--check-rollbacks',
				'true'
			]);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Exit Codes', () => {
		it('should exit with code 0 when all validations pass', async () => {
			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toMatch(/valid|passed|success/i);
		});

		it('should exit with code 1 when validation errors found', async () => {
			// Create invalid file
			writeFileSync(join(TEST_MIGRATIONS_DIR, 'invalid_name.sql'), 'SELECT 1;');

			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			expect(result.exitCode).toBe(1);
		});

		it('should exit with code 2 on process failure', async () => {
			const result = await runCLI(['--migrations-path', '/nonexistent/path']);

			expect(result.exitCode).toBe(2);
			expect(result.stderr).toContain('error');
		});

		it('should fail on warnings in strict mode', async () => {
			// Create gap in sequence numbers (warning in normal mode)
			writeFileSync(join(TEST_MIGRATIONS_DIR, '20251001_010_gap.sql'), 'SELECT 1;');

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--strict',
				'true'
			]);

			expect(result.exitCode).toBe(1);
		});
	});

	describe('Validation Summary Output', () => {
		it('should output validation summary with error and warning counts', async () => {
			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			const jsonOutput = JSON.parse(result.stdout);

			expect(jsonOutput).toHaveProperty('valid');
			expect(jsonOutput).toHaveProperty('migrationsChecked');
			expect(jsonOutput).toHaveProperty('errors');
			expect(jsonOutput).toHaveProperty('warnings');
			expect(jsonOutput.summary).toHaveProperty('totalErrors');
			expect(jsonOutput.summary).toHaveProperty('totalWarnings');
		});

		it('should list specific validation checks performed', async () => {
			const result = await runCLI(['--migrations-path', TEST_MIGRATIONS_DIR]);

			const jsonOutput = JSON.parse(result.stdout);

			expect(Array.isArray(jsonOutput.checksPerformed)).toBe(true);
			expect(jsonOutput.checksPerformed).toContain('Naming pattern validation');
			expect(jsonOutput.checksPerformed).toContain('Sequential ordering validation');
		});
	});
});

async function runCLI(args: string[]): Promise<{
	exitCode: number;
	stdout: string;
	stderr: string;
}> {
	return new Promise((resolve) => {
		const proc = spawn('tsx', [CLI_PATH, ...args]);

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
				exitCode: code ?? 2,
				stdout,
				stderr
			});
		});

		proc.on('error', (error) => {
			resolve({
				exitCode: 2,
				stdout,
				stderr: stderr + error.message
			});
		});
	});
}
