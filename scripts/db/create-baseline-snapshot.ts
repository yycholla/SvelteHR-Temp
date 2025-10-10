#!/usr/bin/env node
/**
 * create-baseline-snapshot.ts
 *
 * Creates an authoritative baseline schema snapshot from the current database.
 * This snapshot serves as the source of truth for drift detection.
 *
 * Usage:
 *   npm run db:snapshot
 *   tsx scripts/db/create-baseline-snapshot.ts --database-url $DATABASE_URL
 */

import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { captureSchema } from './lib/capture-schema';
import chalk from 'chalk';
import ora from 'ora';

interface SnapshotOptions {
	databaseUrl: string;
	schemaName: string;
	outputPath: string;
}

const program = new Command();

program
	.name('create-baseline-snapshot')
	.description('Create baseline schema snapshot from current database')
	.option(
		'--database-url <url>',
		'PostgreSQL connection URL',
		process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5433/hr_system'
	)
	.option('--schema-name <name>', 'PostgreSQL schema to snapshot', 'hr_public')
	.option('--output-path <path>', 'Output directory for snapshot', './schema-snapshots')
	.parse();

const options = program.opts<SnapshotOptions>();

async function main() {
	const spinner = ora('Creating baseline schema snapshot...').start();

	try {
		// Validate database URL
		if (!options.databaseUrl) {
			spinner.fail(chalk.red('Database URL is required'));
			console.log(
				chalk.yellow('\nProvide --database-url or set DATABASE_URL environment variable')
			);
			process.exit(1);
		}

		spinner.text = 'Capturing schema from database...';

		// Capture current schema
		const schema = await captureSchema(options.databaseUrl, options.schemaName);

		// Ensure output directory exists
		await mkdir(options.outputPath, { recursive: true });

		// Write baseline snapshot
		const snapshotPath = join(options.outputPath, 'baseline-schema.json');
		await writeFile(snapshotPath, JSON.stringify(schema, null, 2), 'utf-8');

		spinner.succeed(chalk.green('Baseline snapshot created successfully'));

		// Print summary
		console.log('\n' + chalk.bold('=== Snapshot Summary ==='));
		console.log(`Schema: ${schema.schemaName}`);
		console.log(`Captured: ${schema.capturedAt}`);
		console.log(`Tables: ${schema.tables.length}`);
		console.log(`Output: ${snapshotPath}`);

		console.log(chalk.gray('\nNext steps:'));
		console.log(chalk.gray('1. Review the snapshot file'));
		console.log(chalk.gray('2. Commit to version control:'));
		console.log(chalk.gray(`   git add ${snapshotPath}`));
		console.log(chalk.gray('   git commit -m "feat: add baseline schema snapshot"'));
		console.log(chalk.gray('3. Run drift detection:'));
		console.log(chalk.gray('   npm run db:verify'));

		process.exit(0);
	} catch (error) {
		spinner.fail(chalk.red('Failed to create baseline snapshot'));
		console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
		process.exit(1);
	}
}

main();
