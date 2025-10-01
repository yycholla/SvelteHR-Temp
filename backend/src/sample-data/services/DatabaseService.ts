/**
 * Database Service
 *
 * Handles all database connection and query operations for the sample data system.
 * Provides connection pooling, transaction management, and query execution with retry logic.
 */

import pgPromise from 'pg-promise';
import { DatabaseError } from '../models/Errors';

const pgp = pgPromise();

/**
 * Database connection configuration.
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Maximum number of connections in pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Query result interface.
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Database service for managing PostgreSQL connections and queries.
 */
export class DatabaseService {
  private config: DatabaseConfig;
  private db: pgPromise.IDatabase<any> | null = null;
  private isConnected = false;

  constructor(config: DatabaseConfig) {
    this.config = {
      ...config,
      max: config.max ?? 10,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5000
    };
  }

  /**
   * Connects to the database.
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.db = pgp({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.max,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis
      });

      // Test connection
      await this.db.connect();
      this.isConnected = true;
    } catch (error) {
      throw new DatabaseError(
        `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`,
        'CONNECTION_FAILED'
      );
    }
  }

  /**
   * Disconnects from the database.
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.db) {
      return;
    }

    try {
      // Mark as disconnected first
      this.isConnected = false;
      const dbToClose = this.db;
      this.db = null;

      // Close the database connection pool
      if (dbToClose && dbToClose.$pool) {
        // Use timeout to prevent hanging
        await Promise.race([
          dbToClose.$pool.end(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
          )
        ]);
      }
    } catch (error) {
      // Don't throw on disconnect errors, just log and continue
      console.error('Warning: Failed to disconnect cleanly:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Executes a SQL query.
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Query result
   */
  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    this.ensureConnected();

