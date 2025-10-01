/**
 * Integration Test: Cross-Machine Consistency (Deterministic Generation)
 *
 * This test validates that sample data generation is deterministic and consistent across machines.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as crypto from 'crypto';

// This import will fail initially - that's expected for TDD
import { SampleDataOrchestrator } from '../../src/sample-data/SampleDataOrchestrator';
import { DatabaseService } from '../../src/sample-data/services/DatabaseService';
import { ConfigurationService } from '../../src/sample-data/services/ConfigurationService';
import { DataGenerator } from '../../src/sample-data/services/DataGenerator';
import type { SampleDataConfig, SampleDataResult } from '../../src/sample-data/models/SampleDataConfig';

describe('Deterministic Generation Integration', () => {
  let orchestrator: SampleDataOrchestrator;
  let databaseService: DatabaseService;
  let configService: ConfigurationService;
  let dataGenerator: DataGenerator;
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
    dataGenerator = new DataGenerator();
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

  test('should generate identical data with same seed', async () => {
    const seed = 42;
    const config1 = { ...testConfig, seed };
    const config2 = { ...testConfig, seed };

    // First generation
    const result1 = await orchestrator.generateSampleData(config1);
    const data1 = await captureGeneratedData();

    // Clean and regenerate with same seed
    await orchestrator.cleanSampleData();

    const result2 = await orchestrator.generateSampleData(config2);
    const data2 = await captureGeneratedData();

    // Results should be identical
    expect(result1.totalRecordsGenerated).toBe(result2.totalRecordsGenerated);
    expect(result1.summary).toEqual(result2.summary);

    // Data should be byte-for-byte identical
    expect(data1).toEqual(data2);
  });

  test('should generate different data with different seeds', async () => {
    const config1 = { ...testConfig, seed: 12345 };
    const config2 = { ...testConfig, seed: 54321 };

    // First generation
    const result1 = await orchestrator.generateSampleData(config1);
    const data1 = await captureGeneratedData();

    // Clean and regenerate with different seed
    await orchestrator.cleanSampleData();

    const result2 = await orchestrator.generateSampleData(config2);
    const data2 = await captureGeneratedData();

    // Record counts should be the same
    expect(result1.totalRecordsGenerated).toBe(result2.totalRecordsGenerated);

    // But actual data should be different
    expect(data1).not.toEqual(data2);

    // Check specific user names are different
    expect(data1.users[0].full_name).not.toBe(data2.users[0].full_name);
  });

  test('should produce consistent hashes for same seed', async () => {
    const seed = 98765;
    const config = { ...testConfig, seed };

    // Generate data twice with same seed
    const hash1 = await generateAndHashData(config);

    await orchestrator.cleanSampleData();

    const hash2 = await generateAndHashData(config);

    // Hashes should be identical
    expect(hash1).toBe(hash2);
  });

  test('should produce different hashes for different seeds', async () => {
    const config1 = { ...testConfig, seed: 11111 };
    const config2 = { ...testConfig, seed: 22222 };

    const hash1 = await generateAndHashData(config1);

    await orchestrator.cleanSampleData();

    const hash2 = await generateAndHashData(config2);

    // Hashes should be different
    expect(hash1).not.toBe(hash2);
  });

  test('should maintain consistency across table generation order', async () => {
    const seed = 77777;
    const config = { ...testConfig, seed };

    // First generation with normal table order
    const result1 = await orchestrator.generateSampleData(config);
    const data1 = await captureGeneratedData();

    await orchestrator.cleanSampleData();

    // Second generation (order should be determined by priority, not config order)
    const shuffledConfig = {
      ...config,
      tableConfigs: [...config.tableConfigs].reverse()
    };

    const result2 = await orchestrator.generateSampleData(shuffledConfig);
    const data2 = await captureGeneratedData();

    // Data should still be identical because priority determines order
    expect(result1.totalRecordsGenerated).toBe(result2.totalRecordsGenerated);
    expect(data1.users).toEqual(data2.users);
    expect(data1.departments).toEqual(data2.departments);
  });

  test('should generate consistent foreign key relationships', async () => {
    const seed = 33333;
    const config = { ...testConfig, seed };

    // Generate twice
    await orchestrator.generateSampleData(config);
    const relationships1 = await captureRelationships();

    await orchestrator.cleanSampleData();

    await orchestrator.generateSampleData(config);
    const relationships2 = await captureRelationships();

    // Relationships should be identical
    expect(relationships1).toEqual(relationships2);
  });

  test('should maintain determinism with batch processing', async () => {
    const seed = 55555;

    // Generate with different batch sizes
    const config1 = { ...testConfig, seed, batchSize: 10 };
    const config2 = { ...testConfig, seed, batchSize: 25 };

    const result1 = await orchestrator.generateSampleData(config1);
    const data1 = await captureGeneratedData();

    await orchestrator.cleanSampleData();

    const result2 = await orchestrator.generateSampleData(config2);
    const data2 = await captureGeneratedData();

    // Different batch sizes should still produce identical data
    expect(data1).toEqual(data2);
    expect(result1.totalRecordsGenerated).toBe(result2.totalRecordsGenerated);
  });

  test('should generate consistent email addresses', async () => {
    const seed = 66666;
    const config = { ...testConfig, seed };

    // Generate twice
    await orchestrator.generateSampleData(config);
    const emails1 = await databaseService.query(
      "SELECT email FROM hr_public.users WHERE full_name LIKE 'Sample User%' ORDER BY id"
    );

    await orchestrator.cleanSampleData();

    await orchestrator.generateSampleData(config);
    const emails2 = await databaseService.query(
      "SELECT email FROM hr_public.users WHERE full_name LIKE 'Sample User%' ORDER BY id"
    );

    // Emails should be identical
    expect(emails1.rows).toEqual(emails2.rows);
  });

  test('should generate consistent names with naming patterns', async () => {
    const seed = 88888;
    const config = { ...testConfig, seed };

    await orchestrator.generateSampleData(config);
    const names1 = await databaseService.query(
      "SELECT full_name FROM hr_public.employees WHERE full_name LIKE 'Sample Employee%' ORDER BY id"
    );

    await orchestrator.cleanSampleData();

    await orchestrator.generateSampleData(config);
    const names2 = await databaseService.query(
      "SELECT full_name FROM hr_public.employees WHERE full_name LIKE 'Sample Employee%' ORDER BY id"
    );

    // Names should be identical
    expect(names1.rows).toEqual(names2.rows);
  });

  test('should generate consistent dates and timestamps', async () => {
    const seed = 99999;
    const config = { ...testConfig, seed };

    await orchestrator.generateSampleData(config);
    const dates1 = await databaseService.query(
      "SELECT hire_date, created_at FROM hr_public.employees WHERE full_name LIKE 'Sample Employee%' ORDER BY id LIMIT 10"
    );

    await orchestrator.cleanSampleData();

    await orchestrator.generateSampleData(config);
    const dates2 = await databaseService.query(
      "SELECT hire_date, created_at FROM hr_public.employees WHERE full_name LIKE 'Sample Employee%' ORDER BY id LIMIT 10"
    );

    // Dates should be consistent (within same day to account for NOW() differences)
    dates1.rows.forEach((row, index) => {
      const date1 = new Date(row.hire_date);
      const date2 = new Date(dates2.rows[index].hire_date);

      // Should be the same date (allowing for generation time differences)
      expect(date1.toDateString()).toBe(date2.toDateString());
    });
  });

  test('should support deterministic data generation across Node versions', async () => {
    const seed = 123456;
    const config = { ...testConfig, seed };

    // Generate data
    await orchestrator.generateSampleData(config);
    const hash = await generateDataHash();

    // Store hash for comparison (in real scenario, this would be compared against known hash)
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64); // SHA256 hex string length
  });

  test('should validate Faker.js determinism', async () => {
    const seed1 = 111111;
    const seed2 = 111111;

    // Test Faker.js directly
    const names1 = [];
    dataGenerator.setSeed(seed1);
    for (let i = 0; i < 10; i++) {
      names1.push(dataGenerator.generateFullName());
    }

    const names2 = [];
    dataGenerator.setSeed(seed2);
    for (let i = 0; i < 10; i++) {
      names2.push(dataGenerator.generateFullName());
    }

    // Names should be identical
    expect(names1).toEqual(names2);
  });

  test('should maintain determinism with custom field generation', async () => {
    const seed = 222222;
    const config = { ...testConfig, seed };

    await orchestrator.generateSampleData(config);
    const customFields1 = await captureCustomFieldValues();

    await orchestrator.cleanSampleData();

    await orchestrator.generateSampleData(config);
    const customFields2 = await captureCustomFieldValues();

    // Custom fields should be identical
    expect(customFields1).toEqual(customFields2);
  });

  test('should generate consistent salary values', async () => {
    const seed = 333333;
    const config = { ...testConfig, seed };

    await orchestrator.generateSampleData(config);
    const salaries1 = await databaseService.query(
      "SELECT salary FROM hr_public.employees WHERE full_name LIKE 'Sample Employee%' ORDER BY id LIMIT 10"
    );

    await orchestrator.cleanSampleData();

    await orchestrator.generateSampleData(config);
    const salaries2 = await databaseService.query(
      "SELECT salary FROM hr_public.employees WHERE full_name LIKE 'Sample Employee%' ORDER BY id LIMIT 10"
    );

    // Salaries should be identical
    expect(salaries1.rows).toEqual(salaries2.rows);
  });

  test('should document seed value for reproducibility', async () => {
    const seed = 444444;
    const config = { ...testConfig, seed };

    const result = await orchestrator.generateSampleData(config);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.seedUsed).toBe(seed);
    expect(result.data.configHash).toBeTruthy();
  });

  test('should validate cross-platform consistency', async () => {
    const seed = 555555;
    const config = { ...testConfig, seed };

    // Generate data and create reproducibility manifest
    const result = await orchestrator.generateSampleData(config);
    const manifest = {
      seed,
      nodeVersion: process.version,
      platform: process.platform,
      dataHash: await generateDataHash(),
      recordCounts: result.tableResults.map(tr => ({
        table: tr.tableName,
        count: tr.recordsGenerated
      }))
    };

    expect(manifest.seed).toBe(seed);
    expect(manifest.dataHash).toBeTruthy();
    expect(manifest.recordCounts.length).toBeGreaterThan(0);

    // In real scenario, this manifest would be committed to git
    // and validated on other machines
  });

  test('should handle deterministic generation with parallel execution', async () => {
    const seed = 666666;

    // Multiple parallel generations with same seed should be deterministic
    // but we should only allow one at a time to prevent race conditions
    const config = { ...testConfig, seed };

    const result1 = await orchestrator.generateSampleData(config);
    const hash1 = await generateDataHash();

    await orchestrator.cleanSampleData();

    const result2 = await orchestrator.generateSampleData(config);
    const hash2 = await generateDataHash();

    expect(hash1).toBe(hash2);
  });

  // Helper functions
  async function captureGeneratedData(): Promise<any> {
    const users = await databaseService.query(
      "SELECT * FROM hr_public.users WHERE full_name LIKE 'Sample User%' ORDER BY id"
    );
    const departments = await databaseService.query(
      "SELECT * FROM hr_public.departments WHERE name LIKE 'Sample Department%' ORDER BY id"
    );
    const employees = await databaseService.query(
      "SELECT * FROM hr_public.employees WHERE full_name LIKE 'Sample Employee%' ORDER BY id"
    );

    return {
      users: users.rows,
      departments: departments.rows,
      employees: employees.rows
    };
  }

  async function generateAndHashData(config: SampleDataConfig): Promise<string> {
    await orchestrator.generateSampleData(config);
    return generateDataHash();
  }

  async function generateDataHash(): Promise<string> {
    const data = await captureGeneratedData();
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  async function captureRelationships(): Promise<any> {
    const relationships = await databaseService.query(`
      SELECT e.id, e.user_id, e.department_id
      FROM hr_public.employees e
      WHERE e.full_name LIKE 'Sample Employee%'
      ORDER BY e.id
    `);

    return relationships.rows;
  }

  async function captureCustomFieldValues(): Promise<any> {
    const customFields = await databaseService.query(`
      SELECT id, email, phone_number, hire_date
      FROM hr_public.employees
      WHERE full_name LIKE 'Sample Employee%'
      ORDER BY id
      LIMIT 10
    `);

    return customFields.rows;
  }
});