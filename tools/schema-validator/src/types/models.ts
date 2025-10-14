/**
 * Core data models for schema validation
 * Implements entities from data-model.md
 */

import type { AlignmentStatus } from './enums.js';

/**
 * Represents a single GraphQL operation (query/mutation) extracted from TypeScript
 */
export interface GraphQLOperation {
  /** Operation name (e.g., "GetUsers") */
  name: string;
  /** Operation type: query | mutation | subscription */
  operationType: 'query' | 'mutation' | 'subscription';
  /** Field selections with nested structure */
  selections: FieldReference[];
  /** Variable definitions ($userId: ID!) */
  variables: VariableDefinition[];
  /** Source file path */
  filePath: string;
  /** Line number in source file */
  line: number;
  /** Column number in source file */
  column: number;
}

/**
 * Represents a field reference in a GraphQL query
 */
export interface FieldReference {
  /** Field name (e.g., "email") */
  name: string;
  /** GraphQL type (String, Int, [User!]!) */
  graphqlType: string;
  /** Whether field is nullable (! modifier) */
  nullable: boolean;
  /** Whether field is a list ([]) */
  isList: boolean;
  /** Nested field selections */
  children: FieldReference[];
  /** Field alias if used */
  alias?: string | undefined;
}

/**
 * Variable definition in GraphQL operation
 */
export interface VariableDefinition {
  /** Variable name (without $) */
  name: string;
  /** GraphQL type */
  type: string;
  /** Whether variable is nullable */
  nullable: boolean;
  /** Default value if provided */
  defaultValue?: unknown | undefined;
}

/**
 * Database column metadata from PostgreSQL introspection
 */
export interface DatabaseColumn {
  /** Table name */
  tableName: string;
  /** Column name */
  columnName: string;
  /** PostgreSQL data type (text, int4, uuid, etc.) */
  pgType: string;
  /** GraphQL equivalent type */
  graphqlType: string;
  /** Whether column allows NULL */
  nullable: boolean;
  /** Whether column is array type */
  isArray: boolean;
  /** Whether column is primary key */
  isPrimaryKey: boolean;
  /** Foreign key reference */
  foreignKey?: {
    table: string;
    column: string;
  } | undefined;
  /** Default value if any */
  defaultValue?: string | undefined;
}

/**
 * API field from async-graphql introspection
 */
export interface ApiField {
  /** Parent type (Query, Mutation, or custom type) */
  parentType: string;
  /** Field name */
  fieldName: string;
  /** GraphQL type */
  graphqlType: string;
  /** Whether field is nullable */
  nullable: boolean;
  /** Whether field returns a list */
  isList: boolean;
  /** Field arguments */
  args: ArgumentInfo[];
  /** Resolver location in Rust code */
  resolverLocation?: {
    file: string;
    line: number;
  } | undefined;
  /** Field alias (e.g., @name directive) */
  alias?: string | undefined;
}

/**
 * Field argument definition
 */
export interface ArgumentInfo {
  /** Argument name */
  name: string;
  /** GraphQL type */
  type: string;
  /** Whether argument is nullable */
  nullable: boolean;
  /** Default value if provided */
  defaultValue?: unknown | undefined;
}

/**
 * Alignment status for a single field
 */
export interface FieldAlignment {
  /** Field path (e.g., "users.email") */
  fieldPath: string;
  /** GraphQL field reference */
  graphqlField: FieldReference;
  /** Database column (if exists) */
  dbColumn?: DatabaseColumn | undefined;
  /** API field (if exists) */
  apiField?: ApiField | undefined;
  /** Alignment status */
  status: AlignmentStatus;
  /** Error message if misaligned */
  error?: string | undefined;
  /** Suggested fix */
  suggestion?: string | undefined;
  /** Source location */
  sourceLocation: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Snapshot of all schemas at a point in time
 */
export interface SchemaSnapshot {
  /** Timestamp of snapshot */
  timestamp: Date;
  /** Database schema */
  databaseSchema: DatabaseColumn[];
  /** API schema */
  apiSchema: ApiField[];
  /** Extracted GraphQL operations */
  operations: Map<string, GraphQLOperation[]>;
  /** Hash of database schema for change detection */
  databaseHash: string;
  /** Hash of API schema for change detection */
  apiHash: string;
  /** Hash of operations for change detection */
  operationsHash: string;
}

/**
 * Single validation run record
 */
export interface ValidationRun {
  /** Unique ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Run type */
  runType: 'full' | 'incremental' | 'cached';
  /** Git commit hash */
  commit?: string | undefined;
  /** Number of aligned fields */
  alignedCount: number;
  /** Number of misaligned fields */
  misalignedCount: number;
  /** Total fields checked */
  totalFields: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether validation passed */
  passed: boolean;
}

/**
 * Computed field configuration
 */
export interface ComputedFieldConfig {
  /** Field path (e.g., "User.fullName") */
  fieldPath: string;
  /** Source database columns used for computation */
  sourceColumns: string[];
  /** Resolver location in Rust code */
  resolverLocation: {
    file: string;
    line: number;
  };
  /** Description of computation */
  description: string;
  /** Return type */
  returnType: string;
}
