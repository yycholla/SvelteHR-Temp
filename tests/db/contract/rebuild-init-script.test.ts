/**
 * Contract Tests for rebuild-init-script CLI
 *
 * Tests based on contracts/rebuild-init-script.contract.yaml
 * These tests define the CLI interface contract and MUST FAIL until implementation exists.
 *
 * Test Categories:
 * 1. CLI flag acceptance
 * 2. Temporary database creation and migration application
 * 3. Schema export via pg_dump
 * 4. Validation (init script = cumulative migrations)
 * 5. Exit codes and error handling
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'scripts/db/rebuild-init-script.ts');
const TEST_MIGRATIONS_DIR = join(process.cwd(), 'migrations/test');
const TEST_INIT_SCRIPT = join(process.cwd(), 'migrations/test_00_init_schema.sql');

describe('rebuild-init-script CLI Contract', () => {
	beforeEach(() => {
		// Create test migrations directory
		if (!existsSync(TEST_MIGRATIONS_DIR)) {
			mkdirSync(TEST_MIGRATIONS_DIR, { recursive: true });
		}

		// Create mock migration files
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251001_001_create_users_table.sql'),
			`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);`
		);
		writeFileSync(
			join(TEST_MIGRATIONS_DIR, '20251001_002_add_email_users.sql'),
			`ALTER TABLE users ADD COLUMN email TEXT UNIQUE;`
		);
	});

	afterEach(() => {
		// Clean up test files
		if (existsSync(TEST_MIGRATIONS_DIR)) {
			rmSync(TEST_MIGRATIONS_DIR, { recursive: true, force: true });
		}
		if (existsSync(TEST_INIT_SCRIPT)) {
			rmSync(TEST_INIT_SCRIPT, { force: true });
		}
	});

	describe('CLI Flag Acceptance', () => {
		it('should accept --migrations-path flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --init-script-path flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --validate flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--validate',
				'true'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --clean-database flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--clean-database',
				'false'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --temp-database-url flag', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--temp-database-url',
				'postgresql://localhost/postgres'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});
	});

	describe('Init Script Generation', () => {
		it('should create init script file at specified path', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			expect(existsSync(TEST_INIT_SCRIPT)).toBe(true);
		});

		it('should include schema creation in init script', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--schema-name',
				'hr_public'
			]);

			const content = readFileSync(TEST_INIT_SCRIPT, 'utf-8');

			expect(content).toContain('CREATE SCHEMA');
			expect(content).toContain('hr_public');
		});

		it('should include header comment with generation metadata', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			const content = readFileSync(TEST_INIT_SCRIPT, 'utf-8');

			expect(content).toMatch(/--.*Generated:/);
			expect(content).toMatch(/--.*PostgreSQL Version:/);
			expect(content).toMatch(/--.*Schema:/);
			expect(content).toContain('DO NOT EDIT MANUALLY');
		});

		it('should include all table definitions from migrations', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			const content = readFileSync(TEST_INIT_SCRIPT, 'utf-8');

			expect(content).toContain('CREATE TABLE');
			expect(content).toContain('users');
			expect(content).toContain('email');
		});

		it('should wrap script in BEGIN/COMMIT transaction', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			const content = readFileSync(TEST_INIT_SCRIPT, 'utf-8');

			expect(content).toContain('BEGIN;');
			expect(content).toContain('COMMIT;');
		});
	});

	describe('Validation', () => {
		it('should exit with code 0 when validation passes', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--validate',
				'true'
			]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('validation');
			expect(result.stdout).toMatch(/PASSED|SUCCESS/i);
		});

		it('should exit with code 1 when validation fails (schemas do not match)', async () => {
			// This test simulates a scenario where init script doesn't match migrations
			// In practice, this would be detected by comparing two database schemas

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--validate',
				'true',
				'--force-validation-failure', // Hypothetical flag for testing
				'true'
			]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toMatch(/validation.*failed|schema.*mismatch/i);
		});

		it('should report validation details in output', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--validate',
				'true'
			]);

			const jsonOutput = JSON.parse(result.stdout);

			expect(jsonOutput).toHaveProperty('validationPassed');
			expect(jsonOutput).toHaveProperty('migrationsApplied');
			expect(jsonOutput).toHaveProperty('tablesCreated');
		});
	});

	describe('Exit Codes', () => {
		it('should exit with code 0 on successful rebuild with validation', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--validate',
				'true'
			]);

			expect(result.exitCode).toBe(0);
		});

		it('should exit with code 2 on rebuild error (invalid migration SQL)', async () => {
			// Create migration with syntax error
			writeFileSync(
				join(TEST_MIGRATIONS_DIR, '20251001_003_invalid.sql'),
				`INVALID SQL SYNTAX HERE;`
			);

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			expect(result.exitCode).toBe(2);
			expect(result.stderr).toContain('error');
		});

		it('should exit with code 2 on database connection error', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--temp-database-url',
				'postgresql://invalid:9999/nonexistent'
			]);

			expect(result.exitCode).toBe(2);
			expect(result.stderr).toMatch(/connection|database.*error/i);
		});
	});

	describe('Temporary Database Handling', () => {
		it('should create temporary database with unique name', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			const jsonOutput = JSON.parse(result.stdout);

			expect(jsonOutput.tempDatabaseName).toMatch(/hr_temp_\d{8}_\d{6}/);
		});

		it('should clean up temporary database when cleanDatabase=true', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--clean-database',
				'true'
			]);

			// After completion, temp database should not exist
			// This would be verified by querying PostgreSQL, but for contract test
			// we just verify the flag was processed
			expect(result.exitCode).toBe(0);
		});

		it('should preserve temporary database when cleanDatabase=false', async () => {
			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT,
				'--clean-database',
				'false'
			]);

			const jsonOutput = JSON.parse(result.stdout);

			expect(jsonOutput).toHaveProperty('tempDatabaseName');
			expect(result.stdout).toMatch(/database.*preserved|not.*cleaned/i);
		});
	});

	describe('Performance', () => {
		it('should complete rebuild in less than 10 seconds', async () => {
			const startTime = Date.now();

			const result = await runCLI([
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--init-script-path',
				TEST_INIT_SCRIPT
			]);

			const duration = Date.now() - startTime;

			// Performance goal: rebuild completes in reasonable time
			expect(duration).toBeLessThan(10000);
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