    try {
      const result = await this.db!.any(sql, params);
      return {
        rows: result,
        rowCount: result.length
      };
    } catch (error) {
      const err = error as any;
      throw new DatabaseError(
        `Query failed: ${err.message || String(error)}`,
        err.code || 'QUERY_FAILED',
        sql
      );
    }
  }

  /**
   * Executes a query that returns a single row.
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Single row or null
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    this.ensureConnected();

    try {
      const result = await this.db!.oneOrNone(sql, params);
      return result;
    } catch (error) {
      const err = error as any;
      throw new DatabaseError(
        `Query failed: ${err.message || String(error)}`,
        err.code || 'QUERY_FAILED',
        sql
      );
    }
  }

  /**
   * Executes multiple queries in a transaction.
   *
   * @param callback - Transaction callback
   * @returns Transaction result
   */
  async transaction<T>(callback: (tx: pgPromise.ITask<any>) => Promise<T>): Promise<T> {
    this.ensureConnected();

    try {
      return await this.db!.tx(callback);
    } catch (error) {
      const err = error as any;
      throw new DatabaseError(
        `Transaction failed: ${err.message || String(error)}`,
        err.code || 'TRANSACTION_FAILED'
      );
    }
  }

  /**
   * Executes a batch insert operation.
   *
   * @param table - Table name (can be "schema.table" or just "table")
   * @param columns - Column names
   * @param values - Array of value arrays or objects
   * @returns Number of rows inserted
   */
  async batchInsert(table: string, columns: string[], values: any[][] | any[]): Promise<number> {
    this.ensureConnected();

    if (values.length === 0) {
      return 0;
    }

    try {
      // Convert array of arrays to array of objects if needed
      let records = values;
      if (Array.isArray(values[0])) {
        // Convert [[v1, v2], [v3, v4]] to [{col1: v1, col2: v2}, {col1: v3, col2: v4}]
        records = (values as any[][]).map(row =>
          Object.fromEntries(columns.map((col, idx) => [col, row[idx]]))
        );
      }

      // Create column set - table can include schema (e.g., "schema.table")
      const columnSet = new pgp.helpers.ColumnSet(columns, { table });
      const query = pgp.helpers.insert(records, columnSet);

      await this.db!.none(query);
      return values.length;
    } catch (error) {
      const err = error as any;
      throw new DatabaseError(
        `Batch insert failed: ${err.message || String(error)}`,
        err.code || 'BATCH_INSERT_FAILED'
      );
    }
  }

  /**
   * Executes a batch upsert (insert or update) operation.
   *
   * @param table - Table name (can be "schema.table" or just "table")
   * @param columns - Column names
   * @param values - Array of value arrays or objects
   * @param conflictColumns - Columns to check for conflicts
   * @param updateColumns - Columns to update on conflict
   * @returns Number of rows affected
   */
  async batchUpsert(
    table: string,
    columns: string[],
    values: any[][] | any[],
    conflictColumns: string[],
    updateColumns: string[]
  ): Promise<number> {
    this.ensureConnected();

    if (values.length === 0) {
      return 0;
    }

    try {
      // Convert array of arrays to array of objects if needed
      let records = values;
      if (Array.isArray(values[0])) {
        records = (values as any[][]).map(row =>
          Object.fromEntries(columns.map((col, idx) => [col, row[idx]]))
        );
      }

      // Create column set - table can include schema (e.g., "schema.table")
      const columnSet = new pgp.helpers.ColumnSet(columns, { table });
      const query =
        pgp.helpers.insert(records, columnSet) +
        ` ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ` +
        updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ');

      await this.db!.none(query);
      return values.length;
    } catch (error) {
      const err = error as any;
      throw new DatabaseError(
        `Batch upsert failed: ${err.message || String(error)}`,
        err.code || 'BATCH_UPSERT_FAILED'
      );
    }
  }

  /**
   * Gets the number of active connections in the pool.
   */
  async getActiveConnections(): Promise<number> {
    if (!this.isConnected || !this.db) {
      return 0;
    }

    try {
      const result = await this.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM pg_stat_activity WHERE datname = $1',
        [this.config.database]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Tests the database connection.
   *
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the PostgreSQL server version.
   */
  async getServerVersion(): Promise<string> {
    this.ensureConnected();

    try {
      const result = await this.queryOne<{ version: string }>('SELECT version() as version');
      return result?.version || 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Checks if a table exists in the database.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns True if table exists
   */
  async tableExists(schemaName: string, tableName: string): Promise<boolean> {
    this.ensureConnected();

    try {
      const result = await this.queryOne<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = $2
        ) as exists`,
        [schemaName, tableName]
      );
      return result?.exists ?? false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the row count for a table.
   * Uses pg_class statistics for better performance on large tables.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @returns Row count (approximate)
   */
  async getTableRowCount(schemaName: string, tableName: string): Promise<number> {
    this.ensureConnected();

    try {
      // Use pg_class for fast approximate count
      const result = await this.queryOne<{ reltuples: number }>(
        `SELECT c.reltuples::bigint as reltuples
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = $1 AND c.relname = $2`,
        [schemaName, tableName]
      );
      return result?.reltuples || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Deletes records from a table based on a condition.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @param condition - WHERE clause condition
   * @param params - Query parameters
   * @returns Number of rows deleted
   */
  async deleteRecords(
    schemaName: string,
    tableName: string,
    condition: string,
    params?: any[]
  ): Promise<number> {
    this.ensureConnected();

    try {
      const sql = `DELETE FROM ${schemaName}.${tableName} WHERE ${condition}`;
      const result = await this.db!.result(sql, params);
      return result.rowCount;
    } catch (error) {
      const err = error as any;
      throw new DatabaseError(
        `Delete failed: ${err.message || String(error)}`,
        err.code || 'DELETE_FAILED'
      );
    }
  }

  /**
   * Truncates a table.
   *
   * @param schemaName - Schema name
   * @param tableName - Table name
   * @param cascade - Whether to cascade truncate
   */
  async truncateTable(schemaName: string, tableName: string, cascade = false): Promise<void> {
    this.ensureConnected();

    try {
      const sql = `TRUNCATE TABLE ${schemaName}.${tableName} ${cascade ? 'CASCADE' : ''}`;
      await this.db!.none(sql);
    } catch (error) {
      const err = error as any;
      throw new DatabaseError(
        `Truncate failed: ${err.message || String(error)}`,
        err.code || 'TRUNCATE_FAILED'
      );
    }
  }

  /**
   * Ensures the database is connected.
   *
   * @throws {DatabaseError} If not connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.db) {
      throw new DatabaseError('Database not connected', 'NOT_CONNECTED');
    }
  }

  /**
   * Gets the underlying pg-promise database instance.
   *
   * @returns Database instance
   */
  getDatabase(): pgPromise.IDatabase<any> {
    this.ensureConnected();
    return this.db!;
  }

  /**
   * Gets connection status.
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }
}
