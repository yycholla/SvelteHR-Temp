import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { ResourceValidationResult } from './types';

/**
 * Validate a performance review resource
 */
export async function validatePerformanceReviewResource(
	reviewId: string
): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidatePerformanceReview($reviewId: UUID!) {
						performanceReviewById(id: $reviewId) {
							id
							title
							status
							archived
							employeeId
						}
					}
				`,
				variables: { reviewId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch performance review'
			};
		}

		const data = await response.json();
		const review = data?.data?.performanceReviewById;

		if (!review) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Performance review not found'
			};
		}

		// Check if review is archived
		if (review.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: review.title,
				error: 'Performance review is archived'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: review.title,
			metadata: {
				status: review.status,
				employeeId: review.employeeId
			}
		};
	} catch (error) {
		logger.error('Error checking performance review', error as Error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking performance review'
		};
	}
}
