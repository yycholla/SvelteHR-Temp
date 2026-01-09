#!/usr/bin/env node
/**
 * validate-migrations CLI (T029)
 *
 * Validates migration files for:
 * - Naming pattern compliance
 * - Sequential ordering
 * - Checksum integrity
 * - SQL syntax
 * - Rollback file existence
 *
 * Usage:
 *   tsx scripts/db/validate-migrations.ts --migrations-path ./migrations
 */

import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';
import { Client } from 'pg';
import {
	validateMigrationFilename,
	parseMigrationFilename,
	type MigrationFile
} from './types/migration';
import chalk from 'chalk';
import ora from 'ora';

interface ValidateOptions {
	migrationsPath: string;
	databaseUrl?: string;
	checkSyntax: boolean;
	checkRollbacks: boolean;
	strict: boolean;
}

interface ValidationError {
	code: string;
	migration: string;
	message: string;
	expectedPattern?: string;
	conflictingMigration?: string;
	expectedChecksum?: string;
	actualChecksum?: string;
}

interface ValidationWarning {
	code: string;
	migration: string;
	message: string;
}

interface ValidationResult {
	valid: boolean;
	migrationsChecked: number;
	errors: ValidationError[];
	warnings: ValidationWarning[];
	summary: {
		totalErrors: number;
		totalWarnings: number;
	};
	checksPerformed: string[];
}

const program = new Command();

program
	.name('validate-migrations')
	.description('Validate migration files for consistency and correctness')
	.option('--migrations-path <path>', 'Path to migration files directory', './migrations')
	.option(
		'--database-url <url>',
		'PostgreSQL connection URL for checksum validation',
		process.env.DATABASE_URL
	)
	.option('--check-syntax', 'Validate SQL syntax (requires database connection)', false)
	.option('--check-rollbacks', 'Check for rollback file existence', false)
	.option('--strict', 'Treat warnings as errors', false)
	.parse();

const options = program.opts<ValidateOptions>();

async function main() {
	const spinner = ora('Starting migration validation...').start();

	try {
		spinner.text = 'Reading migration files...';

		const migrationFiles = await getMigrationFiles(options.migrationsPath);

		spinner.text = `Validating ${migrationFiles.length} migrations...`;

		const result = await validateMigrations(migrationFiles, options);

		if (result.valid) {
			spinner.succeed(chalk.green('All migrations valid'));
		} else {
			spinner.fail(chalk.red(`Validation failed with ${result.errors.length} error(s)`));
		}

		// Output JSON result
		console.log(JSON.stringify(result, null, 2));

		printSummary(result);

		// Exit with appropriate code
		const exitCode = result.valid ? 0 : 1;
		process.exit(exitCode);
	} catch (error) {
		spinner.fail(chalk.red('Migration validation failed'));
		console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
		process.exit(2);
	}
}

async function getMigrationFiles(migrationsPath: string): Promise<string[]> {
	const files = await readdir(migrationsPath);

	return files
		.filter((f) => f.endsWith('.sql') && !f.endsWith('.rollback.sql') && f !== '00_init_schema.sql')
		.sort();
}

async function validateMigrations(
	files: string[],
	options: ValidateOptions
): Promise<ValidationResult> {
	const result: ValidationResult = {
		valid: true,
		migrationsChecked: files.length,
		errors: [],
		warnings: [],
		summary: {
			totalErrors: 0,
			totalWarnings: 0
		},
		checksPerformed: []
	};

	// Check 1: Naming pattern validation
	result.checksPerformed.push('Naming pattern validation');
	for (const file of files) {
		if (!validateMigrationFilename(file)) {
			result.errors.push({
				code: 'INVALID_NAMING',
				migration: file,
				message: `Invalid migration filename pattern`,
				expectedPattern: '^\\d{8}_\\d{3}_[a-z0-9_]+\\.sql$'
			});
		}
	}

	// Check 2: Sequential ordering validation (per-date)
	result.checksPerformed.push('Sequential ordering validation (per-date)');
	// Group sequences by date: Map<timestamp, Map<sequence, filename>>
	const sequencesByDate: Map<string, Map<number, string>> = new Map();

	for (const file of files) {
		const parsed = parseMigrationFilename(file);
		if (parsed) {
			// Get or create the sequence map for this date
			if (!sequencesByDate.has(parsed.timestamp)) {
				sequencesByDate.set(parsed.timestamp, new Map());
			}
			const dateSequences = sequencesByDate.get(parsed.timestamp)!;

			// Check for duplicate sequences within the same date
			if (dateSequences.has(parsed.sequence)) {
				result.errors.push({
					code: 'DUPLICATE_SEQUENCE',
					migration: file,
					message: `Duplicate sequence number ${parsed.sequence} on ${parsed.timestamp}`,
					conflictingMigration: dateSequences.get(parsed.sequence)
				});
			} else {
				dateSequences.set(parsed.sequence, file);
			}
		}
	}

	// Check for sequence gaps within each date
	for (const [date, dateSequences] of sequencesByDate.entries()) {
		const sortedSequences = Array.from(dateSequences.keys()).sort((a, b) => a - b);
		for (let i = 1; i < sortedSequences.length; i++) {
			const prev = sortedSequences[i - 1];
			const curr = sortedSequences[i];
			const gap = curr - prev;

			if (gap > 5) {
				result.warnings.push({
					code: 'SEQUENCE_GAP',
					migration: dateSequences.get(curr)!,
					message: `Large sequence gap on ${date}: ${prev} → ${curr} (gap of ${gap - 1})`
				});
			}
		}
	}

	// Check 3: Checksum integrity (if database URL provided)
	if (options.databaseUrl) {
		result.checksPerformed.push('Checksum integrity validation');
		const checksumErrors = await validateChecksums(files, options);
		result.errors.push(...checksumErrors);
	}

	// Check 4: SQL syntax validation (if requested)
	if (options.checkSyntax && options.databaseUrl) {
		result.checksPerformed.push('SQL syntax validation');
		const syntaxErrors = await validateSqlSyntax(files, options);
		result.errors.push(...syntaxErrors);
	}

	// Check 5: Rollback file existence (if requested)
	if (options.checkRollbacks) {
		result.checksPerformed.push('Rollback file existence check');
		const rollbackWarnings = await validateRollbackFiles(files, options);
		result.warnings.push(...rollbackWarnings);
	}

	// Calculate summary
	result.summary.totalErrors = result.errors.length;
	result.summary.totalWarnings = result.warnings.length;

	// In strict mode, warnings count as errors
	if (options.strict && result.warnings.length > 0) {
		result.valid = false;
	} else {
		result.valid = result.errors.length === 0;
	}

	return result;
}

