#!/usr/bin/env node
/**
 * rebuild-init-script CLI (T028)
 *
 * Rebuilds initialization script from cumulative migrations.
 * Validates that init script = sum of all migrations (FR-002).
 *
 * Usage:
 *   tsx scripts/db/rebuild-init-script.ts --migrations-path ./migrations --init-script-path ./migrations/00_init_schema.sql
 */

import { Command } from 'commander';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Client } from 'pg';
import { spawn } from 'child_process';
import { captureSchema } from './lib/capture-schema';
import { compareSchemas } from './lib/diff';
import chalk from 'chalk';
import ora from 'ora';

interface RebuildOptions {
	migrationsPath: string;
	initScriptPath: string;
	validate: boolean;
	cleanDatabase: boolean;
	databaseUrl?: string;
}

interface RebuildResult {
	success: boolean;
	tempDatabaseName: string;
	migrationsApplied: number;
	tablesCreated: number;
	validationPassed?: boolean;
	executionTimeMs: number;
}

const program = new Command();

program
	.name('rebuild-init-script')
	.description('Rebuild initialization script from cumulative migrations')
	.option('--migrations-path <path>', 'Path to migration files directory', './migrations')
	.option(
		'--init-script-path <path>',
		'Path to write init script',
		'./migrations/00_init_schema.sql'
	)
	.option('--validate', 'Validate that init script equals migrations', false)
	.option('--clean-database', 'Drop temporary database after completion', true)
	.option(
		'--database-url <url>',
		'PostgreSQL connection URL for validation',
		process.env.DATABASE_URL
	)
	.parse();

const options = program.opts<RebuildOptions>();

async function main() {
	const startTime = Date.now();
	const spinner = ora('Starting init script rebuild...').start();

	let tempDbName: string | null = null;

	try {
		// Generate unique temporary database name
		const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
		tempDbName = `hr_temp_${timestamp}`;

		spinner.text = `Creating temporary database: ${tempDbName}...`;

		// Create temporary database
		await createTempDatabase(tempDbName);

		spinner.text = 'Reading migration files...';

		// Get all migration files (exclude rollback files and init script)
		const migrationFiles = await getMigrationFiles(options.migrationsPath);

		spinner.text = `Applying ${migrationFiles.length} migrations...`;

		// Apply all migrations sequentially
		const tempDbUrl = `postgresql://localhost/${tempDbName}`;
		await applyMigrations(tempDbUrl, migrationFiles);

		spinner.text = 'Exporting schema...';

		// Export schema using pg_dump
		const schemaDump = await exportSchema(tempDbName);

		spinner.text = 'Generating init script...';

		// Format and write init script
		const initScript = formatInitScript(schemaDump, migrationFiles.length);
		await writeFile(options.initScriptPath, initScript, 'utf-8');

		spinner.text = 'Counting tables...';

		// Count tables created
		const tableCount = await countTables(tempDbUrl);

		let validationPassed: boolean | undefined = undefined;

		// Validate if requested
		if (options.validate && options.databaseUrl) {
			spinner.text = 'Validating init script equivalence...';
			validationPassed = await validateInitScript(
				options.initScriptPath,
				migrationFiles,
				tempDbName
			);

			if (validationPassed) {
				spinner.succeed(chalk.green('Init script rebuild and validation SUCCESS'));
			} else {
				spinner.fail(chalk.red('Init script rebuild succeeded but validation FAILED'));
			}
		} else {
			spinner.succeed(chalk.green('Init script rebuild completed'));
		}

		const executionTimeMs = Date.now() - startTime;

		const result: RebuildResult = {
			success: validationPassed === undefined ? true : validationPassed,
			tempDatabaseName: tempDbName,
			migrationsApplied: migrationFiles.length,
			tablesCreated: tableCount,
			validationPassed,
			executionTimeMs
		};

		// Clean up temporary database if requested
		if (options.cleanDatabase && tempDbName) {
			spinner.text = 'Cleaning up temporary database...';
			await dropTempDatabase(tempDbName);
		}

		// Output JSON result
		console.log(JSON.stringify(result, null, 2));

		printSummary(result, options);

		process.exit(result.success ? 0 : 1);
	} catch (error) {
		spinner.fail(chalk.red('Init script rebuild failed'));
		console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);

		// Cleanup on error
		if (tempDbName && options.cleanDatabase) {
			try {
				await dropTempDatabase(tempDbName);
			} catch (cleanupError) {
				// Ignore cleanup errors
			}
		}

		process.exit(2);
	}
}

