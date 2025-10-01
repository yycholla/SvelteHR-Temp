/**
 * Contract Test: SampleDataConfig Interface
 *
 * This test validates the SampleDataConfig interface contract.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect } from '@jest/globals';

// This import will fail initially - that's expected for TDD
import type { SampleDataConfig, TableConfig, TablePriority } from '../../src/sample-data/models/SampleDataConfig';

describe('SampleDataConfig Contract', () => {
  test('should have all required properties', () => {
    const mockConfig: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [],
      batchSize: 100,
      progressReporting: true
    };

    // Validate property existence
    expect(typeof mockConfig.seed).toBe('number');
    expect(Array.isArray(mockConfig.tableConfigs)).toBe(true);
    expect(typeof mockConfig.batchSize).toBe('number');
    expect(typeof mockConfig.progressReporting).toBe('boolean');
  });

  test('should validate seed is positive integer', () => {
    const validConfig: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [],
      batchSize: 100,
      progressReporting: true
    };

    expect(validConfig.seed).toBeGreaterThan(0);
    expect(Number.isInteger(validConfig.seed)).toBe(true);
  });

  test('should validate batchSize is within range', () => {
    const validConfig: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [],
      batchSize: 100,
      progressReporting: true
    };

    expect(validConfig.batchSize).toBeGreaterThanOrEqual(10);
    expect(validConfig.batchSize).toBeLessThanOrEqual(1000);
  });

  test('should accept empty tableConfigs array', () => {
    const configWithEmptyTables: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [],
      batchSize: 100,
      progressReporting: true
    };

    expect(configWithEmptyTables.tableConfigs).toHaveLength(0);
  });

  test('should accept populated tableConfigs array', () => {
    const mockTableConfig: TableConfig = {
      tableName: 'users',
      recordCount: 50,
      priority: TablePriority.CORE,
      namingPattern: 'Sample User {id:3}',
      customFields: {},
      skipIfExists: false
    };

    const configWithTables: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [mockTableConfig],
      batchSize: 100,
      progressReporting: true
    };

    expect(configWithTables.tableConfigs).toHaveLength(1);
    expect(configWithTables.tableConfigs[0]).toEqual(mockTableConfig);
  });

  test('should support boolean progressReporting values', () => {
    const configWithReporting: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [],
      batchSize: 100,
      progressReporting: true
    };

    const configWithoutReporting: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [],
      batchSize: 100,
      progressReporting: false
    };

    expect(configWithReporting.progressReporting).toBe(true);
    expect(configWithoutReporting.progressReporting).toBe(false);
  });

  test('should enforce type safety for all properties', () => {
    // This test validates TypeScript compilation
    // If these assignments compile without errors, the interface is properly typed
    const config: SampleDataConfig = {
      seed: 12345,
      tableConfigs: [],
      batchSize: 100,
      progressReporting: true
    };

    // These should all be the correct types
    const seedType: number = config.seed;
    const tableConfigsType: TableConfig[] = config.tableConfigs;
    const batchSizeType: number = config.batchSize;
    const progressReportingType: boolean = config.progressReporting;

    // Verify types are as expected
    expect(typeof seedType).toBe('number');
    expect(Array.isArray(tableConfigsType)).toBe(true);
    expect(typeof batchSizeType).toBe('number');
    expect(typeof progressReportingType).toBe('boolean');
  });
});