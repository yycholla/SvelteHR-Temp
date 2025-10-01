/**
 * Configuration Service
 *
 * Handles loading, parsing, and validating sample data configuration files.
 * Supports JSON configuration with schema validation and default value merging.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  SampleDataConfig,
  TableConfig,
  validateSampleDataConfig,
  mergeWithDefaults
} from '../models/SampleDataConfig';
import { ConfigurationError } from '../models/Errors';

/**
 * Configuration service for managing sample data configuration.
 */
export class ConfigurationService {
  /**
   * Loads configuration from a file.
   *
   * @param filePath - Path to configuration file
   * @returns Validated configuration object
   */
  async loadConfiguration(filePath: string): Promise<SampleDataConfig> {
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new ConfigurationError(
          `Configuration file not found: ${filePath}`,
          filePath
        );
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse and validate
      return this.parseConfiguration(content, filePath);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw new ConfigurationError(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  /**
   * Parses configuration from a JSON string.
   *
   * @param jsonString - JSON configuration string
   * @param source - Optional source identifier for error messages
   * @returns Validated configuration object
   */
  async parseConfiguration(jsonString: string, source?: string): Promise<SampleDataConfig> {
    try {
      // Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch (error) {
        throw new ConfigurationError(
          `Invalid JSON syntax: ${error instanceof Error ? error.message : String(error)}`,
          source
        );
      }

      // Handle wrapped config format (with "config" and "version" keys)
      if (parsed.config && typeof parsed.config === 'object') {
        parsed = parsed.config;
      }

      // Merge with defaults
      const config = mergeWithDefaults(parsed);

      // Validate
      try {
        validateSampleDataConfig(config);
      } catch (error) {
        throw new ConfigurationError(
          `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
          source
        );
      }

      return config;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }

      throw new ConfigurationError(
        `Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`,
        source
      );
    }
  }

  /**
   * Saves configuration to a file.
   *
   * @param config - Configuration to save
   * @param filePath - Path to save configuration to
   */
  async saveConfiguration(config: SampleDataConfig, filePath: string): Promise<void> {
    try {
      // Validate before saving
      validateSampleDataConfig(config);

      // Ensure directory exists
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });

      // Write to file
      const jsonString = JSON.stringify(config, null, 2);
      await fs.writeFile(filePath, jsonString, 'utf-8');
    } catch (error) {
      throw new ConfigurationError(
        `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  /**
   * Creates a default configuration for a schema.
   *
   * @param schemaName - Schema name
   * @param tables - Array of table names
   * @returns Default configuration
   */
  createDefaultConfiguration(schemaName: string, tables: string[]): SampleDataConfig {
    const tableConfigs: TableConfig[] = tables.map((tableName, index) => ({
      tableName,
      recordCount: 10,
      priority: 1,
      namingPattern: `Sample ${this.capitalize(tableName)} {id}`,
      customFields: {},
      skipIfExists: false
    }));

    return mergeWithDefaults({
      schemaName,
      tableConfigs
    });
  }

  /**
   * Validates a configuration file without loading it.
   *
   * @param filePath - Path to configuration file
   * @returns Validation result with errors if any
   */
  async validateConfigurationFile(
    filePath: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      await this.loadConfiguration(filePath);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof ConfigurationError) {
        errors.push(error.message);
      } else if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push(String(error));
      }

      return { isValid: false, errors };
    }
  }

  /**
   * Gets configuration for a specific table.
   *
   * @param config - Full configuration
   * @param tableName - Table name to find
   * @returns Table configuration or undefined
   */
  getTableConfig(config: SampleDataConfig, tableName: string): TableConfig | undefined {
    return config.tableConfigs.find(tc => tc.tableName === tableName);
  }

  /**
   * Updates configuration for a specific table.
   *
   * @param config - Full configuration
   * @param tableName - Table name to update
   * @param updates - Partial table configuration updates
   * @returns Updated configuration
   */
  updateTableConfig(
    config: SampleDataConfig,
    tableName: string,
    updates: Partial<TableConfig>
  ): SampleDataConfig {
    const tableConfigs = config.tableConfigs.map(tc =>
      tc.tableName === tableName ? { ...tc, ...updates } : tc
    );

    return {
      ...config,
      tableConfigs
    };
  }

  /**
   * Adds a new table configuration.
   *
   * @param config - Full configuration
   * @param tableConfig - Table configuration to add
   * @returns Updated configuration
   */
  addTableConfig(config: SampleDataConfig, tableConfig: TableConfig): SampleDataConfig {
    // Check if table already exists
    if (config.tableConfigs.some(tc => tc.tableName === tableConfig.tableName)) {
      throw new ConfigurationError(
        `Table configuration already exists: ${tableConfig.tableName}`
      );
    }

    return {
      ...config,
      tableConfigs: [...config.tableConfigs, tableConfig]
    };
  }

  /**
   * Removes a table configuration.
   *
   * @param config - Full configuration
   * @param tableName - Table name to remove
   * @returns Updated configuration
   */
  removeTableConfig(config: SampleDataConfig, tableName: string): SampleDataConfig {
    return {
      ...config,
      tableConfigs: config.tableConfigs.filter(tc => tc.tableName !== tableName)
    };
  }

  /**
   * Merges two configurations.
   *
   * @param base - Base configuration
   * @param override - Configuration to merge in
   * @returns Merged configuration
   */
  mergeConfigurations(
    base: SampleDataConfig,
    override: Partial<SampleDataConfig>
  ): SampleDataConfig {
    const merged: SampleDataConfig = {
      ...base,
      ...override,
      tableConfigs: override.tableConfigs ?? base.tableConfigs
    };

    validateSampleDataConfig(merged);
    return merged;
  }

  /**
   * Creates a configuration template file.
   *
   * @param filePath - Path to create template at
   * @param schemaName - Schema name for template
   * @param tables - Optional table names
   */
  async createTemplate(
    filePath: string,
    schemaName: string,
    tables?: string[]
  ): Promise<void> {
    const defaultTables = tables ?? ['users', 'departments', 'employees'];
    const config = this.createDefaultConfiguration(schemaName, defaultTables);

    await this.saveConfiguration(config, filePath);
  }

  /**
   * Loads configuration from environment variables.
   *
   * @returns Configuration from environment
   */
  loadFromEnvironment(): Partial<SampleDataConfig> {
    const config: Partial<SampleDataConfig> = {};

    if (process.env.SAMPLE_DATA_SEED) {
      config.seed = parseInt(process.env.SAMPLE_DATA_SEED, 10);
    }

    if (process.env.SAMPLE_DATA_SCHEMA) {
      config.schemaName = process.env.SAMPLE_DATA_SCHEMA;
    }

    if (process.env.SAMPLE_DATA_BATCH_SIZE) {
      config.batchSize = parseInt(process.env.SAMPLE_DATA_BATCH_SIZE, 10);
    }

    if (process.env.SAMPLE_DATA_PROGRESS) {
      config.progressReporting = process.env.SAMPLE_DATA_PROGRESS === 'true';
    }

    return config;
  }

  /**
   * Generates a configuration hash for reproducibility tracking.
   *
   * @param config - Configuration to hash
   * @returns Hash string
   */
  generateConfigHash(config: SampleDataConfig): string {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  /**
   * Capitalizes the first letter of a string.
   *
   * @param str - String to capitalize
   * @returns Capitalized string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Gets configuration summary.
   *
   * @param config - Configuration to summarize
   * @returns Human-readable summary
   */
  getConfigurationSummary(config: SampleDataConfig): string {
    const lines: string[] = [];

    lines.push('Sample Data Configuration Summary');
    lines.push('=================================');
    lines.push('');
    lines.push(`Schema: ${config.schemaName}`);
    lines.push(`Seed: ${config.seed}`);
    lines.push(`Batch Size: ${config.batchSize}`);
    lines.push(`Tables: ${config.tableConfigs.length}`);
    lines.push('');

    const totalRecords = config.tableConfigs.reduce((sum, tc) => sum + tc.recordCount, 0);
    lines.push(`Total Records to Generate: ${totalRecords}`);
    lines.push('');

    lines.push('Table Breakdown:');
    for (const tc of config.tableConfigs) {
      lines.push(`  - ${tc.tableName}: ${tc.recordCount} records (priority ${tc.priority})`);
    }

    return lines.join('\n');
  }
}
