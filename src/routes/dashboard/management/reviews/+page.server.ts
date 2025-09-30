// Server-side data loading for performance reviews management page
// T039: Fix performance management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createPerformanceOperations } from '$lib/graphql/performance-management-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check performance management permissions
	PermissionChecks.performanceRead(event);

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
	const reviewerFilter = url.searchParams.get('reviewer') || '';
	const periodFilter = url.searchParams.get('period') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for performance reviews data
	const dataRequest = createDataRequest({
		operationName: 'GetPerformanceReviews',
		variables: {
			searchTerm,
			statusFilter,
			reviewerFilter,
			periodFilter,
			departmentFilter,
			page,
			limit,
			managerId: userSession.userId
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

		// Create performance management operations instance
		const performanceOps = createPerformanceOperations(null); // We'll pass the GraphQL client reference

		// Load performance reviews data using standardized operations
		// For managers, filter by their department; admins see all departments
		// Determine which department to filter by
		let filterDepartmentId: string | undefined = undefined;
		if (departmentFilter) {
			filterDepartmentId = departmentFilter;
		} else if (!isAdmin && managedDepartmentId) {
			filterDepartmentId = managedDepartmentId;
		}

		const reviewsData = await performanceOps.getPerformanceReviews({
			first: limit,
			offset: (page - 1) * limit,
			filter: {
				status: statusFilter || undefined,
				reviewer: reviewerFilter || undefined,
				departmentId: filterDepartmentId,
				searchTerm: searchTerm || undefined,
				reviewPeriod: periodFilter || undefined
			},
			orderBy: ['CREATED_AT_DESC'],
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.metadata.userEmail,
				role: userSession.roles[0] || 'employee',
				accessToken: userSession.jwtToken
			}
		});

		// Load performance statistics for dashboard
		const statisticsData = await performanceOps.getPerformanceStatistics({
			managerId: userSession.userId,
			departmentId: departmentFilter || undefined,
			period: periodFilter || undefined,
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.metadata.userEmail,
				role: userSession.roles[0] || 'employee',
				accessToken: userSession.jwtToken
			}
		});

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			user: userPermissions.user,
			userSession,
			performanceReviews: reviewsData.nodes || [],
			totalReviews: reviewsData.totalCount || 0,
			reviewAnalytics: statisticsData || {
				totalReviews: 0,
				completedReviews: 0,
				overdueReviews: 0,
				completionRate: 0,
				averageRatings: {
					overall: 0,
					goalsAchievement: 0,
					collaboration: 0,
					communication: 0,
					leadership: 0
				},
				ratingDistribution: [],
				trends: {
					improvementAreas: [],
					strongAreas: []
				}
			},
			filters: {
				searchTerm,
				statusFilter,
				reviewerFilter,
				periodFilter,
				departmentFilter,
				page,
				limit
			},
			// Team/Department context for managers
			managedDepartmentId,
			isAdmin,
			canEditAllReviews: isAdmin, // Only admins can edit reviews from any department
			canEditManagedTeamReviews: !!managedDepartmentId, // Managers can edit for their department
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Performance Reviews Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Performance reviews load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load performance reviews data. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Performance Reviews Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			statusFilter,
			reviewerFilter,
			periodFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Performance reviews temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
