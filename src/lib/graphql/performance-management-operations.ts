// GraphQL Operations: Performance Management (Manager Department-Scoped)
// Feature: 016-repair-management-pages - Task T015
// Purpose: Manager CRUD operations for performance reviews with department-scoped RLS

import { gql } from '@urql/svelte';
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
// TYPESCRIPT INTERFACES
// ============================================================================

export interface PerformanceReviewFilter {
	status?: {
		equalTo?: 'draft' | 'in_progress' | 'completed' | 'overdue';
		in?: Array<'draft' | 'in_progress' | 'completed' | 'overdue'>;
	};
	employeeId?: {
		equalTo?: string;
	};
	reviewerId?: {
		equalTo?: string;
	};
	reviewPeriod?: {
		equalTo?: string;
		includesInsensitive?: string;
	};
	reviewDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	overallRating?: {
		greaterThanOrEqualTo?: number;
		lessThanOrEqualTo?: number;
	};
	employee?: {
		departmentId?: {
			equalTo?: string;
		};
		displayName?: {
			includesInsensitive?: string;
		};
	};
}

export interface CreatePerformanceReviewInput {
	clientMutationId?: string;
	performanceReview: {
		employeeId: string;
		reviewerId: string;
		reviewPeriod: string;
		reviewDate: string;
		overallRating: number;
		goalsAchievement: number;
		collaboration: number;
		communication: number;
		leadership: number;
		technicalSkills?: number;
		strengths: string;
		areasForImprovement: string;
		comments?: string;
		status?: 'draft' | 'in_progress' | 'completed';
	};
}

export interface UpdatePerformanceReviewInput {
	clientMutationId?: string;
	id: string;
	patch: {
		reviewPeriod?: string;
		reviewDate?: string;
		overallRating?: number;
		goalsAchievement?: number;
		collaboration?: number;
		communication?: number;
		leadership?: number;
		technicalSkills?: number;
		strengths?: string;
		areasForImprovement?: string;
		comments?: string;
		status?: 'draft' | 'in_progress' | 'completed';
	};
}

export interface DeletePerformanceReviewInput {
	clientMutationId?: string;
	id: string;
}

export interface PerformanceReview {
	id: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
		department: {
			id: string;
			name: string;
		};
	};
	reviewerId: string;
	reviewer: {
		id: string;
		displayName: string;
		email: string;
	};
	reviewPeriod: string;
	reviewDate: string;
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	status: 'draft' | 'in_progress' | 'completed' | 'overdue';
	createdAt: string;
	updatedAt: string;
}

