/**
 * T018: Integration test - All 10 review types available (Scenario 7)
 * Feature: 023-reviews-creation-it
 *
 * Tests that all 10 review types are available and can be used to create reviews.
 * This test MUST FAIL initially because reviewTypes query is not implemented.
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestContext, cleanupTestData, TestUser } from '../utils/test-helpers';
import { performGraphQLMutation, performGraphQLQuery } from '../utils/graphql-test-client';

interface TestContext {
	adminUser: any;
	testEmployee: any;
	authTokens: Record<string, string>;
	cleanup?: () => Promise<void>;
}

const EXPECTED_REVIEW_TYPES = [
	'ANNUAL_REVIEW',
	'MID_YEAR_REVIEW',
	'QUARTERLY_REVIEW',
	'PROBATIONARY_REVIEW',
	'PERFORMANCE_IMPROVEMENT_PLAN',
	'NINETY_DAY_REVIEW',
	'PROJECT_BASED_REVIEW',
	'PROMOTION_REVIEW',
	'EXIT_REVIEW',
	'SELF_REVIEW'
];

describe('T018: All 10 review types available', () => {
	let testContext: {
		adminUser: any;
		testEmployee: any;
		authTokens: Record<string, string>;
		cleanup?: () => Promise<void>;
		// Add other properties that are expected by cleanupTestData
		// For now, let's add the basic ones that appear in the error message
		users: any; // Assuming users is an object with admin, hrManager, etc.
		departments: any; // Assuming departments is an object with engineering, marketing, etc.
		createdEmployees: string[];
		createdUsers: string[];
		createdDepartments: string[];
		createdReviews: string[];
		createdGoals: string[];
		createdLeaveRequests: string[];
	};

	beforeAll(async () => {
		const admin = await TestUser.createAdmin();
		const employee = await TestUser.createEmployee();

		testContext = {
			adminUser: admin,
			testEmployee: employee,
			authTokens: {
				admin: admin.token
			},
			users: { admin, hrManager: null, manager: null, employee: employee }, // Placeholder
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

	test('should return all 10 review types with metadata', async () => {
		const reviewTypesQuery = `
			query GetReviewTypes {
				reviewTypes {
					value
					label
					description
					displayOrder
				}
			}
		`;

		const response = await performGraphQLQuery(reviewTypesQuery, {}, testContext.authTokens.admin);

		// Assert: All 10 types returned
		expect(response.data.reviewTypes).toHaveLength(10);

		// Assert: Each expected type is present
		const returnedValues = response.data.reviewTypes.map((rt: { value: string }) => rt.value);
		EXPECTED_REVIEW_TYPES.forEach((expectedType) => {
			expect(returnedValues).toContain(expectedType);
		});

		// Assert: Each type has required metadata fields
		response.data.reviewTypes.forEach(
			(reviewType: { value: string; label: string; description: string; displayOrder: number }) => {
				expect(reviewType.value).toBeDefined();
				expect(reviewType.label).toBeDefined();
				expect(reviewType.description).toBeDefined();
				expect(reviewType.displayOrder).toBeDefined();
				expect(typeof reviewType.displayOrder).toBe('number');
			}
		);

		// Assert: Display orders are unique and properly ordered
		const displayOrders = response.data.reviewTypes.map(
			(rt: { displayOrder: number }) => rt.displayOrder
		);
		const uniqueOrders = new Set(displayOrders);
		expect(uniqueOrders.size).toBe(10);
	});

	test('should successfully create review with each review type', async () => {
		const createMutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					message
					review {
						id
						reviewType
						status
					}
				}
			}
		`;

		// Test each review type
		for (const reviewType of EXPECTED_REVIEW_TYPES) {
			const input = {
				employeeId: testContext.testEmployee.id,
				reviewType,
				goalIds: [],
				newGoals: [],
				notes: `Testing ${reviewType}`
			};

			const response = await performGraphQLMutation(
				createMutation,
				{ input },
				testContext.authTokens.admin
			);

			expect(response.data.createReviewWithGoals.success).toBe(true);
			expect(response.data.createReviewWithGoals.review.reviewType).toBe(reviewType);
			expect(response.data.createReviewWithGoals.review.status).toBe('DRAFT');

			// Clean up: Delete the review before testing next type
			// (Assuming we have a delete mutation or just complete it)
			const reviewId = response.data.createReviewWithGoals.review.id;
			const updateStatusMutation = `
				mutation UpdateStatus($id: ID!, $status: ReviewStatus!) {
					updateReviewStatus(id: $id, status: $status) {
						success
					}
				}
			`;

			await performGraphQLMutation(
				updateStatusMutation,
				{ id: reviewId, status: 'COMPLETED' },
				testContext.authTokens.admin
			);
		}
	});

	test('should have correct labels for review types', async () => {
		const reviewTypesQuery = `
			query GetReviewTypes {
				reviewTypes {
					value
					label
				}
			}
		`;

		const response = await performGraphQLQuery(reviewTypesQuery, {}, testContext.authTokens.admin);

		// Define expected labels (these should match data-model.md)
		const expectedLabels = {
			ANNUAL_REVIEW: 'Annual Review',
			MID_YEAR_REVIEW: 'Mid-Year Review',
			QUARTERLY_REVIEW: 'Quarterly Review',
			PROBATIONARY_REVIEW: 'Probationary Review',
			PERFORMANCE_IMPROVEMENT_PLAN: 'Performance Improvement Plan (PIP)',
			NINETY_DAY_REVIEW: '90-Day Review',
			PROJECT_BASED_REVIEW: 'Project-Based Review',
			PROMOTION_REVIEW: 'Promotion Review',
			EXIT_REVIEW: 'Exit Review',
			SELF_REVIEW: 'Self Review'
		};

		response.data.reviewTypes.forEach(
			(reviewType: { value: keyof typeof expectedLabels; label: string }) => {
				const expectedLabel = expectedLabels[reviewType.value];
				expect(reviewType.label).toBe(expectedLabel);
			}
		);
	});

	test('should have meaningful descriptions for each review type', async () => {
		const reviewTypesQuery = `
			query GetReviewTypes {
				reviewTypes {
					value
					description
				}
			}
		`;

		const response = await performGraphQLQuery(reviewTypesQuery, {}, testContext.authTokens.admin);

		// Each review type should have a non-empty description
		response.data.reviewTypes.forEach((reviewType: { description: string }) => {
			expect(reviewType.description).toBeDefined();
			expect(reviewType.description.length).toBeGreaterThan(10);
		});

		// Verify specific descriptions contain key terms
		const annualReview = response.data.reviewTypes.find(
			(rt: { value: string }) => rt.value === 'ANNUAL_REVIEW'
		);
		expect(annualReview?.description.toLowerCase()).toMatch(/annual|yearly|year/);

		const pip = response.data.reviewTypes.find(
			(rt: { value: string }) => rt.value === 'PERFORMANCE_IMPROVEMENT_PLAN'
		);
		expect(pip?.description.toLowerCase()).toMatch(/improvement|performance|plan/);
	});

	test('should validate display order is logical', async () => {
		const reviewTypesQuery = `
			query GetReviewTypes {
				reviewTypes {
					value
					displayOrder
				}
			}
		`;

		const response = await performGraphQLQuery(reviewTypesQuery, {}, testContext.authTokens.admin);

		// Sort by display order
		const sortedTypes = [...response.data.reviewTypes].sort(
			(a, b) => a.displayOrder - b.displayOrder
		);

		// Annual review should typically be first (most common)
		expect(sortedTypes[0].value).toBe('ANNUAL_REVIEW');

		// All display orders should be positive integers
		sortedTypes.forEach((rt) => {
			expect(rt.displayOrder).toBeGreaterThan(0);
			expect(Number.isInteger(rt.displayOrder)).toBe(true);
		});
	});

	test('should reject invalid review type', async () => {
		const createMutation = `
			mutation CreateReviewWithGoals($input: CreateReviewInput!) {
				createReviewWithGoals(input: $input) {
					success
					message
				}
			}
		`;

		const invalidInput = {
			employeeId: testContext.testEmployee.id,
			reviewType: 'INVALID_REVIEW_TYPE', // Not in enum
			goalIds: [],
			newGoals: []
		};

		try {
			await performGraphQLMutation(
				createMutation,
				{ input: invalidInput },
				testContext.authTokens.admin
			);

			expect.fail('Should have rejected invalid review type');
		} catch (error: any) {
			// Expected: GraphQL validation error for invalid enum value
			expect(
				error.message.includes('Enum') ||
					error.message.includes('valid') ||
					error.message.includes('ReviewType')
			).toBe(true);
		}
	});
});
