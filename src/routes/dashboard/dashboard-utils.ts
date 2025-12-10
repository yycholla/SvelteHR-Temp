// Dashboard Utility Functions

import type {
	User,
	Department,
	DashboardActivity,
	ActivityLog,
	LeaveRequest,
	AttendanceRecord,
	EmployeeGoal,
	Task,
	ApiEvent,
	DashboardEvent
} from './dashboard-types';

export function generateDashboardMetrics(
	roles: string[],
	users: User[],
	departments: Department[],
	realMetrics: {
		attendanceRate: number;
		pendingRequests: number;
		taskCount: number;
		remainingVacationDays: number;
	}
) {
	const activeUsers = users.filter((u) => u.isActive);

	const baseMetrics = [
		{
			id: 'total_employees',
			title: 'Total Employees',
			value: users.length,
			trend: 'stable' as const,
			icon: 'Users',
			color: 'blue'
		},
		{
			id: 'active_employees',
			title: 'Active Employees',
			value: activeUsers.length,
			trend: 'up' as const,
			icon: 'UserCheck',
			color: 'green'
		},
		{
			id: 'departments',
			title: 'Departments',
			value: departments.length,
			trend: 'stable' as const,
			icon: 'Building',
			color: 'purple'
		}
	];

	if (roles.includes('Admin') || roles.includes('HR Manager')) {
		return [
			...baseMetrics,
			{
				id: 'pending_requests',
				title: 'Pending Requests',
				value: realMetrics.pendingRequests,
				trend: 'stable' as const,
				icon: 'Clock',
				color: 'orange'
			}
		];
	}

	if (roles.includes('Manager') || roles.includes('HR Manager')) {
		return [
			{
				id: 'team_size',
				title: 'Team Members',
				value: Math.floor(users.length / Math.max(departments.length, 1)),
				trend: 'stable' as const,
				icon: 'Users',
				color: 'blue'
			},
			{
				id: 'attendance_rate',
				title: 'Attendance Rate',
				value: `${realMetrics.attendanceRate}%`,
				trend: realMetrics.attendanceRate >= 90 ? 'up' : ('stable' as const),
				icon: 'TrendingUp',
				color: 'green'
			},
			{
				id: 'pending_approvals',
				title: 'Pending Approvals',
				value: realMetrics.pendingRequests,
				trend: 'stable' as const,
				icon: 'CheckCircle',
				color: 'orange'
			}
		];
	}

	// Employee metrics with real data
	return [
		{
			id: 'leave_balance',
			title: 'Leave Balance',
			value: `${realMetrics.remainingVacationDays} days`,
			trend: 'stable' as const,
			icon: 'Calendar',
			color: 'blue'
		},
		{
			id: 'pending_tasks',
			title: 'Pending Tasks',
			value: realMetrics.taskCount,
			trend: 'stable' as const,
			icon: 'CheckSquare',
			color: 'green'
		},
		{
			id: 'attendance_rate',
			title: 'Attendance Rate',
			value: `${realMetrics.attendanceRate}%`,
			trend: realMetrics.attendanceRate >= 90 ? 'up' : ('stable' as const),
			icon: 'Award',
			color: 'purple'
		}
	];
}

