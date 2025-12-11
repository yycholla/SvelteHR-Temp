// User Performance/Goals - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';
import { logger } from '$lib/utils/logger';

// Type definitions for GraphQL query responses
interface EmployeeGoalFromGraphQL {
	id: string;
	title: string;
	description: string | null;
	status: string;
	progressPercentage: number | null;
	progress?: number;
	targetDate: string | null;
	createdAt: string;
	updatedAt: string;
	category?: { id: string; name: string; color: string };
	priority?: string;
	keyResults?: Array<{ id: string; title: string; progress: number }>;
	assignedBy?: { id: string; displayName: string; email: string } | null;
}

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
			error(403, 'Access denied: You can only view your own performance data');
		}

		// TODO: Add team validation if user only has team scope
		// Should verify that the target user is in the same team/department
	}

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
		// NOTE: Using Rust GraphQL schema - employeeId as direct parameter
		const userGoalsQuery = `
			query GetUserGoals($employeeId: UUID!, $limit: Int!) {
				employeeGoals(employeeId: $employeeId, limit: $limit) {
					id
					title
					description
					status
					progressPercentage
					targetDate
					createdAt
					updatedAt
					assignedBy {
						id
						displayName
						email
					}
				}
			}
		`;

		const goalsResult = await graphqlClient.query(userGoalsQuery, {
			employeeId: userId,
			limit: 100
		});

		const goals: EmployeeGoalFromGraphQL[] = goalsResult.data?.employeeGoals || [];
		// NOTE: Rust backend doesn't provide count query, use array length
		const goalsCount = goals.length;

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

		// Determine if user can manage goals (based on permissions)
		const canViewOthers =
			userPermissions.includes('performance:read:team') ||
			userPermissions.includes('performance:read:all') ||
			userPermissions.includes('*');

		// Calculate goal statistics from real data
		const goalStats = {
			total: goals.length,
			completed: goals.filter((g: EmployeeGoalFromGraphQL) => g.status === 'completed').length,
			inProgress: goals.filter((g: EmployeeGoalFromGraphQL) => g.status === 'in_progress').length,
			atRisk: goals.filter((g: EmployeeGoalFromGraphQL) => g.status === 'at_risk').length,
			notStarted: goals.filter((g: EmployeeGoalFromGraphQL) => g.status === 'not_started').length,
			blocked: goals.filter((g: EmployeeGoalFromGraphQL) => g.status === 'blocked').length,
			averageProgress:
				goals.length > 0
					? Math.round(
							goals.reduce(
								(sum: number, g: EmployeeGoalFromGraphQL) => sum + (g.progressPercentage || 0),
								0
							) / goals.length
						)
					: 0,
			completionRate:
				goals.length > 0
					? Math.round(
							(goals.filter((g: EmployeeGoalFromGraphQL) => g.status === 'completed').length /
								goals.length) *
								100
						)
					: 0
		};

		// Enrich goals with category, priority, progress, and keyResults
		const enrichedGoals = goals.map((goal: EmployeeGoalFromGraphQL, index: number) => ({
			...goal,
			category: goal.category || goalCategories[index % goalCategories.length],
			priority: goal.priority || 'medium',
			progress: goal.progress ?? goal.progressPercentage ?? 0,
			keyResults: goal.keyResults || []
		}));

		return {
			user,
			userId,
			goals: enrichedGoals.sort(
				(a: EmployeeGoalFromGraphQL, b: EmployeeGoalFromGraphQL) =>
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
			),
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
