#!/usr/bin/env node
/**
 * verify-schema CLI (T026)
 *
 * Compares database schema against version control (init script + migrations).
 * Generates verification report with verdict: PASS/WARN/FAIL/ERROR.
 *
 * Usage:
 *   tsx scripts/db/verify-schema.ts --environment development --database-url $DATABASE_URL
 */

import { Command } from 'commander';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { captureSchema, loadSchemaFromFile } from './lib/capture-schema';
import { compareSchemas } from './lib/diff';
import { generateDetailedReport } from './lib/diff/summary';
import type { VerificationReport, Environment } from './types/verification';
import { getExitCode, determineVerdict } from './types/verification';
import chalk from 'chalk';
import ora from 'ora';

interface VerifyOptions {
	environment: Environment;
	databaseUrl: string;
	schemaName: string;
	migrationsPath: string;
	initScriptPath: string;
	outputFormat: 'json' | 'markdown' | 'both';
	outputPath?: string;
	failOnDifferences: boolean;
}

const program = new Command();

program
	.name('verify-schema')
	.description('Verify database schema matches version control')
	.requiredOption(
		'--environment <env>',
		'Environment: development, staging, production',
		'development'
	)
	.requiredOption('--database-url <url>', 'PostgreSQL connection URL', process.env.DATABASE_URL)
	.option('--schema-name <name>', 'PostgreSQL schema to verify', 'hr_public')
	.option('--migrations-path <path>', 'Path to migration files directory', './migrations')
	.option(
		'--init-script-path <path>',
		'Path to initialization script',
		'./migrations/00_init_schema.sql'
	)
	.option('--output-format <format>', 'Output format: json, markdown, both', 'both')
	.option('--output-path <path>', 'Path to write report files', './verification-reports')
	.option('--fail-on-differences', 'Exit with code 1 if differences found', true)
	.parse();

const options = program.opts<VerifyOptions>();

async function main() {
	const startTime = Date.now();
	const spinner = ora('Starting schema verification...').start();

	try {
		// Validate environment
		if (!['development', 'staging', 'production'].includes(options.environment)) {
			spinner.fail(
				chalk.red(
					`Invalid environment: ${options.environment}. Must be one of: development, staging, production`
				)
			);
			process.exit(2);
		}

		// Validate database URL
		if (!options.databaseUrl) {
			spinner.fail(chalk.red('Database URL is required. Provide --database-url or set DATABASE_URL'));
			process.exit(2);
		}

		spinner.text = 'Loading baseline schema from version control...';

		// Load baseline schema from snapshot file
		const baselinePath = join(process.cwd(), 'schema-snapshots', 'baseline-schema.json');

		if (!existsSync(baselinePath)) {
			spinner.fail(chalk.red('Baseline schema snapshot not found!'));
			console.log(chalk.yellow('\nPlease create a baseline snapshot first:'));
			console.log(chalk.gray('  npm run db:snapshot\n'));
			process.exit(2);
		}

		const sourceSchema = await loadSchemaFromFile(baselinePath);

		spinner.text = 'Capturing current schema from live database...';

		const targetSchema = await captureSchema(options.databaseUrl, options.schemaName);

		spinner.text = 'Comparing schemas...';

		const diff = compareSchemas(sourceSchema, targetSchema);

		const executionTimeMs = Date.now() - startTime;

		// Determine verdict based on diff
		const hasCriticalDifferences = diff.summary.missingTables > 0 || diff.summary.extraTables > 0;
		const verdict = determineVerdict(diff, hasCriticalDifferences);

		// Create verification report
		const report: VerificationReport = {
			verificationId: randomUUID(),
			runAt: new Date().toISOString(),
			environment: options.environment,
			schemaSource: sourceSchema,
			schemaTarget: targetSchema,
			diff,
			verdict,
			executionTimeMs,
			recommendedActions: generateRecommendedActions(diff)
		};

		spinner.succeed(chalk.green('Schema verification completed'));

		// Output results
		await outputReport(report, options);

		// Print summary to console
		printSummary(report);

		// Exit with appropriate code
		const exitCode = getExitCode(verdict);

		if (exitCode === 0) {
			console.log(chalk.green('\n✅ PASS: Schema verification successful'));
		} else if (exitCode === 1) {
			if (options.failOnDifferences) {
				console.log(
					chalk.yellow(
						`\n⚠️  ${verdict}: Schema differences detected (${diff.summary.totalDifferences} total)`
					)
				);
			} else {
				console.log(
					chalk.yellow(
						`\n⚠️  ${verdict}: Schema differences detected, but continuing (failOnDifferences=false)`
					)
				);
				process.exit(0);
			}
		} else {
			console.log(chalk.red('\n❌ ERROR: Schema verification failed'));
		}

		process.exit(exitCode);
	} catch (error) {
		spinner.fail(chalk.red('Schema verification failed'));
		console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
		process.exit(2);
	}
}

