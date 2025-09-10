/**
 * GraphQL Dashboard Service
 * 
 * High-level service layer for dashboard data management using GraphQL operations.
 * Handles dashboard widgets, metrics, real-time updates, and data aggregation.
 */

import { browser } from '$app/environment';
import { createGraphQLClient, createServerClient, type ServerGraphQLClient, type BrowserGraphQLClient } from '../client-factory';
import {
	GET_DASHBOARD_DATA,
	GET_EMPLOYEE_STATS_WIDGET,
	GET_DEPARTMENT_STATS_WIDGET,
	GET_PERFORMANCE_METRICS_WIDGET,
	GET_COMPLIANCE_STATUS_WIDGET,
	GET_NOTIFICATIONS_WIDGET,
	GET_RECENT_ACTIVITIES,
	GET_DASHBOARD_ALERTS,
	GET_HIRING_PIPELINE,
	GET_BUDGET_OVERVIEW,
	GET_EMPLOYEE_SATISFACTION,
	DASHBOARD_UPDATES_SUBSCRIPTION,
	NOTIFICATIONS_SUBSCRIPTION,
	EMPLOYEE_UPDATES_SUBSCRIPTION,
	formatMetricValue,
	getMetricTrend,
	getAlertSeverityColor,
	calculatePercentageChange,
	formatActivityDescription,
	getWidgetGridSize,
	shouldRefreshData,
	type GetDashboardDataVariables,
	type GetDashboardDataQuery,
	type GetRecentActivitiesVariables,
	type GetDashboardAlertsVariables,
	type GetHiringPipelineVariables,
	type GetBudgetOverviewVariables,
	type DashboardSummary,
	type DashboardWidget,
	type DashboardMetrics,
	type DashboardActivity,
	type DashboardAlert,
	type HiringPipelineData,
	type BudgetOverviewData,
	type EmployeeSatisfactionData
} from '../operations/dashboard';
import type { GraphQLResponse } from '../types';
import type { WidgetType } from '../generated/graphql';

/**
 * Dashboard service configuration
 */
export interface DashboardServiceConfig {
	enableRealTimeUpdates?: boolean;
	refreshInterval?: number; // minutes
	defaultPeriod?: string;
	maxAlertsCount?: number;
	maxActivitiesCount?: number;
}

/**
 * Dashboard service result interfaces
 */
export interface DashboardServiceResult<T = any> {
	success: boolean;
	data?: T;
	message?: string;
	errors?: Array<{ field: string; message: string }>;
	lastUpdated?: string;
}

export interface CompleteDashboardData {
	summary: DashboardSummary;
	widgets: DashboardWidget[];
	metrics: DashboardMetrics;
	recent_activities: DashboardActivity[];
	alerts: DashboardAlert[];
}

/**
 * GraphQL Dashboard Service Class
 */
export class GraphQLDashboardService {
	private client: ServerGraphQLClient | BrowserGraphQLClient;
	private config: DashboardServiceConfig;
	private subscriptions: Map<string, any> = new Map();
	
	constructor(
		token?: string,
		config: DashboardServiceConfig = {}
	) {
		this.config = {
			enableRealTimeUpdates: true,
			refreshInterval: 5, // 5 minutes
			defaultPeriod: 'current_month',
			maxAlertsCount: 10,
			maxActivitiesCount: 20,
			...config
		};

		// Create appropriate client based on environment
		this.client = browser 
			? createGraphQLClient()
			: createServerClient(token);
	}

	/**
	 * Set authentication token
	 */
	setToken(token: string): void {
		if ('setToken' in this.client) {
			this.client.setToken(token);
		}
	}

	/**
	 * Get complete dashboard data
	 */
	async getDashboardData(options: {
		period?: string;
		widgets?: WidgetType[];
	} = {}): Promise<DashboardServiceResult<CompleteDashboardData>> {
		try {
			const variables: GetDashboardDataVariables = {
				period: options.period || this.config.defaultPeriod,
				widgets: options.widgets
			};

			const result = await this.client.query<GetDashboardDataQuery>(GET_DASHBOARD_DATA, variables);
			
			if (result.success && result.data?.dashboardData) {
				return {
					success: true,
					data: result.data.dashboardData,
					lastUpdated: new Date().toISOString()
				};
			}

			return {
				success: false,
				message: 'Failed to fetch dashboard data',
				errors: result.errors?.map(e => ({ field: 'general', message: e.message }))
			};
		} catch (error) {
			console.error('Dashboard service error:', error);
			return {
				success: false,
				message: 'Dashboard data fetch failed',
				errors: [{ field: 'general', message: error instanceof Error ? error.message : 'Unknown error' }]
			};
		}
	}