async function createTempDatabase(dbName: string): Promise<void> {
	const adminClient = new Client({ connectionString: 'postgresql://localhost/postgres' });
	await adminClient.connect();
	await adminClient.query(`CREATE DATABASE ${dbName}`);
	await adminClient.end();
}

async function dropTempDatabase(dbName: string): Promise<void> {
	const adminClient = new Client({ connectionString: 'postgresql://localhost/postgres' });
	await adminClient.connect();
	await adminClient.query(`DROP DATABASE IF EXISTS ${dbName}`);
	await adminClient.end();
}

async function getMigrationFiles(migrationsPath: string): Promise<string[]> {
	const files = await readdir(migrationsPath);

	return files
		.filter((f) => f.match(/^\d{8}_\d{3}_[a-z0-9_]+\.sql$/) && f !== '00_init_schema.sql')
		.sort();
}

async function applyMigrations(dbUrl: string, migrationFiles: string[]): Promise<void> {
	for (const file of migrationFiles) {
		const filePath = join(options.migrationsPath, file);
		await runPsql(dbUrl, filePath);
	}
}

async function exportSchema(dbName: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn('pg_dump', [
			'--schema-only',
			'--no-owner',
			'--no-privileges',
			'--schema=hr_public',
			dbName
		]);

		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		proc.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`pg_dump failed: ${stderr}`));
			} else {
				resolve(stdout);
			}
		});
	});
}

function formatInitScript(schemaDump: string, migrationCount: number): string {
	const header = [
		'/**',
		' * SvelteHR Database Initialization Script',
		` * Generated: ${new Date().toISOString()}`,
		` * From: ${migrationCount} sequential migrations`,
		' *',
		' * DO NOT EDIT MANUALLY - This file is auto-generated',
		' * To update: Run `npm run db:rebuild-init`',
		' */',
		''
	].join('\n');

	// Clean schema dump (remove version comments, normalize whitespace)
	const cleanedDump = schemaDump
		.split('\n')
		.filter((line) => !line.startsWith('--') || line.includes('Name:') || line.includes('Type:'))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n');

	return header + '\n' + cleanedDump;
}

async function countTables(dbUrl: string): Promise<number> {
	const client = new Client({ connectionString: dbUrl });
	await client.connect();

	const result = await client.query(`
		SELECT COUNT(*) as count
		FROM information_schema.tables
		WHERE table_schema = 'hr_public'
	`);

	await client.end();

	return parseInt(result.rows[0].count, 10);
}

async function validateInitScript(
	initScriptPath: string,
	migrationFiles: string[],
	tempDbName: string
): Promise<boolean> {
	// Create second temp database and apply init script
	const validationDbName = `${tempDbName}_validation`;
	await createTempDatabase(validationDbName);

	try {
		const validationDbUrl = `postgresql://localhost/${validationDbName}`;
		await runPsql(validationDbUrl, initScriptPath);

		// Capture schemas from both databases
		const migrationsSchema = await captureSchema(
			`postgresql://localhost/${tempDbName}`,
			'hr_public'
		);
		const initScriptSchema = await captureSchema(validationDbUrl, 'hr_public');

		// Compare schemas
		const diff = compareSchemas(migrationsSchema, initScriptSchema);

		// Cleanup validation database
		await dropTempDatabase(validationDbName);

		// Schemas must be identical
		return !diff.hasDifferences;
	} catch (error) {
		await dropTempDatabase(validationDbName);
		throw error;
	}
}

async function runPsql(dbUrl: string, filePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn('psql', [dbUrl, '-f', filePath]);

		let stderr = '';

		proc.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`psql failed for ${filePath}: ${stderr}`));
			} else {
				resolve();
			}
		});
	});
}

function printSummary(result: RebuildResult, options: RebuildOptions) {
	console.log('\n' + chalk.bold('=== Rebuild Init Script Summary ==='));
	console.log(`Success: ${result.success ? chalk.green('Yes') : chalk.red('No')}`);
	console.log(`Migrations Applied: ${result.migrationsApplied}`);
	console.log(`Tables Created: ${result.tablesCreated}`);
	console.log(`Execution Time: ${result.executionTimeMs}ms`);

	if (result.validationPassed !== undefined) {
		const status = result.validationPassed ? chalk.green('PASSED') : chalk.red('FAILED');
		console.log(`Validation: ${status}`);
	}

	if (options.cleanDatabase) {
		console.log(chalk.gray(`\nTemporary database cleaned up: ${result.tempDatabaseName}`));
	} else {
		console.log(chalk.gray(`\nTemporary database preserved: ${result.tempDatabaseName}`));
	}

	console.log(chalk.gray(`\nInit script written to: ${options.initScriptPath}`));
}

main();
