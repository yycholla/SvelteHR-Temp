#!/usr/bin/env node
/**
 * generate-migration CLI (T027)
 *
 * Generates migration files from schema drift detected by verify-schema.
 * Always marks migrations as requiring manual review (FR-024a).
 *
 * Usage:
 *   tsx scripts/db/generate-migration.ts --diff-source report.json --migrations-path ./migrations
 */

import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { SchemaDiff, TableDiff, ColumnDiff } from './types/diff';
import type { RemediationMigration } from './types/migration';
import chalk from 'chalk';
import ora from 'ora';

interface GenerateOptions {
	diffSource: string;
	environment?: 'development' | 'staging' | 'production';
	migrationsPath: string;
	remediationSubdir: string;
	generateRollback: boolean;
	dryRun: boolean;
}

interface GenerationResult {
	migrationsGenerated: number;
	dryRun: boolean;
	files: Array<{
		filename: string;
		filePath?: string;
		reason: string;
		affectedObjects: string[];
		requiresReview: boolean;
		rollbackFile?: string;
		sqlPreview: string;
	}>;
	warnings: string[];
	manualSteps: string[];
}

const program = new Command();

program
	.name('generate-migration')
	.description('Generate migration files from schema drift')
	.requiredOption('--diff-source <path>', 'Path to diff report JSON file')
	.option('--environment <env>', 'Target environment (affects safety checks)', 'development')
	.option('--migrations-path <path>', 'Directory to write migration files', './migrations')
	.option('--remediation-subdir <name>', 'Subdirectory for auto-generated files', 'remediation')
	.option('--generate-rollback', 'Generate corresponding rollback migration', true)
	.option('--dry-run', 'Preview migration without writing files', false)
	.parse();

const options = program.opts<GenerateOptions>();

async function main() {
	const spinner = ora('Loading diff report...').start();

	try {
		// Load diff report
		const diffContent = await readFile(options.diffSource, 'utf-8');
		const diffReport = JSON.parse(diffContent);

		// Extract SchemaDiff from VerificationReport or use directly
		const diff: SchemaDiff = diffReport.diff || diffReport;

		if (!diff.hasDifferences) {
			spinner.fail(chalk.yellow('No differences found - nothing to generate'));
			console.log(
				JSON.stringify({
					migrationsGenerated: 0,
					files: [],
					warnings: ['No differences found in schema diff']
				})
			);
			process.exit(0);
		}

		spinner.text = 'Generating migration files...';

		const result = await generateMigrations(diff, options);

		spinner.succeed(chalk.green(`Generated ${result.migrationsGenerated} migration(s)`));

		// Output JSON result
		console.log(JSON.stringify(result, null, 2));

		// Print summary
		printSummary(result, options);

		process.exit(0);
	} catch (error) {
		spinner.fail(chalk.red('Migration generation failed'));
		console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
		process.exit(2);
	}
}

async function generateMigrations(
	diff: SchemaDiff,
	options: GenerateOptions
): Promise<GenerationResult> {
	const result: GenerationResult = {
		migrationsGenerated: 0,
		dryRun: options.dryRun,
		files: [],
		warnings: [],
		manualSteps: []
	};

	// FR-026: Production safety check
	if (options.environment === 'production') {
		result.warnings.push(
			'Production environment detected - migrations generated but NOT applied (FR-026)'
		);
	}

	// Always require manual review (FR-024a)
	result.warnings.push('Generated migrations require manual review before application (FR-024a)');

	const outputDir = join(options.migrationsPath, options.remediationSubdir);

	// Ensure output directory exists (unless dry run)
	if (!options.dryRun) {
		await mkdir(outputDir, { recursive: true });
	}

	// Generate migration for each table diff
	for (const tableDiff of diff.tableDiffs) {
		const migration = await generateMigrationForTable(tableDiff, diff, options);

		if (migration) {
			const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
			const sequence = String(result.migrationsGenerated + 1).padStart(3, '0');
			const filename = `${timestamp}_${sequence}_${migration.description}.sql`;
			const filePath = join(outputDir, filename);

			// Write forward migration
			if (!options.dryRun) {
				await writeFile(filePath, migration.forwardSql, 'utf-8');
			}

			const fileResult: (typeof result.files)[0] = {
				filename,
				filePath: options.dryRun ? undefined : filePath,
				reason: migration.reason,
				affectedObjects: migration.affectedObjects,
				requiresReview: true, // Always true per FR-024a
				sqlPreview: migration.forwardSql.substring(0, 200) + '...'
			};

			// Write rollback migration if requested and possible
			if (options.generateRollback && migration.rollbackSql) {
				const rollbackFilename = filename.replace('.sql', '.rollback.sql');
				const rollbackPath = join(outputDir, rollbackFilename);

				if (!options.dryRun) {
					await writeFile(rollbackPath, migration.rollbackSql, 'utf-8');
				}

				fileResult.rollbackFile = options.dryRun ? rollbackFilename : rollbackPath;
			} else if (options.generateRollback && !migration.rollbackSql) {
				result.warnings.push(
					`Rollback for ${filename} is not auto-generatable - requires manual creation`
				);
			}

			result.files.push(fileResult);
			result.migrationsGenerated++;
		}
	}

	return result;
}

