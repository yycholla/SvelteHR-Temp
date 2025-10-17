// User Leave Requests - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// Verify user can access this leave data (own data or has management permissions)
	let userId = params.id;
	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, 'Access denied: You can only view your own leave requests');
	}

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			console.warn('Backend not ready for user leave requests page');
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

		// Load user details using new GraphQL client
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const userQuery = `
			query GetUser($id: UUID!) {
				users(limit: 1, filter: { id: { equalTo: $id } }) {
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
		const users = userData.data?.users || [];
		const user = users.length > 0 ? users[0] : null;

		if (!user) {
			throw error(404, 'User not found');
		}

		// Load leave requests from database
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const leaveRequestsQuery = `
			query GetUserLeaveRequests($employeeId: UUID!, $limit: Int!) {
				leaveRequests(
					limit: $limit,
					filter: { employeeId: { equalTo: $employeeId } }
				) {
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
					manager {
						id
						displayName
					}
				}
			}
		`;

		const leaveRequestsData = await graphqlClient.query(leaveRequestsQuery, { employeeId: userId, limit: 100 });
		const leaveRequests = leaveRequestsData.data?.leaveRequests || [];

		// Load time off balances
		// NOTE: Using Rust GraphQL schema (filter pattern, direct arrays)
		const currentYear = new Date().getFullYear();
		const timeOffBalancesQuery = `
			query GetUserTimeOffBalances($employeeId: UUID!, $year: Int!, $limit: Int!) {
				timeOffBalances(
					limit: $limit,
					filter: {
						employeeId: { equalTo: $employeeId },
						year: { equalTo: $year }
					}
				) {
					id
					employeeId
					policyId
					balanceDays
					usedDays
					year
					policy {
						id
						policyName
						policyType
					}
				}
			}
		`;

		const balancesData = await graphqlClient.query(timeOffBalancesQuery, {
			employeeId: userId,
			year: currentYear,
			limit: 50
		});
		const timeOffBalances = balancesData.data?.timeOffBalances || [];

		// Load all time off policies for the leave types dropdown
		// NOTE: Using Rust GraphQL schema (direct arrays)
		const policiesQuery = `
			query GetTimeOffPolicies($limit: Int!) {
				timeOffPolicies(limit: $limit) {
					id
					policyName
					policyType
				}
			}
		`;

		const policiesData = await graphqlClient.query(policiesQuery, { limit: 100 });
		const leaveTypes = policiesData.data?.timeOffPolicies || [];

		// Calculate leave balances with pending requests
		const leaveBalances = timeOffBalances.map(balance => {
			const pending = leaveRequests
				.filter(req =>
					req.status === 'pending' &&
					balance.policy?.policyType === req.leaveType
				)
				.reduce((sum, req) => sum + (req.daysRequested || 0), 0);

			return {
				leaveType: {
					id: balance.policy?.id || balance.policyId,
					name: balance.policy?.policyName || 'Unknown',
					code: balance.policy?.policyType || 'UNKNOWN',
					color: getLeaveTypeColor(balance.policy?.policyType || '')
				},
				allocated: balance.balanceDays || 0,
				used: balance.usedDays || 0,
				pending,
				remaining: (balance.balanceDays || 0) - (balance.usedDays || 0) - pending
			};
		});

		// Map leave requests to match the expected format
		const formattedLeaveRequests = leaveRequests.map(req => ({
			id: req.id,
			startDate: req.startDate,
			endDate: req.endDate,
			leaveType: {
				id: req.leaveType,
				name: getLeaveTypeName(req.leaveType),
				code: req.leaveType,
				color: getLeaveTypeColor(req.leaveType)
			},
			reason: req.reason || '',
			status: req.status,
			requestedAt: req.createdAt,
			approvedBy: req.manager ? {
				id: req.manager.id,
				name: req.manager.displayName
			} : null,
			comments: req.managerComments,
			totalDays: req.daysRequested || 0
		}));

		return {
			user,
			userId,
			leaveRequests: formattedLeaveRequests,
			leaveBalances,
			leaveTypes: leaveTypes.map(type => ({
				id: type.id,
				name: type.policyName,
				code: type.policyType,
				color: getLeaveTypeColor(type.policyType)
			})),
			canManageLeave: canViewOthers,
			isOwnLeave: locals.user?.id === userId,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString()
		};

	} catch (err) {
		console.error('Error loading user leave requests:', err);

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