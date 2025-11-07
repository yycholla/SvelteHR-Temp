/**
 * Review Detail Page - Server Load
 * Feature: 023-reviews-creation-it
 * Task: T037
 *
 * Server-side data loading for individual review detail page
 * Implements permission-based access control
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies, fetch: fetchFn } = event;
	const reviewId = params.id;

	// Check authentication and permissions
	PermissionChecks.performanceRead(event);

	const userId = locals.user.id;
	const userPermissions = locals.permissions || [];

	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
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
			console.error('[Review Detail] GraphQL errors:', reviewData.errors);
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
			undefined, // Session-based auth, no JWT token
			fetchFn
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
		error(500, 'Failed to load review details');
	}
};
