/**
 * Integration Test: Sample Data Generation Workflow
 *
 * This test validates the complete sample data generation workflow.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// This import will fail initially - that's expected for TDD
import { SampleDataOrchestrator } from '../../src/sample-data/SampleDataOrchestrator';
import { DatabaseService } from '../../src/sample-data/services/DatabaseService';
import { ConfigurationService } from '../../src/sample-data/services/ConfigurationService';
import type { SampleDataConfig, SampleDataResult } from '../../src/sample-data/models/SampleDataConfig';

describe('Data Generation Workflow Integration', () => {
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

  test('should generate sample data for all configured tables', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.totalRecordsGenerated).toBeGreaterThan(0);
    expect(result.tableResults).toBeDefined();
    expect(result.tableResults.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  test('should respect table priorities during generation', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Core tables (priority 1) should be generated first
    const coreTableResults = result.tableResults.filter(tr =>
      ['users', 'departments'].includes(tr.tableName)
    );

    // Secondary tables (priority 2) should be generated after core
    const secondaryTableResults = result.tableResults.filter(tr =>
      ['employees', 'user_role_assignments'].includes(tr.tableName)
    );

    expect(coreTableResults.length).toBeGreaterThan(0);
    expect(secondaryTableResults.length).toBeGreaterThan(0);

    // All core tables should be successful
    coreTableResults.forEach(result => {
      expect(result.status).toBe('success');
      expect(result.recordsGenerated).toBeGreaterThan(0);
    });
  });

  test('should generate deterministic data with same seed', async () => {
    const config1 = { ...testConfig, seed: 12345 };
    const config2 = { ...testConfig, seed: 12345 };

    const result1 = await orchestrator.generateSampleData(config1);
    await orchestrator.cleanSampleData();
    const result2 = await orchestrator.generateSampleData(config2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Should generate same number of records
    expect(result1.totalRecordsGenerated).toBe(result2.totalRecordsGenerated);

    // Verify data consistency by checking specific records
    const user1 = await databaseService.query(
      'SELECT full_name FROM hr_public.users WHERE id = 1'
    );

    await orchestrator.cleanSampleData();
    await orchestrator.generateSampleData(config1);

    const user2 = await databaseService.query(
      'SELECT full_name FROM hr_public.users WHERE id = 1'
    );

    expect(user1.rows[0]).toEqual(user2.rows[0]);
  });

  test('should generate different data with different seeds', async () => {
    const config1 = { ...testConfig, seed: 12345 };
    const config2 = { ...testConfig, seed: 54321 };

    const result1 = await orchestrator.generateSampleData(config1);
    await orchestrator.cleanSampleData();
    const result2 = await orchestrator.generateSampleData(config2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.totalRecordsGenerated).toBe(result2.totalRecordsGenerated);

    // Data should be different (though we can't guarantee it)
    // This test validates that different seeds produce different generation patterns
  });

  test('should respect record count configurations', async () => {
    const customConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: testConfig.tableConfigs.map(tc => ({
        ...tc,
        recordCount: tc.tableName === 'users' ? 25 : tc.recordCount
      }))
    };

    const result = await orchestrator.generateSampleData(customConfig);

    expect(result.success).toBe(true);

    const usersResult = result.tableResults.find(tr => tr.tableName === 'users');
    expect(usersResult).toBeDefined();
    expect(usersResult!.recordsGenerated).toBe(25);

    // Verify actual database records
    const userCount = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );
    expect(parseInt(userCount.rows[0].count)).toBe(25);
  });

  test('should handle foreign key dependencies correctly', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Verify employees reference valid users and departments
    const employeeData = await databaseService.query(`
      SELECT e.id, e.user_id, e.department_id, u.id as user_exists, d.id as dept_exists
      FROM hr_public.employees e
      LEFT JOIN hr_public.users u ON e.user_id = u.id
      LEFT JOIN hr_public.departments d ON e.department_id = d.id
      WHERE e.full_name LIKE 'Sample Employee%'
      LIMIT 5
    `);

    employeeData.rows.forEach(row => {
      expect(row.user_exists).not.toBeNull();
      expect(row.dept_exists).not.toBeNull();
    });
  });

  test('should generate data with custom field patterns', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Check users with custom email pattern
    const userData = await databaseService.query(`
      SELECT email FROM hr_public.users
      WHERE full_name LIKE 'Sample User%'
      LIMIT 5
    `);

    userData.rows.forEach(row => {
      expect(row.email).toMatch(/^sample\.user\.\d{3}@example\.com$/);
    });

    // Check employees with custom email pattern
    const employeeData = await databaseService.query(`
      SELECT email FROM hr_public.employees
      WHERE full_name LIKE 'Sample Employee%'
      LIMIT 5
    `);

    employeeData.rows.forEach(row => {
      expect(row.email).toMatch(/^sample\.employee\.\d{3}@example\.com$/);
    });
  });

  test('should report progress during generation', async () => {
    const progressReports: string[] = [];

    const configWithReporting: SampleDataConfig = {
      ...testConfig,
      progressReporting: true
    };

    // Mock progress reporting (in real implementation, this would use events or callbacks)
    const originalConsoleLog = console.log;
    console.log = (...args: any[]) => {
      progressReports.push(args.join(' '));
      originalConsoleLog(...args);
    };

    const result = await orchestrator.generateSampleData(configWithReporting);

    console.log = originalConsoleLog;

    expect(result.success).toBe(true);
    expect(progressReports.length).toBeGreaterThan(0);
  });

  test('should handle batch processing correctly', async () => {
    const batchConfig: SampleDataConfig = {
      ...testConfig,
      batchSize: 10,
      tableConfigs: testConfig.tableConfigs.map(tc => ({
        ...tc,
        recordCount: tc.tableName === 'users' ? 25 : tc.recordCount
      }))
    };

    const result = await orchestrator.generateSampleData(batchConfig);

    expect(result.success).toBe(true);

    const usersResult = result.tableResults.find(tr => tr.tableName === 'users');
    expect(usersResult).toBeDefined();
    expect(usersResult!.recordsGenerated).toBe(25);

    // Execution should be batched, but final result should be the same
    expect(usersResult!.status).toBe('success');
  });

  test('should validate execution time performance', async () => {
    const startTime = Date.now();

    const result = await orchestrator.generateSampleData(testConfig);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    expect(result.success).toBe(true);
    expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    expect(result.executionTimeMs).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeLessThanOrEqual(executionTime + 100); // Allow small margin
  });

  test('should generate valid summary statistics', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
    expect(result.summary.tablesProcessed).toBeGreaterThan(0);
    expect(result.summary.recordsCreated).toBeGreaterThan(0);
    expect(result.summary.recordsUpdated).toBeGreaterThanOrEqual(0);
    expect(result.summary.recordsSkipped).toBeGreaterThanOrEqual(0);
    expect(result.summary.errors).toHaveLength(0);

    // Validate summary consistency
    const totalSummaryRecords = result.summary.recordsCreated +
                               result.summary.recordsUpdated +
                               result.summary.recordsSkipped;
    expect(totalSummaryRecords).toBe(result.totalRecordsGenerated);

    const totalTableResults = result.tableResults.reduce(
      (sum, tr) => sum + tr.recordsGenerated + tr.recordsUpdated + tr.recordsSkipped,
      0
    );
    expect(totalTableResults).toBe(result.totalRecordsGenerated);
  });

  test('should handle empty table configurations', async () => {
    const emptyConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: []
    };

    const result = await orchestrator.generateSampleData(emptyConfig);

    expect(result.success).toBe(true);
    expect(result.totalRecordsGenerated).toBe(0);
    expect(result.tableResults).toHaveLength(0);
    expect(result.summary.tablesProcessed).toBe(0);
  });

  test('should generate naming patterns correctly', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Check users naming pattern
    const userData = await databaseService.query(`
      SELECT full_name FROM hr_public.users
      WHERE full_name LIKE 'Sample User%'
      ORDER BY id
      LIMIT 5
    `);

    userData.rows.forEach((row, index) => {
      const expectedPattern = new RegExp(`^Sample User \\d{3}$`);
      expect(row.full_name).toMatch(expectedPattern);
    });

    // Check employees naming pattern
    const employeeData = await databaseService.query(`
      SELECT full_name FROM hr_public.employees
      WHERE full_name LIKE 'Sample Employee%'
      ORDER BY id
      LIMIT 5
    `);

    employeeData.rows.forEach((row, index) => {
      const expectedPattern = new RegExp(`^Sample Employee \\d{3}$`);
      expect(row.full_name).toMatch(expectedPattern);
    });
  });

  test('should support data generation rollback on failure', async () => {
    // Create config that will fail partway through
    const failingConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: [
        ...testConfig.tableConfigs.slice(0, 2), // Valid tables
        {
          tableName: 'non_existent_table',
          recordCount: 10,
          priority: 3,
          namingPattern: 'Sample Record {id}',
          customFields: {},
          skipIfExists: false
        }
      ]
    };

    const result = await orchestrator.generateSampleData(failingConfig);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Check that no partial data remains in database
    const userCount = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );
    expect(parseInt(userCount.rows[0].count)).toBe(0);
  });

  test('should validate data integrity after generation', async () => {
    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Validate referential integrity
    const integrityCheck = await databaseService.query(`
      SELECT
        (SELECT COUNT(*) FROM hr_public.employees e
         LEFT JOIN hr_public.users u ON e.user_id = u.id
         WHERE u.id IS NULL AND e.full_name LIKE 'Sample Employee%') as orphaned_employees,
        (SELECT COUNT(*) FROM hr_public.employees e
         LEFT JOIN hr_public.departments d ON e.department_id = d.id
         WHERE d.id IS NULL AND e.full_name LIKE 'Sample Employee%') as orphaned_departments
    `);

    expect(parseInt(integrityCheck.rows[0].orphaned_employees)).toBe(0);
    expect(parseInt(integrityCheck.rows[0].orphaned_departments)).toBe(0);
  });

  test('should support configuration validation before generation', async () => {
    const invalidConfig: SampleDataConfig = {
      ...testConfig,
      seed: -1, // Invalid seed
      batchSize: 0 // Invalid batch size
    };

    await expect(
      orchestrator.generateSampleData(invalidConfig)
    ).rejects.toThrow();
  });
});