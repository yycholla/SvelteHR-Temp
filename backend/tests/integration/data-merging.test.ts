/**
 * Integration Test: Data Merging with Existing Records
 *
 * This test validates the data merging functionality with existing database records.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// This import will fail initially - that's expected for TDD
import { SampleDataOrchestrator } from '../../src/sample-data/SampleDataOrchestrator';
import { DatabaseService } from '../../src/sample-data/services/DatabaseService';
import { ConfigurationService } from '../../src/sample-data/services/ConfigurationService';
import type { SampleDataConfig, SampleDataResult } from '../../src/sample-data/models/SampleDataConfig';

describe('Data Merging Integration', () => {
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
    // Clean up all data before each test
    await orchestrator.cleanSampleData();
    await cleanExistingTestData();
  });

  async function cleanExistingTestData(): Promise<void> {
    // Clean up any existing test data that might interfere
    await databaseService.query("DELETE FROM hr_public.users WHERE email LIKE '%@testdata.com'");
    await databaseService.query("DELETE FROM hr_public.departments WHERE name LIKE 'Test Department%'");
  }

  async function insertExistingTestData(): Promise<void> {
    // Insert some existing data that sample generation should merge with
    await databaseService.query(`
      INSERT INTO hr_public.users (email, full_name, created_at)
      VALUES
        ('existing1@testdata.com', 'Existing User 1', NOW()),
        ('existing2@testdata.com', 'Existing User 2', NOW())
    `);

    await databaseService.query(`
      INSERT INTO hr_public.departments (name, description, created_at)
      VALUES
        ('Test Department 1', 'Existing test department', NOW()),
        ('Test Department 2', 'Another existing department', NOW())
    `);
  }

  test('should merge with existing data without conflicts', async () => {
    // Insert existing data
    await insertExistingTestData();

    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);
    expect(result.totalRecordsGenerated).toBeGreaterThan(0);

    // Verify existing data is preserved
    const existingUsers = await databaseService.query(
      "SELECT * FROM hr_public.users WHERE email LIKE '%@testdata.com'"
    );
    expect(existingUsers.rows).toHaveLength(2);

    // Verify sample data was added
    const sampleUsers = await databaseService.query(
      "SELECT * FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );
    expect(sampleUsers.rows.length).toBeGreaterThan(0);

    // Total users should be existing + generated
    const totalUsers = await databaseService.query('SELECT COUNT(*) as count FROM hr_public.users');
    const expectedCount = existingUsers.rows.length + sampleUsers.rows.length;
    expect(parseInt(totalUsers.rows[0].count)).toBe(expectedCount);
  });

  test('should handle skipIfExists configuration correctly', async () => {
    // Insert existing data
    await insertExistingTestData();

    const skipConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: testConfig.tableConfigs.map(tc => ({
        ...tc,
        skipIfExists: tc.tableName === 'users' ? true : false
      }))
    };

    const result = await orchestrator.generateSampleData(skipConfig);

    expect(result.success).toBe(true);

    // Users table should be skipped due to existing data
    const usersResult = result.tableResults.find(tr => tr.tableName === 'users');
    expect(usersResult).toBeDefined();
    expect(usersResult!.status).toBe('skipped');
    expect(usersResult!.recordsSkipped).toBeGreaterThan(0);
    expect(usersResult!.recordsGenerated).toBe(0);

    // Other tables should still be generated
    const departmentsResult = result.tableResults.find(tr => tr.tableName === 'departments');
    expect(departmentsResult).toBeDefined();
    expect(departmentsResult!.status).toBe('success');
    expect(departmentsResult!.recordsGenerated).toBeGreaterThan(0);
  });

  test('should update existing sample data on regeneration', async () => {
    // First generation
    const result1 = await orchestrator.generateSampleData(testConfig);
    expect(result1.success).toBe(true);

    const initialCount = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );

    // Second generation (should update, not duplicate)
    const result2 = await orchestrator.generateSampleData(testConfig);
    expect(result2.success).toBe(true);

    const finalCount = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );

    // Should have same number of sample users (updated, not duplicated)
    expect(finalCount.rows[0].count).toBe(initialCount.rows[0].count);

    // Check that some records were updated
    const usersResult = result2.tableResults.find(tr => tr.tableName === 'users');
    expect(usersResult).toBeDefined();
    expect(usersResult!.recordsUpdated).toBeGreaterThan(0);
  });

  test('should preserve foreign key relationships during merge', async () => {
    // Insert existing users and departments
    await insertExistingTestData();

    // Insert existing employee that references existing data
    const existingUser = await databaseService.query(
      "SELECT id FROM hr_public.users WHERE email = 'existing1@testdata.com'"
    );
    const existingDept = await databaseService.query(
      "SELECT id FROM hr_public.departments WHERE name = 'Test Department 1'"
    );

    await databaseService.query(`
      INSERT INTO hr_public.employees (user_id, department_id, full_name, email, created_at)
      VALUES (${existingUser.rows[0].id}, ${existingDept.rows[0].id}, 'Existing Employee', 'existing@testdata.com', NOW())
    `);

    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Verify existing employee relationship is preserved
    const existingEmployee = await databaseService.query(`
      SELECT e.*, u.email as user_email, d.name as dept_name
      FROM hr_public.employees e
      JOIN hr_public.users u ON e.user_id = u.id
      JOIN hr_public.departments d ON e.department_id = d.id
      WHERE e.email = 'existing@testdata.com'
    `);

    expect(existingEmployee.rows).toHaveLength(1);
    expect(existingEmployee.rows[0].user_email).toBe('existing1@testdata.com');
    expect(existingEmployee.rows[0].dept_name).toBe('Test Department 1');

    // Verify new sample data also has valid relationships
    const sampleEmployees = await databaseService.query(`
      SELECT e.*, u.email as user_email, d.name as dept_name
      FROM hr_public.employees e
      JOIN hr_public.users u ON e.user_id = u.id
      JOIN hr_public.departments d ON e.department_id = d.id
      WHERE e.full_name LIKE 'Sample Employee%'
      LIMIT 5
    `);

    sampleEmployees.rows.forEach(row => {
      expect(row.user_email).toBeTruthy();
      expect(row.dept_name).toBeTruthy();
    });
  });

  test('should handle unique constraint conflicts gracefully', async () => {
    // Insert user with email that might conflict with sample data
    await databaseService.query(`
      INSERT INTO hr_public.users (email, full_name, created_at)
      VALUES ('sample.user.001@example.com', 'Conflicting User', NOW())
    `);

    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Should handle conflict by updating existing record or generating different email
    const conflictingEmail = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE email = 'sample.user.001@example.com'"
    );

    // Should only have one record with this email (either updated existing or generated different email)
    expect(parseInt(conflictingEmail.rows[0].count)).toBe(1);
  });

  test('should report accurate merge statistics', async () => {
    // Insert existing data
    await insertExistingTestData();

    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();

    // Should report both created and updated records
    expect(result.summary.recordsCreated).toBeGreaterThan(0);
    expect(result.summary.recordsUpdated).toBeGreaterThanOrEqual(0);
    expect(result.summary.recordsSkipped).toBeGreaterThanOrEqual(0);

    // Total should match
    const expectedTotal = result.summary.recordsCreated +
                         result.summary.recordsUpdated +
                         result.summary.recordsSkipped;
    expect(result.totalRecordsGenerated).toBe(expectedTotal);
  });

  test('should handle partial table existence scenarios', async () => {
    // Only insert some tables with existing data
    await databaseService.query(`
      INSERT INTO hr_public.users (email, full_name, created_at)
      VALUES ('existing@testdata.com', 'Existing User', NOW())
    `);
    // Don't insert departments - let them be empty

    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Users should show updates/merges
    const usersResult = result.tableResults.find(tr => tr.tableName === 'users');
    expect(usersResult).toBeDefined();
    expect(usersResult!.recordsGenerated + usersResult!.recordsUpdated).toBeGreaterThan(0);

    // Departments should show only new creations
    const deptResult = result.tableResults.find(tr => tr.tableName === 'departments');
    expect(deptResult).toBeDefined();
    expect(deptResult!.recordsGenerated).toBeGreaterThan(0);
    expect(deptResult!.recordsUpdated).toBe(0);
  });

  test('should preserve data integrity during merge operations', async () => {
    // Insert existing data with specific constraints
    await insertExistingTestData();

    const result = await orchestrator.generateSampleData(testConfig);

    expect(result.success).toBe(true);

    // Check that all users still have unique emails
    const emailDuplicates = await databaseService.query(`
      SELECT email, COUNT(*) as count
      FROM hr_public.users
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    expect(emailDuplicates.rows).toHaveLength(0);

    // Check that all departments still have unique names
    const deptDuplicates = await databaseService.query(`
      SELECT name, COUNT(*) as count
      FROM hr_public.departments
      GROUP BY name
      HAVING COUNT(*) > 1
    `);
    expect(deptDuplicates.rows).toHaveLength(0);
  });

  test('should handle concurrent data modifications', async () => {
    // Simulate concurrent data modification during generation
    await insertExistingTestData();

    // Start generation
    const generationPromise = orchestrator.generateSampleData(testConfig);

    // Simulate concurrent insert (in real scenario, this could be another process)
    setTimeout(async () => {
      try {
        await databaseService.query(`
          INSERT INTO hr_public.users (email, full_name, created_at)
          VALUES ('concurrent@testdata.com', 'Concurrent User', NOW())
        `);
      } catch (error) {
        // Ignore errors - this is just to test concurrent behavior
      }
    }, 100);

    const result = await generationPromise;

    expect(result.success).toBe(true);

    // Verify system handled concurrent modification gracefully
    const allUsers = await databaseService.query('SELECT COUNT(*) as count FROM hr_public.users');
    expect(parseInt(allUsers.rows[0].count)).toBeGreaterThan(0);
  });

  test('should rollback cleanly if merge operation fails', async () => {
    // Insert existing data
    await insertExistingTestData();

    // Create config that will fail during merge
    const failingConfig: SampleDataConfig = {
      ...testConfig,
      tableConfigs: [
        ...testConfig.tableConfigs.slice(0, 1), // Process users first
        {
          tableName: 'invalid_table',
          recordCount: 10,
          priority: 2,
          namingPattern: 'Sample Invalid {id}',
          customFields: {},
          skipIfExists: false
        }
      ]
    };

    const result = await orchestrator.generateSampleData(failingConfig);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Verify existing data is still there
    const existingUsers = await databaseService.query(
      "SELECT * FROM hr_public.users WHERE email LIKE '%@testdata.com'"
    );
    expect(existingUsers.rows).toHaveLength(2);

    // Verify no partial sample data remains
    const sampleUsers = await databaseService.query(
      "SELECT * FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );
    expect(sampleUsers.rows).toHaveLength(0);
  });

  test('should support incremental data updates', async () => {
    // Insert existing data
    await insertExistingTestData();

    // First generation with smaller record count
    const config1: SampleDataConfig = {
      ...testConfig,
      tableConfigs: testConfig.tableConfigs.map(tc => ({
        ...tc,
        recordCount: Math.floor(tc.recordCount / 2)
      }))
    };

    const result1 = await orchestrator.generateSampleData(config1);
    expect(result1.success).toBe(true);

    const firstGenCount = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );

    // Second generation with full record count
    const result2 = await orchestrator.generateSampleData(testConfig);
    expect(result2.success).toBe(true);

    const secondGenCount = await databaseService.query(
      "SELECT COUNT(*) as count FROM hr_public.users WHERE full_name LIKE 'Sample User%'"
    );

    // Should have more records after second generation
    expect(parseInt(secondGenCount.rows[0].count)).toBeGreaterThan(parseInt(firstGenCount.rows[0].count));

    // Check that incremental update was reported
    const usersResult = result2.tableResults.find(tr => tr.tableName === 'users');
    expect(usersResult).toBeDefined();
    expect(usersResult!.recordsGenerated + usersResult!.recordsUpdated).toBeGreaterThan(0);
  });

  test('should maintain data consistency across multiple merge operations', async () => {
    // Insert initial existing data
    await insertExistingTestData();

    // Perform multiple merge operations
    for (let i = 0; i < 3; i++) {
      const result = await orchestrator.generateSampleData(testConfig);
      expect(result.success).toBe(true);

      // Verify data integrity after each operation
      const userIntegrity = await databaseService.query(`
        SELECT COUNT(DISTINCT email) as unique_emails, COUNT(*) as total_users
        FROM hr_public.users
      `);

      expect(userIntegrity.rows[0].unique_emails).toBe(userIntegrity.rows[0].total_users);
    }

    // Verify existing data is still preserved
    const existingUsers = await databaseService.query(
      "SELECT * FROM hr_public.users WHERE email LIKE '%@testdata.com'"
    );
    expect(existingUsers.rows).toHaveLength(2);
  });
});