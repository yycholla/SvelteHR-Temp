/**
 * Error Classes for Sample Data System
 *
 * Defines custom error types for different failure scenarios in the sample data generation system.
 * All errors extend the base SampleDataError class for consistent error handling.
 */

/**
 * Error codes for categorizing different error types.
 */
export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_INVALID = 'CONFIGURATION_INVALID',
  SCHEMA_DISCOVERY_FAILED = 'SCHEMA_DISCOVERY_FAILED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  CLI_ERROR = 'CLI_ERROR'
}

/**
 * Error severity levels.
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error context for providing additional debugging information.
 */
export interface ErrorContext {
  /** Table name where error occurred */
  tableName?: string;

  /** Record ID that caused the error */
  recordId?: string;

  /** Field name that failed validation */
  fieldName?: string;

  /** Operation being performed when error occurred */
  operation?: string;

  /** Any additional context information */
  additionalInfo?: Record<string, any>;
}

/**
 * Base error class for all sample data errors.
 */
export class SampleDataError extends Error {
  /** Error code for categorization */
  public readonly code: ErrorCode;

  /** Error severity level */
  public readonly severity: ErrorSeverity;

  /** When the error occurred */
  public readonly timestamp: Date;

  /** Additional context about the error */
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext
  ) {
    super(message);
    this.name = 'SampleDataError';
    this.code = code;
    this.severity = severity;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SampleDataError);
    }
  }

  /**
   * Serializes the error to JSON.
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Returns a human-readable string representation.
   */
  toString(): string {
    let str = `[${this.code}] ${this.message}`;

    if (this.context?.tableName) {
      str += ` (table: ${this.context.tableName})`;
    }

    if (this.context?.fieldName) {
      str += ` (field: ${this.context.fieldName})`;
    }

    return str;
  }
}

/**
 * Error for validation failures.
 */
export class ValidationError extends SampleDataError {
  /** Table name where validation failed */
  public readonly tableName?: string;

  /** Field name that failed validation */
  public readonly fieldName?: string;

  /** Invalid value that caused the error */
  public readonly invalidValue?: any;

  constructor(message: string, tableName?: string, fieldName?: string, invalidValue?: any) {
    const context: ErrorContext = {
      tableName,
      fieldName,
      additionalInfo: invalidValue !== undefined ? { invalidValue } : undefined
    };

    super(message, ErrorCode.VALIDATION_FAILED, ErrorSeverity.MEDIUM, context);
    this.name = 'ValidationError';
    this.tableName = tableName;
    this.fieldName = fieldName;
    this.invalidValue = invalidValue;
  }
}

/**
 * Error for database operation failures.
 */
export class DatabaseError extends SampleDataError {
  /** SQL state code */
  public readonly sqlState?: string;

  /** Query that caused the error */
  public readonly query?: string;

  constructor(message: string, sqlState?: string, query?: string) {
    const context: ErrorContext = {
      additionalInfo: {
        sqlState,
        query
      }
    };

    super(message, ErrorCode.DATABASE_ERROR, ErrorSeverity.HIGH, context);
    this.name = 'DatabaseError';
    this.sqlState = sqlState;
    this.query = query;
  }
}

/**
 * Error for configuration-related issues.
 */
export class ConfigurationError extends SampleDataError {
  /** Configuration file path */
  public readonly configFile?: string;

  /** Configuration property path that's invalid */
  public readonly configPath?: string;

  constructor(message: string, configFile?: string, configPath?: string) {
    const context: ErrorContext = {
      additionalInfo: {
        configFile,
        configPath
      }
    };

    super(message, ErrorCode.CONFIGURATION_INVALID, ErrorSeverity.HIGH, context);
    this.name = 'ConfigurationError';
    this.configFile = configFile;
    this.configPath = configPath;
  }
}

/**
 * Error for schema discovery failures.
 */
export class SchemaDiscoveryError extends SampleDataError {
  /** Schema name that failed to be discovered */
  public readonly schemaName?: string;

  /** Table name that failed to be discovered */
  public readonly tableName?: string;

  constructor(message: string, schemaName?: string, tableName?: string) {
    const context: ErrorContext = {
      tableName,
      additionalInfo: {
        schemaName
      }
    };

    super(message, ErrorCode.SCHEMA_DISCOVERY_FAILED, ErrorSeverity.HIGH, context);
    this.name = 'SchemaDiscoveryError';
    this.schemaName = schemaName;
    this.tableName = tableName;
  }
}

