import { gql } from '@urql/core';

/**
 * GraphQL Queries for Dashboard
 *
 * Updated for Rust backend (async-graphql) schema
 * Note: Many dashboard-specific aggregation queries need backend implementation
 * For now, using basic queries with client-side calculations
 */

// =============================================================================
// BASIC QUERIES - Using Rust Backend
// =============================================================================

/**
 * Get users for dashboard
 * Backend: Uses users from Rust GraphQL schema
 */
export const GET_USERS_QUERY = gql`
	query GetUsers($limit: Int = 100, $offset: Int = 0) {
		users(limit: $limit, offset: $offset) {
			id
			email
			displayName
			firstName
			lastName
			jobTitle
			departmentId
			department {
				id
				name
			}
			role
			createdAt
			updatedAt
		}
	}
`;

export const GET_EMPLOYEES_QUERY = GET_USERS_QUERY; // Alias for compatibility

/**
 * Get departments for dashboard
 * Backend: Uses departments from Rust GraphQL schema
 */
export const GET_DEPARTMENTS_QUERY = gql`
	query GetDepartments($limit: Int = 100, $offset: Int = 0) {
		departments(limit: $limit, offset: $offset) {
			id
			name
			description
			createdAt
			updatedAt
		}
	}
`;

/**
 * Get recent activities for dashboard
 * Backend: Uses activityLogs from Rust GraphQL schema
 */
export const GET_RECENT_ACTIVITIES = gql`
	query GetRecentActivities($limit: Int = 10, $offset: Int = 0) {
		activityLogs(limit: $limit, offset: $offset) {
			id
			action
			resourceType
			resourceId
			userId
			ipAddress
			userAgent
			createdAt
			metadata
		}
	}
`;
export const GET_RECENT_ACTIVITIES_QUERY = GET_RECENT_ACTIVITIES;

/**
 * Get user attendance records
 * Backend: Uses attendanceRecords from Rust GraphQL schema
 */
export const GET_USER_ATTENDANCE_QUERY = gql`
	query GetUserAttendance(
		$employeeId: UUID!
		$startDate: String
		$endDate: String
		$limit: Int = 30
	) {
		attendanceRecords(
			employeeId: $employeeId
			startDate: $startDate
			endDate: $endDate
			limit: $limit
			offset: 0
		) {
			id
			employeeId
			date
			status
			clockInTime
			clockOutTime
			totalHours
			notes
			createdAt
			updatedAt
		}
	}
`;

/**
 * Get user leave requests
 * Backend: Uses leaveRequests from Rust GraphQL schema
 */
export const GET_USER_LEAVE_REQUESTS_QUERY = gql`
	query GetUserLeaveRequests($employeeId: UUID, $limit: Int = 50) {
		leaveRequests(employeeId: $employeeId, limit: $limit, offset: 0) {
			id
			employeeId
			managerId
			leaveType
			startDate
			endDate
			daysRequested
			status
			reason
			managerComments
			createdAt
			updatedAt
		}
	}
`;

/**
 * Get user goals
 * Backend: Uses employeeGoals from Rust GraphQL schema
 */
export const GET_USER_GOALS_QUERY = gql`
	query GetUserGoals($employeeId: UUID!, $limit: Int = 50) {
		employeeGoals(employeeId: $employeeId, limit: $limit, offset: 0) {
			id
			employeeId
			title
			description
			targetDate
			progress
			status
			priority
			quarter
			year
			createdAt
			updatedAt
			completedAt
		}
	}
`;

/**
 * Get user tasks
 * Backend: Uses tasks from Rust GraphQL schema
 */
export const GET_USER_TASKS_QUERY = gql`
	query GetUserTasks($filter: TaskFilter, $limit: Int = 10) {
		tasks(filter: $filter, limit: $limit, offset: 0) {
			id
			title
			description
			status
			priority
			dueDate
			assigneeId
			createdAt
			updatedAt
		}
	}
`;

/**
 * Get system audit logs
 * Backend: Uses activityLogs from Rust GraphQL schema
 */
