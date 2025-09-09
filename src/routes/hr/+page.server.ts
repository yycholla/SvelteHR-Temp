import type { PageServerLoad } from './$types';
import {
	createAuthenticatedApiClient,
	loadEmployeeData,
	loadTaskData,
	loadAnnouncementData,
	loadActivityLogData,
	loadLeaveData
} from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies }) => {
	console.log('🏢 Loading HR dashboard with new API client');

	try {
		const apiClient = createAuthenticatedApiClient(cookies);

		// Load comprehensive dashboard data in parallel
		const [employeeData, taskData, announcementData, activityData, leaveData] =
			await Promise.allSettled([
				loadEmployeeData(cookies, { limit: 10 }),
				loadTaskData(cookies, { limit: 10 }),
				loadAnnouncementData(cookies, { limit: 5, active_only: true }),
				loadActivityLogData(cookies, { limit: 10 }),
				loadLeaveData(cookies, { limit: 10, status: 'pending' })
			]);

		// Process employee data
		const employees =
			employeeData.status === 'fulfilled'
				? employeeData.value
				: { employees: [], departments: [], roles: [], pagination: { totalCount: 0 } };

		// Process task data
		const tasks =
			taskData.status === 'fulfilled'
				? taskData.value
				: { tasks: [], employees: [], totalCount: 0 };

		// Process announcements
		const announcements =
			announcementData.status === 'fulfilled'
				? announcementData.value
				: { announcements: [], totalCount: 0 };

		// Process activity logs
		const activities =
			activityData.status === 'fulfilled'
				? activityData.value
				: { activityLogs: [], totalCount: 0 };

		// Process leave requests
		const leaves =
			leaveData.status === 'fulfilled'
				? leaveData.value
				: { leaves: [], employees: [], totalCount: 0 };

		// Calculate dashboard statistics
		const stats = {
			totalEmployees: employees.pagination.totalCount,
			totalDepartments: employees.departments.length,
			activeTasks: tasks.totalCount,
			pendingLeaves: leaves.totalCount,
			recentActivities: activities.totalCount,
			activeAnnouncements: announcements.totalCount
		};

		// Get recent activities for the activity feed
		const recentActivities = activities.activityLogs.slice(0, 5);

		// Get upcoming tasks
		const upcomingTasks = tasks.tasks.slice(0, 5);

		// Get recent employees (newly joined)
		const recentEmployees = employees.employees
			.filter((emp) => emp.created_at)
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.slice(0, 5);

		console.log('✅ HR dashboard loaded with comprehensive data');

		return {
			// Core data
			employees: employees.employees.slice(0, 10),
			departments: employees.departments,
			tasks: tasks.tasks.slice(0, 10),
			announcements: announcements.announcements,
			recentActivities,
			pendingLeaves: leaves.leaves,

			// Dashboard widgets
			stats,
			recentEmployees,
			upcomingTasks,

			// Quick access data
			totalCounts: {
				employees: employees.pagination.totalCount,
				tasks: tasks.totalCount,
				leaves: leaves.totalCount,
				announcements: announcements.totalCount,
				activities: activities.totalCount
			}
		};
	} catch (error) {
		console.error('❌ Failed to load HR dashboard data:', error);

		// Return empty dashboard data on error
		return {
			employees: [],
			departments: [],
			tasks: [],
			announcements: [],
			recentActivities: [],
			pendingLeaves: [],
			stats: {
				totalEmployees: 0,
				totalDepartments: 0,
				activeTasks: 0,
				pendingLeaves: 0,
				recentActivities: 0,
				activeAnnouncements: 0
			},
			recentEmployees: [],
			upcomingTasks: [],
			totalCounts: {
				employees: 0,
				tasks: 0,
				leaves: 0,
				announcements: 0,
				activities: 0
			},
			error: 'Failed to load dashboard data'
		};
	}
};