	/**
	 * Get employee statistics widget
	 */
	async getEmployeeStatsWidget(): Promise<DashboardServiceResult<DashboardWidget>> {
		try {
			const result = await this.client.query(GET_EMPLOYEE_STATS_WIDGET);
			
			if (result.success && result.data?.employeeStatsWidget) {
				return {
					success: true,
					data: result.data.employeeStatsWidget
				};
			}

			return {
				success: false,
				message: 'Failed to fetch employee stats widget'
			};
		} catch (error) {
			console.error('Employee stats widget error:', error);
			return {
				success: false,
				message: 'Employee stats widget fetch failed'
			};
		}
	}

	/**
	 * Get department statistics widget
	 */
	async getDepartmentStatsWidget(): Promise<DashboardServiceResult<DashboardWidget>> {
		try {
			const result = await this.client.query(GET_DEPARTMENT_STATS_WIDGET);
			
			if (result.success && result.data?.departmentStatsWidget) {
				return {
					success: true,
					data: result.data.departmentStatsWidget
				};
			}

			return {
				success: false,
				message: 'Failed to fetch department stats widget'
			};
		} catch (error) {
			console.error('Department stats widget error:', error);
			return {
				success: false,
				message: 'Department stats widget fetch failed'
			};
		}
	}

	/**
	 * Get performance metrics widget
	 */
	async getPerformanceMetricsWidget(period?: string): Promise<DashboardServiceResult<DashboardWidget>> {
		try {
			const result = await this.client.query(GET_PERFORMANCE_METRICS_WIDGET, {
				period: period || 'current_quarter'
			});
			
			if (result.success && result.data?.performanceMetricsWidget) {
				return {
					success: true,
					data: result.data.performanceMetricsWidget
				};
			}

			return {
				success: false,
				message: 'Failed to fetch performance metrics widget'
			};
		} catch (error) {
			console.error('Performance metrics widget error:', error);
			return {
				success: false,
				message: 'Performance metrics widget fetch failed'
			};
		}
	}

	/**
	 * Get compliance status widget
	 */
	async getComplianceStatusWidget(): Promise<DashboardServiceResult<DashboardWidget>> {
		try {
			const result = await this.client.query(GET_COMPLIANCE_STATUS_WIDGET);
			
			if (result.success && result.data?.complianceStatusWidget) {
				return {
					success: true,
					data: result.data.complianceStatusWidget
				};
			}

			return {
				success: false,
				message: 'Failed to fetch compliance status widget'
			};
		} catch (error) {
			console.error('Compliance status widget error:', error);
			return {
				success: false,
				message: 'Compliance status widget fetch failed'
			};
		}
	}

	/**
	 * Get notifications widget
	 */
	async getNotificationsWidget(limit?: number): Promise<DashboardServiceResult<DashboardWidget>> {
		try {
			const result = await this.client.query(GET_NOTIFICATIONS_WIDGET, {
				limit: limit || 10
			});
			
			if (result.success && result.data?.notificationsWidget) {
				return {
					success: true,
					data: result.data.notificationsWidget
				};
			}

			return {
				success: false,
				message: 'Failed to fetch notifications widget'
			};
		} catch (error) {
			console.error('Notifications widget error:', error);
			return {
				success: false,
				message: 'Notifications widget fetch failed'
			};
		}
	}

	/**
	 * Get recent activities
	 */
	async getRecentActivities(options: {
		limit?: number;
		types?: string[];
	} = {}): Promise<DashboardServiceResult<DashboardActivity[]>> {
		try {
			const variables: GetRecentActivitiesVariables = {
				limit: options.limit || this.config.maxActivitiesCount,
				types: options.types
			};

			const result = await this.client.query(GET_RECENT_ACTIVITIES, variables);
			
			if (result.success && result.data?.recentActivities) {
				return {
					success: true,
					data: result.data.recentActivities
				};
			}

			return {
				success: false,
				message: 'Failed to fetch recent activities'
			};
		} catch (error) {
			console.error('Recent activities error:', error);
			return {
				success: false,
				message: 'Recent activities fetch failed'
			};
		}
	}

