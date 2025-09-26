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
	query GetUpcomingEvents($days: Int = 30) {
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
	mutation MarkNotificationRead($input: MarkNotificationReadInput!) {
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

/**
 * Helper Functions for Dashboard Data Processing
 */

/**
 * Get complete dashboard data based on user role and permissions
 */
export async function getCompleteDashboardData(userId: string, role: string = 'employee') {
	// This would typically make GraphQL calls and aggregate data
	// For now, return mock data structure that matches the expected interface

	const baseData = {
		user: { id: userId, role },
		metrics: await generateDashboardMetrics(role),
		activities: await generatePersonalActivity(userId, 10),
		tasks: await generatePersonalTasks(userId, 5),
		events: await generateUpcomingEvents(userId, 7)
	};

	// Add role-specific data
	if (role === 'admin' || role === 'hr_manager') {
		return {
			...baseData,
			systemHealth: await getSystemHealthMetrics(),
			pendingApprovals: await getPendingApprovalsCount(userId)
		};
	}

	if (role === 'manager') {
		return {
			...baseData,
			teamMetrics: await getTeamMetrics(userId),
			teamActivities: await getTeamActivities(userId)
		};
	}

	return baseData;
}

/**
 * Generate personal activity feed for a user
 */
export async function generatePersonalActivity(
	userId: string,
	limit: number = 10
): Promise<ActivityItem[]> {
	// Mock personal activities - in real implementation, this would query GraphQL
	const mockActivities: ActivityItem[] = [
		{
			id: '1',
			type: 'leave_request',
			title: 'Leave Request Approved',
			description: 'Your vacation leave for next week has been approved',
			timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
			severity: 'low'
		},
		{
			id: '2',
			type: 'review',
			title: 'Performance Review Scheduled',
			description: 'Annual review scheduled for next Friday',
			timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
			severity: 'medium'
		},
		{
			id: '3',
			type: 'system_event',
			title: 'Profile Updated',
			description: 'Contact information successfully updated',
			timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
			severity: 'low'
		}
	];

	return mockActivities.slice(0, limit);
}

/**
 * Generate personal tasks for a user
 */
export async function generatePersonalTasks(
	userId: string,
	limit: number = 5
): Promise<
	Array<{
		id: string;
		title: string;
		description?: string;
		dueDate?: string;
		priority: 'low' | 'medium' | 'high';
		completed: boolean;
		category?: string;
	}>
> {
	// Mock personal tasks - in real implementation, this would query GraphQL
	const mockTasks = [
		{
			id: '1',
			title: 'Complete Time Sheet',
			description: 'Submit timesheet for current week',
			dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
			priority: 'high' as const,
			completed: false,
			category: 'administrative'
		},
		{
			id: '2',
			title: 'Update Emergency Contacts',
			description: 'Review and update emergency contact information',
			dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			priority: 'medium' as const,
			completed: false,
			category: 'profile'
		},
		{
			id: '3',
			title: 'Complete Training Module',
			description: 'Finish cybersecurity awareness training',
			dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
			priority: 'medium' as const,
			completed: false,
			category: 'training'
		}
	];

	return mockTasks.slice(0, limit);
}

/**
 * Generate upcoming events for a user
 */
export async function generateUpcomingEvents(
	userId: string,
	daysAhead: number = 7
): Promise<UpcomingEvent[]> {
	// Mock upcoming events - in real implementation, this would query GraphQL
	const mockEvents: UpcomingEvent[] = [
		{
			id: '1',
			title: 'Team Standup',
			description: 'Daily team synchronization meeting',
			date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			time: '09:00',
			type: 'meeting',
			priority: 'medium',
			attendees: ['team-members'],
			location: 'Conference Room A'
		},
		{
			id: '2',
			title: 'Performance Review',
			description: 'Annual performance review with manager',
			date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
			time: '14:00',
			type: 'review',
			priority: 'high',
			attendees: ['manager'],
			location: 'Manager Office'
		},
		{
			id: '3',
			title: 'Project Deadline',
			description: 'Q4 project deliverables due',
			date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
			type: 'deadline',
			priority: 'high'
		}
	];

	return mockEvents;
}

/**
 * Helper function to generate dashboard metrics based on role
 */
async function generateDashboardMetrics(role: string): Promise<DashboardMetric[]> {
	const baseMetrics: DashboardMetric[] = [
		{
			id: 'leave_balance',
			title: 'Leave Balance',
			value: '18 days',
			trend: 'stable',
			color: 'blue'
		},
		{
			id: 'pending_tasks',
			title: 'Pending Tasks',
			value: 5,
			change: -2,
			trend: 'down',
			color: 'green'
		}
	];

	if (role === 'admin' || role === 'hr_manager') {
		return [
			...baseMetrics,
			{
				id: 'total_employees',
				title: 'Total Employees',
				value: 247,
				change: 12,
				trend: 'up',
				color: 'purple'
			},
			{
				id: 'pending_approvals',
				title: 'Pending Approvals',
				value: 8,
				change: -3,
				trend: 'down',
				color: 'orange'
			}
		];
	}

	if (role === 'manager') {
		return [
			...baseMetrics,
			{
				id: 'team_size',
				title: 'Team Members',
				value: 12,
				trend: 'stable',
				color: 'blue'
			},
			{
				id: 'team_performance',
				title: 'Team Performance',
				value: '94%',
				change: 2,
				trend: 'up',
				color: 'green'
			}
		];
	}

	return baseMetrics;
}

/**
 * Get system health metrics (admin only)
 */
async function getSystemHealthMetrics() {
	return {
		database: { status: 'healthy', responseTime: '45ms', connections: 23 },
		application: { uptime: '99.9%', memoryUsage: '68%', activeUsers: 89 },
		backup: { lastBackup: '2 hours ago', status: 'completed', nextScheduled: 'in 22 hours' }
	};
}

/**
 * Get pending approvals count
 */
async function getPendingApprovalsCount(userId: string) {
	return {
		leaveRequests: 5,
		expenseReports: 3,
		performanceReviews: 2,
		total: 10
	};
}

/**
 * Get team metrics for managers
 */
async function getTeamMetrics(managerId: string) {
	return {
		productivity: 94,
		satisfaction: 87,
		turnover: 5,
		performance: 91
	};
}

/**
 * Get team activities for managers
 */
async function getTeamActivities(managerId: string) {
	return [
		{
			id: '1',
			type: 'employee_update',
			title: 'John Smith completed training',
			description: 'Cybersecurity awareness training completed',
			timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
			user: { id: '123', name: 'John Smith' }
		}
	];
}
