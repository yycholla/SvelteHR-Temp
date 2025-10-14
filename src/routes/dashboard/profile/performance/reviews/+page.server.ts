// User Performance Reviews - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

// Helper functions for review type mapping
function getReviewTypeName(reviewType: string): string {
	const typeMap: Record<string, string> = {
		annual: 'Annual Review',
		quarterly: 'Quarterly Review',
		probationary: 'Probationary Review',
		project: 'Project Review',
		performance_improvement: 'Performance Improvement Plan',
		exit: 'Exit Review'
	};
	return typeMap[reviewType] || 'Performance Review';
}

function getReviewTypeFrequency(reviewType: string): string {
	const frequencyMap: Record<string, string> = {
		annual: 'yearly',
		quarterly: 'quarterly',
		probationary: 'one-time',
		project: 'one-time',
		performance_improvement: 'one-time',
		exit: 'one-time'
	};
	return frequencyMap[reviewType] || 'one-time';
}

function getReviewTypeColor(reviewType: string): string {
	const colorMap: Record<string, string> = {
		annual: 'blue',
		quarterly: 'purple',
		probationary: 'red',
		project: 'green',
		performance_improvement: 'orange',
		exit: 'gray'
	};
	return colorMap[reviewType] || 'blue';
}

function mapReviewStatus(status: string): string {
	const statusMap: Record<string, string> = {
		draft: 'draft',
		not_started: 'scheduled',
		in_progress: 'in_progress',
		completed: 'completed'
	};
	return statusMap[status] || 'scheduled';
}

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Use authenticated user's ID
	const userId = locals.user.id;

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
				isOwnReviews: true,
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

		// Load actual performance reviews from database
		const reviewsQuery = `
			query GetPerformanceReviewsByEmployee($employeeId: UUID!, $limit: Int) {
				performanceReviewsByEmployee(employeeId: $employeeId, limit: $limit) {
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
					reviewPeriodStart
					reviewPeriodEnd
					reviewType
					notes
					createdAt
					updatedAt
					userByEmployeeId {
						id
						displayName
						email
						firstName
						lastName
					}
					userByReviewerId {
						id
						displayName
						email
						firstName
						lastName
					}
				}
			}
		`;

		const reviewsData = await graphqlClient.query(reviewsQuery, {
			employeeId: userId,
			limit: 50
		});

		// Transform database reviews to frontend format
		const reviews = (reviewsData.data?.performanceReviewsByEmployee || []).map((review) => ({
			id: review.id,
			type: {
				id: review.reviewType || 'annual',
				name: getReviewTypeName(review.reviewType || 'annual'),
				frequency: getReviewTypeFrequency(review.reviewType || 'annual'),
				color: getReviewTypeColor(review.reviewType || 'annual')
			},
			status: mapReviewStatus(review.status),
			reviewPeriod: {
				start: review.reviewPeriodStart,
				end: review.reviewPeriodEnd
			},
			scheduledDate: review.createdAt.split('T')[0],
			completedDate: review.status === 'completed' ? review.updatedAt.split('T')[0] : null,
			reviewer: review.userByReviewerId
				? {
						id: review.userByReviewerId.id,
						displayName:
							review.userByReviewerId.displayName ||
							`${review.userByReviewerId.firstName} ${review.userByReviewerId.lastName}`,
						email: review.userByReviewerId.email
					}
				: null,
			overallRating: review.overallRating ? parseFloat(review.overallRating.toString()) : null,
			competencies: [], // TODO: Parse from achievements/areas_for_improvement when structured data is available
			goals: [], // TODO: Load actual goals from review_goals table
			feedback: {
				strengths: review.achievements ? [review.achievements] : [],
				improvements: review.areasForImprovement ? [review.areasForImprovement] : [],
				managerComments: review.managerFeedback || null,
				employeeComments: review.notes || null
			},
			developmentPlan: [], // TODO: Parse from goals when structured
			createdAt: review.createdAt,
			lastUpdated: review.updatedAt
		}));

		// Static review types (could be loaded from database in future)
		const reviewTypes = [
			{ id: 'annual', name: 'Annual Review', frequency: 'yearly', color: 'blue' },
			{ id: 'quarterly', name: 'Quarterly Review', frequency: 'quarterly', color: 'purple' },
			{ id: 'probationary', name: 'Probationary Review', frequency: 'one-time', color: 'red' },
			{ id: 'project', name: 'Project Review', frequency: 'one-time', color: 'green' },
			{
				id: 'performance_improvement',
				name: 'Performance Improvement Plan',
				frequency: 'one-time',
				color: 'orange'
			},
			{ id: 'exit', name: 'Exit Review', frequency: 'one-time', color: 'gray' }
		];

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

		// Calculate review statistics from actual data
		const reviewStats = {
			total: reviews.length,
			completed: reviews.filter((r) => r.status === 'completed').length,
			inProgress: reviews.filter((r) => r.status === 'in_progress').length,
			scheduled: reviews.filter((r) => r.status === 'scheduled').length,
			overdue: reviews.filter((r) => r.status === 'overdue').length,
			averageRating: reviews
				.filter((r) => r.status === 'completed' && r.overallRating)
				.reduce((sum, r, _, arr) => sum + (r.overallRating || 0) / arr.length, 0),
			lastReviewDate: reviews
				.filter((r) => r.status === 'completed')
				.sort(
					(a, b) =>
						new Date(b.completedDate || b.scheduledDate).getTime() -
						new Date(a.completedDate || a.scheduledDate).getTime()
				)[0]?.completedDate,
			nextReviewDate: reviews
				.filter((r) => r.status === 'scheduled' || r.status === 'in_progress')
				.sort(
					(a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
				)[0]?.scheduledDate
		};

		return {
			user,
			userId,
			reviews: reviews.sort(
				(a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
			),
			reviewTypes,
			competencyAreas,
			reviewStats,
			canManageReviews: false,
			isOwnReviews: true,
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
			isOwnReviews: true,
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
