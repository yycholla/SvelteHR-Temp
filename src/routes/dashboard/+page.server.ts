// Dashboard Overview - Server-Side Data Loading
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

	try {
		// Check backend services are ready before proceeding
		const backendReady = await ensureBackendReady();

		// If backend is not ready, return error state but don't crash
		if (!backendReady) {
			console.warn('Backend not ready for main dashboard');
			return {
				user: {
					id: locals.user.id,
					email: locals.user.email || '',
					displayName: locals.user.display_name || 'User',
					role: locals.user.role || 'employee',
					firstName: locals.user.first_name,
					lastName: locals.user.last_name
				},
				userSession: {
					userId: locals.user.id,
					userEmail: locals.user.email || '',
					role: locals.user.role || 'employee',
					accessToken: cookies.get('hr_token') || cookies.get('auth-token') || ''
				},
				dashboardMetrics: [],
				recentActivities: [],
				upcomingEvents: [],
				quickActions: [],
				notifications: [],
				preferences: {
					selectedPeriod: url.searchParams.get('period') || 'week',
					viewMode: url.searchParams.get('view') || 'overview',
					theme: 'light',
					showWelcome: true
				},
				permissions: locals.permissions || [],
				canManageUsers: false,
				canViewReports: false,
				canApproveLeave: false,
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

		// Extract any URL parameters
		const selectedPeriod = url.searchParams.get('period') || 'week';
		const viewMode = url.searchParams.get('view') || 'overview';

		// Real database GraphQL queries for dashboard overview
		const usersQuery = `
			query GetUsers {
				allUsers(first: 20) {
					totalCount
					nodes {
						id
						firstName
						lastName
						isActive
					}
				}
			}
		`;

		const departmentsQuery = `
			query GetDepartments {
				allDepartments(first: 10) {
					totalCount
					nodes {
						id
						name
					}
				}
			}
		`;

		// Query for user's attendance records (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const attendanceQuery = `
			query GetUserAttendance($userId: UUID!) {
				allAttendanceRecords(
					condition: { userId: $userId }
					orderBy: [DATE_DESC]
					first: 30
				) {
					totalCount
					nodes {
						id
						date
						clockIn
						clockOut
						hoursWorked
						status
					}
				}
			}
		`;

		// Query for user's leave requests
		const leaveRequestsQuery = `
			query GetUserLeaveRequests($userId: UUID!) {
				allLeaveRequests(
					condition: { employeeId: $userId }
					orderBy: [START_DATE_DESC]
					first: 10
				) {
					totalCount
					nodes {
						id
						leaveType
						startDate
						endDate
						daysRequested
						status
						createdAt
					}
				}
			}
		`;

		// Query for user's goals
		const goalsQuery = `
			query GetUserGoals($userId: UUID!) {
				allEmployeeGoals(
					condition: { employeeId: $userId }
					orderBy: [ID_DESC]
					first: 10
				) {
					totalCount
					nodes {
						id
						title
						description
						status
						targetDate
						createdAt
					}
				}
			}
		`;

		// Query for user's tasks
		const tasksQuery = `
			query GetUserTasks($userId: UUID!) {
				allTasks(
					condition: { assignedTo: $userId }
					orderBy: [DUE_DATE_ASC]
					first: 10
				) {
					totalCount
					nodes {
						id
						title
						description
						status
						priority
						dueDate
						category
						createdAt
					}
				}
			}
		`;

		// Query for upcoming events (user is attending or public events)
		const eventsQuery = `
			query GetUpcomingEvents($userId: UUID!) {
				allEvents(
					condition: { status: "scheduled" }
					orderBy: [START_DATE_ASC]
					first: 10
				) {
					totalCount
					nodes {
						id
						title
						description
						type
						startDate
						endDate
						allDay
						location
						isPublic
						color
						organizerByOrganizerId {
							id
							firstName
							lastName
						}
						eventAttendeesByEventId(condition: { employeeId: $userId }) {
							nodes {
								responseStatus
								isRequired
							}
						}
					}
				}
			}
		`;

		// Query for recent activity logs
		const activityLogsQuery = `
			query GetRecentActivities($userId: UUID!) {
				allActivityLogs(
					condition: { userId: $userId }
					orderBy: [CREATED_AT_DESC]
					first: 20
				) {
					totalCount
					nodes {
						id
						action
						resourceType
						resourceId
						details
						createdAt
						employeeByEmployeeId {
							id
							firstName
							lastName
						}
					}
				}
			}
		`;

		console.log('🔍 Dashboard: Starting database GraphQL queries for user:', locals.user.id);
		const startQueryTime = Date.now();
		const [usersResult, departmentsResult, attendanceResult, leaveResult, goalsResult, tasksResult, eventsResult, activityLogsResult] = await Promise.allSettled([
			graphqlClient.query(usersQuery),
			graphqlClient.query(departmentsQuery),
			graphqlClient.query(attendanceQuery, { userId: locals.user.id }),
			graphqlClient.query(leaveRequestsQuery, { userId: locals.user.id }),
			graphqlClient.query(goalsQuery, { userId: locals.user.id }),
			graphqlClient.query(tasksQuery, { userId: locals.user.id }),
			graphqlClient.query(eventsQuery, { userId: locals.user.id }),
			graphqlClient.query(activityLogsQuery, { userId: locals.user.id })
		]);
		const queryDuration = Date.now() - startQueryTime;
		console.log(`✅ Dashboard: GraphQL queries completed in ${queryDuration}ms`);

		// Handle potential GraphQL errors
		if (usersResult.status === 'rejected' || departmentsResult.status === 'rejected') {
			console.error('❌ Dashboard GraphQL query failed:', {
				users: usersResult.status === 'rejected' ? usersResult.reason : 'success',
				departments: departmentsResult.status === 'rejected' ? departmentsResult.reason : 'success'
			});
		} else {
			console.log('✅ Dashboard: Both GraphQL queries succeeded');
		}

		// Extract data with fallbacks
		const users = usersResult.status === 'fulfilled' && usersResult.value.data?.allUsers?.nodes || [];
		const departments = departmentsResult.status === 'fulfilled' && departmentsResult.value.data?.allDepartments?.nodes || [];
		const allAttendanceRecords = attendanceResult.status === 'fulfilled' && attendanceResult.value.data?.allAttendanceRecords?.nodes || [];
		const leaveRequests = leaveResult.status === 'fulfilled' && leaveResult.value.data?.allLeaveRequests?.nodes || [];
		const goals = goalsResult.status === 'fulfilled' && goalsResult.value.data?.allEmployeeGoals?.nodes || [];
		const tasks = tasksResult.status === 'fulfilled' && tasksResult.value.data?.allTasks?.nodes || [];
		const events = eventsResult.status === 'fulfilled' && eventsResult.value.data?.allEvents?.nodes || [];
		const activityLogs = activityLogsResult.status === 'fulfilled' && activityLogsResult.value.data?.allActivityLogs?.nodes || [];

		// Filter attendance records to last 30 days (client-side filtering)
		const attendanceRecords = allAttendanceRecords.filter(record => {
			const recordDate = new Date(record.date);
			return recordDate >= thirtyDaysAgo;
		});

		console.log('📊 Dashboard: Extracted data:', {
			users: users.length,
			departments: departments.length,
			attendance: attendanceRecords.length,
			leaves: leaveRequests.length,
			goals: goals.length,
			tasks: tasks.length,
			events: events.length,
			activityLogs: activityLogs.length
		});

		// Determine user role and permissions
		const userRole = locals.user.role || 'employee';
		const isAdmin = locals.roles?.includes('super_admin') || locals.roles?.includes('admin') || false;
		const isManager = locals.roles?.includes('manager') || false;
		const isHR = locals.roles?.includes('hr_manager') || false;

		// Calculate real metrics from database
		const startDataGeneration = Date.now();

		// Calculate attendance rate from real data
		const totalAttendanceDays = attendanceRecords.length;
		const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
		const attendanceRate = totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 0;

		// Count pending leave requests
		const pendingLeaveRequests = leaveRequests.filter(r => r.status === 'pending').length;

		// Count pending/in-progress goals as tasks
		const pendingTasks = goals.filter(g => g.status === 'in_progress' || g.status === 'pending').length;

		// Calculate remaining vacation days (sum approved + pending leave days)
		const usedVacationDays = leaveRequests
			.filter(r => r.leaveType === 'vacation' && (r.status === 'approved' || r.status === 'pending'))
			.reduce((sum, r) => sum + (r.daysRequested || 0), 0);
		const totalVacationDays = 20; // TODO: Get from user's time_off_balances table
		const remainingVacationDays = Math.max(0, totalVacationDays - usedVacationDays);

		// Generate role-specific dashboard data
		const dashboardMetrics = generateDashboardMetrics(userRole, users, departments, {
			attendanceRate,
			pendingRequests: pendingLeaveRequests,
			taskCount: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
			remainingVacationDays
		});
		const recentActivities = generateRecentActivitiesFromLogs(activityLogs, leaveRequests, attendanceRecords, goals, tasks, events, 10);
		const upcomingEvents = generateUpcomingEventsFromDatabase(events, 5);
		const quickActions = generateQuickActions(userRole, users);
		const notifications = generateNotifications(userRole, 3); // Still mock for now
		const dataGenDuration = Date.now() - startDataGeneration;
		console.log(`📊 Dashboard: Data generation completed in ${dataGenDuration}ms`);

		// Role-specific content
		let roleSpecificData = {};

		if (isAdmin) {
			roleSpecificData = {
				systemHealth: {
					database: { status: 'healthy', responseTime: '45ms', connections: 23 },
					application: { uptime: '99.9%', memoryUsage: '68%', activeUsers: users.filter(u => u.isActive).length },
					backup: { lastBackup: '2 hours ago', status: 'completed', nextScheduled: 'in 22 hours' }
				},
				pendingApprovals: {
					leaveRequests: Math.floor(users.length * 0.08),
					performanceReviews: Math.floor(users.length * 0.12),
					total: Math.floor(users.length * 0.20)
				}
			};
		} else if (isManager) {
			const teamMembers = users.filter(u =>
				departments.find(d => d.managerId === locals.user.id && d.id === u.departmentId)
			);

			roleSpecificData = {
				teamMetrics: {
					teamSize: teamMembers.length,
					productivity: Math.floor(85 + Math.random() * 15), // 85-100%
					satisfaction: Math.floor(80 + Math.random() * 20), // 80-100%
					performance: Math.floor(88 + Math.random() * 12) // 88-100%
				},
				teamMembers: teamMembers.slice(0, 10).map(member => ({
					id: member.id,
					name: `${member.firstName} ${member.lastName}`,
					email: member.email,
					status: member.isActive ? 'active' : 'inactive',
					department: departments.find(d => d.id === member.departmentId)?.name || 'Unknown'
				}))
			};
		}

		console.log('🎉 Dashboard: Successfully returning data');

		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || `${locals.user.first_name || ''} ${locals.user.last_name || ''}`.trim() || 'User',
				role: userRole,
				firstName: locals.user.first_name,
				lastName: locals.user.last_name
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: userRole,
				accessToken: cookies.get('hr_token') || cookies.get('auth-token') || ''
			},
			dashboardData: {
				metrics: {
					attendanceRate, // Real attendance rate from database
					pendingRequests: pendingLeaveRequests, // Real pending leave requests
					taskCount: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length, // Real pending tasks
					remainingVacationDays // Real calculated vacation days
				},
				activities: recentActivities.slice(0, 5).map(activity => ({
					message: activity.title,
					timestamp: activity.timestamp,
					type: activity.type === 'leave_request' ? 'warning' : 'success'
				})),
				tasks: tasks
					.filter(t => t.status === 'pending' || t.status === 'in_progress')
					.slice(0, 5)
					.map(task => task.title), // Real tasks from database
				events: upcomingEvents.slice(0, 4).map(event => ({
					title: event.title,
					time: event.time,
					type: event.type
				}))
			},
			dashboardMetrics,
			recentActivities,
			upcomingEvents,
			quickActions,
			notifications,
			...roleSpecificData,
			preferences: {
				selectedPeriod,
				viewMode,
				theme: 'light',
				showWelcome: true
			},
			permissions: locals.permissions || [],
			canManageUsers: isAdmin || isHR,
			canViewReports: isAdmin || isHR || isManager,
			canApproveLeave: isAdmin || isHR || isManager,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('Error loading dashboard:', err);

		// Extract URL parameters for error response
		const selectedPeriod = url.searchParams.get('period') || 'week';
		const viewMode = url.searchParams.get('view') || 'overview';

		// Return error state instead of throwing to prevent page crash
		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName: locals.user.display_name || 'User',
				role: locals.user.role || 'employee',
				firstName: locals.user.first_name,
				lastName: locals.user.last_name
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: locals.user.role || 'employee',
				accessToken: cookies.get('hr_token') || cookies.get('auth-token') || ''
			},
			dashboardMetrics: [],
			recentActivities: [],
			upcomingEvents: [],
			quickActions: [],
			notifications: [],
			preferences: {
				selectedPeriod,
				viewMode,
				theme: 'light',
				showWelcome: true
			},
			permissions: locals.permissions || [],
			canManageUsers: false,
			canViewReports: false,
			canApproveLeave: false,
			loadedAt: new Date().toISOString(),
			error: {
				message: 'Unable to load dashboard. Please try again later.',
				details: err instanceof Error ? err.message : 'Unknown error',
				retryable: true
			}
		};
	}
};

// Helper function to generate dashboard metrics based on role and real data
function generateDashboardMetrics(role: string, users: any[], departments: any[], realMetrics: {
	attendanceRate: number;
	pendingRequests: number;
	taskCount: number;
	remainingVacationDays: number;
}) {
	const activeUsers = users.filter(u => u.isActive);

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

	if (role === 'super_admin' || role === 'admin' || role === 'hr_manager') {
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

	if (role === 'manager') {
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
				trend: realMetrics.attendanceRate >= 90 ? 'up' : 'stable' as const,
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
			trend: realMetrics.attendanceRate >= 90 ? 'up' : 'stable' as const,
			icon: 'Award',
			color: 'purple'
		}
	];
}

// Helper function to generate recent activities from real data
function generateRecentActivities(
	role: string,
	leaveRequests: any[],
	attendanceRecords: any[],
	goals: any[],
	limit: number
) {
	const activities: any[] = [];

	// Convert leave requests to activities
	leaveRequests.slice(0, limit).forEach(leave => {
		activities.push({
			id: `leave-${leave.id}`,
			title: `Leave request ${leave.status}`,
			description: `${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate}`,
			icon: 'Calendar',
			color: leave.status === 'approved' ? 'green' : leave.status === 'pending' ? 'orange' : 'red',
			type: 'leave_request',
			timestamp: leave.createdAt,
			user: { id: 'user', name: 'You' }
		});
	});

	// Convert attendance records to activities
	attendanceRecords.slice(0, Math.min(3, limit)).forEach(attendance => {
		activities.push({
			id: `attendance-${attendance.id}`,
			title: `Clocked ${attendance.status}`,
			description: `Worked ${attendance.hoursWorked || 0} hours on ${attendance.date}`,
			icon: 'Clock',
			color: attendance.status === 'present' ? 'green' : 'orange',
			type: 'attendance',
			timestamp: attendance.clockIn || attendance.date,
			user: { id: 'user', name: 'You' }
		});
	});

	// Convert goals to activities
	goals.slice(0, Math.min(2, limit)).forEach(goal => {
		activities.push({
			id: `goal-${goal.id}`,
			title: `Goal: ${goal.title}`,
			description: goal.description || 'No description',
			icon: 'Target',
			color: goal.status === 'completed' ? 'green' : 'blue',
			type: 'goal',
			timestamp: goal.createdAt,
			user: { id: 'user', name: 'You' }
		});
	});

	// Sort by timestamp (most recent first) and limit
	return activities
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		.slice(0, limit);
}

// Helper function to generate recent activities from activity_logs table
function generateRecentActivitiesFromLogs(
	activityLogs: any[],
	leaveRequests: any[],
	attendanceRecords: any[],
	goals: any[],
	tasks: any[],
	events: any[],
	limit: number
) {
	const activities: any[] = [];

	// Process activity logs (most authoritative source)
	activityLogs.forEach(log => {
		const actionMap: Record<string, { title: string; icon: string; color: string }> = {
			create: { title: 'created', icon: 'Plus', color: 'green' },
			update: { title: 'updated', icon: 'Edit', color: 'blue' },
			delete: { title: 'deleted', icon: 'Trash', color: 'red' },
			approve: { title: 'approved', icon: 'CheckCircle', color: 'green' },
			reject: { title: 'rejected', icon: 'XCircle', color: 'red' },
			submit: { title: 'submitted', icon: 'Send', color: 'blue' }
		};

		const actionInfo = actionMap[log.action] || { title: log.action, icon: 'Activity', color: 'gray' };

		activities.push({
			id: `log-${log.id}`,
			title: `${actionInfo.title} ${log.resourceType.replace('_', ' ')}`,
			description: log.details?.description || `${log.resourceType} ${log.action}`,
			icon: actionInfo.icon,
			color: actionInfo.color,
			type: 'activity_log',
			timestamp: log.createdAt,
			user: log.employeeByEmployeeId
				? {
						id: log.employeeByEmployeeId.id,
						name: `${log.employeeByEmployeeId.firstName} ${log.employeeByEmployeeId.lastName}`
					}
				: { id: 'system', name: 'System' }
		});
	});

	// Supplement with recent leave requests if activity logs are sparse
	if (activities.length < limit) {
		leaveRequests.slice(0, Math.min(3, limit - activities.length)).forEach(leave => {
			activities.push({
				id: `leave-${leave.id}`,
				title: `Leave request ${leave.status}`,
				description: `${leave.leaveType} leave from ${leave.startDate} to ${leave.endDate}`,
				icon: 'Calendar',
				color: leave.status === 'approved' ? 'green' : leave.status === 'pending' ? 'orange' : 'red',
				type: 'leave_request',
				timestamp: leave.createdAt,
				user: { id: 'user', name: 'You' }
			});
		});
	}

	// Supplement with recent tasks if still sparse
	if (activities.length < limit && tasks.length > 0) {
		tasks.slice(0, Math.min(2, limit - activities.length)).forEach(task => {
			activities.push({
				id: `task-${task.id}`,
				title: `Task: ${task.title}`,
				description: task.description || 'No description',
				icon: 'CheckSquare',
				color: task.status === 'completed' ? 'green' : task.priority === 'high' ? 'red' : 'blue',
				type: 'task',
				timestamp: task.createdAt,
				user: { id: 'user', name: 'You' }
			});
		});
	}

	// Supplement with upcoming events if still sparse
	if (activities.length < limit && events.length > 0) {
		events.slice(0, Math.min(2, limit - activities.length)).forEach(event => {
			activities.push({
				id: `event-${event.id}`,
				title: `Event: ${event.title}`,
				description: event.description || event.location || 'No description',
				icon: 'Calendar',
				color: 'purple',
				type: 'event',
				timestamp: event.createdAt,
				user: { id: 'user', name: 'You' }
			});
		});
	}

	// Sort by timestamp (most recent first) and limit
	return activities
		.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
		.slice(0, limit);
}

// Helper function to generate upcoming events from real database data
function generateUpcomingEventsFromDatabase(events: any[], limit: number) {
	const now = new Date();

	// Filter and transform events
	return events
		.filter(event => {
			const startDate = new Date(event.startDate);
			return startDate >= now && event.status === 'scheduled';
		})
		.slice(0, limit)
		.map(event => {
			const startDate = new Date(event.startDate);
			const endDate = new Date(event.endDate);

			// Format time for display
			const timeStr = event.allDay
				? 'All Day'
				: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

			// Map event type to icon
			const iconMap = {
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
				type: event.type,
				date: event.startDate,
				time: timeStr,
				location: event.location || 'TBD',
				icon: iconMap[event.type as keyof typeof iconMap] || 'Calendar',
				color: event.color || '#3B82F6',
				priority: event.type === 'review' || event.type === 'interview' ? 'high' : 'medium',
				organizer: event.organizerByOrganizerId
					? `${event.organizerByOrganizerId.firstName} ${event.organizerByOrganizerId.lastName}`
					: 'Unknown',
				isPublic: event.isPublic
			};
		});
}

// Helper function to generate quick actions based on role
function generateQuickActions(role: string, users: any[]) {
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

	if (role === 'admin' || role === 'hr_manager') {
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

	if (role === 'manager') {
		return [
			...baseActions,
			{
				id: 'approve_leave',
				title: 'Approve Leave',
				description: 'Review pending leave requests',
				icon: 'CheckCircle',
				href: '/dashboard/management/leave-approvals',
				color: 'orange',
				count: Math.floor(users.length * 0.1)
			},
			{
				id: 'team_goals',
				title: 'Team Goals',
				description: 'Track team goals and performance',
				icon: 'Target',
				href: '/dashboard/management/goals',
				color: 'purple'
			}
		];
	}

	return baseActions;
}

// Helper function to generate notifications
function generateNotifications(role: string, limit: number) {
	const notifications = [];

	const notificationTypes = role === 'admin'
		? ['system', 'approval', 'alert', 'info']
		: role === 'manager'
		? ['approval', 'team', 'deadline', 'info']
		: ['personal', 'reminder', 'update', 'info'];

	for (let i = 0; i < limit; i++) {
		const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
		const isRead = Math.random() > 0.3; // 70% read, 30% unread

		notifications.push({
			id: `notification-${i + 1}`,
			type,
			title: `Notification ${i + 1}`,
			message: `Sample ${type} notification message`,
			isRead,
			createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
			priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
		});
	}

	return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}