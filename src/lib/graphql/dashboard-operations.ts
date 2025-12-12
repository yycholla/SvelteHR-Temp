/**
 * Dashboard GraphQL Operations for PostGraphile HR Application
 *
 * GraphQL queries and mutations for dashboard functionality including
 * analytics, metrics, recent activities, and overview data.
 */

import { gql } from '@urql/core';

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
 * Update dashboard preferences
 */
export const UPDATE_DASHBOARD_PREFERENCES = gql`
	mutation UpdateDashboardPreferences($input: UpdateDashboardPreferencesInput!) {
		updateDashboardPreferences(input: $input) {
			preferences {
				id
				userId
				layout
				widgets
				refreshInterval
				theme
				notifications
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mark notification as read
 */
export const MARK_NOTIFICATION_READ = gql`
	mutation MarkDashboardNotificationRead($input: MarkNotificationReadInput!) {
		markNotificationRead(input: $input) {
			notification {
				id
				isRead
				readAt
			}
			clientMutationId
		}
	}
`;

/**
 * Dismiss notification
 */
export const DISMISS_NOTIFICATION = gql`
	mutation DismissNotification($input: DismissNotificationInput!) {
		dismissNotification(input: $input) {
			notification {
				id
				isDismissed
				dismissedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Create dashboard widget
 */
export const CREATE_DASHBOARD_WIDGET = gql`
	mutation CreateDashboardWidget($input: CreateDashboardWidgetInput!) {
		createDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Update dashboard widget
 */
export const UPDATE_DASHBOARD_WIDGET = gql`
	mutation UpdateDashboardWidget($input: UpdateDashboardWidgetInput!) {
		updateDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Delete dashboard widget
 */
export const DELETE_DASHBOARD_WIDGET = gql`
	mutation DeleteDashboardWidget($input: DeleteDashboardWidgetInput!) {
		deleteDashboardWidget(input: $input) {
			widget {
				id
			}
			clientMutationId
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

/**
 * Real-time dashboard updates subscription (if WebSocket support is added)
 */
export const DASHBOARD_UPDATES_SUBSCRIPTION = gql`
	subscription DashboardUpdates($userId: UUID!) {
		dashboardUpdates(userId: $userId) {
			type
			data
			timestamp
			priority
		}
	}
`;

/**
 * Dashboard widget types and configurations
 */
export const DASHBOARD_WIDGET_TYPES = {
	STATS_OVERVIEW: 'stats_overview',
	RECENT_ACTIVITIES: 'recent_activities',
	TEAM_PERFORMANCE: 'team_performance',
	LEAVE_CALENDAR: 'leave_calendar',
	PENDING_APPROVALS: 'pending_approvals',
	NOTIFICATIONS: 'notifications',
	QUICK_ACTIONS: 'quick_actions',
	ANALYTICS_CHART: 'analytics_chart',
	EMPLOYEE_BIRTHDAYS: 'employee_birthdays',
	SYSTEM_HEALTH: 'system_health',
	DEPARTMENT_METRICS: 'department_metrics',
	CUSTOM: 'custom'
} as const;

/**
 * Default dashboard layouts by role
 */
export const DEFAULT_DASHBOARD_LAYOUTS = {
	ADMIN: {
		widgets: [
			{ type: 'stats_overview', position: { x: 0, y: 0, width: 4, height: 2 } },
			{ type: 'system_health', position: { x: 4, y: 0, width: 4, height: 2 } },
			{ type: 'recent_activities', position: { x: 0, y: 2, width: 6, height: 3 } },
			{ type: 'pending_approvals', position: { x: 6, y: 2, width: 2, height: 3 } }
		]
	},
	HR_MANAGER: {
		widgets: [
			{ type: 'stats_overview', position: { x: 0, y: 0, width: 3, height: 2 } },
			{ type: 'department_metrics', position: { x: 3, y: 0, width: 3, height: 2 } },
			{ type: 'pending_approvals', position: { x: 6, y: 0, width: 2, height: 2 } },
			{ type: 'leave_calendar', position: { x: 0, y: 2, width: 4, height: 3 } },
			{ type: 'employee_birthdays', position: { x: 4, y: 2, width: 4, height: 3 } }
		]
	},
	MANAGER: {
		widgets: [
			{ type: 'team_performance', position: { x: 0, y: 0, width: 4, height: 2 } },
			{ type: 'pending_approvals', position: { x: 4, y: 0, width: 2, height: 2 } },
			{ type: 'leave_calendar', position: { x: 0, y: 2, width: 3, height: 3 } },
			{ type: 'recent_activities', position: { x: 3, y: 2, width: 3, height: 3 } }
		]
	},
	EMPLOYEE: {
		widgets: [
			{ type: 'notifications', position: { x: 0, y: 0, width: 3, height: 2 } },
			{ type: 'quick_actions', position: { x: 3, y: 0, width: 3, height: 2 } },
			{ type: 'leave_calendar', position: { x: 0, y: 2, width: 6, height: 3 } }
		]
	}
} as const;

/**
 * TypeScript Types for Dashboard Components
 */
export interface DashboardMetric {
	id: string;
	title: string;
	value: string | number;
	change?: number;
	trend?: 'up' | 'down' | 'stable';
	icon?: string;
	color?: string;
}

export interface ActivityItem {
	id: string;
	type: 'leave_request' | 'employee_update' | 'system_event' | 'review' | 'goal';
	title: string;
	description: string;
	timestamp: string;
	user?: {
		id: string;
		name: string;
		avatar?: string;
	};
	severity?: 'low' | 'medium' | 'high';
	actionUrl?: string;
}

export interface UpcomingEvent {
	id: string;
	title: string;
	description?: string;
	date: string;
	time?: string;
	type: 'meeting' | 'deadline' | 'review' | 'birthday' | 'anniversary';
	priority: 'low' | 'medium' | 'high';
	attendees?: string[];
	location?: string;
}
