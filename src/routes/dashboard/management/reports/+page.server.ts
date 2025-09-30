// Server-side data loading for reports management page
// T042: Fix reports management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createReportsOperations, getReportAnalytics } from '$lib/graphql/reports-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check reports management permissions
	PermissionChecks.reportsRead(event);

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
	const typeFilter = url.searchParams.get('type') || '';
	const categoryFilter = url.searchParams.get('category') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const departmentFilter = url.searchParams.get('department') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for reports data
	const dataRequest = createDataRequest({
		operationName: 'GetReportsData',
		variables: {
			searchTerm,
			typeFilter,
			categoryFilter,
			statusFilter,
			departmentFilter,
			page,
			limit
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

		// Create reports operations instance
		const reportsOps = createReportsOperations(null); // We'll pass the GraphQL client reference

		// Load reports data using standardized operations
		// For managers, filter by their department; admins see all
		// Determine which department to filter by
		let filterDepartment: string | undefined = undefined;
		if (departmentFilter) {
			filterDepartment = departmentFilter;
		} else if (!isAdmin && managedDepartmentId) {
			filterDepartment = managedDepartmentId;
		}

		const reportsData = await reportsOps.getHRReports({
			first: limit,
			offset: (page - 1) * limit,
			filter: {
				reportType: typeFilter || undefined,
				category: categoryFilter || undefined,
				status: statusFilter || undefined,
				department: filterDepartment,
				searchTerm: searchTerm || undefined
			},
			orderBy: ['CREATED_AT_DESC'],
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.metadata.userEmail,
				role: userSession.roles[0] || 'employee',
				accessToken: userSession.jwtToken
			}
		});

		// Load reports analytics for dashboard insights
		const analyticsData = await getReportAnalytics({
			department: departmentFilter || undefined,
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
			reports: reportsData.nodes || [],
			totalReports: reportsData.totalCount || 0,
			reportAnalytics: analyticsData || {
				summary: {
					totalReports: 0,
					activeReports: 0,
					scheduledReports: 0,
					generatedToday: 0,
					generatedThisWeek: 0,
					generatedThisMonth: 0,
					mostPopularType: 'employee',
					avgRunTime: 0
				},
				typeBreakdown: [],
				categoryBreakdown: [],
				departmentUsage: [],
				runHistory: [],
				popularReports: [],
				performanceMetrics: {
					fastestReport: 'N/A',
					slowestReport: 'N/A',
					avgExecutionTime: 0,
					totalExecutionTime: 0,
					successRate: 0,
					errorRate: 0
				}
			},
			filters: {
				searchTerm,
				typeFilter,
				categoryFilter,
				statusFilter,
				departmentFilter,
				page,
				limit
			},
			// Team/Department context for managers
			managedDepartmentId,
			isAdmin,
			canGenerateAllReports: isAdmin, // Only admins can generate reports for any department
			canGenerateManagedTeamReports: !!managedDepartmentId, // Managers can generate for their department
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Reports Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Reports load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load reports data. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Reports Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			typeFilter,
			categoryFilter,
			statusFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Reports temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
