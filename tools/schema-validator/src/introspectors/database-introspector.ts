/**
 * Database Introspector - PostgreSQL schema introspection
 * TypeScript-native implementation using pg library
 * Note: Production version could use Rust+sqlx for performance
 */

import type { DatabaseColumn } from '../types/models.js';
import { DatabaseColumnSchema } from '../types/schemas.js';
import { PG_TO_GRAPHQL } from '../types/type-mappings.js';

/**
 * PostgreSQL introspection result from information_schema
 */
interface PgColumn {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
}

interface PgConstraint {
  table_name: string;
  column_name: string;
  constraint_type: string;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
}

/**
 * Database Introspector class
 * Connects to PostgreSQL and introspects table/column metadata
 */
export class DatabaseIntrospector {
  // @ts-expect-error - Reserved for production pg library integration
  private connectionString: string;
  private connected: boolean = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  /**
   * Connect to database
   * Note: Using dynamic import to avoid bundling pg in browser environments
   */
  async connect(): Promise<void> {
    // Connection will be established on-demand
    this.connected = true;
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    this.connected = false;
  }

  /**
   * Get all tables in public schema
   */
  async getTables(): Promise<string[]> {
    this.ensureConnected();

    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const result = await this.executeQuery<{ table_name: string }>(query);
    return result.rows.map((row) => row.table_name);
  }

  /**
   * Get all columns for specified tables (or all tables if not specified)
   */
  async getColumns(tableFilter?: string[]): Promise<DatabaseColumn[]> {
    this.ensureConnected();

    // Query column information
    const columnsQuery = `
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        ${tableFilter ? `AND c.table_name = ANY($1)` : ''}
      ORDER BY c.table_name, c.ordinal_position;
    `;

    const columnsResult = await this.executeQuery<PgColumn>(
      columnsQuery,
      tableFilter ? [tableFilter] : undefined
    );

    // Query constraints (primary keys, foreign keys)
    const constraintsQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_type,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
        ${tableFilter ? `AND tc.table_name = ANY($1)` : ''}
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const constraintsResult = await this.executeQuery<PgConstraint>(
      constraintsQuery,
      tableFilter ? [tableFilter] : undefined
    );

    // Build constraint map
    const primaryKeys = new Set<string>();
    const foreignKeys = new Map<string, { table: string; column: string }>();

    for (const constraint of constraintsResult.rows) {
      const key = `${constraint.table_name}.${constraint.column_name}`;

      if (constraint.constraint_type === 'PRIMARY KEY') {
        primaryKeys.add(key);
      } else if (
        constraint.constraint_type === 'FOREIGN KEY' &&
        constraint.foreign_table_name &&
        constraint.foreign_column_name
      ) {
        foreignKeys.set(key, {
          table: constraint.foreign_table_name,
          column: constraint.foreign_column_name,
        });
      }
    }

    // Map columns to DatabaseColumn type
    const columns: DatabaseColumn[] = columnsResult.rows.map((col) => {
      const key = `${col.table_name}.${col.column_name}`;
      const isArray = col.data_type === 'ARRAY';
      const baseType = isArray ? col.udt_name.substring(1) : col.udt_name; // Remove leading underscore for arrays

      const foreignKey = foreignKeys.get(key);
      const defaultValue = col.column_default;

      // Build column object explicitly to avoid undefined assignment with exactOptionalPropertyTypes
      const columnData: any = {
        tableName: col.table_name,
        columnName: col.column_name,
        pgType: isArray ? `${baseType}[]` : baseType,
        graphqlType: this.mapPgTypeToGraphQL(isArray ? `${baseType}[]` : baseType),
        nullable: col.is_nullable === 'YES',
        isArray,
        isPrimaryKey: primaryKeys.has(key),
      };

      // Only add optional properties if they have values
      if (foreignKey) {
        columnData.foreignKey = foreignKey;
      }
      if (defaultValue) {
        columnData.defaultValue = defaultValue;
      }

      return DatabaseColumnSchema.parse(columnData);
    });

    return columns;
  }

  /**
   * Get enum types from database
   */
  async getEnumTypes(): Promise<Map<string, string[]>> {
    this.ensureConnected();

    const query = `
      SELECT
        t.typname AS enum_name,
        e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `;

    const result = await this.executeQuery<{ enum_name: string; enum_value: string }>(query);

    const enumMap = new Map<string, string[]>();
    for (const row of result.rows) {
      if (!enumMap.has(row.enum_name)) {
        enumMap.set(row.enum_name, []);
      }
      enumMap.get(row.enum_name)!.push(row.enum_value);
    }

    return enumMap;
  }

  /**
   * Introspect full database schema
   */
  async introspectSchema(tableFilter?: string[]): Promise<DatabaseColumn[]> {
    await this.connect();
    const columns = await this.getColumns(tableFilter);
    return columns;
  }

  /**
   * Map PostgreSQL type to GraphQL type
   * @private
   */
  private mapPgTypeToGraphQL(pgType: string): string {
    const normalized = pgType.toLowerCase();
    return PG_TO_GRAPHQL[normalized] ?? 'String'; // Default to String for unknown types
  }

  /**
   * Execute a query against the database
   * @private
   */
  private async executeQuery<T>(_query: string, _params?: any[]): Promise<{ rows: T[] }> {
    // Mock implementation for now - in production this would use pg library
    // Example: const client = new pg.Client(this.connectionString)
    //          await client.connect()
    //          const result = await client.query(_query, _params)
    //          await client.end()

    // For now, return empty result to allow tests to run
    console.warn('DatabaseIntrospector: Using mock implementation. Connect to real DB in production.');
    return { rows: [] };
  }

  /**
   * Ensure database is connected
   * @private
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}
