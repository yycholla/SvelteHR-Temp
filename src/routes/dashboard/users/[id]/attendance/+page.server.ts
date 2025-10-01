// User Attendance - Server-Side Data Loading
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

	// Verify user can access this attendance data (own data or has management permissions)
	let userId = params.id;
	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, 'Access denied: You can only view your own attendance records');
	}

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			console.warn('Backend not ready for user attendance page');
			return {
				user: null,
				userId,
				attendanceRecords: [],
				attendanceStats: {
					totalDays: 0,
					presentDays: 0,
					partialDays: 0,
					attendanceRate: 0,
					totalHours: 0,
					averageHours: 0
				},
				canManageAttendance: false,
				isOwnAttendance: locals.user?.id === userId,
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


		// TODO: Load actual attendance records from database
		// For now, generate sample data
		const currentDate = new Date();
		const attendanceRecords = Array.from({ length: 30 }, (_, i) => {
			const date = new Date(currentDate);
			date.setDate(date.getDate() - i);

			// Skip weekends
			if (date.getDay() === 0 || date.getDay() === 6) {
				return null;
			}

			const clockIn = new Date(date);
			clockIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

			const clockOut = new Date(clockIn);
			clockOut.setHours(clockIn.getHours() + 8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));

			const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

			return {
				id: `attendance-${i}`,
				date: date.toISOString().split('T')[0],
				clockIn: clockIn.toISOString(),
				clockOut: clockOut.toISOString(),
				hoursWorked: Math.round(hoursWorked * 100) / 100,
				status: hoursWorked >= 8 ? 'present' : 'partial',
				location: 'Office',
				notes: i % 7 === 0 ? 'Remote work day' : null
			};
		}).filter(Boolean);

		// Calculate attendance statistics
		const totalDays = attendanceRecords.length;
		const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
		const partialDays = attendanceRecords.filter(r => r.status === 'partial').length;
		const totalHours = attendanceRecords.reduce((sum, r) => sum + r.hoursWorked, 0);
		const averageHours = totalHours / totalDays;

		const attendanceStats = {
			totalDays,
			presentDays,
			partialDays,
			attendanceRate: Math.round((presentDays / totalDays) * 100),
			totalHours: Math.round(totalHours * 100) / 100,
			averageHours: Math.round(averageHours * 100) / 100
		};

		return {
			user,
			userId,
			attendanceRecords,
			attendanceStats,
			canManageAttendance: canViewOthers,
			isOwnAttendance: locals.user?.id === userId,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString()
		};

	} catch (err) {
		console.error('Error loading user attendance data:', err);

		// Return error state instead of throwing to prevent page crash
		return {
			user: null,
			userId,
			attendanceRecords: [],
			attendanceStats: {
				totalDays: 0,
				presentDays: 0,
				partialDays: 0,
				attendanceRate: 0,
				totalHours: 0,
				averageHours: 0
			},
			canManageAttendance: false,
			isOwnAttendance: locals.user?.id === userId,
			permissions: locals.permissions || [],
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Unable to load attendance data. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};