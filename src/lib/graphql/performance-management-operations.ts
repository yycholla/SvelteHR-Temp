// GraphQL Operations: Performance Management (Manager Department-Scoped)
// Feature: 016-repair-management-pages - Task T015
// Purpose: Manager CRUD operations for performance reviews with department-scoped RLS

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get performance reviews for manager's department only
 * RLS Policy: manager_view_department_performance_reviews
 * Covers: FR-003, FR-014
 */
export const GET_PERFORMANCE_REVIEWS = gql`
	query GetPerformanceReviews(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [REVIEW_DATE_DESC]
		$filter: PerformanceReviewFilter
	) {
		performanceReviews(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
					department {
						id
						name
					}
				}
				reviewerId
				reviewer {
					id
					displayName
					email
				}
				reviewPeriod
				reviewDate
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
				strengths
				areasForImprovement
				comments
				status
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
 * Query: Get single performance review by ID (department-scoped)
 * RLS Policy: manager_view_department_performance_reviews
 */
export const GET_PERFORMANCE_REVIEW_BY_ID = gql`
	query GetPerformanceReviewById($id: UUID!) {
		performanceReview(id: $id) {
			id
			employeeId
			employee {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			reviewerId
			reviewer {
				id
				displayName
				email
			}
			reviewPeriod
			reviewDate
			overallRating
			goalsAchievement
			collaboration
			communication
			leadership
			technicalSkills
			strengths
			areasForImprovement
			comments
			status
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get performance statistics for manager's department
 * Covers: FR-014
 */
export const GET_PERFORMANCE_STATISTICS = gql`
	query GetPerformanceStatistics($departmentId: UUID!) {
		totalReviews: performanceReviews(
			filter: { employee: { departmentId: { equalTo: $departmentId } } }
		) {
			totalCount
		}
		completedReviews: performanceReviews(
			filter: {
				status: { equalTo: "completed" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
			nodes {
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
			}
		}
		inProgressReviews: performanceReviews(
			filter: {
				status: { equalTo: "in_progress" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
		overdueReviews: performanceReviews(
			filter: {
				status: { equalTo: "overdue" }
				employee: { departmentId: { equalTo: $departmentId } }
			}
		) {
			totalCount
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create performance review
 * RLS Policy: manager_create_department_performance_reviews
 * Covers: FR-003
 */
export const CREATE_PERFORMANCE_REVIEW = gql`
	mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
		createPerformanceReview(input: $input) {
			performanceReview {
				id
				employeeId
				employee {
					id
					displayName
					email
					jobTitle
				}
				reviewerId
				reviewer {
					id
					displayName
					email
				}
				reviewPeriod
				reviewDate
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
				strengths
				areasForImprovement
				comments
				status
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update performance review
 * RLS Policy: manager_update_department_performance_reviews
 * Covers: FR-003
 */
export const UPDATE_PERFORMANCE_REVIEW = gql`
	mutation UpdatePerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				employeeId
				employee {
					id
					displayName
					email
				}
				reviewerId
				reviewer {
					id
					displayName
					email
				}
				reviewPeriod
				reviewDate
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				technicalSkills
				strengths
				areasForImprovement
				comments
				status
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete performance review
 * RLS Policy: manager_delete_department_performance_reviews
 * Covers: FR-003
 */
export const DELETE_PERFORMANCE_REVIEW = gql`
	mutation DeletePerformanceReview($input: DeletePerformanceReviewInput!) {
		deletePerformanceReview(input: $input) {
			deletedPerformanceReviewId
			clientMutationId
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES & UTILITY FUNCTIONS
// ============================================================================

import type {
	CreatePerformanceReviewInput,
	DeletePerformanceReviewInput,
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

// ============================================================================
// OPERATIONS CLASS (Standardized Error Handling)
// ============================================================================

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
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetPerformanceReviews',
			variables: {
				first: params.first || 20,
				offset: params.offset || 0,
				filter: params.filter || {}
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

			return {
				reviews: result.data.performanceReviews.nodes,
				totalCount: result.data.performanceReviews.totalCount,
				hasNextPage: result.data.performanceReviews.pageInfo.hasNextPage
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
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetPerformanceStatistics',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(GET_PERFORMANCE_STATISTICS, dataRequest.variables)
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
	 */
	async createPerformanceReview(params: {
		input: CreatePerformanceReviewInput;
		userCredentials: UserCredentials;
	}): Promise<PerformanceReview> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input
		const validation = validatePerformanceReviewInput(params.input.performanceReview);
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
			// Server-side query using toPromise()
			const result = await this.client
				.query(CREATE_PERFORMANCE_REVIEW, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create performance review. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No performance review data returned. Please try again.'
				});
			}

			return result.data.createPerformanceReview.performanceReview;
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
	 */
	async updatePerformanceReview(params: {
		input: UpdatePerformanceReviewInput;
		userCredentials: UserCredentials;
	}): Promise<PerformanceReview> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate ratings if provided
		const patch = params.input.patch;
		const errors: string[] = [];

		if (patch.overallRating !== undefined) {
			const validation = validateRating('Overall Rating', patch.overallRating);
			if (!validation.valid) errors.push(validation.error!);
		}

		if (patch.goalsAchievement !== undefined) {
			const validation = validateRating('Goals Achievement', patch.goalsAchievement);
			if (!validation.valid) errors.push(validation.error!);
		}

		if (patch.collaboration !== undefined) {
			const validation = validateRating('Collaboration', patch.collaboration);
			if (!validation.valid) errors.push(validation.error!);
		}

		if (patch.communication !== undefined) {
			const validation = validateRating('Communication', patch.communication);
			if (!validation.valid) errors.push(validation.error!);
		}

		if (patch.leadership !== undefined) {
			const validation = validateRating('Leadership', patch.leadership);
			if (!validation.valid) errors.push(validation.error!);
		}

		if (patch.technicalSkills !== undefined) {
			const validation = validateRating('Technical Skills', patch.technicalSkills);
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
			// Server-side query using toPromise()
			const result = await this.client
				.query(UPDATE_PERFORMANCE_REVIEW, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update performance review. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No performance review data returned. Please try again.'
				});
			}

			return result.data.updatePerformanceReview.performanceReview;
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
	 */
	async deletePerformanceReview(params: {
		reviewId: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: DeletePerformanceReviewInput = {
			id: params.reviewId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeletePerformanceReview',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client
				.query(DELETE_PERFORMANCE_REVIEW, dataRequest.variables)
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

			return result.data.deletePerformanceReview.deletedPerformanceReviewId;
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
