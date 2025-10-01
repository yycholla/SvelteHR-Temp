// Leave Approvals Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for leave request management

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies, fetch: fetchFn } = event;

	// Authorization is handled by parent layout (+layout.server.ts)
	const parentData = await event.parent();
	const { hasManagerAccess, isAdmin } = parentData;

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			console.warn('Backend not ready for leave requests page');
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
					accessToken: cookies.get('hr_token') || cookies.get('auth-token') || ''
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
					searchTerm: url.searchParams.get('search') || '',
					statusFilter: url.searchParams.get('status') || 'pending',
					leaveTypeFilter: url.searchParams.get('leaveType') || ''
				},
				pagination: {
					page: parseInt(url.searchParams.get('page') || '1', 10),
					limit: parseInt(url.searchParams.get('limit') || '20', 10),
					total: 0,
					totalPages: 0,
					hasNextPage: false,
					hasPreviousPage: false
				},
				permissions: locals.permissions || [],
				canApproveLeave: hasManagerAccess,
				canViewAllLeave: locals.roles?.includes('admin') || false,
				loadedAt: new Date().toISOString(),
				error: {
					message: 'Backend services are initializing. Please try again in a moment.',
					details: 'Backend initialization in progress',
					retryable: true
				}
			};
		}

		// Create GraphQL client with authentication
		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Extract search parameters for filtering and pagination
		const searchTerm = url.searchParams.get('search') || '';
		const statusFilter = url.searchParams.get('status') || 'pending';
		const leaveTypeFilter = url.searchParams.get('leaveType') || '';
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const limit = parseInt(url.searchParams.get('limit') || '20', 10);

		// GraphQL query for leave requests from actual database
		const leaveRequestsQuery = `
			query GetLeaveRequests($first: Int!, $offset: Int!) {
				allLeaveRequests(first: $first, offset: $offset, orderBy: [START_DATE_DESC]) {
					totalCount
					pageInfo {
						hasNextPage
						hasPreviousPage
					}
					nodes {
						id
						employeeId
						managerId
						leaveType
						startDate
						endDate
						daysRequested
						status
						reason
						managerComments
						createdAt
						updatedAt
						userByEmployeeId {
							id
							firstName
							lastName
							email
							departmentId
							departmentByDepartmentId {
								id
								name
							}
						}
						userByManagerId {
							id
							firstName
							lastName
							email
						}
					}
				}
			}
		`;

		const offset = (page - 1) * limit;
		const result = await graphqlClient.query(leaveRequestsQuery, {
			first: limit,
			offset
		});

		// Handle potential GraphQL errors
		if (result.errors && result.errors.length > 0) {
			throw new Error(`GraphQL Error: ${result.errors[0].message}`);
		}

		const leaveRequestsData = result.data?.allLeaveRequests?.nodes || [];
		const totalRequests = result.data?.allLeaveRequests?.totalCount || 0;

		// Transform GraphQL data to expected format
		const leaveRequests = leaveRequestsData.map(request => ({
			id: request.id.toString(),
			nodeId: `node${request.id}`,
			employeeId: request.employeeId,
			managerId: request.managerId,
			leaveType: request.leaveType.toLowerCase(),
			startDate: request.startDate,
			endDate: request.endDate,
			daysRequested: parseInt(request.daysRequested),
			status: request.status.toLowerCase(),
			reason: request.reason,
			managerComments: request.managerComments,
			createdAt: request.createdAt,
			updatedAt: request.updatedAt,
			employee: {
				id: request.userByEmployeeId.id,
				email: request.userByEmployeeId.email,
				displayName: `${request.userByEmployeeId.firstName} ${request.userByEmployeeId.lastName}`,
				departmentId: request.userByEmployeeId.departmentId,
				department: {
					id: request.userByEmployeeId.departmentByDepartmentId?.id || 0,
					name: request.userByEmployeeId.departmentByDepartmentId?.name || 'Unknown'
				}
			},
			manager: request.userByManagerId ? {
				id: request.userByManagerId.id,
				email: request.userByManagerId.email,
				displayName: `${request.userByManagerId.firstName} ${request.userByManagerId.lastName}`
			} : null
		}));

		// Filter based on search and status
		let filteredRequests = leaveRequests;

		if (statusFilter && statusFilter !== 'all') {
			filteredRequests = filteredRequests.filter(req => req.status === statusFilter);
		}

		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filteredRequests = filteredRequests.filter(req =>
				req.employee.displayName.toLowerCase().includes(searchLower) ||
				req.leaveType.toLowerCase().includes(searchLower) ||
				req.reason.toLowerCase().includes(searchLower)
			);
		}

		// Calculate statistics from all data (not just filtered/paginated)
		const pendingCount = leaveRequests.filter(req => req.status === 'pending').length;
		const approvedCount = leaveRequests.filter(req => req.status === 'approved').length;
		const rejectedCount = leaveRequests.filter(req => req.status === 'rejected').length;

		// Calculate total days requested from current page
		const totalDaysRequested = leaveRequests.reduce(
			(sum, request) => sum + request.daysRequested,
			0
		);

		// Calculate approval rate
		const approvalRate = (approvedCount + rejectedCount) > 0
			? Math.round((approvedCount / (approvedCount + rejectedCount)) * 100)
			: 0;

		// Pagination is already handled by GraphQL offset/limit
		const totalPages = Math.ceil(totalRequests / limit);
		const paginatedRequests = filteredRequests;

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
				accessToken: cookies.get('hr_token') || cookies.get('auth-token') || ''
			},
			leaveRequests: paginatedRequests,
			totalRequests,
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
				total: totalRequests,
				totalPages,
				hasNextPage: result.data?.allTimeOffRequests?.pageInfo?.hasNextPage || false,
				hasPreviousPage: page > 1
			},
			permissions: locals.permissions || [],
			canApproveLeave: hasManagerAccess,
			canViewAllLeave: locals.roles?.includes('admin') || false,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading leave requests:', err);

		// Extract search parameters for error response
		const searchTerm = url.searchParams.get('search') || '';
		const statusFilter = url.searchParams.get('status') || 'pending';
		const leaveTypeFilter = url.searchParams.get('leaveType') || '';
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const limit = parseInt(url.searchParams.get('limit') || '20', 10);

		// Instead of throwing an error that crashes the page, return error state
		// This allows the frontend to show retry buttons and proper error handling
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
				accessToken: cookies.get('hr_token') || cookies.get('auth-token') || ''
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
			error: {
				message: 'Unable to load leave requests. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};
