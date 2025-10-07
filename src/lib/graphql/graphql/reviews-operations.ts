// GraphQL Operations: Performance Reviews Management
// Feature: 023-reviews-creation-it
// Date: 2025-10-06
// Description: GraphQL operations for PostGraphile-exposed PostgreSQL review functions

import { gql } from '@urql/svelte';
import type { ReviewType, ReviewStatus, GoalStatus } from '$lib/types/graphql';

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Query: Get active reviews for an employee
 * Uses: hr_public.active_reviews_for_employee() function
 */
export const GET_ACTIVE_REVIEWS_FOR_EMPLOYEE = gql`
	query GetActiveReviewsForEmployee($employeeId: UUID!, $reviewType: ReviewType) {
		activeReviewsForEmployee(pEmployeeId: $employeeId, pReviewType: $reviewType) {
			nodes {
				id
				employeeId
				reviewerId
				reviewType
				status
				reviewPeriodStart
				reviewPeriodEnd
				notes
				createdAt
				updatedAt
			}
			totalCount
		}
	}
`;

/**
 * Query: Get direct reports for a manager
 * Uses: hr_public.direct_reports() function
 */
export const GET_DIRECT_REPORTS = gql`
	query GetDirectReports($managerId: UUID!) {
		directReports(pManagerId: $managerId) {
			nodes {
				id
				email
				firstName
				lastName
				displayName
				jobTitle
				departmentId
				managerId
				role
			}
			totalCount
		}
	}
`;

/**
 * Query: Get review types with metadata for UI dropdowns
 * Uses: hr_public.review_types_metadata() function
 */
export const GET_REVIEW_TYPES_METADATA = gql`
	query GetReviewTypesMetadata {
		reviewTypesMetadata {
			nodes {
				value
				label
				description
				displayOrder
			}
		}
	}
`;

/**
 * Query: Get performance review by ID
 * Standard PostGraphile table query
 */
export const GET_PERFORMANCE_REVIEW = gql`
	query GetPerformanceReview($id: UUID!) {
		performanceReview(id: $id) {
			id
			employeeId
			reviewerId
			reviewType
			status
			reviewPeriodStart
			reviewPeriodEnd
			notes
			createdAt
			updatedAt
			employee: user {
				id
				displayName
				email
				jobTitle
			}
			reviewer {
				id
				displayName
				email
			}
			reviewGoals {
				nodes {
					id
					reviewId
					goalId
					goal: employeeGoal {
						id
						employeeId
						title
						description
						targetDate
						status
						progressPercentage
						deleted
					}
				}
			}
		}
	}
`;

/**
 * Query: Get all performance reviews with filters
 * Standard PostGraphile table query with pagination
 */
export const GET_PERFORMANCE_REVIEWS = gql`
	query GetPerformanceReviews(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [CREATED_AT_DESC]
		$condition: PerformanceReviewCondition
		$filter: PerformanceReviewFilter
	) {
		performanceReviews(
			first: $first
			offset: $offset
			orderBy: $orderBy
			condition: $condition
			filter: $filter
		) {
			nodes {
				id
				employeeId
				reviewerId
				reviewType
				status
				reviewPeriodStart
				reviewPeriodEnd
				notes
				createdAt
				updatedAt
				employee: user {
					id
					displayName
					email
					jobTitle
				}
				reviewer {
					id
					displayName
					email
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

/**
 * Query: Get employee goals (active, not deleted)
 */
export const GET_EMPLOYEE_GOALS = gql`
	query GetEmployeeGoals(
		$employeeId: UUID!
		$first: Int = 50
		$orderBy: [EmployeeGoalsOrderBy!] = [TARGET_DATE_ASC]
	) {
		employeeGoals(
			condition: { employeeId: $employeeId, deleted: false }
			first: $first
			orderBy: $orderBy
		) {
			nodes {
				id
				employeeId
				title
				description
				targetDate
				status
				progressPercentage
				createdAt
				updatedAt
				createdBy
			}
			totalCount
		}
	}
`;

// ============================================================================
// Mutation Operations
// ============================================================================

/**
 * Mutation: Create performance review with associated goals
 * Uses: hr_public.create_review_with_goals() function
 * Returns: JSONB response with { success, message, review }
 */
export const CREATE_REVIEW_WITH_GOALS = gql`
	mutation CreateReviewWithGoals(
		$employeeId: UUID!
		$reviewType: ReviewType!
		$reviewPeriodStart: Date
		$reviewPeriodEnd: Date
		$goalIds: [UUID!]
		$newGoals: JSON
		$notes: String
	) {
		createReviewWithGoals(
			input: {
				pEmployeeId: $employeeId
				pReviewType: $reviewType
				pReviewPeriodStart: $reviewPeriodStart
				pReviewPeriodEnd: $reviewPeriodEnd
				pGoalIds: $goalIds
				pNewGoals: $newGoals
				pNotes: $notes
			}
		) {
			json
		}
	}
