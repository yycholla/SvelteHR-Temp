/**
 * Review Detail Page - Server Load
 * Feature: 023-reviews-creation-it
 * Task: T037
 *
 * Server-side data loading for individual review detail page
 * Implements permission-based access control
 * Refactored: Phase 2 - Using Phase 1 Foundation utilities
 */

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { AccessTier } from '$lib/server/rbac-utils';
import { canEditReview, canViewReview } from '$lib/utils/rbac';
import { logger } from '$lib/utils/logger';

// Sub-route names that get caught by [id] - redirect them to main reviews page
const REVIEWS_SUBROUTES = ['pending', 'history', 'templates', 'new', 'create'];

export const load: PageServerLoad = async (event) => {
	// Redirect known sub-route names to avoid treating them as review IDs
	if (REVIEWS_SUBROUTES.includes(event.params.id)) {
		redirect(303, '/dashboard/reviews');
	}

	const loader = new RBACDataLoader(event, AccessTier.SELF);

	return loader.loadWithClient(async () => {
		const { params, cookies } = event;
		const reviewId = params.id;

		const userId = loader.getUserId();
		const userRole = loader.getUserRole();

		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Forward session cookies for authentication
		const cookieHeader = event.request.headers.get('cookie') || '';

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Cookie: cookieHeader
		};

		// Query: Get performance review by ID
		// NOTE: Using Rust GraphQL schema - singular query for ID lookup
		const reviewResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetPerformanceReview($id: UUID!) {
						performanceReview(id: $id) {
							id
							employeeId
							reviewerId
							cycleId
							status
							overallRating
							createdAt
							updatedAt
							employee {
								id
								displayName
								email
								jobTitle
								departmentId
							}
							reviewer {
								id
								displayName
								email
							}
							cycle {
								id
								name
								reviewType
								startDate
								endDate
							}
						}
					}
				`,
				variables: { id: reviewId }
			})
		});

		const reviewData = await reviewResponse.json();

		if (reviewData.errors) {
			logger.error('[Review Detail] GraphQL errors:', reviewData.errors);
			throw new Error(reviewData.errors[0]?.message || 'Failed to load review');
		}

		const review = reviewData?.data?.performanceReview;

		if (!review) {
			error(404, 'Review not found');
		}

		// RBAC: Check if user can view this review
		const hasViewPermission = await canViewReview(
			userId,
			userRole,
			review.employeeId,
			review.reviewerId,
			cookies
		);

		if (!hasViewPermission) {
			error(403, 'You do not have permission to view this review');
		}

		// Check if user can edit
		const hasEditPermission = canEditReview(userId, userRole, review.reviewerId, review.status);

		// Get all goals for the employee (for adding more goals)
		// NOTE: Using Rust GraphQL schema - direct parameters instead of filter
		const goalsResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetEmployeeGoals($employeeId: UUID!, $limit: Int!) {
						employeeGoals(employeeId: $employeeId, limit: $limit) {
							id
							goalTitle
							goalDescription
							targetDate
							status
							progressPercentage
							createdAt
							updatedAt
						}
					}
				`,
				variables: {
					employeeId: review.employeeId,
					limit: 100
				}
			})
		});

		const goalsData = await goalsResponse.json();

		// Transform employeeGoals to match expected format
		const employeeGoals = (goalsData.data?.employeeGoals || []).map((goal: any) => ({
			id: goal.id,
			title: goal.goalTitle,
			description: goal.goalDescription,
			targetDate: goal.targetDate,
			status: goal.status,
			progressPercentage: goal.progressPercentage,
			createdAt: goal.createdAt,
			updatedAt: goal.updatedAt
		}));

		// For now, set empty associated goals since reviewGoals relationship needs backend support
		const associatedGoals: any[] = [];

		// Get available goals (all goals for the employee)
		const availableGoals = employeeGoals;

		// Transform review data to flatten cycle properties for page compatibility
		const transformedReview = {
			...review,
			// Flatten cycle properties to match page expectations
			reviewType: review.cycle?.reviewType || 'ANNUAL_REVIEW',
			reviewPeriodStart: review.cycle?.startDate || null,
			reviewPeriodEnd: review.cycle?.endDate || null,
			notes: null, // Notes field doesn't exist in current schema
			associatedGoals
		};

		return {
			review: transformedReview,
			availableGoals,
			permissions: {
				canEdit: hasEditPermission,
				canView: hasViewPermission,
				canDelete:
					userRole === 'admin' || userRole === 'super_admin' || userId === review.reviewerId
			}
		};
	});
};
