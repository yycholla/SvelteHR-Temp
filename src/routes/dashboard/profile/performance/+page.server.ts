// User Performance/Goals - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		error(401, 'Authentication required');
	}

	// Use authenticated user's ID
	const userId = locals.user.id;

	try {
		// Ensure backend is ready before proceeding
		await ensureBackendReady();

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

		// Load actual goals for this specific user
		// NOTE: Using Rust GraphQL schema - direct parameter instead of filter
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

		// Transform employeeGoals to match expected format
		const rawGoals = goalsResult.data?.employeeGoals || [];
		const goals = rawGoals.map((goal: any) => ({
			id: goal.id,
			title: goal.goalTitle,
			description: goal.goalDescription,
			status: goal.status,
			progressPercentage: goal.progressPercentage,
			targetDate: goal.targetDate,
			createdAt: goal.createdAt,
			updatedAt: goal.updatedAt
		}));

		// Calculate date ranges for current quarter
		const currentDate = new Date();
		const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
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
			completed: goals.filter(g => g.status === 'completed').length,
			inProgress: goals.filter(g => g.status === 'in_progress').length,
			atRisk: goals.filter(g => g.status === 'at_risk').length,
			notStarted: goals.filter(g => g.status === 'not_started').length,
			blocked: goals.filter(g => g.status === 'blocked').length,
			averageProgress: goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + (g.progressPercentage || 0), 0) / goals.length) : 0,
			completionRate: goals.length > 0 ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100) : 0
		};

		return {
			user,
			userId,
			goals: goals.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
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

	} catch (err) {
		console.error('Error loading user performance data:', err);

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
