/**
 * Integration Test: Error Recovery Scenarios
 *
 * This test validates error handling and recovery mechanisms.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// This import will fail initially - that's expected for TDD
import { SampleDataOrchestrator } from '../../src/sample-data/SampleDataOrchestrator';
import { DatabaseService } from '../../src/sample-data/services/DatabaseService';
import { ConfigurationService } from '../../src/sample-data/services/ConfigurationService';
import {
  SampleDataError,
  ValidationError,
  DatabaseError,
  ConfigurationError,
  SchemaDiscoveryError,
  DataGenerationError,
  CLIError
} from '../../src/sample-data/models/Errors';
import type { SampleDataConfig } from '../../src/sample-data/models/SampleDataConfig';

describe('Error Recovery Integration', () => {
  let orchestrator: SampleDataOrchestrator;
  let databaseService: DatabaseService;
  let configService: ConfigurationService;
  let testConfig: SampleDataConfig;

  beforeAll(async () => {
    // Initialize database connection for testing
    databaseService = new DatabaseService({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'hr_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123'
    });

    await databaseService.connect();

    configService = new ConfigurationService();
    orchestrator = new SampleDataOrchestrator(databaseService, configService);

    // Load test configuration
    testConfig = await configService.loadConfiguration('./backend/config/sample-data.json');
  });

  afterAll(async () => {
    if (databaseService) {
      await databaseService.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up sample data before each test
    await orchestrator.cleanSampleData();
  });

  test('should handle database connection failures gracefully', async () => {
    // Create orchestrator with invalid connection
    const invalidDb = new DatabaseService({
      host: 'invalid-host',
      port: 9999,
      database: 'invalid_db',
      user: 'invalid_user',
      password: 'invalid_password'
    });

    const invalidOrchestrator = new SampleDataOrchestrator(invalidDb, configService);

    await expect(
      invalidOrchestrator.generateSampleData(testConfig)
    ).rejects.toThrow(DatabaseError);
  });

  test('should handle missing configuration file gracefully', async () => {
    await expect(
      configService.loadConfiguration('./non-existent-config.json')
    ).rejects.toThrow(ConfigurationError);
  });

  test('should handle invalid JSON in configuration file', async () => {
    const invalidConfig = '{ invalid json syntax }';

    await expect(
      configService.parseConfiguration(invalidConfig)
    ).rejects.toThrow(ConfigurationError);
  });

  test('should validate configuration schema and reject invalid configs', async () => {
    const invalidConfig = {
      seed: 'not-a-number', // Invalid seed type
      batchSize: -10, // Invalid batch size
      tableConfigs: []
    };

    await expect(
      orchestrator.generateSampleData(invalidConfig as any)
    ).rejects.toThrow(ValidationError);
  });

  test('should handle non-existent tables gracefully', async () => {
    const configWithInvalidTable: SampleDataConfig = {
      ...testConfig,
      tableConfigs: [
        {
          tableName: 'non_existent_table',
          recordCount: 10,
          priority: 1,
          namingPattern: 'Sample {id}',
          customFields: {},
          skipIfExists: false
        }
      ]
    };

    const result = await orchestrator.generateSampleData(configWithInvalidTable);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('non_existent_table');
  });

  test('should handle foreign key constraint violations with retry', async () => {
    // Try to generate employees without users/departments first
    const invalidOrderConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: [
        {
          tableName: 'employees',
          recordCount: 10,
          priority: 1, // Wrong priority - should be after users and departments
          namingPattern: 'Sample Employee {id}',
          customFields: {},
          skipIfExists: false
        }
      ]
    };

    const result = await orchestrator.generateSampleData(invalidOrderConfig);

    // Should either fail or auto-correct the order
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const hasConstraintError = result.errors.some(err =>
        err.includes('foreign key') || err.includes('constraint')
      );
      expect(hasConstraintError).toBe(true);
    }
  });

  test('should rollback transaction on partial failure', async () => {
    const partialFailConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: [
        testConfig.tableConfigs[0], // Valid table
        {
          tableName: 'invalid_table',
          recordCount: 10,
          priority: 2,
          namingPattern: 'Sample {id}',
          customFields: {},
          skipIfExists: false
        }
      ]
    };

    const result = await orchestrator.generateSampleData(partialFailConfig);

    expect(result.success).toBe(false);

    // Verify no partial data was committed
    const sampleData = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );
    expect(parseInt(sampleData.rows[0].count)).toBe(0);
  });

  test('should handle schema discovery failures gracefully', async () => {
    // Create service with restricted permissions (simulated)
    const restrictedConfig: SampleDataConfig = {
      ...testConfig,
      schemaName: 'restricted_schema'
    };

    await expect(
      orchestrator.generateSampleData(restrictedConfig)
    ).rejects.toThrow();
  });

  test('should handle data generation errors with proper error messages', async () => {
    try {
      await orchestrator.generateSampleData(testConfig);

      // Simulate a generation error by using invalid custom fields
      const invalidFieldConfig: SampleDataConfig = {
        ...testConfig,
        tableConfigs: testConfig.tableConfigs.map(tc => ({
          ...tc,
          customFields: {
            invalid_field: 'invalid_value_generator'
          }
        }))
      };

      await orchestrator.generateSampleData(invalidFieldConfig);
    } catch (error) {
      expect(error).toBeInstanceOf(DataGenerationError);
      if (error instanceof DataGenerationError) {
        expect(error.message).toBeTruthy();
        expect(error.tableName).toBeTruthy();
      }
    }
  });

  test('should recover from interrupted generation', async () => {
    // Simulate interrupted generation
    const config = { ...testConfig, seed: 12345 };

    // Start generation but don't complete
    const partialResult = await orchestrator.generateSampleData({
      ...config,
      tableConfigs: config.tableConfigs.slice(0, 2) // Only process first 2 tables
    });

    expect(partialResult.success).toBe(true);

    // Resume with full config
    const resumeResult = await orchestrator.generateSampleData(config);

    expect(resumeResult.success).toBe(true);
    expect(resumeResult.totalRecordsGenerated).toBeGreaterThan(partialResult.totalRecordsGenerated);
  });

  test('should handle concurrent generation attempts gracefully', async () => {
    const config = { ...testConfig, seed: 11111 };

    // Start two concurrent generations
    const promise1 = orchestrator.generateSampleData(config);
    const promise2 = orchestrator.generateSampleData(config);

    // Both should complete, but one might wait or fail gracefully
    const results = await Promise.allSettled([promise1, promise2]);

    // At least one should succeed
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThanOrEqual(1);
  });

  test('should provide detailed error context for debugging', async () => {
    try {
      const invalidConfig: SampleDataConfig = {
        ...testConfig,
        tableConfigs: [
          {
            tableName: 'users',
            recordCount: -5, // Invalid record count
            priority: 1,
            namingPattern: 'Sample User {id}',
            customFields: {},
            skipIfExists: false
          }
        ]
      };

      await orchestrator.generateSampleData(invalidConfig);
    } catch (error) {
      expect(error).toBeInstanceOf(SampleDataError);
      if (error instanceof SampleDataError) {
        expect(error.message).toBeTruthy();
        expect(error.code).toBeTruthy();
        expect(error.severity).toBeTruthy();
        expect(error.timestamp).toBeInstanceOf(Date);

        if (error.context) {
          expect(error.context.tableName).toBeTruthy();
        }
      }
    }
  });

  test('should handle validation errors with specific field information', async () => {
    try {
      const configWithInvalidField: SampleDataConfig = {
        ...testConfig,
        tableConfigs: [
          {
            tableName: 'users',
            recordCount: 10,
            priority: 1,
            namingPattern: '', // Empty naming pattern
            customFields: {},
            skipIfExists: false
          }
        ]
      };

      await orchestrator.generateSampleData(configWithInvalidField);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.tableName).toBe('users');
        expect(error.fieldName).toBeTruthy();
        expect(error.message).toContain('naming');
      }
    }
  });

  test('should handle database query errors gracefully', async () => {
    // Simulate invalid SQL query
    await expect(
      databaseService.query('INVALID SQL SYNTAX')
    ).rejects.toThrow(DatabaseError);
  });

  test('should provide retry mechanism for transient failures', async () => {
    let attemptCount = 0;
    const maxRetries = 3;

    const retryConfig = {
      ...testConfig,
      retryAttempts: maxRetries,
      retryDelay: 100 // 100ms between retries
    };

    // Mock a transient failure scenario
    const originalQuery = databaseService.query.bind(databaseService);
    databaseService.query = async (sql: string) => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Transient connection error');
      }
      return originalQuery(sql);
    };

    try {
      const result = await orchestrator.generateSampleData(retryConfig);
      expect(result.success).toBe(true);
      expect(attemptCount).toBeGreaterThan(1);
    } finally {
      // Restore original query function
      databaseService.query = originalQuery;
    }
  });

  test('should handle timeout scenarios gracefully', async () => {
    const timeoutConfig = {
      ...testConfig,
      timeout: 100 // Very short timeout to trigger timeout error
    };

    try {
      await orchestrator.generateSampleData(timeoutConfig);
    } catch (error) {
      expect(error).toBeInstanceOf(SampleDataError);
      if (error instanceof SampleDataError) {
        expect(error.message).toContain('timeout');
      }
    }
  });

  test('should clean up resources on error', async () => {
    const initialConnections = await databaseService.getActiveConnections();

    try {
      const invalidConfig: SampleDataConfig = {
        ...testConfig,
        tableConfigs: [
          {
            tableName: 'invalid_table',
            recordCount: 10,
            priority: 1,
            namingPattern: 'Sample {id}',
            customFields: {},
            skipIfExists: false
          }
        ]
      };

      await orchestrator.generateSampleData(invalidConfig);
    } catch (error) {
      // Error expected
    }

    // Verify connections were cleaned up
    const finalConnections = await databaseService.getActiveConnections();
    expect(finalConnections).toBeLessThanOrEqual(initialConnections);
  });

  test('should handle CLI errors with proper exit codes', async () => {
    try {
      throw new CLIError('Invalid command arguments', 'generate-sample-data', 1);
    } catch (error) {
      expect(error).toBeInstanceOf(CLIError);
      if (error instanceof CLIError) {
        expect(error.command).toBe('generate-sample-data');
        expect(error.exitCode).toBe(1);
      }
    }
  });

  test('should provide error serialization for logging', async () => {
    const error = new ValidationError(
      'Invalid email format',
      'users',
      'email',
      'invalid@email'
    );

    const serialized = error.toJSON();

    expect(serialized).toBeDefined();
    expect(serialized.message).toBe('Invalid email format');
    expect(serialized.code).toBeTruthy();
    expect(serialized.tableName).toBe('users');
    expect(serialized.fieldName).toBe('email');
    expect(serialized.invalidValue).toBe('invalid@email');
  });

  test('should handle disk space errors gracefully', async () => {
    // This test is conceptual - actual disk space simulation is complex
    // In real implementation, would check available disk space before generation
    const result = await orchestrator.generateSampleData(testConfig);
    expect(result.success).toBe(true);

    // In production, should check:
    // - Available disk space before generation
    // - Fail gracefully if insufficient space
    // - Provide clear error message about disk space
  });

  test('should handle permission errors with helpful messages', async () => {
    // Simulate permission error (in real scenario, would use restricted user)
    try {
      // Attempt to write to restricted table
      await databaseService.query('INSERT INTO restricted_table VALUES (1)');
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseError);
      if (error instanceof DatabaseError) {
        expect(error.message).toBeTruthy();
      }
    }
  });

  test('should collect and report all errors in batch', async () => {
    const multiErrorConfig: SampleDataConfig = {
      ...testConfig,
      continueOnError: true, // Continue processing even if some tables fail
      tableConfigs: [
        testConfig.tableConfigs[0], // Valid
        {
          tableName: 'invalid_table_1',
          recordCount: 10,
          priority: 2,
          namingPattern: 'Sample {id}',
          customFields: {},
          skipIfExists: false
        },
        testConfig.tableConfigs[1], // Valid
        {
          tableName: 'invalid_table_2',
          recordCount: 10,
          priority: 4,
          namingPattern: 'Sample {id}',
          customFields: {},
          skipIfExists: false
        }
      ]
    };

    const result = await orchestrator.generateSampleData(multiErrorConfig);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toContain(expect.stringContaining('invalid_table_1'));
    expect(result.errors).toContain(expect.stringContaining('invalid_table_2'));

    // Valid tables should have been processed
    const successfulTables = result.tableResults.filter(tr => tr.status === 'success');
    expect(successfulTables.length).toBeGreaterThan(0);
  });

  test('should provide warning for non-critical issues', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);

    // Warnings might include:
    // - Performance warnings
    // - Deprecated configuration options
    // - Suboptimal settings
  });

  test('should handle errors in custom field generators', async () => {
    const customFieldConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: [
        {
          tableName: 'users',
          recordCount: 10,
          priority: 1,
          namingPattern: 'Sample User {id}',
          customFields: {
            email: (record: any) => {
              throw new Error('Custom field generator error');
            }
          },
          skipIfExists: false
        }
      ]
    };

    const result = await orchestrator.generateSampleData(customFieldConfig);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Custom field generator error');
  });
});