// User Performance/Goals - Server-Side Data Loading
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

	// Verify user can access this performance data (own data or has management permissions)
	let userId = params.id;
	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, 'Access denied: You can only view your own performance data');
	}

	try {
		// Ensure backend is ready before proceeding
		await ensureBackendReady();

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Load user details using new GraphQL client
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const userQuery = `
			query GetUser($id: UUID!) {
				users(limit: 1, filter: { id: { equalTo: $id } }) {
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
		const users = userData.data?.users || [];
		const user = users.length > 0 ? users[0] : null;

		if (!user) {
			throw error(404, 'User not found');
		}

		// Load actual goals for this specific user
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const userGoalsQuery = `
			query GetUserGoals($employeeId: UUID!, $limit: Int!) {
				employeeGoals(limit: $limit, filter: { employeeId: { equalTo: $employeeId } }) {
					id
					title
					description
					status
					progressPercentage
					targetDate
					createdAt
					updatedAt
				}
				employeeGoalsCount(filter: { employeeId: { equalTo: $employeeId } })
			}
		`;

		const goalsResult = await graphqlClient.query(userGoalsQuery, {
			employeeId: userId,
			limit: 100
		});

		const goals = goalsResult.data?.employeeGoals || [];

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
			goals: goals.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()),
			goalCategories,
			goalStats,
			currentQuarter: {
				start: quarterStart.toISOString().split('T')[0],
				end: quarterEnd.toISOString().split('T')[0],
				name: `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`
			},
			canManageGoals: canViewOthers,
			isOwnGoals: locals.user?.id === userId,
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
			isOwnGoals: locals.user?.id === userId,
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