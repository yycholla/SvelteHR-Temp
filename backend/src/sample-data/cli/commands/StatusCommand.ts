/**
 * Status Command
 *
 * CLI command for checking sample data status.
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
 * Sample data status command.
 */
export class StatusCommand implements CLICommand {
  name = 'status';
  description = 'Show current sample data status in the database';
  aliases = ['stat', 'info'];

  arguments = [
    {
      name: 'schemaName',
      description: 'Database schema name (optional)',
      required: false,
      type: 'string' as const,
      defaultValue: 'hr_public'
    }
  ];

  options = createDefaultCLIOptions();

  examples = [
    'status',
    'status hr_public',
    'status --format table',
    'status --format json --verbose'
  ];

  longDescription = `
Shows the current status of sample data in the database, including:
- Total number of sample records
- Breakdown by table
- Percentage of sample data vs total data per table

This command helps you understand what sample data is currently in the database
before running generation or cleanup operations.
  `.trim();

  async handler(args: any[] = [], options: CLIOptions = this.options): Promise<CLIResult> {
    try {
      const schemaName = args[0] || this.arguments[0].defaultValue!;

      if (options.verbose) {
        console.log(`Checking sample data status for schema: ${schemaName}`);
        console.log('');
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

      const configService = new ConfigurationService();
      const orchestrator = new SampleDataOrchestrator(dbService, configService);

      // Get status
      const status = await orchestrator.getSampleDataStatus(schemaName);

      await dbService.disconnect();

      // Format output
      let message = '';
      let formattedData: any = status;

      switch (options.format) {
        case OutputFormat.JSON:
          message = 'Sample data status retrieved';
          formattedData = status;
          break;

        case OutputFormat.TABLE:
          const tableLines: string[] = [];

          // Header
          tableLines.push('┌─────────────────────────┬──────────┬───────────┬────────────┐');
          tableLines.push('│ Table                   │ Sample   │ Total     │ Percentage │');
          tableLines.push('├─────────────────────────┼──────────┼───────────┼────────────┤');

          // Rows
          for (const tableStatus of status.tableStatuses) {
            if (tableStatus.sampleRecords > 0) {
              const table = tableStatus.tableName.padEnd(23);
              const sample = String(tableStatus.sampleRecords).padStart(8);
              const total = String(tableStatus.totalRecords).padStart(9);
              const percent = `${tableStatus.percentageSample}%`.padStart(10);

              tableLines.push(`│ ${table} │ ${sample} │ ${total} │ ${percent} │`);
            }
          }

          // Footer
          tableLines.push('└─────────────────────────┴──────────┴───────────┴────────────┘');
          tableLines.push('');
          tableLines.push(`Total Sample Records: ${status.totalSampleRecords}`);

          message = tableLines.join('\n');
          break;

        case OutputFormat.MINIMAL:
          const tablesWithData = status.tableStatuses.filter(
            (ts: any) => ts.sampleRecords > 0
          ).length;
          message = `${status.totalSampleRecords} sample records across ${tablesWithData} tables`;
          break;

        default:
          const lines: string[] = [];
          lines.push('Sample Data Status');
          lines.push('==================');
          lines.push('');
          lines.push(`Schema: ${status.schemaName}`);
          lines.push(`Total Sample Records: ${status.totalSampleRecords}`);
          lines.push('');

          const tablesWithSampleData = status.tableStatuses.filter(
            (ts: any) => ts.sampleRecords > 0
          );

          if (tablesWithSampleData.length > 0) {
            lines.push('Tables with Sample Data:');
            for (const tableStatus of tablesWithSampleData) {
              lines.push(
                `  ${tableStatus.tableName}: ${tableStatus.sampleRecords} sample / ${tableStatus.totalRecords} total (${tableStatus.percentageSample}%)`
              );
            }
          } else {
            lines.push('No sample data found in any tables');
          }

          if (options.verbose && status.tableStatuses.length > tablesWithSampleData.length) {
            lines.push('');
            lines.push('Tables without Sample Data:');
            for (const tableStatus of status.tableStatuses) {
              if (tableStatus.sampleRecords === 0) {
                lines.push(`  ${tableStatus.tableName}`);
              }
            }
          }

          message = lines.join('\n');
      }

      return createSuccessResult(message, formattedData);
    } catch (error) {
      return createErrorResult(
        'Failed to get sample data status',
        error instanceof Error ? error.message : String(error),
        1
      );
    }
  }
}