export const GET_SYSTEM_AUDIT_LOGS_QUERY = gql`
	query GetSystemAuditLogs($limit: Int = 20) {
		activityLogs(limit: $limit, offset: 0) {
			id
			action
			resourceType
			resourceId
			userId
			ipAddress
			userAgent
			metadata
			createdAt
		}
	}
`;

/**
 * Get rollback requests
 * Backend: Uses rollbackRequests from Rust GraphQL schema
 */
export const GET_ROLLBACK_REQUESTS_QUERY = gql`
	query GetRollbackRequests($limit: Int = 50) {
		rollbackRequests(limit: $limit, offset: 0) {
			id
			entityType
			entityId
			status
			requestedBy
			approvedBy
			reason
			snapshotData
			createdAt
			updatedAt
			approvedAt
		}
	}
`;

/**
 * Get rollback request count
 * Backend: Uses rollbackRequestsCount from Rust GraphQL schema
 */
export const GET_ROLLBACK_STATS_QUERY = gql`
	query GetRollbackStats {
		rollbackRequestsCount
	}
`;

/**
 * Get events for dashboard
 * Backend: Uses events from Rust GraphQL schema
 */
export const GET_UPCOMING_EVENTS = gql`
	query GetDashboardUpcomingEvents($limit: Int = 10) {
		events(limit: $limit, offset: 0) {
			id
			title
			description
			eventType
			startDate
			endDate
			location
			isAllDay
			organizerId
			createdAt
		}
	}
`;
export const GET_UPCOMING_EVENTS_QUERY = GET_UPCOMING_EVENTS;

/**
 * Get notifications summary
 * Backend: Uses notifications from Rust GraphQL schema
 */
export const GET_NOTIFICATIONS_SUMMARY = gql`
	query GetNotificationsSummary($userId: UUID!, $limit: Int = 5) {
		notifications(userId: $userId, unreadOnly: false, limit: $limit, offset: 0) {
			id
			userId
			title
			message
			type
			priority
			isRead
			actionUrl
			createdAt
		}
	}
`;

// =============================================================================
// DASHBOARD-SPECIFIC QUERIES - NEED BACKEND IMPLEMENTATION
// =============================================================================

/**
 * NOTE: The following queries use custom backend endpoints that don't exist
 * in the current Rust GraphQL schema. These need to be:
 * 1. Implemented in the Rust backend, OR
 * 2. Calculated client-side from basic queries above
 *
 * For now, these are commented out and marked for future implementation.
 */

