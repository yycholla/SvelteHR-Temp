/**
 * Generate Command
 *
 * CLI command for generating sample data.
 */

import {
  CLICommand,
  CLIOptions,
  CLIResult,
  OutputFormat,
  LogLevel,
  createSuccessResult,
  createErrorResult,
  createDefaultCLIOptions
} from '../../models/CLIInterface';
import { DatabaseService } from '../../services/DatabaseService';
import { ConfigurationService } from '../../services/ConfigurationService';
import { SampleDataOrchestrator } from '../../SampleDataOrchestrator';
import { formatResultSummary, formatResultAsJSON, formatResultAsTable } from '../../models/SampleDataResult';

/**
 * Generate sample data command.
 */
export class GenerateCommand implements CLICommand {
  name = 'generate-sample-data';
  description = 'Generate sample data for all configured tables';
  aliases = ['generate', 'gen'];

  arguments = [
    {
      name: 'configPath',
      description: 'Path to configuration file',
      required: false,
      type: 'string' as const,
      defaultValue: './config/sample-data.json'
    }
  ];

  options = createDefaultCLIOptions();

  examples = [
    'generate-sample-data',
    'generate-sample-data ./custom-config.json',
    'generate-sample-data --format table --verbose',
    'generate-sample-data --dry-run'
  ];

  longDescription = `
Generates sample data for all tables configured in the configuration file.
Data generation is deterministic based on the seed value in the configuration,
ensuring consistent results across different machines.

The command will:
1. Load and validate the configuration
2. Discover the database schema
3. Generate sample data respecting foreign key dependencies
4. Insert data in batches for optimal performance

Use --dry-run to preview what would be generated without making changes.
  `.trim();

  async handler(args: any[] = [], options: CLIOptions = this.options): Promise<CLIResult> {
    try {
      const configPath = args[0] || this.arguments[0].defaultValue;

      // Load configuration
      const configService = new ConfigurationService();
      const config = await configService.loadConfiguration(configPath);

      if (options.verbose) {
        console.log('Configuration loaded successfully');
        console.log(configService.getConfigurationSummary(config));
        console.log('');
      }

      // Dry run mode
      if (options.dryRun) {
        return createSuccessResult(
          `[DRY RUN] Would generate ${config.tableConfigs.reduce((sum, tc) => sum + tc.recordCount, 0)} records across ${config.tableConfigs.length} tables`,
          {
            'dry-run': true,
            tableConfigs: config.tableConfigs.map(tc => ({
              table: tc.tableName,
              records: tc.recordCount,
              priority: tc.priority
            }))
          }
        );
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

      if (options.verbose) {
        console.log('Starting sample data generation...');
        console.log('');
      }

      // Generate sample data
      const result = await orchestrator.generateSampleData(config);

      await dbService.disconnect();

      // Format output
      let message = '';
      let formattedData: any = result;

      switch (options.format) {
        case OutputFormat.JSON:
          message = result.success ? 'Sample data generated successfully' : 'Sample data generation failed';
          formattedData = result;
          break;

        case OutputFormat.TABLE:
          message = formatResultAsTable(result);
          formattedData = result;
          break;

        case OutputFormat.MINIMAL:
          message = result.success
            ? `Generated ${result.totalRecordsGenerated} records in ${(result.executionTimeMs / 1000).toFixed(2)}s`
            : `Failed: ${result.errors.join(', ')}`;
          break;

        default:
          message = formatResultSummary(result);
          formattedData = result;
      }

      if (result.success) {
        return createSuccessResult(message, formattedData);
      } else {
        return createErrorResult(message, result.errors.join('; '), 1);
      }
    } catch (error) {
      return createErrorResult(
        'Failed to generate sample data',
        error instanceof Error ? error.message : String(error),
        1
      );
    }
  }
}
