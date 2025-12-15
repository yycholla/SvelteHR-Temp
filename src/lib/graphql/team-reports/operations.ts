import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import { GET_AVAILABLE_REPORTS } from './queries';
import { GENERATE_TEAM_REPORT } from './mutations';
import type { ReportType } from '$lib/types/graphql';

/**
 * T033: Standardized Team Reports Operations with Error Handling
 */
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
			timeoutMs: 10000 // Longer timeout for report generation
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GENERATE_TEAM_REPORT, {
					input: {
						type: params.type,
						departmentId: params.departmentId,
						startDate: params.dateRange.start,
						endDate: params.dateRange.end
					}
				})
				.toPromise();

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
