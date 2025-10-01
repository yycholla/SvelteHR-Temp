/**
 * Database Schema Model
 *
 * Represents the discovered structure of a database schema including tables,
 * columns, relationships, and constraints. Used for intelligent sample data generation.
 */

/**
 * Represents a column in a database table.
 */
export interface ColumnSchema {
  /** Column name */
  columnName: string;

  /** PostgreSQL data type (e.g., 'varchar', 'integer', 'timestamp') */
  dataType: string;

  /** Whether the column allows NULL values */
  isNullable: boolean;

  /** Default value for the column (can be a literal or SQL expression) */
  defaultValue: string | null;

  /** Maximum length for string columns (NULL for non-string types) */
  maxLength: number | null;

  /** Whether this column is part of the primary key */
  isPrimaryKey?: boolean;

  /** Whether this column is unique */
  isUnique?: boolean;

  /** Numeric precision for decimal/numeric types */
  precision?: number;

  /** Numeric scale for decimal/numeric types */
  scale?: number;

  /** Whether this column is generated (computed) */
  isGenerated?: boolean;
}

/**
 * Represents a foreign key constraint.
 */
export interface ForeignKeySchema {
  /** Name of the foreign key constraint */
  constraintName: string;

  /** Column name in the current table */
  columnName: string;

  /** Referenced table name */
  referencedTable: string;

  /** Referenced column name in the target table */
  referencedColumn: string;

  /** Action on DELETE (CASCADE, RESTRICT, SET NULL, etc.) */
  onDelete: string;

  /** Action on UPDATE (CASCADE, RESTRICT, SET NULL, etc.) */
  onUpdate: string;
}

/**
 * Represents a database index.
 */
export interface IndexSchema {
  /** Index name */
  indexName: string;

  /** Columns included in the index */
  columnNames: string[];

  /** Whether this is a unique index */
  isUnique: boolean;

  /** Index type (btree, hash, gin, gist, etc.) */
  indexType?: string;

  /** Whether this is the primary key index */
  isPrimary?: boolean;
}

/**
 * Represents a complete table structure.
 */
export interface TableSchema {
  /** Table name */
  tableName: string;

  /** All columns in the table */
  columns: ColumnSchema[];

  /** Primary key column names */
  primaryKeys: string[];

  /** Foreign key constraints */
  foreignKeys: ForeignKeySchema[];

  /** Table indexes */
  indexes: IndexSchema[];

  /** Table comment/description (if available) */
  comment?: string;

  /** Row count estimate */
  estimatedRowCount?: number;
}

/**
 * Metadata about the schema discovery process.
 */
export interface SchemaMetadata {
  /** When the schema was discovered */
  discoveredAt: Date;

  /** Number of tables discovered */
  tableCount: number;

  /** Schema discovery version */
  version: string;

  /** PostgreSQL server version */
  serverVersion?: string;

  /** Any warnings encountered during discovery */
  warnings?: string[];
}

/**
 * Represents a complete database schema.
 */
export interface DatabaseSchema {
  /** Schema name (e.g., 'hr_public') */
  schemaName: string;

  /** All tables in the schema */
  tables: TableSchema[];

  /** Metadata about the discovery process */
  metadata: SchemaMetadata;
}

/**
 * Helper function to find a table by name in a schema.
 *
 * @param schema - Database schema to search
 * @param tableName - Name of the table to find
 * @returns Table schema or undefined if not found
 */
export function findTable(schema: DatabaseSchema, tableName: string): TableSchema | undefined {
  return schema.tables.find(table => table.tableName === tableName);
}

/**
 * Helper function to find a column by name in a table.
 *
 * @param table - Table schema to search
 * @param columnName - Name of the column to find
 * @returns Column schema or undefined if not found
 */
export function findColumn(table: TableSchema, columnName: string): ColumnSchema | undefined {
  return table.columns.find(col => col.columnName === columnName);
}

/**
 * Gets all tables that reference a given table through foreign keys.
 *
 * @param schema - Database schema
 * @param tableName - Name of the referenced table
 * @returns Array of table names that reference the given table
 */
export function getReferencingTables(schema: DatabaseSchema, tableName: string): string[] {
  const referencingTables = new Set<string>();

  for (const table of schema.tables) {
    for (const fk of table.foreignKeys) {
      if (fk.referencedTable === tableName) {
        referencingTables.add(table.tableName);
      }
    }
  }

  return Array.from(referencingTables);
}

