/**
 * Review Detail Page - Server Load
 * Feature: 023-reviews-creation-it
 * Task: T037
 *
 * Server-side data loading for individual review detail page
 * Implements RBAC permission checking
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createUrqlClient, executeQuery } from '$lib/graphql/graphql/client';
import {
	GET_PERFORMANCE_REVIEW,
	GET_EMPLOYEE_GOALS
} from '$lib/graphql/graphql/reviews-operations';
import { canViewReview, canEditReview } from '$lib/utils/rbac';

export const load: PageServerLoad = async ({ params, locals, cookies, fetch: fetchFn }) => {
	const reviewId = params.id;

	// Authentication handled by server hooks
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	try {
		// Create GraphQL client (session-based auth)
		const client = createUrqlClient(fetchFn);

		// Query: Get performance review by ID
		const reviewData = await executeQuery<{
			performanceReview: {
				id: string;
				employeeId: string;
				reviewerId: string;
				reviewType: string;
				status: string;
				reviewPeriodStart: string | null;
				reviewPeriodEnd: string | null;
				notes: string | null;
				createdAt: string;
				updatedAt: string;
				employee: {
					id: string;
					displayName: string;
					email: string;
					jobTitle: string;
					departmentId: string;
				};
				reviewer: {
					id: string;
					displayName: string;
					email: string;
				};
				reviewGoals: {
					nodes: Array<{
						id: string;
						goalId: string;
						createdAt: string;
						goal: {
							id: string;
							employeeId: string;
							title: string;
							description: string;
							targetDate: string;
							status: string;
							progressPercentage: number | null;
							deleted: boolean;
							deletedAt: string | null;
							createdAt: string;
							updatedAt: string;
						};
					}>;
				};
			};
		}>(client, GET_PERFORMANCE_REVIEW, {
			id: reviewId
		});

		if (!reviewData.performanceReview) {
			throw error(404, 'Review not found');
		}

		const review = reviewData.performanceReview;

		// RBAC: Check if user can view this review
		const hasViewPermission = await canViewReview(
			userId,
			userRole,
			review.employeeId,
			review.reviewerId,
			jwtToken,
			fetchFn
		);

		if (!hasViewPermission) {
			throw error(403, 'You do not have permission to view this review');
		}

		// Check if user can edit
		const hasEditPermission = canEditReview(userId, userRole, review.reviewerId, review.status);

		// Get all goals for the employee (for adding more goals)
		const goalsData = await executeQuery<{
			employeeGoals: {
				nodes: Array<{
					id: string;
					title: string;
					description: string;
					targetDate: string;
					status: string;
					progressPercentage: number | null;
					createdAt: string;
				}>;
			};
		}>(client, GET_EMPLOYEE_GOALS, {
			employeeId: review.employeeId,
			first: 50,
			orderBy: ['TARGET_DATE_ASC']
		});

		// Process associated goals
		const associatedGoals = review.reviewGoals.nodes.map((rg) => ({
			...rg.goal,
			linkedAt: rg.createdAt
		}));

		// Get available goals (not yet linked to this review)
		const linkedGoalIds = associatedGoals.map((g) => g.id);
		const availableGoals = goalsData.employeeGoals.nodes.filter(
			(goal) => !linkedGoalIds.includes(goal.id)
		);

		return {
			user: {
				id: userId,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: userRole
			},
			review: {
				...review,
				associatedGoals
			},
			availableGoals,
			permissions: {
				canEdit: hasEditPermission,
				canView: hasViewPermission,
				canDelete:
					userRole === 'admin' || userRole === 'super_admin' || userId === review.reviewerId
			}
		};
	} catch (err) {
		// Handle specific errors
		if (err instanceof Error && 'status' in err) {
			throw err; // Re-throw SvelteKit errors (401, 403, 404)
		}

		console.error('Error loading review detail:', err);
		throw error(500, 'Failed to load review details');
	}
};
