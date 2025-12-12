// Dashboard Overview - Server-Side Data Loading
// Implements proper PostGraphile GraphQL queries with backend initialization

import type { PageServerLoad } from './$types';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { ensureBackendReady } from '$lib/server/backend-init';
import { logger } from '$lib/utils/logger';
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
} from './dashboard-types';
import {
	generateDashboardMetrics,
	generateQuickActions,
	generateRecentActivitiesFromLogs,
	generateUpcomingEventsFromDatabase
} from './dashboard-utils';

export const load: PageServerLoad = async (event) => {
	// Initialize RBAC loader (no specific permissions required for dashboard, just auth)
	const loader = new RBACDataLoader(event, []);

	return loader.loadWithClient(async (client) => {
		const { locals, url } = event;
		if (!locals.user) return {}; // Should be handled by RBACDataLoader/requireAuth but for TS safety

		// CRITICAL: Prevent browser-level caching of dashboard data
		event.setHeaders({
			'Cache-Control': 'private, no-cache, no-store, must-revalidate',
			Pragma: 'no-cache',
			Expires: '0'
		});

		// Get standardized user permissions (computed by loader)
		const userPerms = loader['permissions'];

		// Get user ID safely
		const userId = locals.user.id;

		// Fetch weather data from wttr.in as a promise (non-blocking)
		const weatherPromise = fetch('https://wttr.in/Boise?format=3', {
			headers: { 'User-Agent': 'SvelteHR-Dashboard' }
		})
			.then((response) => (response.ok ? response.text() : null))
			.catch((err) => {
				logger.warn('Failed to fetch weather', { error: err });
				return null;
			});

		// Extract URL parameters
		const params = new QueryParamExtractor(url);
		const selectedPeriod = params.getString('period', 'week');
		const viewMode = params.getString('view', 'overview');

		try {
			// Check backend services are ready before proceeding
			const backendReady = await ensureBackendReady();

			// If backend is not ready, return error state but don't crash
			if (!backendReady) {
				logger.warn('Backend not ready for main dashboard');
				// Return minimal structure compatible with the new pattern
				return {
					user: {
						id: userId,
						email: locals.user.email || '',
						displayName: locals.user.display_name || 'User',
						roles: locals.roles || [],
						firstName: locals.user.first_name,
						lastName: locals.user.last_name
					},
					userSession: {
						userId: userId,
						userEmail: locals.user.email || '',
						roles: locals.roles || [],
						accessToken: ''
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
					userPerms,
					canManageUsers: false,
					canViewReports: false,
					canApproveLeave: false,
					weatherPromise,
					error: {
						message: 'Backend services are initializing. Please try again in a moment.',
						details: 'Backend initialization in progress',
						retryable: true
					}
				};
			}

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

			// Query for upcoming events
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

			logger.debug('Dashboard starting database GraphQL queries', { userId });

			// Determine user roles for conditional queries
			const userRoles = locals.roles || [];
			const isAdmin = userRoles.includes('Admin') || false;
			const isSuperAdmin = userRoles.includes('Admin') || false;

			// **STREAMING PATTERN**: Await critical data immediately, stream slow data as promises
			const startQueryTime = Date.now();

			// Use the UnifiedGraphQLClient.getClient() to access underlying urql for low-level control if needed
			// or just use query() method which returns a promise
			// Since we want Promise.allSettled behavior and UnifiedGraphQLClient.query throws on error,
			// we need to wrap the calls or accept that a critical query failure aborts the dashboard.
			// For critical data, aborting is usually correct.

			const [usersData, departmentsData] = await Promise.all([
				client.query(usersQuery),
				client.query(departmentsQuery)
			]);

			const criticalDuration = Date.now() - startQueryTime;
			logger.info('Dashboard: Critical queries completed', { duration: criticalDuration });

			// Extract critical data immediately
			const users: User[] = usersData?.users || [];
			const departments: Department[] = departmentsData?.departments || [];

			// Stream slow queries as promises
			// Note: We use client.query() which returns promises directly
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
				// Note: UnifiedGraphQLClient returns the data object directly on success
				const allAttendanceRecords: AttendanceRecord[] =
					(attendanceResult.status === 'fulfilled' &&
						attendanceResult.value?.attendanceRecords) ||
					[];
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

				// Extract admin-only data
				let systemAuditLogs: SystemAuditLog[] = [];
				if (isAdmin && results[6]) {
					const systemAuditResult = results[6];
					systemAuditLogs = ((systemAuditResult.status === 'fulfilled' &&
						systemAuditResult.value?.activityLogs) ||
						[]) as SystemAuditLog[];
				}

				// Declare super_admin-only variables before use
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

				// Filter attendance records to last 30 days
				const attendanceRecords = allAttendanceRecords.filter((record) => {
					const recordDate = new Date(record.date);
					return recordDate >= thirtyDaysAgo;
				});

				// Calculate real metrics from database
				const totalAttendanceDays = attendanceRecords.length;
				const presentDays = attendanceRecords.filter((r) => r.status === 'present').length;
				const attendanceRate =
					totalAttendanceDays > 0 ? Math.round((presentDays / totalAttendanceDays) * 100) : 0;

				const pendingLeaveRequests = leaveRequests.filter((r) => r.status === 'pending').length;

				const pendingTasks = goals.filter(
					(g) => g.status === 'in_progress' || g.status === 'pending'
				).length;

				const usedVacationDays = leaveRequests
					.filter(
						(r) =>
							r.leaveType?.name === 'vacation' && (r.status === 'approved' || r.status === 'pending')
					)
					.reduce((sum, r) => sum + (r.daysRequested || 0), 0);
				const totalVacationDays = 20;
				const remainingVacationDays = Math.max(0, totalVacationDays - usedVacationDays);

				// Generate role-specific dashboard data
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

				const isManager = locals.roles?.includes('manager') || false;

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
						departments.find((d) => d.managerId === userId && d.id === u.departmentId)
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
							taskCount: tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS')
								.length,
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

			const isManager = locals.roles?.includes('manager') || false;
			const isHR = locals.roles?.includes('hr_manager') || false;

					return {
						user: {
							id: userId,
							email: locals.user.email || '',
							displayName:
								locals.user.display_name ||
								`${locals.user.first_name || ''} ${locals.user.last_name || ''}`.trim() ||
								'User',
							roles: userRoles,
							firstName: locals.user.first_name,
							lastName: locals.user.last_name
						},
						userSession: {
							userId: userId,
							userEmail: locals.user.email || '',
							roles: userRoles,
							accessToken: ''
						},				preferences: {
					selectedPeriod,
					viewMode,
					theme: 'light',
					showWelcome: true
				},
				userPerms,
				canManageUsers: isAdmin || isHR,
				canViewReports: isAdmin || isHR || isManager,
				canApproveLeave: isAdmin || isHR || isManager,
				isAdmin,
				isSuperAdmin,
				weatherPromise,
				dashboardDataPromise
			};
		} catch (err) {
			logger.error('Error loading dashboard', err instanceof Error ? err : new Error(String(err)));

					return {
						user: {
							id: userId,
							email: locals.user.email || '',
							displayName: locals.user.display_name || 'User',
							roles: locals.roles || [],
							firstName: locals.user.first_name,
							lastName: locals.user.last_name
						},
						userSession: {
							userId: userId,
							userEmail: locals.user.email || '',
							roles: locals.roles || [],
							accessToken: ''
						},				dashboardData: {
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
					selectedPeriod: 'week',
					viewMode: 'overview',
					theme: 'light',
					showWelcome: true
				},
				userPerms,
				canManageUsers: false,
				canViewReports: false,
				canApproveLeave: false,
				weatherPromise,
				error: {
					message: 'Unable to load dashboard. Please try again later.',
					details: err instanceof Error ? err.message : 'Unknown error',
					retryable: true
				}
			};
		}
	});
};
