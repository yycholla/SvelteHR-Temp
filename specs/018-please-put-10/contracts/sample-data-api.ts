/**
 * API Contract: Sample Data Generation System
 *
 * TypeScript interfaces defining the API contracts for sample data generation.
 * These contracts must be implemented and tested before any implementation begins.
 */

export interface SampleDataConfig {
  /** Fixed seed for deterministic generation */
  seed: number;
  /** Configuration for each database table */
  tableConfigs: TableConfig[];
  /** Number of records to insert per batch */
  batchSize: number;
  /** Enable progress reporting during generation */
  progressReporting: boolean;
}

export interface TableConfig {
  /** Database table name */
  tableName: string;
  /** Number of sample records to generate */
  recordCount: number;
  /** Processing priority for dependency ordering */
  priority: TablePriority;
  /** Pattern for sample identification */
  namingPattern: string;
  /** Custom field overrides for specific data */
  customFields: Record<string, any>;
  /** Skip generation if sample data already exists */
  skipIfExists: boolean;
}

export enum TablePriority {
  CORE = 1,      // Core tables (users, departments, roles) - 50 records
  SECONDARY = 2, // Related tables (employees, permissions) - 30 records
  AUXILIARY = 3, // Feature tables (reviews, goals, leave) - 20 records
  SUPPORTING = 4 // Metadata tables (templates, policies) - 10 records
}

export interface DatabaseSchema {
  /** All discovered tables */
  tables: TableSchema[];
  /** Foreign key relationships */
  relationships: ForeignKeyRelation[];
  /** Database constraints */
  constraints: TableConstraint[];
  /** Custom enum types */
  enums: EnumDefinition[];
}

export interface TableSchema {
  /** Table name */
  name: string;
  /** Column definitions */
  columns: ColumnSchema[];
  /** Primary key column names */
  primaryKey: string[];
  /** Foreign key definitions */
  foreignKeys: ForeignKeyDefinition[];
  /** Table constraint names */
  constraints: string[];
}

export interface ColumnSchema {
  /** Column name */
  name: string;
  /** PostgreSQL data type */
  type: string;
  /** Can accept null values */
  nullable: boolean;
  /** Default value if specified */
  defaultValue: any;
  /** Is custom enum type */
  isEnum: boolean;
  /** Enum values if applicable */
  enumValues?: string[];
}

export interface ForeignKeyRelation {
  /** Source table name */
  fromTable: string;
  /** Source column name */
  fromColumn: string;
  /** Target table name */
  toTable: string;
  /** Target column name */
  toColumn: string;
  /** Delete cascade behavior */
  onDelete: string;
  /** Update cascade behavior */
  onUpdate: string;
}

export interface SampleDataResult {
  /** Overall operation success */
  success: boolean;
  /** Successfully processed tables */
  tablesProcessed: string[];
  /** Total records created */
  recordsCreated: number;
  /** Total records updated */
  recordsUpdated: number;
  /** Any errors encountered */
  errors: GenerationError[];
  /** Operation duration in milliseconds */
  duration: number;
  /** Operation completion time */
  timestamp: Date;
}

export interface GenerationError {
  /** Table where error occurred */
  table: string;
  /** Operation that failed */
  operation: 'insert' | 'update' | 'validate' | 'discover';
  /** Human-readable error message */
  message: string;
  /** Original SQL error if applicable */
  sqlError?: string;
  /** Record data that caused error */
  recordData?: any;
}

export interface TableConstraint {
  /** Constraint name */
  name: string;
  /** Constraint type */
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  /** Table name */
  tableName: string;
  /** Column names involved */
  columns: string[];
  /** Constraint definition */
  definition: string;
}

export interface EnumDefinition {
  /** Enum type name */
  name: string;
  /** Enum values */
  values: string[];
  /** Schema name */
  schema: string;
}

export interface ForeignKeyDefinition {
  /** Constraint name */
  name: string;
  /** Source column names */
  columns: string[];
  /** Referenced table */
  referencedTable: string;
  /** Referenced column names */
  referencedColumns: string[];
  /** Delete action */
  onDelete: string;
  /** Update action */
  onUpdate: string;
}