export function generateRecentActivitiesFromLogs(
	activityLogs: ActivityLog[],
	leaveRequests: LeaveRequest[],
	attendanceRecords: AttendanceRecord[],
	goals: EmployeeGoal[],
	tasks: Task[],
	events: ApiEvent[],
	limit: number
): DashboardActivity[] {
	const activities: DashboardActivity[] = [];

	activityLogs.forEach((log) => {
		const actionMap: Record<string, { title: string; icon: string; color: string }> = {
			create: { title: 'created', icon: 'Plus', color: 'green' },
			update: { title: 'updated', icon: 'Edit', color: 'blue' },
			delete: { title: 'deleted', icon: 'Trash', color: 'red' },
			approve: { title: 'approved', icon: 'CheckCircle', color: 'green' },
			reject: { title: 'rejected', icon: 'XCircle', color: 'red' },
			submit: { title: 'submitted', icon: 'Send', color: 'blue' }
		};

		const actionInfo = actionMap[log.action] || {
			title: log.action,
			icon: 'Activity',
			color: 'gray'
		};

		activities.push({
			id: `log-${log.id}`,
			title: `${actionInfo.title} ${log.resourceType.replace('_', ' ')}`,
			description: (log.details?.description as string) || `${log.resourceType} ${log.action}`,
			icon: actionInfo.icon,
			color: actionInfo.color,
			type: 'activity_log',
			timestamp: log.createdAt,
			user: log.userByEmployeeId
				? {
						id: log.userByEmployeeId.id,
						name: `${log.userByEmployeeId.firstName} ${log.userByEmployeeId.lastName}`
					}
				: { id: 'system', name: 'System' }
		});
	});

	// Supplement with other data
	if (activities.length < limit) {
		leaveRequests.slice(0, Math.min(3, limit - activities.length)).forEach((leave) => {
			activities.push({
				id: `leave-${leave.id}`,
				title: `Leave request ${leave.status}`,
				description: `${leave.leaveType?.name || 'Unknown'} leave from ${leave.startDate} to ${leave.endDate}`,
				icon: 'Calendar',
				color:
					leave.status === 'approved' ? 'green' : leave.status === 'pending' ? 'orange' : 'red',
				type: 'leave_request',
				timestamp: leave.createdAt,
				user: { id: 'user', name: 'You' }
			});
		});
	}

	return activities
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		.slice(0, limit);
}

export function generateUpcomingEventsFromDatabase(
	events: ApiEvent[],
	userId: string,
	limit: number
): DashboardEvent[] {
	const now = new Date();
	const filtered = events.filter((event) => {
		const startTime = new Date(event.startTime);
		if (!(startTime >= now && event.status?.toUpperCase() === 'SCHEDULED')) return false;
		if (event.isPublic) return true;
		const userAttendee = event.attendees?.find((a) => a.employeeId === userId);
		if (!userAttendee || userAttendee.responseStatus === 'declined') return false;
		return true;
	});

	const sorted = filtered.sort((a, b) => {
		const startTimeA = new Date(a.startTime).getTime();
		const startTimeB = new Date(b.startTime).getTime();
		return startTimeA - startTimeB;
	});

	const limited = sorted.slice(0, limit);

	return limited.map((event) => {
		const startTime = new Date(event.startTime);
		const dateStr = startTime.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
		const timeStr = event.allDay
			? 'All Day'
			: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		const userAttendee = event.attendees?.find((a) => a.employeeId === userId);
		const rsvpStatus = userAttendee?.responseStatus || 'no_response';

		const iconMap: Record<string, string> = {
			meeting: 'Users',
			training: 'BookOpen',
			social: 'Coffee',
			company_event: 'Calendar',
			holiday: 'Sun',
			interview: 'UserCheck',
			review: 'Award',
			team_building: 'Users',
			other: 'Calendar'
		};

		return {
			id: event.id.toString(),
			title: event.title,
			description: event.description || '',
			type: event.eventType,
			date: dateStr,
			time: timeStr,
			location: event.location || 'TBD',
			icon: iconMap[event.eventType] || 'Calendar',
			color: event.color || '#3B82F6',
			priority: event.eventType === 'review' || event.eventType === 'interview' ? 'high' : 'medium',
			organizer: event.userByOrganizerId
				? `${event.userByOrganizerId.firstName} ${event.userByOrganizerId.lastName}`
				: 'Unknown',
			isPublic: event.isPublic,
			rsvpStatus
		};
	});
}

export function generateQuickActions(roles: string[], users: User[]) {
	const baseActions = [
		{
			id: 'view_profile',
			title: 'View Profile',
			description: 'View and edit your profile information',
			icon: 'User',
			href: '/dashboard/profile',
			color: 'blue'
		},
		{
			id: 'request_leave',
			title: 'Request Leave',
			description: 'Submit a new leave request',
			icon: 'Calendar',
			href: '/dashboard/leave/request',
			color: 'green'
		}
	];

	if (roles.includes('Admin') || roles.includes('HR Manager')) {
		return [
			...baseActions,
			{
				id: 'manage_employees',
				title: 'Manage Employees',
				description: 'View and manage employee records',
				icon: 'Users',
				href: '/dashboard/employees',
				color: 'purple',
				count: users.length
			},
			{
				id: 'analytics',
				title: 'View Analytics',
				description: 'Access detailed HR analytics',
				icon: 'BarChart',
				href: '/dashboard/admin/analytics',
				color: 'orange'
			}
		];
	}

	return baseActions;
}
