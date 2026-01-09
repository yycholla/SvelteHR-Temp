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
