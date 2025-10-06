/**
 * Zod Validation Schemas for Performance Reviews Feature
 * Feature: 023-reviews-creation-it
 *
 * Provides runtime type validation and TypeScript types for:
 * - Review creation and updates
 * - Goal creation and management
 * - Review-goal associations
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

/**
 * Review type categories for different evaluation purposes
 */
export const ReviewTypeSchema = z.enum([
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
]);

export type ReviewType = z.infer<typeof ReviewTypeSchema>;

/**
 * Review lifecycle status
 */
export const ReviewStatusSchema = z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED']);

export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

/**
 * Goal lifecycle status
 */
export const GoalStatusSchema = z.enum(['ACTIVE', 'ACHIEVED', 'MISSED', 'CANCELLED', 'DELETED']);

export type GoalStatus = z.infer<typeof GoalStatusSchema>;

// ============================================================================
// Goal Schemas
// ============================================================================

/**
 * Schema for creating a new goal within a review
 */
export const CreateGoalSchema = z.object({
	title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
	description: z.string().min(1, 'Description is required'),
	targetCompletionDate: z.string().date('Target completion date must be a valid date'),
	successMetrics: z.string().min(1, 'Success metrics are required')
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

/**
 * Schema for updating an existing goal
 */
export const UpdateGoalSchema = z.object({
	id: z.string().uuid('Goal ID must be a valid UUID'),
	title: z.string().min(1).max(255).optional(),
	description: z.string().min(1).optional(),
	targetCompletionDate: z.string().date().optional(),
	successMetrics: z.string().min(1).optional(),
	status: GoalStatusSchema.optional(),
	progressPercentage: z.number().int().min(0).max(100).optional()
});

export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;

// ============================================================================
// Review Schemas
// ============================================================================

/**
 * Schema for creating a performance review with associated goals
 *
 * Validates:
 * - Required employeeId and reviewType
 * - Optional review period dates (end must be after start)
 * - Arrays of existing goal IDs and new goals to create
 * - Optional notes field
 */
export const CreateReviewSchema = z
	.object({
		employeeId: z.string().uuid('Employee ID must be a valid UUID'),
		reviewType: ReviewTypeSchema,
		reviewPeriodStart: z.string().date().optional(),
		reviewPeriodEnd: z.string().date().optional(),
		goalIds: z.array(z.string().uuid('Goal ID must be a valid UUID')),
		newGoals: z.array(CreateGoalSchema),
		notes: z.string().optional()
	})
	.refine(
		(data) => {
			// Validate that reviewPeriodEnd is after reviewPeriodStart if both provided
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

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

/**
 * Schema for updating a draft review
 *
 * Supports partial updates - only id is required
 * All other fields are optional to allow incremental draft saves
 */
export const UpdateReviewDraftSchema = z
	.object({
		id: z.string().uuid('Review ID must be a valid UUID'),
		reviewType: ReviewTypeSchema.optional(),
		reviewPeriodStart: z.string().date().optional(),
		reviewPeriodEnd: z.string().date().optional(),
		notes: z.string().optional()
	})
	.refine(
		(data) => {
			// Validate date range if both dates provided
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

export type UpdateReviewDraftInput = z.infer<typeof UpdateReviewDraftSchema>;

/**
 * Schema for updating review status
 */
export const UpdateReviewStatusSchema = z.object({
	id: z.string().uuid('Review ID must be a valid UUID'),
	status: ReviewStatusSchema
});

export type UpdateReviewStatusInput = z.infer<typeof UpdateReviewStatusSchema>;

// ============================================================================
// Review-Goal Association Schemas
// ============================================================================

/**
 * Schema for linking an existing goal to a review
 */
export const LinkGoalToReviewSchema = z.object({
	reviewId: z.string().uuid('Review ID must be a valid UUID'),
	goalId: z.string().uuid('Goal ID must be a valid UUID')
});

export type LinkGoalToReviewInput = z.infer<typeof LinkGoalToReviewSchema>;

/**
 * Schema for unlinking a goal from a review
 */
export const UnlinkGoalFromReviewSchema = z.object({
	reviewId: z.string().uuid('Review ID must be a valid UUID'),
	goalId: z.string().uuid('Goal ID must be a valid UUID')
});

export type UnlinkGoalFromReviewInput = z.infer<typeof UnlinkGoalFromReviewSchema>;

// ============================================================================
// Query Filter Schemas
// ============================================================================

/**
 * Schema for filtering performance reviews queries
 */
export const ReviewFilterSchema = z.object({
	employeeId: z.string().uuid().optional(),
	reviewerId: z.string().uuid().optional(),
	reviewType: ReviewTypeSchema.optional(),
	status: ReviewStatusSchema.optional(),
	statusIn: z.array(ReviewStatusSchema).optional()
});

export type ReviewFilter = z.infer<typeof ReviewFilterSchema>;

/**
 * Schema for filtering employee goals queries
 */
export const GoalFilterSchema = z.object({
	employeeId: z.string().uuid().optional(),
	status: GoalStatusSchema.optional(),
	deleted: z.boolean().optional()
});

export type GoalFilter = z.infer<typeof GoalFilterSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Standard mutation response for review operations
 */
export const ReviewMutationResponseSchema = z.object({
	success: z.boolean(),
	message: z.string().optional(),
	review: z.any().optional() // PerformanceReview type from GraphQL
});

export type ReviewMutationResponse = z.infer<typeof ReviewMutationResponseSchema>;

/**
 * Standard mutation response for goal operations
 */
export const GoalMutationResponseSchema = z.object({
	success: z.boolean(),
	message: z.string().optional(),
	goal: z.any().optional() // Goal type from GraphQL
});

export type GoalMutationResponse = z.infer<typeof GoalMutationResponseSchema>;

// ============================================================================
// Review Type Metadata
// ============================================================================

/**
 * Review type metadata for UI dropdowns
 */
export const ReviewTypeMetadataSchema = z.object({
	value: ReviewTypeSchema,
	label: z.string(),
	description: z.string(),
	displayOrder: z.number().int()
});

export type ReviewTypeMetadata = z.infer<typeof ReviewTypeMetadataSchema>;

/**
 * Available review types with metadata for UI dropdowns
 */
export const reviewTypes: ReviewTypeMetadata[] = [
	{
		value: 'ANNUAL_REVIEW',
		label: 'Annual Review',
		description: 'Comprehensive yearly performance evaluation',
		displayOrder: 1
	},
	{
		value: 'MID_YEAR_REVIEW',
		label: 'Mid-Year Review',
		description: 'Six-month progress check and goal adjustment',
		displayOrder: 2
	},
	{
		value: 'QUARTERLY_REVIEW',
		label: 'Quarterly Review',
		description: 'Three-month performance checkpoint',
		displayOrder: 3
	},
	{
		value: 'PROBATIONARY_REVIEW',
		label: 'Probationary Review',
		description: 'Evaluation during probation period',
		displayOrder: 4
	},
	{
		value: 'NINETY_DAY_REVIEW',
		label: '90-Day Review',
		description: 'New hire 90-day evaluation',
		displayOrder: 5
	},
	{
		value: 'PROJECT_BASED_REVIEW',
		label: 'Project-Based Review',
		description: 'Performance review tied to specific project completion',
		displayOrder: 6
	},
	{
		value: 'PROMOTION_REVIEW',
		label: 'Promotion Review',
		description: 'Evaluation for role advancement consideration',
		displayOrder: 7
	},
	{
		value: 'PERFORMANCE_IMPROVEMENT_PLAN',
		label: 'Performance Improvement Plan (PIP)',
		description: 'Structured plan to address performance concerns',
		displayOrder: 8
	},
	{
		value: 'SELF_REVIEW',
		label: 'Self Review',
		description: 'Employee self-assessment',
		displayOrder: 9
	},
	{
		value: 'EXIT_REVIEW',
		label: 'Exit Review',
		description: 'Final review before departure',
		displayOrder: 10
	}
];

// ============================================================================
// Soft Delete Schema
// ============================================================================

/**
 * Schema for soft deleting a goal
 */
export const SoftDeleteGoalSchema = z.object({
	id: z.string().uuid('Goal ID must be a valid UUID')
});

export type SoftDeleteGoalInput = z.infer<typeof SoftDeleteGoalSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate review input and return parsed data or errors
 */
export function validateCreateReview(data: unknown) {
	return CreateReviewSchema.safeParse(data);
}

/**
 * Validate draft update input and return parsed data or errors
 */
export function validateUpdateReviewDraft(data: unknown) {
	return UpdateReviewDraftSchema.safeParse(data);
}

/**
 * Validate goal creation input and return parsed data or errors
 */
export function validateCreateGoal(data: unknown) {
	return CreateGoalSchema.safeParse(data);
}

/**
 * Validate goal link input and return parsed data or errors
 */
export function validateLinkGoalToReview(data: unknown) {
	return LinkGoalToReviewSchema.safeParse(data);
}
