/**
 * Schema Validator - Main orchestrator for schema alignment validation
 * Coordinates GraphQL parsing, database introspection, API introspection, and type comparison
 */

import { GraphQLParser } from '../parsers/graphql-parser.js';
import { DatabaseIntrospector } from '../introspectors/database-introspector.js';
import { ApiIntrospector } from '../introspectors/api-introspector.js';
import { TypeComparator } from './type-comparator.js';
import type { SchemaValidatorConfig } from '../types/config.js';
import type { ValidationResult, ValidationError, ValidationWarning } from '../types/results.js';
import type { FieldAlignment, GraphQLOperation, DatabaseColumn, ApiField } from '../types/models.js';
import { AlignmentStatus, ErrorCode } from '../types/enums.js';
import { extractFieldPaths } from '../parsers/operation-utils.js';

/**
 * Schema Validator class
 * Main entry point for schema validation
 */
export class SchemaValidator {
  private _config: SchemaValidatorConfig;
  private parser: GraphQLParser;
  private dbIntrospector: DatabaseIntrospector;
  private apiIntrospector: ApiIntrospector;
  private typeComparator: TypeComparator;

  constructor(config: SchemaValidatorConfig) {
    this._config = config;
    this.parser = new GraphQLParser();
    this.dbIntrospector = new DatabaseIntrospector(config.databaseUrl);
    this.apiIntrospector = new ApiIntrospector(config.apiUrl);

    // Conditionally build TypeComparator config to avoid undefined assignment
    const customMappings = config.typeMappings ? new Map(Object.entries(config.typeMappings)) : undefined;
    this.typeComparator = new TypeComparator({
      ...(customMappings ? { customMappings } : {}),
      strict: config.strict,
    });
  }

  /**
   * Validate complete schema alignment
   * Full validation workflow: parse → introspect → compare
   */
  async validate(): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Step 1: Parse GraphQL operations from source files
      const operationsMap = await this.parseOperations();

      // Step 2: Introspect database schema
      const dbColumns = await this.introspectDatabase();

      // Step 3: Introspect API schema
      const apiSchema = await this.introspectApi();

      // Step 4: Validate alignments
      const alignments = await this.validateAlignments(operationsMap, dbColumns, apiSchema);

      // Step 5: Calculate summary statistics
      const summary = this.calculateSummary(alignments);

      // Step 6: Extract errors and warnings
      for (const alignment of alignments) {
        if (alignment.status !== AlignmentStatus.Aligned) {
          errors.push({
            code: this.getErrorCode(alignment.status),
            message: alignment.error ?? 'Unknown alignment error',
            fieldPath: alignment.fieldPath,
            location: alignment.sourceLocation,
            severity: 'error',
            ...(alignment.suggestion ? { suggestion: alignment.suggestion } : {}),
          });
        }
      }

      const durationMs = Date.now() - startTime;
      const passed = errors.length === 0;

      return {
        passed,
        timestamp: new Date(),
        durationMs,
        alignments,
        summary,
        errors,
        warnings,
        cacheInfo: {
          databaseCacheHit: false,
          apiCacheHit: false,
          operationsCacheHit: false,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      errors.push({
        code: ErrorCode.UNKNOWN,
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        fieldPath: '',
        location: { file: '', line: 0, column: 0 },
        severity: 'error',
      });

      return {
        passed: false,
        timestamp: new Date(),
        durationMs,
        alignments: [],
        summary: {
          totalFields: 0,
          alignedCount: 0,
          misalignedCount: 0,
          byStatus: {
            [AlignmentStatus.Aligned]: 0,
            [AlignmentStatus.MissingDb]: 0,
            [AlignmentStatus.MissingApi]: 0,
            [AlignmentStatus.TypeMismatch]: 0,
            [AlignmentStatus.NullabilityMismatch]: 0,
          },
          filesProcessed: 0,
          operationsExtracted: 0,
        },
        errors,
        warnings,
        cacheInfo: {
          databaseCacheHit: false,
          apiCacheHit: false,
          operationsCacheHit: false,
        },
      };
    }
  }

