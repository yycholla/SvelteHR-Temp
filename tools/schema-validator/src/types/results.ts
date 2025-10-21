/**
 * Validation result types
 */

import type { FieldAlignment } from './models.js';

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Validation passed (all aligned) */
  passed: boolean;
  /** Timestamp of validation */
  timestamp: Date;
  /** Duration in milliseconds */
  durationMs: number;
  /** Field alignments */
  alignments: FieldAlignment[];
  /** Summary statistics */
  summary: ValidationSummary;
  /** Errors encountered */
  errors: ValidationError[];
  /** Warnings (non-blocking) */
  warnings: ValidationWarning[];
  /** Cache usage information */
  cacheInfo: CacheInfo;
}

/**
 * Validation summary statistics
 */
export interface ValidationSummary {
  /** Total fields checked */
  totalFields: number;
  /** Number of aligned fields */
  alignedCount: number;
  /** Number of misaligned fields */
  misalignedCount: number;
  /** Breakdown by status */
  byStatus: {
    aligned: number;
    missing_db: number;
    missing_api: number;
    type_mismatch: number;
    nullability_mismatch: number;
  };
  /** Files processed */
  filesProcessed: number;
  /** Operations extracted */
  operationsExtracted: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field path that caused error */
  fieldPath: string;
  /** Source location */
  location: SourceLocation;
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Suggested fix */
  suggestion?: string | undefined;
  /** Additional context */
  context?: Record<string, unknown> | undefined;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Field path */
  fieldPath?: string | undefined;
  /** Source location */
  location?: SourceLocation | undefined;
  /** Warning category */
  category: 'performance' | 'deprecation' | 'best_practice' | 'computed_field';
}

/**
 * Source code location
 */
export interface SourceLocation {
  /** File path */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column number (1-indexed) */
  column: number;
  /** Source code snippet */
  snippet?: string | undefined;
}

/**
 * Cache usage information
 */
export interface CacheInfo {
  /** Whether database cache was used */
  databaseCacheHit: boolean;
  /** Whether API cache was used */
  apiCacheHit: boolean;
  /** Whether operations cache was used */
  operationsCacheHit: boolean;
  /** Cache age in seconds */
  cacheAge?: number | undefined;
  /** Cache invalidation reason (if any) */
  invalidationReason?: string | undefined;
}

/**
 * Enum validation result
 */
export interface EnumValidationResult {
  /** Enum name */
  enumName: string;
  /** Whether enum is valid */
  valid: boolean;
  /** Missing values in database */
  missingInDb: string[];
  /** Extra values in database */
  extraInDb: string[];
  /** Missing values in API */
  missingInApi: string[];
  /** Extra values in API */
  extraInApi: string[];
}

/**
 * Type comparison result
 */
export interface TypeComparisonResult {
  /** Whether types are compatible */
  compatible: boolean;
  /** GraphQL type */
  graphqlType: string;
  /** Database type */
  dbType: string;
  /** API type */
  apiType: string;
  /** Incompatibility reason */
  reason?: string | undefined;
  /** Whether nullability matches */
  nullabilityMatches: boolean;
  /** Whether list types match */
  listTypesMatch: boolean;
}

/**
 * Field validation result for a single field
 */
export interface FieldValidationResult {
  /** Field path */
  fieldPath: string;
  /** Whether field is valid */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Type comparison result */
  typeComparison?: TypeComparisonResult | undefined;
}
