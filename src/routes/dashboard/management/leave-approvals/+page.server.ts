// Leave Approvals Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for leave request management

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createUrqlClient, executeQuery } from '$lib/graphql/client';
import {
	GET_LEAVE_REQUESTS,
	GET_LEAVE_REQUEST_STATS,
	type GetLeaveRequestsVariables,
	type GetLeaveRequestStatsVariables,
	type LeaveRequestsResponse,
	type LeaveRequestStatsResponse,
	toPostGraphileStatus,
	fromPostGraphileStatus
} from '$lib/graphql/queries/leave-requests';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies, fetch: fetchFn } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Check if user has manager or admin role for leave approvals
	const hasManagerAccess = locals.roles?.includes('admin') || locals.roles?.includes('manager');
	if (!hasManagerAccess) {
		throw error(403, 'Manager or Admin role required');
	}

	// Get JWT token for PostGraphile authentication
	const jwtToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!jwtToken) {
		throw error(401, 'Authentication token required');
	}

	// Create GraphQL client with server-side fetch and auth token
	const graphqlClient = createUrqlClient(fetchFn, jwtToken);

	// Extract search parameters for filtering and pagination
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || 'pending';
	const leaveTypeFilter = url.searchParams.get('leaveType') || '';
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = (page - 1) * limit;

	// Build condition object for PostGraphile query
	const condition: any = {};

	// Filter by manager ID (show only requests for this manager's team)
	// Admins can see all requests
	if (!locals.roles?.includes('admin')) {
		condition.managerId = locals.user.id;
	}

	// Filter by status (convert to uppercase for PostGraphile)
	if (statusFilter && statusFilter !== 'all') {
		condition.status = toPostGraphileStatus(statusFilter);
	}

	// Filter by leave type
	if (leaveTypeFilter) {
		condition.leaveType = leaveTypeFilter;
	}

	try {
		// Query 1: Get leave requests with pagination and filtering
		const leaveRequestsVariables: GetLeaveRequestsVariables = {
			first: limit,
			offset: offset,
			orderBy: ['CREATED_AT_DESC'], // Most recent first
			condition: condition
		};

		const leaveRequestsData = await executeQuery<LeaveRequestsResponse>(
			graphqlClient,
			GET_LEAVE_REQUESTS,
			leaveRequestsVariables
		);

		// Query 2: Get leave request statistics for the manager
		const statsVariables: GetLeaveRequestStatsVariables = {
			managerId: locals.roles?.includes('admin') ? undefined : locals.user.id
		};

		const statsData = await executeQuery<LeaveRequestStatsResponse>(
			graphqlClient,
			GET_LEAVE_REQUEST_STATS,
			statsVariables
		);

		// Process leave requests data (convert status from uppercase to lowercase for UI)
		const leaveRequests = leaveRequestsData.allLeaveRequests.nodes.map((request) => ({
			id: request.id,
			nodeId: request.nodeId,
			employeeId: request.employeeId,
			managerId: request.managerId,
			leaveType: request.leaveType,
			startDate: request.startDate,
			endDate: request.endDate,
			daysRequested: request.daysRequested,
			status: fromPostGraphileStatus(request.status), // Convert to lowercase for UI
			reason: request.reason,
			managerComments: request.managerComments,
			createdAt: request.createdAt,
			updatedAt: request.updatedAt,
			employee: request.userByEmployeeId
				? {
						id: request.userByEmployeeId.id,
						email: request.userByEmployeeId.email,
						displayName: request.userByEmployeeId.displayName,
						departmentId: request.userByEmployeeId.departmentId,
						department: request.userByEmployeeId.departmentByDepartmentId
							? {
									id: request.userByEmployeeId.departmentByDepartmentId.id,
									name: request.userByEmployeeId.departmentByDepartmentId.name
								}
							: null
					}
				: null,
			manager: request.userByManagerId
				? {
						id: request.userByManagerId.id,
						email: request.userByManagerId.email,
						displayName: request.userByManagerId.displayName
					}
				: null
		}));

		// Client-side search filtering (PostGraphile doesn't support text search natively)
		let filteredRequests = leaveRequests;
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filteredRequests = leaveRequests.filter(
				(request) =>
					request.employee?.displayName?.toLowerCase().includes(searchLower) ||
					request.leaveType.toLowerCase().includes(searchLower) ||
					request.reason?.toLowerCase().includes(searchLower)
			);
		}

		// Calculate statistics
		const pendingCount = statsData.pending.totalCount;
		const approvedCount = statsData.approved.totalCount;
		const rejectedCount = statsData.rejected.totalCount;
		const totalCount = statsData.allRequests.totalCount;

		// Calculate total days requested across all requests
		const totalDaysRequested = statsData.allRequests.nodes.reduce(
			(sum, node) => sum + (node.daysRequested || 0),
			0
		);

		// Calculate approval rate
		const approvalRate =
			totalCount > 0 ? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100) : 0;

		// Pagination info
		const totalPages = Math.ceil(leaveRequestsData.allLeaveRequests.totalCount / limit);

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
			leaveRequests: filteredRequests,
			totalRequests: leaveRequestsData.allLeaveRequests.totalCount,
			leaveStats: {
				pendingCount,
				approvedCount,
				rejectedCount,
				totalDaysRequested: Math.round(totalDaysRequested),
				approvalRate: isNaN(approvalRate) ? 0 : approvalRate
			},
			filters: {
				searchTerm,
				statusFilter,
				leaveTypeFilter
			},
			pagination: {
				page,
				limit,
				total: leaveRequestsData.allLeaveRequests.totalCount,
				totalPages,
				hasNextPage: leaveRequestsData.allLeaveRequests.pageInfo.hasNextPage,
				hasPreviousPage: leaveRequestsData.allLeaveRequests.pageInfo.hasPreviousPage
			},
			permissions: locals.permissions || [],
			canApproveLeave: hasManagerAccess,
			canViewAllLeave: locals.roles?.includes('admin') || false,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading leave requests:', err);

		// Return empty data structure with error information
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
			leaveRequests: [],
			totalRequests: 0,
			leaveStats: {
				pendingCount: 0,
				approvedCount: 0,
				rejectedCount: 0,
				totalDaysRequested: 0,
				approvalRate: 0
			},
			filters: {
				searchTerm,
				statusFilter,
				leaveTypeFilter
			},
			pagination: {
				page,
				limit,
				total: 0,
				totalPages: 0,
				hasNextPage: false,
				hasPreviousPage: false
			},
			permissions: locals.permissions || [],
			canApproveLeave: hasManagerAccess,
			canViewAllLeave: locals.roles?.includes('admin') || false,
			loadedAt: new Date().toISOString(),
			error: `Failed to load leave requests: ${err instanceof Error ? err.message : 'Unknown error'}`
		};
	}
};
