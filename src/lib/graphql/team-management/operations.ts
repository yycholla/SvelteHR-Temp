import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import { GET_TEAM_DETAILS } from './queries';

export class TeamManagementOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	async getTeamOverview(params: {
		departmentId?: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const dataRequest = createDataRequest({
			operationName: 'GetTeamOverview',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_TEAM_DETAILS, { id: params.departmentId })
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load team overview. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No team overview data returned. Please try again.'
				});
			}

			return result.data;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load team overview. Please try again.'
			});
		}
	}
}

export function createTeamManagementOperations(client: Client): TeamManagementOperations {
	return new TeamManagementOperations(client);
}