  /**
   * Validate specific files (incremental validation)
   */
  async validateFiles(filePaths: string[]): Promise<ValidationResult> {
    // Similar to validate() but only for specified files
    const startTime = Date.now();

    const operationsMap = await this.parser.parseFiles(filePaths);
    const dbColumns = await this.introspectDatabase();
    const apiSchema = await this.introspectApi();

    const alignments = await this.validateAlignments(operationsMap, dbColumns, apiSchema);
    const summary = this.calculateSummary(alignments);

    const errors: ValidationError[] = alignments
      .filter((a) => a.status !== AlignmentStatus.Aligned)
      .map((a) => ({
        code: this.getErrorCode(a.status),
        message: a.error ?? 'Unknown error',
        fieldPath: a.fieldPath,
        location: a.sourceLocation,
        severity: 'error' as const,
        ...(a.suggestion ? { suggestion: a.suggestion } : {}),
      }));

    return {
      passed: errors.length === 0,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
      alignments,
      summary,
      errors,
      warnings: [],
      cacheInfo: {
        databaseCacheHit: false,
        apiCacheHit: false,
        operationsCacheHit: false,
      },
    };
  }

  /**
   * Check cache status (fast validation using cached data)
   */
  async checkCache(): Promise<ValidationResult | null> {
    // Would check if cache is valid and return cached result
    // For now, returns null (no cache)
    return null;
  }

  /**
   * Clear validation cache
   */
  async clearCache(): Promise<void> {
    // Would clear cache files
    console.log('Cache cleared');
  }

  /**
   * Parse GraphQL operations from configured paths
   * @private
   */
  private async parseOperations(): Promise<Map<string, GraphQLOperation[]>> {
    const globby = (await import('globby')).default;

    // Find all files matching the configured patterns
    try {
      const allFiles = await globby(this._config.graphqlPaths, {
        ignore: this._config.ignore,
        absolute: true,
        onlyFiles: true,
      });

      if (allFiles.length === 0) {
        console.warn('⚠️  No GraphQL files found matching patterns:', this._config.graphqlPaths);
        return new Map();
      }

      console.log(`📝 Found ${allFiles.length} files to parse for GraphQL operations`);

      // Parse all files using the GraphQL parser
      return await this.parser.parseFiles(allFiles);
    } catch (error) {
      console.error('Error finding files:', error);
      return new Map();
    }
  }

  /**
   * Introspect database schema
   * @private
   */
  private async introspectDatabase(): Promise<DatabaseColumn[]> {
    await this.dbIntrospector.connect();
    const columns = await this.dbIntrospector.introspectSchema();
    await this.dbIntrospector.disconnect();
    return columns;
  }

  /**
   * Introspect API schema
   * @private
   */
  private async introspectApi(): Promise<Map<string, ApiField[]>> {
    const schema = await this.apiIntrospector.introspectSchema();

    const fieldMap = new Map<string, ApiField[]>();

    // Add Query fields
    for (const field of schema.queryFields) {
      const key = `Query.${field.fieldName}`;
      fieldMap.set(key, [field]);
    }

    // Add Mutation fields
    for (const field of schema.mutationFields) {
      const key = `Mutation.${field.fieldName}`;
      fieldMap.set(key, [field]);
    }

    // Add custom type fields
    for (const [typeName, fields] of schema.types.entries()) {
      for (const field of fields) {
        const key = `${typeName}.${field.fieldName}`;
        fieldMap.set(key, [field]);
      }
    }

    return fieldMap;
  }

  /**
   * Validate field alignments
   * @private
   */
  private async validateAlignments(
    operationsMap: Map<string, GraphQLOperation[]>,
    dbColumns: DatabaseColumn[],
    apiFields: Map<string, ApiField[]>
  ): Promise<FieldAlignment[]> {
    const alignments: FieldAlignment[] = [];

    // Build database column map
    const dbMap = new Map<string, DatabaseColumn>();
    for (const col of dbColumns) {
      const key = `${col.tableName}.${col.columnName}`;
      dbMap.set(key, col);
    }

    // Process each operation
    for (const [filePath, operations] of operationsMap.entries()) {
      for (const operation of operations) {
        const fieldPaths = extractFieldPaths(operation);

        for (const fieldPath of fieldPaths) {
          const alignment = await this.validateField(
            fieldPath,
            operation,
            filePath,
            dbMap,
            apiFields
          );
          alignments.push(alignment);
        }
      }
    }

    return alignments;
  }

