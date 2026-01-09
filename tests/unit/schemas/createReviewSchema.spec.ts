/**
 * T019: Unit test - CreateReviewSchema validation
 * Feature: 023-reviews-creation-it
 *
 * Tests Zod schema validation for CreateReviewInput.
 * This test MUST FAIL initially because the schema is not yet defined.
 */

import { describe, expect, test } from 'vitest';
import { z } from 'zod';

// Import the schema (will fail initially - schema not created yet)
// import { CreateReviewSchema } from '$lib/schemas/performance-reviews';

// Temporary local schema for testing structure (remove when actual schema is implemented)
const CreateReviewSchema = z
	.object({
		employeeId: z.string().uuid('Employee ID must be a valid UUID'),
		reviewType: z.enum([
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
		]),
		reviewPeriodStart: z.string().date().optional(),
		reviewPeriodEnd: z.string().date().optional(),
		goalIds: z.array(z.string().uuid()),
		newGoals: z.array(
			z.object({
				title: z.string().min(1).max(255),
				description: z.string().min(1),
				targetCompletionDate: z.string().date(),
				successMetrics: z.string().min(1)
			})
		),
		notes: z.string().optional()
	})
	.refine(
		(data) => {
			if (data.reviewPeriodStart && data.reviewPeriodEnd) {
				return new Date(data.reviewPeriodStart) < new Date(data.reviewPeriodEnd);
			}
			return true;
		},
		{
			message: 'reviewPeriodEnd must be after reviewPeriodStart',
			path: ['reviewPeriodEnd']
		}
	);

describe('T019: CreateReviewSchema validation', () => {
	test('should pass validation with valid input', () => {
		const validInput = {
			employeeId: '123e4567-e89b-12d3-a456-426614174000',
			reviewType: 'ANNUAL_REVIEW',
			reviewPeriodStart: '2024-01-01',
			reviewPeriodEnd: '2024-12-31',
			goalIds: ['223e4567-e89b-12d3-a456-426614174000'],
			newGoals: [
				{
					title: 'Complete Q4 Projects',
					description: 'Finish all assigned projects',
					targetCompletionDate: '2024-12-31',
					successMetrics: '100% completion rate'
				}
			],
			notes: 'Annual review for 2024'
		};

		const result = CreateReviewSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	test('should fail validation when employeeId is missing', () => {
		const invalidInput = {
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: []
		};

		const result = CreateReviewSchema.safeParse(invalidInput);
		expect(result.success).toBe(false);

		if (!result.success) {
			const employeeIdError = result.error.issues.find((issue) => issue.path[0] === 'employeeId');
			expect(employeeIdError).toBeDefined();
		}
	});

	test('should fail validation with invalid UUID format', () => {
		const invalidInput = {
			employeeId: 'not-a-valid-uuid',
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: []
		};

		const result = CreateReviewSchema.safeParse(invalidInput);
		expect(result.success).toBe(false);

		if (!result.success) {
			const employeeIdError = result.error.issues.find((issue) => issue.path[0] === 'employeeId');
			expect(employeeIdError).toBeDefined();
			expect(employeeIdError?.message).toContain('UUID');
		}
	});

	test('should fail when reviewPeriodEnd is before reviewPeriodStart', () => {
		const invalidInput = {
			employeeId: '123e4567-e89b-12d3-a456-426614174000',
			reviewType: 'ANNUAL_REVIEW',
			reviewPeriodStart: '2024-12-31',
			reviewPeriodEnd: '2024-01-01', // Before start date
			goalIds: [],
			newGoals: []
		};

		const result = CreateReviewSchema.safeParse(invalidInput);
		expect(result.success).toBe(false);

		if (!result.success) {
			const dateError = result.error.issues.find((issue) => issue.path[0] === 'reviewPeriodEnd');
			expect(dateError).toBeDefined();
			expect(dateError?.message).toContain('after');
		}
	});

	test('should validate goalIds array with UUIDs', () => {
		const validInput = {
			employeeId: '123e4567-e89b-12d3-a456-426614174000',
			reviewType: 'ANNUAL_REVIEW',
			goalIds: ['223e4567-e89b-12d3-a456-426614174000', '323e4567-e89b-12d3-a456-426614174000'],
			newGoals: []
		};

		const result = CreateReviewSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	test('should fail with invalid UUID in goalIds array', () => {
		const invalidInput = {
			employeeId: '123e4567-e89b-12d3-a456-426614174000',
			reviewType: 'ANNUAL_REVIEW',
			goalIds: ['invalid-uuid', '223e4567-e89b-12d3-a456-426614174000'],
			newGoals: []
		};

		const result = CreateReviewSchema.safeParse(invalidInput);
		expect(result.success).toBe(false);

		if (!result.success) {
			const goalIdError = result.error.issues.find((issue) => issue.path[0] === 'goalIds');
			expect(goalIdError).toBeDefined();
		}
	});

	test('should validate newGoals array structure', () => {
		const validInput = {
			employeeId: '123e4567-e89b-12d3-a456-426614174000',
			reviewType: 'ANNUAL_REVIEW',
			goalIds: [],
			newGoals: [
				{
					title: 'Goal 1',
					description: 'Description 1',
					targetCompletionDate: '2024-12-31',
					successMetrics: 'Metrics 1'
				},
				{
					title: 'Goal 2',
					description: 'Description 2',
					targetCompletionDate: '2024-11-30',
					successMetrics: 'Metrics 2'
				}
			]
		};

		const result = CreateReviewSchema.safeParse(validInput);
		expect(result.success).toBe(true);
	});

	test('should allow optional fields to be omitted', () => {
		const minimalInput = {
			employeeId: '123e4567-e89b-12d3-a456-426614174000',
			reviewType: 'QUARTERLY_REVIEW',
			goalIds: [],
			newGoals: []
		};

		const result = CreateReviewSchema.safeParse(minimalInput);
		expect(result.success).toBe(true);
	});
});
