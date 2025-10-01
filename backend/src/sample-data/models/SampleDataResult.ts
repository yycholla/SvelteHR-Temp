/**
 * Sample Data Result Model
 *
 * Represents the results of sample data generation operations,
 * including success status, statistics, and detailed per-table results.
 */

/**
 * Operation status enumeration.
 */
export enum OperationStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  SKIPPED = 'skipped',
  PARTIAL = 'partial'
}

/**
 * Summary statistics for the entire sample data generation operation.
 */
export interface SampleDataSummary {
  /** Total number of tables processed */
  tablesProcessed: number;

  /** Total number of new records created */
  recordsCreated: number;

  /** Total number of existing records updated */
  recordsUpdated: number;

  /** Total number of records skipped */
  recordsSkipped: number;

  /** List of errors encountered during generation */
  errors: string[];
}

/**
 * Result for a single table's sample data generation.
 */
export interface TableResult {
  /** Name of the table */
  tableName: string;

  /** Operation status */
  status: OperationStatus;

  /** Number of new records generated */
  recordsGenerated: number;

  /** Number of existing records updated */
  recordsUpdated: number;

  /** Number of records skipped */
  recordsSkipped: number;

  /** Time taken to process this table in milliseconds */
  executionTimeMs: number;

  /** Any errors specific to this table */
  errors: string[];

  /** Any warnings specific to this table */
  warnings: string[];

  /** Additional metadata about the operation */
  metadata?: {
    /** Batch count used */
    batchCount?: number;

    /** Average records per batch */
    avgRecordsPerBatch?: number;

    /** Whether data was merged with existing records */
    wasMerged?: boolean;
  };
}

/**
 * Complete result of a sample data generation operation.
 */
export interface SampleDataResult {
  /** Whether the overall operation was successful */
  success: boolean;

  /** Total number of records generated across all tables */
  totalRecordsGenerated: number;

  /** Total execution time in milliseconds */
  executionTimeMs: number;

  /** Per-table results */
  tableResults: TableResult[];

  /** Summary statistics */
  summary: SampleDataSummary;

  /** Global errors (not specific to any table) */
  errors: string[];

  /** Global warnings */
  warnings: string[];

  /** Additional metadata about the generation */
  data?: {
    /** Seed value used for generation */
    seedUsed?: number;

    /** Configuration hash for reproducibility */
    configHash?: string;

    /** Verbose output for debugging */
    verboseOutput?: string[];

    /** Number of retry attempts made */
    retryAttempts?: number;
  };
}

/**
 * Creates an empty sample data result with default values.
 *
 * @returns Empty result object
 */
export function createEmptyResult(): SampleDataResult {
  return {
    success: true,
    totalRecordsGenerated: 0,
    executionTimeMs: 0,
    tableResults: [],
    summary: {
      tablesProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: []
    },
    errors: [],
    warnings: [],
    data: {}
  };
}

/**
 * Creates a table result with default values.
 *
 * @param tableName - Name of the table
 * @param status - Operation status (defaults to SUCCESS)
 * @returns Empty table result object
 */
export function createTableResult(
  tableName: string,
  status: OperationStatus = OperationStatus.SUCCESS
): TableResult {
  return {
    tableName,
    status,
    recordsGenerated: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    executionTimeMs: 0,
    errors: [],
    warnings: [],
    metadata: {}
  };
}

/**
 * Merges a table result into the overall result.
 *
 * @param result - Overall result to update
 * @param tableResult - Table result to merge
 */
export function mergeTableResult(result: SampleDataResult, tableResult: TableResult): void {
  result.tableResults.push(tableResult);

  result.totalRecordsGenerated +=
    tableResult.recordsGenerated + tableResult.recordsUpdated + tableResult.recordsSkipped;

  result.summary.tablesProcessed++;
  result.summary.recordsCreated += tableResult.recordsGenerated;
  result.summary.recordsUpdated += tableResult.recordsUpdated;
  result.summary.recordsSkipped += tableResult.recordsSkipped;

  if (tableResult.errors.length > 0) {
    result.summary.errors.push(...tableResult.errors);
    result.success = false;
  }

  if (tableResult.warnings.length > 0) {
    result.warnings.push(...tableResult.warnings);
  }
}

/**
 * Calculates success rate across all table results.
 *
 * @param result - Sample data result
 * @returns Success rate as a percentage (0-100)
 */
export function calculateSuccessRate(result: SampleDataResult): number {
  if (result.tableResults.length === 0) {
    return 100;
  }

  const successfulTables = result.tableResults.filter(
    tr => tr.status === OperationStatus.SUCCESS
  ).length;

  return (successfulTables / result.tableResults.length) * 100;
}

/**
 * Gets all failed table results.
 *
 * @param result - Sample data result
 * @returns Array of failed table results
 */
