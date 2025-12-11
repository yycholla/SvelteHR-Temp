// User Leave Requests - Server-Side Data Loading
// Fully migrated to Rust GraphQL backend with idiomatic query patterns
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url, cookies } = event;

	// Check authentication and permissions (with scope validation)
	PermissionChecks.leaveRead(event);

	// Scope validation: Check if user can view THIS specific employee's data
	const userId = params.id;
	const userPermissions = locals.permissions || [];
	const isViewingSelf = locals.user?.id === userId;

	// If not viewing self, check for team or all scope
	if (!isViewingSelf) {
		const hasTeamScope =
			userPermissions.includes('leave:read:team') || userPermissions.includes('leave:read:all');
		if ((!hasTeamScope && !userPermissions.includes('*')) || userPermissions.includes('*:*')) {
			error(403, 'Access denied: You can only view your own leave requests');
		}

		// TODO: Add team validation if user only has team scope
		// Should verify that the target user is in the same team/department
	}

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			logger.warn('Backend not ready for user leave requests page');
			return {
				user: null,
				userId,
				leaveRequests: [],
				leaveBalances: [],
				leaveTypes: [],
				canManageLeave: false,
				isOwnLeave: locals.user?.id === userId,
				permissions: locals.permissions || [],
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

		// Load user details using Rust GraphQL backend (idiomatic pattern)
		const userQuery = `
			query GetUser($id: UUID!) {
				user(id: $id) {
					id
					email
					displayName
					departmentId
					isActive
					department {
						id
						name
						managerId
					}
				}
			}
		`;

		const userData = await graphqlClient.query(userQuery, { id: userId });
		const user = userData.data?.user;

		if (!user) {
			error(404, 'User not found');
		}

		// Load leave requests from Rust GraphQL backend (idiomatic pattern with employeeId parameter)
		const leaveRequestsQuery = `
			query GetUserLeaveRequests($employeeId: UUID!, $limit: Int!) {
				leaveRequests(employeeId: $employeeId, limit: $limit) {
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
					manager {
						id
						displayName
					}
				}
			}
		`;

		const leaveRequestsData = await graphqlClient.query(leaveRequestsQuery, {
			employeeId: userId,
			limit: 100
		});
		const leaveRequests = leaveRequestsData.data?.leaveRequests || [];

		// Load leave balances - migrated to Rust GraphQL backend
		const currentYear = new Date().getFullYear();
		const leaveBalancesQuery = `
			query GetUserLeaveBalances($employeeId: UUID!, $limit: Int!) {
				leaveBalances(employeeId: $employeeId, limit: $limit) {
					id
					employeeId
					leaveTypeId
					totalDays
					usedDays
					remainingDays
					year
					leaveType {
						id
						name
						defaultDays
						color
					}
				}
			}
		`;

		const balancesData = await graphqlClient.query(leaveBalancesQuery, {
			employeeId: userId,
			limit: 50
		});
		const leaveBalances = balancesData.data?.leaveBalances || [];

		// Filter to current year on client side since backend doesn't support year filtering yet
		const currentYearBalances = leaveBalances.filter((b: any) => b.year === currentYear);

		// Load all leave types for the leave types dropdown - migrated to Rust GraphQL backend
		const leaveTypesQuery = `
			query GetLeaveTypes($limit: Int!) {
				leaveTypes(limit: $limit) {
					id
					name
					description
					defaultDays
					requiresApproval
					isPaid
					color
				}
			}
		`;

		const leaveTypesData = await graphqlClient.query(leaveTypesQuery, { limit: 100 });
		const leaveTypes = leaveTypesData.data?.leaveTypes || [];

		// Calculate leave balances with pending requests - updated for Rust backend
		const formattedLeaveBalances = currentYearBalances.map((balance: any) => {
			const pending = leaveRequests
				.filter((req: any) => req.status === 'pending' && balance.leaveType?.id === req.leaveTypeId)
				.reduce((sum: number, req: any) => sum + (req.daysRequested || 0), 0);

			return {
				leaveType: {
					id: balance.leaveType?.id || balance.leaveTypeId,
					name: balance.leaveType?.name || 'Unknown',
					code: balance.leaveType?.name || 'UNKNOWN',
					color: balance.leaveType?.color || getLeaveTypeColor(balance.leaveType?.name || '')
				},
				allocated: parseFloat(balance.totalDays) || 0,
				used: parseFloat(balance.usedDays) || 0,
				pending,
				remaining: parseFloat(balance.remainingDays) || 0
			};
		});

		// Map leave requests to match the expected format
		const formattedLeaveRequests = leaveRequests.map((req: any) => ({
			id: req.id,
			startDate: req.startDate,
			endDate: req.endDate,
			leaveType: {
				id: req.leaveTypeId,
				name: getLeaveTypeName(req.leaveTypeId),
				code: req.leaveTypeId,
				color: getLeaveTypeColor(req.leaveTypeId)
			},
			reason: req.reason || '',
			status: req.status,
			requestedAt: req.createdAt,
			approvedBy: req.manager
				? {
						id: req.manager.id,
						name: req.manager.displayName
					}
				: null,
			comments: req.managerComments,
			totalDays: req.daysRequested || 0
		}));

		// Determine if user can manage leave for this user
		const canManageLeave =
			!isViewingSelf &&
			(userPermissions.includes('leave:write:team') ||
				userPermissions.includes('leave:write:all') ||
				userPermissions.includes('leave:approve:team') ||
				userPermissions.includes('leave:approve:all') ||
				userPermissions.includes('*'));

		return {
			user,
			userId,
			leaveRequests: formattedLeaveRequests,
			leaveBalances: formattedLeaveBalances,
			leaveTypes: leaveTypes.map((type: any) => ({
				id: type.id,
				name: type.name,
				code: type.name,
				color: type.color || getLeaveTypeColor(type.name)
			})),
			canManageLeave,
			isOwnLeave: locals.user?.id === userId,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('Error loading user leave requests:', err as Error);

		// Return error state instead of throwing to prevent page crash
		return {
			user: null,
			userId,
			leaveRequests: [],
			leaveBalances: [],
			leaveTypes: [],
			canManageLeave: false,
			isOwnLeave: locals.user?.id === userId,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Unable to load leave requests. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};

// Helper function to get leave type color based on type code
function getLeaveTypeColor(typeCode: string): string {
	const colorMap: Record<string, string> = {
		vacation: 'blue',
		sick: 'red',
		personal: 'green',
		bereavement: 'gray',
		maternity: 'purple',
		paternity: 'purple',
		unpaid: 'orange'
	};
	return colorMap[typeCode.toLowerCase()] || 'blue';
}

// Helper function to get human-readable leave type name
function getLeaveTypeName(typeCode: string): string {
	const nameMap: Record<string, string> = {
		vacation: 'Vacation',
		sick: 'Sick Leave',
		personal: 'Personal',
		bereavement: 'Bereavement',
		maternity: 'Maternity Leave',
		paternity: 'Paternity Leave',
		unpaid: 'Unpaid Leave'
	};
	return nameMap[typeCode.toLowerCase()] || typeCode;
}
