/**
 * Contract Test: TableConfig Interface
 *
 * This test validates the TableConfig interface contract.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect } from '@jest/globals';

// This import will fail initially - that's expected for TDD
import type { TableConfig, TablePriority } from '../../src/sample-data/models/TableConfig';

describe('TableConfig Contract', () => {
  test('should have all required properties', () => {
    const mockTableConfig: TableConfig = {
      tableName: 'employees',
      recordCount: 50,
      priority: TablePriority.SECONDARY,
      namingPattern: 'Sample Employee {id:3}',
      customFields: {},
      skipIfExists: false
    };

    // Validate property existence and types
    expect(typeof mockTableConfig.tableName).toBe('string');
    expect(typeof mockTableConfig.recordCount).toBe('number');
    expect(typeof mockTableConfig.priority).toBe('number');
    expect(typeof mockTableConfig.namingPattern).toBe('string');
    expect(typeof mockTableConfig.customFields).toBe('object');
    expect(typeof mockTableConfig.skipIfExists).toBe('boolean');
  });

  test('should validate tableName is non-empty string', () => {
    const validTableConfig: TableConfig = {
      tableName: 'users',
      recordCount: 50,
      priority: TablePriority.CORE,
      namingPattern: 'Sample User {id:3}',
      customFields: {},
      skipIfExists: false
    };

    expect(validTableConfig.tableName).toBeTruthy();
    expect(validTableConfig.tableName.length).toBeGreaterThan(0);
  });

  test('should validate recordCount is within range 10-50', () => {
    const tableConfigMinCount: TableConfig = {
      tableName: 'test_table',
      recordCount: 10,
      priority: TablePriority.SUPPORTING,
      namingPattern: 'Sample Test {id}',
      customFields: {},
      skipIfExists: false
    };

    const tableConfigMaxCount: TableConfig = {
      tableName: 'test_table',
      recordCount: 50,
      priority: TablePriority.CORE,
      namingPattern: 'Sample Test {id}',
      customFields: {},
      skipIfExists: false
    };

    expect(tableConfigMinCount.recordCount).toBeGreaterThanOrEqual(10);
    expect(tableConfigMinCount.recordCount).toBeLessThanOrEqual(50);
    expect(tableConfigMaxCount.recordCount).toBeGreaterThanOrEqual(10);
    expect(tableConfigMaxCount.recordCount).toBeLessThanOrEqual(50);
  });

  test('should validate TablePriority enum values', () => {
    expect(TablePriority.CORE).toBe(1);
    expect(TablePriority.SECONDARY).toBe(2);
    expect(TablePriority.AUXILIARY).toBe(3);
    expect(TablePriority.SUPPORTING).toBe(4);

    // Test each priority level
    const coreConfig: TableConfig = {
      tableName: 'users',
      recordCount: 50,
      priority: TablePriority.CORE,
      namingPattern: 'Sample User {id:3}',
      customFields: {},
      skipIfExists: false
    };

    const auxiliaryConfig: TableConfig = {
      tableName: 'goals',
      recordCount: 20,
      priority: TablePriority.AUXILIARY,
      namingPattern: 'Sample Goal {id}',
      customFields: {},
      skipIfExists: false
    };

    expect(coreConfig.priority).toBe(1);
    expect(auxiliaryConfig.priority).toBe(3);
  });

  test('should validate namingPattern contains id placeholder', () => {
    const validPatterns = [
      'Sample User {id:3}',
      'Sample Employee {id}',
      'Test Record {id:5}',
      'Data {id:2}'
    ];

    validPatterns.forEach(pattern => {
      const config: TableConfig = {
        tableName: 'test',
        recordCount: 10,
        priority: TablePriority.CORE,
        namingPattern: pattern,
        customFields: {},
        skipIfExists: false
      };

      expect(config.namingPattern).toContain('{id');
    });
  });

  test('should support empty and populated customFields', () => {
    const configWithEmptyFields: TableConfig = {
      tableName: 'simple_table',
      recordCount: 25,
      priority: TablePriority.SECONDARY,
      namingPattern: 'Sample Simple {id}',
      customFields: {},
      skipIfExists: false
    };

    const configWithCustomFields: TableConfig = {
      tableName: 'complex_table',
      recordCount: 30,
      priority: TablePriority.AUXILIARY,
      namingPattern: 'Sample Complex {id}',
      customFields: {
        email: 'sample.{id}@example.com',
        department: 'Engineering',
        status: 'active'
      },
      skipIfExists: false
    };

    expect(Object.keys(configWithEmptyFields.customFields)).toHaveLength(0);
    expect(Object.keys(configWithCustomFields.customFields)).toHaveLength(3);
    expect(configWithCustomFields.customFields.email).toBe('sample.{id}@example.com');
  });

  test('should support both skipIfExists values', () => {
    const configSkipIfExists: TableConfig = {
      tableName: 'skip_table',
      recordCount: 15,
      priority: TablePriority.SUPPORTING,
      namingPattern: 'Sample Skip {id}',
      customFields: {},
      skipIfExists: true
    };

    const configAlwaysGenerate: TableConfig = {
      tableName: 'generate_table',
      recordCount: 20,
      priority: TablePriority.AUXILIARY,
      namingPattern: 'Sample Generate {id}',
      customFields: {},
      skipIfExists: false
    };

    expect(configSkipIfExists.skipIfExists).toBe(true);
    expect(configAlwaysGenerate.skipIfExists).toBe(false);
  });

  test('should enforce type safety for all properties', () => {
    const config: TableConfig = {
      tableName: 'type_test',
      recordCount: 40,
      priority: TablePriority.SECONDARY,
      namingPattern: 'Sample Type {id:3}',
      customFields: { test: 'value' },
      skipIfExists: true
    };

    // Type validation through assignment
    const tableName: string = config.tableName;
    const recordCount: number = config.recordCount;
    const priority: TablePriority = config.priority;
    const namingPattern: string = config.namingPattern;
    const customFields: Record<string, any> = config.customFields;
    const skipIfExists: boolean = config.skipIfExists;

    // Verify types
    expect(typeof tableName).toBe('string');
    expect(typeof recordCount).toBe('number');
    expect(typeof priority).toBe('number');
    expect(typeof namingPattern).toBe('string');
    expect(typeof customFields).toBe('object');
    expect(typeof skipIfExists).toBe('boolean');
  });
});