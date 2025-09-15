/**
 * Type definitions for Hasura Migration Library
 */

// Re-export main types that are already defined in index.ts
export type {
  MigrationConfig,
  Migration,
  HasuraMetadata,
  PerformanceConfig,
  IndexDefinition,
  ConstraintDefinition,
  PolicyDefinition,
  MigrationStatus
} from './index';

// Additional utility types for migration management

export interface MigrationPlan {
  migrations: Migration[];
  totalSteps: number;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  breakingChanges: string[];
  dependencies: MigrationDependency[];
}

export interface MigrationDependency {
  migrationId: string;
  dependsOn: string[];
  reason: string;
}

export interface MigrationExecutionResult {
  migrationId: string;
  success: boolean;
  executionTime: number;
  error?: Error;
  performanceMetrics?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  queryExecutionTimes: { [query: string]: number };
  indexUsage: { [index: string]: number };
  tableScans: { [table: string]: number };
  lockWaitTime: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'syntax' | 'dependency' | 'conflict' | 'performance';
  message: string;
  migrationId?: string;
  line?: number;
}

export interface ValidationWarning {
  type: 'performance' | 'compatibility' | 'convention';
  message: string;
  migrationId?: string;
  severity: 'low' | 'medium' | 'high';
}

// Hasura-specific types

export interface HasuraTable {
  table: {
    schema: string;
    name: string;
  };
  is_enum?: boolean;
  configuration?: {
    custom_root_fields?: {
      select?: string;
      select_by_pk?: string;
      select_aggregate?: string;
      insert?: string;
      insert_one?: string;
      update?: string;
      update_by_pk?: string;
      delete?: string;
      delete_by_pk?: string;
    };
    custom_column_names?: { [column: string]: string };
  };
}

export interface HasuraRelationship {
  name: string;
  using: {
    foreign_key_constraint_on?: string;
    manual_configuration?: {
      remote_table: {
        schema: string;
        name: string;
      };
      column_mapping: { [local: string]: string };
    };
  };
  comment?: string;
}

export interface HasuraPermission {
  role: string;
  permission: {
    columns: string[] | '*';
    filter?: any;
    check?: any;
    set?: { [column: string]: any };
    limit?: number;
    allow_aggregations?: boolean;
  };
  comment?: string;
}

export interface HasuraComputedField {
  name: string;
  definition: {
    function: {
      schema: string;
      name: string;
    };
    table_argument?: string;
    session_argument?: string;
  };
  comment?: string;
}

export interface HasuraFunction {
  function: {
    schema: string;
    name: string;
  };
  configuration?: {
    custom_root_fields?: {
      function?: string;
      function_aggregate?: string;
    };
    custom_name?: string;
    session_argument?: string;
  };
}

export interface HasuraAction {
  name: string;
  definition: {
    handler: string;
    output_type?: string;
    arguments?: Array<{
      name: string;
      type: string;
    }>;
    type?: 'query' | 'mutation';
    headers?: Array<{
      name: string;
      value: string;
      value_from_env?: string;
    }>;
    forward_client_headers?: boolean;
    timeout?: number;
  };
  permissions?: Array<{
    role: string;
  }>;
  comment?: string;
}

export interface HasuraTrigger {
  name: string;
  definition: {
    webhook: string;
    retry_conf?: {
      num_retries?: number;
      interval_sec?: number;
      timeout_sec?: number;
    };
    headers?: Array<{
      name: string;
      value: string;
      value_from_env?: string;
    }>;
    replace?: boolean;
  };
}

// Migration execution context types

export interface MigrationContext {
  environment: 'development' | 'staging' | 'production';
  version: string;
  timestamp: Date;
  executorId: string;
  dryRun: boolean;
  rollbackMode: boolean;
}

export interface MigrationLock {
  id: number;
  migrationId: string;
  lockedAt: Date;
  lockedBy: string;
  expiresAt: Date;
}

// Performance analysis types

export interface QueryPerformanceAnalysis {
  query: string;
  executionTime: number;
  planningTime: number;
  totalCost: number;
  actualRows: number;
  estimatedRows: number;
  indexesUsed: string[];
  fullScans: boolean;
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  type: 'index' | 'query_rewrite' | 'schema_change';
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  sql?: string;
}

// Schema comparison types

export interface SchemaComparison {
  tables: {
    added: string[];
    removed: string[];
    modified: SchemaTableDiff[];
  };
  columns: {
    added: SchemaColumnDiff[];
    removed: SchemaColumnDiff[];
    modified: SchemaColumnDiff[];
  };
  indexes: {
    added: SchemaIndexDiff[];
    removed: SchemaIndexDiff[];
    modified: SchemaIndexDiff[];
  };
  constraints: {
    added: SchemaConstraintDiff[];
    removed: SchemaConstraintDiff[];
    modified: SchemaConstraintDiff[];
  };
}

export interface SchemaTableDiff {
  name: string;
  changes: {
    name?: { from: string; to: string };
    owner?: { from: string; to: string };
  };
}

export interface SchemaColumnDiff {
  table: string;
  name: string;
  changes?: {
    type?: { from: string; to: string };
    nullable?: { from: boolean; to: boolean };
    default?: { from: any; to: any };
  };
}

export interface SchemaIndexDiff {
  name: string;
  table: string;
  changes?: {
    columns?: { from: string[]; to: string[] };
    unique?: { from: boolean; to: boolean };
    where?: { from: string; to: string };
  };
}

export interface SchemaConstraintDiff {
  name: string;
  table: string;
  type: string;
  changes?: {
    definition?: { from: string; to: string };
  };
}

// Error types

export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly migrationId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
    public readonly migrationId?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class PerformanceError extends Error {
  constructor(
    message: string,
    public readonly metrics: PerformanceMetrics,
    public readonly migrationId?: string
  ) {
    super(message);
    this.name = 'PerformanceError';
  }
}

export class LockTimeoutError extends Error {
  constructor(
    message: string,
    public readonly migrationId: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'LockTimeoutError';
  }
}

// Utility types

export type MigrationDirection = 'up' | 'down';
export type MigrationStatus = 'pending' | 'running' | 'applied' | 'failed' | 'rolled_back';
export type ValidationSeverity = 'error' | 'warning' | 'info';

// Configuration validation types

export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Export utility functions type signatures

export type MigrationValidator = (migration: Migration) => Promise<ValidationResult>;
export type PerformanceAnalyzer = (migration: Migration) => Promise<PerformanceMetrics>;
export type SchemaComparator = (before: any, after: any) => SchemaComparison;