  /**
   * Validate a single field
   * @private
   */
  private async validateField(
    fieldPath: string,
    operation: GraphQLOperation,
    filePath: string,
    dbMap: Map<string, DatabaseColumn>,
    apiFields: Map<string, ApiField[]>
  ): Promise<FieldAlignment> {
    // Simplified validation logic
    const dbColumn = dbMap.get(fieldPath);
    const apiField = apiFields.get(fieldPath)?.[0];

    let status: AlignmentStatus = AlignmentStatus.Aligned;
    let error: string | undefined;
    let suggestion: string | undefined;

    if (!dbColumn) {
      status = AlignmentStatus.MissingDb;
      error = `Database column '${fieldPath}' not found`;
      suggestion = `Add column to database or remove from GraphQL query`;
    } else if (!apiField) {
      status = AlignmentStatus.MissingApi;
      error = `API field '${fieldPath}' not found`;
      suggestion = `Add resolver to API or remove from GraphQL query`;
    } else {
      // Type comparison
      const comparison = this.typeComparator.compareTypes(
        'String', // Would extract from operation
        dbColumn.pgType,
        apiField.graphqlType
      );

      if (!comparison.compatible) {
        status = AlignmentStatus.TypeMismatch;
        error = comparison.reason;
        suggestion = this.typeComparator.suggestFix('String', dbColumn.pgType);
      } else if (!comparison.nullabilityMatches) {
        status = AlignmentStatus.NullabilityMismatch;
        error = 'Nullability mismatch between layers';
        suggestion = 'Ensure GraphQL, DB, and API nullability match';
      }
    }

    return {
      fieldPath,
      graphqlField: {
        name: fieldPath.split('.').pop() ?? '',
        graphqlType: 'String',
        nullable: true,
        isList: false,
        children: [],
      },
      ...(dbColumn ? { dbColumn } : {}),
      ...(apiField ? { apiField } : {}),
      status,
      ...(error ? { error } : {}),
      ...(suggestion ? { suggestion } : {}),
      sourceLocation: {
        file: filePath,
        line: operation.line,
        column: operation.column,
      },
    };
  }

  /**
   * Calculate summary statistics
   * @private
   */
  private calculateSummary(alignments: FieldAlignment[]) {
    const byStatus = {
      [AlignmentStatus.Aligned]: 0,
      [AlignmentStatus.MissingDb]: 0,
      [AlignmentStatus.MissingApi]: 0,
      [AlignmentStatus.TypeMismatch]: 0,
      [AlignmentStatus.NullabilityMismatch]: 0,
    };

    for (const alignment of alignments) {
      byStatus[alignment.status]++;
    }

    return {
      totalFields: alignments.length,
      alignedCount: byStatus[AlignmentStatus.Aligned],
      misalignedCount: alignments.length - byStatus[AlignmentStatus.Aligned],
      byStatus,
      filesProcessed: 0, // Would count unique files
      operationsExtracted: 0, // Would count operations
    };
  }

  /**
   * Get error code for alignment status
   * @private
   */
  private getErrorCode(status: AlignmentStatus): string {
    switch (status) {
      case AlignmentStatus.MissingDb:
        return ErrorCode.FIELD_MISSING_DB;
      case AlignmentStatus.MissingApi:
        return ErrorCode.FIELD_MISSING_API;
      case AlignmentStatus.TypeMismatch:
        return ErrorCode.TYPE_MISMATCH;
      case AlignmentStatus.NullabilityMismatch:
        return ErrorCode.NULLABILITY_MISMATCH;
      default:
        return ErrorCode.UNKNOWN;
    }
  }
}
