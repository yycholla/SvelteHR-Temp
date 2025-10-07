// User Performance Reviews - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Verify user can access this review data (own data or has management permissions)
	let userId = params.id;
	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, 'Access denied: You can only view your own performance reviews');
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
		const userQuery = `
			query GetUser($id: UUID!) {
				userById(id: $id) {
					id
					email
					firstName
					lastName
					departmentId
					isActive
					departmentByDepartmentId {
						id
						name
						managerId
					}
				}
			}
		`;

		const userData = await graphqlClient.query(userQuery, { id: userId });
		const user = userData.data?.userById;

		if (!user) {
			throw error(404, 'User not found');
		}

		// Load performance reviews from database
		const reviewsQuery = `
			query GetUserPerformanceReviews($employeeId: UUID!) {
				allPerformanceReviews(
					condition: { employeeId: $employeeId }
					orderBy: [CREATED_AT_DESC]
				) {
					nodes {
						id
						employeeId
						reviewerId
						reviewPeriod
						status
						overallRating
						goals
						achievements
						areasForImprovement
						managerFeedback
						createdAt
						updatedAt
						userByReviewerId {
							id
							firstName
							lastName
							email
						}
					}
				}
			}
		`;

		const reviewsData = await graphqlClient.query(reviewsQuery, { employeeId: userId });
		const rawReviews = reviewsData.data?.allPerformanceReviews?.nodes || [];

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
			// Parse JSONB fields
			const goals = review.goals ? (typeof review.goals === 'string' ? JSON.parse(review.goals) : review.goals) : [];
			const achievements = review.achievements ? (typeof review.achievements === 'string' ? JSON.parse(review.achievements) : review.achievements) : [];
			const improvements = review.areasForImprovement ? (typeof review.areasForImprovement === 'string' ? JSON.parse(review.areasForImprovement) : review.areasForImprovement) : [];

			return {
				id: review.id,
				type: reviewTypes.find(t => t.id === (review.reviewPeriod || 'annual')) || reviewTypes[0],
				status: review.status || 'scheduled',
				reviewPeriod: {
					start: review.reviewPeriod || new Date().toISOString().split('T')[0],
					end: review.reviewPeriod || new Date().toISOString().split('T')[0]
				},
				scheduledDate: review.createdAt?.split('T')[0],
				completedDate: review.status === 'completed' ? review.updatedAt?.split('T')[0] : null,
				reviewer: review.userByReviewerId ? {
					id: review.userByReviewerId.id,
					displayName: `${review.userByReviewerId.firstName} ${review.userByReviewerId.lastName}`,
					email: review.userByReviewerId.email
				} : null,
				overallRating: review.overallRating || 0,
				competencies: [], // Not stored in current schema
				goals: Array.isArray(goals) ? goals : [],
				feedback: {
					strengths: Array.isArray(achievements) ? achievements : [],
					improvements: Array.isArray(improvements) ? improvements : [],
					managerComments: review.managerFeedback || '',
					employeeComments: null // Not in current schema
				},
				developmentPlan: [], // Not in current schema
				createdAt: review.createdAt,
				lastUpdated: review.updatedAt
			};
		});

		// Calculate review statistics
		const reviewStats = {
			total: reviews.length,
			completed: reviews.filter(r => r.status === 'completed').length,
			inProgress: reviews.filter(r => r.status === 'in_progress').length,
			scheduled: reviews.filter(r => r.status === 'scheduled').length,
			overdue: reviews.filter(r => r.status === 'overdue').length,
			averageRating: reviews.filter(r => r.status === 'completed' && r.overallRating > 0)
				.reduce((sum, r, _, arr) => sum + (r.overallRating / (arr.length || 1)), 0),
			lastReviewDate: reviews.find(r => r.status === 'completed')?.completedDate || null,
			nextReviewDate: reviews.find(r => r.status === 'scheduled' || r.status === 'in_progress')?.scheduledDate || null
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