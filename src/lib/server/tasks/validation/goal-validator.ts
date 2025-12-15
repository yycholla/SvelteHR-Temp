import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { ResourceValidationResult } from './types';

/**
 * Validate a goal resource
 */
export async function validateGoalResource(goalId: string): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidateGoal($goalId: UUID!) {
						goalById(id: $goalId) {
							id
							title
							status
							archived
						}
					}
				`,
				variables: { goalId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch goal'
			};
		}

		const data = await response.json();
		const goal = data?.data?.goalById;

		if (!goal) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Goal not found'
			};
		}

		// Check if goal is archived
		if (goal.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: goal.title,
				error: 'Goal is archived'
			};
		}

		// Check if goal is cancelled
		if (goal.status === 'cancelled' || goal.status === 'Cancelled') {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: goal.title,
				error: 'Goal is cancelled'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: goal.title,
			metadata: {
				status: goal.status
			}
		};
	} catch (error) {
		logger.error('Error checking goal', error as Error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking goal'
		};
	}
}
