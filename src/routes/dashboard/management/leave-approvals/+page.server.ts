// Leave Approvals Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for leave request management

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
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
			const emptyMetrics = {
				total: 0,
				pending: 0,
				approved: 0,
				rejected: 0,
				approvalRate: 0,
				totalDaysRequested: 0
			};

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
					approvalRate: 0,
					weekly: emptyMetrics,
					monthly: emptyMetrics,
					quarterly: emptyMetrics,
					yearly: emptyMetrics
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
			query GetLeaveRequests($first: Int!, $offset: Int!, $condition: LeaveRequestCondition) {
				allLeaveRequests(first: $first, offset: $offset, condition: $condition, orderBy: [START_DATE_DESC]) {
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
		// Build condition object for filtering at database level
		const condition: any = {};
		if (statusFilter && statusFilter !== 'all') {
			condition.status = statusFilter.toUpperCase();
		}

		const result = await graphqlClient.query(leaveRequestsQuery, {
			first: limit,
			offset,
			condition: Object.keys(condition).length > 0 ? condition : null
		});

		// Handle potential GraphQL errors
		if (result.errors && result.errors.length > 0) {
			throw new Error(`GraphQL Error: ${result.errors[0].message}`);
		}

		const leaveRequestsData = result.data?.allLeaveRequests?.nodes || [];
		const totalRequests = result.data?.allLeaveRequests?.totalCount || 0;

		// Transform GraphQL data to expected format
		const leaveRequests = leaveRequestsData
			.filter(request => request.userByEmployeeId) // Only include requests with valid employee data
			.map(request => ({
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

		// Filter based on search term (status filtering is done at database level)
		let filteredRequests = leaveRequests;

		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filteredRequests = filteredRequests.filter(req =>
				req.employee.displayName.toLowerCase().includes(searchLower) ||
				req.leaveType.toLowerCase().includes(searchLower) ||
				req.reason.toLowerCase().includes(searchLower)
			);
		}

		// Query for all-time statistics (not paginated)
		const statsQuery = `
			query GetLeaveStatistics {
				allLeaveRequests {
					totalCount
				}
				pendingRequests: allLeaveRequests(condition: { status: PENDING }) {
					totalCount
				}
				approvedRequests: allLeaveRequests(condition: { status: APPROVED }) {
					totalCount
				}
				rejectedRequests: allLeaveRequests(condition: { status: REJECTED }) {
					totalCount
				}
			}
		`;

		const statsResult = await graphqlClient.query(statsQuery);

		// Calculate date ranges for time-based metrics
		const now = new Date();
		const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
		const quarterStart = new Date(now.getFullYear(), quarterMonth, 1);
		const yearStart = new Date(now.getFullYear(), 0, 1);

		// Calculate statistics from all data
		const allTimePending = statsResult.data?.pendingRequests?.totalCount || 0;
		const allTimeApproved = statsResult.data?.approvedRequests?.totalCount || 0;
		const allTimeRejected = statsResult.data?.rejectedRequests?.totalCount || 0;
		const allTimeTotal = statsResult.data?.allLeaveRequests?.totalCount || 0;

		// Calculate total days requested from current page
		const totalDaysRequested = leaveRequests.reduce(
			(sum, request) => sum + request.daysRequested,
			0
		);

		// Calculate approval rate (all-time)
		const approvalRate = (allTimeApproved + allTimeRejected) > 0
			? Math.round((allTimeApproved / (allTimeApproved + allTimeRejected)) * 100)
			: 0;

		// Calculate time-based metrics from fetched requests
		const calculateTimePeriodMetrics = (requests: typeof leaveRequests, startDate: Date) => {
			const periodRequests = requests.filter(req => new Date(req.createdAt) >= startDate);
			const approved = periodRequests.filter(req => req.status === 'approved').length;
			const rejected = periodRequests.filter(req => req.status === 'rejected').length;
			const pending = periodRequests.filter(req => req.status === 'pending').length;
			const total = periodRequests.length;
			const daysRequested = periodRequests.reduce((sum, req) => sum + req.daysRequested, 0);
			const rate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

			return {
				total,
				pending,
				approved,
				rejected,
				approvalRate: rate,
				totalDaysRequested: daysRequested
			};
		};

		const weeklyMetrics = calculateTimePeriodMetrics(leaveRequests, weekStart);
		const monthlyMetrics = calculateTimePeriodMetrics(leaveRequests, monthStart);
		const quarterlyMetrics = calculateTimePeriodMetrics(leaveRequests, quarterStart);
		const yearlyMetrics = calculateTimePeriodMetrics(leaveRequests, yearStart);

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
				// All-time statistics
				pendingCount: allTimePending,
				approvedCount: allTimeApproved,
				rejectedCount: allTimeRejected,
				totalDaysRequested: Math.round(totalDaysRequested),
				approvalRate: isNaN(approvalRate) ? 0 : approvalRate,

				// Time-based metrics
				weekly: weeklyMetrics,
				monthly: monthlyMetrics,
				quarterly: quarterlyMetrics,
				yearly: yearlyMetrics
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
				hasNextPage: result.data?.allLeaveRequests?.pageInfo?.hasNextPage || false,
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

		const emptyMetrics = {
			total: 0,
			pending: 0,
			approved: 0,
			rejected: 0,
			approvalRate: 0,
			totalDaysRequested: 0
		};

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
				approvalRate: 0,
				weekly: emptyMetrics,
				monthly: emptyMetrics,
				quarterly: emptyMetrics,
				yearly: emptyMetrics
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

export const actions: Actions = {
	approve: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const leaveRequestId = formData.get('id') as string;
		const managerComments = formData.get('comments') as string;

		if (!locals.user?.id) {
			return fail(401, { message: 'Unauthorized' });
		}

		const graphqlClient = GraphQLClient.fromCookies(cookies);

		const mutation = `
			mutation UpdateLeaveRequest($id: UUID!, $status: LeaveStatus!, $comments: String, $managerId: UUID!) {
				updateLeaveRequestById(
					input: {
						id: $id
						leaveRequestPatch: {
							status: $status
							managerComments: $comments
							managerId: $managerId
						}
					}
				) {
					leaveRequest {
						id
						status
						managerComments
					}
				}
			}
		`;

		try {
			const result = await graphqlClient.query(mutation, {
				id: leaveRequestId,
				status: 'APPROVED',
				comments: managerComments || 'Approved',
				managerId: locals.user.id
			});

			if (result.errors) {
				console.error('GraphQL errors:', result.errors);
				return fail(500, { message: 'Failed to approve leave request' });
			}

			return { success: true, message: 'Leave request approved successfully' };
		} catch (err) {
			console.error('Error approving leave request:', err);
			return fail(500, { message: 'Failed to approve leave request' });
		}
	},

	deny: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const leaveRequestId = formData.get('id') as string;
		const managerComments = formData.get('comments') as string;

		console.log('[Server] Deny action called for:', leaveRequestId, 'with comments:', managerComments);

		if (!locals.user?.id) {
			console.error('[Server] Deny failed: No user ID');
			return fail(401, { message: 'Unauthorized' });
		}

		if (!managerComments || managerComments.trim() === '') {
			console.error('[Server] Deny failed: No comments provided');
			return fail(400, { message: 'Reason for denial is required' });
		}

		const graphqlClient = GraphQLClient.fromCookies(cookies);

		const mutation = `
			mutation UpdateLeaveRequest($id: UUID!, $status: LeaveStatus!, $comments: String!, $managerId: UUID!) {
				updateLeaveRequestById(
					input: {
						id: $id
						leaveRequestPatch: {
							status: $status
							managerComments: $comments
							managerId: $managerId
						}
					}
				) {
					leaveRequest {
						id
						status
						managerComments
					}
				}
			}
		`;

		try {
			console.log('[Server] Executing deny mutation for:', leaveRequestId);
			const result = await graphqlClient.query(mutation, {
				id: leaveRequestId,
				status: 'REJECTED',
				comments: managerComments,
				managerId: locals.user.id
			});

			if (result.errors) {
				console.error('[Server] GraphQL errors:', result.errors);
				return fail(500, { message: 'Failed to deny leave request' });
			}

			console.log('[Server] Deny successful for:', leaveRequestId);
			return { success: true, message: 'Leave request denied' };
		} catch (err) {
			console.error('[Server] Error denying leave request:', err);
			return fail(500, { message: 'Failed to deny leave request' });
		}
	},

	revertToPending: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const leaveRequestId = formData.get('id') as string;
		const managerComments = formData.get('comments') as string;

		console.log('[Server] Revert to pending action called for:', leaveRequestId);

		if (!locals.user?.id) {
			console.error('[Server] Revert failed: No user ID');
			return fail(401, { message: 'Unauthorized' });
		}

		const graphqlClient = GraphQLClient.fromCookies(cookies);

		const mutation = `
			mutation UpdateLeaveRequest($id: UUID!, $status: LeaveStatus!, $comments: String, $managerId: UUID!) {
				updateLeaveRequestById(
					input: {
						id: $id
						leaveRequestPatch: {
							status: $status
							managerComments: $comments
							managerId: $managerId
						}
					}
				) {
					leaveRequest {
						id
						status
						managerComments
					}
				}
			}
		`;

		try {
			console.log('[Server] Executing revert mutation for:', leaveRequestId);
			const result = await graphqlClient.query(mutation, {
				id: leaveRequestId,
				status: 'PENDING',
				comments: managerComments || 'Reverted to pending for reconsideration',
				managerId: locals.user.id
			});

			if (result.errors) {
				console.error('[Server] GraphQL errors:', result.errors);
				return fail(500, { message: 'Failed to revert leave request' });
			}

			console.log('[Server] Revert successful for:', leaveRequestId);
			return { success: true, message: 'Leave request reverted to pending' };
		} catch (err) {
			console.error('[Server] Error reverting leave request:', err);
			return fail(500, { message: 'Failed to revert leave request' });
		}
	}
};
