#!/usr/bin/env node

/**
 * Sample Data CLI Entry Point
 *
 * Main entry point for the sample data CLI tool.
 * Registers all commands and handles CLI argument parsing.
 */

import { Command } from 'commander';
import { CLICommandRegistry } from './CLICommandRegistry';
import { GenerateCommand } from './commands/GenerateCommand';
import { CleanCommand } from './commands/CleanCommand';
import { ValidateCommand } from './commands/ValidateCommand';
import { StatusCommand } from './commands/StatusCommand';
import {
  OutputFormat,
  LogLevel,
  formatCLIResult,
  createDefaultCLIOptions
} from '../models/CLIInterface';

/**
 * Main CLI application.
 */
async function main() {
  const program = new Command();

  program
    .name('sample-data')
    .description('Sample data generation and management CLI')
    .version('1.0.0');

  // Create command registry
  const registry = new CLICommandRegistry();

  // Register commands
  registry.register(new GenerateCommand());
  registry.register(new CleanCommand());
  registry.register(new ValidateCommand());
  registry.register(new StatusCommand());

  // Create commander program with all registered commands
  for (const cliCommand of registry.list()) {
    // Build command signature with arguments
    let commandSignature = cliCommand.name;
    for (const arg of cliCommand.arguments) {
      if (arg.required) {
        commandSignature += ` <${arg.name}>`;
      } else {
        commandSignature += ` [${arg.name}]`;
      }
    }

    const cmd = program
      .command(commandSignature)
      .description(cliCommand.description);

    // Add aliases
    if (cliCommand.aliases) {
      for (const alias of cliCommand.aliases) {
        cmd.alias(alias);
      }
    }

    // Add common options
    cmd
      .option('--format <format>', 'Output format (json, table, minimal)', 'json')
      .option('--verbose', 'Enable verbose output', false)
      .option('--dry-run', 'Dry run mode (no changes made)', false)
      .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info');

    // Add examples to help
    if (cliCommand.examples) {
      cmd.addHelpText('after', '\nExamples:\n' + cliCommand.examples.map(ex => `  $ ${ex}`).join('\n'));
    }

    // Add long description
    if (cliCommand.longDescription) {
      cmd.addHelpText('before', '\n' + cliCommand.longDescription + '\n');
    }

    // Add action handler
    cmd.action(async (...args) => {
      try {
        // Extract options from last argument
        const options = args[args.length - 1];

        // Extract actual arguments (everything except last element and command object)
        const actualArgs = args.slice(0, -2);

        // Build CLI options
        const cliOptions = {
          format: (options.format as OutputFormat) || OutputFormat.JSON,
          verbose: options.verbose || false,
          dryRun: options.dryRun || false,
          logLevel: (options.logLevel as LogLevel) || LogLevel.INFO
        };

        // Execute command
        const result = await registry.execute(cliCommand.name, actualArgs, cliOptions);

        // Format and output result
        const formatted = formatCLIResult(result, cliOptions.format);
        console.log(formatted);

        // Exit with appropriate code
        process.exit(result.exitCode || 0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
  }

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
