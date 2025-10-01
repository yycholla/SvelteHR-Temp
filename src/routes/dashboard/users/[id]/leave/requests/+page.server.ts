// Server-side data loading for user leave requests page
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url } = event;

	// RBAC: Check leave management access permissions
	PermissionChecks.dashboard(event);

	// Verify user can access this leave data (own data or has management permissions)
	let userId = params.id;

	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, {
			message: 'Access denied: You can only view your own leave requests'
		});
	}

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		// Load user details
		const userResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUser($id: UUID!) {
						userById(id: $id) {
							id
							email
							displayName
							role
							departmentId
							departmentByDepartmentId {
								id
								name
								userByManagerId {
									id
									displayName
									email
								}
							}
						}
					}
				`,
				variables: { id: userId }
			})
		});

		const userData = await userResponse.json();
		const user = userData?.data?.userById;

		if (!user) {
			throw error(404, { message: 'User not found' });
		}

		// TODO: Load actual leave requests from database
		// For now, generate sample data
		const leaveTypes = [
			{ id: '1', name: 'Vacation', code: 'VAC', color: 'blue' },
			{ id: '2', name: 'Sick Leave', code: 'SICK', color: 'red' },
			{ id: '3', name: 'Personal', code: 'PERS', color: 'green' },
			{ id: '4', name: 'Bereavement', code: 'BER', color: 'gray' },
			{ id: '5', name: 'Maternity/Paternity', code: 'MAT', color: 'purple' }
		];

		const currentDate = new Date();
		const leaveRequests = Array.from({ length: 12 }, (_, i) => {
			const startDate = new Date(currentDate);
			startDate.setDate(startDate.getDate() + (i * 15) - 90); // Spread over past and future

			const endDate = new Date(startDate);
			endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 5) + 1);

			const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
			const statuses = ['pending', 'approved', 'rejected', 'cancelled'];
			const status = i < 8 ? statuses[Math.floor(Math.random() * statuses.length)] : 'pending';

			return {
				id: `leave-${i}`,
				startDate: startDate.toISOString().split('T')[0],
				endDate: endDate.toISOString().split('T')[0],
				leaveType,
				reason: `${leaveType.name} request - ${i % 3 === 0 ? 'Family vacation' : i % 3 === 1 ? 'Medical appointment' : 'Personal matter'}`,
				status,
				requestedAt: new Date(startDate.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString(), // 7 days before start
				approvedBy: status === 'approved' ? user.departmentByDepartmentId?.userByManagerId : null,
				comments: status === 'rejected' ? 'Unable to approve due to staffing requirements' : null,
				totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
			};
		});

		// Calculate leave balances (sample data)
		const leaveBalances = leaveTypes.map(type => ({
			leaveType: type,
			allocated: type.code === 'VAC' ? 25 : type.code === 'SICK' ? 10 : 5,
			used: leaveRequests.filter(req => req.leaveType.id === type.id && req.status === 'approved')
				.reduce((sum, req) => sum + req.totalDays, 0),
			pending: leaveRequests.filter(req => req.leaveType.id === type.id && req.status === 'pending')
				.reduce((sum, req) => sum + req.totalDays, 0)
		})).map(balance => ({
			...balance,
			remaining: balance.allocated - balance.used - balance.pending
		}));

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user,
			userId,
			leaveRequests: leaveRequests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
			leaveBalances,
			leaveTypes,
			canManageLeave: canViewOthers,
			isOwnLeave: locals.user?.id === userId,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};

	} catch (err) {
		console.error('[User Leave Requests Load Error]', err);

		throw error(500, {
			message: 'Unable to load leave requests. Please try again later.'
		});
	}
};