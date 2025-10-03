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
		const userQuery = `
			query GetUser($id: UUID!) {
				userById(id: $id) {
					id
					email
					firstName
					lastName
					departmentId
					isActive
					departmentByDepartmentId {
						id
						name
						managerId
					}
				}
			}
		`;

		const userData = await graphqlClient.query(userQuery, { id: userId });
		const user = userData.data?.userById;

		if (!user) {
			throw error(404, 'User not found');
		}

		// Load leave requests from database
		const leaveRequestsQuery = `
			query GetUserLeaveRequests($employeeId: UUID!) {
				allLeaveRequests(
					condition: { employeeId: $employeeId }
					orderBy: [CREATED_AT_DESC]
				) {
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
						userByManagerId {
							id
							firstName
							lastName
						}
					}
				}
			}
		`;

		const leaveRequestsData = await graphqlClient.query(leaveRequestsQuery, { employeeId: userId });
		const leaveRequests = leaveRequestsData.data?.allLeaveRequests?.nodes || [];

		// Load time off balances
		const currentYear = new Date().getFullYear();
		const timeOffBalancesQuery = `
			query GetUserTimeOffBalances($employeeId: UUID!, $year: Int!) {
				allTimeOffBalances(
					condition: { employeeId: $employeeId, year: $year }
				) {
					nodes {
						id
						employeeId
						policyId
						balanceDays
						usedDays
						year
						timeOffPolicyByPolicyId {
							id
							policyName
							policyType
						}
					}
				}
			}
		`;

		const balancesData = await graphqlClient.query(timeOffBalancesQuery, {
			employeeId: userId,
			year: currentYear
		});
		const timeOffBalances = balancesData.data?.allTimeOffBalances?.nodes || [];

		// Load all time off policies for the leave types dropdown
		const policiesQuery = `
			query GetTimeOffPolicies {
				allTimeOffPolicies {
					nodes {
						id
						policyName
						policyType
					}
				}
			}
		`;

		const policiesData = await graphqlClient.query(policiesQuery);
		const leaveTypes = policiesData.data?.allTimeOffPolicies?.nodes || [];

		// Calculate leave balances with pending requests
		const leaveBalances = timeOffBalances.map(balance => {
			const pending = leaveRequests
				.filter(req =>
					req.status === 'pending' &&
					balance.timeOffPolicyByPolicyId?.policyType === req.leaveType
				)
				.reduce((sum, req) => sum + (req.daysRequested || 0), 0);

			return {
				leaveType: {
					id: balance.timeOffPolicyByPolicyId?.id || balance.policyId,
					name: balance.timeOffPolicyByPolicyId?.policyName || 'Unknown',
					code: balance.timeOffPolicyByPolicyId?.policyType || 'UNKNOWN',
					color: getLeaveTypeColor(balance.timeOffPolicyByPolicyId?.policyType || '')
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
			approvedBy: req.userByManagerId ? {
				id: req.userByManagerId.id,
				name: `${req.userByManagerId.firstName} ${req.userByManagerId.lastName}`
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