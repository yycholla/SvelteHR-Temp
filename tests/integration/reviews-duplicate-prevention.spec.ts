/**
 * T016: Integration test - Duplicate active review prevention (Scenario 5)
 * Feature: 023-reviews-creation-it
 *
 * Tests preventing duplicate active reviews of the same type for the same employee.
 * This test MUST FAIL initially because duplicate check logic is not implemented.
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import {
	createTestContext,
	cleanupTestData,
	TestUser
} from '../utils/test-helpers';
import { performGraphQLMutation } from '../utils/graphql-test-client';

interface TestContext {
	adminUser: any;
	testEmployee: any;
	authTokens: Record<string, string>;
	cleanup?: () => Promise<void>;
	users: any; // Placeholder for users object
	departments: any; // Placeholder for departments object
	createdEmployees: string[];
	createdUsers: string[];
	createdDepartments: string[];
	createdReviews: string[];
	createdGoals: string[];
	createdLeaveRequests: string[];
}

describe('T016: Duplicate active review prevention', () => {
	let testContext: TestContext;

	beforeAll(async () => {
		const admin = await TestUser.createAdmin();
		const employee = await TestUser.createEmployee();

		testContext = {
			adminUser: admin,
			testEmployee: employee,
			authTokens: {
				admin: admin.token
			},
			users: { admin: admin, hrManager: null, manager: null, employee: employee },
			departments: { engineering: null, marketing: null, hr: null },
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

	test('should prevent duplicate active reviews of same type', async () => {
		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					message
					review {
						id
						employeeId
						reviewType
						status
					}
				}
			}
		`;

		// Step 1: Create first annual review with status=DRAFT
		const firstReviewInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: [],
			notes: 'First annual review'
		};

		const firstResponse = await performGraphQLMutation(
			mutation,
			{ input: firstReviewInput },
			testContext.authTokens.admin
		);

		expect(firstResponse.data.createReviewWithGoals.success).toBe(true);
		const firstReviewId = firstResponse.data.createReviewWithGoals.review.id;
		expect(firstResponse.data.createReviewWithGoals.review.status).toBe('DRAFT');

		// Step 2: Attempt to create second annual review (should fail)
		const secondReviewInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: [],
			notes: 'Duplicate annual review'
		};

		const secondResponse = await performGraphQLMutation(
			mutation,
			{ input: secondReviewInput },
			testContext.authTokens.admin
		);

		expect(secondResponse.data.createReviewWithGoals.success).toBe(false);
		expect(secondResponse.data.createReviewWithGoals.message).toContain(
			'Active Annual Review already exists'
		);
		expect(secondResponse.data.createReviewWithGoals.review).toBeNull();

		// Step 3: Complete first review
		const updateStatusMutation = `
			mutation UpdateReviewStatus($id: ID!, $status: ReviewStatus!) {
				updateReviewStatus(id: $id, status: $status) {
					success
					review {
						id
						status
					}
				}
			}
		`;

		const completeResponse = await performGraphQLMutation(
			updateStatusMutation,
			{ id: firstReviewId, status: 'COMPLETED' },
			testContext.authTokens.admin
		);

		expect(completeResponse.data.updateReviewStatus.success).toBe(true);
		expect(completeResponse.data.updateReviewStatus.review.status).toBe('COMPLETED');

		// Step 4: Now create new annual review (should succeed)
		const thirdReviewInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: [],
			notes: 'New annual review after completion'
		};

		const thirdResponse = await performGraphQLMutation(
			mutation,
			{ input: thirdReviewInput },
			testContext.authTokens.admin
		);

		expect(thirdResponse.data.createReviewWithGoals.success).toBe(true);
		expect(thirdResponse.data.createReviewWithGoals.review.status).toBe('DRAFT');
	});

	test('should allow multiple reviews of different types', async () => {
		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					review {
						id
						reviewType
						status
					}
				}
			}
		`;

		// Create quarterly review
		const quarterlyInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'QUARTERLY_REVIEW',
			goalIds: [],
			newGoals: []
		};

		const quarterlyResponse = await performGraphQLMutation(
			mutation,
			{ input: quarterlyInput },
			testContext.authTokens.admin
		);

		expect(quarterlyResponse.data.createReviewWithGoals.success).toBe(true);

		// Create mid-year review (different type, should succeed)
		const midYearInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'MID_YEAR_REVIEW',
			goalIds: [],
			newGoals: []
		};

		const midYearResponse = await performGraphQLMutation(
			mutation,
			{ input: midYearInput },
			testContext.authTokens.admin
		);

		expect(midYearResponse.data.createReviewWithGoals.success).toBe(true);
	});
});