/*
export const GET_DASHBOARD_STATS = gql`
	query GetDashboardStats {
		dashboardStats {
			totalEmployees
			activeEmployees
			totalDepartments
			pendingLeaveRequests
			recentHires
			upcomingReviews
			lastUpdated
		}
	}
`;

export const GET_DASHBOARD_ANALYTICS = gql`
	query GetDashboardAnalytics($period: String = "30d") {
		analytics(period: $period) {
			employeeGrowth {
				date
				count
				change
			}
			departmentDistribution {
				department
				count
				percentage
			}
			leaveAnalytics {
				approved
				pending
				rejected
				total
			}
			performanceMetrics {
				averageRating
				completedReviews
				pendingReviews
			}
		}
	}
`;

export const GET_EMPLOYEE_QUICK_STATS = gql`
	query GetEmployeeQuickStats {
		employeeStats {
			newThisMonth
			birthdaysThisMonth
			workAnniversaries
			onLeaveToday
			remoteWorkingToday
		}
	}
`;

export const GET_DEPARTMENT_PERFORMANCE = gql`
	query GetDepartmentPerformance {
		departments(limit: 100, offset: 0) {
			id
			name
			# Need backend fields: employeeCount, averageRating, budgetUtilization, activeProjects
		}
	}
`;

export const GET_PENDING_APPROVALS = gql`
	query GetPendingApprovals($userId: UUID!) {
		pendingApprovals(managerId: $userId) {
			leaveRequests {
				id
				employeeName
				leaveType
				startDate
				endDate
				reason
				submittedAt
			}
			expenseReports {
				id
				employeeName
				amount
				category
				submittedAt
			}
			performanceReviews {
				id
				employeeName
				reviewPeriod
				dueDate
				status
			}
		}
	}
`;

export const GET_MY_DASHBOARD = gql`
	query GetMyDashboard($userId: UUID!) {
		myDashboard(userId: $userId) {
			profile {
				id
				displayName
				department
				jobTitle
				manager
				avatar
			}
			leaveBalance {
				annual
				sick
				personal
				used
				remaining
			}
			upcomingEvents {
				meetings
				reviews
				deadlines
			}
			recentActivities {
				id
				type
				description
				date
			}
			notifications {
				id
				message
				type
				isRead
				createdAt
			}
		}
	}
`;

export const GET_TEAM_DASHBOARD = gql`
	query GetTeamDashboard($managerId: UUID!) {
		teamDashboard(managerId: $managerId) {
			teamMembers {
				id
				name
				role
				status
				lastActive
			}
			teamMetrics {
				productivity
				satisfaction
				turnover
				performance
			}
			upcomingDeadlines {
				id
				task
				assignee
				dueDate
				priority
			}
			leaveCalendar {
				date
				employees {
					id
					name
					leaveType
				}
			}
		}
	}
`;

export const GET_SYSTEM_HEALTH = gql`
	query GetSystemHealth {
		systemHealth {
			database {
				status
				responseTime
				connections
			}
			application {
				uptime
				memoryUsage
				cpuUsage
				activeUsers
			}
			backup {
				lastBackup
				status
				nextScheduled
			}
			integrations {
				name
				status
				lastSync
			}
		}
	}
`;

export const GET_DASHBOARD_CONFIG = gql`
	query GetDashboardConfig($userId: UUID!) {
		dashboardConfig(userId: $userId) {
			id
			layout
			widgets {
				id
				type
				title
				configuration
				position {
					x
					y
					width
					height
				}
				isVisible
				permissions
			}
			theme
			refreshInterval
			autoRefresh
			showWelcome
			compactMode
		}
	}
`;
*/

// =============================================================================
// CLIENT-SIDE HELPER FUNCTIONS
// =============================================================================

/**
 * Response types for basic queries
 */
export interface User {
	id: string;
	email: string;
	displayName: string;
	firstName: string;
	lastName: string;
	jobTitle: string | null;
	departmentId: string | null;
	department?: {
		id: string;
		name: string;
	} | null;
	role: string;
	createdAt: string;
	updatedAt: string;
}

