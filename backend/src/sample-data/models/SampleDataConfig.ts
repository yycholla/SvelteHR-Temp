/**
 * Sample Data Configuration Model
 *
 * Defines the configuration structure for sample data generation.
 * This model supports deterministic generation, custom field configuration,
 * and table-specific settings.
 */

/**
 * Table priority levels for generation order.
 * Higher priority tables are generated first to satisfy foreign key dependencies.
 */
export enum TablePriority {
  CORE = 1,      // Core tables: users, departments
  SECONDARY = 2, // Tables that depend on core: employees, user_role_assignments
  TERTIARY = 3,  // Tables with multiple dependencies: performance_reviews, employee_goals
  QUATERNARY = 4 // Tables with complex dependencies: payroll_records, time_off_requests
}

/**
 * Configuration for a single table's sample data generation.
 */
export interface TableConfig {
  /** Name of the database table */
  tableName: string;

  /** Number of sample records to generate */
  recordCount: number;

  /** Priority level determining generation order (1 = highest priority) */
  priority: TablePriority;

  /** Naming pattern for generated records (e.g., "Sample User {id}") */
  namingPattern: string;

  /** Custom field generators or static values */
  customFields: Record<string, any>;

  /** Skip generation if table already contains sample data */
  skipIfExists: boolean;
}

/**
 * Main configuration for sample data generation system.
 */
export interface SampleDataConfig {
  /** Seed value for deterministic random generation (ensures consistency across machines) */
  seed: number;

  /** Database schema name (default: 'hr_public') */
  schemaName: string;

  /** Batch size for bulk insert operations */
  batchSize: number;

  /** Table-specific configurations */
  tableConfigs: TableConfig[];

  /** Enable progress reporting during generation */
  progressReporting?: boolean;

  /** Maximum number of retry attempts for transient failures */
  retryAttempts?: number;

  /** Delay between retry attempts in milliseconds */
  retryDelay?: number;

  /** Timeout for generation operations in milliseconds */
  timeout?: number;

  /** Continue processing other tables if one fails */
  continueOnError?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_SAMPLE_DATA_CONFIG: Partial<SampleDataConfig> = {
  seed: 42,
  schemaName: 'hr_public',
  batchSize: 50,
  progressReporting: true,
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 300000, // 5 minutes
  continueOnError: false
};

/**
 * Validates a sample data configuration object.
 *
 * @param config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateSampleDataConfig(config: SampleDataConfig): void {
  if (!config) {
    throw new Error('Configuration is required');
  }

  if (typeof config.seed !== 'number' || config.seed < 0) {
    throw new Error('Seed must be a non-negative number');
  }

  if (!config.schemaName || typeof config.schemaName !== 'string') {
    throw new Error('Schema name is required and must be a string');
  }

  if (typeof config.batchSize !== 'number' || config.batchSize <= 0) {
    throw new Error('Batch size must be a positive number');
  }

  if (!Array.isArray(config.tableConfigs)) {
    throw new Error('Table configs must be an array');
  }

  // Validate each table config
  config.tableConfigs.forEach((tableConfig, index) => {
    validateTableConfig(tableConfig, index);
  });
}

/**
 * Validates a single table configuration.
 *
 * @param config - Table configuration to validate
 * @param index - Index of the table config (for error messages)
 * @throws {Error} If table configuration is invalid
 */
export function validateTableConfig(config: TableConfig, index?: number): void {
  const prefix = index !== undefined ? `Table config at index ${index}` : 'Table config';

  if (!config.tableName || typeof config.tableName !== 'string') {
    throw new Error(`${prefix}: Table name is required and must be a string`);
  }

  if (typeof config.recordCount !== 'number' || config.recordCount < 0) {
    throw new Error(`${prefix}: Record count must be a non-negative number`);
  }

  if (!Object.values(TablePriority).includes(config.priority)) {
    throw new Error(`${prefix}: Invalid priority value`);
  }

  if (!config.namingPattern || typeof config.namingPattern !== 'string') {
    throw new Error(`${prefix}: Naming pattern is required and must be a non-empty string`);
  }

  if (typeof config.customFields !== 'object' || config.customFields === null) {
    throw new Error(`${prefix}: Custom fields must be an object`);
  }

  if (typeof config.skipIfExists !== 'boolean') {
    throw new Error(`${prefix}: skipIfExists must be a boolean`);
  }
}

/**
 * Merges user configuration with default values.
 *
 * @param userConfig - User-provided configuration
 * @returns Complete configuration with defaults applied
 */
export function mergeWithDefaults(userConfig: Partial<SampleDataConfig>): SampleDataConfig {
  return {
    ...DEFAULT_SAMPLE_DATA_CONFIG,
    ...userConfig,
    seed: userConfig.seed ?? DEFAULT_SAMPLE_DATA_CONFIG.seed!,
    schemaName: userConfig.schemaName ?? DEFAULT_SAMPLE_DATA_CONFIG.schemaName!,
    batchSize: userConfig.batchSize ?? DEFAULT_SAMPLE_DATA_CONFIG.batchSize!,
    tableConfigs: userConfig.tableConfigs ?? []
  };
}

/**
 * Sorts table configurations by priority (highest first).
 *
 * @param tableConfigs - Array of table configurations to sort
 * @returns Sorted array of table configurations
 */
export function sortTableConfigsByPriority(tableConfigs: TableConfig[]): TableConfig[] {
  return [...tableConfigs].sort((a, b) => a.priority - b.priority);
}

/**
 * Groups table configurations by priority level.
 *
 * @param tableConfigs - Array of table configurations to group
 * @returns Map of priority levels to table configurations
 */
export function groupTableConfigsByPriority(
  tableConfigs: TableConfig[]
): Map<TablePriority, TableConfig[]> {
  const grouped = new Map<TablePriority, TableConfig[]>();

  for (const config of tableConfigs) {
    const existing = grouped.get(config.priority) ?? [];
    existing.push(config);
    grouped.set(config.priority, existing);
  }

  return grouped;
}
