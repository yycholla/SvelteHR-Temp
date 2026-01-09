#!/usr/bin/env node
/**
 * Schema Validator CLI
 * Main entry point for command-line interface
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { validateCommand } from './commands/validate.js';
import { initCommand } from './commands/init.js';
import { checkCommand } from './commands/check.js';
import { reportCommand } from './commands/report.js';
import { computeCommand } from './commands/compute.js';
import { cacheCommand } from './commands/cache.js';
import { historyCommand } from './commands/history.js';
/**
 * Get package version
 */
async function getVersion() {
  try {
    const packageJson = await readFile(join(process.cwd(), 'package.json'), 'utf-8');
    const pkg = JSON.parse(packageJson);
    return pkg.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}
/**
 * Main CLI function
 */
async function main() {
  const version = await getVersion();
  const program = new Command();
  program
    .name('schema-validator')
    .description('Frontend-Backend GraphQL API Schema Alignment Validation Tool')
    .version(version)
    .option('-v, --verbose', 'Enable verbose output', false);
  // Validate command
  program
    .command('validate')
    .description('Validate schema alignment between GraphQL operations, database, and API')
    .option('-c, --config <path>', 'Path to configuration file', './schema-validator.config.json')
    .option('--full', 'Run full validation without cache', false)
    .option('--staged', 'Validate only staged files (for pre-commit hook)', false)
    .option('--json', 'Output JSON instead of terminal format', false)
    .option('--no-cache', 'Skip cache usage', false)
    .option('--filter-field <pattern>', 'Filter by field path pattern')
    .option('--filter-type <pattern>', 'Filter by type name')
    .option('--filter-page <pattern>', 'Filter by page/file pattern')
    .action(validateCommand);
  // Init command
  program
    .command('init')
    .description('Initialize schema validator configuration')
    .option('-c, --config <path>', 'Path to configuration file', './schema-validator.config.json')
    .option('--install-hooks', 'Install pre-commit hooks', false)
    .option('--cache-dir <path>', 'Cache directory path', '.schema-cache')
    .option('--custom-dir <path>', 'Custom configuration directory')
    .action(initCommand);
  // Check command
  program
    .command('check')
    .description('Quick status check using cached validation results')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--field <pattern>', 'Filter by field path')
    .option('--type <pattern>', 'Filter by type name')
    .option('--page <pattern>', 'Filter by page/file')
    .action(checkCommand);
  // Report command
  program
    .command('report')
    .description('Generate alignment report in various formats')
    .option('-c, --config <path>', 'Path to configuration file', './schema-validator.config.json')
    .option('-f, --format <format>', 'Report format: markdown, json, html, terminal', 'terminal')
    .option('--filter <type>', 'Filter by misalignment type: field, type, page')
    .option('-o, --output <path>', 'Output file path (default: stdout)')
    .option('--errors-only', 'Include only errors, exclude warnings', false)
    .action(reportCommand);
  // Compute commands (for computed fields)
  const computeCmd = program.command('compute').description('Manage computed field configurations');
  computeCmd
    .command('add <fieldPath>')
    .description('Add a computed field configuration')
    .requiredOption('--source-columns <columns>', 'Comma-separated source columns')
    .requiredOption('--resolver <location>', 'Resolver location (file:line)')
    .requiredOption('--description <desc>', 'Field description')
    .option('--return-type <type>', 'GraphQL return type', 'String')
    .action(computeCommand.add);
  computeCmd
    .command('list')
    .description('List all computed field configurations')
    .option('--json', 'Output as JSON', false)
    .action(computeCommand.list);
  // Cache commands
  const cacheCmd = program.command('cache').description('Manage validation cache');
  cacheCmd
    .command('clear')
    .description('Clear validation cache')
    .option('-c, --config <path>', 'Path to configuration file', './schema-validator.config.json')
    .option('--all', 'Clear all cache types', false)
    .option('--database', 'Clear database cache only', false)
    .option('--api', 'Clear API cache only', false)
    .option('--operations', 'Clear operations cache only', false)
    .action(cacheCommand.clear);
  cacheCmd
    .command('stats')
    .description('Show cache statistics')
    .option('-c, --config <path>', 'Path to configuration file', './schema-validator.config.json')
    .action(cacheCommand.stats);
  // History command
  program
    .command('history')
    .description('Show validation run history')
    .option('--limit <n>', 'Limit number of results', '10')
    .option('--format <format>', 'Output format: table, json', 'table')
    .action(historyCommand);
  // Error handling
  program.on('command:*', () => {
    console.error(chalk.red(`\n❌ Unknown command: ${program.args.join(' ')}`));
    console.log(chalk.gray('\nRun with --help to see available commands.\n'));
    process.exit(1);
  });
  // Parse arguments
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
// Run CLI
main().catch((error) => {
  console.error(
    chalk.red('\n❌ Fatal error:'),
    error instanceof Error ? error.message : String(error)
  );
  if (process.env['DEBUG']) {
    console.error(error);
  }
  process.exit(1);
});
//# sourceMappingURL=index.js.map
