/**
 * Schema Validator - Main orchestrator for schema alignment validation
 * Coordinates GraphQL parsing, database introspection, API introspection, and type comparison
 */
import type { SchemaValidatorConfig } from '../types/config.js';
import type { ValidationResult } from '../types/results.js';
/**
 * Schema Validator class
 * Main entry point for schema validation
 */
export declare class SchemaValidator {
  private _config;
  private parser;
  private dbIntrospector;
  private apiIntrospector;
  private typeComparator;
  constructor(config: SchemaValidatorConfig);
  /**
   * Validate complete schema alignment
   * Full validation workflow: parse → introspect → compare
   */
  validate(): Promise<ValidationResult>;
  /**
   * Validate specific files (incremental validation)
   */
  validateFiles(filePaths: string[]): Promise<ValidationResult>;
  /**
   * Check cache status (fast validation using cached data)
   */
  checkCache(): Promise<ValidationResult | null>;
  /**
   * Clear validation cache
   */
  clearCache(): Promise<void>;
  /**
   * Parse GraphQL operations from configured paths
   * @private
   */
  private parseOperations;
  /**
   * Introspect database schema
   * @private
   */
  private introspectDatabase;
  /**
   * Introspect API schema
   * @private
   */
  private introspectApi;
  /**
   * Validate field alignments
   * @private
   */
  private validateAlignments;
  /**
   * Validate a single field
   * @private
   */
  private validateField;
  /**
   * Calculate summary statistics
   * @private
   */
  private calculateSummary;
  /**
   * Get error code for alignment status
   * @private
   */
  private getErrorCode;
}
//# sourceMappingURL=schema-validator.d.ts.map
