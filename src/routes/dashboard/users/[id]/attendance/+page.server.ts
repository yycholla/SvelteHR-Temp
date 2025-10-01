// Server-side data loading for user attendance page
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, params, url } = event;

	// RBAC: Check attendance access permissions
	PermissionChecks.dashboard(event);

	// Verify user can access this attendance data (own data or has management permissions)
	let userId = params.id;

	const canViewOthers = locals.roles?.includes('admin') || locals.roles?.includes('manager');

	if (!canViewOthers && locals.user?.id !== userId) {
		throw error(403, {
			message: 'Access denied: You can only view your own attendance records'
		});
	}

	try {
		// TEMPORARY: Skip PostGraphile and use mock data to test frontend
		console.log('🚀 Loading attendance with mock data for testing');

		// Mock user data
		const user = {
			id: userId,
			email: locals.user?.email || 'admin@postgraphile-hr.com',
			displayName: locals.user?.display_name || 'System Administrator',
			role: 'admin',
			departmentId: 'dept-1',
			departmentByDepartmentId: {
				id: 'dept-1',
				name: 'Administration',
				userByManagerId: {
					id: 'manager-1',
					displayName: 'Sarah Johnson',
					email: 'sarah.johnson@company.com'
				}
			}
		};

		// FUTURE: Enable PostGraphile when JWT issues are resolved
		// const graphqlEndpoint = 'http://localhost:4000/graphql';
		// const headers: Record<string, string> = {
		// 	'Content-Type': 'application/json'
		// };

		// Load user details
		// const userResponse = await fetch(graphqlEndpoint, {
		// 	method: 'POST',
		// 	headers,
		// 	body: JSON.stringify({
		// 		query: `
		// 			query GetUser($id: UUID!) {
		// 				userById(id: $id) {
		// 					id
		// 					email
		// 					displayName
		// 					role
		// 					departmentId
		// 					departmentByDepartmentId {
		// 						id
		// 						name
		// 					}
		// 				}
		// 			}
		// 		`,
		// 		variables: { id: userId }
		// 	})
		// });

		// const userData = await userResponse.json();
		// const userFromDb = userData?.data?.userById;

		// if (!userFromDb) {
		// 	throw error(404, { message: 'User not found' });
		// }

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

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user,
			userId,
			attendanceRecords,
			attendanceStats,
			canManageAttendance: canViewOthers,
			isOwnAttendance: locals.user?.id === userId,
			...userPermissions,
			loadedAt: new Date().toISOString()
		};

	} catch (err) {
		console.error('[User Attendance Load Error]', err);

		throw error(500, {
			message: 'Unable to load attendance data. Please try again later.'
		});
	}
};