async function outputReport(report: VerificationReport, options: VerifyOptions) {
	if (!options.outputPath) {
		// Output to stdout only
		if (options.outputFormat === 'json' || options.outputFormat === 'both') {
			console.log(JSON.stringify(report, null, 2));
		}
		return;
	}

	// Ensure output directory exists
	await mkdir(options.outputPath, { recursive: true });

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
	const baseFilename = `verification-${options.environment}-${timestamp}`;

	// Write JSON report
	if (options.outputFormat === 'json' || options.outputFormat === 'both') {
		const jsonPath = join(options.outputPath, `${baseFilename}.json`);
		await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
		console.log(chalk.gray(`\nJSON report written to: ${jsonPath}`));
	}

	// Write Markdown report
	if (options.outputFormat === 'markdown' || options.outputFormat === 'both') {
		const markdownContent = generateDetailedReport(report.diff);
		const mdPath = join(options.outputPath, `${baseFilename}.md`);
		await writeFile(mdPath, markdownContent, 'utf-8');
		console.log(chalk.gray(`Markdown report written to: ${mdPath}`));
	}
}

function printSummary(report: VerificationReport) {
	console.log('\n' + chalk.bold('=== Verification Summary ==='));
	console.log(`Verification ID: ${report.verificationId}`);
	console.log(`Environment: ${report.environment}`);
	console.log(`Verdict: ${getVerdictColor(report.verdict)}`);
	console.log(`Execution Time: ${report.executionTimeMs}ms`);
	console.log(`\nDifferences Found: ${report.diff.summary.totalDifferences}`);

	if (report.diff.hasDifferences) {
		const s = report.diff.summary;
		console.log(chalk.gray('\nBreakdown:'));
		if (s.missingTables > 0) console.log(`  - Missing tables: ${s.missingTables}`);
		if (s.extraTables > 0) console.log(`  - Extra tables: ${s.extraTables}`);
		if (s.modifiedTables > 0) console.log(`  - Modified tables: ${s.modifiedTables}`);
		if (s.missingColumns > 0) console.log(`  - Missing columns: ${s.missingColumns}`);
		if (s.extraColumns > 0) console.log(`  - Extra columns: ${s.extraColumns}`);
		if (s.modifiedColumns > 0) console.log(`  - Modified columns: ${s.modifiedColumns}`);
		if (s.missingIndexes > 0) console.log(`  - Missing indexes: ${s.missingIndexes}`);
		if (s.extraIndexes > 0) console.log(`  - Extra indexes: ${s.extraIndexes}`);
	}

	if (report.recommendedActions.length > 0) {
		console.log(chalk.gray('\nRecommended Actions:'));
		for (const action of report.recommendedActions.slice(0, 5)) {
			const priorityColor = action.priority === 'high' ? chalk.red : chalk.yellow;
			console.log(`  ${priorityColor(`[${action.priority.toUpperCase()}]`)} ${action.action}`);
		}
	}
}

function getVerdictColor(verdict: string): string {
	switch (verdict) {
		case 'PASS':
			return chalk.green(verdict);
		case 'WARN':
			return chalk.yellow(verdict);
		case 'FAIL':
			return chalk.red(verdict);
		case 'ERROR':
			return chalk.red.bold(verdict);
		default:
			return verdict;
	}
}

function generateRecommendedActions(diff: any): any[] {
	const actions: any[] = [];

	// Missing tables (critical)
	for (const tableDiff of diff.tableDiffs.filter((t: any) => t.diffType === 'missing')) {
		actions.push({
			priority: 'high',
			action: `Create missing table: ${tableDiff.tableName}`,
			automatable: true,
			estimatedEffort: '10 minutes'
		});
	}

	// Extra tables (warning)
	for (const tableDiff of diff.tableDiffs.filter((t: any) => t.diffType === 'extra')) {
		actions.push({
			priority: 'medium',
			action: `Review extra table: ${tableDiff.tableName} (may need to be added to version control)`,
			automatable: false,
			estimatedEffort: '5 minutes'
		});
	}

	return actions;
}

main();
