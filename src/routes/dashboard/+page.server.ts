// Dashboard Overview - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';
import { ensureBackendReady } from '$lib/server/backend-init';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { locals, url, cookies } = event;

	// Verify user is authenticated
	if (!locals.user?.id) {
		error(401, 'Authentication required');
	}

	// Fetch weather data from wttr.in as a promise (non-blocking)
	const weatherPromise = fetch('https://wttr.in/Boise?format=3', {
		headers: { 'User-Agent': 'SvelteHR-Dashboard' }
	})
		.then((response) => (response.ok ? response.text() : null))
		.catch((err) => {
			console.warn('Failed to fetch weather:', err);
			return null;
		});

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
					accessToken: '' // Session-based auth doesn't use access tokens
				},
				dashboardData: {
					metrics: {
						attendanceRate: 0,
						pendingRequests: 0,
						taskCount: 0,
						remainingVacationDays: 0
					},
					activities: [],
					tasks: [],
					events: []
				},
				dashboardMetrics: [],
				recentActivities: [],
				upcomingEvents: [],
				quickActions: [],
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
				weatherPromise,
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
				users(limit: 20) {
					id
					firstName
					lastName
					isActive
				}
			}
		`;

		const departmentsQuery = `
			query GetDepartments {
				departments(limit: 10) {
					id
					name
				}
			}
		`;

		// Query for user's attendance records (last 30 days)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const attendanceQuery = `
			query GetUserAttendance($userId: UUID!) {
				attendanceRecords(userId: $userId, limit: 30) {
					id
					date
					clockIn
					clockOut
					hoursWorked
					status
				}
			}
		`;

		// Query for user's leave requests
		const leaveRequestsQuery = `
			query GetUserLeaveRequests {
				leaveRequests(limit: 10) {
					id
					leaveType {
						id
						name
						color
					}
					startDate
					endDate
					daysRequested
					status
					createdAt
				}
			}
		`;

		// Query for user's goals
		const goalsQuery = `
			query GetUserGoals($userId: UUID!) {
				employeeGoals(employeeId: $userId, limit: 10) {
					id
					employeeId
					goalTitle
					goalDescription
					status
					targetDate
					createdAt
				}
			}
		`;

		// Query for user's tasks
		const tasksQuery = `
			query GetUserTasks($filter: TaskFilter!) {
				tasks(filter: $filter, limit: 10) {
					id
					title
					description
					status
					priority
					dueDate
					createdAt
				}
			}
		`;

		// Query for upcoming events (user is attending or public events)
		// Note: We fetch events for the next month and filter server-side to handle complex logic:
		// - Show public events
		// - Show events where user is invited
		// - Exclude events where user declined
		const now = new Date();
		const oneMonthLater = new Date(now);
		oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

		const eventsQuery = `
			query GetUpcomingEvents($startTimeAfter: DateTime!, $startTimeBefore: DateTime!) {
				events(startTimeAfter: $startTimeAfter, startTimeBefore: $startTimeBefore, limit: 20) {
					id
					title
					description
					eventType
					startTime
					endTime
					allDay
					location
					isPublic
					status
					color
					organizerId
					attendees {
						id
						employeeId
						responseStatus
					}
				}
			}
		`;

		// Query for recent activity logs
		const activityLogsQuery = `
			query GetRecentActivities($userId: UUID!) {
				activityLogs(userId: $userId, limit: 20) {
					id
					action
					resourceType
					resourceId
					details
					createdAt
				}
			}
		`;

		// Query for system-wide audit logs (admin only)
		const systemAuditLogsQuery = `
			query GetSystemAuditLogs {
				activityLogs(limit: 10) {
					id
					action
					resourceType
					resourceId
					details
					createdAt
				}
			}
		`;

		// Query for rollback requests (super_admin only)
		const rollbackRequestsQuery = `
			query GetRollbackRequests {
				rollbackRequests(limit: 5, offset: 0) {
					id
					entityType
					status
					reason
					createdAt
					requester {
						id
						firstName
						lastName
					}
				}
			}
		`;

		// Query for rollback statistics (super_admin only)
		const rollbackStatsQuery = `
			query GetRollbackStats {
				rollbackRequestsCount
			}
		`;

		logger.debug('Dashboard starting database GraphQL queries', { userId: locals.user.id });

		// Determine user role for conditional queries
		const userRole = locals.user.role || 'employee';
		const isAdmin =
			locals.roles?.includes('super_admin') || locals.roles?.includes('admin') || false;
		const isSuperAdmin = locals.roles?.includes('super_admin') || false;

		// **STREAMING PATTERN**: Await critical data immediately, stream slow data as promises
		// Critical: users, departments (needed for UI structure)
		// Streamable: tasks, events, activities (can load progressively)
		const startQueryTime = Date.now();

		const [usersResult, departmentsResult] = await Promise.allSettled([
			graphqlClient.query(usersQuery),
			graphqlClient.query(departmentsQuery)
		]);

		const criticalDuration = Date.now() - startQueryTime;
		console.log(`✅ Dashboard: Critical queries completed in ${criticalDuration}ms`);

		// Extract critical data immediately (needed for page structure)
		const users = (usersResult.status === 'fulfilled' && usersResult.value.data?.users) || [];
		const departments =
			(departmentsResult.status === 'fulfilled' && departmentsResult.value.data?.departments) || [];

		// Stream slow queries as promises (won't block page render)
		const dashboardDataPromise = Promise.allSettled([
			graphqlClient.query(attendanceQuery, { userId: locals.user.id }),
			graphqlClient.query(leaveRequestsQuery),
			graphqlClient.query(goalsQuery, { userId: locals.user.id }),
			graphqlClient.query(tasksQuery, { filter: { assigneeId: locals.user.id } }),
			graphqlClient.query(eventsQuery, {
				startTimeAfter: now.toISOString(),
				startTimeBefore: oneMonthLater.toISOString()
			}),
			graphqlClient.query(activityLogsQuery, { userId: locals.user.id }),
			...(isAdmin ? [graphqlClient.query(systemAuditLogsQuery)] : []),
			...(isSuperAdmin
				? [graphqlClient.query(rollbackRequestsQuery), graphqlClient.query(rollbackStatsQuery)]
				: [])
		]).then((results) => {
			const queryDuration = Date.now() - startQueryTime;
			console.log(`✅ Dashboard: All queries completed in ${queryDuration}ms`);

			// Extract results with proper indexing
			const [
				attendanceResult,
				leaveResult,
				goalsResult,
				tasksResult,
				eventsResult,
				activityLogsResult
			] = results;

			// Extract data with fallbacks
			const allAttendanceRecords =
				(attendanceResult.status === 'fulfilled' &&
					attendanceResult.value.data?.attendanceRecords) ||
				[];
			const leaveRequests =
				(leaveResult.status === 'fulfilled' && leaveResult.value.data?.leaveRequests) || [];
			const goals =
				(goalsResult.status === 'fulfilled' && goalsResult.value.data?.employeeGoals) || [];
			const tasks = (tasksResult.status === 'fulfilled' && tasksResult.value.data?.tasks) || [];
			const events = (eventsResult.status === 'fulfilled' && eventsResult.value.data?.events) || [];
			const activityLogs =
				(activityLogsResult.status === 'fulfilled' &&
					activityLogsResult.value.data?.activityLogs) ||
				[];

			console.log('📅 Dashboard: Raw events from GraphQL:', events.length);
			if (events.length > 0) {
				console.log('📅 First event sample:', {
					id: events[0].id,
					title: events[0].title,
					startTime: events[0].startTime,
					isPublic: events[0].isPublic,
					status: events[0].status,
					attendeesCount: events[0].attendees?.length || 0
				});
			}

			// Extract admin-only data
			let systemAuditLogs: any[] = [];
			if (isAdmin && results[6]) {
				const systemAuditResult = results[6];
				systemAuditLogs =
					(systemAuditResult.status === 'fulfilled' &&
						systemAuditResult.value.data?.activityLogs) ||
					[];
			}

			// Declare super_admin-only variables before use
			let rollbackRequests: any[] = [];
			let rollbackStats: any = null;

			if (isSuperAdmin) {
				if (results[7]) {
					const rollbackRequestsResult = results[7];
					rollbackRequests =
						(rollbackRequestsResult.status === 'fulfilled' &&
							rollbackRequestsResult.value.data?.rollbackRequests) ||
						[];
				}
				if (results[8]) {
					const rollbackStatsResult = results[8];
					if (rollbackStatsResult.status === 'fulfilled') {
						const totalCount = rollbackStatsResult.value.data?.rollbackRequestsCount || 0;
						rollbackStats = {
							pendingCount: totalCount, // Simplified - all requests shown as pending
							approvedCount: 0,
							rejectedCount: 0
						};
					}
				}
			}

			// Filter attendance records to last 30 days (client-side filtering)
			const attendanceRecords = allAttendanceRecords.filter((record) => {
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

			// User role already determined above, no need to redeclare
			const isManager = locals.roles?.includes('manager') || false;
			const isHR = locals.roles?.includes('hr_manager') || false;

			// Calculate real metrics from database
			const startDataGeneration = Date.now();

			// Calculate attendance rate from real data
			const totalAttendanceDays = attendanceRecords.length;
			const presentDays = attendanceRecords.filter((r) => r.status === 'present').length;
			const attendanceRate =
				totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 0;

			// Count pending leave requests
			const pendingLeaveRequests = leaveRequests.filter((r) => r.status === 'pending').length;

			// Count pending/in-progress goals as tasks
			const pendingTasks = goals.filter(
				(g) => g.status === 'in_progress' || g.status === 'pending'
			).length;

			// Calculate remaining vacation days (sum approved + pending leave days)
			const usedVacationDays = leaveRequests
				.filter(
					(r) =>
						r.leaveType?.name === 'vacation' && (r.status === 'approved' || r.status === 'pending')
				)
				.reduce((sum, r) => sum + (r.daysRequested || 0), 0);
			const totalVacationDays = 20; // TODO: Get from user's time_off_balances table
			const remainingVacationDays = Math.max(0, totalVacationDays - usedVacationDays);

			// Generate role-specific dashboard data
			const dashboardMetrics = generateDashboardMetrics(userRole, users, departments, {
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
			const upcomingEvents = generateUpcomingEventsFromDatabase(events, locals.user.id, 5);
			console.log(`📅 Dashboard: upcomingEvents after generation:`, upcomingEvents.length);
			if (upcomingEvents.length > 0) {
				console.log(`📅 First upcoming event:`, upcomingEvents[0]);
			}
			const quickActions = generateQuickActions(userRole, users);
			const dataGenDuration = Date.now() - startDataGeneration;
			console.log(`📊 Dashboard: Data generation completed in ${dataGenDuration}ms`);

			// Role-specific content
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
					departments.find((d) => d.managerId === locals.user.id && d.id === u.departmentId)
				);

				roleSpecificData = {
					teamMetrics: {
						teamSize: teamMembers.length,
						productivity: Math.floor(85 + Math.random() * 15), // 85-100%
						satisfaction: Math.floor(80 + Math.random() * 20), // 80-100%
						performance: Math.floor(88 + Math.random() * 12) // 88-100%
					},
					teamMembers: teamMembers.slice(0, 10).map((member) => ({
						id: member.id,
						name: `${member.firstName} ${member.lastName}`,
						email: member.email,
						status: member.isActive ? 'active' : 'inactive',
						department: departments.find((d) => d.id === member.departmentId)?.name || 'Unknown'
					}))
				};
			}

			console.log('🎉 Dashboard: Successfully processed streaming data');

			// Return all processed dashboard data
			return {
				dashboardData: {
					metrics: {
						attendanceRate, // Real attendance rate from database
						pendingRequests: pendingLeaveRequests, // Real pending leave requests
						taskCount: tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS')
							.length, // Real pending tasks
						completedTaskCount: tasks.filter((t) => t.status === 'DONE').length, // Completed tasks
						totalTaskCount: tasks.length, // Total tasks (for completion percentage)
						remainingVacationDays // Real calculated vacation days
					},
					activities: recentActivities.slice(0, 5).map((activity) => ({
						message: activity.title,
						timestamp: activity.timestamp,
						type: activity.type === 'leave_request' ? 'warning' : 'success'
					})),
					tasks: tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS').slice(0, 5), // Return full task objects
					events: (() => {
						const eventData = upcomingEvents.slice(0, 4).map((event) => ({
							id: event.id,
							title: event.title,
							date: event.date,
							time: event.time,
							type: event.type,
							rsvpStatus: event.rsvpStatus
						}));
						console.log(
							`📅 Dashboard: Final events data for frontend:`,
							eventData.length,
							eventData
						);
						return eventData;
					})()
				},
				dashboardMetrics,
				recentActivities,
				upcomingEvents,
				quickActions,
				...roleSpecificData,
				// Feature 020: Audit logging widgets (admin/super_admin only)
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

		console.log('🎉 Dashboard: Returning immediate data + streaming promise');

		// User role already determined above
		const isManager = locals.roles?.includes('manager') || false;
		const isHR = locals.roles?.includes('hr_manager') || false;

		// Return immediate data + streaming promise
		// SvelteKit will automatically stream the promise to the browser
		return {
			user: {
				id: locals.user.id,
				email: locals.user.email || '',
				displayName:
					locals.user.display_name ||
					`${locals.user.first_name || ''} ${locals.user.last_name || ''}`.trim() ||
					'User',
				role: userRole,
				firstName: locals.user.first_name,
				lastName: locals.user.last_name
			},
			userSession: {
				userId: locals.user.id,
				userEmail: locals.user.email || '',
				role: userRole,
				accessToken: '' // Session-based auth doesn't use access tokens
			},
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
			isAdmin,
			isSuperAdmin,
			weatherPromise,
			loadedAt: new Date().toISOString(),
			// STREAMING DATA: This promise will be streamed to the browser and resolved progressively
			// The dashboard component can use {#await} blocks to show loading states for individual widgets
			dashboardDataPromise
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
				accessToken: '' // Session-based auth doesn't use access tokens
			},
			dashboardData: {
				metrics: {
					attendanceRate: 0,
					pendingRequests: 0,
					taskCount: 0,
					remainingVacationDays: 0
				},
				activities: [],
				tasks: [],
				events: []
			},
			dashboardMetrics: [],
			recentActivities: [],
			upcomingEvents: [],
			quickActions: [],
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
			weatherPromise,
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
function generateDashboardMetrics(
	role: string,
	users: any[],
	departments: any[],
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
	leaveRequests.slice(0, limit).forEach((leave) => {
		activities.push({
			id: `leave-${leave.id}`,
			title: `Leave request ${leave.status}`,
			description: `${leave.leaveType?.name || 'Unknown'} leave from ${leave.startDate} to ${leave.endDate}`,
			icon: 'Calendar',
			color: leave.status === 'approved' ? 'green' : leave.status === 'pending' ? 'orange' : 'red',
			type: 'leave_request',
			timestamp: leave.createdAt,
			user: { id: 'user', name: 'You' }
		});
	});

	// Convert attendance records to activities
	attendanceRecords.slice(0, Math.min(3, limit)).forEach((attendance) => {
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
	goals.slice(0, Math.min(2, limit)).forEach((goal) => {
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
			description: log.details?.description || `${log.resourceType} ${log.action}`,
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

	// Supplement with recent leave requests if activity logs are sparse
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

	// Supplement with recent tasks if still sparse
	if (activities.length < limit && tasks.length > 0) {
		tasks.slice(0, Math.min(2, limit - activities.length)).forEach((task) => {
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
		events.slice(0, Math.min(2, limit - activities.length)).forEach((event) => {
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
function generateUpcomingEventsFromDatabase(events: any[], userId: string, limit: number) {
	const now = new Date();

	console.log('📅 generateUpcomingEventsFromDatabase called with:', {
		totalEvents: events.length,
		userId,
		limit,
		now: now.toISOString()
	});

	// Filter and transform events
	const filtered = events.filter((event) => {
		const startTime = new Date(event.startTime);

		console.log(`📅 Filtering event "${event.title}":`, {
			startTime: event.startTime,
			isFuture: startTime >= now,
			status: event.status,
			isPublic: event.isPublic,
			attendeesCount: event.attendees?.length || 0
		});

		// Event must be scheduled and in the future (case-insensitive check)
		if (!(startTime >= now && event.status?.toUpperCase() === 'SCHEDULED')) {
			console.log(`  ❌ Filtered out - not scheduled or not future (status: ${event.status})`);
			return false;
		}

		// Show public events
		if (event.isPublic) {
			console.log(`  ✅ Included - public event`);
			return true;
		}

		// Show events where user is invited (has attendee record)
		const userAttendee = event.attendees?.find((a: any) => a.employeeId === userId);
		if (!userAttendee) {
			console.log(`  ❌ Filtered out - user not invited`);
			return false; // User not invited
		}

		// Exclude events where user has declined
		if (userAttendee.responseStatus === 'declined') {
			console.log(`  ❌ Filtered out - user declined (status: ${userAttendee.responseStatus})`);
			return false;
		}

		console.log(`  ✅ Included - user invited with status: ${userAttendee.responseStatus}`);
		return true;
	});

	console.log(`📅 After filtering: ${filtered.length} events`);

	const sorted = filtered.sort((a, b) => {
		// Sort by proximity (soonest first)
		const startTimeA = new Date(a.startTime).getTime();
		const startTimeB = new Date(b.startTime).getTime();
		return startTimeA - startTimeB;
	});

	const limited = sorted.slice(0, limit);
	console.log(`📅 After limiting to ${limit}: ${limited.length} events`);

	return limited.map((event) => {
		const startTime = new Date(event.startTime);
		const endTime = new Date(event.endTime);

		// Format date for display
		const dateStr = startTime.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});

		// Format time for display
		const timeStr = event.allDay
			? 'All Day'
			: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

		// Get user's RSVP status
		const userAttendee = event.attendees?.find((a: any) => a.employeeId === userId);
		const rsvpStatus = userAttendee?.responseStatus || 'no_response';

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
			type: event.eventType,
			date: dateStr,
			time: timeStr,
			location: event.location || 'TBD',
			icon: iconMap[event.eventType as keyof typeof iconMap] || 'Calendar',
			color: event.color || '#3B82F6',
			priority: event.eventType === 'review' || event.eventType === 'interview' ? 'high' : 'medium',
			organizer: event.userByOrganizerId
				? `${event.userByOrganizerId.firstName} ${event.userByOrganizerId.lastName}`
				: 'Unknown',
			isPublic: event.isPublic,
			rsvpStatus: rsvpStatus
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
