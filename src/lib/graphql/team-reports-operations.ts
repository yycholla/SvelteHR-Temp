// GraphQL Operations: Team Reports & Analytics
// Created: 2025-09-24
// Task: T011 - Team reports GraphQL operations for /dashboard/management/reports

import { gql } from '@urql/svelte';
import type {
	TeamReport,
	ReportType,
	ReportStatus,
	User,
	Department,
	PaginationInput,
	SortInput
} from '$lib/types/graphql';

// Query: Get all team reports with filtering
export const GET_TEAM_REPORTS = gql`
	query GetTeamReports(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
		$filter: TeamReportFilter
	) {
		teamReports(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				summary
				isScheduled
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
					email
				}
				parameters
				data
				createdAt
				updatedAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

// Query: Get single report with full details
export const GET_TEAM_REPORT = gql`
	query GetTeamReport($id: UUID!) {
		teamReport(id: $id) {
			id
			title
			reportType
			status
			dateFrom
			dateTo
			summary
			isScheduled
			scheduleCron
			team: department {
				id
				name
				departmentHead {
					id
					displayName
					email
				}
				employees {
					totalCount
				}
			}
			generatedBy {
				id
				displayName
				email
				jobTitle
			}
			parameters
			data
			createdAt
			updatedAt
		}
	}
