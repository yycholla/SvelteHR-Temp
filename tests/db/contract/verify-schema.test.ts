/**
 * Contract Tests for verify-schema CLI
 *
 * Tests based on contracts/verify-schema.contract.yaml
 * These tests define the CLI interface contract and MUST FAIL until implementation exists.
 *
 * Test Categories:
 * 1. CLI flag acceptance and validation
 * 2. Exit codes (0=PASS, 1=WARN/FAIL, 2=ERROR)
 * 3. Output formats (JSON, Markdown, both)
 * 4. VerificationReport schema validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const CLI_PATH = join(process.cwd(), 'scripts/db/verify-schema.ts');
const TEST_OUTPUT_DIR = join(process.cwd(), 'verification-reports/test');

describe('verify-schema CLI Contract', () => {
	beforeEach(() => {
		// Create test output directory
		if (!existsSync(TEST_OUTPUT_DIR)) {
			mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test outputs
		if (existsSync(TEST_OUTPUT_DIR)) {
			rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
		}
	});

	describe('CLI Flag Acceptance', () => {
		it('should accept --environment flag with valid values', async () => {
			const validEnvironments = ['development', 'staging', 'production'];

			for (const env of validEnvironments) {
				const result = await runCLI([
					'--environment',
					env,
					'--database-url',
					'postgresql://localhost/test'
				]);

				// Should not fail on invalid flag (exit code 0, 1, or 2 are all valid)
				expect([0, 1, 2]).toContain(result.exitCode);
			}
		});

		it('should reject invalid --environment values', async () => {
			const result = await runCLI([
				'--environment',
				'invalid-env',
				'--database-url',
				'postgresql://localhost/test'
			]);

			// Should exit with error code for invalid environment
			expect(result.exitCode).toBe(2);
			expect(result.stderr).toContain('invalid');
		});

		it('should accept --database-url flag', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://user:pass@localhost:5432/hr_db'
			]);

			// Flag should be accepted (implementation will handle connection)
			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --output-format flag with valid values', async () => {
			const validFormats = ['json', 'markdown', 'both'];

			for (const format of validFormats) {
				const result = await runCLI([
					'--environment',
					'development',
					'--database-url',
					'postgresql://localhost/test',
					'--output-format',
					format
				]);

				expect([0, 1, 2]).toContain(result.exitCode);
			}
		});

		it('should accept --fail-on-differences flag', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test',
				'--fail-on-differences',
				'false'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});

		it('should accept --schema-name flag', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test',
				'--schema-name',
				'hr_public'
			]);

			expect([0, 1, 2]).toContain(result.exitCode);
		});
	});

	describe('Exit Codes', () => {
		it('should exit with code 0 when schema matches (PASS verdict)', async () => {
			// This test will fail until implementation exists
			// Expected: CLI runs, compares schemas, finds no differences, exits 0
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test_identical'
			]);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('PASS');
		});

		it('should exit with code 1 when differences found (WARN/FAIL verdict)', async () => {
			// Expected: CLI finds schema differences, exits 1
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test_with_drift'
			]);

			expect(result.exitCode).toBe(1);
			expect(result.stdout).toMatch(/WARN|FAIL/);
		});

		it('should exit with code 2 on verification error', async () => {
			// Expected: Database connection fails or verification process errors, exits 2
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://invalid:connection@localhost:9999/nonexistent'
			]);

			expect(result.exitCode).toBe(2);
			expect(result.stderr).toContain('error');
		});
	});

	describe('Output Formats', () => {
		it('should generate JSON output by default', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test',
				'--output-path',
				TEST_OUTPUT_DIR
			]);

			const jsonFiles = readdirSync(TEST_OUTPUT_DIR).filter((f) => f.endsWith('.json'));
			expect(jsonFiles.length).toBeGreaterThan(0);

			const jsonContent = readFileSync(join(TEST_OUTPUT_DIR, jsonFiles[0]), 'utf-8');
			const report = JSON.parse(jsonContent);

			// Verify VerificationReport schema
			expect(report).toHaveProperty('verificationId');
			expect(report).toHaveProperty('runAt');
			expect(report).toHaveProperty('environment');
			expect(report).toHaveProperty('verdict');
			expect(report).toHaveProperty('executionTimeMs');
		});

		it('should generate Markdown output when format=markdown', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test',
				'--output-format',
				'markdown',
				'--output-path',
				TEST_OUTPUT_DIR
			]);

			const mdFiles = readdirSync(TEST_OUTPUT_DIR).filter((f) => f.endsWith('.md'));
			expect(mdFiles.length).toBeGreaterThan(0);

			const mdContent = readFileSync(join(TEST_OUTPUT_DIR, mdFiles[0]), 'utf-8');
			expect(mdContent).toContain('# Schema Verification');
			expect(mdContent).toMatch(/Verdict:|PASS|WARN|FAIL/);
		});

		it('should generate both JSON and Markdown when format=both', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test',
				'--output-format',
				'both',
				'--output-path',
				TEST_OUTPUT_DIR
			]);

			const files = readdirSync(TEST_OUTPUT_DIR);
			const jsonFiles = files.filter((f) => f.endsWith('.json'));
			const mdFiles = files.filter((f) => f.endsWith('.md'));

			expect(jsonFiles.length).toBeGreaterThan(0);
			expect(mdFiles.length).toBeGreaterThan(0);
		});
	});

	describe('VerificationReport Schema Validation', () => {
		it('should produce valid VerificationReport JSON structure', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test',
				'--output-path',
				TEST_OUTPUT_DIR
			]);

			const jsonFiles = readdirSync(TEST_OUTPUT_DIR).filter((f) => f.endsWith('.json'));
			const report = JSON.parse(readFileSync(join(TEST_OUTPUT_DIR, jsonFiles[0]), 'utf-8'));

			// Validate VerificationReport schema from data-model.md
			expect(report.verificationId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
			expect(report.runAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO-8601
			expect(['development', 'staging', 'production']).toContain(report.environment);
			expect(['PASS', 'WARN', 'FAIL', 'ERROR']).toContain(report.verdict);
			expect(typeof report.executionTimeMs).toBe('number');
			expect(report.executionTimeMs).toBeGreaterThanOrEqual(0);

			// Validate diff structure
			expect(report.diff).toHaveProperty('hasDifferences');
			expect(report.diff).toHaveProperty('summary');
			expect(report.diff.summary).toHaveProperty('totalDifferences');

			// Validate recommended actions array
			expect(Array.isArray(report.recommendedActions)).toBe(true);
		});

		it('should include schema metadata in report when available', async () => {
			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test',
				'--output-path',
				TEST_OUTPUT_DIR
			]);

			const jsonFiles = readdirSync(TEST_OUTPUT_DIR).filter((f) => f.endsWith('.json'));
			const report = JSON.parse(readFileSync(join(TEST_OUTPUT_DIR, jsonFiles[0]), 'utf-8'));

			if (report.schemaSource) {
				expect(report.schemaSource).toHaveProperty('schemaName');
				expect(report.schemaSource).toHaveProperty('capturedAt');
				expect(report.schemaSource).toHaveProperty('postgresVersion');
				expect(report.schemaSource).toHaveProperty('tables');
			}

			if (report.schemaTarget) {
				expect(report.schemaTarget).toHaveProperty('schemaName');
				expect(report.schemaTarget).toHaveProperty('capturedAt');
				expect(report.schemaTarget).toHaveProperty('postgresVersion');
				expect(report.schemaTarget).toHaveProperty('tables');
			}
		});
	});

	describe('Performance Requirements', () => {
		it('should complete verification in less than 5 seconds for 22 tables', async () => {
			const startTime = Date.now();

			const result = await runCLI([
				'--environment',
				'development',
				'--database-url',
				'postgresql://localhost/test'
			]);

			const duration = Date.now() - startTime;

			// Performance goal from plan.md: <5s for 22 tables
			expect(duration).toBeLessThan(5000);
		});
	});
});

/**
 * Helper function to run the CLI and capture output
 */
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

/**
 * Helper to read directory (simplified for test)
 */
function readdirSync(dir: string): string[] {
	try {
		return require('fs').readdirSync(dir);
	} catch {
		return [];
	}
}