`;

/**
 * Mutation: Update draft review
 * Uses: hr_public.update_review_draft() function
 * Returns: JSONB response with { success, message, review }
 */
export const UPDATE_REVIEW_DRAFT = gql`
	mutation UpdateReviewDraft(
		$id: UUID!
		$reviewType: ReviewType
		$reviewPeriodStart: Date
		$reviewPeriodEnd: Date
		$notes: String
	) {
		updateReviewDraft(
			input: {
				pId: $id
				pReviewType: $reviewType
				pReviewPeriodStart: $reviewPeriodStart
				pReviewPeriodEnd: $reviewPeriodEnd
				pNotes: $notes
			}
		) {
			json
		}
	}
`;

/**
 * Mutation: Update review status
 * Uses: hr_public.update_review_status() function
 * Returns: JSONB response with { success, message, review }
 */
export const UPDATE_REVIEW_STATUS = gql`
	mutation UpdateReviewStatus($id: UUID!, $status: ReviewStatus!) {
		updateReviewStatus(input: { pId: $id, pStatus: $status }) {
			json
		}
	}
`;

/**
 * Mutation: Soft delete a goal
 * Uses: hr_public.soft_delete_goal() function
 * Returns: JSONB response with { success, message, goal }
 */
export const SOFT_DELETE_GOAL = gql`
	mutation SoftDeleteGoal($id: UUID!) {
		softDeleteGoal(input: { pId: $id }) {
			json
		}
	}
