/**
 * Sample Data Orchestrator
 *
 * Main orchestrator for the sample data generation system.
 * Coordinates all services to discover schemas, generate data, and manage
 * the complete lifecycle of sample data operations.
 */

import { DatabaseService } from './services/DatabaseService';
import { SchemaDiscoveryService } from './services/SchemaDiscoveryService';
import { ConfigurationService } from './services/ConfigurationService';
import { DataGenerator } from './services/DataGenerator';
import {
  SampleDataConfig,
  TableConfig,
  sortTableConfigsByPriority
} from './models/SampleDataConfig';
import {
  SampleDataResult,
  TableResult,
  OperationStatus,
  createEmptyResult,
  createTableResult,
  mergeTableResult
} from './models/SampleDataResult';
import { TableSchema } from './models/DatabaseSchema';
import { SampleDataError, DataGenerationError } from './models/Errors';

/**
 * Main orchestrator for sample data operations.
 */
export class SampleDataOrchestrator {
  private databaseService: DatabaseService;
  private configurationService: ConfigurationService;
  private schemaDiscoveryService: SchemaDiscoveryService;
  private dataGenerator: DataGenerator;

  constructor(databaseService: DatabaseService, configurationService: ConfigurationService) {
    this.databaseService = databaseService;
    this.configurationService = configurationService;
    this.schemaDiscoveryService = new SchemaDiscoveryService(databaseService);
    this.dataGenerator = new DataGenerator();
  }

  /**
   * Generates sample data for all configured tables.
   *
   * @param config - Sample data configuration
   * @returns Generation result
   */
  async generateSampleData(config: SampleDataConfig): Promise<SampleDataResult> {
    const startTime = Date.now();
    const result = createEmptyResult();

    result.data = {
      seedUsed: config.seed,
      configHash: this.configurationService.generateConfigHash(config)
    };

    try {
      // Set seed for deterministic generation
      this.dataGenerator.setSeed(config.seed);

      // Discover schema
      const schema = await this.schemaDiscoveryService.discoverSchema(config.schemaName);

      // Sort tables by priority
      const sortedTables = sortTableConfigsByPriority(config.tableConfigs);

      // Process each table in order
      for (const tableConfig of sortedTables) {
        const tableResult = await this.processTable(schema, tableConfig, config);
        mergeTableResult(result, tableResult);

        // Stop if error and not continuing on error
        if (tableResult.status === OperationStatus.ERROR && !config.continueOnError) {
          result.success = false;
          break;
        }
      }

      // Calculate final execution time
      result.executionTimeMs = Date.now() - startTime;

      return result;
    } catch (error) {
      result.success = false;
      result.executionTimeMs = Date.now() - startTime;

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred during generation';
      result.errors.push(errorMessage);
      result.summary.errors.push(errorMessage);

      return result;
    }
  }

