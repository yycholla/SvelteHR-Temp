// Server-side data loading for leave approvals management page
// T038: Fix leave management pages with standardized error handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { createLeaveManagementOperations } from '$lib/graphql/leave-management-operations';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check leave approval permissions
	PermissionChecks.leaveApproval(event);

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
	const statusFilter = url.searchParams.get('status') || 'pending';
	const leaveTypeFilter = url.searchParams.get('leaveType') || '';
	const dateFromFilter = url.searchParams.get('dateFrom') || '';
	const dateToFilter = url.searchParams.get('dateTo') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for leave requests data
	const dataRequest = createDataRequest({
		operationName: 'GetLeaveRequests',
		variables: {
			searchTerm,
			statusFilter,
			leaveTypeFilter,
			dateFromFilter,
			dateToFilter,
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

		// Create leave management operations instance
		const leaveOps = createLeaveManagementOperations(null); // We'll pass the GraphQL client reference

		// Load leave requests data using standardized operations
		// For managers, filter by their department; admins see all
		const leaveRequestsData = await leaveOps.getPendingLeaveRequests({
			filter: {
				managerId: isAdmin ? undefined : userSession.userId, // Admins see all, managers see their team
				departmentId: managedDepartmentId || undefined, // Filter by department for managers
				status: statusFilter,
				searchTerm,
				leaveType: leaveTypeFilter || undefined,
				dateFrom: dateFromFilter || undefined,
				dateTo: dateToFilter || undefined
			},
			pagination: {
				page,
				limit
			},
			userCredentials: {
				userId: userSession.userId,
				userEmail: userSession.metadata.userEmail,
				role: userSession.roles[0] || 'employee',
				accessToken: userSession.jwtToken
			}
		});

		// Load leave statistics for dashboard
		const leaveStatsData = await leaveOps.getLeaveStatistics({
			managerId: userSession.userId,
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
			leaveRequests: leaveRequestsData.requests || [],
			totalRequests: leaveRequestsData.totalCount || 0,
			leaveStats: leaveStatsData.stats || {
				pendingCount: 0,
				approvedCount: 0,
				rejectedCount: 0,
				totalDaysRequested: 0,
				averageRequestDays: 0,
				approvalRate: 0
			},
			filters: {
				searchTerm,
				statusFilter,
				leaveTypeFilter,
				dateFromFilter,
				dateToFilter,
				page,
				limit
			},
			// Team/Department context for managers
			managedDepartmentId,
			isAdmin,
			// T019: Permission flags aligned with component expectations
			canApproveLeave: userPermissions.canManageLeave, // Alias for component compatibility
			canViewAllLeave: isAdmin, // Admins can view all departments
			canApproveManagedTeamRequests: !!managedDepartmentId, // T019 required flag name
			canApproveManagedTeam: !!managedDepartmentId, // Legacy compatibility
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Leave Management Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Leave management load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage:
					'Unable to load leave management data. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Leave Management Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			searchTerm,
			statusFilter,
			leaveTypeFilter,
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Leave management temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
