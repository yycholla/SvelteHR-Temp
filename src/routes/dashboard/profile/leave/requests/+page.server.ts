// User Leave Requests - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
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

		return {
			user,
			userId,
			leaveRequests: leaveRequests.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
			leaveBalances,
			leaveTypes,
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