	/**
	 * Get dashboard alerts
	 */
	async getDashboardAlerts(options: {
		severity?: string;
		limit?: number;
	} = {}): Promise<DashboardServiceResult<DashboardAlert[]>> {
		try {
			const variables: GetDashboardAlertsVariables = {
				severity: options.severity,
				limit: options.limit || this.config.maxAlertsCount
			};

			const result = await this.client.query(GET_DASHBOARD_ALERTS, variables);
			
			if (result.success && result.data?.dashboardAlerts) {
				return {
					success: true,
					data: result.data.dashboardAlerts
				};
			}

			return {
				success: false,
				message: 'Failed to fetch dashboard alerts'
			};
		} catch (error) {
			console.error('Dashboard alerts error:', error);
			return {
				success: false,
				message: 'Dashboard alerts fetch failed'
			};
		}
	}

	/**
	 * Get hiring pipeline data
	 */
	async getHiringPipeline(period?: string): Promise<DashboardServiceResult<HiringPipelineData>> {
		try {
			const variables: GetHiringPipelineVariables = {
				period: period || 'current_quarter'
			};

			const result = await this.client.query(GET_HIRING_PIPELINE, variables);
			
			if (result.success && result.data?.hiringPipeline) {
				return {
					success: true,
					data: result.data.hiringPipeline
				};
			}

			return {
				success: false,
				message: 'Failed to fetch hiring pipeline data'
			};
		} catch (error) {
			console.error('Hiring pipeline error:', error);
			return {
				success: false,
				message: 'Hiring pipeline fetch failed'
			};
		}
	}

	/**
	 * Get budget overview
	 */
	async getBudgetOverview(fiscalYear?: string): Promise<DashboardServiceResult<BudgetOverviewData>> {
		try {
			const variables: GetBudgetOverviewVariables = {
				fiscal_year: fiscalYear
			};

			const result = await this.client.query(GET_BUDGET_OVERVIEW, variables);
			
			if (result.success && result.data?.budgetOverview) {
				return {
					success: true,
					data: result.data.budgetOverview
				};
			}

			return {
				success: false,
				message: 'Failed to fetch budget overview'
			};
		} catch (error) {
			console.error('Budget overview error:', error);
			return {
				success: false,
				message: 'Budget overview fetch failed'
			};
		}
	}

	/**
	 * Get employee satisfaction data
	 */
	async getEmployeeSatisfaction(period?: string): Promise<DashboardServiceResult<EmployeeSatisfactionData>> {
		try {
			const result = await this.client.query(GET_EMPLOYEE_SATISFACTION, {
				period: period || 'current_quarter'
			});
			
			if (result.success && result.data?.employeeSatisfaction) {
				return {
					success: true,
					data: result.data.employeeSatisfaction
				};
			}

			return {
				success: false,
				message: 'Failed to fetch employee satisfaction data'
			};
		} catch (error) {
			console.error('Employee satisfaction error:', error);
			return {
				success: false,
				message: 'Employee satisfaction fetch failed'
			};
		}
	}

	/**
	 * Subscribe to dashboard updates (browser only)
	 */
	subscribeToDashboardUpdates(
		widgets: WidgetType[],
		onUpdate: (data: any) => void
	): () => void {
		if (!browser || !this.config.enableRealTimeUpdates) {
			return () => {}; // Return empty cleanup function
		}

		try {
			// Note: This is a placeholder for subscription implementation
			// Actual subscription would depend on GraphQL client implementation
			const subscriptionKey = 'dashboard_updates';
			
			// Simulate subscription setup
			console.log('Setting up dashboard updates subscription for widgets:', widgets);
			
			// Return cleanup function
			return () => {
				this.subscriptions.delete(subscriptionKey);
				console.log('Dashboard updates subscription cleaned up');
			};
		} catch (error) {
			console.error('Dashboard subscription error:', error);
			return () => {};
		}
	}

	/**
	 * Subscribe to notifications (browser only)
	 */
	subscribeToNotifications(
		userId: string,
		onNotification: (notification: any) => void
	): () => void {
		if (!browser || !this.config.enableRealTimeUpdates) {
			return () => {};
		}

		try {
			const subscriptionKey = `notifications_${userId}`;
			
			console.log('Setting up notifications subscription for user:', userId);
			
			return () => {
				this.subscriptions.delete(subscriptionKey);
				console.log('Notifications subscription cleaned up');
			};
		} catch (error) {
			console.error('Notifications subscription error:', error);
			return () => {};
		}
	}

