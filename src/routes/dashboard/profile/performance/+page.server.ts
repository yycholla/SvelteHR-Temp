// User Performance/Goals - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { requireAuth } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';
import { logger } from '$lib/utils/logger';

// Type definitions for GraphQL query responses
interface ReviewerInfo {
	id: string;
	displayName: string;
}

interface CycleInfo {
	name: string;
}

interface PerformanceReviewFromGraphQL {
	id: string;
	cycle: CycleInfo | null;
	overallRating: number | null;
	status: string;
	createdAt: string;
	reviewer: ReviewerInfo;
}

interface TransformedReview {
	id: string;
	cycle: CycleInfo | null;
	overallRating: number | null;
	status: string;
	createdAt: string;
	reviewer: ReviewerInfo;
	reviewPeriod: string;
}

interface EmployeeGoalRawFromGraphQL {
	id: string;
	goalTitle: string;
	goalDescription: string | null;
	status: string | null;
	progressPercentage: number | null;
	targetDate: string | null;
	createdAt: string;
	updatedAt: string;
}

interface TransformedGoal {
	id: string;
	title: string;
	description: string | null;
	status: string;
	progressPercentage: number | null;
	targetDate: string | null;
	createdAt: string;
	updatedAt: string;
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
		logger.info('[Performance Page] Loading performance data for user', { userId });