async function generateMigrationForTable(
	tableDiff: TableDiff,
	diff: SchemaDiff,
	options: GenerateOptions
): Promise<{
	forwardSql: string;
	rollbackSql: string | null;
	reason: string;
	description: string;
	affectedObjects: string[];
} | null> {
	const lines: string[] = [];
	const rollbackLines: string[] = [];
	const affectedObjects: string[] = [];

	let reason = '';
	let description = '';

	// Generate SQL based on diff type
	switch (tableDiff.diffType) {
		case 'missing':
			reason = 'missing_table';
			description = `add_missing_${tableDiff.tableName}_table`;
			affectedObjects.push(tableDiff.tableName);

			lines.push(`-- Missing table: ${tableDiff.tableName}`);
			lines.push(`CREATE TABLE IF NOT EXISTS hr_public.${tableDiff.tableName} (`);
			lines.push('  -- TODO: Add column definitions from source schema');
			lines.push(');');

			rollbackLines.push(`DROP TABLE IF EXISTS hr_public.${tableDiff.tableName};`);
			break;

		case 'extra':
			reason = 'extra_table';
			description = `review_extra_${tableDiff.tableName}_table`;
			affectedObjects.push(tableDiff.tableName);

			lines.push(`-- Extra table detected: ${tableDiff.tableName}`);
			lines.push(`-- WARNING: This table exists in database but not in version control`);
			lines.push(`-- Review and decide: add to version control OR drop from database`);
			lines.push(`-- Uncomment to drop:`);
			lines.push(`-- DROP TABLE IF EXISTS hr_public.${tableDiff.tableName};`);

			// No automatic rollback for table drops
			rollbackLines.push(`-- Cannot auto-generate rollback for table drop`);
			break;

		case 'modified':
			reason = 'modified_table';
			description = `fix_${tableDiff.tableName}_schema`;

			// Generate ALTER statements for column diffs
			for (const colDiff of tableDiff.columnDiffs) {
				affectedObjects.push(`${tableDiff.tableName}.${colDiff.columnName}`);

				switch (colDiff.diffType) {
					case 'missing':
						lines.push(
							`ALTER TABLE hr_public.${tableDiff.tableName} ADD COLUMN ${colDiff.columnName} TEXT; -- TODO: Update type`
						);
						rollbackLines.push(
							`ALTER TABLE hr_public.${tableDiff.tableName} DROP COLUMN ${colDiff.columnName};`
						);
						break;

					case 'extra':
						lines.push(
							`-- Extra column: ${colDiff.columnName} - review and decide to keep or drop`
						);
						lines.push(
							`-- ALTER TABLE hr_public.${tableDiff.tableName} DROP COLUMN ${colDiff.columnName};`
						);
						break;

					case 'type_mismatch':
						lines.push(
							`-- Type mismatch: ${colDiff.columnName} (${colDiff.sourceValue} → ${colDiff.targetValue})`
						);
						lines.push(
							`ALTER TABLE hr_public.${tableDiff.tableName} ALTER COLUMN ${colDiff.columnName} TYPE ${colDiff.sourceValue};`
						);
						break;

					case 'nullability_mismatch':
						const setOrDrop =
							colDiff.sourceValue === 'NOT NULL' ? 'SET NOT NULL' : 'DROP NOT NULL';
						lines.push(
							`ALTER TABLE hr_public.${tableDiff.tableName} ALTER COLUMN ${colDiff.columnName} ${setOrDrop};`
						);
						break;
				}
			}

			// Add index diffs
			for (const idxDiff of tableDiff.indexDiffs) {
				if (idxDiff.diffType === 'missing') {
					lines.push(`-- Missing index: ${idxDiff.indexName}`);
					lines.push(`-- ${idxDiff.sourceDefinition}`);
				} else if (idxDiff.diffType === 'extra') {
					lines.push(`DROP INDEX IF EXISTS hr_public.${idxDiff.indexName};`);
				}
			}
			break;
	}

	if (lines.length === 0) {
		return null;
	}

	// Build complete migration with header
	const header = [
		`-- Migration: [AUTO-GENERATED] ${description}`,
		`-- Created: ${new Date().toISOString()}`,
		`-- Source: Schema drift detection`,
		`-- Affected: ${affectedObjects.join(', ')}`,
		`-- Reason: ${reason}`,
		`-- Requires Review: YES (FR-024a)`,
		`--`,
		`-- WARNING: This migration was auto-generated from schema drift.`,
		`-- Review carefully before applying to ensure correctness.`,
		``
	];

	const forwardSql = [...header, 'BEGIN;', '', ...lines, '', 'COMMIT;'].join('\n');

	const rollbackSql =
		rollbackLines.length > 0
			? [...header, 'BEGIN;', '', ...rollbackLines, '', 'COMMIT;'].join('\n')
			: null;

	return {
		forwardSql,
		rollbackSql,
		reason,
		description,
		affectedObjects
	};
}

function printSummary(result: GenerationResult, options: GenerateOptions) {
	console.log('\n' + chalk.bold('=== Migration Generation Summary ==='));
	console.log(`Migrations Generated: ${result.migrationsGenerated}`);
	console.log(`Dry Run: ${result.dryRun ? 'Yes' : 'No'}`);

	if (result.files.length > 0) {
		console.log(chalk.gray('\nGenerated Files:'));
		for (const file of result.files) {
			console.log(`  - ${file.filename} (${file.reason})`);
			console.log(chalk.gray(`    Affected: ${file.affectedObjects.join(', ')}`));
			if (file.rollbackFile) {
				console.log(chalk.gray(`    Rollback: ${file.rollbackFile}`));
			}
		}
	}

	if (result.warnings.length > 0) {
		console.log(chalk.yellow('\nWarnings:'));
		for (const warning of result.warnings) {
			console.log(chalk.yellow(`  ⚠️  ${warning}`));
		}
	}

	if (result.manualSteps.length > 0) {
		console.log(chalk.cyan('\nManual Steps Required:'));
		for (const step of result.manualSteps) {
			console.log(chalk.cyan(`  📝 ${step}`));
		}
	}
}

main();
