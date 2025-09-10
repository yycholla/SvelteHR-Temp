/**
 * GraphQL Dashboard Operations
 * 
 * Provides comprehensive GraphQL queries for dashboard data aggregation,
 * metrics, widgets, and real-time updates for the HR dashboard.
 * 
 * Uses generated types from GraphQL schema contract.
 */

import type {
	Query,
	Subscription,
	WidgetType,
	DashboardWidget,
	PerformanceMetric,
	ComplianceStatus
} from '../generated/graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

/**
 * Dashboard Query Operations
 */

/**
 * Get complete dashboard data
 */
export const GET_DASHBOARD_DATA = `
	query GetDashboardData($period: String = "current_month", $widgets: [WidgetType!]) {
		dashboardData(period: $period, widgets: $widgets) {
			summary {
				total_employees
				active_employees
				new_hires_this_month
				departures_this_month
				open_positions
				departments_count
				avg_employee_satisfaction
				compliance_score
			}
			widgets {
				id
				type
				title
				subtitle
				priority
				size
				data
				last_updated
				config {
					chart_type
					time_range
					filters
				}
			}
			metrics {
				employee_growth_rate
				turnover_rate
				time_to_hire
				employee_satisfaction
				budget_utilization
				compliance_percentage
				performance_scores
			}
			recent_activities {
				id
				type
				description
				user {
					id
					full_name
				}
				timestamp
				metadata
			}
			alerts {
				id
				type
				severity
				title
				message
				created_at
				requires_action
			}
		}
	}
` as const;

/**
 * Get employee statistics widget
 */
export const GET_EMPLOYEE_STATS_WIDGET = `
	query GetEmployeeStatsWidget {
		employeeStatsWidget {
			type
			title
			data {
				total_count
				active_count
				inactive_count
				on_leave_count
				by_department {
					department_name
					count
					percentage
				}
				by_employment_type {
					type
					count
					percentage
				}
				growth_trend {
					period
					count
					change_percentage
				}
			}
			last_updated
		}
	}
` as const;

/**
 * Get department statistics widget
 */
export const GET_DEPARTMENT_STATS_WIDGET = `
	query GetDepartmentStatsWidget {
		departmentStatsWidget {
			type
			title
			data {
				total_departments
				active_departments
				largest_department {
					name
					employee_count
				}
				budget_summary {
					total_allocated
					total_used
					utilization_rate
				}
				departments_by_size {
					size_category
					count
				}
			}
			last_updated
		}
	}
` as const;

/**
 * Get performance metrics widget
 */
export const GET_PERFORMANCE_METRICS_WIDGET = `
	query GetPerformanceMetricsWidget($period: String = "current_quarter") {
		performanceMetricsWidget(period: $period) {
			type
			title
			data {
				overall_score
				completed_reviews
				pending_reviews
				overdue_reviews
				score_distribution {
					score_range
					count
					percentage
				}
				department_averages {
					department_name
					average_score
					review_completion_rate
				}
				trends {
					period
					average_score
					completion_rate
				}
			}
			last_updated
		}
	}
` as const;

/**
 * Get compliance status widget
 */
export const GET_COMPLIANCE_STATUS_WIDGET = `
	query GetComplianceStatusWidget {
		complianceStatusWidget {
			type
			title
			data {
				overall_score
				compliant_items
				non_compliant_items
				pending_items
				by_category {
					category
					status
					count
					percentage
				}
				recent_changes {
					item
					previous_status
					new_status
					changed_at
				}
				upcoming_deadlines {
					item
					deadline
					days_remaining
				}
			}
			last_updated
		}
	}
` as const;

/**
 * Get notifications widget
 */
export const GET_NOTIFICATIONS_WIDGET = `
	query GetNotificationsWidget($limit: Int = 10) {
		notificationsWidget(limit: $limit) {
			type
			title
			data {
				unread_count
				total_count
				notifications {
					id
					type
					title
					message
					severity
					created_at
					is_read
					requires_action
					action_url
					metadata
				}
			}
			last_updated
		}
	}
` as const;

/**
 * Get recent activities
 */
export const GET_RECENT_ACTIVITIES = `
	query GetRecentActivities($limit: Int = 20, $types: [String!]) {
		recentActivities(limit: $limit, types: $types) {
			id
			type
			description
			user {
				id
				full_name
				profile_picture_url
			}
			target {
				id
				type
				name
			}
			timestamp
			metadata
		}
	}
` as const;

/**
 * Get dashboard alerts
 */
export const GET_DASHBOARD_ALERTS = `
	query GetDashboardAlerts($severity: String, $limit: Int = 10) {
		dashboardAlerts(severity: $severity, limit: $limit) {
			id
			type
			severity
			title
			message
			created_at
			updated_at
			requires_action
			action_url
			dismissed_at
			dismissed_by {
				id
				full_name
			}
			metadata
		}
	}
` as const;

/**
 * Get hiring pipeline data
 */