	/**
	 * Subscribe to employee updates (browser only)
	 */
	subscribeToEmployeeUpdates(
		onUpdate: (update: any) => void
	): () => void {
		if (!browser || !this.config.enableRealTimeUpdates) {
			return () => {};
		}

		try {
			const subscriptionKey = 'employee_updates';
			
			console.log('Setting up employee updates subscription');
			
			return () => {
				this.subscriptions.delete(subscriptionKey);
				console.log('Employee updates subscription cleaned up');
			};
		} catch (error) {
			console.error('Employee updates subscription error:', error);
			return () => {};
		}
	}

	/**
	 * Cleanup all subscriptions
	 */
	cleanup(): void {
		this.subscriptions.clear();
	}

	/**
	 * Helper methods from operations
	 */

	/**
	 * Format metric value
	 */
	formatMetricValue = formatMetricValue;

	/**
	 * Get metric trend
	 */
	getMetricTrend = getMetricTrend;

	/**
	 * Get alert severity color
	 */
	getAlertSeverityColor = getAlertSeverityColor;

	/**
	 * Calculate percentage change
	 */
	calculatePercentageChange = calculatePercentageChange;

	/**
	 * Format activity description
	 */
	formatActivityDescription = formatActivityDescription;

	/**
	 * Get widget grid size
	 */
	getWidgetGridSize = getWidgetGridSize;

	/**
	 * Check if data needs refresh
	 */
	shouldRefreshData = shouldRefreshData;

	/**
	 * Get dashboard summary with calculations
	 */
	async getDashboardSummaryWithCalculations(): Promise<DashboardServiceResult<DashboardSummary & {
		growth_rate: number;
		turnover_rate: number;
		satisfaction_trend: 'up' | 'down' | 'stable';
		compliance_trend: 'up' | 'down' | 'stable';
	}>> {
		try {
			const result = await this.getDashboardData();
			
			if (result.success && result.data) {
				const { summary, metrics } = result.data;
				
				// Calculate additional metrics
				const growth_rate = this.calculatePercentageChange(
					summary.active_employees, 
					summary.active_employees - summary.new_hires_this_month + summary.departures_this_month
				);

				// Get trends (would normally compare with previous period)
				const satisfaction_trend = this.getMetricTrend(summary.avg_employee_satisfaction, 75); // placeholder previous value
				const compliance_trend = this.getMetricTrend(summary.compliance_score, 85); // placeholder previous value

				return {
					success: true,
					data: {
						...summary,
						growth_rate,
						turnover_rate: metrics.turnover_rate,
						satisfaction_trend,
						compliance_trend
					}
				};
			}

			return result;
		} catch (error) {
			console.error('Dashboard summary calculation error:', error);
			return {
				success: false,
				message: 'Failed to calculate dashboard summary'
			};
		}
	}

	/**
	 * Get critical alerts only
	 */
	async getCriticalAlerts(): Promise<DashboardServiceResult<DashboardAlert[]>> {
		return this.getDashboardAlerts({ severity: 'critical' });
	}

	/**
	 * Get recent hire activities
	 */
	async getRecentHireActivities(): Promise<DashboardServiceResult<DashboardActivity[]>> {
		return this.getRecentActivities({ 
			types: ['employee_created', 'employee_hired'],
			limit: 10 
		});
	}
}

/**
 * Factory functions for creating dashboard service
 */
export function createDashboardService(token?: string, config?: DashboardServiceConfig): GraphQLDashboardService {
	return new GraphQLDashboardService(token, config);
}

/**
 * Server-side dashboard service factory
 */
export function createServerDashboardService(token: string, config?: DashboardServiceConfig): GraphQLDashboardService {
	const service = new GraphQLDashboardService(token, config);
	service.setToken(token);
	return service;
}

/**
 * Browser-side dashboard service factory
 */
export function createBrowserDashboardService(config?: DashboardServiceConfig): GraphQLDashboardService {
	if (!browser) {
		throw new Error('Browser dashboard service can only be created in browser environment');
	}
	
	return new GraphQLDashboardService(undefined, config);
}