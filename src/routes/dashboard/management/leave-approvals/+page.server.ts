// Leave Approvals Management Page - Refactored with Hexagonal Architecture
// Uses LeaveRequestService instead of direct GraphQL queries

import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { createLeaveRequestService } from '$lib/server/services';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, ['leave:approve']);

	return loader.loadWithClient(async () => {
		const { locals, url } = event;
		if (!locals.user) throw fail(401, { message: 'Unauthorized' });

		const userPerms = loader['permissions'];
		const hasManagerAccess = userPerms.canViewManagement;
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);
		const statusFilter = params.getString('status', 'pending');
		const leaveTypeFilter = params.getString('leaveType');
		const searchTerm = params.getString('search');

		try {
			// Use service layer instead of direct GraphQL
			const service = createLeaveRequestService(event);

			// Fetch leave requests
			const result = await service.getLeaveRequests({
				status: statusFilter !== 'all' ? statusFilter : undefined,
				leaveType: leaveTypeFilter || undefined,
				page: 1,
				limit: 1000
			});

			if (result.isError) {
				throw new Error(result.error.message);
			}

			// Get statistics
			const statsResult = await service.getStatistics();
			const stats = statsResult.isOk
				? statsResult.value
				: {
						total: 0,
						pending: 0,
						approved: 0,
						rejected: 0,
						cancelled: 0,
						totalDays: 0,
						approvalRate: 0,
						averageDuration: 0
					};

			// Transform DTOs to UI format
			let requests = result.value.items.map((dto) => ({
				id: dto.id,
				nodeId: `node${dto.id}`,
				employeeId: dto.employeeId,
				managerId: dto.managerId,
				leaveTypeId: dto.leaveType,
				leaveType: dto.leaveType,
				startDate: dto.startDate,
				endDate: dto.endDate,
				daysRequested: dto.businessDays,
				status: dto.status.toLowerCase(),
				reason: dto.reason || '',
				managerComments: dto.managerComments || '',
				createdAt: dto.createdAt,
				updatedAt: dto.updatedAt,
				employee: {
					id: dto.employeeId,
					email: 'unknown@company.com',
					displayName: 'Employee',
					departmentId: null,
					department: { id: 0, name: 'Unknown' }
				},
				manager: dto.managerId
					? { id: dto.managerId, email: 'unknown@company.com', displayName: 'Manager' }
					: null
			}));

			// Client-side search
			if (searchTerm) {
				const lower = searchTerm.toLowerCase();
				requests = requests.filter(
					(r) => r.reason.toLowerCase().includes(lower) || r.leaveType.toLowerCase().includes(lower)
				);
			}

			// Pagination
			const total = requests.length;
			const start = (page - 1) * limit;
			const paginated = requests.slice(start, start + limit);

			const metrics = {
				total: stats.total,
				pending: stats.pending,
				approved: stats.approved,
				rejected: stats.rejected,
				approvalRate: stats.approvalRate * 100,
				totalDaysRequested: stats.totalDays
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
					accessToken: ''
				},
				leaveRequests: paginated,
				totalRequests: stats.total,
				leaveStats: {
					pendingCount: stats.pending,
					approvedCount: stats.approved,
					rejectedCount: stats.rejected,
					totalDaysRequested: stats.totalDays,
					approvalRate: stats.approvalRate * 100,
					weekly: metrics,
					monthly: metrics,
					quarterly: metrics,
					yearly: metrics
				},
				filters: { searchTerm, statusFilter, leaveTypeFilter },
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					hasNextPage: page * limit < total,
					hasPreviousPage: page > 1
				},
				canApproveLeave: hasManagerAccess,
				canViewAllLeave: locals.roles?.includes('admin') || false
			};
		} catch (err) {
			logger.error('Error loading leave requests:', err as Error);
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
					weekly: {
						total: 0,
						pending: 0,
						approved: 0,
						rejected: 0,
						approvalRate: 0,
						totalDaysRequested: 0
					},
					monthly: {
						total: 0,
						pending: 0,
						approved: 0,
						rejected: 0,
						approvalRate: 0,
						totalDaysRequested: 0
					},
					quarterly: {
						total: 0,
						pending: 0,
						approved: 0,
						rejected: 0,
						approvalRate: 0,
						totalDaysRequested: 0
					},
					yearly: {
						total: 0,
						pending: 0,
						approved: 0,
						rejected: 0,
						approvalRate: 0,
						totalDaysRequested: 0
					}
				},
				filters: { searchTerm: '', statusFilter: 'pending', leaveTypeFilter: '' },
				pagination: {
					page: 1,
					limit: 20,
					total: 0,
					totalPages: 0,
					hasNextPage: false,
					hasPreviousPage: false
				},
				canApproveLeave: hasManagerAccess,
				canViewAllLeave: false,
				error: {
					message: 'Unable to load leave requests',
					details: err instanceof Error ? err.message : 'Unknown error',
					retryable: true
				}
			};
		}
	});
};

export const actions: Actions = {
	approve: async (event) => {
		if (!event.locals.user?.id) return fail(401, { message: 'Unauthorized' });

		const formData = await event.request.formData();
		const id = formData.get('id') as string;
		const service = createLeaveRequestService(event);

		try {
			const result = await service.approveLeaveRequest(id, event.locals.user.id);
			if (result.isError) {
				logger.error('Failed to approve', result.error);
				return fail(500, { message: result.error.message });
			}
			return { success: true, message: 'Leave request approved' };
		} catch (err) {
			logger.error('Error approving:', err as Error);
			return fail(500, { message: 'Failed to approve leave request' });
		}
	},

	deny: async (event) => {
		if (!event.locals.user?.id) return fail(401, { message: 'Unauthorized' });

		const formData = await event.request.formData();
		const id = formData.get('id') as string;
		const comments = formData.get('comments') as string;
		const service = createLeaveRequestService(event);

		try {
			const result = await service.rejectLeaveRequest(
				id,
				event.locals.user.id,
				comments || 'Denied'
			);
			if (result.isError) {
				logger.error('Failed to reject', result.error);
				return fail(500, { message: result.error.message });
			}
			return { success: true, message: 'Leave request denied' };
		} catch (err) {
			logger.error('Error rejecting:', err as Error);
			return fail(500, { message: 'Failed to deny leave request' });
		}
	},

	revertToPending: async () => {
		return fail(501, { message: 'Revert to pending requires backend support' });
	}
};
