/**
 * T012: Integration test - Admin creates annual review with new goal (Scenario 1)
 * Feature: 023-reviews-creation-it
 *
 * Tests complete workflow for admin creating a performance review with a new goal.
 * This test MUST FAIL initially because createReviewWithGoals mutation is not implemented.
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { TestUser, cleanupTestData, createTestContext } from '../utils/test-helpers';
import { performGraphQLMutation, performGraphQLQuery } from '../utils/graphql-test-client';

interface TestContext {
	adminUser: any;
	testEmployee: any;
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

describe('T012: Admin creates annual review with new goal', () => {
	let testContext: TestContext;

	beforeAll(async () => {
		// Setup: Create admin user and test employee
		const admin = await TestUser.createAdmin();
		const employee = await TestUser.createEmployee();

		testContext = {
			adminUser: admin,
			testEmployee: employee,
			authTokens: {
				admin: admin.token
			},
			users: { admin, hrManager: null, manager: null, employee },
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

	test('should create annual review with new goal as admin', async () => {
		// Arrange: Create review input with new goal
		const createReviewInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'ANNUAL_REVIEW',
			reviewPeriodStart: '2024-01-01',
			reviewPeriodEnd: '2024-12-31',
			goalIds: [],
			newGoals: [
				{
					title: 'Complete Q4 Projects',
					description: 'Deliver all assigned projects by end of Q4',
					targetCompletionDate: '2024-12-31',
					successMetrics: 'All 5 projects completed on time and within budget'
				}
			],
			notes: 'Annual performance review for 2024'
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
							description
							targetCompletionDate
							successMetrics
						}
						createdAt
					}
				}
			}
		`;

		const response = await performGraphQLMutation(
			mutation,
			{ input: createReviewInput },
			testContext.authTokens.admin
		);

		// Assert: Review created with status "draft"
		expect(response.errors).toBeUndefined();
		expect(response.data.createReviewWithGoals.success).toBe(true);
		expect(response.data.createReviewWithGoals.review).toBeDefined();

		const review = response.data.createReviewWithGoals.review;
		expect(review.employeeId).toBe(testContext.testEmployee.id);
		expect(review.reviewerId).toBe(testContext.adminUser.id);
		expect(review.reviewType).toBe('ANNUAL_REVIEW');
		expect(review.status).toBe('DRAFT');
		expect(review.notes).toBe('Annual performance review for 2024');

		// Assert: New goal created and linked
		expect(review.goals).toHaveLength(1);
		expect(review.goals[0].title).toBe('Complete Q4 Projects');
		expect(review.goals[0].successMetrics).toBe(
			'All 5 projects completed on time and within budget'
		);

		// Assert: Activity log recorded
		const activityLogQuery = `
			query GetActivityLogs($filters: ActivityLogFilter!) {
				activityLogs(filters: $filters) {
					id
					action
					entityType
					entityId
					userId
				}
			}
		`;

		const activityResponse = await performGraphQLQuery(
			activityLogQuery,
			{
				filters: {
					entityType: 'PERFORMANCE_REVIEW',
					action: 'CREATE'
				}
			},
			testContext.authTokens.admin
		);

		expect(activityResponse.data.activityLogs.length).toBeGreaterThan(0);
		const logEntry = activityResponse.data.activityLogs.find(
			(log: { entityId: string }) => log.entityId === review.id
		);
		expect(logEntry).toBeDefined();
		expect(logEntry.userId).toBe(testContext.adminUser.id);
	});

	test('should fail if mutation is not implemented', async () => {
		// This test verifies TDD - mutation should not exist yet
		const mutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
				}
			}
		`;

		try {
			await performGraphQLMutation(
				mutation,
				{
					input: {
						employeeId: testContext.testEmployee.id,
						reviewType: 'ANNUAL_REVIEW',
						goalIds: [],
						newGoals: []
					}
				},
				testContext.authTokens.admin
			);

			// If we reach here, the mutation exists (implementation done before tests)
			expect.fail('Mutation should not be implemented yet (TDD violation)');
		} catch (error: any) {
			// Expected: Mutation not defined error
			expect(
				error.message.includes('Cannot query field') ||
					error.message.includes('Unknown type') ||
					error.message.includes('not defined')
			).toBe(true);
		}
	});
});