async function validateChecksums(
	files: string[],
	options: ValidateOptions
): Promise<ValidationError[]> {
	const errors: ValidationError[] = [];

	try {
		const client = new Client({ connectionString: options.databaseUrl });
		await client.connect();

		// Check if schema_migrations table exists
		const tableExists = await client.query(`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = 'hr_public'
				AND table_name = 'schema_migrations'
			) as exists
		`);

		if (!tableExists.rows[0].exists) {
			await client.end();
			return errors; // No table, skip checksum validation
		}

		// Get applied migrations
		const appliedResult = await client.query(`
			SELECT filename, checksum
			FROM hr_public.schema_migrations
			WHERE success = true
		`);

		const appliedMigrations = new Map(appliedResult.rows.map((r) => [r.filename, r.checksum]));

		// Validate checksums
		for (const file of files) {
			if (appliedMigrations.has(file)) {
				const expectedChecksum = appliedMigrations.get(file)!;
				const filePath = join(options.migrationsPath, file);
				const content = await readFile(filePath, 'utf-8');
				const actualChecksum = createHash('sha256').update(content).digest('hex');

				if (expectedChecksum !== actualChecksum) {
					errors.push({
						code: 'CHECKSUM_MISMATCH',
						migration: file,
						message: 'Migration file has been modified after application',
						expectedChecksum,
						actualChecksum
					});
				}
			}
		}

		await client.end();
	} catch (error) {
		// If database connection fails, skip checksum validation
		console.warn(chalk.yellow('Warning: Could not connect to database for checksum validation'));
	}

	return errors;
}

async function validateSqlSyntax(
	files: string[],
	options: ValidateOptions
): Promise<ValidationError[]> {
	const errors: ValidationError[] = [];

	try {
		const client = new Client({ connectionString: options.databaseUrl });
		await client.connect();

		for (const file of files) {
			const filePath = join(options.migrationsPath, file);
			const content = await readFile(filePath, 'utf-8');

			try {
				// Validate SQL syntax using EXPLAIN
				await client.query(`EXPLAIN ${content}`);
			} catch (error: any) {
				errors.push({
					code: 'SQL_SYNTAX_ERROR',
					migration: file,
					message: `SQL syntax error: ${error.message}`
				});
			}
		}

		await client.end();
	} catch (error) {
		console.warn(chalk.yellow('Warning: Could not connect to database for syntax validation'));
	}

	return errors;
}

async function validateRollbackFiles(
	files: string[],
	options: ValidateOptions
): Promise<ValidationWarning[]> {
	const warnings: ValidationWarning[] = [];

	for (const file of files) {
		const rollbackFile = file.replace('.sql', '.rollback.sql');
		const rollbackPath = join(options.migrationsPath, rollbackFile);

		try {
			await readFile(rollbackPath);
		} catch (error) {
			warnings.push({
				code: 'MISSING_ROLLBACK',
				migration: file,
				message: `Missing rollback file: ${rollbackFile}`
			});
		}
	}

	return warnings;
}

function printSummary(result: ValidationResult) {
	console.log('\n' + chalk.bold('=== Validation Summary ==='));
	console.log(`Migrations Checked: ${result.migrationsChecked}`);
	console.log(`Valid: ${result.valid ? chalk.green('Yes') : chalk.red('No')}`);
	console.log(`Errors: ${result.summary.totalErrors}`);
	console.log(`Warnings: ${result.summary.totalWarnings}`);

	if (result.checksPerformed.length > 0) {
		console.log(chalk.gray('\nChecks Performed:'));
		for (const check of result.checksPerformed) {
			console.log(chalk.gray(`  - ${check}`));
		}
	}

	if (result.errors.length > 0) {
		console.log(chalk.red('\nErrors:'));
		for (const error of result.errors) {
			console.log(chalk.red(`  [${error.code}] ${error.migration}: ${error.message}`));
		}
	}

	if (result.warnings.length > 0) {
		console.log(chalk.yellow('\nWarnings:'));
		for (const warning of result.warnings) {
			console.log(chalk.yellow(`  [${warning.code}] ${warning.migration}: ${warning.message}`));
		}
	}
}

main();
