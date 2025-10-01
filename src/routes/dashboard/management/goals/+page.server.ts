// Goals & OKRs Management Page - Server-Side Data Loading with GraphQL
// Feature: 016-repair-management-pages - GraphQL integration

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';
import {
	GET_EMPLOYEE_GOALS,
	GET_GOAL_STATISTICS,
	buildEmployeeGoalFilter,
	calculateGoalStatistics
} from '$lib/graphql/goals-okrs-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role
	const hasManagerAccess = locals.roles?.includes('admin') || locals.roles?.includes('manager');
	if (!hasManagerAccess) {
		throw error(403, 'Manager or Admin role required');
	}

	// Get JWT token from cookies for PostGraphile authentication
	const jwtToken = cookies.get('postgraphile-jwt-token') || cookies.get('hr_token') || '';

	// Create server-side GraphQL client with auth token
	const graphqlClient = createUrqlClient(fetch, jwtToken);

	// Extract search parameters for filtering
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const priorityFilter = url.searchParams.get('priority') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = 20;
	const offset = (page - 1) * limit;

	try {
		// Build GraphQL filter from URL parameters
		const filter = buildEmployeeGoalFilter({
			status: statusFilter ? (statusFilter as any) : undefined,
			priority: priorityFilter ? (priorityFilter as any) : undefined,
			employeeName: searchTerm || undefined,
			departmentId: locals.user.department_id || undefined
		});

		// Fetch employee goals with pagination
		const goalsResult = await graphqlClient
			.query(GET_EMPLOYEE_GOALS, {
				first: limit,
				offset,
				filter,
				orderBy: ['TARGET_DATE_ASC']
			})
			.toPromise();

		if (goalsResult.error) {
			console.error('GraphQL Error fetching goals:', goalsResult.error);
			throw error(500, 'Failed to load goals data');
		}

		// Fetch goal statistics for analytics
		const statsResult = await graphqlClient
			.query(GET_GOAL_STATISTICS, {
				departmentId: locals.user.department_id || ''
			})
			.toPromise();

		if (statsResult.error) {
			console.error('GraphQL Error fetching statistics:', statsResult.error);
			// Don't fail the page load if stats fail, just use zeros
		}

		// Extract goals data
		const goals = goalsResult.data?.employeeGoals?.nodes || [];
		const totalGoals = goalsResult.data?.employeeGoals?.totalCount || 0;

		// Calculate analytics from statistics query
		const analytics = statsResult.data
			? calculateGoalStatistics(statsResult.data)
			: {
					totalGoals: 0,
					activeGoals: 0,
					completedGoals: 0,
					overdueGoals: 0,
					highPriorityGoals: 0,
					averageProgress: 0,
					completionRate: 0
			  };

		// Calculate additional metrics
		const onTrackGoals = goals.filter((g: any) => g.progress >= 50 && g.status === 'in_progress')
			.length;
		const atRiskGoals = goals.filter((g: any) => g.progress < 50 && g.status === 'in_progress')
			.length;
		const behindGoals = analytics.overdueGoals;

		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: locals.user.role || 'employee'
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: locals.user.role || 'employee',
				accessToken: jwtToken
			},
			teamGoals: goals,
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
				byType: {
					okr: 0, // Can be calculated if we add a 'type' field to goals
					kpi: 0,
					milestone: 0,
					objective: 0
				}
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
				hasNextPage: goalsResult.data?.employeeGoals?.pageInfo?.hasNextPage || false,
				hasPreviousPage: page > 1
			},
			permissions: locals.permissions || [],
			canCreateGoals: hasManagerAccess,
			canEditGoals: hasManagerAccess,
			canViewAllGoals: locals.roles?.includes('admin') || false,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading goals data:', err);
		throw error(500, 'Failed to load goals data. Please try again later.');
	}
};