/**
 * Error for data generation failures.
 */
export class DataGenerationError extends SampleDataError {
  /** Table name where generation failed */
  public readonly tableName?: string;

  /** Record index that failed to generate */
  public readonly recordIndex?: number;

  constructor(message: string, tableName?: string, recordIndex?: number) {
    const context: ErrorContext = {
      tableName,
      additionalInfo: {
        recordIndex
      }
    };

    super(message, ErrorCode.GENERATION_FAILED, ErrorSeverity.MEDIUM, context);
    this.name = 'DataGenerationError';
    this.tableName = tableName;
    this.recordIndex = recordIndex;
  }
}

/**
 * Error for CLI command failures.
 */
export class CLIError extends SampleDataError {
  /** Command name that failed */
  public readonly command?: string;

  /** Exit code for the error */
  public readonly exitCode?: number;

  constructor(message: string, command?: string, exitCode?: number) {
    const context: ErrorContext = {
      additionalInfo: {
        command,
        exitCode
      }
    };

    super(message, ErrorCode.CLI_ERROR, ErrorSeverity.MEDIUM, context);
    this.name = 'CLIError';
    this.command = command;
    this.exitCode = exitCode;
  }
}

/**
 * Creates an error from a generic Error object.
 *
 * @param error - Generic error object
 * @param code - Error code to assign
 * @returns SampleDataError instance
 */
export function createErrorFromGeneric(error: Error, code?: ErrorCode): SampleDataError {
  if (error instanceof SampleDataError) {
    return error;
  }

  return new SampleDataError(error.message, code || ErrorCode.UNKNOWN, ErrorSeverity.MEDIUM);
}

/**
 * Determines if an error is retryable.
 *
 * @param error - Error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: SampleDataError): boolean {
  // Connection errors and timeouts are typically retryable
  if (error instanceof DatabaseError) {
    const retryableSqlStates = [
      'CONNECTION_FAILED',
      'CONNECTION_TIMEOUT',
      'DEADLOCK_DETECTED',
      'LOCK_TIMEOUT'
    ];

    return retryableSqlStates.some(state => error.sqlState?.includes(state));
  }

  // Most other errors are not retryable
  return false;
}

/**
 * Formats an error for logging.
 *
 * @param error - Error to format
 * @param includeStack - Whether to include stack trace
 * @returns Formatted error string
 */
export function formatErrorForLogging(error: SampleDataError, includeStack = false): string {
  const lines: string[] = [];

  lines.push(`[${error.severity.toUpperCase()}] ${error.name}: ${error.message}`);
  lines.push(`  Code: ${error.code}`);
  lines.push(`  Time: ${error.timestamp.toISOString()}`);

  if (error.context) {
    lines.push('  Context:');

    if (error.context.tableName) {
      lines.push(`    Table: ${error.context.tableName}`);
    }

    if (error.context.fieldName) {
      lines.push(`    Field: ${error.context.fieldName}`);
    }

    if (error.context.operation) {
      lines.push(`    Operation: ${error.context.operation}`);
    }

    if (error.context.additionalInfo) {
      lines.push(`    Additional Info: ${JSON.stringify(error.context.additionalInfo, null, 2)}`);
    }
  }

  if (includeStack && error.stack) {
    lines.push('  Stack Trace:');
    lines.push(error.stack.split('\n').map(line => `    ${line}`).join('\n'));
  }

  return lines.join('\n');
}

/**
 * Aggregates multiple errors into a single summary.
 *
 * @param errors - Array of errors to aggregate
 * @returns Summary string
 */
export function aggregateErrors(errors: SampleDataError[]): string {
  if (errors.length === 0) {
    return 'No errors';
  }

  const lines: string[] = [];
  lines.push(`Total Errors: ${errors.length}`);
  lines.push('');

  // Group by error type
  const errorsByType = new Map<string, SampleDataError[]>();
  for (const error of errors) {
    const existing = errorsByType.get(error.name) ?? [];
    existing.push(error);
    errorsByType.set(error.name, existing);
  }

  for (const [errorType, errorList] of errorsByType) {
    lines.push(`${errorType} (${errorList.length}):`);
    for (const error of errorList) {
      lines.push(`  - ${error.message}`);
      if (error.context?.tableName) {
        lines.push(`    Table: ${error.context.tableName}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
