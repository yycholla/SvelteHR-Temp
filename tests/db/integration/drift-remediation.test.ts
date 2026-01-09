/**
 * Integration Test: Detect Drift → Generate Migration → Apply → Verify PASS
 *
 * Tests the complete workflow from quickstart.md Workflow 2 + 3:
 * - Create database from init script
 * - Manually add column (simulate drift)
 * - Run verify-schema, assert differences detected
 * - Run generate-migration from diff report
 * - Review generated migration file
 * - Apply generated migration
 * - Run verify-schema again, assert PASS
 *
 * This validates the complete drift detection and remediation cycle.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DB_NAME = `hr_test_drift_${Date.now()}`;
const TEST_DB_URL = `postgresql://localhost/${TEST_DB_NAME}`;
const INIT_SCRIPT_PATH = join(process.cwd(), 'migrations/00_init_schema.sql');
const VERIFY_CLI_PATH = join(process.cwd(), 'scripts/db/verify-schema.ts');
const GENERATE_CLI_PATH = join(process.cwd(), 'scripts/db/generate-migration.ts');
const VERIFICATION_REPORTS_DIR = join(process.cwd(), 'verification-reports');
const REMEDIATION_MIGRATIONS_DIR = join(process.cwd(), 'migrations/remediation-test');

describe('Integration: Drift Detection and Remediation', () => {
	let adminClient: Client;
	let testClient: Client;

	beforeAll(async () => {
		// Connect to postgres database
		adminClient = new Client({ connectionString: 'postgresql://localhost/postgres' });
		await adminClient.connect();

		// Create test database
		await adminClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);

		// Initialize test database with init script
		await runCommand('psql', [TEST_DB_URL, '-f', INIT_SCRIPT_PATH]);

		// Connect to test database
		testClient = new Client({ connectionString: TEST_DB_URL });
		await testClient.connect();
	});

	afterAll(async () => {
		await testClient?.end();
		await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
		await adminClient.end();
	});

	beforeEach(() => {
		// Create test directories
		if (!existsSync(VERIFICATION_REPORTS_DIR)) {
			mkdirSync(VERIFICATION_REPORTS_DIR, { recursive: true });
		}
		if (!existsSync(REMEDIATION_MIGRATIONS_DIR)) {
			mkdirSync(REMEDIATION_MIGRATIONS_DIR, { recursive: true });
		}
	});

	afterEach(() => {
		// Clean up test files
		if (existsSync(REMEDIATION_MIGRATIONS_DIR)) {
			rmSync(REMEDIATION_MIGRATIONS_DIR, { recursive: true, force: true });
		}
	});

	it('should detect schema drift when column added manually', async () => {
		// Step 1: Verify initial state (should PASS)
		const initialVerify = await runCommand('tsx', [
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

		expect(initialVerify.exitCode).toBe(0);
		expect(initialVerify.stdout).toContain('PASS');

		// Step 2: Simulate drift - add column manually
		await testClient.query(`
			ALTER TABLE hr_public.events
			ADD COLUMN test_drift_column TEXT;
		`);

		// Step 3: Run verification - should detect drift (WARN/FAIL)
		const driftVerify = await runCommand('tsx', [
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

		expect(driftVerify.exitCode).toBe(1); // WARN or FAIL
		expect(driftVerify.stdout).toMatch(/WARN|FAIL/);

		// Step 4: Verify diff report shows extra column
		const reportFiles = readdirSync(VERIFICATION_REPORTS_DIR).filter((f) => f.endsWith('.json'));
		const latestReport = reportFiles[reportFiles.length - 1];
		const report = JSON.parse(readFileSync(join(VERIFICATION_REPORTS_DIR, latestReport), 'utf-8'));

		expect(report.diff.hasDifferences).toBe(true);
		expect(report.diff.summary.extraColumns).toBeGreaterThan(0);

		// Cleanup drift for next test
		await testClient.query(`
			ALTER TABLE hr_public.events
			DROP COLUMN test_drift_column;
		`);
	});

	it('should generate remediation migration for missing column drift', async () => {
		// Step 1: Simulate drift - add column manually
		await testClient.query(`
			ALTER TABLE hr_public.events
			ADD COLUMN approved_by INTEGER REFERENCES hr_public.users(id);
		`);
		await testClient.query(`
			ALTER TABLE hr_public.events
			ADD COLUMN approved_at TIMESTAMPTZ;
		`);

		// Step 2: Run verification to get diff report
		await runCommand('tsx', [
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

		// Step 3: Get diff report path
		const reportFiles = readdirSync(VERIFICATION_REPORTS_DIR).filter((f) => f.endsWith('.json'));
		const diffReportPath = join(VERIFICATION_REPORTS_DIR, reportFiles[reportFiles.length - 1]);

		// Step 4: Generate remediation migration
		const generateResult = await runCommand('tsx', [
			GENERATE_CLI_PATH,
			'--diff-source',
			diffReportPath,
			'--environment',
			'development',
			'--migrations-path',
			REMEDIATION_MIGRATIONS_DIR,
			'--generate-rollback',
			'true'
		]);

		expect(generateResult.exitCode).toBe(0);

		// Step 5: Verify migration files were generated
		const migrationFiles = readdirSync(REMEDIATION_MIGRATIONS_DIR);
		const forwardMigration = migrationFiles.find(
			(f) => f.endsWith('.sql') && !f.includes('.rollback')
		);
		const rollbackMigration = migrationFiles.find((f) => f.includes('.rollback.sql'));

		expect(forwardMigration).toBeDefined();
		expect(rollbackMigration).toBeDefined();

		// Step 6: Verify migration file has proper naming pattern
		expect(forwardMigration).toMatch(/^\d{8}_\d{3}_[a-z0-9_]+\.sql$/);

		// Step 7: Verify migration file has metadata header
		const migrationContent = readFileSync(
			join(REMEDIATION_MIGRATIONS_DIR, forwardMigration!),
			'utf-8'
		);
		expect(migrationContent).toContain('-- Migration:');
		expect(migrationContent).toContain('-- Created:');
		expect(migrationContent).toContain('-- Source:');
		expect(migrationContent).toContain('-- Affected:');
		expect(migrationContent).toContain('Requires Review: YES');

		// Cleanup
		await testClient.query(`ALTER TABLE hr_public.events DROP COLUMN approved_by;`);
		await testClient.query(`ALTER TABLE hr_public.events DROP COLUMN approved_at;`);
	});

	it('should apply generated migration and achieve PASS verdict', async () => {
		// Step 1: Simulate drift
		await testClient.query(`
			ALTER TABLE hr_public.events
			ADD COLUMN status TEXT DEFAULT 'pending';
		`);

		// Step 2: Generate diff report
		await runCommand('tsx', [
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

		// Step 3: Generate remediation migration
		const reportFiles = readdirSync(VERIFICATION_REPORTS_DIR).filter((f) => f.endsWith('.json'));
		const diffReportPath = join(VERIFICATION_REPORTS_DIR, reportFiles[reportFiles.length - 1]);

		await runCommand('tsx', [
			GENERATE_CLI_PATH,
			'--diff-source',
			diffReportPath,
			'--migrations-path',
			REMEDIATION_MIGRATIONS_DIR
		]);

		// Step 4: Drop the drift column (reset state)
		await testClient.query(`ALTER TABLE hr_public.events DROP COLUMN status;`);

		// Step 5: Apply generated migration
		const migrationFiles = readdirSync(REMEDIATION_MIGRATIONS_DIR);
		const migrationFile = migrationFiles.find(
			(f) => f.endsWith('.sql') && !f.includes('.rollback')
		);
		const migrationPath = join(REMEDIATION_MIGRATIONS_DIR, migrationFile!);

		const applyResult = await runCommand('psql', [TEST_DB_URL, '-f', migrationPath]);
		expect(applyResult.exitCode).toBe(0);

		// Step 6: Verify schema now matches (should PASS)
		const finalVerify = await runCommand('tsx', [
			VERIFY_CLI_PATH,
			'--environment',
			'development',
			'--database-url',
			TEST_DB_URL
		]);

		expect(finalVerify.exitCode).toBe(0);
		expect(finalVerify.stdout).toContain('PASS');
	});

	it('should complete full drift remediation workflow in under 15 seconds', async () => {
		const startTime = Date.now();

		// Full workflow
		await testClient.query(`ALTER TABLE hr_public.events ADD COLUMN workflow_test TEXT;`);
		await runCommand('tsx', [
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

		const reportFiles = readdirSync(VERIFICATION_REPORTS_DIR).filter((f) => f.endsWith('.json'));
		const diffReportPath = join(VERIFICATION_REPORTS_DIR, reportFiles[reportFiles.length - 1]);

		await runCommand('tsx', [
			GENERATE_CLI_PATH,
			'--diff-source',
			diffReportPath,
			'--migrations-path',
			REMEDIATION_MIGRATIONS_DIR
		]);

		const duration = Date.now() - startTime;

		// Performance goal: drift detection + migration generation < 15s
		expect(duration).toBeLessThan(15000);

		// Cleanup
		await testClient.query(`ALTER TABLE hr_public.events DROP COLUMN workflow_test;`);
	});

	it('should generate rollback migration that reverses changes', async () => {
		// Add drift
		await testClient.query(`ALTER TABLE hr_public.tasks ADD COLUMN priority INTEGER;`);

		// Generate migration with rollback
		await runCommand('tsx', [
			VERIFY_CLI_PATH,
			'--database-url',
			TEST_DB_URL,
			'--output-format',
			'json',
			'--output-path',
			VERIFICATION_REPORTS_DIR
		]);

		const reportFiles = readdirSync(VERIFICATION_REPORTS_DIR).filter((f) => f.endsWith('.json'));
		const diffReportPath = join(VERIFICATION_REPORTS_DIR, reportFiles[reportFiles.length - 1]);

		await runCommand('tsx', [
			GENERATE_CLI_PATH,
			'--diff-source',
			diffReportPath,
			'--migrations-path',
			REMEDIATION_MIGRATIONS_DIR,
			'--generate-rollback',
			'true'
		]);

		// Verify rollback migration exists
		const migrationFiles = readdirSync(REMEDIATION_MIGRATIONS_DIR);
		const rollbackFile = migrationFiles.find((f) => f.includes('.rollback.sql'));
		expect(rollbackFile).toBeDefined();

		// Verify rollback content
		const rollbackContent = readFileSync(join(REMEDIATION_MIGRATIONS_DIR, rollbackFile!), 'utf-8');
		expect(rollbackContent).toContain('DROP COLUMN');
		expect(rollbackContent).toContain('priority');

		// Cleanup
		await testClient.query(`ALTER TABLE hr_public.tasks DROP COLUMN priority;`);
	});

	it('should enforce manual review requirement (FR-024a)', async () => {
		// Add drift
		await testClient.query(`ALTER TABLE hr_public.users ADD COLUMN bio TEXT;`);

		// Generate migration
		await runCommand('tsx', [
			VERIFY_CLI_PATH,
			'--database-url',
			TEST_DB_URL,
			'--output-format',
			'json',
			'--output-path',
			VERIFICATION_REPORTS_DIR
		]);

		const reportFiles = readdirSync(VERIFICATION_REPORTS_DIR).filter((f) => f.endsWith('.json'));
		const diffReportPath = join(VERIFICATION_REPORTS_DIR, reportFiles[reportFiles.length - 1]);

		const generateResult = await runCommand('tsx', [
			GENERATE_CLI_PATH,
			'--diff-source',
			diffReportPath,
			'--migrations-path',
			REMEDIATION_MIGRATIONS_DIR
		]);

		// Parse output to verify requiresReview flag
		const output = JSON.parse(generateResult.stdout);
		expect(output.files[0].requiresReview).toBe(true);

		// Verify migration file header
		const migrationFiles = readdirSync(REMEDIATION_MIGRATIONS_DIR);
		const migrationFile = migrationFiles.find(
			(f) => f.endsWith('.sql') && !f.includes('.rollback')
		);
		const content = readFileSync(join(REMEDIATION_MIGRATIONS_DIR, migrationFile!), 'utf-8');
		expect(content).toContain('Requires Review: YES');

		// Cleanup
		await testClient.query(`ALTER TABLE hr_public.users DROP COLUMN bio;`);
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
			resolve({ exitCode: code ?? 1, stdout, stderr });
		});

		proc.on('error', (error) => {
			resolve({ exitCode: 1, stdout, stderr: stderr + error.message });
		});
	});
}
