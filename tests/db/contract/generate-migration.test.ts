/**
 * Contract Tests for generate-migration CLI
 *
 * Tests based on contracts/generate-migration.contract.yaml
 * These tests define the CLI interface contract and MUST FAIL until implementation exists.
 *
 * Test Categories:
 * 1. CLI flag acceptance
 * 2. Migration file generation with proper naming
 * 3. Rollback file creation
 * 4. Manual review requirement enforcement (FR-024a)
 * 5. Production safety (FR-026)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'scripts/db/generate-migration.ts');
const TEST_MIGRATIONS_DIR = join(process.cwd(), 'migrations/test-remediation');
const TEST_DIFF_PATH = join(process.cwd(), 'verification-reports/test-diff.json');

describe('generate-migration CLI Contract', () => {
	beforeEach(() => {
		// Create test directories
		if (!existsSync(TEST_MIGRATIONS_DIR)) {
			mkdirSync(TEST_MIGRATIONS_DIR, { recursive: true });
		}

		// Create mock diff file
		const mockDiff = {
			sourceSchema: 'version control',
			targetSchema: 'database',
			comparedAt: new Date().toISOString(),
			hasDifferences: true,
			tableDiffs: [
				{
					tableName: 'test_table',
					diffType: 'modified',
					columnDiffs: [
						{
							columnName: 'test_column',
							diffType: 'missing',
							targetValue: { dataType: 'text', isNullable: true }
						}
					],
					constraintDiffs: [],
					indexDiffs: []
				}
			],
			summary: {
				missingTables: 0,
				extraTables: 0,
				modifiedTables: 1,
				missingColumns: 1,
				extraColumns: 0,
				modifiedColumns: 0,
				missingIndexes: 0,
				extraIndexes: 0,
				totalDifferences: 1
			}
		};

		writeFileSync(TEST_DIFF_PATH, JSON.stringify(mockDiff, null, 2));
	});

	afterEach(() => {
		// Clean up test outputs
		if (existsSync(TEST_MIGRATIONS_DIR)) {
			rmSync(TEST_MIGRATIONS_DIR, { recursive: true, force: true });
		}
		if (existsSync(TEST_DIFF_PATH)) {
			rmSync(TEST_DIFF_PATH, { force: true });
		}
	});

	describe('CLI Flag Acceptance', () => {
		it('should accept --diff-source flag with file path', async () => {
			const result = await runCLI(['--diff-source', TEST_DIFF_PATH]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --environment flag', async () => {
			const environments = ['development', 'staging', 'production'];

			for (const env of environments) {
				const result = await runCLI(['--diff-source', TEST_DIFF_PATH, '--environment', env]);

				expect([0, 1, 2]).toContain(result.exitCode);
			}
		});

		it('should accept --dry-run flag', async () => {
			const result = await runCLI(['--diff-source', TEST_DIFF_PATH, '--dry-run', 'true']);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --generate-rollback flag', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--generate-rollback',
				'false'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});
	});

	describe('Migration File Naming Pattern', () => {
		it('should generate migration with YYYYMMDD_NNN_description.sql pattern', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const migrationFiles = files.filter((f) => f.endsWith('.sql') && !f.includes('.rollback'));

			expect(migrationFiles.length).toBeGreaterThan(0);

			const filename = migrationFiles[0];
			// Pattern: YYYYMMDD_NNN_description.sql
			expect(filename).toMatch(/^\d{8}_\d{3}_[a-z0-9_]+\.sql$/);
		});

		it('should use correct date in filename (today)', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const migrationFile = files.find((f) => f.endsWith('.sql') && !f.includes('.rollback'));

			const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
			expect(migrationFile).toContain(today);
		});

		it('should use descriptive filename based on diff reason', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const migrationFile = files.find((f) => f.endsWith('.sql') && !f.includes('.rollback'));

			// Filename should indicate missing column
			expect(migrationFile?.toLowerCase()).toMatch(/missing|add|column/);
		});
	});

	describe('Rollback File Creation', () => {
		it('should create rollback file when generateRollback=true', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--generate-rollback',
				'true'
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const rollbackFiles = files.filter((f) => f.includes('.rollback.sql'));

			expect(rollbackFiles.length).toBeGreaterThan(0);
		});

		it('should not create rollback file when generateRollback=false', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--generate-rollback',
				'false'
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const rollbackFiles = files.filter((f) => f.includes('.rollback.sql'));

			expect(rollbackFiles.length).toBe(0);
		});

		it('should pair rollback filename with forward migration', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--generate-rollback',
				'true'
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const forwardFile = files.find((f) => f.endsWith('.sql') && !f.includes('.rollback'));
			const rollbackFile = files.find((f) => f.includes('.rollback.sql'));

			expect(rollbackFile).toBe(forwardFile?.replace('.sql', '.rollback.sql'));
		});
	});

	describe('Manual Review Requirement (FR-024a)', () => {
		it('should always set requiresReview=true in generated migration', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			// Parse JSON output to check requiresReview flag
			const jsonOutput = JSON.parse(result.stdout);

			expect(jsonOutput.files).toBeDefined();
			jsonOutput.files.forEach((file: any) => {
				expect(file.requiresReview).toBe(true);
			});
		});

		it('should include manual review warning in migration file header', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const migrationFile = files.find((f) => f.endsWith('.sql') && !f.includes('.rollback'));
			const content = readFileSync(join(TEST_MIGRATIONS_DIR, migrationFile!), 'utf-8');

			expect(content).toContain('Requires Review: YES');
			expect(content).toContain('manual');
		});
	});

	describe('Production Safety (FR-026)', () => {
		it('should only generate files for production environment, never apply', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--environment',
				'production',
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			// Should generate files
			const files = readdirSync(TEST_MIGRATIONS_DIR);
			expect(files.length).toBeGreaterThan(0);

			// Should include production warning in output
			expect(result.stdout).toContain('production');
			expect(result.stdout).toMatch(/generated but not applied|manual review/i);
		});

		it('should include production warning in migration file for production env', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--environment',
				'production',
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			const migrationFile = files.find((f) => f.endsWith('.sql') && !f.includes('.rollback'));
			const content = readFileSync(join(TEST_MIGRATIONS_DIR, migrationFile!), 'utf-8');

			expect(content).toContain('production');
			expect(content).toMatch(/manual/i);
		});
	});

	describe('Exit Codes', () => {
		it('should exit with code 0 on successful generation', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR
			]);

			expect(result.exitCode).toBe(0);
		});

		it('should exit with code 1 on validation error (no differences)', async () => {
			// Create diff with no differences
			const noDiff = {
				sourceSchema: 'version control',
				targetSchema: 'database',
				comparedAt: new Date().toISOString(),
				hasDifferences: false,
				tableDiffs: [],
				summary: { totalDifferences: 0 }
			};
			writeFileSync(TEST_DIFF_PATH, JSON.stringify(noDiff));

			const result = await runCLI(['--diff-source', TEST_DIFF_PATH]);

			expect(result.exitCode).toBe(1);
			expect(result.stderr).toContain('no differences');
		});

		it('should exit with code 2 on generation failure (invalid diff file)', async () => {
			const result = await runCLI(['--diff-source', '/nonexistent/path/diff.json']);

			expect(result.exitCode).toBe(2);
			expect(result.stderr).toContain('error');
		});
	});

	describe('Dry Run Mode', () => {
		it('should not write files in dry-run mode', async () => {
			const result = await runCLI([
				'--diff-source',
				TEST_DIFF_PATH,
				'--migrations-path',
				TEST_MIGRATIONS_DIR,
				'--dry-run',
				'true'
			]);

			const files = readdirSync(TEST_MIGRATIONS_DIR);
			expect(files.length).toBe(0);
		});

		it('should output SQL preview in dry-run mode', async () => {
			const result = await runCLI(['--diff-source', TEST_DIFF_PATH, '--dry-run', 'true']);

			const jsonOutput = JSON.parse(result.stdout);

			expect(jsonOutput.dryRun).toBe(true);
			expect(jsonOutput.files[0]).toHaveProperty('sqlPreview');
			expect(jsonOutput.files[0].sqlPreview).toContain('ALTER TABLE');
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

function readdirSync(dir: string): string[] {
	try {
		return require('fs').readdirSync(dir);
	} catch {
		return [];
	}
}
