/**
 * Contract Tests for TimeEntry GraphQL Operations
 *
 * These tests define the contract for time tracking functionality.
 * IMPORTANT: These tests MUST FAIL initially (TDD red phase).
 *
 * Tests cover:
 * - TimeEntry queries (single, filtered, paginated)
 * - TimeEntry mutations (create, update, submit, approve, reject)
 * - Role-based access control
 * - Data validation and constraints
 */

const { Client } = require('pg');
const { GraphQLClient } = require('graphql-request');
const { describe, beforeAll, afterAll, beforeEach, test, expect } = require('@jest/globals');

describe('TimeEntry GraphQL Contract Tests', () => {
  let dbClient;
  let graphqlClient;
  let testUsers = {};

  beforeAll(async () => {
    // Setup database connection
    dbClient = new Client({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/hr_system_test'
    });
    await dbClient.connect();

    // Setup GraphQL client
    graphqlClient = new GraphQLClient('http://localhost:4000/graphql');

    // Create test users with different roles
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestData();
    await dbClient.end();
  });

  beforeEach(async () => {
    // Clean time entries before each test
    await dbClient.query('DELETE FROM hr_public.time_entries WHERE created_by IN (SELECT id FROM hr_public.users WHERE email LIKE \'%test%\')');
  });

  async function setupTestUsers() {
    // Create test users for different roles
    const testUserData = [
      { email: 'employee.test@hr.com', role_level: 20, display_name: 'Test Employee' },
      { email: 'manager.test@hr.com', role_level: 60, display_name: 'Test Manager' },
      { email: 'hradmin.test@hr.com', role_level: 80, display_name: 'Test HR Admin' },
      { email: 'sysadmin.test@hr.com', role_level: 100, display_name: 'Test System Admin' }
    ];

    for (const userData of testUserData) {
      const result = await dbClient.query(
        'INSERT INTO hr_public.users (email, role_level, display_name, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET role_level = $2 RETURNING *',
        [userData.email, userData.role_level, userData.display_name, 'test-hash']
      );

      const roleKey = userData.role_level === 20 ? 'employee' :
                     userData.role_level === 60 ? 'manager' :
                     userData.role_level === 80 ? 'hradmin' : 'sysadmin';

      testUsers[roleKey] = result.rows[0];
    }
  }

  async function authenticateUser(user) {
    const mutation = `
      mutation Authenticate($email: String!, $password: String!) {
        authenticate(input: { email: $email, password: $password }) {
          jwtToken
          user {
            id
            email
            roleLevel
          }
        }
      }
    `;

    // This will fail initially because authenticate mutation doesn't exist yet
    const result = await graphqlClient.request(mutation, {
      email: user.email,
      password: 'test-password'
    });

    return result.authenticate.jwtToken;
  }

  async function cleanupTestData() {
    await dbClient.query('DELETE FROM hr_public.users WHERE email LIKE \'%test%\'');
  }

  // Query Contract Tests
  describe('TimeEntry Queries', () => {
    test('should query single time entry by ID', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      // First create a time entry to query
      const createMutation = `
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry {
              id
              entryDate
              totalHours
              status
              employee {
                id
                email
              }
            }
          }
        }
      `;

      const createResult = await graphqlClient.request(createMutation, {
        input: {
          entryDate: '2025-01-25',
          totalHours: 8.0,
          taskDescription: 'Development work'
        }
      });

      const timeEntryId = createResult.createTimeEntry.timeEntry.id;

      // Now query the created entry
      const query = `
        query GetTimeEntry($id: ID!) {
          timeEntry(id: $id) {
            id
            entryDate
            totalHours
            taskDescription
            status
            employee {
              id
              email
            }
            createdAt
            updatedAt
          }
        }
      `;

      const result = await graphqlClient.request(query, { id: timeEntryId });

      expect(result.timeEntry).toBeDefined();
      expect(result.timeEntry.id).toBe(timeEntryId);
      expect(result.timeEntry.totalHours).toBe(8.0);
      expect(result.timeEntry.status).toBe('DRAFT');
    });

    test('should query employee own time entries', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query MyTimeEntries($startDate: Date, $endDate: Date) {
          myTimeEntries(startDate: $startDate, endDate: $endDate) {
            id
            entryDate
            totalHours
            status
            taskDescription
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.myTimeEntries).toBeDefined();
      expect(Array.isArray(result.myTimeEntries)).toBe(true);
    });

    test('should query team time entries as manager', async () => {
      const token = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query TeamTimeEntries($managerId: ID!, $startDate: Date!, $endDate: Date!) {
          teamTimeEntries(managerId: $managerId, startDate: $startDate, endDate: $endDate) {
            id
            entryDate
            totalHours
            status
            employee {
              id
              displayName
            }
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        managerId: testUsers.manager.id,
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.teamTimeEntries).toBeDefined();
      expect(Array.isArray(result.teamTimeEntries)).toBe(true);
    });

    test('should filter time entries by status', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query TimeEntries($filter: TimeEntryFilter) {
          timeEntries(filter: $filter) {
            nodes {
              id
              status
              totalHours
            }
            totalCount
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        filter: {
          status: { equalTo: 'SUBMITTED' }
        }
      });

      expect(result.timeEntries.nodes).toBeDefined();
      expect(Array.isArray(result.timeEntries.nodes)).toBe(true);
      expect(typeof result.timeEntries.totalCount).toBe('number');
    });
  });

  // Mutation Contract Tests
  describe('TimeEntry Mutations', () => {
    test('should create time entry as employee', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry {
              id
              entryDate
              startTime
              endTime
              totalHours
              taskDescription
              status
              employee {
                id
                email
              }
            }
          }
        }
      `;

      const input = {
        entryDate: '2025-01-25',
        startTime: '09:00',
        endTime: '17:00',
        totalHours: 7.5,
        taskDescription: 'Contract test development',
        billable: false
      };

      const result = await graphqlClient.request(mutation, { input });

      expect(result.createTimeEntry.timeEntry).toBeDefined();
      expect(result.createTimeEntry.timeEntry.entryDate).toBe('2025-01-25');
      expect(result.createTimeEntry.timeEntry.totalHours).toBe(7.5);
      expect(result.createTimeEntry.timeEntry.status).toBe('DRAFT');
    });

    test('should update time entry as owner', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      // First create a time entry
      const createResult = await graphqlClient.request(`
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry { id }
          }
        }
      `, {
        input: {
          entryDate: '2025-01-25',
          totalHours: 8.0,
          taskDescription: 'Initial task'
        }
      });

      const timeEntryId = createResult.createTimeEntry.timeEntry.id;

      // Update the time entry
      const updateMutation = `
        mutation UpdateTimeEntry($input: UpdateTimeEntryInput!) {
          updateTimeEntry(input: $input) {
            timeEntry {
              id
              taskDescription
              totalHours
              updatedAt
            }
          }
        }
      `;

      const result = await graphqlClient.request(updateMutation, {
        input: {
          id: timeEntryId,
          taskDescription: 'Updated task description',
          totalHours: 7.0
        }
      });

      expect(result.updateTimeEntry.timeEntry.taskDescription).toBe('Updated task description');
      expect(result.updateTimeEntry.timeEntry.totalHours).toBe(7.0);
    });

    test('should submit time entry for approval', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      // Create and submit time entry
      const createResult = await graphqlClient.request(`
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry { id }
          }
        }
      `, {
        input: {
          entryDate: '2025-01-25',
          totalHours: 8.0,
          taskDescription: 'Ready for approval'
        }
      });

      const submitMutation = `
        mutation SubmitTimeEntry($input: SubmitTimeEntryInput!) {
          submitTimeEntry(input: $input) {
            timeEntry {
              id
              status
              submittedAt
            }
          }
        }
      `;

      const result = await graphqlClient.request(submitMutation, {
        input: {
          timeEntryId: createResult.createTimeEntry.timeEntry.id
        }
      });

      expect(result.submitTimeEntry.timeEntry.status).toBe('SUBMITTED');
      expect(result.submitTimeEntry.timeEntry.submittedAt).toBeTruthy();
    });

    test('should approve time entry as manager', async () => {
      // Setup: Create time entry as employee and submit it
      const employeeToken = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${employeeToken}`);

      const createResult = await graphqlClient.request(`
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry { id }
          }
        }
      `, {
        input: {
          entryDate: '2025-01-25',
          totalHours: 8.0,
          taskDescription: 'Awaiting approval'
        }
      });

      const timeEntryId = createResult.createTimeEntry.timeEntry.id;

      await graphqlClient.request(`
        mutation SubmitTimeEntry($input: SubmitTimeEntryInput!) {
          submitTimeEntry(input: $input) {
            timeEntry { id }
          }
        }
      `, { input: { timeEntryId } });

      // Now approve as manager
      const managerToken = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${managerToken}`);

      const approveMutation = `
        mutation ApproveTimeEntry($input: ApproveTimeEntryInput!) {
          approveTimeEntry(input: $input) {
            timeEntry {
              id
              status
              approvedBy {
                id
                email
              }
              approvedAt
            }
          }
        }
      `;

      const result = await graphqlClient.request(approveMutation, {
        input: {
          timeEntryId: timeEntryId,
          comments: 'Approved by manager'
        }
      });

      expect(result.approveTimeEntry.timeEntry.status).toBe('APPROVED');
      expect(result.approveTimeEntry.timeEntry.approvedBy.id).toBe(testUsers.manager.id);
      expect(result.approveTimeEntry.timeEntry.approvedAt).toBeTruthy();
    });

    test('should reject time entry with reason', async () => {
      // Similar setup as approval test
      const employeeToken = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${employeeToken}`);

      const createResult = await graphqlClient.request(`
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry { id }
          }
        }
      `, {
        input: {
          entryDate: '2025-01-25',
          totalHours: 8.0,
          taskDescription: 'To be rejected'
        }
      });

      const timeEntryId = createResult.createTimeEntry.timeEntry.id;

      await graphqlClient.request(`
        mutation SubmitTimeEntry($input: SubmitTimeEntryInput!) {
          submitTimeEntry(input: $input) {
            timeEntry { id }
          }
        }
      `, { input: { timeEntryId } });

      // Reject as manager
      const managerToken = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${managerToken}`);

      const rejectMutation = `
        mutation RejectTimeEntry($input: RejectTimeEntryInput!) {
          rejectTimeEntry(input: $input) {
            timeEntry {
              id
              status
              rejectionReason
            }
          }
        }
      `;

      const result = await graphqlClient.request(rejectMutation, {
        input: {
          timeEntryId: timeEntryId,
          rejectionReason: 'Insufficient task description'
        }
      });

      expect(result.rejectTimeEntry.timeEntry.status).toBe('REJECTED');
      expect(result.rejectTimeEntry.timeEntry.rejectionReason).toBe('Insufficient task description');
    });
  });

  // Access Control Contract Tests
  describe('TimeEntry Access Control', () => {
    test('employee should not access other employee time entries', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      // Try to query time entries with a filter for different employee
      const query = `
        query TimeEntries($filter: TimeEntryFilter) {
          timeEntries(filter: $filter) {
            nodes {
              id
              employee {
                id
              }
            }
          }
        }
      `;

      // This should only return the authenticated user's entries due to RLS
      const result = await graphqlClient.request(query, {
        filter: {
          employeeId: { equalTo: testUsers.manager.id } // Different user
        }
      });

      expect(result.timeEntries.nodes).toHaveLength(0);
    });

    test('manager should access direct reports time entries', async () => {
      const token = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query TeamTimeEntries($managerId: ID!, $startDate: Date!, $endDate: Date!) {
          teamTimeEntries(managerId: $managerId, startDate: $startDate, endDate: $endDate) {
            id
            employee {
              id
              managerId
            }
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        managerId: testUsers.manager.id,
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.teamTimeEntries).toBeDefined();
      // All returned entries should have manager_id matching the requesting manager
      result.teamTimeEntries.forEach(entry => {
        expect(entry.employee.managerId).toBe(testUsers.manager.id);
      });
    });

    test('non-manager should not approve time entries', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const approveMutation = `
        mutation ApproveTimeEntry($input: ApproveTimeEntryInput!) {
          approveTimeEntry(input: $input) {
            timeEntry {
              id
              status
            }
          }
        }
      `;

      // This should fail due to insufficient permissions
      await expect(graphqlClient.request(approveMutation, {
        input: {
          timeEntryId: 'some-id',
          comments: 'Unauthorized approval attempt'
        }
      })).rejects.toThrow();
    });
  });

  // Data Validation Contract Tests
  describe('TimeEntry Data Validation', () => {
    test('should reject invalid total hours', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry {
              id
            }
          }
        }
      `;

      // Test negative hours
      await expect(graphqlClient.request(mutation, {
        input: {
          entryDate: '2025-01-25',
          totalHours: -2.0,
          taskDescription: 'Invalid hours'
        }
      })).rejects.toThrow();

      // Test excessive hours (> 24)
      await expect(graphqlClient.request(mutation, {
        input: {
          entryDate: '2025-01-25',
          totalHours: 25.0,
          taskDescription: 'Too many hours'
        }
      })).rejects.toThrow();
    });

    test('should reject future dates for time entries', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry {
              id
            }
          }
        }
      `;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      await expect(graphqlClient.request(mutation, {
        input: {
          entryDate: futureDate.toISOString().split('T')[0],
          totalHours: 8.0,
          taskDescription: 'Future work'
        }
      })).rejects.toThrow();
    });

    test('should validate time range consistency', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateTimeEntry($input: CreateTimeEntryInput!) {
          createTimeEntry(input: $input) {
            timeEntry {
              id
            }
          }
        }
      `;

      // End time before start time should fail
      await expect(graphqlClient.request(mutation, {
        input: {
          entryDate: '2025-01-25',
          startTime: '17:00',
          endTime: '09:00',
          totalHours: 8.0,
          taskDescription: 'Invalid time range'
        }
      })).rejects.toThrow();
    });
  });
});