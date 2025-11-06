// User Leave Requests - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';
import { getLeaveTypeColor } from '$lib/graphql/queries/leave-requests';

// Helper function to get human-readable leave type name
function getLeaveTypeName(typeCode: string): string {
	const nameMap: Record<string, string> = {
		vacation: 'Vacation',
		sick: 'Sick Leave',
		personal: 'Personal',
		bereavement: 'Bereavement',
		maternity: 'Maternity Leave',
		paternity: 'Paternity Leave',
		unpaid: 'Unpaid Leave',
		annual: 'Annual Leave'
	};
	return nameMap[typeCode.toLowerCase()] || typeCode;
}

// Helper function to map policy name to leave type code
function getLeaveTypeCodeFromPolicy(policyName: string): string {
	const policyMap: Record<string, string> = {
		'Annual Leave': 'annual',
		'Sick Leave': 'sick',
		'Personal Leave': 'personal'
	};
	return policyMap[policyName] || policyName.toLowerCase().replace(' ', '_');
}

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		error(401, 'Authentication required');
	}

	// Use authenticated user's ID
	const userId = locals.user.id;

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
				isOwnLeave: true,
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
				user(id: $id) {
					id
					email
					firstName
					lastName
					departmentId
					status
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

		// Load leave requests from database
		// Migration: ✅ Use idiomatic Rust pattern (leaveRequests with employeeId)
		const leaveRequestsQuery = `
			query GetUserLeaveRequests($employeeId: UUID!, $limit: Int!, $offset: Int!) {
				leaveRequests(employeeId: $employeeId, limit: $limit, offset: $offset) {
					id
					employeeId
					managerId
					leaveType {
						id
						name
						description
						defaultDays
						requiresApproval
						isPaid
						color
					}
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
						firstName
						lastName
						displayName
						fullName
						role
						jobTitle
						departmentId
						managerId
						hireDate
						isActive
						createdAt
						updatedAt
					}
					manager {
						id
						email
						firstName
						lastName
						displayName
						fullName
						role
						jobTitle
						departmentId
						managerId
						hireDate
						isActive
						createdAt
						updatedAt
					}
				}
			}
		`;

		const leaveRequestsData = await graphqlClient.query(leaveRequestsQuery, {
			employeeId: userId,
			limit: 100,
			offset: 0
		});
		const rawLeaveRequests = leaveRequestsData.data?.leaveRequests || [];

		// Load time off balances
		// Migration: ✅ Use idiomatic Rust pattern (leaveBalances with employeeId, filter year client-side)
		const currentYear = new Date().getFullYear();
		const timeOffBalancesQuery = `
			query GetUserTimeOffBalances($employeeId: UUID!, $limit: Int!, $offset: Int!) {
				leaveBalances(employeeId: $employeeId, limit: $limit, offset: $offset) {
					id
					employeeId
					leaveTypeId
					year
					totalDays
					usedDays
					remainingDays
					createdAt
					updatedAt
				}
			}
		`;

		const balancesData = await graphqlClient.query(timeOffBalancesQuery, {
			employeeId: userId,
			limit: 50,
			offset: 0
		});
		const allBalances = balancesData.data?.leaveBalances || [];

		// Filter to current year client-side (backend doesn't support year parameter)
		const timeOffBalances = allBalances.filter((balance: any) => balance.year === currentYear);

		// For now, skip loading policies and use hardcoded mappings
		const timeOffPolicies: Array<{ id: string; policyName: string; leaveType: string }> = [
			{ id: 'annual-policy', policyName: 'Annual Leave', leaveType: 'annual' },
			{ id: 'sick-policy', policyName: 'Sick Leave', leaveType: 'sick' },
			{ id: 'personal-policy', policyName: 'Personal Leave', leaveType: 'personal' }
		];

		// Calculate leave balances
		const leaveBalances = timeOffBalances.map((balance: any) => {
			// Parse decimal strings to numbers
			const totalDays = parseFloat(balance.totalDays || '0');
			const usedDays = parseFloat(balance.usedDays || '0');
			const remainingDays = parseFloat(balance.remainingDays || '0');

			// For now, assume all balances are for annual leave
			// TODO: Load actual leave type from balance.leaveType relationship
			const leaveTypeCode = 'annual';
			const policyName = 'Annual Leave';

			return {
				leaveType: {
					id: balance.leaveTypeId, // Migration: policyId → leaveTypeId
					name: policyName,
					code: leaveTypeCode,
					color: getLeaveTypeColor(leaveTypeCode)
				},
				allocated: totalDays,
				used: usedDays,
				pending: 0, // Not tracked in current schema
				remaining: remainingDays
			};
		});

		// Map leave requests to match the expected format
		const leaveRequests = rawLeaveRequests.map((req: any) => ({
			id: req.id,
			startDate: req.startDate,
			endDate: req.endDate,
			leaveType: {
				id: req.leaveType?.id || req.leaveType,
				name: req.leaveType?.name || (typeof req.leaveType === 'string' ? getLeaveTypeName(req.leaveType) : 'Unknown'),
				code: typeof req.leaveType === 'string' ? req.leaveType.toLowerCase() : (req.leaveType?.name?.toLowerCase().replace(/\s+/g, '_') || 'annual'),
				color: req.leaveType?.color || getLeaveTypeColor(req.leaveType?.name?.toLowerCase() || 'annual')
			},
			reason: req.reason || '',
			status: req.status.toString().toLowerCase(),
			requestedAt: req.createdAt,
			approvedBy: req.manager
				? {
						id: req.manager.id,
						name: req.manager.fullName || `${req.manager.firstName} ${req.manager.lastName}`
					}
				: null,
			comments: req.managerComments || '',
			totalDays: req.daysRequested || 0
		}));

		return {
			user,
			userId,
			leaveRequests: leaveRequests.sort(
				(a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
			),
			leaveBalances,
			leaveTypes: timeOffPolicies.map((policy) => ({
				id: policy.id,
				name: policy.policyName,
				code: getLeaveTypeCodeFromPolicy(policy.policyName),
				color: getLeaveTypeColor(getLeaveTypeCodeFromPolicy(policy.policyName))
			})),
			canManageLeave: false,
			isOwnLeave: true,
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
			isOwnLeave: true,
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