`;

// Query: Get reports by team
export const GET_REPORTS_BY_TEAM = gql`
  query GetReportsByTeam(
    $teamId: UUID!
    $reportType: ReportType
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      condition: { teamId: $teamId }
      filter: { reportType: $reportType ? { equalTo: $reportType } : null }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
`;

// Query: Get scheduled reports
export const GET_SCHEDULED_REPORTS = gql`
	query GetScheduledReports($first: Int = 50, $orderBy: [TeamReportsOrderBy!] = [UPDATED_AT_DESC]) {
		teamReports(condition: { isScheduled: true }, first: $first, orderBy: $orderBy) {
			nodes {
				id
				title
				reportType
				status
				scheduleCron
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
				updatedAt
			}
			totalCount
		}
	}
`;

// Query: Get report analytics dashboard
export const GET_REPORTS_DASHBOARD = gql`
  query GetReportsDashboard(
    $teamId: UUID
    $dateFrom: Date
    $dateTo: Date
  ) {
    teamReports(
      filter: {
        teamId: $teamId ? { equalTo: $teamId } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
        status: { equalTo: "completed" }
      }
    ) {
      nodes {
        id
        title
        reportType
        dateFrom
        dateTo
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        data
        createdAt
      }
      totalCount
    }
  }
`;

// Query: Search reports with advanced filtering
export const SEARCH_REPORTS = gql`
  query SearchReports(
    $searchTerm: String
    $reportType: ReportType
    $teamId: UUID
    $generatedBy: UUID
    $isScheduled: Boolean
    $status: ReportStatus
    $dateFrom: Date
    $dateTo: Date
    $first: Int = 50
    $orderBy: [TeamReportsOrderBy!] = [CREATED_AT_DESC]
  ) {
    teamReports(
      filter: {
        title: $searchTerm ? { includesInsensitive: $searchTerm } : null
        reportType: $reportType ? { equalTo: $reportType } : null
        teamId: $teamId ? { equalTo: $teamId } : null
        generatedBy: $generatedBy ? { equalTo: $generatedBy } : null
        isScheduled: $isScheduled != null ? { equalTo: $isScheduled } : null
        status: $status ? { equalTo: $status } : null
        dateFrom: $dateFrom ? { greaterThanOrEqualTo: $dateFrom } : null
        dateTo: $dateTo ? { lessThanOrEqualTo: $dateTo } : null
      }
      first: $first
      orderBy: $orderBy
    ) {
      nodes {
        id
        title
        reportType
        status
        dateFrom
        dateTo
        summary
        isScheduled
        team: department {
          id
          name
        }
        generatedBy {
          id
          displayName
        }
        createdAt
      }
      totalCount
    }
  }
`;

// Mutation: Generate new report
export const GENERATE_TEAM_REPORT = gql`
	mutation GenerateTeamReport($input: CreateTeamReportInput!) {
		createTeamReport(input: $input) {
			teamReport {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update report
export const UPDATE_TEAM_REPORT = gql`
	mutation UpdateTeamReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				status
				summary
				data
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Schedule recurring report
export const SCHEDULE_REPORT = gql`
	mutation ScheduleReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				isScheduled
				scheduleCron
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Delete report
export const DELETE_TEAM_REPORT = gql`
	mutation DeleteTeamReport($input: DeleteTeamReportInput!) {
		deleteTeamReport(input: $input) {
			deletedTeamReportId
			clientMutationId
		}
	}
`;

// Mutation: Regenerate report
export const REGENERATE_REPORT = gql`
	mutation RegenerateReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				status
				data
				summary
				updatedAt
			}
			clientMutationId
		}
	}
`;

// TypeScript interfaces for inputs
export interface CreateTeamReportInput {
	clientMutationId?: string;
	teamReport: {
		title: string;
		reportType: ReportType;
		teamId?: string;
		generatedBy: string;
		dateFrom: string;
		dateTo: string;
		parameters?: any; // JSONB
		summary?: string;
		isScheduled?: boolean;
		scheduleCron?: string;
	};
}

export interface UpdateTeamReportInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		status?: ReportStatus;
		summary?: string;
		data?: any; // JSONB
		parameters?: any; // JSONB
		isScheduled?: boolean;
		scheduleCron?: string;
	};
}

export interface DeleteTeamReportInput {
	clientMutationId?: string;
	id: string;
}

export interface TeamReportFilter {
	teamId?: string;
	generatedBy?: string;
	reportType?: ReportType;
	status?: ReportStatus;
	isScheduled?: boolean;
	dateFrom?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	dateTo?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

export interface ReportSearchFilter {
	searchTerm?: string;
	reportType?: ReportType;
	teamId?: string;
	generatedBy?: string;
	isScheduled?: boolean;
	status?: ReportStatus;
	dateRange?: {
		from: string;
		to: string;
	};
}

// Utility constants and functions
export const reportTypes = [
	{
		value: 'attendance',
		label: 'Attendance Report',
		description: 'Employee attendance patterns and statistics',
		color: 'blue',
		icon: '📅',
		defaultFields: ['attendance_rate', 'late_arrivals', 'early_departures', 'absences']
	},
	{
		value: 'performance',
		label: 'Performance Report',
		description: 'Team performance reviews and ratings',
		color: 'green',
		icon: '📊',
		defaultFields: ['avg_rating', 'review_completion', 'goal_achievement', 'feedback_summary']
	},
	{
		value: 'goals',
		label: 'Goals & OKRs Report',
		description: 'Goal progress and completion rates',
		color: 'purple',
		icon: '🎯',
		defaultFields: ['goal_completion', 'okr_progress', 'key_results', 'priority_breakdown']
	},
	{
		value: 'productivity',
		label: 'Productivity Report',
		description: 'Team productivity metrics and trends',
		color: 'orange',
		icon: '⚡',
		defaultFields: ['task_completion', 'project_velocity', 'efficiency_score', 'workload_balance']
	},
	{
		value: 'leave',
		label: 'Leave Report',
		description: 'Leave requests and utilization patterns',
		color: 'cyan',
		icon: '🏖️',
		defaultFields: ['leave_requests', 'utilization_rate', 'leave_types', 'approval_rates']
	},
	{
		value: 'custom',
		label: 'Custom Report',
		description: 'User-defined metrics and analysis',
		color: 'gray',
		icon: '🔧',
		defaultFields: ['custom_metrics', 'data_points', 'analysis_results']
	}
];

export const reportStatuses = [
	{ value: 'generating', label: 'Generating', color: 'yellow', icon: '⏳' },
	{ value: 'completed', label: 'Completed', color: 'green', icon: '✅' },
	{ value: 'failed', label: 'Failed', color: 'red', icon: '❌' }
];

export const scheduleOptions = [
	{ value: '0 9 * * 1', label: 'Weekly (Mondays at 9 AM)', description: 'Every Monday at 9:00 AM' },
	{
		value: '0 9 1 * *',
		label: 'Monthly (1st at 9 AM)',
		description: '1st of every month at 9:00 AM'
	},
	{
		value: '0 9 1 1,4,7,10 *',
		label: 'Quarterly (1st at 9 AM)',
		description: '1st of Jan, Apr, Jul, Oct at 9:00 AM'
	},
	{
		value: '0 9 * * 1-5',
		label: 'Daily (Weekdays at 9 AM)',
		description: 'Monday to Friday at 9:00 AM'
	},
	{ value: 'custom', label: 'Custom Schedule', description: 'Define custom cron expression' }
];

export const reportPeriods = [
	{ value: 'last_week', label: 'Last Week', days: 7 },
	{ value: 'last_month', label: 'Last Month', days: 30 },
	{ value: 'last_quarter', label: 'Last Quarter', days: 90 },
	{ value: 'last_6_months', label: 'Last 6 Months', days: 180 },
	{ value: 'last_year', label: 'Last Year', days: 365 },
	{ value: 'custom', label: 'Custom Period', days: 0 }
];

// Helper function to get report type info
export function getReportTypeInfo(type: ReportType): (typeof reportTypes)[0] {
	return reportTypes.find((t) => t.value === type) || reportTypes[5];
}

// Helper function to get status info
export function getReportStatusInfo(status: ReportStatus): (typeof reportStatuses)[0] {
	return reportStatuses.find((s) => s.value === status) || reportStatuses[0];
}

// Helper function to calculate date range for period
export function getDateRangeForPeriod(period: string): { from: string; to: string } | null {
	const today = new Date();
	const periodInfo = reportPeriods.find((p) => p.value === period);

	if (!periodInfo || periodInfo.value === 'custom') return null;

	const fromDate = new Date(today);
	fromDate.setDate(today.getDate() - periodInfo.days);

	return {
		from: fromDate.toISOString().split('T')[0],
		to: today.toISOString().split('T')[0]
	};
}

// Helper function to validate cron expression
export function isValidCronExpression(cron: string): boolean {
	// Basic validation for cron expression format
	const cronRegex =
		/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
	return cronRegex.test(cron);
}

// Helper function to parse cron description
export function describeCronExpression(cron: string): string {
	const scheduleOption = scheduleOptions.find((opt) => opt.value === cron);
	if (scheduleOption) return scheduleOption.description;

	// Basic cron parsing for common patterns
	const parts = cron.split(' ');
	if (parts.length !== 5) return 'Invalid cron expression';

	const [minute, hour, day, month, dayOfWeek] = parts;

	let description = 'At ';
	description += hour === '*' ? 'every hour' : `${hour}:${minute.padStart(2, '0')}`;

	if (dayOfWeek !== '*') {
		const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const dayNames = dayOfWeek
			.split(',')
			.map((d) => days[parseInt(d)])
			.join(', ');
		description += ` on ${dayNames}`;
	} else if (day !== '*') {
		description += ` on day ${day}`;
	}

	if (month !== '*') {
		const months = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		];
		const monthNames = month
			.split(',')
			.map((m) => months[parseInt(m) - 1])
			.join(', ');
		description += ` in ${monthNames}`;
	}

	return description;
}

// Helper function to format report data for display
export function formatReportData(report: TeamReport): FormattedReportData {
	if (!report.data) return { summary: {}, charts: [], tables: [] };

	const data = report.data as any;
	const reportTypeInfo = getReportTypeInfo(report.reportType);

	return {
		summary: {
			title: report.title,
			period: `${report.dateFrom} to ${report.dateTo}`,
			generatedBy: report.generatedBy.displayName,
			generatedAt: report.createdAt,
			keyMetrics: data.keyMetrics || {}
		},
		charts: data.charts || [],
		tables: data.tables || [],
		insights: data.insights || [],
		recommendations: data.recommendations || []
	};
}

// Helper function to generate report template
export function generateReportTemplate(
	reportType: ReportType,
	parameters: any = {}
): ReportTemplate {
	const typeInfo = getReportTypeInfo(reportType);

	return {
		title: `${typeInfo.label} - ${new Date().toLocaleDateString()}`,
		reportType,
		parameters: {
			...parameters,
			fields: typeInfo.defaultFields,
			groupBy: parameters.groupBy || 'department',
			chartTypes: parameters.chartTypes || ['bar', 'line', 'pie']
		},
		structure: {
			sections: [
				{
					id: 'summary',
					title: 'Executive Summary',
					type: 'summary',
					required: true
				},
				{
					id: 'metrics',
					title: 'Key Metrics',
					type: 'metrics',
					required: true
				},
				{
					id: 'charts',
					title: 'Visual Analysis',
					type: 'charts',
					required: false
				},
				{
					id: 'details',
					title: 'Detailed Breakdown',
					type: 'table',
					required: false
				},
				{
					id: 'insights',
					title: 'Insights & Trends',
					type: 'insights',
					required: false
				},
				{
					id: 'recommendations',
					title: 'Recommendations',
					type: 'recommendations',
					required: false
				}
			]
		}
	};
}

// Helper function to calculate report statistics
export function calculateReportStatistics(reports: TeamReport[]) {
	const totalReports = reports.length;
	const completedReports = reports.filter((r) => r.status === 'completed').length;
	const scheduledReports = reports.filter((r) => r.isScheduled).length;
	const failedReports = reports.filter((r) => r.status === 'failed').length;

	const typeBreakdown = reportTypes.map((type) => ({
		...type,
		count: reports.filter((r) => r.reportType === type.value).length
	}));

	const recentReports = reports.filter((r) => {
		const reportDate = new Date(r.createdAt);
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		return reportDate >= weekAgo;
	}).length;

	const avgGenerationTime = reports.length > 0 ? '2.3 minutes' : '0 minutes'; // Placeholder

	return {
		totals: {
			totalReports,
			completedReports,
			scheduledReports,
			failedReports,
			recentReports
		},
		rates: {
			successRate: totalReports > 0 ? Math.round((completedReports / totalReports) * 100) : 0,
			scheduleUtilization:
				totalReports > 0 ? Math.round((scheduledReports / totalReports) * 100) : 0
		},
		breakdowns: {
			byType: typeBreakdown,
			byStatus: reportStatuses.map((status) => ({
				...status,
				count: reports.filter((r) => r.status === status.value).length
			}))
		},
		performance: {
			avgGenerationTime,
			peakUsageDays: ['Monday', 'Tuesday'], // Placeholder
			mostPopularType: typeBreakdown.reduce(
				(max, type) => (type.count > max.count ? type : max),
				typeBreakdown[0]
			)
		}
	};
}

// TypeScript interfaces for helper functions
export interface FormattedReportData {
	summary: {
		title?: string;
		period?: string;
		generatedBy?: string;
		generatedAt?: string;
		keyMetrics?: Record<string, any>;
	};
	charts: Array<{
		id: string;
		title: string;
		type: string;
		data: any;
		config?: any;
	}>;
	tables: Array<{
		id: string;
		title: string;
		headers: string[];
		rows: any[][];
	}>;
	insights?: string[];
	recommendations?: string[];
}

export interface ReportTemplate {
	title: string;
	reportType: ReportType;
	parameters: {
		fields: string[];
		groupBy: string;
		chartTypes: string[];
		[key: string]: any;
	};
	structure: {
		sections: Array<{
			id: string;
			title: string;
			type: string;
			required: boolean;
		}>;
	};
}

export interface ReportStatistics {
	totals: {
		totalReports: number;
		completedReports: number;
		scheduledReports: number;
		failedReports: number;
		recentReports: number;
	};
	rates: {
		successRate: number;
		scheduleUtilization: number;
	};
	breakdowns: {
		byType: Array<{
			value: string;
			label: string;
			color: string;
			count: number;
		}>;
		byStatus: Array<{
			value: string;
			label: string;
			color: string;
			count: number;
		}>;
	};
	performance: {
		avgGenerationTime: string;
		peakUsageDays: string[];
		mostPopularType: {
			value: string;
			label: string;
			count: number;
		};
	};
}

/**
 * T033: Standardized Team Reports Operations with Error Handling
 */
import type { DataRequest, UserCredentials } from '$lib/models/data-request';

export class TeamReportsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async generateTeamReport(params: {
		type: string;
		departmentId?: string;
		dateRange: { start: string; end: string };
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GenerateTeamReport',
			variables: {
				input: {
					type: params.type,
					departmentId: params.departmentId,
					startDate: params.dateRange.start,
					endDate: params.dateRange.end
				}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 10000, // Longer timeout for report generation
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GENERATE_TEAM_REPORT, {
				input: {
					type: params.type,
					departmentId: params.departmentId,
					startDate: params.dateRange.start,
					endDate: params.dateRange.end
				}
			}).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to generate report. Please check your permissions and try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No report data returned. Please try again.'
				});
			}

			return result.data;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Report generation failed. Please try again.'
			});
		}
	}

	async getAvailableReports(params: { userCredentials: UserCredentials }): Promise<any> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetAvailableReports',
			variables: {},
			userCredentials: params.userCredentials,
			timeoutMs: 3000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_AVAILABLE_REPORTS, {}).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load available reports. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No reports data returned. Please try again.'
				});
			}

			return result.data;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load available reports. Please try again.'
			});
		}
	}
}

export function createTeamReportsOperations(client: Client): TeamReportsOperations {
	return new TeamReportsOperations(client);
}
