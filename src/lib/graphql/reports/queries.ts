import { gql } from '@urql/svelte';

/**
 * GraphQL Queries for HR Reports
 *
 * Updated for Rust backend (async-graphql) schema
 */

/**
 * Query: Get HR reports with pagination
 * Backend: Uses hrReports from Rust GraphQL schema
 * Covers: FR-006, FR-039
 */
export const GET_HR_REPORTS = gql`
	query GetHRReports($limit: Int = 20, $offset: Int = 0) {
		hrReports(limit: $limit, offset: $offset) {
			id
			creatorId
			creator {
				id
				displayName
				email
			}
			departmentId
			department {
				id
				name
			}
			title
			reportType
			category
			filters
			data
			status
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get single report by ID (department-scoped)
 * Backend: Uses hrReport (singular) from Rust GraphQL schema
 */
export const GET_HR_REPORT_BY_ID = gql`
	query GetHRReportById($id: UUID!) {
		hrReport(id: $id) {
			id
			creatorId
			creator {
				id
				displayName
				email
			}
			departmentId
			department {
				id
				name
			}
			title
			reportType
			category
			filters
			data
			status
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get all reports for analytics calculation
 * Backend: Uses hrReports from Rust GraphQL schema
 * Note: Statistics calculated client-side for now
 * Covers: FR-039
 */
export const GET_REPORT_ANALYTICS = gql`
	query GetReportAnalytics($limit: Int = 1000) {
		hrReports(limit: $limit, offset: 0) {
			id
			status
			reportType
			category
			generatedAt
			departmentId
		}
	}
`;

// TypeScript types for query variables
export interface GetHRReportsVariables {
	limit?: number;
	offset?: number;
}

export interface GetHRReportByIdVariables {
	id: string;
}

export interface GetReportAnalyticsVariables {
	limit?: number;
}

// Response types
export interface HRReport {
	id: string;
	creatorId: string;
	creator?: {
		id: string;
		displayName: string;
		email: string;
	};
	departmentId: string | null;
	department?: {
		id: string;
		name: string;
	} | null;
	title: string;
	reportType: string;
	category: string | null;
	filters: any; // JSON field
	data: any; // JSON field
	status: string;
	scheduledAt: string | null;
	generatedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface HRReportsResponse {
	hrReports: HRReport[];
}

export interface ReportAnalyticsResponse {
	totalReports: number;
	activeReports: number;
	scheduledReports: number;
	completedReports: number;
	byType: Record<string, number>;
	byCategory: Record<string, number>;
}

// Helper functions

/**
 * Normalize status to consistent format
 * @param status - Status from backend or UI
 * @returns Normalized lowercase status
 */
export function normalizeStatus(status: string): string {
	return status.toLowerCase().replace(/_/g, '-');
}

/**
 * Convert to backend status format
 * @param status - Status from UI
 * @returns Backend status format
 */
export function toBackendStatus(status: string): string {
	return status.toUpperCase().replace(/-/g, '_');
}

/**
 * Calculate report analytics from report data (client-side)
 */
export function calculateReportAnalytics(reports: HRReport[]): ReportAnalyticsResponse {
	const totalReports = reports.length;

	const activeReports = reports.filter((r) => normalizeStatus(r.status) === 'active').length;
	const scheduledReports = reports.filter(
		(r) => normalizeStatus(r.status) === 'scheduled'
	).length;
	const completedReports = reports.filter(
		(r) => normalizeStatus(r.status) === 'completed'
	).length;

	// Count by report type
	const byType: Record<string, number> = {};
	reports.forEach((r) => {
		const type = r.reportType || 'unknown';
		byType[type] = (byType[type] || 0) + 1;
	});

	// Count by category
	const byCategory: Record<string, number> = {};
	reports.forEach((r) => {
		const category = r.category || 'uncategorized';
		byCategory[category] = (byCategory[category] || 0) + 1;
	});

	return {
		totalReports,
		activeReports,
		scheduledReports,
		completedReports,
		byType,
		byCategory
	};
}

/**
 * Filter reports by department (client-side)
 */
export function filterReportsByDepartment<T extends { departmentId?: string | null }>(
	reports: T[],
	departmentId: string
): T[] {
	return reports.filter((report) => report.departmentId === departmentId);
}

/**
 * Get status information including color and variant
 */
export function getStatusInfo(status: string): {
	label: string;
	color: string;
	variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
	const statusLower = normalizeStatus(status);
	switch (statusLower) {
		case 'draft':
			return { label: 'Draft', color: 'gray', variant: 'outline' };
		case 'active':
			return { label: 'Active', color: 'blue', variant: 'secondary' };
		case 'scheduled':
			return { label: 'Scheduled', color: 'yellow', variant: 'secondary' };
		case 'completed':
			return { label: 'Completed', color: 'green', variant: 'default' };
		case 'failed':
			return { label: 'Failed', color: 'red', variant: 'destructive' };
		default:
			return { label: 'Unknown', color: 'gray', variant: 'outline' };
	}
}

/**
 * Report type options for UI selects
 */
export const reportTypeOptions = [
	{ value: 'attendance', label: 'Attendance Report' },
	{ value: 'leave', label: 'Leave Report' },
	{ value: 'performance', label: 'Performance Report' },
	{ value: 'headcount', label: 'Headcount Report' },
	{ value: 'turnover', label: 'Turnover Report' },
	{ value: 'custom', label: 'Custom Report' }
];

/**
 * Report status options for UI selects
 */
export const reportStatusOptions = [
	{ value: 'draft', label: 'Draft' },
	{ value: 'active', label: 'Active' },
	{ value: 'scheduled', label: 'Scheduled' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'failed', label: 'Failed' }
];

/**
 * Report category options for UI selects
 */
export const reportCategoryOptions = [
	{ value: 'operational', label: 'Operational' },
	{ value: 'compliance', label: 'Compliance' },
	{ value: 'strategic', label: 'Strategic' },
	{ value: 'analytics', label: 'Analytics' }
];

/**
 * Format date for display
 */
export function formatReportDate(dateString: string | null): string {
	if (!dateString) return 'N/A';

	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Check if report is scheduled in the future
 */
export function isReportScheduled(report: { status: string; scheduledAt: string | null }): boolean {
	const statusLower = normalizeStatus(report.status);
	if (statusLower !== 'scheduled') return false;

	if (!report.scheduledAt) return false;

	const scheduledDate = new Date(report.scheduledAt);
	const now = new Date();
	return scheduledDate > now;
}

/**
 * Check if report is overdue (scheduled in past but not completed)
 */
export function isReportOverdue(report: { status: string; scheduledAt: string | null }): boolean {
	const statusLower = normalizeStatus(report.status);
	if (statusLower === 'completed' || statusLower === 'failed') return false;

	if (!report.scheduledAt) return false;

	const scheduledDate = new Date(report.scheduledAt);
	const now = new Date();
	return scheduledDate < now && statusLower === 'scheduled';
}