`;

/**
 * Mutation: Link existing goal to review
 * Standard PostGraphile table mutation
 */
export const LINK_GOAL_TO_REVIEW = gql`
	mutation LinkGoalToReview($input: CreateReviewGoalInput!) {
		createReviewGoal(input: $input) {
			reviewGoal {
				id
				reviewId
				goalId
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Unlink goal from review
 * Standard PostGraphile table mutation
 */
export const UNLINK_GOAL_FROM_REVIEW = gql`
	mutation UnlinkGoalFromReview($input: DeleteReviewGoalInput!) {
		deleteReviewGoal(input: $input) {
			deletedReviewGoalId
			clientMutationId
		}
	}
`;

// ============================================================================
// TypeScript Interfaces for Operation Inputs
// ============================================================================

/**
 * Input for creating a review with goals
 */
export interface CreateReviewWithGoalsInput {
	employeeId: string;
	reviewType: ReviewType;
	reviewPeriodStart?: string; // ISO date string
	reviewPeriodEnd?: string; // ISO date string
	goalIds?: string[]; // Array of UUIDs for existing goals
	newGoals?: CreateGoalInput[]; // Array of new goals to create
	notes?: string;
}

/**
 * Input for creating a new goal within a review
 */
export interface CreateGoalInput {
	title: string;
	description: string;
	targetCompletionDate: string; // ISO date string
	successMetrics?: string;
}

/**
 * Input for updating a draft review
 */
export interface UpdateReviewDraftInput {
	id: string;
	reviewType?: ReviewType;
	reviewPeriodStart?: string;
	reviewPeriodEnd?: string;
	notes?: string;
}

/**
 * Input for updating review status
 */
export interface UpdateReviewStatusInput {
	id: string;
	status: ReviewStatus;
}

/**
 * Input for soft deleting a goal
 */
export interface SoftDeleteGoalInput {
	id: string;
}

/**
 * Input for linking existing goal to review
 */
export interface LinkGoalToReviewInput {
	clientMutationId?: string;
	reviewGoal: {
		reviewId: string;
		goalId: string;
	};
}

/**
 * Input for unlinking goal from review
 */
export interface UnlinkGoalFromReviewInput {
	clientMutationId?: string;
	id: string; // review_goals junction table ID
}

/**
 * Response from custom PostgreSQL functions (JSONB return)
 */
export interface ReviewMutationResponse {
	success: boolean;
	message?: string;
	review?: any; // Performance review object
}

export interface GoalMutationResponse {
	success: boolean;
	message?: string;
	goal?: any; // Employee goal object
}

// ============================================================================
// Utility Constants for Review Types
// ============================================================================

export const reviewTypes = [
	{
		value: 'ANNUAL_REVIEW',
		label: 'Annual Review',
		description: 'Comprehensive yearly performance evaluation',
		displayOrder: 1,
		color: 'blue',
		icon: '📅'
	},
	{
		value: 'MID_YEAR_REVIEW',
		label: 'Mid-Year Review',
		description: 'Mid-year checkpoint and goal adjustment',
		displayOrder: 2,
		color: 'purple',
		icon: '📊'
	},
	{
		value: 'QUARTERLY_REVIEW',
		label: 'Quarterly Review',
		description: 'Quarterly progress check and feedback',
		displayOrder: 3,
		color: 'green',
		icon: '📈'
	},
	{
		value: 'PROBATIONARY_REVIEW',
		label: 'Probationary Review',
		description: 'End of probation period evaluation',
		displayOrder: 4,
		color: 'yellow',
		icon: '🔍'
	},
	{
		value: 'PERFORMANCE_IMPROVEMENT_PLAN',
		label: 'Performance Improvement Plan (PIP)',
		description: 'Structured plan for performance improvement',
		displayOrder: 5,
		color: 'red',
		icon: '⚠️'
	},
	{
		value: 'NINETY_DAY_REVIEW',
		label: '90-Day Review',
		description: 'Initial 90-day performance check for new hires',
		displayOrder: 6,
		color: 'cyan',
		icon: '🎯'
	},
	{
		value: 'PROJECT_BASED_REVIEW',
		label: 'Project-Based Review',
		description: 'Review focused on specific project performance',
		displayOrder: 7,
		color: 'indigo',
		icon: '🚀'
	},
	{
		value: 'PROMOTION_REVIEW',
		label: 'Promotion Review',
		description: 'Evaluation for promotion consideration',
		displayOrder: 8,
		color: 'orange',
		icon: '⭐'
	},
	{
		value: 'EXIT_REVIEW',
		label: 'Exit Review',
		description: 'Final review and feedback for departing employees',
		displayOrder: 9,
		color: 'gray',
		icon: '👋'
	},
	{
		value: 'SELF_REVIEW',
		label: 'Self Review',
		description: 'Employee self-assessment and reflection',
		displayOrder: 10,
		color: 'teal',
		icon: '🤔'
	}
];

export const reviewStatuses = [
	{
		value: 'DRAFT',
		label: 'Draft',
		description: 'Review being created',
		color: 'gray',
		icon: '📝'
	},
	{
		value: 'IN_PROGRESS',
		label: 'In Progress',
		description: 'Review in progress',
		color: 'blue',
		icon: '🔄'
	},
	{
		value: 'COMPLETED',
		label: 'Completed',
		description: 'Review completed',
		color: 'green',
		icon: '✅'
	}
];

export const goalStatuses = [
	{ value: 'ACTIVE', label: 'Active', description: 'Goal in progress', color: 'blue', icon: '🎯' },
	{
		value: 'ACHIEVED',
		label: 'Achieved',
		description: 'Goal successfully completed',
		color: 'green',
		icon: '✅'
	},
	{
		value: 'MISSED',
		label: 'Missed',
		description: 'Goal deadline missed',
		color: 'red',
		icon: '❌'
	},
	{
		value: 'CANCELLED',
		label: 'Cancelled',
		description: 'Goal no longer pursued',
		color: 'gray',
		icon: '🚫'
	},
	{
		value: 'DELETED',
		label: 'Deleted',
		description: 'Goal soft deleted',
		color: 'gray',
		icon: '🗑️'
	}
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get review type info by value
 */
export function getReviewTypeInfo(type: ReviewType) {
	return reviewTypes.find((t) => t.value === type) || reviewTypes[0];
}

/**
 * Get review status info by value
 */
export function getReviewStatusInfo(status: ReviewStatus) {
	return reviewStatuses.find((s) => s.value === status) || reviewStatuses[0];
}

/**
 * Get goal status info by value
 */
export function getGoalStatusInfo(status: GoalStatus) {
	return goalStatuses.find((s) => s.value === status) || goalStatuses[0];
}

/**
 * Format date for display
 */
export function formatReviewPeriod(startDate?: string, endDate?: string): string {
	if (!startDate && !endDate) return 'No period specified';

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	if (startDate && endDate) {
		return `${formatDate(startDate)} - ${formatDate(endDate)}`;
	}

	if (startDate) {
		return `From ${formatDate(startDate)}`;
	}

	return `Until ${formatDate(endDate!)}`;
}

/**
 * Check if review is editable
 */
export function isReviewEditable(status: ReviewStatus): boolean {
	return status === 'DRAFT';
}

/**
 * Check if review period is valid
 */
export function isValidReviewPeriod(startDate?: string, endDate?: string): boolean {
	if (!startDate || !endDate) return true;
	return new Date(startDate) < new Date(endDate);
}

/**
 * Validate goal for review creation
 */
export function validateNewGoal(goal: CreateGoalInput): { valid: boolean; error?: string } {
	if (!goal.title || goal.title.length === 0) {
		return { valid: false, error: 'Title is required' };
	}

	if (goal.title.length > 255) {
		return { valid: false, error: 'Title must be 255 characters or less' };
	}

	if (!goal.description || goal.description.length === 0) {
		return { valid: false, error: 'Description is required' };
	}

	if (!goal.targetCompletionDate) {
		return { valid: false, error: 'Target completion date is required' };
	}

	return { valid: true };
}

/**
 * Parse mutation response from JSONB
 */
export function parseReviewMutationResponse(response: { json: string }): ReviewMutationResponse {
	if (typeof response.json === 'string') {
		return JSON.parse(response.json);
	}
	return response.json as any;
}