		// Ensure backend is ready before proceeding
		await ensureBackendReady();

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);
		logger.info('[Performance Page] GraphQL client created');

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

		logger.info('[Performance Page] Fetching user data...');
		const userData = await graphqlClient.query(userQuery, { id: userId });
		const user = userData.data?.user || null;
		logger.info('[Performance Page] User data', { found: !!user });

		if (!user) {
			logger.error('[Performance Page] User not found', undefined, { userId });
			error(404, 'User not found');
		}

		// Load actual goals for this specific user
		// NOTE: Using Rust GraphQL schema - direct parameter instead of filter
		logger.info('[Performance Page] Fetching goals...');
		const userGoalsQuery = `
			query GetUserGoals($employeeId: UUID!, $limit: Int!) {
				employeeGoals(employeeId: $employeeId, limit: $limit) {
					id
					goalTitle
					goalDescription
					status
					progressPercentage
					targetDate
					createdAt
					updatedAt
				}
			}
		`;

		const goalsResult = await graphqlClient.query(userGoalsQuery, {
			employeeId: userId,
			limit: 100
		});
		logger.info('[Performance Page] Goals result', {
			goalsFound: goalsResult.data ? goalsResult.data.employeeGoals?.length || 0 : 0,
			hasData: !!goalsResult.data
		});

		// Fetch performance reviews for history and rating
		const reviewsQuery = `
			query GetPerformanceReviews($employeeId: UUID!, $limit: Int!) {
				performanceReviews(employeeId: $employeeId, limit: $limit) {
					id
					cycle {
						name
					}
					overallRating
					status
					createdAt
					reviewer {
						id
						displayName
					}
				}
			}
		`;
		const reviewsResult = await graphqlClient.query(reviewsQuery, {
			employeeId: userId,
			limit: 20
		});

		const rawReviews: PerformanceReviewFromGraphQL[] = reviewsResult.data?.performanceReviews || [];
		const reviews: TransformedReview[] = rawReviews.map(
			(r: PerformanceReviewFromGraphQL): TransformedReview => ({
				...r,
				reviewPeriod: r.cycle?.name || 'Performance Review'
			})
		);

		// Calculate overall rating (average of completed reviews)
		const completedReviews: TransformedReview[] = reviews.filter(
			(r: TransformedReview) => r.status === 'COMPLETED' && r.overallRating
		);
		const averageRating =
			completedReviews.length > 0
				? (
						completedReviews.reduce(
							(sum: number, r: TransformedReview) => sum + (r.overallRating || 0),
							0
						) / completedReviews.length
					).toFixed(1)
				: 'N/A';

		// Transform employeeGoals to match expected format
		const rawGoals: EmployeeGoalRawFromGraphQL[] = goalsResult.data?.employeeGoals || [];
		logger.info('[Performance Page] Raw goals', { goalsCount: rawGoals.length });
		const goals: TransformedGoal[] = rawGoals.map(
			(goal: EmployeeGoalRawFromGraphQL): TransformedGoal => ({
				id: goal.id,
				title: goal.goalTitle,
				description: goal.goalDescription,
				// Convert GraphQL enum (NOT_STARTED) to frontend format (not_started)
				status: goal.status?.toLowerCase() || 'not_started',
				progressPercentage: goal.progressPercentage,
				targetDate: goal.targetDate,
				createdAt: goal.createdAt,
				updatedAt: goal.updatedAt
			})
		);

		// Calculate date ranges for current quarter
		const currentDate = new Date();
		const quarterStart = new Date(
			currentDate.getFullYear(),
			Math.floor(currentDate.getMonth() / 3) * 3,
			1
		);
		const quarterEnd = new Date(quarterStart);
		quarterEnd.setMonth(quarterEnd.getMonth() + 3);
		quarterEnd.setDate(0); // Last day of quarter

		// Goal categories for UI (these are for display purposes)
		const goalCategories = [
			{ id: '1', name: 'Professional Development', color: 'blue' },
			{ id: '2', name: 'Performance', color: 'green' },
			{ id: '3', name: 'Leadership', color: 'purple' },
			{ id: '4', name: 'Skills & Learning', color: 'orange' },
			{ id: '5', name: 'Team Collaboration', color: 'pink' }
		];

		// Calculate goal statistics from real data
		const goalStats = {
			total: goals.length,
			completed: goals.filter((g: TransformedGoal) => g.status === 'completed').length,
			inProgress: goals.filter((g: TransformedGoal) => g.status === 'in_progress').length,
			atRisk: goals.filter((g: TransformedGoal) => g.status === 'at_risk').length,
			notStarted: goals.filter((g: TransformedGoal) => g.status === 'not_started').length,
			blocked: goals.filter((g: TransformedGoal) => g.status === 'blocked').length,
			averageProgress:
				goals.length > 0
					? Math.round(
							goals.reduce(
								(sum: number, g: TransformedGoal) => sum + (g.progressPercentage || 0),
								0
							) / goals.length
						)
					: 0,
			completionRate:
				goals.length > 0
					? Math.round(
							(goals.filter((g: TransformedGoal) => g.status === 'completed').length /
								goals.length) *
								100
						)
					: 0
		};

		logger.info('[Performance Page] Preparing return data...');
		const returnData = {
			user,
			userId,
			goals: goals.sort(
				(a: TransformedGoal, b: TransformedGoal) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			),
			reviews,
			averageRating,
			goalCategories,
			goalStats,
			currentQuarter: {
				start: quarterStart.toISOString().split('T')[0],
				end: quarterEnd.toISOString().split('T')[0],
				name: `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`
			},
			canManageGoals: false,
			isOwnGoals: true,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString()
		};
		logger.info('[Performance Page] Successfully loaded data:', {
			goalsCount: returnData.goals.length,
			user: returnData.user.displayName
		});
		return returnData;
	} catch (err) {
		logger.error('Error loading user performance data:', err as Error);

		// Return error state instead of throwing to prevent page crash
		return {
			user: null,
			userId,
			goals: [],
			goalCategories: [],
			goalStats: {
				total: 0,
				completed: 0,
				inProgress: 0,
				atRisk: 0,
				notStarted: 0,
				blocked: 0,
				averageProgress: 0,
				completionRate: 0
			},
			currentQuarter: {
				start: '',
				end: '',
				name: ''
			},
			canManageGoals: false,
			isOwnGoals: true,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Unable to load performance data. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};
