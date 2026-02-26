import { GraphQLClient } from '$lib/server/graphql-client';
import type {
	ActivityLog,
	AttendanceRecord,
	DashboardDepartment,
	DashboardUser,
	EmployeeGoal,
	LeaveRequest,
	Task
} from '$lib/types/dashboard';
import {
	GET_DEPARTMENTS_QUERY,
	GET_RECENT_ACTIVITIES_QUERY,
	GET_ROLLBACK_REQUESTS_QUERY,
	GET_ROLLBACK_STATS_QUERY,
	GET_SYSTEM_AUDIT_LOGS_QUERY,
	GET_UPCOMING_EVENTS_QUERY,
	GET_USERS_QUERY,
	GET_USER_ATTENDANCE_QUERY,
	GET_USER_GOALS_QUERY,
	GET_USER_LEAVE_REQUESTS_QUERY,
	GET_USER_TASKS_QUERY
} from '$lib/graphql/dashboard/queries';

export class DashboardService {
	private client: GraphQLClient;
	private userId: string;
	private isAdmin: boolean;
	private isSuperAdmin: boolean;

	constructor(client: GraphQLClient, userId: string, roles: string[] = []) {
		this.client = client;
		this.userId = userId;
		this.isAdmin = roles.includes('Admin');
		this.isSuperAdmin = roles.includes('Admin'); // Assuming Admin implies SuperAdmin for now or simplified logic
	}

	async getCriticalData() {
		const [usersResult, departmentsResult] = await Promise.allSettled([
			this.client.query(GET_USERS_QUERY),
			this.client.query(GET_DEPARTMENTS_QUERY)
		]);

		return {
			users:
				(usersResult.status === 'fulfilled' &&
					(usersResult.value.data?.users as DashboardUser[])) ||
				[],
			departments:
				(departmentsResult.status === 'fulfilled' &&
					(departmentsResult.value.data?.departments?.items as DashboardDepartment[])) ||
				[]
		};
	}

	async getSlowData() {
		const now = new Date();
		const oneMonthLater = new Date(now);
		oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

		const promises = [
			this.client.query(GET_USER_ATTENDANCE_QUERY, { userId: this.userId }),
			this.client.query(GET_USER_LEAVE_REQUESTS_QUERY),
			this.client.query(GET_USER_GOALS_QUERY, { userId: this.userId }),
			this.client.query(GET_USER_TASKS_QUERY, { filter: { assigneeId: this.userId } }),
			this.client.query(GET_UPCOMING_EVENTS_QUERY, {
				startTimeAfter: now.toISOString(),
				startTimeBefore: oneMonthLater.toISOString()
			}),
			this.client.query(GET_RECENT_ACTIVITIES_QUERY, { userId: this.userId }),
			...(this.isAdmin ? [this.client.query(GET_SYSTEM_AUDIT_LOGS_QUERY)] : []),
			...(this.isSuperAdmin
				? [
						this.client.query(GET_ROLLBACK_REQUESTS_QUERY),
						this.client.query(GET_ROLLBACK_STATS_QUERY)
					]
				: [])
		];

		const results = await Promise.allSettled(promises);

		// Helper to extract data safely from results array
		// Note: The order must match the promises array
		let resultIndex = 0;
		const getResult = (idx: number) => results[idx];

		const attendanceResult = getResult(resultIndex++);
		const leaveResult = getResult(resultIndex++);
		const goalsResult = getResult(resultIndex++);
		const tasksResult = getResult(resultIndex++);
		const eventsResult = getResult(resultIndex++);
		const activityLogsResult = getResult(resultIndex++);

		// Optional admin results
		const systemAuditLogsResult = this.isAdmin ? getResult(resultIndex++) : null;
		const rollbackRequestsResult = this.isSuperAdmin ? getResult(resultIndex++) : null;
		const rollbackStatsResult = this.isSuperAdmin ? getResult(resultIndex++) : null;

		return {
			attendance:
				(attendanceResult?.status === 'fulfilled' &&
					(attendanceResult.value.data?.attendanceRecords as AttendanceRecord[])) ||
				[],
			leaveRequests:
				(leaveResult?.status === 'fulfilled' &&
					(leaveResult.value.data?.leaveRequests as LeaveRequest[])) ||
				[],
			goals:
				(goalsResult?.status === 'fulfilled' &&
					(goalsResult.value.data?.employeeGoals as EmployeeGoal[])) ||
				[],
			tasks:
				(tasksResult?.status === 'fulfilled' && (tasksResult.value.data?.tasks as Task[])) || [],
			events:
				(eventsResult?.status === 'fulfilled' && (eventsResult.value.data?.events as any[])) || [],
			activityLogs:
				(activityLogsResult?.status === 'fulfilled' &&
					(activityLogsResult.value.data?.activityLogs as ActivityLog[])) ||
				[],
			systemAuditLogs:
				(systemAuditLogsResult?.status === 'fulfilled' &&
					(systemAuditLogsResult.value.data?.activityLogs as ActivityLog[])) ||
				[],
			rollbackRequests:
				(rollbackRequestsResult?.status === 'fulfilled' &&
					(rollbackRequestsResult.value.data?.rollbackRequests as any[])) ||
				[],
			rollbackStats:
				(rollbackStatsResult?.status === 'fulfilled' &&
					rollbackStatsResult.value.data?.rollbackRequestsCount) ||
				0
		};
	}
}
