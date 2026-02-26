import { logger } from '$lib/utils/logger';
/**
 * Dashboard Mock Data Generators
 *
 * Helper functions for generating dashboard data structures.
 */

import type { ActivityItem, DashboardMetric, UpcomingEvent } from './dashboard';

/**
 * Get complete dashboard data based on user roles and permissions
 */
export async function getCompleteDashboardData(userId: string, roles: string[] = ['Employee']) {
	// Validate userId parameter
	if (!userId || userId.trim().length === 0) {
		logger.warn(`Dashboard operations called with invalid userId:: ${userId}`);
		throw new Error('Invalid user ID provided');
	}

	logger.info('🔍 Dashboard operations - userId:' + userId + 'roles:' + roles);

	try {
		// Create base dashboard data with mock data for now
		const baseData = {
			user: { id: userId, roles },
			metrics: {
				attendanceRate: 95,
				pendingRequests: 2,
				taskCount: 5,
				remainingVacationDays: 12
			},
			activities: await generatePersonalActivity(userId, 10),
			tasks: await generatePersonalTasks(userId, 5),
			events: await generateUpcomingEvents(userId, 7)
		};

		// Add role-specific data
		if (roles.includes('Admin') || roles.includes('HR Manager')) {
			const systemHealth = await getSystemHealthMetrics();
			const pendingApprovals = await getPendingApprovalsCount(userId);

			return {
				...baseData,
				systemHealth,
				pendingApprovals
			};
		}

		if (roles.includes('manager')) {
			const teamMetrics = await getTeamMetrics(userId);
			const teamActivities = await getTeamActivities(userId);

			return {
				...baseData,
				teamMetrics,
				teamActivities
			};
		}

		return baseData;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		// Return a fallback response to avoid completely breaking the dashboard
		return {
			user: { id: userId, roles },
			metrics: {
				attendanceRate: 0,
				pendingRequests: 0,
				taskCount: 0,
				remainingVacationDays: 0
			},
			activities: [],
			tasks: [],
			events: [],
			error: 'Failed to load some dashboard data'
		};
	}
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
export async function generatePersonalTasks(userId: string, limit: number = 5): Promise<string[]> {
	// Mock personal tasks - in real implementation, this would query GraphQL
	const mockTasks = [
		'Complete Time Sheet',
		'Update Emergency Contacts',
		'Complete Training Module',
		'Review Benefits Package',
		'Submit Expense Report'
	];

	return mockTasks.slice(0, limit);
}

/**
 * Generate detailed personal tasks for a user (full task objects)
 */
export async function generateDetailedPersonalTasks(
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
 * Helper function to generate dashboard metrics based on roles
 */
export async function generateDashboardMetrics(roles: string[]): Promise<DashboardMetric[]> {
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

	if (roles.includes('Admin') || roles.includes('HR Manager')) {
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

	if (roles.includes('Manager') || roles.includes('HR Manager')) {
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
