import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import { createDataRequest } from '$lib/models/data-request';
import { createErrorResponse } from '$lib/models/error-response';
import type {
	CreatePerformanceReviewInput,
	PerformanceReview,
	PerformanceReviewFilter,
	PerformanceStatistics,
	UpdatePerformanceReviewInput
} from '$lib/types/performance';
import {
	calculatePerformanceStatistics,
	validatePerformanceReviewInput,
	validateRating
} from '$lib/utils/performance';
import {
	GET_PERFORMANCE_REVIEWS,
	GET_PERFORMANCE_REVIEWS_FOR_STATS
} from './queries';
import {
	CREATE_PERFORMANCE_REVIEW,
	UPDATE_PERFORMANCE_REVIEW,
	DELETE_PERFORMANCE_REVIEW
} from './mutations';

/**
 * T015: Manager Performance Management Operations with Department-Scoped RLS
 * This class follows TDD principles - tests are written first in
 * tests/contract/manager-performance-operations.test.ts
 */
export class PerformanceManagementOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get performance reviews for manager's department
	 * RLS automatically filters to department only via JWT claims
	 * Backend: Uses performanceReviews from Rust GraphQL schema
	 */
	async getPerformanceReviews(params: {
		first?: number;
		offset?: number;
		filter?: PerformanceReviewFilter;
		userCredentials: UserCredentials;
	}): Promise<{
		reviews: PerformanceReview[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const limit = params.first || 20;
		const offset = params.offset || 0;

		const dataRequest = createDataRequest({
			operationName: 'GetPerformanceReviews',
			variables: {
				employeeId: params.filter?.employeeId || undefined,
				limit,
				offset
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_PERFORMANCE_REVIEWS, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load performance reviews. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No performance reviews data returned. Please try again.'
				});
			}

			const reviews = result.data.performanceReviews || [];
			const hasMore = reviews.length === limit;

			return {
				reviews,
				totalCount: hasMore ? offset + limit + 1 : offset + reviews.length,
				hasNextPage: hasMore
			};
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'userMessage' in error) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load performance reviews. Please try again.'
			});
		}
	}

	/**
	 * Get performance statistics for manager's department
	 */
	async getPerformanceStatistics(params: {
		departmentId: string;
		userCredentials: UserCredentials;
	}): Promise<PerformanceStatistics> {
		const dataRequest = createDataRequest({
			operationName: 'GetPerformanceStatistics',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_PERFORMANCE_REVIEWS_FOR_STATS, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load statistics. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No statistics data returned. Please try again.'
				});
			}

			const stats = calculatePerformanceStatistics(result.data);
			return stats;
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'userMessage' in error) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load performance statistics. Please try again.'
			});
		}
	}

	/**
	 * Create performance review (manager department-scoped)
	 * RLS policy enforces department membership
	 * Backend: Uses createPerformanceReview mutation from Rust GraphQL schema
	 */
	async createPerformanceReview(params: {
		input: CreatePerformanceReviewInput;
		userCredentials: UserCredentials;
	}): Promise<PerformanceReview> {
		// Validate input
		const validation = validatePerformanceReviewInput(params.input);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.errors.join(', ')), {
				type: 'validation',
				userMessage: validation.errors.join(', ')
			});
		}

		const dataRequest = createDataRequest({
			operationName: 'CreatePerformanceReview',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(CREATE_PERFORMANCE_REVIEW, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create performance review. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createPerformanceReview) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No performance review data returned. Please try again.'
				});
			}

			return result.data.createPerformanceReview;
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'userMessage' in error) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create performance review. Please try again.'
			});
		}
	}

	/**
	 * Update performance review (manager department-scoped)
	 * RLS policy enforces department membership
	 * Backend: Uses updatePerformanceReview mutation from Rust GraphQL schema
	 */
	async updatePerformanceReview(params: {
		input: UpdatePerformanceReviewInput;
		userCredentials: UserCredentials;
	}): Promise<PerformanceReview> {
		// Validate ratings if provided
		const errors: string[] = [];

		if (params.input.overallRating !== undefined) {
			const validation = validateRating('Overall Rating', params.input.overallRating);
			if (!validation.valid) errors.push(validation.error!);
		}

		if (errors.length > 0) {
			throw createErrorResponse(new Error(errors.join(', ')), {
				type: 'validation',
				userMessage: errors.join(', ')
			});
		}

		const dataRequest = createDataRequest({
			operationName: 'UpdatePerformanceReview',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(UPDATE_PERFORMANCE_REVIEW, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update performance review. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.updatePerformanceReview) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No performance review data returned. Please try again.'
				});
			}

			return result.data.updatePerformanceReview;
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'userMessage' in error) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update performance review. Please try again.'
			});
		}
	}

	/**
	 * Delete performance review (manager department-scoped)
	 * RLS policy enforces department membership
	 * Backend: Uses deletePerformanceReview mutation from Rust GraphQL schema
	 */
	async deletePerformanceReview(params: {
		reviewId: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const dataRequest = createDataRequest({
			operationName: 'DeletePerformanceReview',
			variables: { id: params.reviewId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client
				.mutation(DELETE_PERFORMANCE_REVIEW, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to delete performance review. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No performance review data returned. Please try again.'
				});
			}

			return result.data.deletePerformanceReview || false;
		} catch (error: unknown) {
			if (error && typeof error === 'object' && 'userMessage' in error) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete performance review. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create PerformanceManagementOperations instance
 */
export function createPerformanceOperations(client: Client): PerformanceManagementOperations {
	return new PerformanceManagementOperations(client);
}
