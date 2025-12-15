import { gql } from '@urql/core';
import { GET_EMPLOYEES_QUERY as GET_EMPLOYEES, GET_DEPARTMENTS_QUERY as GET_DEPARTMENTS } from '../employees/queries';

// Re-export with aliases expected by dashboard service
export const GET_USERS_QUERY = GET_EMPLOYEES;
export const GET_DEPARTMENTS_QUERY = GET_DEPARTMENTS;

/**
 * Get dashboard overview statistics
 */
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

/**
 * Get dashboard analytics data
 */
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

/**
 * Get recent activities for dashboard
 */
export const GET_RECENT_ACTIVITIES = gql`
	query GetRecentActivities($limit: Int = 10) {
		recentActivities(first: $limit, orderBy: CREATED_AT_DESC) {
			nodes {
				id
				activityType
				description
				userId
				userName
				createdAt
				metadata
				severity
			}
			totalCount
		}
	}
`;
export const GET_RECENT_ACTIVITIES_QUERY = GET_RECENT_ACTIVITIES;

/**
 * Get upcoming events and deadlines
 */
export const GET_UPCOMING_EVENTS = gql`
	query GetDashboardUpcomingEvents($days: Int = 30) {
		upcomingEvents(daysAhead: $days) {
			nodes {
				id
				eventType
				title
				description
				scheduledDate
				priority
				assignedTo
				department
				isCompleted
			}
			totalCount
		}
	}
`;
export const GET_UPCOMING_EVENTS_QUERY = GET_UPCOMING_EVENTS;

/**
 * Get employee quick stats for dashboard
 */
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

/**
 * Get department performance summary
 */
export const GET_DEPARTMENT_PERFORMANCE = gql`
	query GetDepartmentPerformance {
		allDepartments(orderBy: NAME_ASC) {
			nodes {
				id
				name
				employeeCount
				averageRating
				budgetUtilization
				activeProjects
				recentPerformance {
					month
					rating
					productivity
				}
			}
		}
	}
`;

/**
 * Get pending approvals for managers/HR
 */
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

/**
 * Get my dashboard data (employee view)
 */
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

/**
 * Get team dashboard data (manager view)
 */
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

/**
 * Get system health metrics (admin view)
 */
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

/**
 * Get notifications summary
 */
export const GET_NOTIFICATIONS_SUMMARY = gql`
	query GetNotificationsSummary($userId: UUID!) {
		notificationsSummary(userId: $userId) {
			unreadCount
			categories {
				type
				count
				lastReceived
			}
			recent(first: 5) {
				nodes {
					id
					title
					message
					type
					isRead
					createdAt
					actionUrl
				}
			}
		}
	}
`;

/**
 * Get dashboard configuration
 */
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

// =============================================================================
// Restored/Missing Queries for Dashboard Service
// =============================================================================

export const GET_USER_ATTENDANCE_QUERY = gql`
	query GetUserAttendance($userId: UUID!) {
		attendanceRecords(condition: { employeeId: $userId }, orderBy: DATE_DESC, first: 30) {
			nodes {
				id
				date
				status
				clockInTime
				clockOutTime
				totalHours
			}
		}
	}
`;

export const GET_USER_LEAVE_REQUESTS_QUERY = gql`
	query GetUserLeaveRequests($userId: UUID) {
		leaveRequests(condition: { employeeId: $userId }, orderBy: START_DATE_DESC) {
			nodes {
				id
				leaveType {
					name
				}
				startDate
				endDate
				status
				reason
			}
		}
	}
`;

export const GET_USER_GOALS_QUERY = gql`
	query GetUserGoals($userId: UUID!) {
		employeeGoals(condition: { employeeId: $userId }) {
			nodes {
				id
				goalTitle
				status
				progress
				dueDate
			}
		}
	}
`;

export const GET_USER_TASKS_QUERY = gql`
	query GetUserTasks($filter: TaskFilter) {
		tasks(filter: $filter, orderBy: DUE_DATE_ASC, first: 10) {
			nodes {
				id
				title
				status
				priority
				dueDate
			}
		}
	}
`;

export const GET_SYSTEM_AUDIT_LOGS_QUERY = gql`
	query GetSystemAuditLogs {
		activityLogs(orderBy: CREATED_AT_DESC, first: 20) {
			nodes {
				id
				action
				resourceType
				resourceId
				createdAt
				userByEmployeeId {
					id
					displayName
				}
			}
		}
	}
`;

export const GET_ROLLBACK_REQUESTS_QUERY = gql`
	query GetRollbackRequests {
		rollbackRequests(orderBy: CREATED_AT_DESC) {
			nodes {
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
	}
`;

export const GET_ROLLBACK_STATS_QUERY = gql`
	query GetRollbackStats {
		rollbackRequestsCount
	}
`;