export const GET_HIRING_PIPELINE = `
	query GetHiringPipeline($period: String = "current_quarter") {
		hiringPipeline(period: $period) {
			total_positions
			open_positions
			filled_positions
			pipeline_stages {
				stage
				candidate_count
				avg_time_in_stage
			}
			recent_hires {
				id
				full_name
				position
				department {
					name
				}
				hire_date
				days_to_hire
			}
			metrics {
				avg_time_to_hire
				fill_rate
				cost_per_hire
				source_effectiveness {
					source
					candidates
					hires
					conversion_rate
				}
			}
		}
	}
` as const;

/**
 * Get budget overview
 */
export const GET_BUDGET_OVERVIEW = `
	query GetBudgetOverview($fiscal_year: String) {
		budgetOverview(fiscalYear: $fiscal_year) {
			total_budget
			allocated_budget
			used_budget
			remaining_budget
			utilization_rate
			by_department {
				department_name
				allocated
				used
				remaining
				utilization_rate
			}
			by_category {
				category
				allocated
				used
				remaining
			}
			monthly_burn_rate {
				month
				amount
				cumulative
			}
			forecast {
				projected_spend
				variance
				confidence_level
			}
		}
	}
` as const;

/**
 * Get employee satisfaction metrics
 */
export const GET_EMPLOYEE_SATISFACTION = `
	query GetEmployeeSatisfaction($period: String = "current_quarter") {
		employeeSatisfaction(period: $period) {
			overall_score
			response_rate
			by_department {
				department_name
				score
				response_rate
			}
			by_category {
				category
				score
				trend
			}
			trends {
				period
				score
				response_rate
			}
			comments_summary {
				positive_count
				negative_count
				neutral_count
				key_themes {
					theme
					sentiment
					count
				}
			}
		}
	}
` as const;

/**
 * Dashboard Subscription Operations
 */

/**
 * Subscribe to dashboard updates
 */
export const DASHBOARD_UPDATES_SUBSCRIPTION = `
	subscription DashboardUpdates($widgets: [WidgetType!]) {
		dashboardUpdates(widgets: $widgets) {
			type
			widget_type
			data
			timestamp
		}
	}
` as const;

/**
 * Subscribe to real-time notifications
 */
export const NOTIFICATIONS_SUBSCRIPTION = `
	subscription NotificationUpdates($user_id: ID!) {
		notificationUpdates(userId: $user_id) {
			id
			type
			title
			message
			severity
			created_at
			requires_action
			action_url
		}
	}
` as const;

/**
 * Subscribe to employee updates
 */
export const EMPLOYEE_UPDATES_SUBSCRIPTION = `
	subscription EmployeeUpdates {
		employeeUpdates {
			type
			employee {
				id
				full_name
				status
				department {
					name
				}
			}
			changes
			timestamp
		}
	}
` as const;

/**
 * TypeScript interfaces for dashboard operations
 */

export interface DashboardSummary {
	total_employees: number;
	active_employees: number;
	new_hires_this_month: number;
	departures_this_month: number;
	open_positions: number;
	departments_count: number;
	avg_employee_satisfaction: number;
	compliance_score: number;
}

export interface DashboardWidget {
	id: string;
	type: WidgetType;
	title: string;
	subtitle?: string;
	priority: number;
	size: string;
	data: any;
	last_updated: string;
	config?: {
		chart_type?: string;
		time_range?: string;
		filters?: any;
	};
}

export interface DashboardMetrics {
	employee_growth_rate: number;
	turnover_rate: number;
	time_to_hire: number;
	employee_satisfaction: number;
	budget_utilization: number;
	compliance_percentage: number;
	performance_scores: number;
}

export interface DashboardActivity {
	id: string;
	type: string;
	description: string;
	user: {
		id: string;
		full_name: string;
		profile_picture_url?: string;
	};
	target?: {
		id: string;
		type: string;
		name: string;
	};
	timestamp: string;
	metadata?: any;
}

export interface DashboardAlert {
	id: string;
	type: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	title: string;
	message: string;
	created_at: string;
	updated_at?: string;
	requires_action: boolean;
	action_url?: string;
	dismissed_at?: string;
	dismissed_by?: {
		id: string;
		full_name: string;
	};
	metadata?: any;
}

export interface GetDashboardDataVariables {
	period?: string;
	widgets?: WidgetType[];
}

export interface GetDashboardDataQuery {
	dashboardData: {
		summary: DashboardSummary;
		widgets: DashboardWidget[];
		metrics: DashboardMetrics;
		recent_activities: DashboardActivity[];
		alerts: DashboardAlert[];
	};
}

export interface GetRecentActivitiesVariables {
	limit?: number;
	types?: string[];
}

export interface GetDashboardAlertsVariables {
	severity?: string;
	limit?: number;
}

export interface GetHiringPipelineVariables {
	period?: string;
}

