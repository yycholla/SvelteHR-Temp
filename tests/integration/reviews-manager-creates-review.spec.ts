/**
 * T013: Integration test - Manager creates review for direct report (Scenario 2)
 * Feature: 023-reviews-creation-it
 *
 * Tests manager creating quarterly review for direct report with existing goal.
 * This test MUST FAIL initially because createReviewWithGoals mutation is not implemented.
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import {
	createTestContext,
	cleanupTestData,
	TestUser
} from '../utils/test-helpers';
import { performGraphQLMutation, performGraphQLQuery } from '../utils/graphql-test-client';

interface TestContext {
	managerUser: any;
	testEmployee: any;
	existingGoal: any;
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

describe('T013: Manager creates review for direct report', () => {
	let testContext: TestContext;

	beforeAll(async () => {
		// Setup: Create manager and employee (direct report)
		const manager = await TestUser.createManager();
		const employee = await TestUser.createEmployee({ managerId: manager.id });

		// Create an existing goal for the employee
		const createGoalMutation = `
			mutation CreateGoal(
				$employeeId: ID!
				$title: String!
				$description: String!
				$targetCompletionDate: Date!
				$successMetrics: String!
			) {
				createGoal(
					employeeId: $employeeId
					title: $title
					description: $description
					targetCompletionDate: $targetCompletionDate
					successMetrics: $successMetrics
				) {
					success
					goal {
						id
						title
						employeeId
					}
				}
			}
		`;

		const goalResponse = await performGraphQLMutation(
			createGoalMutation,
			{
				employeeId: employee.id,
				title: 'Complete onboarding training',
				description: 'Finish all onboarding modules',
				targetCompletionDate: '2024-12-31',
				successMetrics: '100% completion'
			},
			manager.token
		);

		testContext = {
			managerUser: manager,
			testEmployee: employee,
			existingGoal: goalResponse.data.createGoal.goal,
			authTokens: {
				manager: manager.token
			},
			users: { admin: null, hrManager: null, manager: manager, employee: employee }, // Placeholder, adjust as needed
			departments: { engineering: null, marketing: null, hr: null }, // Placeholder, adjust as needed
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

	test('should create quarterly review with existing goal as manager', async () => {
		// Arrange: Create review input linking existing goal
		const createReviewInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'QUARTERLY_REVIEW',
			reviewPeriodStart: '2024-10-01',
			reviewPeriodEnd: '2024-12-31',
			goalIds: [testContext.existingGoal.id],
			newGoals: [],
			notes: 'Q4 2024 quarterly review'
		};

		// Act: Call createReviewWithGoals mutation
		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					message
					review {
						id
						employeeId
						reviewerId
						reviewType
						status
						reviewPeriodStart
						reviewPeriodEnd
						notes
						goals {
							id
							title
						}
					}
				}
			}
		`;

		const response = await performGraphQLMutation(
			mutation,
			{ input: createReviewInput },
			testContext.authTokens.manager
		);

		// Assert: Review created successfully
		expect(response.errors).toBeUndefined();
		expect(response.data.createReviewWithGoals.success).toBe(true);

		const review = response.data.createReviewWithGoals.review;
		expect(review.employeeId).toBe(testContext.testEmployee.id);
		expect(review.reviewerId).toBe(testContext.managerUser.id);
		expect(review.reviewType).toBe('QUARTERLY_REVIEW');
		expect(review.status).toBe('DRAFT');

		// Assert: Existing goal linked
		expect(review.goals).toHaveLength(1);
		expect(review.goals[0].id).toBe(testContext.existingGoal.id);
		expect(review.goals[0].title).toBe('Complete onboarding training');
	});

	test('should verify manager-employee relationship before creating review', async () => {
		// Query to check direct reports
		const directReportsQuery = `
			query GetDirectReports($managerId: ID!) {
				directReports(managerId: $managerId) {
					id
					firstName
					lastName
				}
			}
		`;

		const response = await performGraphQLQuery(
			directReportsQuery,
			{ managerId: testContext.managerUser.id },
			testContext.authTokens.manager
		);

		expect(response.data.directReports).toBeDefined();
		const directReportIds = response.data.directReports.map((emp: { id: string }) => emp.id);
		expect(directReportIds).toContain(testContext.testEmployee.id);
	});

	test('should allow creating review with both existing and new goals', async () => {
		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					review {
						id
						goals {
							id
							title
						}
					}
				}
			}
		`;

		const input = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'MID_YEAR_REVIEW',
			goalIds: [testContext.existingGoal.id],
			newGoals: [
				{
					title: 'Improve team collaboration',
					description: 'Work more closely with cross-functional teams',
					targetCompletionDate: '2024-12-31',
					successMetrics: 'At least 3 successful cross-team projects'
				}
			]
		};

		const response = await performGraphQLMutation(
			mutation,
			{ input },
			testContext.authTokens.manager
		);

		expect(response.data.createReviewWithGoals.success).toBe(true);
		expect(response.data.createReviewWithGoals.review.goals).toHaveLength(2);
	});
});