  /**
   * Processes a single table for sample data generation.
   *
   * @param schema - Database schema
   * @param tableConfig - Table configuration
   * @param globalConfig - Global configuration
   * @returns Table result
   */
  private async processTable(
    schema: any,
    tableConfig: TableConfig,
    globalConfig: SampleDataConfig
  ): Promise<TableResult> {
    const tableResult = createTableResult(tableConfig.tableName);
    const startTime = Date.now();

    try {
      // Check if table should be skipped
      if (tableConfig.skipIfExists) {
        const existingCount = await this.databaseService.getTableRowCount(
          globalConfig.schemaName,
          tableConfig.tableName
        );

        if (existingCount > 0) {
          tableResult.status = OperationStatus.SKIPPED;
          tableResult.recordsSkipped = existingCount;
          tableResult.warnings.push('Table already contains data');
          tableResult.executionTimeMs = Date.now() - startTime;
          return tableResult;
        }
      }

      // Find table schema
      const tableSchema = schema.tables.find((t: TableSchema) => t.tableName === tableConfig.tableName);

      if (!tableSchema) {
        throw new DataGenerationError(
          `Table schema not found: ${tableConfig.tableName}`,
          tableConfig.tableName
        );
      }

      // Generate records
      const records = this.dataGenerator.generateRecords(
        tableSchema,
        tableConfig,
        tableConfig.recordCount
      );

      // Insert in batches
      const batchSize = globalConfig.batchSize;
      const batches = Math.ceil(records.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, records.length);
        const batch = records.slice(start, end);

        await this.insertBatch(globalConfig.schemaName, tableConfig.tableName, tableSchema, batch);

        tableResult.recordsGenerated += batch.length;

        // Report progress if enabled
        if (globalConfig.progressReporting) {
          console.log(
            `${tableConfig.tableName}: Generated ${end}/${records.length} records (${Math.round((end / records.length) * 100)}%)`
          );
        }
      }

      tableResult.status = OperationStatus.SUCCESS;
      tableResult.executionTimeMs = Date.now() - startTime;
      tableResult.metadata = {
        batchCount: batches,
        avgRecordsPerBatch: Math.floor(records.length / batches)
      };

      return tableResult;
    } catch (error) {
      tableResult.status = OperationStatus.ERROR;
      tableResult.executionTimeMs = Date.now() - startTime;

      const errorMessage = error instanceof Error ? error.message : String(error);
      tableResult.errors.push(errorMessage);

      return tableResult;
    }
  }

  /**
   * Inserts a batch of records into a table.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @param tableSchema - Table schema
   * @param records - Records to insert
   */
  private async insertBatch(
    schemaName: string,
    tableName: string,
    tableSchema: TableSchema,
    records: any[]
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    // Extract column names from first record
    const columns = Object.keys(records[0]);

    // Convert records to arrays of values
    const values = records.map(record => columns.map(col => record[col]));

    // Insert using batch insert
    await this.databaseService.batchInsert(`${schemaName}.${tableName}`, columns, values);
  }

  /**
   * Cleans all sample data from the database.
   *
   * @param config - Optional configuration (uses default if not provided)
   * @returns Cleanup result
   */
  async cleanSampleData(config?: SampleDataConfig): Promise<SampleDataResult> {
    const startTime = Date.now();
    const result = createEmptyResult();

    try {
      const schemaName = config?.schemaName || 'hr_public';

      // Get all configured tables or discover all tables
      let tableConfigs: TableConfig[];

      if (config) {
        tableConfigs = config.tableConfigs;
      } else {
        // Discover all tables
        const schema = await this.schemaDiscoveryService.discoverSchema(schemaName);
        tableConfigs = schema.tables.map(table => ({
          tableName: table.tableName,
          recordCount: 0,
          priority: 1,
          namingPattern: '',
          customFields: {},
          skipIfExists: false
        }));
      }

      // Clean each table (in reverse priority order to handle FK constraints)
      const reversedTables = [...tableConfigs].reverse();

      for (const tableConfig of reversedTables) {
        const tableResult = createTableResult(tableConfig.tableName);
        const tableStartTime = Date.now();

        try {
          // Delete sample data (identified by naming pattern)
          const deletedCount = await this.databaseService.deleteRecords(
            schemaName,
            tableConfig.tableName,
            "full_name LIKE 'Sample%' OR name LIKE 'Sample%'"
          );

          tableResult.recordsGenerated = deletedCount;
          tableResult.status = OperationStatus.SUCCESS;
          tableResult.executionTimeMs = Date.now() - tableStartTime;

          mergeTableResult(result, tableResult);
        } catch (error) {
          tableResult.status = OperationStatus.ERROR;
          tableResult.executionTimeMs = Date.now() - tableStartTime;
          tableResult.errors.push(error instanceof Error ? error.message : String(error));

          mergeTableResult(result, tableResult);
        }
      }

      result.executionTimeMs = Date.now() - startTime;
      return result;
    } catch (error) {
      result.success = false;
      result.executionTimeMs = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));

      return result;
    }
  }

  /**
   * Gets status of sample data in the database.
   *
   * @param schemaName - Schema name
   * @returns Status information
   */
  async getSampleDataStatus(schemaName = 'hr_public'): Promise<any> {
    try {
      const schema = await this.schemaDiscoveryService.discoverSchema(schemaName);

      const tableStatuses = [];
      let totalSampleRecords = 0;

      for (const table of schema.tables) {
        // Count sample records
        const sampleCountResult = await this.databaseService.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM ${schemaName}.${table.tableName}
           WHERE full_name LIKE 'Sample%' OR name LIKE 'Sample%'`
        );

        const sampleCount = parseInt(sampleCountResult.rows[0]?.count || '0');
        totalSampleRecords += sampleCount;

        // Get total count
        const totalCount = await this.databaseService.getTableRowCount(schemaName, table.tableName);

        tableStatuses.push({
          tableName: table.tableName,
          sampleRecords: sampleCount,
          totalRecords: totalCount,
          percentageSample: totalCount > 0 ? Math.round((sampleCount / totalCount) * 100) : 0
        });
      }

      return {
        schemaName,
        totalSampleRecords,
        tableStatuses
      };
    } catch (error) {
      throw new SampleDataError(
        `Failed to get sample data status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