/**
 * Gets all tables that a given table references through foreign keys.
 *
 * @param schema - Database schema
 * @param tableName - Name of the table to check
 * @returns Array of referenced table names
 */
export function getReferencedTables(schema: DatabaseSchema, tableName: string): string[] {
  const table = findTable(schema, tableName);
  if (!table) {
    return [];
  }

  const referencedTables = new Set<string>();
  for (const fk of table.foreignKeys) {
    referencedTables.add(fk.referencedTable);
  }

  return Array.from(referencedTables);
}

/**
 * Determines the topological order for table generation based on foreign key dependencies.
 *
 * @param schema - Database schema
 * @returns Array of table names in dependency order (tables with no dependencies first)
 */
export function getTableDependencyOrder(schema: DatabaseSchema): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(tableName: string, visiting = new Set<string>()): void {
    if (visited.has(tableName)) {
      return;
    }

    if (visiting.has(tableName)) {
      // Circular dependency detected - skip
      return;
    }

    visiting.add(tableName);

    const dependencies = getReferencedTables(schema, tableName);
    for (const dep of dependencies) {
      visit(dep, visiting);
    }

    visiting.delete(tableName);
    visited.add(tableName);
    order.push(tableName);
  }

  for (const table of schema.tables) {
    visit(table.tableName);
  }

  return order;
}

/**
 * Checks if a table has any foreign key dependencies.
 *
 * @param table - Table schema to check
 * @returns True if the table has foreign keys
 */
export function hasForeignKeys(table: TableSchema): boolean {
  return table.foreignKeys.length > 0;
}

/**
 * Gets all nullable columns in a table.
 *
 * @param table - Table schema
 * @returns Array of nullable column schemas
 */
export function getNullableColumns(table: TableSchema): ColumnSchema[] {
  return table.columns.filter(col => col.isNullable);
}

/**
 * Gets all required (non-nullable) columns in a table.
 *
 * @param table - Table schema
 * @returns Array of required column schemas
 */
export function getRequiredColumns(table: TableSchema): ColumnSchema[] {
  return table.columns.filter(col => !col.isNullable);
}

/**
 * Checks if a column is a primary key.
 *
 * @param table - Table schema
 * @param columnName - Column name to check
 * @returns True if the column is part of the primary key
 */
export function isPrimaryKeyColumn(table: TableSchema, columnName: string): boolean {
  return table.primaryKeys.includes(columnName);
}

/**
 * Checks if a column is a foreign key.
 *
 * @param table - Table schema
 * @param columnName - Column name to check
 * @returns True if the column is a foreign key
 */
export function isForeignKeyColumn(table: TableSchema, columnName: string): boolean {
  return table.foreignKeys.some(fk => fk.columnName === columnName);
}

/**
 * Gets the foreign key constraint for a given column.
 *
 * @param table - Table schema
 * @param columnName - Column name
 * @returns Foreign key schema or undefined if not a foreign key
 */
export function getForeignKeyForColumn(
  table: TableSchema,
  columnName: string
): ForeignKeySchema | undefined {
  return table.foreignKeys.find(fk => fk.columnName === columnName);
}

/**
 * Validates that a database schema has the minimum required structure.
 *
 * @param schema - Database schema to validate
 * @throws {Error} If schema is invalid
 */
export function validateDatabaseSchema(schema: DatabaseSchema): void {
  if (!schema) {
    throw new Error('Database schema is required');
  }

  if (!schema.schemaName || typeof schema.schemaName !== 'string') {
    throw new Error('Schema name is required and must be a string');
  }

  if (!Array.isArray(schema.tables)) {
    throw new Error('Tables must be an array');
  }

  if (!schema.metadata) {
    throw new Error('Schema metadata is required');
  }

  if (!(schema.metadata.discoveredAt instanceof Date)) {
    throw new Error('Discovery date must be a valid Date object');
  }

  if (typeof schema.metadata.tableCount !== 'number') {
    throw new Error('Table count must be a number');
  }

  if (schema.metadata.tableCount !== schema.tables.length) {
    throw new Error('Table count does not match number of tables');
  }
}
