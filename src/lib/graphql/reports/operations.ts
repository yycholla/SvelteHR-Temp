import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import {
	GET_HR_REPORTS,
	GET_REPORT_ANALYTICS,
	calculateReportAnalytics,
	type ReportAnalyticsResponse
} from './queries';
import { CREATE_HR_REPORT, UPDATE_HR_REPORT, DELETE_HR_REPORT } from './mutations';
import type {
	HrReportFilter,
	CreateHrReportInput,
	UpdateHrReportInput,
	HrReport,
	ReportAnalytics
} from './types';
import { validateReportInput } from './utils';

/**
 * T018: Manager HR Reports Operations with Department-Scoped Access
 * This class follows TDD principles - tests are written first in
 * tests/contract/manager-reports-operations.test.ts
 */
export class ReportsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get HR reports for manager's department
	 * Department filtering applied based on manager's scope
	 * Backend: Uses hrReports from Rust GraphQL schema
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
		const limit = params.first || 20;
		const offset = params.offset || 0;

		const dataRequest = createDataRequest({
			operationName: 'GetHRReports',
			variables: {
				limit,
				offset
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_HR_REPORTS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load reports. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No reports data returned. Please try again.'
				});
			}

			const reports = result.data.hrReports || [];
			const hasMore = reports.length === limit;

			return {
				reports,
				totalCount: hasMore ? offset + limit + 1 : offset + reports.length,
				hasNextPage: hasMore
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load reports. Please try again.'
			});
		}
	}

	/**
	 * Get report analytics for manager's department
	 * Backend: Uses hrReports from Rust GraphQL schema
	 */
	async getReportAnalytics(params: {
		departmentId: string;
		userCredentials: UserCredentials;
	}): Promise<ReportAnalyticsResponse> {
		const dataRequest = createDataRequest({
			operationName: 'GetReportAnalytics',
			variables: { limit: 1000 },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_REPORT_ANALYTICS, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load analytics. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No analytics data returned. Please try again.'
				});
			}

			const reports = result.data.hrReports || [];
			const analytics = calculateReportAnalytics(reports);
			return analytics;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load report analytics. Please try again.'
			});
		}
	}

	/**
	 * Create HR report (manager department-scoped)
	 * Backend: Uses createHrReport mutation from Rust GraphQL schema
	 */
	async createHRReport(params: {
		input: CreateHrReportInput;
		userCredentials: UserCredentials;
	}): Promise<HrReport> {
		// Validate input
		const validation = validateReportInput(params.input);
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
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(CREATE_HR_REPORT, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create report. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createHrReport) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No report data returned. Please try again.'
				});
			}

			return result.data.createHrReport;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create report. Please try again.'
			});
		}
	}

	/**
	 * Update HR report (manager department-scoped)
	 * Backend: Uses updateHrReport mutation from Rust GraphQL schema
	 */
	async updateHRReport(params: {
		input: UpdateHrReportInput;
		userCredentials: UserCredentials;
	}): Promise<HrReport> {
		const dataRequest = createDataRequest({
			operationName: 'UpdateHRReport',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(UPDATE_HR_REPORT, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update report. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.updateHrReport) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No report data returned. Please try again.'
				});
			}

			return result.data.updateHrReport;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update report. Please try again.'
			});
		}
	}

	/**
	 * Delete HR report (manager department-scoped)
	 * Backend: Uses deleteHrReport mutation from Rust GraphQL schema
	 */
	async deleteHRReport(params: {
		reportId: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const dataRequest = createDataRequest({
			operationName: 'DeleteHRReport',
			variables: { id: params.reportId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(DELETE_HR_REPORT, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to delete report. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			return result.data.deleteHrReport || false;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete report. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create ReportsOperations instance
 */
export function createReportsOperations(client: Client): ReportsOperations {
	return new ReportsOperations(client);
}
