// Leave Approvals Management Page - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries for leave request management

import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor, ClientSideFilter } from '$lib/server/route-helpers';
import { StatisticsCalculator, Aggregators } from '$lib/server/analytics';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader with required permissions
	const loader = new RBACDataLoader(event, ['leave:approve']);

	return loader.loadWithClient(async (client) => {
		const { locals, url } = event;
		if (!locals.user) throw fail(401, { message: 'Unauthorized' });
		const user = locals.user;

		const userPerms = loader['permissions']; // Access computed permissions from loader
		const hasManagerAccess = userPerms.canViewManagement;

		try {
			// Check backend services are ready before proceeding
			const backendReady = await ensureBackendReady();

			// If backend is not ready, return error state but don't crash
			if (!backendReady) {
				logger.warn('Backend not ready for leave requests page');
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
						id: user.id,
						email: user.email || '',
						displayName: user.display_name || 'User',
						role: user.role || 'employee'
					},
					userSession: {
						userId: user.id,
						userEmail: user.email || '',
						role: user.role || 'employee',
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
						searchTerm: '',
						statusFilter: 'pending',
						leaveTypeFilter: ''
					},
					pagination: {
						page: 1,
						limit: 20,
						total: 0,
						totalPages: 0,
						hasNextPage: false,
						hasPreviousPage: false
					},
					canApproveLeave: hasManagerAccess,
					canViewAllLeave: locals.roles?.includes('admin') || false,
					error: {
						message: 'Backend services are initializing. Please try again in a moment.',
						details: 'Backend initialization in progress',
						retryable: true
					}
				};
			}

			// Extract search parameters for filtering and pagination
			const params = new QueryParamExtractor(url);
			const { page, limit } = params.getPagination(20);
			const searchTerm = params.getString('search');
			const statusFilter = params.getString('status', 'pending');
			const leaveTypeFilter = params.getString('leaveType');

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

			// Fetch all leave requests (filtering client-side for now as backend query is simple)
			const leaveRequestsData = await client.query(leaveRequestsQuery, {
				limit: 1000,
				offset: 0,
				dataPath: 'leaveRequests'
			});

			const totalRequests = leaveRequestsData.length;

			// Transform GraphQL data to expected format
			const leaveRequests = leaveRequestsData.map((request: any) => ({
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

			// Calculate statistics using StatisticsCalculator and Aggregators
			const stats = StatisticsCalculator.forLeaveRequests(leaveRequests);
			const totalDaysRequested = Aggregators.sum(leaveRequests, 'daysRequested');
			const approvalRate = stats.total > 0 ? (stats.approved / stats.total) * 100 : 0;

			// Calculate time-based metrics (simplified - using all data for now)
			const weeklyMetrics = {
				total: stats.total,
				pending: stats.pending,
				approved: stats.approved,
				rejected: stats.rejected,
				approvalRate,
				totalDaysRequested
			};
			const monthlyMetrics = weeklyMetrics;
			const quarterlyMetrics = weeklyMetrics;
			const yearlyMetrics = weeklyMetrics;

			// Filter based on search term and status using ClientSideFilter
			const filter = new ClientSideFilter(leaveRequests);

			// Status filtering
			if (statusFilter && statusFilter !== 'all') {
				filter.filter((req: any) => req.status === statusFilter.toLowerCase());
			}

			// Leave Type filtering
			if (leaveTypeFilter) {
				filter.filter((req: any) => req.leaveType === leaveTypeFilter);
			}

			// Search term filtering
			if (searchTerm) {
				filter.search(searchTerm, ['reason']);
				// Custom search for nested fields
				filter.filter(
					(req: any) =>
						req.employee.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
						req.leaveType.toLowerCase().includes(searchTerm.toLowerCase())
				);
			}

			const totalFilteredRequests = filter.count();
			const paginatedRequests = filter.paginate(page, limit).get();

			return {
				user: {
					id: user.id,
					email: user.email || '',
					displayName: user.display_name || 'User',
					role: user.role || 'employee'
				},
				userSession: {
					userId: user.id,
					userEmail: user.email || '',
					role: user.role || 'employee',
					accessToken: '' // Session-based auth doesn't use access tokens
				},
				leaveRequests: paginatedRequests,
				totalRequests,
				leaveStats: {
					// All-time statistics
					pendingCount: stats.pending,
					approvedCount: stats.approved,
					rejectedCount: stats.rejected,
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
					hasNextPage: page * limit < totalFilteredRequests,
					hasPreviousPage: page > 1
				},
				canApproveLeave: hasManagerAccess,
				canViewAllLeave: locals.roles?.includes('admin') || false
			};
		} catch (err) {
			logger.error('Error loading leave requests:', err as Error);

			// Extract search parameters for error response
			const params = new QueryParamExtractor(url);
			const { page, limit } = params.getPagination(20);
			const searchTerm = params.getString('search');
			const statusFilter = params.getString('status', 'pending');
			const leaveTypeFilter = params.getString('leaveType');

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
					id: user.id,
					email: user.email || '',
					displayName: user.display_name || 'User',
					role: user.role || 'employee'
				},
				userSession: {
					userId: user.id,
					userEmail: user.email || '',
					role: user.role || 'employee',
					accessToken: ''
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
				canApproveLeave: hasManagerAccess,
				canViewAllLeave: locals.roles?.includes('admin') || false,
				error: {
					message: 'Unable to load leave requests. Please try again later.',
					details: err instanceof Error ? err.message : 'Unknown error',
					retryable: true
				}
			};
		}
	});
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
			logger.info('[Server] Executing approve mutation', { leaveRequestId });
			const result = await graphqlClient.query(mutation, {
				input: {
					requestId: leaveRequestId
				}
			});

			if (result.errors) {
				logger.error(
					'[Server] GraphQL errors',
					new Error(result.errors[0]?.message || 'GraphQL error'),
					{ errors: result.errors.map((e) => ({ message: e.message })) }
				);
				return fail(500, { message: 'Failed to approve leave request' });
			}

			logger.info('[Server] Approve successful', { leaveRequestId });
			return { success: true, message: 'Leave request approved' };
		} catch (err) {
			logger.error('[Server] Error approving leave request:', err as Error);
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
			logger.info('[Server] Executing deny mutation', { leaveRequestId });
			const result = await graphqlClient.query(mutation, {
				input: {
					requestId: leaveRequestId,
					rejectionReason: managerComments || 'Denied'
				}
			});

			if (result.errors) {
				logger.error(
					'[Server] GraphQL errors',
					new Error(result.errors[0]?.message || 'GraphQL error'),
					{ errors: result.errors.map((e) => ({ message: e.message })) }
				);
				return fail(500, { message: 'Failed to deny leave request' });
			}

			logger.info('[Server] Deny successful', { leaveRequestId });
			return { success: true, message: 'Leave request denied' };
		} catch (err) {
			logger.error('[Server] Error denying leave request:', err as Error);
			return fail(500, { message: 'Failed to deny leave request' });
		}
	},

	// TODO: Revert to pending action requires backend support
	// The current Rust GraphQL backend doesn't have a mutation to change
	// approved/rejected requests back to pending status. This would require:
	// 1. Adding a new mutation: revertLeaveRequestToPending(input: RevertLeaveRequestInput)
	// 2. Or extending updateLeaveRequest to allow status changes for approved/rejected requests
	revertToPending: async ({ request, cookies, locals }) => {
		logger.info('[Server] Revert to pending action not yet implemented in Rust backend');
		return fail(501, {
			message:
				'Revert to pending functionality is not yet available. This feature requires backend support.'
		});
	}
};
