// User Attendance - Server-Side Data Loading
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
				isOwnAttendance: true,
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

		// Load attendance records from database
		const attendanceQuery = `
			query GetAttendanceRecords($userId: UUID!, $limit: Int = 90) {
				allAttendanceRecords(
					condition: { userId: $userId }
					orderBy: DATE_DESC
					first: $limit
				) {
					nodes {
						id
						userId
						date
						clockIn
						clockOut
						hoursWorked
						status
						location
						notes
						createdAt
						updatedAt
					}
					totalCount
				}
			}
		`;

		const attendanceData = await graphqlClient.query(attendanceQuery, {
			userId,
			limit: 90
		});

		console.log('[Attendance] GraphQL response:', JSON.stringify(attendanceData, null, 2));
		console.log('[Attendance] User ID:', userId);
		console.log('[Attendance] Records found:', attendanceData.data?.allAttendanceRecords?.totalCount);

		const attendanceRecords = (attendanceData.data?.allAttendanceRecords?.nodes || []).map((record: any) => ({
			id: record.id,
			date: record.date,
			clockIn: record.clockIn,
			clockOut: record.clockOut,
			hoursWorked: record.hoursWorked ? parseFloat(record.hoursWorked) : 0,
			status: record.status,
			location: record.location,
			notes: record.notes
		}));

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
			canManageAttendance: false,
			isOwnAttendance: true,
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
			isOwnAttendance: true,
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
