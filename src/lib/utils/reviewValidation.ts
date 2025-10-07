/**
 * Review Validation Utility Functions
 * Feature: 023-reviews-creation-it
 * Task: T039
 *
 * Helper functions for validating review operations
 */

import { createUrqlClient, executeQuery } from '$lib/graphql/graphql/client';
import { GET_ACTIVE_REVIEWS_FOR_EMPLOYEE } from '$lib/graphql/graphql/reviews-operations';
import type { ReviewType } from '$lib/schemas/reviews';

/**
 * Check if an employee already has an active review of the specified type
 *
 * @param employeeId - The employee's user ID
 * @param reviewType - The type of review to check
 * @param jwtToken - JWT token for authentication
 * @param fetchFn - Server-side fetch function
 * @returns Error message if duplicate exists, null otherwise
 */
export async function checkDuplicateActiveReview(
	employeeId: string,
	reviewType: ReviewType,
	jwtToken: string,
	fetchFn: typeof fetch
): Promise<string | null> {
	try {
		const client = createUrqlClient(fetchFn, jwtToken);

		const result = await executeQuery<{
			activeReviewsForEmployee: {
				nodes: Array<{
					id: string;
					reviewType: string;
					status: string;
				}>;
				totalCount: number;
			};
		}>(client, GET_ACTIVE_REVIEWS_FOR_EMPLOYEE, {
			employeeId,
			reviewType
		});

		if (!result.activeReviewsForEmployee) {
			return null;
		}

		if (result.activeReviewsForEmployee.totalCount > 0) {
			const existingReview = result.activeReviewsForEmployee.nodes[0];
			return `An active ${existingReview.reviewType.replace(/_/g, ' ')} already exists for this employee`;
		}

		return null;
	} catch (error) {
		console.error('Error checking for duplicate reviews:', error);
		return 'Unable to verify duplicate reviews at this time';
	}
}

/**
 * Check if an employee has any active reviews (regardless of type)
 *
 * @param employeeId - The employee's user ID
 * @param jwtToken - JWT token for authentication
 * @param fetchFn - Server-side fetch function
 * @returns Array of active review IDs and types
 */
export async function getActiveReviews(
	employeeId: string,
	jwtToken: string,
	fetchFn: typeof fetch
): Promise<Array<{ id: string; reviewType: string; status: string }>> {
	try {
		const client = createUrqlClient(fetchFn, jwtToken);

		const result = await executeQuery<{
			activeReviewsForEmployee: {
				nodes: Array<{
					id: string;
					reviewType: string;
					status: string;
				}>;
			};
		}>(client, GET_ACTIVE_REVIEWS_FOR_EMPLOYEE, {
			employeeId
			// No reviewType filter = get all active reviews
		});

		if (!result.activeReviewsForEmployee) {
			return [];
		}

		return result.activeReviewsForEmployee.nodes;
	} catch (error) {
		console.error('Error fetching active reviews:', error);
		return [];
	}
}

/**
 * Validate review period dates
 *
 * @param startDate - Review period start date (ISO string)
 * @param endDate - Review period end date (ISO string)
 * @returns Error message if invalid, null otherwise
 */
export function validateReviewPeriod(
	startDate?: string,
	endDate?: string
): string | null {
	if (!startDate && !endDate) {
		return null; // Both optional is valid
	}

	if (startDate && endDate) {
		const start = new Date(startDate);
		const end = new Date(endDate);

		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			return 'Invalid date format';
		}

		if (start >= end) {
			return 'Review period end date must be after start date';
		}

		// Check if period is reasonable (not more than 2 years)
		const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
		if (diffInDays > 730) {
			return 'Review period cannot exceed 2 years';
		}
	}

	return null;
}

/**
 * Validate that at least one goal is associated
 *
 * @param goalIds - Array of existing goal IDs
 * @param newGoals - Array of new goals to create
 * @returns Error message if no goals, null otherwise
 */
export function validateGoalAssociation(
	goalIds: string[],
	newGoals: Array<any>
): string | null {
	const totalGoals = (goalIds?.length || 0) + (newGoals?.length || 0);

	if (totalGoals === 0) {
		return null; // Goals are optional based on spec
	}

	if (totalGoals > 20) {
		return 'Cannot associate more than 20 goals with a single review';
	}

	return null;
}

/**
 * Check if a review can be edited based on its status
 *
 * @param status - Current review status
 * @returns true if review can be edited
 */
export function canEditReviewStatus(status: string): boolean {
	const editableStatuses = ['DRAFT', 'draft'];
	return editableStatuses.includes(status);
}

/**
 * Check if a review can transition to a new status
 *
 * @param currentStatus - Current review status
 * @param newStatus - Desired new status
 * @returns Error message if transition invalid, null otherwise
 */
export function validateStatusTransition(
	currentStatus: string,
	newStatus: string
): string | null {
	const validTransitions: Record<string, string[]> = {
		DRAFT: ['IN_PROGRESS', 'draft'],
		draft: ['IN_PROGRESS', 'in_progress'],
		IN_PROGRESS: ['COMPLETED', 'in_progress'],
		in_progress: ['COMPLETED', 'completed'],
		COMPLETED: [], // Cannot transition from completed
		completed: []
	};

	const allowedTransitions = validTransitions[currentStatus] || [];

	if (!allowedTransitions.includes(newStatus)) {
		return `Cannot transition review from ${currentStatus} to ${newStatus}`;
	}

	return null;
}

/**
 * Validate review notes length
 *
 * @param notes - Review notes text
 * @returns Error message if invalid, null otherwise
 */
export function validateReviewNotes(notes?: string): string | null {
	if (!notes) {
		return null; // Notes are optional
	}

	if (notes.length > 10000) {
		return 'Review notes cannot exceed 10,000 characters';
	}

	return null;
}

/**
 * Comprehensive validation for creating a new review
 *
 * @param data - Review creation data
 * @param jwtToken - JWT token for authentication
 * @param fetchFn - Server-side fetch function
 * @returns Array of error messages, empty if valid
 */
export async function validateCreateReview(
	data: {
		employeeId: string;
		reviewType: ReviewType;
		reviewPeriodStart?: string;
		reviewPeriodEnd?: string;
		goalIds?: string[];
		newGoals?: Array<any>;
		notes?: string;
	},
	jwtToken: string,
	fetchFn: typeof fetch
): Promise<string[]> {
	const errors: string[] = [];

	// Check for duplicate active review
	const duplicateError = await checkDuplicateActiveReview(
		data.employeeId,
		data.reviewType,
		jwtToken,
		fetchFn
	);
	if (duplicateError) {
		errors.push(duplicateError);
	}

	// Validate review period
	const periodError = validateReviewPeriod(data.reviewPeriodStart, data.reviewPeriodEnd);
	if (periodError) {
		errors.push(periodError);
	}

	// Validate goal association
	const goalError = validateGoalAssociation(data.goalIds || [], data.newGoals || []);
	if (goalError) {
		errors.push(goalError);
	}

	// Validate notes
	const notesError = validateReviewNotes(data.notes);
	if (notesError) {
		errors.push(notesError);
	}

	return errors;
}
