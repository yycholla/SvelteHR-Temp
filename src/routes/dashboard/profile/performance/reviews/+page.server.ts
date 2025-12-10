// User Performance Reviews - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';

// Type definitions for GraphQL query responses
interface UserInfo {
	id: string;
	displayName: string;
	email: string;
	firstName: string;
	lastName: string;
}

interface ReviewCycleInfo {
	id: string;
	name: string;
	reviewType: string;
	startDate: string;
	endDate: string;
}

interface PerformanceReviewResponse {
	id: string;
	employeeId: string;
	reviewerId: string;
	cycleId: string;
	templateId: string;
	status: string;
	overallRating: number | null;
	submittedAt: string | null;
	createdAt: string;
	updatedAt: string;
	employee: UserInfo;
	reviewer: UserInfo;
	cycle: ReviewCycleInfo;
}

interface TransformedReview {
	id: string;
	type: {
		id: string;
		name: string;
		frequency: string;
		color: string;
	};
	status: string;
	reviewPeriod: {
		start: string;
		end: string;
	};
	scheduledDate: string;
	completedDate: string | null;
	reviewer: {
		id: string;
		displayName: string;
		email: string;
	} | null;
	overallRating: number | null;
	competencies: never[];
	goals: never[];
	feedback: {
		strengths: never[];
		improvements: never[];
		managerComments: null;
		employeeComments: null;
	};
	developmentPlan: never[];
	createdAt: string;
	lastUpdated: string;
}

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
	const { url, cookies } = event;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: [
			'performance:read',
			'performance:read:self',
			'performance:read:team',
			'performance:read:all'
		]
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

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
		// Migration: ✅ Use idiomatic Rust pattern (user with id parameter)
		const userQuery = `
			query GetUser($id: UUID!) {
				user(id: $id) {
					id
					email
					firstName
					lastName
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
		const user = userData.data?.user;

		if (!user) {
			error(404, 'User not found');
		}

		// Load actual performance reviews from database
		// Migration: ✅ Use idiomatic Rust pattern (performanceReviews with employeeId)
		// Note: Schema only has basic fields - feedback and goals are in separate tables
		const reviewsQuery = `
			query GetPerformanceReviewsByEmployee($employeeId: UUID!, $limit: Int!, $offset: Int!) {
				performanceReviews(employeeId: $employeeId, limit: $limit, offset: $offset) {
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
					employee {
						id
						displayName
						email
						firstName
						lastName
					}
					reviewer {
						id
						displayName
						email
						firstName
						lastName
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
		`;

		const reviewsData = await graphqlClient.query(reviewsQuery, {
			employeeId: userId,
			limit: 50,
			offset: 0
		});

		// Transform database reviews to frontend format
		// Note: Using placeholder data for fields that exist in separate tables (review_feedback, review_goal, review_cycle)
		const reviews: TransformedReview[] = (reviewsData.data?.performanceReviews || []).map(
			(review: PerformanceReviewResponse): TransformedReview => {
				// Map status enum to string
				const statusStr =
					typeof review.status === 'string'
						? review.status
						: (review.status as string)?.toLowerCase() || 'draft';
				const mappedStatus = mapReviewStatus(statusStr);

				// Infer review type from cycleId existence (would need to query review_cycle for actual type)
				const inferredType = 'annual'; // Default - actual type is in review_cycle table

				// Calculate review period from creation/submission dates (approximation until we query review_cycle)
				const createdDate = new Date(review.createdAt);
				const yearStart = new Date(createdDate.getFullYear(), 0, 1);
				const yearEnd = new Date(createdDate.getFullYear(), 11, 31);

				return {
					id: review.id,
					type: {
						id: inferredType,
						name: getReviewTypeName(inferredType),
						frequency: getReviewTypeFrequency(inferredType),
						color: getReviewTypeColor(inferredType)
					},
					status: mappedStatus,
					reviewPeriod: {
						start: yearStart.toISOString().split('T')[0],
						end: yearEnd.toISOString().split('T')[0]
					},
					scheduledDate: review.createdAt.split('T')[0],
					completedDate: review.submittedAt
						? review.submittedAt.split('T')[0]
						: mappedStatus === 'completed'
							? review.updatedAt.split('T')[0]
							: null,
					reviewer: review.reviewer
						? {
								id: review.reviewer.id,
								displayName:
									review.reviewer.displayName ||
									`${review.reviewer.firstName} ${review.reviewer.lastName}`,
								email: review.reviewer.email
							}
						: null,
					overallRating: review.overallRating || null,
					competencies: [], // Would need to query review_template or review_feedback for competencies
					goals: [], // Would need to query review_goals table
					feedback: {
						strengths: [], // Would need to query review_feedback table with feedback_type='manager'
						improvements: [], // Would need to query review_feedback table
						managerComments: null, // Would need to query review_feedback table
						employeeComments: null // Would need to query review_feedback table with feedback_type='self_review'
					},
					developmentPlan: [], // Would need to query review_goals table
					createdAt: review.createdAt,
					lastUpdated: review.updatedAt
				};
			}
		);

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
			completed: reviews.filter((r: TransformedReview) => r.status === 'completed').length,
			inProgress: reviews.filter((r: TransformedReview) => r.status === 'in_progress').length,
			scheduled: reviews.filter((r: TransformedReview) => r.status === 'scheduled').length,
			overdue: reviews.filter((r: TransformedReview) => r.status === 'overdue').length,
			averageRating: reviews
				.filter((r: TransformedReview) => r.status === 'completed' && r.overallRating)
				.reduce(
					(sum: number, r: TransformedReview, _: number, arr: TransformedReview[]) =>
						sum + (r.overallRating || 0) / arr.length,
					0
				),
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