export function getFailedTables(result: SampleDataResult): TableResult[] {
  return result.tableResults.filter(tr => tr.status === OperationStatus.ERROR);
}

/**
 * Gets all skipped table results.
 *
 * @param result - Sample data result
 * @returns Array of skipped table results
 */
export function getSkippedTables(result: SampleDataResult): TableResult[] {
  return result.tableResults.filter(tr => tr.status === OperationStatus.SKIPPED);
}

/**
 * Gets all successful table results.
 *
 * @param result - Sample data result
 * @returns Array of successful table results
 */
export function getSuccessfulTables(result: SampleDataResult): TableResult[] {
  return result.tableResults.filter(tr => tr.status === OperationStatus.SUCCESS);
}

/**
 * Formats the result as a human-readable summary string.
 *
 * @param result - Sample data result
 * @returns Formatted summary string
 */
export function formatResultSummary(result: SampleDataResult): string {
  const lines: string[] = [];

  lines.push('Sample Data Generation Summary');
  lines.push('==============================');
  lines.push('');
  lines.push(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  lines.push(`Total Records: ${result.totalRecordsGenerated}`);
  lines.push(`Execution Time: ${(result.executionTimeMs / 1000).toFixed(2)}s`);
  lines.push('');
  lines.push('Statistics:');
  lines.push(`  Tables Processed: ${result.summary.tablesProcessed}`);
  lines.push(`  Records Created: ${result.summary.recordsCreated}`);
  lines.push(`  Records Updated: ${result.summary.recordsUpdated}`);
  lines.push(`  Records Skipped: ${result.summary.recordsSkipped}`);
  lines.push('');

  if (result.tableResults.length > 0) {
    lines.push('Per-Table Results:');
    for (const tableResult of result.tableResults) {
      const totalRecords =
        tableResult.recordsGenerated + tableResult.recordsUpdated + tableResult.recordsSkipped;
      lines.push(
        `  ${tableResult.tableName}: ${tableResult.status} (${totalRecords} records, ${(tableResult.executionTimeMs / 1000).toFixed(2)}s)`
      );
    }
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Formats the result as JSON.
 *
 * @param result - Sample data result
 * @param pretty - Whether to pretty-print the JSON
 * @returns JSON string
 */
export function formatResultAsJSON(result: SampleDataResult, pretty = true): string {
  return JSON.stringify(result, null, pretty ? 2 : 0);
}

/**
 * Formats the result as a simple table.
 *
 * @param result - Sample data result
 * @returns Table string
 */
export function formatResultAsTable(result: SampleDataResult): string {
  const lines: string[] = [];

  // Header
  lines.push('┌─────────────────────────┬──────────┬───────────┬─────────┬─────────┐');
  lines.push('│ Table                   │ Status   │ Created   │ Updated │ Time    │');
  lines.push('├─────────────────────────┼──────────┼───────────┼─────────┼─────────┤');

  // Rows
  for (const tableResult of result.tableResults) {
    const table = tableResult.tableName.padEnd(23);
    const status = tableResult.status.padEnd(8);
    const created = tableResult.recordsGenerated.toString().padStart(9);
    const updated = tableResult.recordsUpdated.toString().padStart(7);
    const time = `${(tableResult.executionTimeMs / 1000).toFixed(2)}s`.padStart(7);

    lines.push(`│ ${table} │ ${status} │ ${created} │ ${updated} │ ${time} │`);
  }

  // Footer
  lines.push('└─────────────────────────┴──────────┴───────────┴─────────┴─────────┘');

  // Summary
  lines.push('');
  lines.push(
    `Total: ${result.totalRecordsGenerated} records in ${(result.executionTimeMs / 1000).toFixed(2)}s`
  );

  return lines.join('\n');
}

/**
 * Validates that a result object has the required structure.
 *
 * @param result - Result to validate
 * @throws {Error} If result is invalid
 */
export function validateSampleDataResult(result: SampleDataResult): void {
  if (!result) {
    throw new Error('Result is required');
  }

  if (typeof result.success !== 'boolean') {
    throw new Error('Success flag must be a boolean');
  }

  if (typeof result.totalRecordsGenerated !== 'number') {
    throw new Error('Total records generated must be a number');
  }

  if (typeof result.executionTimeMs !== 'number') {
    throw new Error('Execution time must be a number');
  }

  if (!Array.isArray(result.tableResults)) {
    throw new Error('Table results must be an array');
  }

  if (!result.summary) {
    throw new Error('Summary is required');
  }

  if (!Array.isArray(result.errors)) {
    throw new Error('Errors must be an array');
  }

  if (!Array.isArray(result.warnings)) {
    throw new Error('Warnings must be an array');
  }
}
