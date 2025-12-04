/**
 * T014: Integration test - Manager blocked from non-direct report (Scenario 3)
 * Feature: 023-reviews-creation-it
 *
 * Tests RBAC validation preventing managers from creating reviews for non-direct reports.
 * This test MUST FAIL initially because RBAC validation is not implemented.
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestContext, cleanupTestData, TestUser } from '../utils/test-helpers';
import { performGraphQLMutation } from '../utils/graphql-test-client';

interface TestContext {
	managerUser: any;
	directReport: any;
	nonDirectReport: any;
	authTokens: Record<string, string>;
	cleanup?: () => Promise<void>;
	users: any;
	departments: any;
	createdEmployees: string[];
	createdUsers: string[];
	createdDepartments: string[];
	createdReviews: string[];
	createdGoals: string[];
	createdLeaveRequests: string[];
}

describe('T014: Manager RBAC - blocked from non-direct report', () => {
	let testContext: TestContext;

	beforeAll(async () => {
		// Setup: Create manager with one direct report and one non-direct report
		const manager = await TestUser.createManager();
		const otherManager = await TestUser.createManager();

		const directReport = await TestUser.createEmployee({ managerId: manager.id });
		const nonDirectReport = await TestUser.createEmployee({ managerId: otherManager.id });

		testContext = {
			managerUser: manager,
			directReport,
			nonDirectReport,
			authTokens: {
				manager: manager.token
			},
			users: { admin: null, hrManager: null, manager: manager, employee: null }, // Placeholder
			departments: { engineering: null, marketing: null, hr: null }, // Placeholder
			createdEmployees: [],
			createdUsers: [],
			createdDepartments: [],
			createdReviews: [],
			createdGoals: [],
			createdLeaveRequests: []
		};
	});

	afterAll(async () => {
		await cleanupTestData(testContext);
	});

	test('should block manager from creating review for non-direct report', async () => {
		// Arrange: Attempt to create review for employee not managed by this manager
		const createReviewInput = {
			employeeId: testContext.nonDirectReport.id,
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: [],
			notes: 'Attempting to review non-direct report'
		};

		// Act: Call createReviewWithGoals mutation
		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					message
					review {
						id
					}
				}
			}
		`;

		const response = await performGraphQLMutation(
			mutation,
			{ input: createReviewInput },
			testContext.authTokens.manager
		);

		// Assert: Request should be denied
		expect(response.data.createReviewWithGoals.success).toBe(false);
		expect(response.data.createReviewWithGoals.message).toContain(
			'You can only create reviews for your direct reports'
		);
		expect(response.data.createReviewWithGoals.review).toBeNull();
	});

	test('should allow manager to create review for direct report', async () => {
		// Arrange: Create review for actual direct report
		const createReviewInput = {
			employeeId: testContext.directReport.id,
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: []
		};

		// Act
		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					message
					review {
						id
						employeeId
					}
				}
			}
		`;

		const response = await performGraphQLMutation(
			mutation,
			{ input: createReviewInput },
			testContext.authTokens.manager
		);

		// Assert: Should succeed
		expect(response.data.createReviewWithGoals.success).toBe(true);
		expect(response.data.createReviewWithGoals.review).toBeDefined();
		expect(response.data.createReviewWithGoals.review.employeeId).toBe(testContext.directReport.id);
	});

	test('should validate isDirectReport query', async () => {
		const query = `
			query IsDirectReport($employeeId: ID!, $managerId: ID!) {
				isDirectReport(employeeId: $employeeId, managerId: $managerId)
			}
		`;

		// Test direct report - should return true
		const directResponse = await performGraphQLMutation(
			query,
			{
				employeeId: testContext.directReport.id,
				managerId: testContext.managerUser.id
			},
			testContext.authTokens.manager
		);

		expect(directResponse.data.isDirectReport).toBe(true);

		// Test non-direct report - should return false
		const nonDirectResponse = await performGraphQLMutation(
			query,
			{
				employeeId: testContext.nonDirectReport.id,
				managerId: testContext.managerUser.id
			},
			testContext.authTokens.manager
		);

		expect(nonDirectResponse.data.isDirectReport).toBe(false);
	});

	test('should return appropriate error for invalid employee ID', async () => {
		const createReviewInput = {
			employeeId: '00000000-0000-0000-0000-000000000000', // Non-existent employee
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: []
		};

		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					message
					review {
						id
					}
				}
			}
		`;

		const response = await performGraphQLMutation(
			mutation,
			{ input: createReviewInput },
			testContext.authTokens.manager
		);

		expect(response.data.createReviewWithGoals.success).toBe(false);
		expect(response.data.createReviewWithGoals.message).toMatch(
			/Employee not found|does not exist|cannot find/i
		);
	});
});
