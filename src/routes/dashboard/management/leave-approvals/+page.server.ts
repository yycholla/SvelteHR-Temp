// Leave Approvals Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for leave request management

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies, fetch: fetchFn } = event;

	// Check authentication and permissions
	PermissionChecks.leaveApproval(event);

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
			query GetLeaveRequests($limit: Int!, $offset: Int!) {
				leaveRequests(limit: $limit, offset: $offset) {
					id
					employeeId
					managerId
					leaveTypeId
					startDate
					endDate
					daysRequested
					status
					reason
					managerComments
					createdAt
					updatedAt
					employee {
						id
						email
						displayName
					}
					manager {
						id
						email
						displayName
					}
					leaveType {
						id
						name
						description
					}
				}
			}
		`;

		// Fetch all leave requests with pagination
		const result = await graphqlClient.query(leaveRequestsQuery, {
			limit: 1000,
			offset: 0
		});

		// Handle potential GraphQL errors
		if (result.errors && result.errors.length > 0) {
			throw new Error(`GraphQL Error: ${result.errors[0].message}`);
		}

		// Extract data from Rust GraphQL server response (direct array)
		const leaveRequestsData = result.data?.leaveRequests || [];
		const totalRequests = leaveRequestsData.length;

		// Transform GraphQL data to expected format
		const leaveRequests = leaveRequestsData.map((request) => ({
			id: request.id.toString(),
			nodeId: `node${request.id}`,
			employeeId: request.employeeId,
			managerId: request.managerId,
			leaveTypeId: request.leaveTypeId,
			leaveType: request.leaveType?.name || 'Unknown',
			startDate: request.startDate,
			endDate: request.endDate,
			daysRequested: parseFloat(request.daysRequested),
			status: request.status.toLowerCase(),
			reason: request.reason || '',
			managerComments: request.managerComments || '',
			createdAt: request.createdAt,
			updatedAt: request.updatedAt,
			employee: request.employee
				? {
						id: request.employee.id,
						email: request.employee.email,
						displayName: request.employee.displayName,
						departmentId: null,
						department: {
							id: 0,
							name: 'Unknown'
						}
					}
				: {
						id: request.employeeId,
						email: 'unknown@company.com',
						displayName: 'Unknown Employee',
						departmentId: null,
						department: {
							id: 0,
							name: 'Unknown'
						}
					},
			manager: request.manager
				? {
						id: request.manager.id,
						email: request.manager.email,
						displayName: request.manager.displayName
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

		if (!locals.user?.id) {
			return fail(401, { message: 'Unauthorized' });
		}

		const graphqlClient = GraphQLClient.fromCookies(cookies);

		// Use Rust GraphQL backend mutation: approveLeaveRequest
		const mutation = `
			mutation ApproveLeaveRequest($input: ApproveLeaveRequestInput!) {
				approveLeaveRequest(input: $input) {
					id
					status
					managerId
					updatedAt
				}
			}
		`;

		try {
			console.log('[Server] Executing approve mutation for:', leaveRequestId);
			const result = await graphqlClient.query(mutation, {
				input: {
					requestId: leaveRequestId
				}
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

		// Use Rust GraphQL backend mutation: rejectLeaveRequest
		const mutation = `
			mutation RejectLeaveRequest($input: RejectLeaveRequestInput!) {
				rejectLeaveRequest(input: $input) {
					id
					status
					managerId
					managerComments
					updatedAt
				}
			}
		`;

		try {
			console.log('[Server] Executing deny mutation for:', leaveRequestId);
			const result = await graphqlClient.query(mutation, {
				input: {
					requestId: leaveRequestId,
					rejectionReason: managerComments || 'Denied'
				}
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

	// TODO: Revert to pending action requires backend support
	// The current Rust GraphQL backend doesn't have a mutation to change
	// approved/rejected requests back to pending status. This would require:
	// 1. Adding a new mutation: revertLeaveRequestToPending(input: RevertLeaveRequestInput)
	// 2. Or extending updateLeaveRequest to allow status changes for approved/rejected requests
	revertToPending: async ({ request, cookies, locals }) => {
		console.log('[Server] Revert to pending action not yet implemented in Rust backend');
		return fail(501, {
			message:
				'Revert to pending functionality is not yet available. This feature requires backend support.'
		});
	}
};