export interface Department {
	id: string;
	name: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DashboardStats {
	totalEmployees: number;
	activeEmployees: number;
	totalDepartments: number;
	pendingLeaveRequests: number;
	recentHires: number;
	upcomingReviews: number;
	lastUpdated: string;
}

/**
 * Calculate dashboard statistics from basic queries (client-side)
 */
export function calculateDashboardStats(data: {
	users: User[];
	departments: Department[];
	leaveRequests: any[];
	performanceReviews: any[];
}): DashboardStats {
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const totalEmployees = data.users.length;
	const activeEmployees = data.users.filter((u) => u.role !== 'inactive').length;
	const totalDepartments = data.departments.length;

	const pendingLeaveRequests = data.leaveRequests.filter(
		(lr) => lr.status.toLowerCase() === 'pending'
	).length;

	const recentHires = data.users.filter((u) => new Date(u.createdAt) >= thirtyDaysAgo).length;

	const upcomingReviews = data.performanceReviews.filter((pr) => {
		const status = pr.status.toLowerCase();
		return status === 'scheduled' || status === 'in_progress';
	}).length;

	return {
		totalEmployees,
		activeEmployees,
		totalDepartments,
		pendingLeaveRequests,
		recentHires,
		upcomingReviews,
		lastUpdated: now.toISOString()
	};
}

/**
 * Calculate department distribution (client-side)
 */
export function calculateDepartmentDistribution(users: User[]): {
	department: string;
	count: number;
	percentage: number;
}[] {
	const total = users.length;
	const deptCounts: Record<string, number> = {};

	users.forEach((user) => {
		const deptName = user.department?.name || 'Unassigned';
		deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
	});

	return Object.entries(deptCounts).map(([department, count]) => ({
		department,
		count,
		percentage: total > 0 ? Math.round((count / total) * 100) : 0
	}));
}

/**
 * Calculate leave analytics (client-side)
 */
export function calculateLeaveAnalytics(leaveRequests: any[]): {
	approved: number;
	pending: number;
	rejected: number;
	total: number;
} {
	const approved = leaveRequests.filter((lr) => lr.status.toLowerCase() === 'approved').length;
	const pending = leaveRequests.filter((lr) => lr.status.toLowerCase() === 'pending').length;
	const rejected = leaveRequests.filter((lr) => lr.status.toLowerCase() === 'rejected').length;

	return {
		approved,
		pending,
		rejected,
		total: leaveRequests.length
	};
}

/**
 * Calculate performance metrics (client-side)
 */
export function calculatePerformanceMetrics(performanceReviews: any[]): {
	averageRating: number;
	completedReviews: number;
	pendingReviews: number;
} {
	const completedReviews = performanceReviews.filter(
		(pr) => pr.status.toLowerCase() === 'completed'
	);

	const ratingsSum = completedReviews.reduce((sum, pr) => sum + (pr.overallRating || 0), 0);
	const averageRating = completedReviews.length > 0 ? ratingsSum / completedReviews.length : 0;

	const pendingReviews = performanceReviews.filter((pr) => {
		const status = pr.status.toLowerCase();
		return status === 'pending' || status === 'in_progress' || status === 'scheduled';
	}).length;

	return {
		averageRating: Math.round(averageRating * 10) / 10,
		completedReviews: completedReviews.length,
		pendingReviews
	};
}

/**
 * Get employee quick stats (client-side)
 */
export function calculateEmployeeQuickStats(users: User[]): {
	newThisMonth: number;
	birthdaysThisMonth: number;
	workAnniversaries: number;
	onLeaveToday: number;
	remoteWorkingToday: number;
} {
	const now = new Date();
	const currentMonth = now.getMonth();
	const currentYear = now.getFullYear();
	const firstOfMonth = new Date(currentYear, currentMonth, 1);

	const newThisMonth = users.filter((u) => {
		const createdDate = new Date(u.createdAt);
		return createdDate >= firstOfMonth;
	}).length;

	// Note: birthdaysThisMonth, workAnniversaries, onLeaveToday, remoteWorkingToday
	// require additional data not available in basic user query
	// These should be calculated with additional queries or backend support

	return {
		newThisMonth,
		birthdaysThisMonth: 0, // Requires birthday field
		workAnniversaries: 0, // Requires hire date field
		onLeaveToday: 0, // Requires leave request cross-reference
		remoteWorkingToday: 0 // Requires attendance/location data
	};
}

/**
 * Filter pending approvals for a manager (client-side)
 */
export function filterPendingApprovals(
	leaveRequests: any[],
	performanceReviews: any[],
	managerId: string
) {
	const pendingLeaveRequests = leaveRequests.filter(
		(lr) => lr.managerId === managerId && lr.status.toLowerCase() === 'pending'
	);

	const pendingPerformanceReviews = performanceReviews.filter((pr) => {
		const status = pr.status.toLowerCase();
		return (
			pr.reviewerId === managerId &&
			(status === 'pending' || status === 'in_progress' || status === 'scheduled')
		);
	});

	return {
		leaveRequests: pendingLeaveRequests,
		performanceReviews: pendingPerformanceReviews,
		expenseReports: [] // Not implemented in current backend
	};
}

/**
 * Sort activities by date (newest first)
 */
export function sortActivitiesByDate<T extends { createdAt: string }>(activities: T[]): T[] {
	return [...activities].sort((a, b) => {
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
}
