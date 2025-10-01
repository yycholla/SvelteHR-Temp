/**
 * Contract Test: Error Classes
 *
 * This test validates the error class contracts.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect } from '@jest/globals';

// This import will fail initially - that's expected for TDD
import {
  SampleDataError,
  ValidationError,
  DatabaseError,
  ConfigurationError,
  SchemaDiscoveryError,
  DataGenerationError,
  CLIError,
  ErrorCode,
  ErrorSeverity,
  ErrorContext
} from '../../src/sample-data/models/Errors';

describe('SampleDataError Contract', () => {
  test('should extend Error class', () => {
    const error = new SampleDataError('Test error');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SampleDataError).toBe(true);
    expect(error.name).toBe('SampleDataError');
  });

  test('should have all required properties', () => {
    const error = new SampleDataError(
      'Sample data generation failed',
      ErrorCode.GENERATION_FAILED,
      ErrorSeverity.HIGH
    );

    // Validate property existence and types
    expect(typeof error.message).toBe('string');
    expect(typeof error.code).toBe('string');
    expect(typeof error.severity).toBe('string');
    expect(typeof error.timestamp).toBe('object');
    expect(error.timestamp instanceof Date).toBe(true);
  });

  test('should validate error message is non-empty string', () => {
    const error = new SampleDataError('Database connection failed');

    expect(error.message).toBeTruthy();
    expect(error.message.length).toBeGreaterThan(0);
  });

  test('should support optional properties', () => {
    const errorWithContext = new SampleDataError(
      'Validation failed',
      ErrorCode.VALIDATION_FAILED,
      ErrorSeverity.MEDIUM,
      {
        tableName: 'employees',
        recordId: '123',
        fieldName: 'email'
      }
    );

    const errorWithoutContext = new SampleDataError('Simple error');

    expect(errorWithContext.context).toBeDefined();
    expect(errorWithContext.context?.tableName).toBe('employees');
    expect(errorWithoutContext.context).toBeUndefined();
  });

  test('should set default values correctly', () => {
    const basicError = new SampleDataError('Basic error message');

    expect(basicError.code).toBe(ErrorCode.UNKNOWN);
    expect(basicError.severity).toBe(ErrorSeverity.MEDIUM);
    expect(basicError.timestamp instanceof Date).toBe(true);
  });

  test('should support error serialization', () => {
    const error = new SampleDataError(
      'Serialization test',
      ErrorCode.VALIDATION_FAILED,
      ErrorSeverity.HIGH,
      { testProp: 'testValue' }
    );

    const serialized = error.toJSON();

    expect(typeof serialized).toBe('object');
    expect(serialized.message).toBe(error.message);
    expect(serialized.code).toBe(error.code);
    expect(serialized.severity).toBe(error.severity);
    expect(serialized.context).toEqual(error.context);
  });
});

describe('ValidationError Contract', () => {
  test('should extend SampleDataError', () => {
    const error = new ValidationError('Validation failed');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SampleDataError).toBe(true);
    expect(error instanceof ValidationError).toBe(true);
    expect(error.name).toBe('ValidationError');
  });

  test('should have validation-specific properties', () => {
    const error = new ValidationError(
      'Invalid email format',
      'employees',
      'email',
      'invalid-email@'
    );

    expect(error.tableName).toBe('employees');
    expect(error.fieldName).toBe('email');
    expect(error.invalidValue).toBe('invalid-email@');
    expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  test('should support optional field and value properties', () => {
    const tableError = new ValidationError('Table validation failed', 'users');
    const fieldError = new ValidationError('Field validation failed', 'employees', 'age');

    expect(tableError.tableName).toBe('users');
    expect(tableError.fieldName).toBeUndefined();
    expect(tableError.invalidValue).toBeUndefined();

    expect(fieldError.tableName).toBe('employees');
    expect(fieldError.fieldName).toBe('age');
    expect(fieldError.invalidValue).toBeUndefined();
  });

  test('should validate tableName is non-empty string', () => {
    const error = new ValidationError('Test error', 'valid_table');

    expect(error.tableName).toBeTruthy();
    expect(error.tableName.length).toBeGreaterThan(0);
  });
});

describe('DatabaseError Contract', () => {
  test('should extend SampleDataError', () => {
    const error = new DatabaseError('Database connection failed');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SampleDataError).toBe(true);
    expect(error instanceof DatabaseError).toBe(true);
    expect(error.name).toBe('DatabaseError');
  });

  test('should have database-specific properties', () => {
    const error = new DatabaseError(
      'Connection timeout',
      'CONNECTION_TIMEOUT',
      'SELECT * FROM employees'
    );

    expect(error.sqlState).toBe('CONNECTION_TIMEOUT');
    expect(error.query).toBe('SELECT * FROM employees');
    expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
  });

  test('should support optional properties', () => {
    const simpleError = new DatabaseError('Simple database error');
    const detailedError = new DatabaseError(
      'Constraint violation',
      'FOREIGN_KEY_VIOLATION',
      'INSERT INTO employees ...'
    );

    expect(simpleError.sqlState).toBeUndefined();
    expect(simpleError.query).toBeUndefined();

    expect(detailedError.sqlState).toBe('FOREIGN_KEY_VIOLATION');
    expect(detailedError.query).toBe('INSERT INTO employees ...');
  });

  test('should handle connection and query errors', () => {
    const connectionError = new DatabaseError(
      'Failed to connect to database',
      'CONNECTION_FAILED'
    );

    const queryError = new DatabaseError(
      'Invalid SQL syntax',
      'SYNTAX_ERROR',
      'SELCT * FROM users'
    );

    expect(connectionError.sqlState).toBe('CONNECTION_FAILED');
    expect(queryError.sqlState).toBe('SYNTAX_ERROR');
    expect(queryError.query).toBe('SELCT * FROM users');
  });
});

describe('ConfigurationError Contract', () => {
  test('should extend SampleDataError', () => {
    const error = new ConfigurationError('Invalid configuration');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SampleDataError).toBe(true);
    expect(error instanceof ConfigurationError).toBe(true);
    expect(error.name).toBe('ConfigurationError');
  });

  test('should have configuration-specific properties', () => {
    const error = new ConfigurationError(
      'Invalid seed value',
      'sample-data.json',
      'config.seed'
    );

    expect(error.configFile).toBe('sample-data.json');
    expect(error.configPath).toBe('config.seed');
    expect(error.code).toBe(ErrorCode.CONFIGURATION_INVALID);
  });

  test('should support optional properties', () => {
    const simpleError = new ConfigurationError('Configuration error');
    const detailedError = new ConfigurationError(
      'Missing required property',
      '/path/to/config.json',
      'tableConfigs[0].tableName'
    );

    expect(simpleError.configFile).toBeUndefined();
    expect(simpleError.configPath).toBeUndefined();

    expect(detailedError.configFile).toBe('/path/to/config.json');
    expect(detailedError.configPath).toBe('tableConfigs[0].tableName');
  });

  test('should handle different configuration error types', () => {
    const missingFileError = new ConfigurationError(
      'Configuration file not found',
      'missing-config.json'
    );

    const invalidValueError = new ConfigurationError(
      'Invalid batch size',
      'config.json',
      'batchSize'
    );

    expect(missingFileError.configFile).toBe('missing-config.json');
    expect(invalidValueError.configPath).toBe('batchSize');
  });
});

describe('SchemaDiscoveryError Contract', () => {
  test('should extend SampleDataError', () => {
    const error = new SchemaDiscoveryError('Schema discovery failed');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SampleDataError).toBe(true);
    expect(error instanceof SchemaDiscoveryError).toBe(true);
    expect(error.name).toBe('SchemaDiscoveryError');
  });

  test('should have schema-specific properties', () => {
    const error = new SchemaDiscoveryError(
      'Table not found',
      'hr_public',
      'non_existent_table'
    );

    expect(error.schemaName).toBe('hr_public');
    expect(error.tableName).toBe('non_existent_table');
    expect(error.code).toBe(ErrorCode.SCHEMA_DISCOVERY_FAILED);
  });

  test('should support optional properties', () => {
    const schemaError = new SchemaDiscoveryError(
      'Schema not accessible',
      'private_schema'
    );

    const tableError = new SchemaDiscoveryError(
      'Table structure invalid',
      'public',
      'corrupted_table'
    );

    expect(schemaError.schemaName).toBe('private_schema');
    expect(schemaError.tableName).toBeUndefined();

    expect(tableError.schemaName).toBe('public');
    expect(tableError.tableName).toBe('corrupted_table');
  });

  test('should handle different discovery error scenarios', () => {
    const permissionError = new SchemaDiscoveryError(
      'Insufficient permissions to access schema',
      'restricted_schema'
    );

    const structureError = new SchemaDiscoveryError(
      'Invalid table structure',
      'hr_public',
      'malformed_table'
    );

    expect(permissionError.schemaName).toBe('restricted_schema');
    expect(structureError.tableName).toBe('malformed_table');
  });
});

describe('DataGenerationError Contract', () => {
  test('should extend SampleDataError', () => {
    const error = new DataGenerationError('Data generation failed');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SampleDataError).toBe(true);
    expect(error instanceof DataGenerationError).toBe(true);
    expect(error.name).toBe('DataGenerationError');
  });

  test('should have generation-specific properties', () => {
    const error = new DataGenerationError(
      'Failed to generate employee data',
      'employees',
      25
    );

    expect(error.tableName).toBe('employees');
    expect(error.recordIndex).toBe(25);
    expect(error.code).toBe(ErrorCode.GENERATION_FAILED);
  });

  test('should support optional properties', () => {
    const tableError = new DataGenerationError(
      'Table generation failed',
      'departments'
    );

    const recordError = new DataGenerationError(
      'Record generation failed',
      'users',
      42
    );

    expect(tableError.tableName).toBe('departments');
    expect(tableError.recordIndex).toBeUndefined();

    expect(recordError.tableName).toBe('users');
    expect(recordError.recordIndex).toBe(42);
  });

  test('should handle different generation error types', () => {
    const fakerError = new DataGenerationError(
      'Faker.js seed initialization failed',
      'all_tables'
    );

    const constraintError = new DataGenerationError(
      'Foreign key constraint violation',
      'employee_roles',
      15
    );

    expect(fakerError.tableName).toBe('all_tables');
    expect(constraintError.recordIndex).toBe(15);
  });
});

describe('CLIError Contract', () => {
  test('should extend SampleDataError', () => {
    const error = new CLIError('CLI command failed');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof SampleDataError).toBe(true);
    expect(error instanceof CLIError).toBe(true);
    expect(error.name).toBe('CLIError');
  });

  test('should have CLI-specific properties', () => {
    const error = new CLIError(
      'Invalid command arguments',
      'generate-sample-data',
      1
    );

    expect(error.command).toBe('generate-sample-data');
    expect(error.exitCode).toBe(1);
    expect(error.code).toBe(ErrorCode.CLI_ERROR);
  });

  test('should support optional properties', () => {
    const simpleError = new CLIError('CLI error occurred');

    const detailedError = new CLIError(
      'Command execution failed',
      'validate-config',
      2
    );

    expect(simpleError.command).toBeUndefined();
    expect(simpleError.exitCode).toBeUndefined();

    expect(detailedError.command).toBe('validate-config');
    expect(detailedError.exitCode).toBe(2);
  });

  test('should handle different CLI error scenarios', () => {
    const argumentError = new CLIError(
      'Missing required argument',
      'clean-sample-data',
      1
    );

    const executionError = new CLIError(
      'Command execution timeout',
      'generate-sample-data',
      124
    );

    expect(argumentError.command).toBe('clean-sample-data');
    expect(argumentError.exitCode).toBe(1);

    expect(executionError.command).toBe('generate-sample-data');
    expect(executionError.exitCode).toBe(124);
  });
});

describe('ErrorCode Contract', () => {
  test('should have all expected error code values', () => {
    expect(ErrorCode.UNKNOWN).toBe('UNKNOWN');
    expect(ErrorCode.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR');
    expect(ErrorCode.CONFIGURATION_INVALID).toBe('CONFIGURATION_INVALID');
    expect(ErrorCode.SCHEMA_DISCOVERY_FAILED).toBe('SCHEMA_DISCOVERY_FAILED');
    expect(ErrorCode.GENERATION_FAILED).toBe('GENERATION_FAILED');
    expect(ErrorCode.CLI_ERROR).toBe('CLI_ERROR');
  });

  test('should use error codes in error classes', () => {
    const validationError = new ValidationError('Test', 'table');
    const databaseError = new DatabaseError('Test');
    const configError = new ConfigurationError('Test');

    expect(validationError.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(databaseError.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(configError.code).toBe(ErrorCode.CONFIGURATION_INVALID);
  });
});

describe('ErrorSeverity Contract', () => {
  test('should have all expected severity values', () => {
    expect(ErrorSeverity.LOW).toBe('low');
    expect(ErrorSeverity.MEDIUM).toBe('medium');
    expect(ErrorSeverity.HIGH).toBe('high');
    expect(ErrorSeverity.CRITICAL).toBe('critical');
  });

  test('should use severity values in error classes', () => {
    const lowError = new SampleDataError('Test', ErrorCode.UNKNOWN, ErrorSeverity.LOW);
    const criticalError = new SampleDataError('Test', ErrorCode.DATABASE_ERROR, ErrorSeverity.CRITICAL);

    expect(lowError.severity).toBe(ErrorSeverity.LOW);
    expect(criticalError.severity).toBe(ErrorSeverity.CRITICAL);
  });
});

describe('ErrorContext Contract', () => {
  test('should support optional context properties', () => {
    const context: ErrorContext = {
      tableName: 'employees',
      recordId: '123',
      fieldName: 'email',
      operation: 'insert',
      additionalInfo: { retryCount: 3 }
    };

    expect(context.tableName).toBe('employees');
    expect(context.recordId).toBe('123');
    expect(context.fieldName).toBe('email');
    expect(context.operation).toBe('insert');
    expect(context.additionalInfo?.retryCount).toBe(3);
  });

  test('should support minimal context', () => {
    const minimalContext: ErrorContext = {
      tableName: 'users'
    };

    expect(minimalContext.tableName).toBe('users');
    expect(minimalContext.recordId).toBeUndefined();
    expect(minimalContext.fieldName).toBeUndefined();
  });

  test('should support context in error classes', () => {
    const error = new SampleDataError(
      'Context test',
      ErrorCode.VALIDATION_FAILED,
      ErrorSeverity.MEDIUM,
      {
        tableName: 'departments',
        operation: 'update',
        additionalInfo: { timestamp: new Date() }
      }
    );

    expect(error.context?.tableName).toBe('departments');
    expect(error.context?.operation).toBe('update');
    expect(error.context?.additionalInfo?.timestamp instanceof Date).toBe(true);
  });
});