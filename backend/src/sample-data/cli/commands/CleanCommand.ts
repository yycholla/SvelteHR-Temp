/**
 * Clean Command
 *
 * CLI command for cleaning/removing sample data.
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
import { DatabaseService } from '../../services/DatabaseService';
import { ConfigurationService } from '../../services/ConfigurationService';
import { SampleDataOrchestrator } from '../../SampleDataOrchestrator';

/**
 * Clean sample data command.
 */
export class CleanCommand implements CLICommand {
  name = 'clean-sample-data';
  description = 'Remove all sample data from the database';
  aliases = ['clean', 'remove'];

  arguments = [
    {
      name: 'configPath',
      description: 'Path to configuration file (optional)',
      required: false,
      type: 'string' as const,
      defaultValue: './config/sample-data.json'
    }
  ];

  options = createDefaultCLIOptions();

  examples = [
    'clean-sample-data',
    'clean-sample-data ./custom-config.json',
    'clean-sample-data --dry-run',
    'clean-sample-data --format json'
  ];

  longDescription = `
Removes all sample data from the database. Sample data is identified by:
- Records with full_name or name starting with "Sample"

The command will:
1. Connect to the database
2. Find all tables with sample data
3. Delete sample records in reverse dependency order
4. Report number of records deleted

Use --dry-run to preview what would be deleted without making changes.
  `.trim();

  async handler(args: any[] = [], options: CLIOptions = this.options): Promise<CLIResult> {
    try {
      const configPath = args[0] || this.arguments[0].defaultValue;

      // Try to load configuration, but it's optional
      const configService = new ConfigurationService();
      let config;

      try {
        config = await configService.loadConfiguration(configPath);
      } catch (error) {
        if (options.verbose) {
          console.log('No configuration file found, will clean all tables in schema');
        }
      }

      // Initialize services
      const dbService = new DatabaseService({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'hr_system',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123'
      });

      await dbService.connect();

      const orchestrator = new SampleDataOrchestrator(dbService, configService);

      // Dry run mode
      if (options.dryRun) {
        const status = await orchestrator.getSampleDataStatus(config?.schemaName || 'hr_public');

        await dbService.disconnect();

        return createSuccessResult(
          `[DRY RUN] Would delete ${status.totalSampleRecords} sample records`,
          {
            'dry-run': true,
            totalRecords: status.totalSampleRecords,
            tableBreakdown: status.tableStatuses.filter((ts: any) => ts.sampleRecords > 0)
          }
        );
      }

      if (options.verbose) {
        console.log('Cleaning sample data...');
        console.log('');
      }

      // Clean sample data
      const result = await orchestrator.cleanSampleData(config);

      await dbService.disconnect();

      // Format output
      let message = '';
      let formattedData: any = result;

      switch (options.format) {
        case OutputFormat.JSON:
          message = result.success ? 'Sample data cleaned successfully' : 'Sample data cleanup failed';
          formattedData = {
            success: result.success,
            recordsDeleted: result.totalRecordsGenerated,
            tableResults: result.tableResults.map(tr => ({
              table: tr.tableName,
              deleted: tr.recordsGenerated,
              status: tr.status
            }))
          };
          break;

        case OutputFormat.MINIMAL:
          message = result.success
            ? `Deleted ${result.totalRecordsGenerated} records in ${(result.executionTimeMs / 1000).toFixed(2)}s`
            : `Failed: ${result.errors.join(', ')}`;
          break;

        default:
          const lines: string[] = [];
          lines.push('Sample Data Cleanup Complete');
          lines.push('============================');
          lines.push('');
          lines.push(`Total Records Deleted: ${result.totalRecordsGenerated}`);
          lines.push(`Execution Time: ${(result.executionTimeMs / 1000).toFixed(2)}s`);
          lines.push('');

          if (result.tableResults.length > 0) {
            lines.push('Per-Table Results:');
            for (const tr of result.tableResults) {
              if (tr.recordsGenerated > 0) {
                lines.push(`  ${tr.tableName}: ${tr.recordsGenerated} records deleted`);
              }
            }
          }

          message = lines.join('\n');
          formattedData = {
            recordsDeleted: result.totalRecordsGenerated,
            tableResults: result.tableResults
          };
      }

      if (result.success) {
        return createSuccessResult(message, formattedData);
      } else {
        return createErrorResult(message, result.errors.join('; '), 1);
      }
    } catch (error) {
      return createErrorResult(
        'Failed to clean sample data',
        error instanceof Error ? error.message : String(error),
        1
      );
    }
  }
}
