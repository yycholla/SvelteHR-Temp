/**
 * Integration Test: Database Schema Discovery
 *
 * This test validates the database schema discovery functionality.
 * It MUST FAIL initially until the implementation is created.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// This import will fail initially - that's expected for TDD
import { SchemaDiscoveryService } from '../../src/sample-data/services/SchemaDiscoveryService';
import { DatabaseService } from '../../src/sample-data/services/DatabaseService';
import type { DatabaseSchema, TableSchema } from '../../src/sample-data/models/DatabaseSchema';

describe('Schema Discovery Integration', () => {
  let schemaService: SchemaDiscoveryService;
  let databaseService: DatabaseService;

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
    schemaService = new SchemaDiscoveryService(databaseService);
  });

  afterAll(async () => {
    if (databaseService) {
      await databaseService.disconnect();
    }
  });

  test('should discover hr_public schema', async () => {
    const schema = await schemaService.discoverSchema('hr_public');

    expect(schema).toBeDefined();
    expect(schema.schemaName).toBe('hr_public');
    expect(schema.tables).toBeDefined();
    expect(Array.isArray(schema.tables)).toBe(true);
    expect(schema.metadata).toBeDefined();
    expect(schema.metadata.discoveredAt instanceof Date).toBe(true);
  });

  test('should discover all core HR tables', async () => {
    const schema = await schemaService.discoverSchema('hr_public');

    const expectedTables = [
      'users',
      'departments',
      'employees',
      'user_role_assignments',
      'performance_reviews',
      'employee_goals',
      'time_off_requests',
      'time_off_balances',
      'payroll_records',
      'compensation_bands',
      'review_templates',
      'time_off_policies'
    ];

    const discoveredTableNames = schema.tables.map(table => table.tableName);

    expectedTables.forEach(expectedTable => {
      expect(discoveredTableNames).toContain(expectedTable);
    });

    expect(schema.metadata.tableCount).toBeGreaterThanOrEqual(expectedTables.length);
  });

  test('should discover table columns correctly', async () => {
    const schema = await schemaService.discoverSchema('hr_public');
    const usersTable = schema.tables.find(table => table.tableName === 'users');

    expect(usersTable).toBeDefined();
    expect(usersTable!.columns).toBeDefined();
    expect(Array.isArray(usersTable!.columns)).toBe(true);
    expect(usersTable!.columns.length).toBeGreaterThan(0);

    // Check for expected columns in users table
    const columnNames = usersTable!.columns.map(col => col.columnName);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('email');
    expect(columnNames).toContain('full_name');

    // Validate column properties
    const idColumn = usersTable!.columns.find(col => col.columnName === 'id');
    expect(idColumn).toBeDefined();
    expect(idColumn!.dataType).toBeTruthy();
    expect(typeof idColumn!.isNullable).toBe('boolean');
  });

  test('should discover primary keys correctly', async () => {
    const schema = await schemaService.discoverSchema('hr_public');
    const usersTable = schema.tables.find(table => table.tableName === 'users');

    expect(usersTable).toBeDefined();
    expect(usersTable!.primaryKeys).toBeDefined();
    expect(Array.isArray(usersTable!.primaryKeys)).toBe(true);
    expect(usersTable!.primaryKeys.length).toBeGreaterThan(0);
    expect(usersTable!.primaryKeys).toContain('id');
  });

  test('should discover foreign keys correctly', async () => {
    const schema = await schemaService.discoverSchema('hr_public');
    const employeesTable = schema.tables.find(table => table.tableName === 'employees');

    expect(employeesTable).toBeDefined();
    expect(employeesTable!.foreignKeys).toBeDefined();
    expect(Array.isArray(employeesTable!.foreignKeys)).toBe(true);

    // Employees table should have foreign keys to users and departments
    const foreignKeyColumns = employeesTable!.foreignKeys.map(fk => fk.columnName);
    expect(foreignKeyColumns).toContain('user_id');
    expect(foreignKeyColumns).toContain('department_id');

    // Validate foreign key structure
    const userIdFK = employeesTable!.foreignKeys.find(fk => fk.columnName === 'user_id');
    expect(userIdFK).toBeDefined();
    expect(userIdFK!.referencedTable).toBe('users');
    expect(userIdFK!.referencedColumn).toBe('id');
    expect(userIdFK!.constraintName).toBeTruthy();
  });

  test('should discover table indexes', async () => {
    const schema = await schemaService.discoverSchema('hr_public');
    const usersTable = schema.tables.find(table => table.tableName === 'users');

    expect(usersTable).toBeDefined();
    expect(usersTable!.indexes).toBeDefined();
    expect(Array.isArray(usersTable!.indexes)).toBe(true);

    // Check for unique index on email (if exists)
    if (usersTable!.indexes.length > 0) {
      const emailIndex = usersTable!.indexes.find(idx =>
        idx.columnNames.includes('email')
      );
      if (emailIndex) {
        expect(emailIndex.isUnique).toBeDefined();
        expect(typeof emailIndex.isUnique).toBe('boolean');
      }
    }
  });

  test('should handle non-existent schema gracefully', async () => {
    await expect(
      schemaService.discoverSchema('non_existent_schema')
    ).rejects.toThrow();
  });

  test('should validate schema discovery performance', async () => {
    const startTime = Date.now();

    const schema = await schemaService.discoverSchema('hr_public');

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    expect(schema).toBeDefined();
    expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should cache schema discovery results', async () => {
    // First discovery
    const startTime1 = Date.now();
    const schema1 = await schemaService.discoverSchema('hr_public');
    const endTime1 = Date.now();
    const firstDiscoveryTime = endTime1 - startTime1;

    // Second discovery (should be cached)
    const startTime2 = Date.now();
    const schema2 = await schemaService.discoverSchema('hr_public');
    const endTime2 = Date.now();
    const secondDiscoveryTime = endTime2 - startTime2;

    expect(schema1).toEqual(schema2);
    expect(secondDiscoveryTime).toBeLessThan(firstDiscoveryTime);
    expect(secondDiscoveryTime).toBeLessThan(100); // Cached result should be very fast
  });

  test('should discover column data types correctly', async () => {
    const schema = await schemaService.discoverSchema('hr_public');
    const usersTable = schema.tables.find(table => table.tableName === 'users');

    expect(usersTable).toBeDefined();

    const columns = usersTable!.columns;

    // Check for common PostgreSQL data types
    const idColumn = columns.find(col => col.columnName === 'id');
    const emailColumn = columns.find(col => col.columnName === 'email');
    const createdAtColumn = columns.find(col => col.columnName === 'created_at');

    if (idColumn) {
      expect(['integer', 'bigint', 'serial', 'bigserial']).toContain(idColumn.dataType);
    }

    if (emailColumn) {
      expect(['varchar', 'text', 'character varying']).toContain(emailColumn.dataType);
      if (emailColumn.maxLength) {
        expect(emailColumn.maxLength).toBeGreaterThan(0);
      }
    }

    if (createdAtColumn) {
      expect(['timestamp', 'timestamptz', 'timestamp with time zone']).toContain(createdAtColumn.dataType);
    }
  });

  test('should discover nullable and non-nullable columns', async () => {
    const schema = await schemaService.discoverSchema('hr_public');
    const usersTable = schema.tables.find(table => table.tableName === 'users');

    expect(usersTable).toBeDefined();

    const columns = usersTable!.columns;

    // ID column should not be nullable
    const idColumn = columns.find(col => col.columnName === 'id');
    if (idColumn) {
      expect(idColumn.isNullable).toBe(false);
    }

    // Email column should not be nullable (assuming business logic)
    const emailColumn = columns.find(col => col.columnName === 'email');
    if (emailColumn) {
      expect(typeof emailColumn.isNullable).toBe('boolean');
    }
  });

  test('should discover table relationships correctly', async () => {
    const schema = await schemaService.discoverSchema('hr_public');

    // Find related tables
    const usersTable = schema.tables.find(table => table.tableName === 'users');
    const employeesTable = schema.tables.find(table => table.tableName === 'employees');
    const departmentsTable = schema.tables.find(table => table.tableName === 'departments');

    expect(usersTable).toBeDefined();
    expect(employeesTable).toBeDefined();
    expect(departmentsTable).toBeDefined();

    // Validate user -> employee relationship
    const userIdFK = employeesTable!.foreignKeys.find(fk =>
      fk.columnName === 'user_id' && fk.referencedTable === 'users'
    );
    expect(userIdFK).toBeDefined();

    // Validate department -> employee relationship
    const departmentIdFK = employeesTable!.foreignKeys.find(fk =>
      fk.columnName === 'department_id' && fk.referencedTable === 'departments'
    );
    expect(departmentIdFK).toBeDefined();
  });

  test('should handle database connection errors gracefully', async () => {
    // Create service with invalid connection
    const invalidDbService = new DatabaseService({
      host: 'invalid-host',
      port: 9999,
      database: 'invalid_db',
      user: 'invalid_user',
      password: 'invalid_password'
    });

    const invalidSchemaService = new SchemaDiscoveryService(invalidDbService);

    await expect(
      invalidSchemaService.discoverSchema('hr_public')
    ).rejects.toThrow();
  });

  test('should validate schema metadata', async () => {
    const schema = await schemaService.discoverSchema('hr_public');

    expect(schema.metadata).toBeDefined();
    expect(schema.metadata.discoveredAt instanceof Date).toBe(true);
    expect(schema.metadata.tableCount).toBeGreaterThan(0);
    expect(schema.metadata.version).toBeTruthy();
    expect(schema.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);

    // Validate metadata consistency
    expect(schema.metadata.tableCount).toBe(schema.tables.length);
  });

  test('should discover complex table structures', async () => {
    const schema = await schemaService.discoverSchema('hr_public');

    // Find a table with complex relationships (like user_role_assignments)
    const roleAssignmentsTable = schema.tables.find(table =>
      table.tableName === 'user_role_assignments'
    );

    if (roleAssignmentsTable) {
      expect(roleAssignmentsTable.foreignKeys.length).toBeGreaterThan(1);

      // Should have foreign keys to both users and roles
      const foreignKeyTables = roleAssignmentsTable.foreignKeys.map(fk => fk.referencedTable);
      expect(foreignKeyTables).toContain('users');
    }
  });

  test('should support incremental schema discovery', async () => {
    // Discover specific tables
    const specificTables = ['users', 'departments'];
    const partialSchema = await schemaService.discoverTables('hr_public', specificTables);

    expect(partialSchema.tables).toHaveLength(2);
    expect(partialSchema.tables.map(t => t.tableName)).toEqual(expect.arrayContaining(specificTables));
    expect(partialSchema.metadata.tableCount).toBe(2);
  });
});