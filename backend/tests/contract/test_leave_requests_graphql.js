/**
 * Contract Tests for LeaveRequest GraphQL Operations
 *
 * These tests define the contract for leave management functionality.
 * IMPORTANT: These tests MUST FAIL initially (TDD red phase).
 *
 * Tests cover:
 * - LeaveRequest queries (employee own, manager team, HR all)
 * - LeaveRequest mutations (create, update, cancel, approve, reject)
 * - Leave balance calculations
 * - Role-based access control
 * - Business logic validation
 */

const { Client } = require('pg');
const { GraphQLClient } = require('graphql-request');
const { describe, beforeAll, afterAll, beforeEach, test, expect } = require('@jest/globals');

describe('LeaveRequest GraphQL Contract Tests', () => {
  let dbClient;
  let graphqlClient;
  let testUsers = {};

  beforeAll(async () => {
    dbClient = new Client({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/hr_system_test'
    });
    await dbClient.connect();

    graphqlClient = new GraphQLClient('http://localhost:4000/graphql');
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestData();
    await dbClient.end();
  });

  beforeEach(async () => {
    await dbClient.query('DELETE FROM hr_public.leave_requests WHERE employee_id IN (SELECT id FROM hr_public.users WHERE email LIKE \'%test%\')');
  });

  async function setupTestUsers() {
    const testUserData = [
      { email: 'employee.leave.test@hr.com', role_level: 20, display_name: 'Leave Test Employee' },
      { email: 'manager.leave.test@hr.com', role_level: 60, display_name: 'Leave Test Manager' },
      { email: 'hradmin.leave.test@hr.com', role_level: 80, display_name: 'Leave Test HR Admin' }
    ];

    for (const userData of testUserData) {
      const result = await dbClient.query(
        'INSERT INTO hr_public.users (email, role_level, display_name, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET role_level = $2 RETURNING *',
        [userData.email, userData.role_level, userData.display_name, 'test-hash']
      );

      const roleKey = userData.role_level === 20 ? 'employee' :
                     userData.role_level === 60 ? 'manager' : 'hradmin';
      testUsers[roleKey] = result.rows[0];
    }
  }

  async function authenticateUser(user) {
    const mutation = `
      mutation Authenticate($email: String!, $password: String!) {
        authenticate(input: { email: $email, password: $password }) {
          jwtToken
        }
      }
    `;

    const result = await graphqlClient.request(mutation, {
      email: user.email,
      password: 'test-password'
    });

    return result.authenticate.jwtToken;
  }

  async function cleanupTestData() {
    await dbClient.query('DELETE FROM hr_public.users WHERE email LIKE \'%leave.test%\'');
  }

  // Query Contract Tests
  describe('LeaveRequest Queries', () => {
    test('should query employee own leave requests', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query MyLeaveRequests($status: LeaveRequestStatus) {
          myLeaveRequests(status: $status) {
            id
            leaveType
            startDate
            endDate
            totalDays
            status
            reason
            submittedAt
            leaveBalanceBefore
            leaveBalanceAfter
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        status: 'PENDING'
      });

      expect(result.myLeaveRequests).toBeDefined();
      expect(Array.isArray(result.myLeaveRequests)).toBe(true);
    });

    test('should query team leave requests as manager', async () => {
      const token = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query TeamLeaveRequests($managerId: ID!, $status: LeaveRequestStatus) {
          teamLeaveRequests(managerId: $managerId, status: $status) {
            id
            employee {
              id
              displayName
              email
            }
            leaveType
            startDate
            endDate
            totalDays
            status
            reason
            emergencyContactDuringLeave
            workCoveragePlan
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        managerId: testUsers.manager.id,
        status: 'PENDING'
      });

      expect(result.teamLeaveRequests).toBeDefined();
      expect(Array.isArray(result.teamLeaveRequests)).toBe(true);
    });

    test('should query leave balance for employee', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query LeaveBalance($employeeId: ID!, $leaveType: LeaveType!) {
          leaveBalance(employeeId: $employeeId, leaveType: $leaveType)
        }
      `;

      const result = await graphqlClient.request(query, {
        employeeId: testUsers.employee.id,
        leaveType: 'VACATION'
      });

      expect(result.leaveBalance).toBeDefined();
      expect(typeof result.leaveBalance).toBe('number');
      expect(result.leaveBalance).toBeGreaterThanOrEqual(0);
    });

    test('should filter leave requests by date range', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query LeaveRequests($filter: LeaveRequestFilter) {
          leaveRequests(filter: $filter) {
            nodes {
              id
              startDate
              endDate
              leaveType
              status
            }
            totalCount
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        filter: {
          startDate: {
            greaterThanOrEqualTo: '2025-01-01',
            lessThanOrEqualTo: '2025-12-31'
          }
        }
      });

      expect(result.leaveRequests.nodes).toBeDefined();
      expect(Array.isArray(result.leaveRequests.nodes)).toBe(true);
      expect(typeof result.leaveRequests.totalCount).toBe('number');
    });
  });

  // Mutation Contract Tests
  describe('LeaveRequest Mutations', () => {
    test('should create leave request as employee', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest {
              id
              leaveType
              startDate
              endDate
              totalDays
              reason
              status
              emergencyContactDuringLeave
              workCoveragePlan
              employee {
                id
                email
              }
              leaveBalanceBefore
              leaveBalanceAfter
            }
          }
        }
      `;

      const input = {
        leaveType: 'VACATION',
        startDate: '2025-02-10',
        endDate: '2025-02-14',
        reason: 'Family vacation',
        emergencyContactDuringLeave: 'Spouse: +1-555-0123',
        workCoveragePlan: 'Tasks delegated to team members'
      };

      const result = await graphqlClient.request(mutation, { input });

      expect(result.createLeaveRequest.leaveRequest).toBeDefined();
      expect(result.createLeaveRequest.leaveRequest.leaveType).toBe('VACATION');
      expect(result.createLeaveRequest.leaveRequest.totalDays).toBe(5); // Monday to Friday
      expect(result.createLeaveRequest.leaveRequest.status).toBe('PENDING');
      expect(result.createLeaveRequest.leaveRequest.leaveBalanceBefore).toBeGreaterThanOrEqual(0);
    });

    test('should update leave request before submission', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      // First create a leave request
      const createResult = await graphqlClient.request(`
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `, {
        input: {
          leaveType: 'PERSONAL',
          startDate: '2025-03-01',
          endDate: '2025-03-01',
          reason: 'Original reason'
        }
      });

      const leaveRequestId = createResult.createLeaveRequest.leaveRequest.id;

      // Update the leave request
      const updateMutation = `
        mutation UpdateLeaveRequest($input: UpdateLeaveRequestInput!) {
          updateLeaveRequest(input: $input) {
            leaveRequest {
              id
              reason
              endDate
              totalDays
              updatedAt
            }
          }
        }
      `;

      const result = await graphqlClient.request(updateMutation, {
        input: {
          id: leaveRequestId,
          reason: 'Updated reason for personal leave',
          endDate: '2025-03-02' // Extend by one day
        }
      });

      expect(result.updateLeaveRequest.leaveRequest.reason).toBe('Updated reason for personal leave');
      expect(result.updateLeaveRequest.leaveRequest.totalDays).toBe(2);
    });

    test('should cancel leave request by employee', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      // Create leave request
      const createResult = await graphqlClient.request(`
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `, {
        input: {
          leaveType: 'SICK',
          startDate: '2025-02-20',
          endDate: '2025-02-21',
          reason: 'Not feeling well'
        }
      });

      const leaveRequestId = createResult.createLeaveRequest.leaveRequest.id;

      // Cancel the leave request
      const cancelMutation = `
        mutation CancelLeaveRequest($input: CancelLeaveRequestInput!) {
          cancelLeaveRequest(input: $input) {
            leaveRequest {
              id
              status
              updatedAt
            }
          }
        }
      `;

      const result = await graphqlClient.request(cancelMutation, {
        input: {
          leaveRequestId: leaveRequestId
        }
      });

      expect(result.cancelLeaveRequest.leaveRequest.status).toBe('CANCELLED');
    });

    test('should approve leave request as manager', async () => {
      // Setup: Create leave request as employee
      const employeeToken = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${employeeToken}`);

      const createResult = await graphqlClient.request(`
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `, {
        input: {
          leaveType: 'VACATION',
          startDate: '2025-04-01',
          endDate: '2025-04-05',
          reason: 'Spring break',
          workCoveragePlan: 'Coverage arranged'
        }
      });

      const leaveRequestId = createResult.createLeaveRequest.leaveRequest.id;

      // Approve as manager
      const managerToken = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${managerToken}`);

      const approveMutation = `
        mutation ApproveLeaveRequest($input: ApproveLeaveRequestInput!) {
          approveLeaveRequest(input: $input) {
            leaveRequest {
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
          leaveRequestId: leaveRequestId
        }
      });

      expect(result.approveLeaveRequest.leaveRequest.status).toBe('APPROVED');
      expect(result.approveLeaveRequest.leaveRequest.approvedBy.id).toBe(testUsers.manager.id);
      expect(result.approveLeaveRequest.leaveRequest.approvedAt).toBeTruthy();
    });

    test('should reject leave request with reason', async () => {
      // Setup: Create leave request as employee
      const employeeToken = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${employeeToken}`);

      const createResult = await graphqlClient.request(`
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `, {
        input: {
          leaveType: 'VACATION',
          startDate: '2025-12-24',
          endDate: '2025-12-31',
          reason: 'Christmas holidays'
        }
      });

      const leaveRequestId = createResult.createLeaveRequest.leaveRequest.id;

      // Reject as manager
      const managerToken = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${managerToken}`);

      const rejectMutation = `
        mutation RejectLeaveRequest($input: RejectLeaveRequestInput!) {
          rejectLeaveRequest(input: $input) {
            leaveRequest {
              id
              status
              rejectionReason
            }
          }
        }
      `;

      const result = await graphqlClient.request(rejectMutation, {
        input: {
          leaveRequestId: leaveRequestId,
          rejectionReason: 'Peak season - insufficient coverage available'
        }
      });

      expect(result.rejectLeaveRequest.leaveRequest.status).toBe('REJECTED');
      expect(result.rejectLeaveRequest.leaveRequest.rejectionReason).toBe('Peak season - insufficient coverage available');
    });
  });

  // Business Logic Contract Tests
  describe('LeaveRequest Business Logic', () => {
    test('should prevent overlapping leave requests', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      // Create first leave request
      await graphqlClient.request(`
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `, {
        input: {
          leaveType: 'VACATION',
          startDate: '2025-05-01',
          endDate: '2025-05-05',
          reason: 'First vacation'
        }
      });

      // Try to create overlapping leave request
      const overlappingMutation = `
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `;

      await expect(graphqlClient.request(overlappingMutation, {
        input: {
          leaveType: 'PERSONAL',
          startDate: '2025-05-03', // Overlaps with existing request
          endDate: '2025-05-07',
          reason: 'Overlapping request'
        }
      })).rejects.toThrow();
    });

    test('should validate sufficient leave balance', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `;

      // Try to request more leave than available balance
      await expect(graphqlClient.request(mutation, {
        input: {
          leaveType: 'VACATION',
          startDate: '2025-06-01',
          endDate: '2025-06-30', // 30 days - likely exceeds balance
          reason: 'Extended vacation'
        }
      })).rejects.toThrow();
    });

    test('should calculate weekdays correctly for total days', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest {
              id
              startDate
              endDate
              totalDays
            }
          }
        }
      `;

      // Request leave from Friday to Monday (should be 2 weekdays)
      const result = await graphqlClient.request(mutation, {
        input: {
          leaveType: 'PERSONAL',
          startDate: '2025-07-04', // Friday
          endDate: '2025-07-07',   // Monday
          reason: 'Long weekend'
        }
      });

      expect(result.createLeaveRequest.leaveRequest.totalDays).toBe(2); // Only Friday and Monday count
    });

    test('should prevent past date leave requests', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation CreateLeaveRequest($input: CreateLeaveRequestInput!) {
          createLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `;

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      await expect(graphqlClient.request(mutation, {
        input: {
          leaveType: 'SICK',
          startDate: pastDate.toISOString().split('T')[0],
          endDate: pastDate.toISOString().split('T')[0],
          reason: 'Retroactive sick leave'
        }
      })).rejects.toThrow();
    });
  });

  // Access Control Contract Tests
  describe('LeaveRequest Access Control', () => {
    test('employee should not access other employee leave requests', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query LeaveRequests($filter: LeaveRequestFilter) {
          leaveRequests(filter: $filter) {
            nodes {
              id
              employee {
                id
              }
            }
          }
        }
      `;

      // Try to filter by different employee - should return empty due to RLS
      const result = await graphqlClient.request(query, {
        filter: {
          employeeId: { equalTo: testUsers.manager.id }
        }
      });

      expect(result.leaveRequests.nodes).toHaveLength(0);
    });

    test('manager should only see direct reports leave requests', async () => {
      const token = await authenticateUser(testUsers.manager);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query TeamLeaveRequests($managerId: ID!) {
          teamLeaveRequests(managerId: $managerId) {
            id
            employee {
              id
              managerId
            }
          }
        }
      `;

      const result = await graphqlClient.request(query, {
        managerId: testUsers.manager.id
      });

      // All returned requests should be for direct reports
      result.teamLeaveRequests.forEach(request => {
        expect(request.employee.managerId).toBe(testUsers.manager.id);
      });
    });

    test('non-manager should not approve leave requests', async () => {
      const token = await authenticateUser(testUsers.employee);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const mutation = `
        mutation ApproveLeaveRequest($input: ApproveLeaveRequestInput!) {
          approveLeaveRequest(input: $input) {
            leaveRequest { id }
          }
        }
      `;

      await expect(graphqlClient.request(mutation, {
        input: {
          leaveRequestId: 'some-id'
        }
      })).rejects.toThrow();
    });

    test('HR admin should access all leave requests', async () => {
      const token = await authenticateUser(testUsers.hradmin);
      graphqlClient.setHeader('Authorization', `Bearer ${token}`);

      const query = `
        query LeaveRequests {
          leaveRequests {
            nodes {
              id
              employee {
                id
                displayName
              }
              leaveType
              status
            }
            totalCount
          }
        }
      `;

      const result = await graphqlClient.request(query);

      expect(result.leaveRequests.nodes).toBeDefined();
      expect(Array.isArray(result.leaveRequests.nodes)).toBe(true);
      // HR admin should be able to see requests from all employees
    });
  });
});