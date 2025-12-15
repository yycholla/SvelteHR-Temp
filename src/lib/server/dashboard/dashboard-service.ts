import { logger } from '$lib/utils/logger';
import {
	generateDashboardMetrics,
	generateQuickActions,
	generateRecentActivitiesFromLogs,
	generateUpcomingEventsFromDatabase
} from '$lib/utils/dashboard';
import type {
	ActivityLog,
	ApiEvent,
	AttendanceRecord,
	Department,
	EmployeeGoal,
	LeaveRequest,
	RollbackRequest,
	RollbackStats,
	SystemAuditLog,
	Task,
	User
} from '$lib/types/dashboard';
import {
	usersQuery,
	departmentsQuery,
	attendanceQuery,
	leaveRequestsQuery,
	goalsQuery,
	tasksQuery,
	eventsQuery,
	activityLogsQuery,
	systemAuditLogsQuery,
	rollbackRequestsQuery,
	rollbackStatsQuery
} from './dashboard-queries';

interface DashboardDataParams {
	client: any;
	userId: string;
	userRoles: string[];
	isAdmin: boolean;
	isSuperAdmin: boolean;
	isManager: boolean;
}

export async function fetchDashboardData({
	client,
	userId,
	userRoles,
	isAdmin,
	isSuperAdmin,
	isManager
}: DashboardDataParams) {
	const startQueryTime = Date.now();

	// Critical queries
	const [usersData, departmentsData] = await Promise.all([
		client.query(usersQuery),
		client.query(departmentsQuery)
	]);

	const criticalDuration = Date.now() - startQueryTime;
	logger.info('Dashboard: Critical queries completed', { duration: criticalDuration });

	const users: User[] = usersData?.users || [];
	const departments: Department[] = departmentsData?.departments || [];

	// Date calculations
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const now = new Date();
	const oneMonthLater = new Date(now);
	oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

	// Stream slow queries
	const dashboardDataPromise = Promise.allSettled([
		client.query(attendanceQuery, { userId }),
		client.query(leaveRequestsQuery),
		client.query(goalsQuery, { userId }),
		client.query(tasksQuery, { filter: { assigneeId: userId } }),
		client.query(eventsQuery, {
			startTimeAfter: now.toISOString(),
			startTimeBefore: oneMonthLater.toISOString()
		}),
		client.query(activityLogsQuery, { userId }),
		...(isAdmin ? [client.query(systemAuditLogsQuery)] : []),
		...(isSuperAdmin
			? [client.query(rollbackRequestsQuery), client.query(rollbackStatsQuery)]
			: [])
	]).then((results) => {
		const queryDuration = Date.now() - startQueryTime;
		logger.info('Dashboard: All queries completed', { duration: queryDuration });

		const [
			attendanceResult,
			leaveResult,
			goalsResult,
			tasksResult,
			eventsResult,
			activityLogsResult
		] = results;

		const allAttendanceRecords: AttendanceRecord[] =
			(attendanceResult.status === 'fulfilled' && attendanceResult.value?.attendanceRecords) || [];
		const leaveRequests: LeaveRequest[] =
			(leaveResult.status === 'fulfilled' && leaveResult.value?.leaveRequests) || [];
		const goals: EmployeeGoal[] =
			(goalsResult.status === 'fulfilled' && goalsResult.value?.employeeGoals) || [];
		const tasks: Task[] =
			(tasksResult.status === 'fulfilled' && tasksResult.value?.tasks) || [];
		const events = ((eventsResult.status === 'fulfilled' && eventsResult.value?.events) ||
			[]) as ApiEvent[];
		const activityLogs = ((activityLogsResult.status === 'fulfilled' &&
			activityLogsResult.value?.activityLogs) ||
			[]) as ActivityLog[];

		// Admin data
		let systemAuditLogs: SystemAuditLog[] = [];
		if (isAdmin && results[6]) {
			const systemAuditResult = results[6];
			systemAuditLogs = ((systemAuditResult.status === 'fulfilled' &&
				systemAuditResult.value?.activityLogs) ||
				[]) as SystemAuditLog[];
		}

		// Super Admin data
		let rollbackRequests: RollbackRequest[] = [];
		let rollbackStats: RollbackStats | null = null;

		if (isSuperAdmin) {
			if (results[7]) {
				const rollbackRequestsResult = results[7];
				rollbackRequests = ((rollbackRequestsResult.status === 'fulfilled' &&
					rollbackRequestsResult.value?.rollbackRequests) ||
					[]) as RollbackRequest[];
			}
			if (results[8]) {
				const rollbackStatsResult = results[8];
				if (rollbackStatsResult.status === 'fulfilled') {
					const totalCount = rollbackStatsResult.value?.rollbackRequestsCount || 0;
					rollbackStats = {
						rollbackRequestsCount: totalCount
					};
				}
			}
		}

		// Process metrics
		const attendanceRecords = allAttendanceRecords.filter((record) => {
			const recordDate = new Date(record.date);
			return recordDate >= thirtyDaysAgo;
		});

		const totalAttendanceDays = attendanceRecords.length;
		const presentDays = attendanceRecords.filter((r) => r.status === 'present').length;
		const attendanceRate =
			totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 0;

		const pendingLeaveRequests = leaveRequests.filter((r) => r.status === 'pending').length;

		const usedVacationDays = leaveRequests
			.filter(
				(r) =>
					r.leaveType?.name === 'vacation' && (r.status === 'approved' || r.status === 'pending')
			)
			.reduce((sum, r) => sum + (r.daysRequested || 0), 0);
		const totalVacationDays = 20;
		const remainingVacationDays = Math.max(0, totalVacationDays - usedVacationDays);

		const dashboardMetrics = generateDashboardMetrics(userRoles, users, departments, {
			attendanceRate,
			pendingRequests: pendingLeaveRequests,
			taskCount: tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length,
			remainingVacationDays
		});

		const recentActivities = generateRecentActivitiesFromLogs(
			activityLogs,
			leaveRequests,
			attendanceRecords,
			goals,
			tasks,
			events,
			10
		);

		const upcomingEvents = generateUpcomingEventsFromDatabase(events, userId, 5);
		const quickActions = generateQuickActions(userRoles, users);

		let roleSpecificData = {};

		if (isAdmin) {
			roleSpecificData = {
				systemHealth: {
					database: { status: 'healthy', responseTime: '45ms', connections: 23 },
					application: {
						uptime: '99.9%',
						memoryUsage: '68%',
						activeUsers: users.filter((u) => u.isActive).length
					},
					backup: {
						lastBackup: '2 hours ago',
						status: 'completed',
						nextScheduled: 'in 22 hours'
					}
				},
				pendingApprovals: {
					leaveRequests: Math.floor(users.length * 0.08),
					performanceReviews: Math.floor(users.length * 0.12),
					total: Math.floor(users.length * 0.2)
				}
			};
		} else if (isManager) {
			const teamMembers = users.filter((u) =>
				departments.find((d) => d.managerId === userId && d.id === u.departmentId)
			);

			roleSpecificData = {
				teamMetrics: {
					teamSize: teamMembers.length,
					productivity: Math.floor(85 + Math.random() * 15),
					satisfaction: Math.floor(80 + Math.random() * 20),
					performance: Math.floor(88 + Math.random() * 12)
				},
				teamMembers: teamMembers.slice(0, 10).map((member) => ({
					id: member.id,
					name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown',
					email: member.email || 'no-email@example.com',
					status: member.isActive ? 'active' : 'inactive',
					department: departments.find((d) => d.id === member.departmentId)?.name || 'Unknown'
				}))
			};
		}

		return {
			dashboardData: {
				metrics: {
					attendanceRate,
					pendingRequests: pendingLeaveRequests,
					taskCount: tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length,
					completedTaskCount: tasks.filter((t) => t.status === 'DONE').length,
					totalTaskCount: tasks.length,
					remainingVacationDays
				},
				activities: recentActivities.slice(0, 5).map((activity) => ({
					message: activity.title,
					timestamp: activity.timestamp,
					type: activity.type === 'leave_request' ? 'warning' : 'success'
				})),
				tasks: tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').slice(0, 5),
				events: upcomingEvents.slice(0, 4).map((event) => ({
					id: event.id,
					title: event.title,
					date: event.date,
					time: event.time,
					type: event.type,
					rsvpStatus: event.rsvpStatus,
					location: event.location
				}))
			},
			dashboardMetrics,
			recentActivities,
			upcomingEvents,
			quickActions,
			...roleSpecificData,
			systemAuditLogs: isAdmin
				? systemAuditLogs.map((log) => ({
						id: log.id,
						employeeName: log.userByEmployeeId
							? `${log.userByEmployeeId.firstName} ${log.userByEmployeeId.lastName}`
							: 'System',
						action: log.action,
						resourceType: log.resourceType,
						resourceId: log.resourceId,
						isRollback: log.isRollback || false,
						createdAt: log.createdAt
					}))
				: [],
			rollbackRequests: isSuperAdmin
				? rollbackRequests.map((req) => ({
						id: req.id,
						requesterName: req.requester
							? `${req.requester.firstName} ${req.requester.lastName}`
							: 'Unknown',
						reason: req.reason || '',
						resourceType: req.entityType || 'unknown',
						status: req.status,
						createdAt: req.createdAt
					}))
				: [],
			rollbackStats: isSuperAdmin ? rollbackStats : null
		};
	});

	return { users, departments, dashboardDataPromise };
}
