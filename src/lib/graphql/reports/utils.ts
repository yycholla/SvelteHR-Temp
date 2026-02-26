import type { HrReportFilter, ReportAnalytics } from './types';

// ============================================================================
// UI CONSTANTS
// ============================================================================

/**
 * Report type options for UI selects
 */
export const REPORT_TYPES = [
	{ value: 'employee', label: 'Employee Report' },
	{ value: 'attendance', label: 'Attendance Report' },
	{ value: 'performance', label: 'Performance Report' },
	{ value: 'payroll', label: 'Payroll Report' },
	{ value: 'compliance', label: 'Compliance Report' },
	{ value: 'analytics', label: 'Analytics Report' }
];

/**
 * Report category options for UI selects
 */
export const REPORT_CATEGORIES = [
	{ value: 'hr', label: 'HR' },
	{ value: 'finance', label: 'Finance' },
	{ value: 'operations', label: 'Operations' },
	{ value: 'management', label: 'Management' },
	{ value: 'compliance', label: 'Compliance' },
	{ value: 'custom', label: 'Custom' }
];

/**
 * Report status options for UI selects
 */
export const REPORT_STATUSES = [
	{ value: 'draft', label: 'Draft' },
	{ value: 'active', label: 'Active' },
	{ value: 'scheduled', label: 'Scheduled' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'failed', label: 'Failed' }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build HR report filter safely
 */
export function buildHrReportFilter({
	status,
	reportType,
	category,
	creatorId,
	departmentId,
	searchTerm,
	dateFrom,
	dateTo
}: {
	status?: 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';
	reportType?: string;
	category?: string;
	creatorId?: string;
	departmentId?: string;
	searchTerm?: string;
	dateFrom?: string;
	dateTo?: string;
}): HrReportFilter {
	const filter: HrReportFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (reportType) {
		filter.reportType = { equalTo: reportType };
	}

	if (category) {
		filter.category = { equalTo: category };
	}

	if (creatorId) {
		filter.creatorId = { equalTo: creatorId };
	}

	if (departmentId) {
		filter.departmentId = { equalTo: departmentId };
	}

	if (searchTerm) {
		filter.title = { includesInsensitive: searchTerm };
	}

	if (dateFrom || dateTo) {
		filter.createdAt = {};
		if (dateFrom) {
			filter.createdAt.greaterThanOrEqualTo = dateFrom;
		}
		if (dateTo) {
			filter.createdAt.lessThanOrEqualTo = dateTo;
		}
	}

	return filter;
}

/**
 * Helper: Calculate report analytics from raw data
 * NOTE: This legacy PostGraphile implementation has been replaced.
 * Use calculateReportAnalytics from queries.ts for the Rust backend.
 */
/*
export function calculateReportAnalytics(data: {
	totalReports: { totalCount: number };
	activeReports: { totalCount: number };
	scheduledReports: { totalCount: number };
	completedReports: {
		totalCount: number;
		nodes: Array<{
			reportType: string;
			category: string;
			generatedAt?: string;
		}>;
	};
}): ReportAnalytics {
	const totalCount = data.totalReports.totalCount;
	const completedCount = data.completedReports.totalCount;

	// Calculate time-based statistics
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const weekAgo = new Date(today);
	weekAgo.setDate(today.getDate() - 7);
	const monthAgo = new Date(today);
	monthAgo.setMonth(today.getMonth() - 1);

	const completedNodes = data.completedReports.nodes;

	const generatedToday = completedNodes.filter(
		(r) => r.generatedAt && new Date(r.generatedAt) >= today
	).length;

	const generatedThisWeek = completedNodes.filter(
		(r) => r.generatedAt && new Date(r.generatedAt) >= weekAgo
	).length;

	const generatedThisMonth = completedNodes.filter(
		(r) => r.generatedAt && new Date(r.generatedAt) >= monthAgo
	).length;

	// Calculate type breakdown
	const typeCounts = new Map<string, number>();
	completedNodes.forEach((report) => {
		typeCounts.set(report.reportType, (typeCounts.get(report.reportType) || 0) + 1);
	});

	const typeBreakdown = Array.from(typeCounts.entries())
		.map(([type, count]) => ({
			type,
			count,
			percentage: completedCount > 0 ? Math.round((count / completedCount) * 100) : 0
		}))
		.sort((a, b) => b.count - a.count);

	const mostPopularType = typeBreakdown.length > 0 ? typeBreakdown[0].type : 'employee';

	// Calculate category breakdown
	const categoryCounts = new Map<string, number>();
	completedNodes.forEach((report) => {
		categoryCounts.set(report.category, (categoryCounts.get(report.category) || 0) + 1);
	});

	const categoryBreakdown = Array.from(categoryCounts.entries())
		.map(([category, count]) => ({
			category,
			count,
			percentage: completedCount > 0 ? Math.round((count / completedCount) * 100) : 0
		}))
		.sort((a, b) => b.count - a.count);

	// Calculate performance metrics
	const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
	const errorRate = 100 - successRate;

	return {
		summary: {
			totalReports: totalCount,
			activeReports: data.activeReports.totalCount,
			scheduledReports: data.scheduledReports.totalCount,
			completedReports: completedCount,
			generatedToday,
			generatedThisWeek,
			generatedThisMonth,
			mostPopularType,
			avgRunTime: 0 // Can be calculated from execution time data if available
		},
		typeBreakdown,
		categoryBreakdown,
		performanceMetrics: {
			successRate,
			errorRate
		}
	};
}
*/

/**
 * Helper: Validate report input
 */
export function validateReportInput(input: {
	title: string;
	reportType: string;
	category: string;
	filters?: Record<string, any>;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 255) {
		errors.push('Title must be less than 255 characters');
	}

	if (!input.reportType || input.reportType.trim().length === 0) {
		errors.push('Report type is required');
	}

	if (!input.category || input.category.trim().length === 0) {
		errors.push('Category is required');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Get report type badge color
 */
export function getReportTypeBadgeColor(reportType: string): string {
	const typeColors: Record<string, string> = {
		employee: 'blue',
		attendance: 'green',
		performance: 'purple',
		payroll: 'orange',
		compliance: 'red',
		analytics: 'cyan'
	};
	return typeColors[reportType.toLowerCase()] || 'gray';
}

/**
 * Helper: Get status badge color
 */
export function getReportStatusBadgeColor(status: string): string {
	const statusColors: Record<string, string> = {
		draft: 'gray',
		active: 'blue',
		scheduled: 'yellow',
		completed: 'green',
		failed: 'red'
	};
	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Format report type label
 */
export function formatReportTypeLabel(reportType: string): string {
	const labels: Record<string, string> = {
		employee: 'Employee Report',
		attendance: 'Attendance Report',
		performance: 'Performance Report',
		payroll: 'Payroll Report',
		compliance: 'Compliance Report',
		analytics: 'Analytics Report'
	};
	return labels[reportType.toLowerCase()] || reportType;
}
