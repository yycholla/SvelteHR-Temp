// Management Goals - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Authorization is handled by parent layout (+layout.server.ts)
	const parentData = await event.parent();
	const { hasManagerAccess, isAdmin } = parentData;

	// Extract search parameters for filtering
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const priorityFilter = url.searchParams.get('priority') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = 20;
	const offset = (page - 1) * limit;
	try {
		// Ensure backend is ready before proceeding
		await ensureBackendReady();

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Load actual goals from database using Rust GraphQL server
		// Now that DB columns are renamed to match Rust expectations
		const goalsQuery = `
			query GetEmployeeGoals($limit: Int!, $offset: Int!) {
				employeeGoals(limit: $limit, offset: $offset) {
					id
					employeeId
					goalTitle
					goalDescription
					status
					progressPercentage
					targetDate
					createdAt
					updatedAt
				}
				employeeGoalsCount
			}
		`;

		const result = await graphqlClient.query(goalsQuery, {
			limit,
			offset
		});

		if (!result.data) {
			throw new Error('Failed to fetch goals data');
		}

		const goals = result.data.employeeGoals || [];
		const totalGoals = result.data.employeeGoalsCount || 0;

		// Transform goals data to expected format
		const transformedGoals = goals.map((goal) => ({
			...goal,
			title: goal.goalTitle,
			description: goal.goalDescription,
			userByEmployeeId: {
				id: goal.employeeId,
				firstName: 'Employee', // Placeholder
				lastName: goal.employeeId.slice(-4), // Placeholder
				email: `employee${goal.employeeId}@company.com` // Placeholder
			}
		}));

		// Calculate analytics from real data
		const analytics = {
			totalGoals,
			activeGoals: transformedGoals.filter((g) => g.status === 'in_progress').length,
			completedGoals: transformedGoals.filter((g) => g.status === 'completed').length,
			overdueGoals: transformedGoals.filter(
				(g) => new Date(g.targetDate) < new Date() && g.status !== 'completed'
			).length,
			highPriorityGoals: 0, // Priority field doesn't exist in schema
			averageProgress:
				transformedGoals.length > 0
					? Math.round(
							transformedGoals.reduce((sum, g) => sum + (g.progressPercentage || 0), 0) /
								transformedGoals.length
						)
					: 0,
			completionRate:
				totalGoals > 0
					? Math.round(
							(transformedGoals.filter((g) => g.status === 'completed').length / totalGoals) * 100
						)
					: 0
		};

		// Calculate additional metrics
		const onTrackGoals = transformedGoals.filter(
			(g) => (g.progressPercentage || 0) >= 50 && g.status === 'in_progress'
		).length;
		const atRiskGoals = transformedGoals.filter(
			(g) => (g.progressPercentage || 0) < 50 && g.status === 'in_progress'
		).length;
		const behindGoals = analytics.overdueGoals;

		// Calculate goals by type (if type field exists)
		const byType = {
			okr: 0, // Would need to add type field to schema
			kpi: 0,
			milestone: 0,
			objective: 0
		};

		// Calculate health score (0-100)
		const healthScore =
			totalGoals > 0
				? Math.round(((analytics.completedGoals + onTrackGoals) / totalGoals) * 100)
				: 0;

		return {
			user: {
				id: locals.user?.id || '',
				email: locals.user?.email || '',
				displayName: locals.user?.display_name || 'User',
				role: locals.user?.role || 'employee'
			},
			userSession: {
				userId: locals.user?.id || '',
				userEmail: locals.user?.email || '',
				role: locals.user?.role || 'employee',
				accessToken: '' // Session-based auth doesn't use access tokens
			},
			teamGoals: transformedGoals,
			totalGoals,
			goalsAnalytics: {
				summary: {
					totalGoals: analytics.totalGoals,
					activeGoals: analytics.activeGoals,
					completedGoals: analytics.completedGoals,
					overdueGoals: analytics.overdueGoals
				},
				progress: {
					averageProgress: analytics.averageProgress,
					onTrackGoals,
					atRiskGoals,
					behindGoals
				},
				byType,
				breakdowns: {
					priority: [], // Priority field doesn't exist in schema yet
					type: [] // Type field doesn't exist in schema yet
				},
				healthScore
			},
			filters: {
				searchTerm,
				statusFilter,
				typeFilter: '',
				priorityFilter
			},
			pagination: {
				currentPage: page,
				limit,
				totalPages: Math.ceil(totalGoals / limit),
				hasNextPage: page * limit < totalGoals,
				hasPreviousPage: page > 1
			},
			permissions: locals.permissions || [],
			canCreateGoals: hasManagerAccess,
			canEditGoals: hasManagerAccess,
			canViewAllGoals: locals.roles?.includes('admin') || false,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading management goals data:', err);

		// Return error state instead of throwing to prevent page crash
		return {
			user: {
				id: locals.user?.id || '',
				email: locals.user?.email || '',
				displayName: locals.user?.display_name || 'User',
				role: locals.user?.role || 'employee'
			},
			userSession: {
				userId: locals.user?.id || '',
				userEmail: locals.user?.email || '',
				role: locals.user?.role || 'employee',
				accessToken: '' // Session-based auth doesn't use access tokens
			},
			teamGoals: [],
			totalGoals: 0,
			goalsAnalytics: {
				summary: { totalGoals: 0, activeGoals: 0, completedGoals: 0, overdueGoals: 0 },
				progress: { averageProgress: 0, onTrackGoals: 0, atRiskGoals: 0, behindGoals: 0 },
				byType: { okr: 0, kpi: 0, milestone: 0, objective: 0 },
				breakdowns: {
					priority: [],
					type: []
				},
				healthScore: 0
			},
			filters: {
				searchTerm: url.searchParams.get('search') || '',
				statusFilter: url.searchParams.get('status') || '',
				typeFilter: '',
				priorityFilter: url.searchParams.get('priority') || ''
			},
			pagination: {
				currentPage: parseInt(url.searchParams.get('page') || '1', 10),
				limit: 20,
				totalPages: 0,
				hasNextPage: false,
				hasPreviousPage: false
			},
			permissions: locals.permissions || [],
			canCreateGoals: false,
			canEditGoals: false,
			canViewAllGoals: false,
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Failed to load goals data. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};
