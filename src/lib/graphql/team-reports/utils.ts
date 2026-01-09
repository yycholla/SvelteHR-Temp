import type { ReportStatus, ReportType, TeamReport } from '$lib/types/graphql';
import type { FormattedReportData, ReportTemplate } from './types';

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
			generatedBy: report.generatedBy?.displayName,
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
