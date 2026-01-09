import { gql } from '@urql/svelte';

/**
 * GraphQL Queries for Team Reports
 *
 * Updated for Rust backend (async-graphql) schema
 * Note: Team reports use the hrReports backend query with department-based filtering
 */

/**
 * Query: Get all team reports with pagination
 * Backend: Uses hrReports from Rust GraphQL schema
 */
export const GET_TEAM_REPORTS = gql`
	query GetTeamReports($limit: Int = 50, $offset: Int = 0) {
		hrReports(limit: $limit, offset: $offset) {
			id
			title
			reportType
			status
			filters
			data
			departmentId
			department {
				id
				name
			}
			creatorId
			creator {
				id
				displayName
				email
			}
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get single team report with full details
 * Backend: Uses hrReport (singular) from Rust GraphQL schema
 */
export const GET_TEAM_REPORT = gql`
	query GetTeamReport($id: UUID!) {
		hrReport(id: $id) {
			id
			title
			reportType
			status
			category
			filters
			data
			departmentId
			department {
				id
				name
			}
			creatorId
			creator {
				id
				displayName
				email
			}
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get reports by team (department)
 * Backend: Uses hrReports from Rust GraphQL schema
 * Note: Filtering by teamId done client-side
 */
export const GET_REPORTS_BY_TEAM = gql`
	query GetReportsByTeam($limit: Int = 50, $offset: Int = 0) {
		hrReports(limit: $limit, offset: $offset) {
			id
			title
			reportType
			status
			filters
			departmentId
			department {
				id
				name
			}
			creatorId
			creator {
				id
				displayName
			}
			scheduledAt
			generatedAt
			createdAt
		}
	}
`;

/**
 * Query: Get scheduled reports
 * Backend: Uses hrReports from Rust GraphQL schema
 * Note: Filtering by scheduledAt done client-side
 */
export const GET_SCHEDULED_REPORTS = gql`
	query GetScheduledReports($limit: Int = 50, $offset: Int = 0) {
		hrReports(limit: $limit, offset: $offset) {
			id
			title
			reportType
			status
			scheduledAt
			departmentId
			department {
				id
				name
			}
			creatorId
			creator {
				id
				displayName
			}
			filters
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get reports dashboard data
 * Backend: Uses hrReports from Rust GraphQL schema
 * Note: Filtering by date range and status done client-side
 */
export const GET_REPORTS_DASHBOARD = gql`
	query GetReportsDashboard($limit: Int = 1000, $offset: Int = 0) {
		hrReports(limit: $limit, offset: $offset) {
			id
			title
			reportType
			status
			filters
			data
			departmentId
			department {
				id
				name
			}
			creatorId
			creator {
				id
				displayName
			}
			scheduledAt
			generatedAt
			createdAt
		}
	}
`;

/**
 * Query: Search reports
 * Backend: Uses hrReports from Rust GraphQL schema
 * Note: All filtering done client-side
 */
export const SEARCH_REPORTS = gql`
	query SearchReports($limit: Int = 1000, $offset: Int = 0) {
		hrReports(limit: $limit, offset: $offset) {
			id
			title
			reportType
			status
			filters
			departmentId
			department {
				id
				name
			}
			creatorId
			creator {
				id
				displayName
			}
			scheduledAt
			generatedAt
			createdAt
		}
	}
`;

// TypeScript types for query variables
export interface GetTeamReportsVariables {
	limit?: number;
	offset?: number;
}

export interface GetTeamReportVariables {
	id: string;
}

export interface GetReportsByTeamVariables {
	teamId: string;
	reportType?: string;
	limit?: number;
	offset?: number;
}

export interface GetScheduledReportsVariables {
	limit?: number;
	offset?: number;
}

export interface GetReportsDashboardVariables {
	teamId?: string;
	dateFrom?: string;
	dateTo?: string;
	limit?: number;
}

export interface SearchReportsVariables {
	searchTerm?: string;
	reportType?: string;
	teamId?: string;
	generatedBy?: string;
	isScheduled?: boolean;
	status?: string;
	dateFrom?: string;
	dateTo?: string;
	limit?: number;
	offset?: number;
}

// Response types
export interface TeamReport {
	id: string;
	title: string;
	reportType: string;
	status: string;
	category?: string | null;
	filters: any; // JSON field
	data: any; // JSON field
	departmentId: string | null;
	department?: {
		id: string;
		name: string;
	} | null;
	creatorId: string;
	creator?: {
		id: string;
		displayName: string;
		email: string;
	};
	scheduledAt: string | null;
	generatedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TeamReportsResponse {
	hrReports: TeamReport[];
}

export interface ReportsDashboardStats {
	totalReports: number;
	completedReports: number;
	scheduledReports: number;
	failedReports: number;
	byType: Record<string, number>;
	byTeam: Record<string, number>;
}

// Helper functions

/**
 * Normalize status to consistent format
 */
export function normalizeStatus(status: string): string {
	return status.toLowerCase().replace(/_/g, '-');
}

/**
 * Filter reports by team/department ID (client-side)
 */
export function filterByTeam<T extends { departmentId?: string | null }>(
	reports: T[],
	teamId: string
): T[] {
	return reports.filter((report) => report.departmentId === teamId);
}

/**
 * Filter reports by report type (client-side)
 */
export function filterByReportType<T extends { reportType: string }>(
	reports: T[],
	reportType: string
): T[] {
	return reports.filter((report) => report.reportType === reportType);
}

/**
 * Filter reports by status (client-side)
 */
export function filterByStatus<T extends { status: string }>(
	reports: T[],
	status: string
): T[] {
	const normalizedStatus = normalizeStatus(status);
	return reports.filter((report) => normalizeStatus(report.status) === normalizedStatus);
}

/**
 * Filter scheduled reports (client-side)
 */
export function filterScheduled<T extends { scheduledAt: string | null }>(
	reports: T[]
): T[] {
	return reports.filter((report) => report.scheduledAt !== null);
}

/**
 * Filter reports by date range (client-side)
 */
export function filterByDateRange<T extends { createdAt: string }>(
	reports: T[],
	dateFrom?: string,
	dateTo?: string
): T[] {
	let filtered = reports;

	if (dateFrom) {
		const fromDate = new Date(dateFrom);
		filtered = filtered.filter((report) => new Date(report.createdAt) >= fromDate);
	}

	if (dateTo) {
		const toDate = new Date(dateTo);
		filtered = filtered.filter((report) => new Date(report.createdAt) <= toDate);
	}

	return filtered;
}

/**
 * Filter reports by generated date range (client-side)
 */
export function filterByGeneratedDateRange<T extends { generatedAt: string | null }>(
	reports: T[],
	dateFrom?: string,
	dateTo?: string
): T[] {
	let filtered = reports.filter((report) => report.generatedAt !== null);

	if (dateFrom) {
		const fromDate = new Date(dateFrom);
		filtered = filtered.filter(
			(report) => report.generatedAt && new Date(report.generatedAt) >= fromDate
		);
	}

	if (dateTo) {
		const toDate = new Date(dateTo);
		filtered = filtered.filter(
			(report) => report.generatedAt && new Date(report.generatedAt) <= toDate
		);
	}

	return filtered;
}

/**
 * Filter reports by creator (client-side)
 */
export function filterByCreator<T extends { creatorId: string }>(
	reports: T[],
	creatorId: string
): T[] {
	return reports.filter((report) => report.creatorId === creatorId);
}

/**
 * Search reports by title (client-side)
 */
export function searchByTitle<T extends { title: string }>(
	reports: T[],
	searchTerm: string
): T[] {
	const lowerSearch = searchTerm.toLowerCase();
	return reports.filter((report) => report.title.toLowerCase().includes(lowerSearch));
}

/**
 * Calculate dashboard statistics (client-side)
 */
export function calculateDashboardStats(reports: TeamReport[]): ReportsDashboardStats {
	const totalReports = reports.length;

	const completedReports = reports.filter(
		(r) => normalizeStatus(r.status) === 'completed'
	).length;
	const scheduledReports = reports.filter((r) => r.scheduledAt !== null).length;
	const failedReports = reports.filter((r) => normalizeStatus(r.status) === 'failed').length;

	// Count by report type
	const byType: Record<string, number> = {};
	reports.forEach((r) => {
		const type = r.reportType || 'unknown';
		byType[type] = (byType[type] || 0) + 1;
	});

	// Count by team/department
	const byTeam: Record<string, number> = {};
	reports.forEach((r) => {
		const teamName = r.department?.name || 'Unassigned';
		byTeam[teamName] = (byTeam[teamName] || 0) + 1;
	});

	return {
		totalReports,
		completedReports,
		scheduledReports,
		failedReports,
		byType,
		byTeam
	};
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
	{ value: 'productivity', label: 'Productivity Report' },
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
 * Check if report is scheduled
 */
export function isReportScheduled(report: { scheduledAt: string | null }): boolean {
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
	return scheduledDate < now;
}

/**
 * Sort reports by date (newest first)
 */
export function sortByDateDesc<T extends { createdAt: string }>(reports: T[]): T[] {
	return [...reports].sort((a, b) => {
		return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
	});
}

/**
 * Sort reports by date (oldest first)
 */
export function sortByDateAsc<T extends { createdAt: string }>(reports: T[]): T[] {
	return [...reports].sort((a, b) => {
		return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	});
}
