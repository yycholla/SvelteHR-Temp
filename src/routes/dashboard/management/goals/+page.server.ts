// Server-side data loading for goals and OKRs management page
// T040: Fix goals/OKRs management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createGoalsOKROperations, getGoalsAnalytics } from '$lib/graphql/goals-okrs-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check goals management permissions
	PermissionChecks.goalsRead(event);

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: cookies.get('hr_token') || '',
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	// Extract search parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const typeFilter = url.searchParams.get('type') || '';
	const priorityFilter = url.searchParams.get('priority') || '';
	const quarterFilter = url.searchParams.get('quarter') || 'Q4';
	const yearFilter = parseInt(url.searchParams.get('year') || '2024', 10);
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for goals data
	const dataRequest = createDataRequest({
		operationName: 'GetTeamGoals',
		variables: {
			searchTerm,
			statusFilter,
			typeFilter,
			priorityFilter,
			quarterFilter,
			yearFilter,
			page,
			limit,
			teamId: userSession.userId
		},
		userCredentials: {
			userId: userSession.userId,
			userEmail: userSession.userEmail,
			role: userSession.role,
			accessToken: userSession.accessToken
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// Fetch user's managed department for managers (admins see all)
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		let managedDepartmentId: string | null = null;
		let isAdmin = locals.roles?.includes('admin') || userSession.role === 'admin';

		// For managers, get their managed department
		if (!isAdmin && (locals.roles?.includes('manager') || userSession.role === 'manager')) {
			const deptResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						query GetManagerDepartment($userId: UUID!) {
							userById(id: $userId) {
								id
								departmentByDepartmentId {
									id
									name
									managerId
								}
							}
						}
					`,
					variables: { userId: userSession.userId }
				})
			});

			const deptData = await deptResponse.json();
			const userDept = deptData?.data?.userById?.departmentByDepartmentId;

			// Only set managedDepartmentId if user is actually the manager of their department
			if (userDept && userDept.managerId === userSession.userId) {
				managedDepartmentId = userDept.id;
			}
		}

		// Create goals and OKRs operations instance
		const goalsOps = createGoalsOKROperations(null); // We'll pass the GraphQL client reference

		// Load team goals data using standardized operations
		// For managers, filter by their department; admins see all
		// Determine which department to filter by
		let filterDepartmentId: string | undefined = undefined;
		if (!isAdmin && managedDepartmentId) {
			filterDepartmentId = managedDepartmentId;
		}

		const goalsData = await goalsOps.getTeamGoals({
			first: limit,
			offset: (page - 1) * limit,
			filter: {
				status: statusFilter || undefined,
				goalType: typeFilter || undefined,
				priority: priorityFilter || undefined,
				searchTerm: searchTerm || undefined,
				quarter: quarterFilter || undefined,
				departmentId: filterDepartmentId,
				year: yearFilter || undefined
			},
			orderBy: ['CREATED_AT_DESC'],
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.metadata.userEmail,
				role: userSession.roles[0] || 'employee',
				accessToken: userSession.jwtToken
			}
		});

		// Load goals analytics for dashboard insights
		const analyticsData = await getGoalsAnalytics({
			teamId: userSession.userId,
			quarter: quarterFilter,
			year: yearFilter,
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.metadata.userEmail,
				role: userSession.roles[0] || 'employee',
				accessToken: userSession.jwtToken
			}
		});

		// Return server-side loaded data
		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			userSession,
			teamGoals: goalsData.nodes || [],
			totalGoals: goalsData.totalCount || 0,
			goalsAnalytics: analyticsData || {
				summary: {
					totalGoals: 0,
					activeGoals: 0,
					completedGoals: 0,
					overdueGoals: 0,
					atRiskGoals: 0,
					avgCompletion: 0,
					completionRate: 0
				},
				breakdowns: {
					priority: [],
					type: []
				},
				healthScore: 0
			},
			filters: {
				searchTerm,
				statusFilter,
				typeFilter,
				priorityFilter,
				quarterFilter,
				yearFilter,
				page,
				limit
			},
			// Team/Department context for managers
			managedDepartmentId,
			isAdmin,
			canEditAllGoals: isAdmin, // Only admins can edit goals from any department
			canEditManagedTeamGoals: !!managedDepartmentId, // Managers can edit for their department
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Goals Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Goals load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load goals and OKRs data. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Goals Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			statusFilter,
			typeFilter,
			priorityFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Goals and OKRs temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
