/**
 * T017: Integration test - Soft delete goal preservation (Scenario 6)
 * Feature: 023-reviews-creation-it
 *
 * Tests that soft-deleted goals are preserved in historical reviews.
 * This test MUST FAIL initially because soft delete functionality is not implemented.
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import {
	createTestContext,
	cleanupTestData,
	TestUser
} from '../utils/test-helpers';
import { performGraphQLMutation, performGraphQLQuery } from '../utils/graphql-test-client';

interface TestContext {
	adminUser: any;
	testEmployee: any;
	authTokens: Record<string, string>;
	cleanup?: () => Promise<void>;
}

describe('T017: Soft delete goal preservation in reviews', () => {
	let testContext: TestContext;

	beforeAll(async () => {
		const admin = await TestUser.createAdmin();
		const employee = await TestUser.createEmployee();

		testContext = {
			adminUser: admin,
			testEmployee: employee,
			authTokens: {
				admin: admin.token
			}
		};
	});

	afterAll(async () => {
		await cleanupTestData(testContext);
	});

	test('should preserve soft-deleted goal in review', async () => {
		// Step 1: Create review with a goal
		const createReviewMutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					review {
						id
						goals {
							id
							title
							deleted
						}
					}
				}
			}
		`;

		const reviewInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: [
				{
					title: 'Launch product feature',
					description: 'Complete and launch new dashboard',
					targetCompletionDate: '2024-12-31',
					successMetrics: 'Feature live in production'
				}
			]
		};

		const reviewResponse = await performGraphQLMutation(
			createReviewMutation,
			{ input: reviewInput },
			testContext.authTokens.admin
		);

		expect(reviewResponse.data.createReviewWithGoals.success).toBe(true);
		const review = reviewResponse.data.createReviewWithGoals.review;
		const goalId = review.goals[0].id;

		// Initially goal should not be deleted
		expect(review.goals[0].deleted).toBe(false);

		// Step 2: Soft delete the goal
		const softDeleteMutation = `
			mutation SoftDeleteGoal($id: ID!) {
				softDeleteGoal(id: $id) {
					success
					message
					goal {
						id
						deleted
						deletedAt
					}
				}
			}
		`;

		const deleteResponse = await performGraphQLMutation(
			softDeleteMutation,
			{ id: goalId },
			testContext.authTokens.admin
		);

		expect(deleteResponse.data.softDeleteGoal.success).toBe(true);
		expect(deleteResponse.data.softDeleteGoal.goal.deleted).toBe(true);
		expect(deleteResponse.data.softDeleteGoal.goal.deletedAt).toBeDefined();

		// Step 3: Query goal directly - should show deleted=true
		const goalQuery = `
			query GetGoal($id: ID!) {
				goal(id: $id) {
					id
					title
					deleted
					deletedAt
				}
			}
		`;

		const goalQueryResponse = await performGraphQLQuery(
			goalQuery,
			{ id: goalId },
			testContext.authTokens.admin
		);

		expect(goalQueryResponse.data.goal.deleted).toBe(true);
		expect(goalQueryResponse.data.goal.deletedAt).toBeDefined();

		// Step 4: Query review goals - goal should still be linked with deleted indicator
		const reviewGoalsQuery = `
			query GetReviewGoals($reviewId: ID!) {
				performanceReview(id: $reviewId) {
					id
					goals {
						id
						title
						deleted
						deletedAt
					}
				}
			}
		`;

		const reviewGoalsResponse = await performGraphQLQuery(
			reviewGoalsQuery,
			{ reviewId: review.id },
			testContext.authTokens.admin
		);

		expect(reviewGoalsResponse.data.performanceReview.goals).toHaveLength(1);
		expect(reviewGoalsResponse.data.performanceReview.goals[0].id).toBe(goalId);
		expect(reviewGoalsResponse.data.performanceReview.goals[0].deleted).toBe(true);

		// Step 5: Query employeeGoals with includeDeleted=false - goal should not appear
		const employeeGoalsQuery = `
			query GetEmployeeGoals($employeeId: ID!, $includeDeleted: Boolean) {
				employeeGoals(employeeId: $employeeId, includeDeleted: $includeDeleted) {
					id
					title
					deleted
				}
			}
		`;

		const activeGoalsResponse = await performGraphQLQuery(
			employeeGoalsQuery,
			{ employeeId: testContext.testEmployee.id, includeDeleted: false },
			testContext.authTokens.admin
		);

		// Goal should not be in active goals list
		const deletedGoalInList = activeGoalsResponse.data.employeeGoals.find((g) => g.id === goalId);
		expect(deletedGoalInList).toBeUndefined();

		// Step 6: Query with includeDeleted=true - goal should appear
		const allGoalsResponse = await performGraphQLQuery(
			employeeGoalsQuery,
			{ employeeId: testContext.testEmployee.id, includeDeleted: true },
			testContext.authTokens.admin
		);

		const deletedGoalIncluded = allGoalsResponse.data.employeeGoals.find((g) => g.id === goalId);
		expect(deletedGoalIncluded).toBeDefined();
		expect(deletedGoalIncluded.deleted).toBe(true);
	});

	test('should prevent hard deletion of goals linked to reviews', async () => {
		// Create review with goal
		const createMutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					review {
						id
						goals {
							id
						}
					}
				}
			}
		`;

		const response = await performGraphQLMutation(
			createMutation,
			{
				input: {
					employeeId: testContext.testEmployee.id,
					reviewType: 'QUARTERLY_REVIEW',
					goalIds: [],
					newGoals: [
						{
							title: 'Test goal for hard delete',
							description: 'Testing deletion constraints',
							targetCompletionDate: '2024-12-31',
							successMetrics: 'Test completion'
						}
					]
				}
			},
			testContext.authTokens.admin
		);

		const goalId = response.data.createReviewWithGoals.review.goals[0].id;

		// Attempt hard delete (if such mutation exists)
		const hardDeleteMutation = `
			mutation HardDeleteGoal($id: ID!) {
				hardDeleteGoal(id: $id) {
					success
					message
				}
			}
		`;

		try {
			const deleteResponse = await performGraphQLMutation(
				hardDeleteMutation,
				{ id: goalId },
				testContext.authTokens.admin
			);

			// If hard delete exists, it should fail due to FK constraint
			expect(deleteResponse.data.hardDeleteGoal.success).toBe(false);
			expect(deleteResponse.data.hardDeleteGoal.message).toMatch(
				/cannot delete|linked to review|foreign key/i
			);
		} catch (error: any) {
			// Expected: Mutation might not exist or FK constraint violation
			expect(
				error.message.includes('foreign key') ||
					error.message.includes('Cannot query field') ||
					error.message.includes('constraint violation')
			).toBe(true);
		}
	});

	test('should allow soft-deleting already soft-deleted goal (idempotent)', async () => {
		// Create goal
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
					}
				}
			}
		`;

		const goalResponse = await performGraphQLMutation(
			createGoalMutation,
			{
				employeeId: testContext.testEmployee.id,
				title: 'Idempotent delete test',
				description: 'Testing idempotency',
				targetCompletionDate: '2024-12-31',
				successMetrics: 'Test'
			},
			testContext.authTokens.admin
		);

		const goalId = goalResponse.data.createGoal.goal.id;

		// Soft delete once
		const softDeleteMutation = `
			mutation SoftDeleteGoal($id: ID!) {
				softDeleteGoal(id: $id) {
					success
					goal {
						deleted
					}
				}
			}
		`;

		const firstDelete = await performGraphQLMutation(
			softDeleteMutation,
			{ id: goalId },
			testContext.authTokens.admin
		);

		expect(firstDelete.data.softDeleteGoal.success).toBe(true);
		expect(firstDelete.data.softDeleteGoal.goal.deleted).toBe(true);

		// Soft delete again (should be idempotent)
		const secondDelete = await performGraphQLMutation(
			softDeleteMutation,
			{ id: goalId },
			testContext.authTokens.admin
		);

		expect(secondDelete.data.softDeleteGoal.success).toBe(true);
		expect(secondDelete.data.softDeleteGoal.goal.deleted).toBe(true);
	});
});
