/**
 * Validate Command
 *
 * CLI command for validating sample data configuration.
 */

import {
  CLICommand,
  CLIOptions,
  CLIResult,
  OutputFormat,
  createSuccessResult,
  createErrorResult,
  createDefaultCLIOptions
} from '../../models/CLIInterface';
import { ConfigurationService } from '../../services/ConfigurationService';

/**
 * Validate configuration command.
 */
export class ValidateCommand implements CLICommand {
  name = 'validate-config';
  description = 'Validate sample data configuration file';
  aliases = ['validate', 'check'];

  arguments = [
    {
      name: 'configPath',
      description: 'Path to configuration file',
      required: true,
      type: 'string' as const
    }
  ];

  options = createDefaultCLIOptions();

  examples = [
    'validate-config ./backend/config/sample-data.json',
    'validate-config ./custom-config.json --verbose',
    'validate-config ./config.json --format json'
  ];

  longDescription = `
Validates a sample data configuration file without executing any operations.
This command checks:
- JSON syntax
- Required fields presence
- Data type correctness
- Value constraints (e.g., positive numbers, valid priorities)
- Table configuration validity

Use this command before running generation to catch configuration errors early.
  `.trim();

  async handler(args: any[] = [], options: CLIOptions = this.options): Promise<CLIResult> {
    try {
      if (!args || args.length === 0) {
        return createErrorResult(
          'Missing required argument',
          'Configuration file path is required',
          1
        );
      }

      const configPath = args[0];

      if (options.verbose) {
        console.log(`Validating configuration file: ${configPath}`);
        console.log('');
      }

      // Validate configuration
      const configService = new ConfigurationService();
      const validationResult = await configService.validateConfigurationFile(configPath);

      if (validationResult.isValid) {
        // Load config to show summary
        const config = await configService.loadConfiguration(configPath);

        const summary = {
          isValid: true,
          configPath,
          schemaName: config.schemaName,
          seed: config.seed,
          batchSize: config.batchSize,
          tableCount: config.tableConfigs.length,
          totalRecords: config.tableConfigs.reduce((sum, tc) => sum + tc.recordCount, 0),
          tables: config.tableConfigs.map(tc => ({
            name: tc.tableName,
            recordCount: tc.recordCount,
            priority: tc.priority
          }))
        };

        let message = '';

        switch (options.format) {
          case OutputFormat.JSON:
            message = 'Configuration is valid';
            break;

          case OutputFormat.MINIMAL:
            message = `✓ Configuration is valid (${config.tableConfigs.length} tables, ${summary.totalRecords} records)`;
            break;

          default:
            const lines: string[] = [];
            lines.push('Configuration Validation Result');
            lines.push('================================');
            lines.push('');
            lines.push('✓ Configuration is valid');
            lines.push('');
            lines.push('Summary:');
            lines.push(`  Schema: ${config.schemaName}`);
            lines.push(`  Seed: ${config.seed}`);
            lines.push(`  Batch Size: ${config.batchSize}`);
            lines.push(`  Tables: ${config.tableConfigs.length}`);
            lines.push(`  Total Records: ${summary.totalRecords}`);
            lines.push('');

            if (options.verbose) {
              lines.push('Table Configuration:');
              for (const tc of config.tableConfigs) {
                lines.push(
                  `  - ${tc.tableName}: ${tc.recordCount} records (priority ${tc.priority})`
                );
              }
            }

            message = lines.join('\n');
        }

        return createSuccessResult(message, summary);
      } else {
        // Validation failed
        const errorSummary = {
          isValid: false,
          configPath,
          errors: validationResult.errors,
          errorCount: validationResult.errors.length
        };

        let message = '';

        switch (options.format) {
          case OutputFormat.JSON:
            message = 'Configuration validation failed';
            break;

          case OutputFormat.MINIMAL:
            message = `✗ Configuration is invalid (${validationResult.errors.length} errors)`;
            break;

          default:
            const lines: string[] = [];
            lines.push('Configuration Validation Result');
            lines.push('================================');
            lines.push('');
            lines.push('✗ Configuration is invalid');
            lines.push('');
            lines.push(`Found ${validationResult.errors.length} error(s):`);
            lines.push('');

            for (let i = 0; i < validationResult.errors.length; i++) {
              lines.push(`${i + 1}. ${validationResult.errors[i]}`);
            }

            message = lines.join('\n');
        }

        return createErrorResult(message, validationResult.errors.join('; '), 1);
      }
    } catch (error) {
      return createErrorResult(
        'Failed to validate configuration',
        error instanceof Error ? error.message : String(error),
        1
      );
    }
  }
}
