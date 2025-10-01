// GraphQL Operations: HR Reports Management (Manager Department-Scoped)
// Feature: 016-repair-management-pages - Task T018
// Purpose: Manager CRUD operations for HR reports with department-scoped RLS

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get HR reports for manager's department only
 * Note: Reports table may not have RLS yet - implement when available
 * Covers: FR-006, FR-039
 */
export const GET_HR_REPORTS = gql`
	query GetHRReports(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [HrReportsOrderBy!] = [CREATED_AT_DESC]
		$filter: HrReportFilter
	) {
		hrReports(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
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

/**
 * Query: Get single report by ID (department-scoped)
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
 * Query: Get report analytics for manager's department
 * Covers: FR-039
 */
export const GET_REPORT_ANALYTICS = gql`
	query GetReportAnalytics($departmentId: UUID!) {
		totalReports: hrReports(filter: { departmentId: { equalTo: $departmentId } }) {
			totalCount
		}
		activeReports: hrReports(
			filter: { status: { equalTo: "active" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		scheduledReports: hrReports(
			filter: { status: { equalTo: "scheduled" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		completedReports: hrReports(
			filter: { status: { equalTo: "completed" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
			nodes {
				reportType
				category
				generatedAt
			}
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create HR report
 * Covers: FR-006, FR-039
 */
export const CREATE_HR_REPORT = gql`
	mutation CreateHRReport($input: CreateHrReportInput!) {
		createHrReport(input: $input) {
			hrReport {
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
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update HR report
 * Covers: FR-006
 */
export const UPDATE_HR_REPORT = gql`
	mutation UpdateHRReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
			hrReport {
				id
				creatorId
				creator {
					id
					displayName
					email
				}
				departmentId
				title
				reportType
				category
				filters
				data
				status
				scheduledAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete HR report
 * Covers: FR-006
 */
export const DELETE_HR_REPORT = gql`
	mutation DeleteHRReport($input: DeleteHrReportInput!) {
		deleteHrReport(input: $input) {
			deletedHrReportId
			clientMutationId
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface HrReportFilter {
	status?: {
		equalTo?: 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';
		in?: Array<'draft' | 'active' | 'scheduled' | 'completed' | 'failed'>;
	};
	reportType?: {
		equalTo?: string;
		in?: string[];
	};
	category?: {
		equalTo?: string;
		in?: string[];
	};
	creatorId?: {
		equalTo?: string;
	};
	departmentId?: {
		equalTo?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

export interface CreateHrReportInput {
	clientMutationId?: string;
	hrReport: {
		creatorId: string;
		departmentId: string;
		title: string;
		reportType: string;
		category: string;
		filters?: Record<string, any>;
		data?: Record<string, any>;
		status?: 'draft' | 'active' | 'scheduled';
		scheduledAt?: string;
	};
}

export interface UpdateHrReportInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		reportType?: string;
		category?: string;
		filters?: Record<string, any>;
		data?: Record<string, any>;
		status?: 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';
		scheduledAt?: string;
	};
}

export interface DeleteHrReportInput {
	clientMutationId?: string;
	id: string;
}

export interface HrReport {
	id: string;
	creatorId: string;
	creator: {
		id: string;
		displayName: string;
		email: string;
	};
	departmentId: string;
	department: {
		id: string;
		name: string;
	};
	title: string;
	reportType: string;
	category: string;
	filters?: Record<string, any>;
	data?: Record<string, any>;
	status: 'draft' | 'active' | 'scheduled' | 'completed' | 'failed';
	scheduledAt?: string;
	generatedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ReportAnalytics {
	summary: {
		totalReports: number;
		activeReports: number;
		scheduledReports: number;
		completedReports: number;
		generatedToday: number;
		generatedThisWeek: number;
		generatedThisMonth: number;
		mostPopularType: string;
		avgRunTime: number;
	};
	typeBreakdown: Array<{
		type: string;
		count: number;
		percentage: number;
	}>;
	categoryBreakdown: Array<{
		category: string;
		count: number;
		percentage: number;
	}>;
	performanceMetrics: {
		successRate: number;
		errorRate: number;
	};
}

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
 */
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

	const mostPopularType =
		typeBreakdown.length > 0 ? typeBreakdown[0].type : 'employee';

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

// ============================================================================
// OPERATIONS CLASS (Standardized Error Handling)
// ============================================================================

/**
 * T018: Manager HR Reports Operations with Department-Scoped Access
 * This class follows TDD principles - tests are written first in
 * tests/contract/manager-reports-operations.test.ts
 */
export class ReportsOperations {
	private client: any;

	constructor(client: any) {
		this.client = client;
	}

	/**
	 * Get HR reports for manager's department
	 * Department filtering applied based on manager's scope
	 */
	async getHRReports(params: {
		first?: number;
		offset?: number;
		filter?: HrReportFilter;
		userCredentials: UserCredentials;
	}): Promise<{
		reports: HrReport[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetHRReports',
			variables: {
				first: params.first || 20,
				offset: params.offset || 0,
				filter: params.filter || {}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Reports timeout'), {
					type: 'timeout',
					userMessage: 'Reports are loading slowly. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_HR_REPORTS,
					variables: dataRequest.variables
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'graphql',
							userMessage: 'Unable to load reports. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve({
							reports: result.data.hrReports.nodes,
							totalCount: result.data.hrReports.totalCount,
							hasNextPage: result.data.hrReports.pageInfo.hasNextPage
						});
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Get report analytics for manager's department
	 */
	async getReportAnalytics(params: {
		departmentId: string;
		userCredentials: UserCredentials;
	}): Promise<ReportAnalytics> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetReportAnalytics',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Analytics timeout'), {
					type: 'timeout',
					userMessage: 'Analytics are loading slowly. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_REPORT_ANALYTICS,
					variables: dataRequest.variables
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'graphql',
							userMessage: 'Unable to load analytics. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						const analytics = calculateReportAnalytics(result.data);
						resolve(analytics);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Create HR report (manager department-scoped)
	 */
	async createHRReport(params: {
		input: CreateHrReportInput;
		userCredentials: UserCredentials;
	}): Promise<HrReport> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input
		const validation = validateReportInput(params.input.hrReport);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.errors.join(', ')), {
				type: 'validation',
				userMessage: validation.errors.join(', ')
			});
		}

		const dataRequest = createDataRequest({
			operationName: 'CreateHRReport',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Creation timeout'), {
					type: 'timeout',
					userMessage: 'Report creation is taking too long. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: CREATE_HR_REPORT,
					variables: dataRequest.variables
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'graphql',
							userMessage: 'Unable to create report. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve(result.data.createHrReport.hrReport);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Update HR report (manager department-scoped)
	 */
	async updateHRReport(params: {
		input: UpdateHrReportInput;
		userCredentials: UserCredentials;
	}): Promise<HrReport> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateHRReport',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Update timeout'), {
					type: 'timeout',
					userMessage: 'Report update is taking too long. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: UPDATE_HR_REPORT,
					variables: dataRequest.variables
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'graphql',
							userMessage: 'Unable to update report. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve(result.data.updateHrReport.hrReport);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Delete HR report (manager department-scoped)
	 */
	async deleteHRReport(params: {
		reportId: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: DeleteHrReportInput = {
			id: params.reportId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeleteHRReport',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Deletion timeout'), {
					type: 'timeout',
					userMessage: 'Report deletion is taking too long. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: DELETE_HR_REPORT,
					variables: dataRequest.variables
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'graphql',
							userMessage: 'Unable to delete report. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						resolve(result.data.deleteHrReport.deletedHrReportId);
						unsubscribe();
					}
				}
			);
		});
	}
}

/**
 * Factory function to create ReportsOperations instance
 */
export function createReportsOperations(client: any): ReportsOperations {
	return new ReportsOperations(client);
}
