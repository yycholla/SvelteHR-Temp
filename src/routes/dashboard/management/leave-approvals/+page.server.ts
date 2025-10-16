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
					accessToken: '' // Session-based auth doesn't use access tokens
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

		// GraphQL query for leave requests using Rust GraphQL server schema
		const leaveRequestsQuery = `
			query GetLeaveRequests($startDate: String!, $endDate: String!, $limit: Int!) {
				leaveRequestsByDateRange(startDate: $startDate, endDate: $endDate, limit: $limit) {
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
				}
			}
		`;

		// Use a wide date range to get all leave requests
		// TODO: Implement proper pagination and filtering in Rust GraphQL server
		const result = await graphqlClient.query(leaveRequestsQuery, {
			startDate: '2020-01-01T00:00:00Z',
			endDate: '2030-12-31T23:59:59Z',
			limit: 1000 // Get a large number for now since pagination isn't supported
		});

		// Handle potential GraphQL errors
		if (result.errors && result.errors.length > 0) {
			throw new Error(`GraphQL Error: ${result.errors[0].message}`);
		}

		// Extract data from Rust GraphQL server response (direct array)
		const leaveRequestsData = result.data?.leaveRequestsByDateRange || [];
		const totalRequests = leaveRequestsData.length; // TODO: Implement proper total count in Rust GraphQL server

		// Transform GraphQL data to expected format
		// TODO: Make separate queries to get employee and manager details
		const leaveRequests = leaveRequestsData.map((request) => ({
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
				id: request.employeeId,
				email: `employee${request.employeeId}@company.com`, // Placeholder
				displayName: `Employee ${request.employeeId}`, // Placeholder
				departmentId: null, // TODO: Get from separate query
				department: {
					id: 0,
					name: 'Unknown' // TODO: Get from separate query
				}
			},
			manager: request.managerId
				? {
						id: request.managerId,
						email: `manager${request.managerId}@company.com`, // Placeholder
						displayName: `Manager ${request.managerId}` // Placeholder
					}
				: null
		}));

		// Calculate statistics from all fetched requests
		const allTimePending = leaveRequests.filter((req) => req.status === 'pending').length;
		const allTimeApproved = leaveRequests.filter((req) => req.status === 'approved').length;
		const allTimeRejected = leaveRequests.filter((req) => req.status === 'rejected').length;
		const allTimeTotal = leaveRequests.length;
		const totalDaysRequested = leaveRequests.reduce((sum, req) => sum + req.daysRequested, 0);
		const approvalRate = allTimeTotal > 0 ? (allTimeApproved / allTimeTotal) * 100 : 0;

		// Calculate time-based metrics (simplified - using all data for now)
		const weeklyMetrics = {
			total: allTimeTotal,
			pending: allTimePending,
			approved: allTimeApproved,
			rejected: allTimeRejected,
			approvalRate,
			totalDaysRequested
		};
		const monthlyMetrics = weeklyMetrics;
		const quarterlyMetrics = weeklyMetrics;
		const yearlyMetrics = weeklyMetrics;

		// Filter based on search term and status (client-side filtering)
		let filteredRequests = leaveRequests;

		// Status filtering
		if (statusFilter && statusFilter !== 'all') {
			filteredRequests = filteredRequests.filter(
				(req) => req.status === statusFilter.toLowerCase()
			);
		}

		// Search term filtering
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			filteredRequests = filteredRequests.filter(
				(req) =>
					req.employee.displayName.toLowerCase().includes(searchLower) ||
					req.leaveType.toLowerCase().includes(searchLower) ||
					req.reason.toLowerCase().includes(searchLower)
			);
		}

		// Manual pagination (client-side)
		const totalFilteredRequests = filteredRequests.length;
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

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
				accessToken: '' // Session-based auth doesn't use access tokens
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
				total: totalFilteredRequests,
				totalPages: Math.ceil(totalFilteredRequests / limit),
				hasNextPage: endIndex < totalFilteredRequests,
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
				accessToken: '' // Session-based auth doesn't use access tokens
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
			mutation UpdateLeaveRequest($id: UUID!, $status: String!, $comments: String, $managerId: UUID!) {
				updateLeaveRequest(
					id: $id
					status: $status
					managerComments: $comments
					managerId: $managerId
				) {
					id
					status
					managerComments
				}
			}
		`;

		try {
			console.log('[Server] Executing approve mutation for:', leaveRequestId);
			const result = await graphqlClient.query(mutation, {
				id: leaveRequestId,
				status: 'APPROVED',
				comments: managerComments || 'Approved',
				managerId: locals.user.id
			});

			if (result.errors) {
				console.error('[Server] GraphQL errors:', result.errors);
				return fail(500, { message: 'Failed to approve leave request' });
			}

			console.log('[Server] Approve successful for:', leaveRequestId);
			return { success: true, message: 'Leave request approved' };
		} catch (err) {
			console.error('[Server] Error approving leave request:', err);
			return fail(500, { message: 'Failed to approve leave request' });
		}
	},

	deny: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const leaveRequestId = formData.get('id') as string;
		const managerComments = formData.get('comments') as string;

		if (!locals.user?.id) {
			return fail(401, { message: 'Unauthorized' });
		}

		const graphqlClient = GraphQLClient.fromCookies(cookies);

		const mutation = `
			mutation UpdateLeaveRequest($id: UUID!, $status: String!, $comments: String!, $managerId: UUID!) {
				updateLeaveRequest(
					id: $id
					status: $status
					managerComments: $comments
					managerId: $managerId
				) {
					id
					status
					managerComments
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
			mutation UpdateLeaveRequest($id: UUID!, $status: String!, $comments: String, $managerId: UUID!) {
				updateLeaveRequest(
					id: $id
					status: $status
					managerComments: $comments
					managerId: $managerId
				) {
					id
					status
					managerComments
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