export interface HiringPipelineData {
	total_positions: number;
	open_positions: number;
	filled_positions: number;
	pipeline_stages: Array<{
		stage: string;
		candidate_count: number;
		avg_time_in_stage: number;
	}>;
	recent_hires: Array<{
		id: string;
		full_name: string;
		position: string;
		department: { name: string };
		hire_date: string;
		days_to_hire: number;
	}>;
	metrics: {
		avg_time_to_hire: number;
		fill_rate: number;
		cost_per_hire: number;
		source_effectiveness: Array<{
			source: string;
			candidates: number;
			hires: number;
			conversion_rate: number;
		}>;
	};
}

export interface GetBudgetOverviewVariables {
	fiscal_year?: string;
}

export interface BudgetOverviewData {
	total_budget: number;
	allocated_budget: number;
	used_budget: number;
	remaining_budget: number;
	utilization_rate: number;
	by_department: Array<{
		department_name: string;
		allocated: number;
		used: number;
		remaining: number;
		utilization_rate: number;
	}>;
	by_category: Array<{
		category: string;
		allocated: number;
		used: number;
		remaining: number;
	}>;
	monthly_burn_rate: Array<{
		month: string;
		amount: number;
		cumulative: number;
	}>;
	forecast: {
		projected_spend: number;
		variance: number;
		confidence_level: number;
	};
}

export interface EmployeeSatisfactionData {
	overall_score: number;
	response_rate: number;
	by_department: Array<{
		department_name: string;
		score: number;
		response_rate: number;
	}>;
	by_category: Array<{
		category: string;
		score: number;
		trend: number;
	}>;
	trends: Array<{
		period: string;
		score: number;
		response_rate: number;
	}>;
	comments_summary: {
		positive_count: number;
		negative_count: number;
		neutral_count: number;
		key_themes: Array<{
			theme: string;
			sentiment: string;
			count: number;
		}>;
	};
}

/**
 * Subscription interfaces
 */
export interface DashboardUpdatesSubscription {
	dashboardUpdates: {
		type: string;
		widget_type: WidgetType;
		data: any;
		timestamp: string;
	};
}

export interface NotificationUpdatesSubscription {
	notificationUpdates: {
		id: string;
		type: string;
		title: string;
		message: string;
		severity: string;
		created_at: string;
		requires_action: boolean;
		action_url?: string;
	};
}

export interface EmployeeUpdatesSubscription {
	employeeUpdates: {
		type: string;
		employee: {
			id: string;
			full_name: string;
			status: string;
			department: {
				name: string;
			};
		};
		changes: any;
		timestamp: string;
	};
}

/**
 * Utility functions for dashboard operations
 */

/**
 * Format dashboard metric value
 */
export function formatMetricValue(value: number, type: 'percentage' | 'currency' | 'number' | 'duration'): string {
	switch (type) {
		case 'percentage':
			return `${value.toFixed(1)}%`;
		case 'currency':
			return new Intl.NumberFormat('en-US', { 
				style: 'currency', 
				currency: 'USD',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			}).format(value);
		case 'duration':
			return `${Math.round(value)} days`;
		case 'number':
		default:
			return new Intl.NumberFormat('en-US').format(value);
	}
}

/**
 * Get metric trend direction
 */
export function getMetricTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
	const change = ((current - previous) / previous) * 100;
	
	if (Math.abs(change) < 1) return 'stable';
	return change > 0 ? 'up' : 'down';
}

/**
 * Get alert severity color
 */
export function getAlertSeverityColor(severity: string): string {
	switch (severity.toLowerCase()) {
		case 'critical':
			return 'text-red-600 bg-red-50';
		case 'high':
			return 'text-orange-600 bg-orange-50';
		case 'medium':
			return 'text-yellow-600 bg-yellow-50';
		case 'low':
		default:
			return 'text-blue-600 bg-blue-50';
	}
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
	if (previous === 0) return current > 0 ? 100 : 0;
	return ((current - previous) / previous) * 100;
}

/**
 * Format activity description
 */
export function formatActivityDescription(activity: DashboardActivity): string {
	const { type, user, target } = activity;
	
	switch (type) {
		case 'employee_created':
			return `${user.full_name} created employee ${target?.name}`;
		case 'employee_updated':
			return `${user.full_name} updated employee ${target?.name}`;
		case 'department_created':
			return `${user.full_name} created department ${target?.name}`;
		case 'user_login':
			return `${user.full_name} logged in`;
		default:
			return activity.description;
	}
}

/**
 * Get widget grid size class
 */
export function getWidgetGridSize(size: string): string {
	switch (size) {
		case 'small':
			return 'col-span-1 row-span-1';
		case 'medium':
			return 'col-span-2 row-span-1';
		case 'large':
			return 'col-span-2 row-span-2';
		case 'extra-large':
			return 'col-span-3 row-span-2';
		default:
			return 'col-span-1 row-span-1';
	}
}

/**
 * Check if data needs refresh
 */
export function shouldRefreshData(lastUpdated: string, refreshIntervalMinutes: number = 5): boolean {
	const lastUpdatedTime = new Date(lastUpdated).getTime();
	const now = Date.now();
	const intervalMs = refreshIntervalMinutes * 60 * 1000;
	
	return (now - lastUpdatedTime) > intervalMs;
}