// API Endpoint Contracts

/**
 * POST /api/sample-data/generate
 * Generate sample data for all configured tables
 */
export interface GenerateSampleDataRequest {
  /** Configuration for sample data generation */
  config?: Partial<SampleDataConfig>;
  /** Force regeneration even if data exists */
  force?: boolean;
  /** Specific tables to generate (empty = all tables) */
  tables?: string[];
}

export interface GenerateSampleDataResponse {
  /** Generation result */
  result: SampleDataResult;
  /** Current configuration used */
  config: SampleDataConfig;
}

/**
 * GET /api/sample-data/schema
 * Discover and return database schema information
 */
export interface DiscoverSchemaResponse {
  /** Discovered schema information */
  schema: DatabaseSchema;
  /** Schema discovery timestamp */
  discoveredAt: Date;
  /** Number of tables found */
  tableCount: number;
}

/**
 * GET /api/sample-data/config
 * Get current sample data configuration
 */
export interface GetConfigResponse {
  /** Current configuration */
  config: SampleDataConfig;
  /** Default table configurations */
  defaultTableConfigs: TableConfig[];
}

/**
 * PUT /api/sample-data/config
 * Update sample data configuration
 */
export interface UpdateConfigRequest {
  /** Updated configuration */
  config: SampleDataConfig;
}

export interface UpdateConfigResponse {
  /** Updated configuration */
  config: SampleDataConfig;
  /** Validation results */
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * DELETE /api/sample-data/clean
 * Remove all sample data from database
 */
export interface CleanSampleDataRequest {
  /** Confirm deletion with specific tables */
  confirmTables?: string[];
  /** Only dry run to see what would be deleted */
  dryRun?: boolean;
}

export interface CleanSampleDataResponse {
  /** Cleanup operation result */
  success: boolean;
  /** Tables that were cleaned */
  tablesAffected: string[];
  /** Number of records removed */
  recordsRemoved: number;
  /** Operation duration */
  duration: number;
  /** Any errors during cleanup */
  errors: GenerationError[];
}

/**
 * GET /api/sample-data/status
 * Get current sample data status and statistics
 */
export interface SampleDataStatusResponse {
  /** Whether sample data exists */
  hasSampleData: boolean;
  /** Statistics per table */
  tableStats: Array<{
    tableName: string;
    sampleRecords: number;
    totalRecords: number;
    lastGenerated?: Date;
  }>;
  /** Overall statistics */
  overallStats: {
    totalSampleRecords: number;
    totalTables: number;
    tablesWithSampleData: number;
    lastGenerationRun?: Date;
  };
}

// CLI Command Contracts

/**
 * CLI Command: generate-sample-data
 * Command-line interface for sample data generation
 */
export interface CLIGenerateOptions {
  /** Configuration file path */
  config?: string;
  /** Specific tables to generate */
  tables?: string[];
  /** Force regeneration */
  force?: boolean;
  /** Batch size override */
  batchSize?: number;
  /** Disable progress reporting */
  quiet?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
}

/**
 * CLI Command: clean-sample-data
 * Command-line interface for sample data cleanup
 */
export interface CLICleanOptions {
  /** Specific tables to clean */
  tables?: string[];
  /** Force cleanup without confirmation */
  force?: boolean;
  /** Dry run mode */
  dryRun?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * CLI Command: validate-schema
 * Command-line interface for schema validation
 */
export interface CLIValidateOptions {
  /** Configuration file to validate */
  config?: string;
  /** Check table dependencies */
  checkDependencies?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

// Error Types

export class SampleDataError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'SampleDataError';
  }
}

export class SchemaDiscoveryError extends SampleDataError {
  constructor(message: string, details?: any) {
    super(message, 'SCHEMA_DISCOVERY_ERROR', details);
  }
}

export class DataGenerationError extends SampleDataError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_GENERATION_ERROR', details);
  }
}

export class ValidationError extends SampleDataError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class DatabaseError extends SampleDataError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
  }
}