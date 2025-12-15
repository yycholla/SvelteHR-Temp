// Management Goals - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { ensureBackendReady } from '$lib/server/backend-init';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor, ClientSideFilter } from '$lib/server/route-helpers';
import { StatisticsCalculator, Aggregators } from '$lib/server/analytics';
import { gql } from '@urql/svelte';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, [
		'goals:read',
		'goals:read:self',
		'goals:read:team',
		'goals:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { locals, url } = event;
		const userPerms = loader['permissions']; // Access computed permissions
		const hasManagerAccess = userPerms.canViewManagement;

		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);
		const searchTerm = params.getString('search');
		const statusFilter = params.getString('status');
		const priorityFilter = params.getString('priority');

		// Default empty structure for error cases
		const getEmptyState = (errorMsg?: string, errorDetails?: string) => {
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
					accessToken: ''
				},
				teamGoals: [],
				totalGoals: 0,
				goalsAnalytics: {
					summary: { totalGoals: 0, activeGoals: 0, completedGoals: 0, overdueGoals: 0 },
					progress: { averageProgress: 0, onTrackGoals: 0, atRiskGoals: 0, behindGoals: 0 },
					byType: { okr: 0, kpi: 0, milestone: 0, objective: 0 },
					breakdowns: { priority: [], type: [] },
					healthScore: 0
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
					totalPages: 0,
					hasNextPage: false,
					hasPreviousPage: false
				},
				permissions: locals.permissions || [],
				canCreateGoals: hasManagerAccess,
				canEditGoals: hasManagerAccess,
				canViewAllGoals: locals.roles?.includes('admin') || false,
				loadedAt: new Date().toISOString(),
				error: errorMsg
					? {
							message: errorMsg,
							details: errorDetails || 'Unknown error',
							retryable: true
						}
					: undefined
			};
		};

		try {
			// Ensure backend is ready before proceeding
			const backendReady = await ensureBackendReady();
			if (!backendReady) {
				return getEmptyState(
					'Backend services are initializing. Please try again in a moment.',
					'Backend initialization in progress'
				);
			}

			// Load actual goals from database using Rust GraphQL server
			const GET_GOALS = gql`
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
				}
			`;

			const result = await client.query(GET_GOALS, {
				limit: 1000, // Fetch large dataset for client-side filtering/stats
				offset: 0
			});

			const goals = result?.employeeGoals || [];

			// Transform goals data
			const transformedGoals = goals.map((goal: any) => ({
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

			// Use ClientSideFilter
			const filter = new ClientSideFilter(transformedGoals);

			if (searchTerm) {
				filter.search(searchTerm, ['title', 'description']);
			}

			if (statusFilter) {
				filter.where('status', statusFilter);
			}

			// Apply filtering
			const filteredGoals = filter.get();
			const totalGoals = filteredGoals.length;

			// Pagination
			const paginatedGoals = filter.paginate(page, limit).get();

			// Calculate analytics using Aggregators and StatisticsCalculator
			// Use FULL filtered list for analytics to be accurate for current view context?
			// Or full unfiltered list? Previous implementation used 'goals' (fetched result).
			// Let's use 'transformedGoals' (full fetch) for analytics consistency.
			const analyticsList = transformedGoals;

			const calc = new StatisticsCalculator(analyticsList);
			const activeGoals = calc.count((g: any) => g.status === 'in_progress');
			const completedGoals = calc.count((g: any) => g.status === 'completed');
			const overdueGoals = calc.count(
				(g: any) => new Date(g.targetDate) < new Date() && g.status !== 'completed'
			);

			const averageProgress =
				analyticsList.length > 0
					? Math.round(Aggregators.average(analyticsList, 'progressPercentage'))
					: 0;

			// Additional metrics
			const onTrackGoals = calc.count(
				(g: any) => (g.progressPercentage || 0) >= 50 && g.status === 'in_progress'
			);
			const atRiskGoals = calc.count(
				(g: any) => (g.progressPercentage || 0) < 50 && g.status === 'in_progress'
			);

			// Health score
			const healthScore =
				analyticsList.length > 0
					? Math.round(((completedGoals + onTrackGoals) / analyticsList.length) * 100)
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
					accessToken: ''
				},
				teamGoals: paginatedGoals,
				totalGoals,
				goalsAnalytics: {
					summary: {
						totalGoals: analyticsList.length,
						activeGoals,
						completedGoals,
						overdueGoals
					},
					progress: {
						averageProgress,
						onTrackGoals,
						atRiskGoals,
						behindGoals: overdueGoals
					},
					byType: { okr: 0, kpi: 0, milestone: 0, objective: 0 },
					breakdowns: {
						priority: [],
						type: []
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
			logger.error('Error loading management goals data:', err as Error);
			return getEmptyState(
				'Failed to load goals data. Please try again later.',
				err instanceof Error ? err.message : 'Unknown error'
			);
		}
	});
};
