// User Performance Reviews - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url, cookies } = event;

	// Check authentication and permissions (with scope validation)
	PermissionChecks.performanceRead(event);

	// Scope validation: Check if user can view THIS specific employee's data
	const userId = params.id;
	const userPermissions = locals.permissions || [];
	const isViewingSelf = locals.user?.id === userId;

	// If not viewing self, check for team or all scope
	if (!isViewingSelf) {
		const hasTeamScope =
			userPermissions.includes('performance:read:team') ||
			userPermissions.includes('performance:read:all');
		if ((!hasTeamScope && !userPermissions.includes('*')) || userPermissions.includes('*:*')) {
			error(403, 'Access denied: You can only view your own performance reviews');
		}

		// TODO: Add team validation if user only has team scope
		// Should verify that the target user is in the same team/department
	}

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			console.warn('Backend not ready for user performance reviews page');
			return {
				user: null,
				userId,
				reviews: [],
				reviewTypes: [],
				competencyAreas: [],
				reviewStats: {
					total: 0,
					completed: 0,
					inProgress: 0,
					scheduled: 0,
					overdue: 0,
					averageRating: 0,
					lastReviewDate: null,
					nextReviewDate: null
				},
				canManageReviews: false,
				isOwnReviews: locals.user?.id === userId,
				permissions: locals.permissions || [],
				loadedAt: new Date().toISOString(),
				error: {
					message: 'Backend services are initializing. Please try again in a moment.',
					details: 'Backend initialization in progress',
					retryable: true
				}
			};
		}

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Load user details using new GraphQL client
		// NOTE: Using Rust GraphQL schema - singular query for ID lookup
		const userQuery = `
			query GetUser($id: UUID!) {
				user(id: $id) {
					id
					email
					displayName
					departmentId
					isActive
					department {
						id
						name
						managerId
					}
				}
			}
		`;

		const userData = await graphqlClient.query(userQuery, { id: userId });
		const user = userData.data?.user || null;

		if (!user) {
			error(404, 'User not found');
		}

		// Load performance reviews from database
		// NOTE: Using Rust GraphQL schema - fetch all and filter client-side
		const reviewsQuery = `
			query GetUserPerformanceReviews($limit: Int!) {
				performanceReviews(limit: $limit) {
					id
					employeeId
					reviewerId
					cycleId
					templateId
					status
					overallRating
					submittedAt
					createdAt
					updatedAt
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
					goals {
						id
						title
						description
						completionStatus
					}
					managerFeedback
				}
			}
		`;

		const reviewsData = await graphqlClient.query(reviewsQuery, { limit: 1000 });
		const allReviews = reviewsData.data?.performanceReviews || [];

		// Client-side filtering for employeeId
		const rawReviews = allReviews.filter((review: any) => review.employeeId === userId);

		// Static competency areas for display
		const competencyAreas = [
			'Technical Skills',
			'Communication',
			'Leadership',
			'Problem Solving',
			'Teamwork',
			'Initiative',
			'Quality of Work',
			'Reliability',
			'Adaptability',
			'Customer Focus'
		];

		// Static review types for display
		const reviewTypes = [
			{ id: 'annual', name: 'Annual Review', frequency: 'yearly', color: 'blue' },
			{ id: 'mid_year', name: 'Mid-Year Review', frequency: 'bi-annual', color: 'green' },
			{ id: 'quarterly', name: 'Quarterly Check-in', frequency: 'quarterly', color: 'purple' },
			{ id: 'probation', name: 'Probation Review', frequency: 'one-time', color: 'red' }
		];

		// Map reviews to expected format
		const reviews = rawReviews.map((review: any) => {
			// Extract cycle information for review type and period
			const cycleType = review.cycle?.reviewType || 'annual_review';
			const matchingType =
				reviewTypes.find((t) => t.id === cycleType.replace('_review', '')) || reviewTypes[0];

			// Map goals from review_goal relationships
			const goals = Array.isArray(review.goals) ? review.goals : [];

			return {
				id: review.id,
				type: matchingType,
				status: review.status || 'scheduled',
				reviewPeriod: {
					start: review.cycle?.startDate || new Date().toISOString().split('T')[0],
					end: review.cycle?.endDate || new Date().toISOString().split('T')[0]
				},
				scheduledDate: review.createdAt?.split('T')[0],
				completedDate:
					review.status === 'completed' && review.submittedAt
						? review.submittedAt.split('T')[0]
						: null,
				reviewer: review.reviewer
					? {
							id: review.reviewer.id,
							displayName: review.reviewer.displayName,
							email: review.reviewer.email
						}
					: null,
				overallRating: review.overallRating || 0,
				competencies: [], // Would need to query review_feedback or review_template
				goals,
				feedback: {
					strengths: [], // Would need to query review_feedback with feedback_type='strengths'
					improvements: [], // Would need to query review_feedback with feedback_type='improvements'
					managerComments: review.managerFeedback || '',
					employeeComments: null // Would need to query review_feedback with feedback_type='self_review'
				},
				developmentPlan: [], // Would need to query review_goals with goal_type='development'
				createdAt: review.createdAt,
				lastUpdated: review.updatedAt
			};
		});

		// Calculate review statistics
		const reviewStats = {
			total: reviews.length,
			completed: reviews.filter((r) => r.status === 'completed').length,
			inProgress: reviews.filter((r) => r.status === 'in_progress').length,
			scheduled: reviews.filter((r) => r.status === 'scheduled').length,
			overdue: reviews.filter((r) => r.status === 'overdue').length,
			averageRating: reviews
				.filter((r) => r.status === 'completed' && r.overallRating > 0)
				.reduce((sum, r, _, arr) => sum + r.overallRating / (arr.length || 1), 0),
			lastReviewDate: reviews.find((r) => r.status === 'completed')?.completedDate || null,
			nextReviewDate:
				reviews.find((r) => r.status === 'scheduled' || r.status === 'in_progress')
					?.scheduledDate || null
		};

		return {
			user,
			userId,
			reviews,
			reviewTypes,
			competencyAreas,
			reviewStats,
			canManageReviews: canViewOthers,
			isOwnReviews: locals.user?.id === userId,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading user performance reviews:', err);

		// Return error state instead of throwing to prevent page crash
		return {
			user: null,
			userId,
			reviews: [],
			reviewTypes: [],
			competencyAreas: [],
			reviewStats: {
				total: 0,
				completed: 0,
				inProgress: 0,
				scheduled: 0,
				overdue: 0,
				averageRating: 0,
				lastReviewDate: null,
				nextReviewDate: null
			},
			canManageReviews: false,
			isOwnReviews: locals.user?.id === userId,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Unable to load performance reviews. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};
