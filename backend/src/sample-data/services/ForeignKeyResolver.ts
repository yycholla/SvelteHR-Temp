/**
 * Foreign Key Resolver
 *
 * Resolves foreign key relationships by fetching existing records from referenced tables
 * and providing random selection for realistic data generation.
 */

import { DatabaseService } from './DatabaseService';
import { ForeignKeySchema } from '../models/DatabaseSchema';
import { faker } from '@faker-js/faker';

/**
 * Cache entry for foreign key values
 */
interface ForeignKeyCache {
  values: any[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Foreign key resolver for data generation
 */
export class ForeignKeyResolver {
  private databaseService: DatabaseService;
  private cache: Map<string, ForeignKeyCache> = new Map();
  private defaultTTL = 60000; // 60 seconds cache TTL

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Resolves a foreign key value by fetching existing records from the referenced table
   *
   * @param foreignKey - Foreign key schema
   * @param schemaName - Schema name
   * @param nullProbability - Probability of returning null (0-1)
   * @returns Foreign key value or null
   */
  async resolveForeignKey(
    foreignKey: ForeignKeySchema,
    schemaName: string,
    nullProbability = 0.1
  ): Promise<any> {
    // Check if FK is nullable and randomly return null
    if (nullProbability > 0 && faker.datatype.boolean({ probability: nullProbability })) {
      return null;
    }

    // Get available values from cache or database
    const values = await this.getAvailableValues(foreignKey, schemaName);

    // If no values available, return null
    if (values.length === 0) {
      return null;
    }

    // Return a random value
    return faker.helpers.arrayElement(values);
  }

  /**
   * Gets available values for a foreign key from cache or database
   *
   * @param foreignKey - Foreign key constraint
   * @param schemaName - Schema name
   * @returns Array of available foreign key values
   */
  private async getAvailableValues(
    foreignKey: ForeignKeySchema,
    schemaName: string
  ): Promise<any[]> {
    const cacheKey = this.getCacheKey(foreignKey, schemaName);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.values;
    }

    // Fetch from database
    const values = await this.fetchForeignKeyValues(foreignKey, schemaName);

    // Cache the values
    this.cache.set(cacheKey, {
      values,
      timestamp: Date.now(),
      ttl: this.defaultTTL
    });

    return values;
  }

  /**
   * Fetches foreign key values from the database
   *
   * @param foreignKey - Foreign key constraint
   * @param schemaName - Schema name
   * @returns Array of foreign key values
   */
  private async fetchForeignKeyValues(
    foreignKey: ForeignKeySchema,
    schemaName: string
  ): Promise<any[]> {
    // Safety checks
    if (!foreignKey.referencedColumn) {
      console.warn(`Foreign key has no referenced column:`, foreignKey);
      return [];
    }

    const referencedSchema = foreignKey.referencedSchema || schemaName;
    const referencedTable = foreignKey.referencedTable;
    const referencedColumn = foreignKey.referencedColumn;

    try {
      const query = `
        SELECT ${referencedColumn}
        FROM ${referencedSchema}.${referencedTable}
        WHERE ${referencedColumn} IS NOT NULL
        LIMIT 1000
      `;

      const result = await this.databaseService.query(query);
      return result.rows.map(row => row[referencedColumn]);
    } catch (error) {
      console.error(
        `Failed to fetch FK values for ${referencedTable}.${referencedColumn}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Resolves multiple foreign keys for a record
   *
   * @param foreignKeys - Array of foreign key constraints
   * @param columnName - Column name to resolve
   * @param schemaName - Schema name
   * @param nullProbability - Probability of returning null (0-1)
   * @returns Foreign key value or null
   */
  async resolveForeignKeyByColumn(
    foreignKeys: ForeignKeySchema[],
    columnName: string,
    schemaName: string,
    nullProbability = 0.1
  ): Promise<any> {
    // Find the foreign key constraint for this column
    const foreignKey = foreignKeys.find(fk => fk.columnName === columnName);

    if (!foreignKey) {
      return null;
    }

    return this.resolveForeignKey(foreignKey, schemaName, nullProbability);
  }

  /**
   * Checks if a column is a foreign key
   *
   * @param foreignKeys - Array of foreign key constraints
   * @param columnName - Column name to check
   * @returns True if column is a foreign key
   */
  isForeignKey(foreignKeys: ForeignKeySchema[], columnName: string): boolean {
    return foreignKeys.some(fk => fk.columnName === columnName);
  }

  /**
   * Pre-caches foreign key values for multiple tables
   *
   * @param foreignKeys - Array of foreign key constraints
   * @param schemaName - Schema name
   */
  async preCacheForeignKeys(
    foreignKeys: ForeignKeySchema[],
    schemaName: string
  ): Promise<void> {
    const promises = foreignKeys.map(fk => this.getAvailableValues(fk, schemaName));
    await Promise.all(promises);
  }

  /**
   * Clears the foreign key cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache key for a foreign key
   *
   * @param foreignKey - Foreign key constraint
   * @param schemaName - Schema name
   * @returns Cache key
   */
  private getCacheKey(foreignKey: ForeignKeySchema, schemaName: string): string {
    const referencedSchema = foreignKey.referencedSchema || schemaName;
    const referencedColumn = foreignKey.referencedColumn || '';
    return `${referencedSchema}.${foreignKey.referencedTable}.${referencedColumn}`;
  }

  /**
   * Gets statistics about cached foreign keys
   */
  getCacheStats(): {
    totalKeys: number;
    entries: Array<{ key: string; valueCount: number; age: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, cache]) => ({
      key,
      valueCount: cache.values.length,
      age: Date.now() - cache.timestamp
    }));

    return {
      totalKeys: this.cache.size,
      entries
    };
  }
}
