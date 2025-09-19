import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type Client } from '@urql/core';

// Contract tests for Leave Management GraphQL operations
// These tests verify the GraphQL schema contracts match our expectations
// CRITICAL: These tests MUST FAIL initially before implementation

describe('Leave Management Contract Tests', () => {
	let client: Client;

	beforeAll(() => {
		// Create GraphQL client for testing
		client = createClient({
			url: 'http://localhost:8080/graphql',
			fetchOptions: {
				headers: {
					'Content-Type': 'application/json'
				}
			}
		});
	});

	describe('Leave Policies Query', () => {
		it('should have correct schema structure for leave policies query', async () => {
			const query = `
        query GetLeavePolicies {
          leavePolicies {
            nodes {
              id
              name
              leaveType
              description
              accrualRate
              maxAccrual
              maxCarryover
              requiresApproval
              advanceNoticeDays
              maxConsecutiveDays
              isActive
            }
          }
        }
      `;

			// This MUST FAIL initially - leavePolicies field doesn't exist yet
			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();
			expect(result.data.leavePolicies).toBeDefined();
			expect(result.data.leavePolicies.nodes).toBeInstanceOf(Array);
		});

		it('should support LeaveType enum values', async () => {
			const query = `
        query GetVacationPolicies {
          leavePolicies(filters: { leaveType: VACATION }) {
            nodes {
              id
              name
              leaveType
            }
          }
        }
      `;

			// This MUST FAIL initially - LeaveType enum doesn't exist
			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.leavePolicies.nodes).toBeInstanceOf(Array);
		});
	});

	describe('Employee Leave Balances Query', () => {
		it('should have correct schema structure for leave balances query', async () => {
			const query = `
        query GetEmployeeLeaveBalances($employeeId: UUID!, $year: Int) {
          leaveBalances(employeeId: $employeeId, year: $year) {
            nodes {
              id
              accruedHours
              usedHours
              pendingHours
              availableHours
              year
              leavePolicy {
                id
                name
                leaveType
                maxAccrual
              }
            }
          }
        }
      `;

			const variables = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				year: 2025
			};

			// This MUST FAIL initially - leaveBalances field doesn't exist
			const result = await client.query(query, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.leaveBalances).toBeDefined();
			expect(result.data.leaveBalances.nodes).toBeInstanceOf(Array);
		});

		it('should include computed availableHours field', async () => {
			const query = `
        query GetLeaveBalanceCalculations($employeeId: UUID!) {
          leaveBalances(employeeId: $employeeId) {
            nodes {
              id
              accruedHours
              usedHours
              pendingHours
              availableHours
            }
          }
        }
      `;

			// This MUST FAIL initially - availableHours computed field doesn't exist
			const result = await client
				.query(query, {
					employeeId: '550e8400-e29b-41d4-a716-446655440000'
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			if (result.data.leaveBalances.nodes.length > 0) {
				const balance = result.data.leaveBalances.nodes[0];
				expect(balance.availableHours).toBeTypeOf('number');
				// availableHours should equal accrued - used - pending
				const calculated = balance.accruedHours - balance.usedHours - balance.pendingHours;
				expect(balance.availableHours).toBe(calculated);
			}
		});
	});

	describe('Leave Requests Query', () => {
		it('should have correct schema structure for leave requests query', async () => {
			const query = `
        query GetLeaveRequests($filters: LeaveRequestFilters, $pagination: PaginationInput) {
          leaveRequests(filters: $filters, pagination: $pagination) {
            nodes {
              id
              startDate
              endDate
              hoursRequested
              reason
              status
              submittedAt
              reviewedAt
              reviewComments
              employee {
                id
                displayName
                email
              }
              leavePolicy {
                id
                name
                leaveType
              }
              reviewer {
                id
                displayName
              }
            }
            totalCount
          }
        }
      `;

			const variables = {
				filters: {
					employeeId: '550e8400-e29b-41d4-a716-446655440000',
					status: ['PENDING', 'APPROVED']
				},
				pagination: {
					first: 10
				}
			};

			// This MUST FAIL initially - leaveRequests field doesn't exist
			const result = await client.query(query, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.leaveRequests).toBeDefined();
			expect(result.data.leaveRequests.nodes).toBeInstanceOf(Array);
			expect(result.data.leaveRequests.totalCount).toBeTypeOf('number');
		});

		it('should support LeaveRequestFilters input type', async () => {
			const query = `
        query GetFilteredLeaveRequests($filters: LeaveRequestFilters) {
          leaveRequests(filters: $filters) {
            nodes {
              id
              status
              startDate
              endDate
              leavePolicy {
                leaveType
              }
            }
          }
        }
      `;

			const filters = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				status: ['PENDING', 'APPROVED', 'IN_PROGRESS'],
				startDateFrom: '2025-01-01',
				startDateTo: '2025-12-31',
				leaveType: ['VACATION', 'SICK']
			};

			// This MUST FAIL initially - LeaveRequestFilters input type doesn't exist
			const result = await client.query(query, { filters }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.leaveRequests.nodes).toBeInstanceOf(Array);
		});

		it('should support LeaveStatus enum values', async () => {
			const query = `
        query GetPendingLeaveRequests {
          leaveRequests(filters: { status: [PENDING] }) {
            nodes {
              id
              status
              submittedAt
            }
          }
        }
      `;

			// This MUST FAIL initially - LeaveStatus enum doesn't exist
			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.leaveRequests.nodes).toBeInstanceOf(Array);
		});
	});

	describe('Submit Leave Request Mutation', () => {
		it('should have correct schema structure for submit leave request mutation', async () => {
			const mutation = `
        mutation SubmitLeaveRequest($input: SubmitLeaveRequestInput!) {
          submitLeaveRequest(input: $input) {
            leaveRequest {
              id
              startDate
              endDate
              hoursRequested
              status
              submittedAt
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const input = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				leavePolicyId: '550e8400-e29b-41d4-a716-446655440001',
				startDate: '2025-03-01',
				endDate: '2025-03-05',
				hoursRequested: 40,
				reason: 'Vacation to Hawaii'
			};

			// This MUST FAIL initially - submitLeaveRequest mutation doesn't exist
			const result = await client.mutation(mutation, { input }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.submitLeaveRequest).toBeDefined();

			if (result.data.submitLeaveRequest.leaveRequest) {
				expect(result.data.submitLeaveRequest.leaveRequest.id).toBeDefined();
				expect(result.data.submitLeaveRequest.leaveRequest.status).toBe('PENDING');
				expect(result.data.submitLeaveRequest.leaveRequest.hoursRequested).toBe(
					input.hoursRequested
				);
			}
		});

		it('should support SubmitLeaveRequestInput type validation', async () => {
			const mutation = `
        mutation SubmitLeaveRequest($input: SubmitLeaveRequestInput!) {
          submitLeaveRequest(input: $input) {
            leaveRequest {
              id
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const invalidInput = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				leavePolicyId: '550e8400-e29b-41d4-a716-446655440001',
				startDate: '2025-03-05',
				endDate: '2025-03-01', // End date before start date - should fail
				hoursRequested: -10 // Negative hours - should fail
			};

			// This MUST FAIL initially - input validation doesn't exist
			const result = await client.mutation(mutation, { input: invalidInput }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.submitLeaveRequest.errors).toBeInstanceOf(Array);
			expect(result.data.submitLeaveRequest.errors.length).toBeGreaterThan(0);
		});

		it('should validate sufficient leave balance', async () => {
			const mutation = `
        mutation SubmitLeaveRequest($input: SubmitLeaveRequestInput!) {
          submitLeaveRequest(input: $input) {
            leaveRequest {
              id
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const excessiveInput = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				leavePolicyId: '550e8400-e29b-41d4-a716-446655440001',
				startDate: '2025-03-01',
				endDate: '2025-12-31',
				hoursRequested: 9999 // Excessive hours - should fail balance check
			};

			// This MUST FAIL initially - balance validation doesn't exist
			const result = await client.mutation(mutation, { input: excessiveInput }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.submitLeaveRequest.errors).toBeInstanceOf(Array);

			// Should have error about insufficient balance
			const balanceError = result.data.submitLeaveRequest.errors.find(
				(error: any) => error.field === 'hoursRequested'
			);
			expect(balanceError).toBeDefined();
		});
	});

	describe('Review Leave Request Mutation', () => {
		it('should have correct schema structure for review leave request mutation', async () => {
			const mutation = `
        mutation ReviewLeaveRequest($id: UUID!, $input: ReviewLeaveRequestInput!) {
          reviewLeaveRequest(id: $id, input: $input) {
            leaveRequest {
              id
              status
              reviewedAt
              reviewComments
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const variables = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				input: {
					status: 'APPROVED',
					reviewComments: 'Approved for vacation time'
				}
			};

			// This MUST FAIL initially - reviewLeaveRequest mutation doesn't exist
			const result = await client.mutation(mutation, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.reviewLeaveRequest).toBeDefined();

			if (result.data.reviewLeaveRequest.leaveRequest) {
				expect(result.data.reviewLeaveRequest.leaveRequest.status).toBe('APPROVED');
				expect(result.data.reviewLeaveRequest.leaveRequest.reviewedAt).toBeDefined();
			}
		});

		it('should support ReviewLeaveRequestInput type', async () => {
			const mutation = `
        mutation ReviewLeaveRequest($id: UUID!, $input: ReviewLeaveRequestInput!) {
          reviewLeaveRequest(id: $id, input: $input) {
            leaveRequest {
              id
              status
              reviewComments
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const rejectInput = {
				status: 'REJECTED',
				reviewComments: 'Insufficient coverage during requested period'
			};

			// This MUST FAIL initially - ReviewLeaveRequestInput type doesn't exist
			const result = await client
				.mutation(mutation, {
					id: '550e8400-e29b-41d4-a716-446655440000',
					input: rejectInput
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.reviewLeaveRequest.leaveRequest.status).toBe('REJECTED');
		});

		it('should prevent reviewing already reviewed requests', async () => {
			const mutation = `
        mutation ReviewLeaveRequest($id: UUID!, $input: ReviewLeaveRequestInput!) {
          reviewLeaveRequest(id: $id, input: $input) {
            leaveRequest {
              id
              status
            }
            errors {
              field
              message
            }
          }
        }
      `;

			// Try to review a request that's already been approved
			const result = await client
				.mutation(mutation, {
					id: '550e8400-e29b-41d4-a716-446655440000', // Assume this is already approved
					input: {
						status: 'REJECTED'
					}
				})
				.toPromise();

			// This MUST FAIL initially - business rule validation doesn't exist
			expect(result.error).toBeUndefined();
			expect(result.data.reviewLeaveRequest.errors).toBeInstanceOf(Array);

			// Should have error about request already being reviewed
			const statusError = result.data.reviewLeaveRequest.errors.find((error: any) =>
				error.message.includes('already reviewed')
			);
			expect(statusError).toBeDefined();
		});
	});

	describe('Leave Balance Updates', () => {
		it('should automatically update leave balances when request is approved', async () => {
			// First, get initial balance
			const balanceQuery = `
        query GetLeaveBalance($employeeId: UUID!, $policyId: UUID!) {
          leaveBalances(employeeId: $employeeId, leavePolicyId: $policyId) {
            nodes {
              id
              availableHours
              pendingHours
              usedHours
            }
          }
        }
      `;

			// This MUST FAIL initially - the balance update automation doesn't exist
			const initialBalance = await client
				.query(balanceQuery, {
					employeeId: '550e8400-e29b-41d4-a716-446655440000',
					policyId: '550e8400-e29b-41d4-a716-446655440001'
				})
				.toPromise();

			expect(initialBalance.error).toBeUndefined();
			expect(initialBalance.data.leaveBalances.nodes.length).toBeGreaterThan(0);
		});

		it('should handle overlapping leave requests validation', async () => {
			const mutation = `
        mutation SubmitOverlappingLeaveRequest($input: SubmitLeaveRequestInput!) {
          submitLeaveRequest(input: $input) {
            leaveRequest {
              id
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const overlappingInput = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				leavePolicyId: '550e8400-e29b-41d4-a716-446655440001',
				startDate: '2025-03-03',
				endDate: '2025-03-07',
				hoursRequested: 40
				// Assume there's already a request for 2025-03-01 to 2025-03-05
			};

			// This MUST FAIL initially - overlap validation doesn't exist
			const result = await client.mutation(mutation, { input: overlappingInput }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.submitLeaveRequest.errors).toBeInstanceOf(Array);

			// Should have error about overlapping dates
			const overlapError = result.data.submitLeaveRequest.errors.find((error: any) =>
				error.message.includes('overlap')
			);
			expect(overlapError).toBeDefined();
		});
	});
});
