/**
 * Schema Discovery Service
 *
 * Discovers and analyzes database schema structure including tables, columns,
 * foreign keys, indexes, and relationships. Provides intelligent ordering
 * for data generation based on dependencies.
 */

import { DatabaseService } from './DatabaseService';
import {
  DatabaseSchema,
  TableSchema,
  ColumnSchema,
  ForeignKeySchema,
  IndexSchema,
  SchemaMetadata,
  getTableDependencyOrder
} from '../models/DatabaseSchema';
import { SchemaDiscoveryError } from '../models/Errors';

/**
 * Schema discovery service for analyzing database structure.
 */
export class SchemaDiscoveryService {
  private databaseService: DatabaseService;
  private cache: Map<string, DatabaseSchema> = new Map();

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
  }

  /**
   * Discovers the complete schema structure.
   *
   * @param schemaName - Name of the schema to discover
   * @param useCache - Whether to use cached results
   * @returns Discovered database schema
   */
  async discoverSchema(schemaName: string, useCache = true): Promise<DatabaseSchema> {
    if (useCache && this.cache.has(schemaName)) {
      return this.cache.get(schemaName)!;
    }

    try {
      const startTime = Date.now();

      // Get all tables in the schema
      const tables = await this.discoverTables(schemaName);

      // Get server version
      const serverVersion = await this.databaseService.getServerVersion();

      const schema: DatabaseSchema = {
        schemaName,
        tables: tables.tables,
        metadata: {
          discoveredAt: new Date(),
          tableCount: tables.tables.length,
          version: '1.0.0',
          serverVersion,
          warnings: []
        }
      };

      const endTime = Date.now();
      console.log(`Schema discovery completed in ${endTime - startTime}ms`);

      // Cache the result
      this.cache.set(schemaName, schema);

      return schema;
    } catch (error) {
      throw new SchemaDiscoveryError(
        `Failed to discover schema '${schemaName}': ${error instanceof Error ? error.message : String(error)}`,
        schemaName
      );
    }
  }

  /**
   * Discovers specific tables in a schema.
   *
   * @param schemaName - Schema name
   * @param tableNames - Optional array of specific table names to discover
   * @returns Partial database schema with specified tables
   */
  async discoverTables(schemaName: string, tableNames?: string[]): Promise<DatabaseSchema> {
    const tables: TableSchema[] = [];

    try {
      // Get table list
      const tableListQuery = tableNames
        ? `SELECT table_name FROM information_schema.tables
           WHERE table_schema = $1 AND table_name = ANY($2)
           ORDER BY table_name`
        : `SELECT table_name FROM information_schema.tables
           WHERE table_schema = $1
           ORDER BY table_name`;

      const tableListParams = tableNames ? [schemaName, tableNames] : [schemaName];
      const tableListResult = await this.databaseService.query<{ table_name: string }>(
        tableListQuery,
        tableListParams
      );

      // Discover each table
      for (const row of tableListResult.rows) {
        const table = await this.discoverTable(schemaName, row.table_name);
        tables.push(table);
      }

      return {
        schemaName,
        tables,
        metadata: {
          discoveredAt: new Date(),
          tableCount: tables.length,
          version: '1.0.0'
        }
      };
    } catch (error) {
      throw new SchemaDiscoveryError(
        `Failed to discover tables in schema '${schemaName}': ${error instanceof Error ? error.message : String(error)}`,
        schemaName
      );
    }
  }

  /**
   * Discovers a single table structure.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns Table schema
   */
  async discoverTable(schemaName: string, tableName: string): Promise<TableSchema> {
    try {
      // Discover columns
      const columns = await this.discoverColumns(schemaName, tableName);

      // Discover primary keys
      const primaryKeys = await this.discoverPrimaryKeys(schemaName, tableName);

      // Discover foreign keys
      const foreignKeys = await this.discoverForeignKeys(schemaName, tableName);

      // Discover indexes
      const indexes = await this.discoverIndexes(schemaName, tableName);

      // Get estimated row count
      const estimatedRowCount = await this.databaseService.getTableRowCount(schemaName, tableName);

      return {
        tableName,
        columns,
        primaryKeys,
        foreignKeys,
        indexes,
        estimatedRowCount
      };
    } catch (error) {
      throw new SchemaDiscoveryError(
        `Failed to discover table '${tableName}': ${error instanceof Error ? error.message : String(error)}`,
        schemaName,
        tableName
      );
    }
  }

  /**
   * Discovers columns for a table.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns Array of column schemas
   */
  private async discoverColumns(schemaName: string, tableName: string): Promise<ColumnSchema[]> {
    const query = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;

    const result = await this.databaseService.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
    }>(query, [schemaName, tableName]);

    return result.rows.map(row => ({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      maxLength: row.character_maximum_length,
      precision: row.numeric_precision ?? undefined,
      scale: row.numeric_scale ?? undefined
    }));
  }

  /**
   * Discovers primary keys for a table.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns Array of primary key column names
   */
  private async discoverPrimaryKeys(schemaName: string, tableName: string): Promise<string[]> {
    const query = `
      SELECT a.attname as column_name
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass
        AND i.indisprimary
      ORDER BY a.attnum
    `;

    const fullTableName = `${schemaName}.${tableName}`;
    const result = await this.databaseService.query<{ column_name: string }>(query, [
      fullTableName
    ]);

    return result.rows.map(row => row.column_name);
  }

  /**
   * Discovers foreign keys for a table.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns Array of foreign key schemas
   */
  private async discoverForeignKeys(
    schemaName: string,
    tableName: string
  ): Promise<ForeignKeySchema[]> {
    const query = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
    `;

    const result = await this.databaseService.query<{
      constraint_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
      update_rule: string;
      delete_rule: string;
    }>(query, [schemaName, tableName]);

    return result.rows.map(row => ({
      constraintName: row.constraint_name,
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
      onUpdate: row.update_rule,
      onDelete: row.delete_rule
    }));
  }

  /**
   * Discovers indexes for a table.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns Array of index schemas
   */
  private async discoverIndexes(schemaName: string, tableName: string): Promise<IndexSchema[]> {
    const query = `
      SELECT
        i.relname as index_name,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary,
        am.amname as index_type,
        ARRAY_AGG(a.attname ORDER BY a.attnum) as column_names
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)
      GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname
      ORDER BY i.relname
    `;

    const result = await this.databaseService.query<{
      index_name: string;
      is_unique: boolean;
      is_primary: boolean;
      index_type: string;
      column_names: string[];
    }>(query, [tableName, schemaName]);

    return result.rows.map(row => ({
      indexName: row.index_name,
      columnNames: row.column_names,
      isUnique: row.is_unique,
      isPrimary: row.is_primary,
      indexType: row.index_type
    }));
  }

  /**
   * Gets the recommended generation order for tables based on dependencies.
   *
   * @param schemaName - Schema name
   * @returns Ordered array of table names
   */
  async getGenerationOrder(schemaName: string): Promise<string[]> {
    const schema = await this.discoverSchema(schemaName);
    return getTableDependencyOrder(schema);
  }

  /**
   * Clears the schema cache.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validates that required tables exist in the schema.
   *
   * @param schemaName - Schema name
   * @param requiredTables - Array of required table names
   * @throws {SchemaDiscoveryError} If any required tables are missing
   */
  async validateRequiredTables(schemaName: string, requiredTables: string[]): Promise<void> {
    const schema = await this.discoverSchema(schemaName);
    const existingTables = new Set(schema.tables.map(t => t.tableName));

    const missingTables = requiredTables.filter(table => !existingTables.has(table));

    if (missingTables.length > 0) {
      throw new SchemaDiscoveryError(
        `Missing required tables: ${missingTables.join(', ')}`,
        schemaName
      );
    }
  }
}
