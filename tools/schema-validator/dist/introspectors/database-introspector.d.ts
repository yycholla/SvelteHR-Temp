/**
 * Database Introspector - PostgreSQL schema introspection
 * TypeScript-native implementation using pg library
 * Note: Production version could use Rust+sqlx for performance
 */
import type { DatabaseColumn } from '../types/models.js';
/**
 * Database Introspector class
 * Connects to PostgreSQL and introspects table/column metadata
 */
export declare class DatabaseIntrospector {
  private connectionString;
  private connected;
  constructor(connectionString: string);
  /**
   * Connect to database
   * Note: Using dynamic import to avoid bundling pg in browser environments
   */
  connect(): Promise<void>;
  /**
   * Disconnect from database
   */
  disconnect(): Promise<void>;
  /**
   * Get all tables in public schema
   */
  getTables(): Promise<string[]>;
  /**
   * Get all columns for specified tables (or all tables if not specified)
   */
  getColumns(tableFilter?: string[]): Promise<DatabaseColumn[]>;
  /**
   * Get enum types from database
   */
  getEnumTypes(): Promise<Map<string, string[]>>;
  /**
   * Introspect full database schema
   */
  introspectSchema(tableFilter?: string[]): Promise<DatabaseColumn[]>;
  /**
   * Map PostgreSQL type to GraphQL type
   * @private
   */
  private mapPgTypeToGraphQL;
  /**
   * Execute a query against the database
   * @private
   */
  private executeQuery;
  /**
   * Ensure database is connected
   * @private
   */
  private ensureConnected;
}
//# sourceMappingURL=database-introspector.d.ts.map
