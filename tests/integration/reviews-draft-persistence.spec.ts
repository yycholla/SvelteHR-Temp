/**
 * T015: Integration test - Draft resume across sessions (Scenario 4)
 * Feature: 023-reviews-creation-it
 *
 * Tests draft review persistence across sessions (save and resume).
 * This test MUST FAIL initially because draft save functionality is not implemented.
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
	users: any;
	departments: any;
	createdEmployees: string[];
	createdUsers: string[];
	createdDepartments: string[];
	createdReviews: string[];
	createdGoals: string[];
	createdLeaveRequests: string[];
}

describe('T015: Draft persistence across sessions', () => {
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
			users: { admin: admin, hrManager: null, manager: null, employee: employee }, // Placeholder, adjust as needed
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

	test('should persist draft review and allow resuming in new session', async () => {
		// Step 1: Create draft review
		const createMutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					review {
						id
						employeeId
						reviewType
						status
						reviewPeriodStart
						reviewPeriodEnd
						notes
						createdAt
					}
				}
			}
		`;

		const createInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'ANNUAL_REVIEW',
			reviewPeriodStart: '2024-01-01',
			reviewPeriodEnd: '2024-12-31',
			goalIds: [],
			newGoals: [
				{
					title: 'Draft goal',
					description: 'This is a draft goal',
					targetCompletionDate: '2024-12-31',
					successMetrics: 'To be defined'
				}
			],
			notes: 'Work in progress - saving draft'
		};

		const createResponse = await performGraphQLMutation(
			createMutation,
			{ input: createInput },
			testContext.authTokens.admin
		);

		expect(createResponse.data.createReviewWithGoals.success).toBe(true);
		const draftReviewId = createResponse.data.createReviewWithGoals.review.id;
		expect(createResponse.data.createReviewWithGoals.review.status).toBe('DRAFT');

		// Step 2: Simulate session end (wait a moment)
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Step 3: Query the draft in a "new session" (retrieve persisted data)
		const queryDraft = `
			query GetReview($id: ID!) {
				performanceReview(id: $id) {
					id
					employeeId
					reviewType
					status
					reviewPeriodStart
					reviewPeriodEnd
					notes
					goals {
						id
						title
						description
					}
				}
			}
		`;

		const queryResponse = await performGraphQLQuery(
			queryDraft,
			{ id: draftReviewId },
			testContext.authTokens.admin
		);

		// Assert: All fields preserved
		const retrievedReview = queryResponse.data.performanceReview;
		expect(retrievedReview).toBeDefined();
		expect(retrievedReview.id).toBe(draftReviewId);
		expect(retrievedReview.employeeId).toBe(testContext.testEmployee.id);
		expect(retrievedReview.reviewType).toBe('ANNUAL_REVIEW');
		expect(retrievedReview.status).toBe('DRAFT');
		expect(retrievedReview.reviewPeriodStart).toBe('2024-01-01');
		expect(retrievedReview.reviewPeriodEnd).toBe('2024-12-31');
		expect(retrievedReview.notes).toBe('Work in progress - saving draft');
		expect(retrievedReview.goals).toHaveLength(1);
		expect(retrievedReview.goals[0].title).toBe('Draft goal');
	});

	test('should allow updating draft review multiple times', async () => {
		// Create initial draft
		const createMutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					review {
						id
						notes
					}
				}
			}
		`;

		const createResponse = await performGraphQLMutation(
			createMutation,
			{
				input: {
					employeeId: testContext.testEmployee.id,
					reviewType: 'QUARTERLY_REVIEW',
					goalIds: [],
					newGoals: [],
					notes: 'Initial draft'
				}
			},
			testContext.authTokens.admin
		);

		const draftId = createResponse.data.createReviewWithGoals.review.id;

		// Update draft - first time
		const updateMutation = `
			mutation UpdateDraft($input: UpdateReviewDraftInput!) {
				updateReviewDraft(input: $input) {
					success
					review {
						id
						notes
						reviewPeriodStart
					}
				}
			}
		`;

		const update1 = await performGraphQLMutation(
			updateMutation,
			{
				input: {
					id: draftId,
					notes: 'Updated draft - version 1',
					reviewPeriodStart: '2024-10-01'
				}
			},
			testContext.authTokens.admin
		);

		expect(update1.data.updateReviewDraft.success).toBe(true);
		expect(update1.data.updateReviewDraft.review.notes).toBe('Updated draft - version 1');

		// Update draft - second time
		const update2 = await performGraphQLMutation(
			updateMutation,
			{
				input: {
					id: draftId,
					notes: 'Final version',
					reviewPeriodEnd: '2024-12-31'
				}
			},
			testContext.authTokens.admin
		);

		expect(update2.data.updateReviewDraft.success).toBe(true);
		expect(update2.data.updateReviewDraft.review.notes).toBe('Final version');
	});

	test('should prevent updating non-draft reviews', async () => {
		// Create and complete a review
		const createMutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					review {
						id
					}
				}
			}
		`;

		const createResponse = await performGraphQLMutation(
			createMutation,
			{
				input: {
					employeeId: testContext.testEmployee.id,
					reviewType: 'PROBATIONARY_REVIEW',
					goalIds: [],
					newGoals: []
				}
			},
			testContext.authTokens.admin
		);

		const reviewId = createResponse.data.createReviewWithGoals.review.id;

		// Update status to completed
		const statusMutation = `
			mutation UpdateStatus($id: ID!, $status: ReviewStatus!) {
				updateReviewStatus(id: $id, status: $status) {
					success
					review {
						status
					}
				}
			}
		`;

		await performGraphQLMutation(
			statusMutation,
			{ id: reviewId, status: 'COMPLETED' },
			testContext.authTokens.admin
		);

		// Attempt to update completed review
		const updateMutation = `
			mutation UpdateDraft($input: UpdateReviewDraftInput!) {
				updateReviewDraft(input: $input) {
					success
					message
				}
			}
		`;

		const updateResponse = await performGraphQLMutation(
			updateMutation,
			{
				input: {
					id: reviewId,
					notes: 'Trying to update completed review'
				}
			},
			testContext.authTokens.admin
		);

		expect(updateResponse.data.updateReviewDraft.success).toBe(false);
		expect(updateResponse.data.updateReviewDraft.message).toMatch(
			/only update draft reviews|cannot update completed review/i
		);
	});
});