export interface PerformanceStatistics {
	totalReviews: number;
	completedReviews: number;
	inProgressReviews: number;
	overdueReviews: number;
	completionRate: number;
	averageRatings: {
		overall: number;
		goalsAchievement: number;
		collaboration: number;
		communication: number;
		leadership: number;
		technicalSkills: number;
	};
	ratingDistribution: Array<{
		rating: number;
		count: number;
		percentage: number;
	}>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build performance review filter safely
 */
export function buildPerformanceReviewFilter({
	status,
	employeeId,
	employeeName,
	reviewerId,
	reviewPeriod,
	departmentId,
	minRating,
	maxRating
}: {
	status?: 'draft' | 'in_progress' | 'completed' | 'overdue';
	employeeId?: string;
	employeeName?: string;
	reviewerId?: string;
	reviewPeriod?: string;
	departmentId?: string;
	minRating?: number;
	maxRating?: number;
}): PerformanceReviewFilter {
	const filter: PerformanceReviewFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (employeeId) {
		filter.employeeId = { equalTo: employeeId };
	}

	if (reviewerId) {
		filter.reviewerId = { equalTo: reviewerId };
	}

	if (reviewPeriod) {
		filter.reviewPeriod = { includesInsensitive: reviewPeriod };
	}

	if (employeeName || departmentId) {
		filter.employee = {};
		if (employeeName) {
			filter.employee.displayName = { includesInsensitive: employeeName };
		}
		if (departmentId) {
			filter.employee.departmentId = { equalTo: departmentId };
		}
	}

	if (minRating !== undefined || maxRating !== undefined) {
		filter.overallRating = {};
		if (minRating !== undefined) {
			filter.overallRating.greaterThanOrEqualTo = minRating;
		}
		if (maxRating !== undefined) {
			filter.overallRating.lessThanOrEqualTo = maxRating;
		}
	}

	return filter;
}

/**
 * Helper: Calculate performance statistics from raw data
 */
export function calculatePerformanceStatistics(data: {
	totalReviews: { totalCount: number };
	completedReviews: {
		totalCount: number;
		nodes: Array<{
			overallRating: number;
			goalsAchievement: number;
			collaboration: number;
			communication: number;
			leadership: number;
			technicalSkills?: number;
		}>;
	};
	inProgressReviews: { totalCount: number };
	overdueReviews: { totalCount: number };
}): PerformanceStatistics {
	const totalCount = data.totalReviews.totalCount;
	const completedCount = data.completedReviews.totalCount;
	const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	// Calculate average ratings from completed reviews
	const completedNodes = data.completedReviews.nodes;
	const averageRatings = {
		overall: 0,
		goalsAchievement: 0,
		collaboration: 0,
		communication: 0,
		leadership: 0,
		technicalSkills: 0
	};

	if (completedCount > 0) {
		const sums = completedNodes.reduce(
			(acc, review) => ({
				overall: acc.overall + review.overallRating,
				goalsAchievement: acc.goalsAchievement + review.goalsAchievement,
				collaboration: acc.collaboration + review.collaboration,
				communication: acc.communication + review.communication,
				leadership: acc.leadership + review.leadership,
				technicalSkills: acc.technicalSkills + (review.technicalSkills || 0)
			}),
			{
				overall: 0,
				goalsAchievement: 0,
				collaboration: 0,
				communication: 0,
				leadership: 0,
				technicalSkills: 0
			}
		);

		averageRatings.overall = parseFloat((sums.overall / completedCount).toFixed(2));
		averageRatings.goalsAchievement = parseFloat(
			(sums.goalsAchievement / completedCount).toFixed(2)
		);
		averageRatings.collaboration = parseFloat((sums.collaboration / completedCount).toFixed(2));
		averageRatings.communication = parseFloat((sums.communication / completedCount).toFixed(2));
		averageRatings.leadership = parseFloat((sums.leadership / completedCount).toFixed(2));
		averageRatings.technicalSkills = parseFloat((sums.technicalSkills / completedCount).toFixed(2));
	}

	// Calculate rating distribution (1.0-5.0 in 0.5 increments)
	const ratingCounts = new Map<number, number>();
	completedNodes.forEach((review) => {
		const rating = Math.round(review.overallRating * 2) / 2; // Round to nearest 0.5
		ratingCounts.set(rating, (ratingCounts.get(rating) || 0) + 1);
	});

	const ratingDistribution = Array.from(ratingCounts.entries())
		.map(([rating, count]) => ({
			rating,
			count,
			percentage: completedCount > 0 ? Math.round((count / completedCount) * 100) : 0
		}))
		.sort((a, b) => b.rating - a.rating);

	return {
		totalReviews: totalCount,
		completedReviews: completedCount,
		inProgressReviews: data.inProgressReviews.totalCount,
		overdueReviews: data.overdueReviews.totalCount,
		completionRate,
		averageRatings,
		ratingDistribution
	};
}

/**
 * Helper: Validate rating value (must be between 1.0 and 5.0)
 */
export function validateRating(
	ratingName: string,
	rating: number
): { valid: boolean; error?: string } {
	if (rating < 1.0 || rating > 5.0) {
		return {
			valid: false,
			error: `${ratingName} must be between 1.0 and 5.0`
		};
	}
	return { valid: true };
}

/**
 * Helper: Validate performance review input
 */
export function validatePerformanceReviewInput(input: {
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Validate all ratings
	const ratings = [
		{ name: 'Overall Rating', value: input.overallRating },
		{ name: 'Goals Achievement', value: input.goalsAchievement },
		{ name: 'Collaboration', value: input.collaboration },
		{ name: 'Communication', value: input.communication },
		{ name: 'Leadership', value: input.leadership }
	];

	if (input.technicalSkills !== undefined) {
		ratings.push({ name: 'Technical Skills', value: input.technicalSkills });
	}

	ratings.forEach(({ name, value }) => {
		const validation = validateRating(name, value);
		if (!validation.valid) {
			errors.push(validation.error!);
		}
	});

	// Validate text fields
	if (!input.strengths || input.strengths.trim().length === 0) {
		errors.push('Strengths field is required');
	}

	if (!input.areasForImprovement || input.areasForImprovement.trim().length === 0) {
		errors.push('Areas for Improvement field is required');
	}

	if (input.strengths && input.strengths.length > 2000) {
		errors.push('Strengths must be less than 2000 characters');
	}

	if (input.areasForImprovement && input.areasForImprovement.length > 2000) {
		errors.push('Areas for Improvement must be less than 2000 characters');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Get rating badge color based on value
 */
export function getRatingBadgeColor(rating: number): string {
	if (rating >= 4.5) return 'green';
	if (rating >= 3.5) return 'blue';
	if (rating >= 2.5) return 'yellow';
	return 'red';
}

/**
 * Helper: Get status badge color
 */
export function getReviewStatusBadgeColor(status: string): string {
	const statusColors: Record<string, string> = {
		draft: 'gray',
		in_progress: 'blue',
		completed: 'green',
		overdue: 'red'
	};
	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Format review period (e.g., "Q4 2025")
 */
export function formatReviewPeriod(period: string): string {
	// Handle formats like "Q4 2025", "2025-Q4", "2025-10-01 to 2025-12-31"
	if (period.match(/Q\d \d{4}/)) return period; // Already formatted
	if (period.match(/\d{4}-Q\d/)) {
		const [year, quarter] = period.split('-');
		return `${quarter} ${year}`;
	}
	return period;
}

/**
 * Helper: Check if review is overdue
 */
export function isReviewOverdue(review: any): boolean {
	if (!review || review.status === 'completed') return false;

	// If review has a due date, check against it
	if (review.dueDate) {
		return new Date(review.dueDate) < new Date();
	}

	// If review has a review date in the past and not completed, it's overdue
	if (review.reviewDate) {
		return new Date(review.reviewDate) < new Date() && review.status !== 'completed';
	}

	return false;
}

/**
 * Helper: Get status info for review (includes overdue detection)
 */
export function getStatusInfo(review: any): { status: string; variant: string } {
	if (isReviewOverdue(review)) {
		return { status: 'overdue', variant: 'destructive' };
	}

	const statusMap: Record<string, { status: string; variant: string }> = {
		draft: { status: 'draft', variant: 'secondary' },
		in_progress: { status: 'in progress', variant: 'default' },
		completed: { status: 'completed', variant: 'success' }
	};

	return statusMap[review.status] || { status: review.status, variant: 'default' };
}

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
		} catch (error: any) {
			if (error.userMessage) {
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
		} catch (error: any) {
			if (error.userMessage) {
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
		} catch (error: any) {
			if (error.userMessage) {
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
		} catch (error: any) {
			if (error.userMessage) {
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
		} catch (error: any) {
			if (error.userMessage) {
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
