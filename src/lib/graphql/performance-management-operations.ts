// GraphQL Operations: Performance Management
// Created: 2025-09-24
// Task: T011 - Performance reviews GraphQL operations for /dashboard/management/reviews

import { gql } from '@urql/svelte';
import type {
	PerformanceReview,
	PerformanceReviewStatus,
	User,
	PaginationInput,
	SortInput
} from '$lib/types/graphql';

// Query: Get all performance reviews with filtering
export const GET_PERFORMANCE_REVIEWS = gql`
	query GetPerformanceReviews(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [CREATED_AT_DESC]
		$filter: PerformanceReviewFilter
	) {
		performanceReviews(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
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
				reviewer {
					id
					displayName
					email
					jobTitle
				}
				reviewPeriodStart
				reviewPeriodEnd
				status
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				strengths
				areasForImprovement
				goalsForNextPeriod
				developmentPlan
				reviewNotes
				employeeSelfAssessment
				createdAt
				updatedAt
				submittedAt
				completedAt
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

// Query: Get performance review by ID with full details
export const GET_PERFORMANCE_REVIEW = gql`
	query GetPerformanceReview($id: UUID!) {
		performanceReview(id: $id) {
			id
			employee {
				id
				displayName
				email
				jobTitle
				hireDate
				department {
					id
					name
				}
				manager: userByManagerId {
					id
					displayName
					email
				}
			}
			reviewer {
				id
				displayName
				email
				jobTitle
				department {
					id
					name
				}
			}
			reviewPeriodStart
			reviewPeriodEnd
			status
			overallRating
			goalsAchievement
			collaboration
			communication
			leadership
			strengths
			areasForImprovement
			goalsForNextPeriod
			developmentPlan
			reviewNotes
			employeeSelfAssessment
			createdAt
			updatedAt
			submittedAt
			completedAt
		}
	}
`;

// Query: Get pending reviews for manager
export const GET_PENDING_REVIEWS_FOR_MANAGER = gql`
	query GetPendingReviewsForManager(
		$managerId: UUID!
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [PerformanceReviewsOrderBy!] = [CREATED_AT_ASC]
	) {
		performanceReviews(
			condition: { reviewerId: $managerId }
			filter: { status: { in: ["draft", "in_progress"] } }
			first: $first
			offset: $offset
			orderBy: $orderBy
		) {
			nodes {
				id
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
				reviewPeriodStart
				reviewPeriodEnd
				status
				overallRating
				createdAt
				updatedAt
			}
			totalCount
		}
	}
`;

// Query: Get team performance overview
export const GET_TEAM_PERFORMANCE_OVERVIEW = gql`
  query GetTeamPerformanceOverview(
    $departmentId: UUID!
    $reviewPeriodStart: Date
    $reviewPeriodEnd: Date
  ) {
    departments(condition: { id: $departmentId }) {
      nodes {
        id
        name
        employees {
          nodes {
            id
            displayName
            performanceReviews(
              filter: {
                reviewPeriodStart: $reviewPeriodStart ? { greaterThanOrEqualTo: $reviewPeriodStart } : null
                reviewPeriodEnd: $reviewPeriodEnd ? { lessThanOrEqualTo: $reviewPeriodEnd } : null
                status: { equalTo: "completed" }
              }
              orderBy: [CREATED_AT_DESC]
              first: 1
            ) {
              nodes {
                id
                overallRating
                goalsAchievement
                collaboration
                communication
                leadership
                reviewPeriodStart
                reviewPeriodEnd
                completedAt
              }
            }
          }
        }
      }
    }
  }
`;

// Query: Get review analytics and trends
export const GET_REVIEW_ANALYTICS = gql`
  query GetReviewAnalytics(
    $departmentId: UUID
    $reviewPeriodStart: Date
    $reviewPeriodEnd: Date
  ) {
    performanceReviews(
      filter: {
        reviewPeriodStart: $reviewPeriodStart ? { greaterThanOrEqualTo: $reviewPeriodStart } : null
        reviewPeriodEnd: $reviewPeriodEnd ? { lessThanOrEqualTo: $reviewPeriodEnd } : null
        status: { equalTo: "completed" }
        employee: $departmentId ? { departmentId: { equalTo: $departmentId } } : null
      }
    ) {
      nodes {
        id
        overallRating
        goalsAchievement
        collaboration
        communication
        leadership
        reviewPeriodStart
        reviewPeriodEnd
        employee {
          department {
            id
            name
          }
        }
      }
      totalCount
    }
  }
`;

// Mutation: Create performance review
export const CREATE_PERFORMANCE_REVIEW = gql`
	mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
		createPerformanceReview(input: $input) {
			performanceReview {
				id
				employee {
					id
					displayName
				}
				reviewer {
					id
					displayName
				}
				reviewPeriodStart
				reviewPeriodEnd
				status
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update performance review
export const UPDATE_PERFORMANCE_REVIEW = gql`
	mutation UpdatePerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				status
				overallRating
				goalsAchievement
				collaboration
				communication
				leadership
				strengths
				areasForImprovement
				goalsForNextPeriod
				developmentPlan
				reviewNotes
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Submit performance review
export const SUBMIT_PERFORMANCE_REVIEW = gql`
	mutation SubmitPerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				status
				submittedAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Complete performance review
export const COMPLETE_PERFORMANCE_REVIEW = gql`
	mutation CompletePerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				status
				completedAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Add employee self-assessment
export const ADD_SELF_ASSESSMENT = gql`
	mutation AddSelfAssessment($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			performanceReview {
				id
				employeeSelfAssessment
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Delete performance review
export const DELETE_PERFORMANCE_REVIEW = gql`
	mutation DeletePerformanceReview($input: DeletePerformanceReviewInput!) {
		deletePerformanceReview(input: $input) {
			deletedPerformanceReviewId
			clientMutationId
		}
	}
`;

// TypeScript interfaces for inputs
export interface CreatePerformanceReviewInput {
	clientMutationId?: string;
	performanceReview: {
		employeeId: string;
		reviewerId: string;
		reviewPeriodStart: string;
		reviewPeriodEnd: string;
		status?: PerformanceReviewStatus;
		reviewNotes?: string;
	};
}

export interface UpdatePerformanceReviewInput {
	clientMutationId?: string;
	id: string;
	patch: {
		status?: PerformanceReviewStatus;
		overallRating?: number;
		goalsAchievement?: number;
		collaboration?: number;
		communication?: number;
		leadership?: number;
		strengths?: string;
		areasForImprovement?: string;
		goalsForNextPeriod?: string;
		developmentPlan?: string;
		reviewNotes?: string;
		employeeSelfAssessment?: string;
		submittedAt?: string;
		completedAt?: string;
	};
}

export interface DeletePerformanceReviewInput {
	clientMutationId?: string;
	id: string;
}

export interface PerformanceReviewFilter {
	employeeId?: string;
	reviewerId?: string;
	status?: PerformanceReviewStatus;
	overallRating?: {
		greaterThanOrEqualTo?: number;
		lessThanOrEqualTo?: number;
	};
	reviewPeriodStart?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	reviewPeriodEnd?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

// Utility constants and functions
export const performanceRatings = [
	{
		value: 1,
		label: 'Needs Improvement',
		description: 'Does not meet expectations',
		color: 'red',
		icon: '⚠️'
	},
	{
		value: 2,
		label: 'Below Expectations',
		description: 'Partially meets expectations',
		color: 'orange',
		icon: '📉'
	},
	{
		value: 3,
		label: 'Meets Expectations',
		description: 'Satisfactory performance',
		color: 'yellow',
		icon: '✅'
	},
	{
		value: 4,
		label: 'Exceeds Expectations',
		description: 'Strong performance',
		color: 'blue',
		icon: '⭐'
	},
	{
		value: 5,
		label: 'Outstanding',
		description: 'Exceptional performance',
		color: 'green',
		icon: '🏆'
	}
];

export const reviewStatusOptions = [
	{ value: 'draft', label: 'Draft', color: 'gray', icon: '📝' },
	{ value: 'in_progress', label: 'In Progress', color: 'blue', icon: '⏳' },
	{ value: 'submitted', label: 'Submitted', color: 'yellow', icon: '📤' },
	{ value: 'completed', label: 'Completed', color: 'green', icon: '✅' }
];

export const reviewPeriods = [
	{ value: 'q1', label: 'Q1 (Jan-Mar)', start: '-01-01', end: '-03-31' },
	{ value: 'q2', label: 'Q2 (Apr-Jun)', start: '-04-01', end: '-06-30' },
	{ value: 'q3', label: 'Q3 (Jul-Sep)', start: '-07-01', end: '-09-30' },
	{ value: 'q4', label: 'Q4 (Oct-Dec)', start: '-10-01', end: '-12-31' },
	{ value: 'h1', label: 'H1 (Jan-Jun)', start: '-01-01', end: '-06-30' },
	{ value: 'h2', label: 'H2 (Jul-Dec)', start: '-07-01', end: '-12-31' },
	{ value: 'annual', label: 'Annual (Jan-Dec)', start: '-01-01', end: '-12-31' }
];

// Helper function to get rating info
export function getRatingInfo(rating: number): (typeof performanceRatings)[0] {
	return performanceRatings.find((r) => r.value === rating) || performanceRatings[2];
}

// Helper function to get status info
export function getStatusInfo(status: PerformanceReviewStatus): (typeof reviewStatusOptions)[0] {
	return reviewStatusOptions.find((s) => s.value === status) || reviewStatusOptions[0];
}

// Helper function to calculate review period dates
export function getReviewPeriodDates(period: string, year: number = new Date().getFullYear()) {
	const periodInfo = reviewPeriods.find((p) => p.value === period);
	if (!periodInfo) return null;

	return {
		start: `${year}${periodInfo.start}`,
		end: `${year}${periodInfo.end}`,
		label: periodInfo.label
	};
}

// Helper function to calculate average rating
export function calculateAverageRating(reviews: PerformanceReview[]): number {
	if (!reviews.length) return 0;
	const total = reviews.reduce((sum, review) => sum + (review.overallRating || 0), 0);
	return Math.round((total / reviews.length) * 10) / 10;
}

// Helper function to calculate rating distribution
export function calculateRatingDistribution(reviews: PerformanceReview[]) {
	const distribution = performanceRatings.map((rating) => ({
		...rating,
		count: 0,
		percentage: 0
	}));

	reviews.forEach((review) => {
		if (review.overallRating) {
			const ratingIndex = review.overallRating - 1;
			if (ratingIndex >= 0 && ratingIndex < distribution.length) {
				distribution[ratingIndex].count++;
			}
		}
	});

	// Calculate percentages
	const totalReviews = reviews.length;
	distribution.forEach((rating) => {
		rating.percentage = totalReviews > 0 ? Math.round((rating.count / totalReviews) * 100) : 0;
	});

	return distribution;
}

// Helper function to get review completion rate
export function calculateCompletionRate(reviews: PerformanceReview[]): number {
	if (!reviews.length) return 0;
	const completedReviews = reviews.filter((r) => r.status === 'completed').length;
	return Math.round((completedReviews / reviews.length) * 100);
}

// Helper function to check if review is overdue
export function isReviewOverdue(review: PerformanceReview): boolean {
	if (!review.reviewPeriodEnd || review.status === 'completed') return false;
	const endDate = new Date(review.reviewPeriodEnd);
	const now = new Date();
	const gracePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
	return now.getTime() - endDate.getTime() > gracePeriod;
}

// Helper function to format review period
export function formatReviewPeriod(startDate: string, endDate: string): string {
	const start = new Date(startDate);
	const end = new Date(endDate);

	const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
	const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
	const year = end.getFullYear();

	if (start.getFullYear() === end.getFullYear()) {
		if (start.getMonth() === end.getMonth()) {
			return `${startMonth} ${year}`;
		}
		return `${startMonth} - ${endMonth} ${year}`;
	}

	return `${startMonth} ${start.getFullYear()} - ${endMonth} ${year}`;
}

// Helper function to generate review analytics
export function generateReviewAnalytics(reviews: PerformanceReview[]) {
	const totalReviews = reviews.length;
	const completedReviews = reviews.filter((r) => r.status === 'completed');
	const overdueReviews = reviews.filter(isReviewOverdue);

	const avgOverallRating = calculateAverageRating(completedReviews);
	const avgGoalsAchievement =
		completedReviews.length > 0
			? Math.round(
					(completedReviews.reduce((sum, r) => sum + (r.goalsAchievement || 0), 0) /
						completedReviews.length) *
						10
				) / 10
			: 0;
	const avgCollaboration =
		completedReviews.length > 0
			? Math.round(
					(completedReviews.reduce((sum, r) => sum + (r.collaboration || 0), 0) /
						completedReviews.length) *
						10
				) / 10
			: 0;
	const avgCommunication =
		completedReviews.length > 0
			? Math.round(
					(completedReviews.reduce((sum, r) => sum + (r.communication || 0), 0) /
						completedReviews.length) *
						10
				) / 10
			: 0;
	const avgLeadership =
		completedReviews.length > 0
			? Math.round(
					(completedReviews.reduce((sum, r) => sum + (r.leadership || 0), 0) /
						completedReviews.length) *
						10
				) / 10
			: 0;

	const ratingDistribution = calculateRatingDistribution(completedReviews);
	const completionRate = calculateCompletionRate(reviews);

	return {
		totalReviews,
		completedReviews: completedReviews.length,
		overdueReviews: overdueReviews.length,
		completionRate,
		averageRatings: {
			overall: avgOverallRating,
			goalsAchievement: avgGoalsAchievement,
			collaboration: avgCollaboration,
			communication: avgCommunication,
			leadership: avgLeadership
		},
		ratingDistribution,
		trends: {
			// This would require time-series data analysis
			improvementAreas: ['communication', 'leadership'], // Placeholder
			strongAreas: ['goalsAchievement', 'collaboration'] // Placeholder
		}
	};
}

// TypeScript interfaces for analytics
export interface ReviewAnalytics {
	totalReviews: number;
	completedReviews: number;
	overdueReviews: number;
	completionRate: number;
	averageRatings: {
		overall: number;
		goalsAchievement: number;
		collaboration: number;
		communication: number;
		leadership: number;
	};
	ratingDistribution: Array<{
		value: number;
		label: string;
		color: string;
		count: number;
		percentage: number;
	}>;
	trends: {
		improvementAreas: string[];
		strongAreas: string[];
	};
}

/**
 * T029: Standardized Performance Management Operations with Error Handling
 *
 * Implements standardized performance management operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import type { OperationStore } from '@urql/svelte';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';
import type { ErrorResponse } from '$lib/models/error-response';

export class PerformanceOperations {
	private client: OperationStore;

	constructor(client: OperationStore) {
		this.client = client;
	}

	/**
	 * Get performance reviews with standardized error handling
	 */
	async getPerformanceReviews(params: {
		first?: number;
		offset?: number;
		filter?: PerformanceReviewFilter;
		orderBy?: string[];
		userCredentials: UserCredentials;
	}): Promise<any> {
		// Import required models for standardized error handling
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Create data request with standard timeout and retry configuration
		const dataRequest = createDataRequest({
			operationName: 'GetPerformanceReviews',
			variables: {
				first: params.first || 50,
				offset: params.offset || 0,
				filter: params.filter,
				orderBy: params.orderBy
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		// Retry handler with exponential backoff
		class PerformanceRetryHandler {
			private attempts = 0;

			async execute<T>(fn: () => Promise<T>, request: DataRequest): Promise<T> {
				while (this.attempts <= request.maxRetries) {
					try {
						// Update request status
						(request as any).status = 'pending';

						// Execute with timeout
						const result = await Promise.race([
							fn(),
							new Promise<never>((_, reject) =>
								setTimeout(
									() => reject(new Error('Performance reviews query timeout')),
									request.timeoutMs
								)
							)
						]);

						(request as any).status = 'completed';
						return result;
					} catch (error) {
						this.attempts++;
						(request as any).retryAttempts = this.attempts;

						if (this.attempts > request.maxRetries) {
							(request as any).status = 'failed';

							// Create structured error response
							const errorResponse = createErrorResponse(error, {
								type: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'GRAPHQL_ERROR',
								userMessage:
									'Unable to load performance reviews. Please try again or contact support.'
							});

							console.error('Performance reviews error:', errorResponse.toLogEntry());
							throw errorResponse;
						}

						// Exponential backoff: 1s, 2s, 4s
						const delay = Math.min(1000 * Math.pow(2, this.attempts - 1), 4000);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
				throw new Error('Max retries exceeded');
			}
		}

		const retryHandler = new PerformanceRetryHandler();

		return retryHandler.execute(async () => {
			return new Promise((resolve, reject) => {
				// Subscribe to the performance reviews query
				const unsubscribe = this.client.subscribe(
					{
						query: GET_PERFORMANCE_REVIEWS,
						variables: {
							first: params.first || 50,
							offset: params.offset || 0,
							filter: params.filter,
							orderBy: params.orderBy
						}
					},
					(result) => {
						if (result.error) {
							console.error('Performance reviews GraphQL error:', result.error);
							const errorResponse = createErrorResponse(result.error, {
								type: 'GRAPHQL_ERROR',
								userMessage:
									'Unable to load performance reviews. Please check your permissions and try again.'
							});
							reject(errorResponse);
							unsubscribe();
						} else if (result.data?.performanceReviews) {
							console.log(
								`Loaded ${result.data.performanceReviews.nodes.length} performance reviews`
							);
							resolve(result.data.performanceReviews);
							unsubscribe();
						}
					}
				);
			});
		}, dataRequest);
	}

	/**
	 * Get single performance review by ID
	 */
	async getPerformanceReviewById(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<PerformanceReview> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetPerformanceReview',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 3000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise<PerformanceReview>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Performance review fetch timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Performance review data is taking longer than expected. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: GET_PERFORMANCE_REVIEW,
					variables: { id: params.id }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Performance review by ID error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage: 'Unable to load performance review details. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.performanceReview) {
						console.log(`Loaded performance review: ${result.data.performanceReview.id}`);
						resolve(result.data.performanceReview);
						unsubscribe();
					} else {
						const errorResponse = createErrorResponse(new Error('Performance review not found'), {
							type: 'VALIDATION_ERROR',
							userMessage: 'Performance review not found. Please check the review ID.'
						});
						reject(errorResponse);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Create performance review with error handling
	 */
	async createPerformanceReview(params: {
		input: CreatePerformanceReviewInput;
		userCredentials: UserCredentials;
	}): Promise<PerformanceReview> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreatePerformanceReview',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000, // Longer timeout for mutations
			retryAttempts: 0,
			maxRetries: 1 // Single retry for mutations
		});

		return new Promise<PerformanceReview>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(
					new Error('Performance review creation timeout'),
					{
						type: 'TIMEOUT_ERROR',
						userMessage:
							'Performance review creation is taking longer than expected. Please check if it was created.'
					}
				);
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: CREATE_PERFORMANCE_REVIEW,
					variables: { input: params.input }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Create performance review error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'VALIDATION_ERROR',
							userMessage:
								'Unable to create performance review. Please check the information and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.createPerformanceReview?.performanceReview) {
						console.log(
							`Created performance review: ${result.data.createPerformanceReview.performanceReview.id}`
						);
						resolve(result.data.createPerformanceReview.performanceReview);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Update performance review with error handling
	 */
	async updatePerformanceReview(params: {
		input: UpdatePerformanceReviewInput;
		userCredentials: UserCredentials;
	}): Promise<PerformanceReview> {
		const { DataRequest, createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdatePerformanceReview',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 6000,
			retryAttempts: 0,
			maxRetries: 1
		});

		return new Promise<PerformanceReview>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Performance review update timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Performance review update is taking longer than expected. Please verify the changes were saved.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: UPDATE_PERFORMANCE_REVIEW,
					variables: { input: params.input }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						console.error('Update performance review error:', result.error);
						const errorResponse = createErrorResponse(result.error, {
							type: 'VALIDATION_ERROR',
							userMessage:
								'Unable to update performance review. Please check the information and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data?.updatePerformanceReview?.performanceReview) {
						console.log(
							`Updated performance review: ${result.data.updatePerformanceReview.performanceReview.id}`
						);
						resolve(result.data.updatePerformanceReview.performanceReview);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Get performance statistics with server-side support
	 */
	async getPerformanceStatistics(params: {
		managerId?: string;
		departmentId?: string;
		period?: string;
		userCredentials: UserCredentials;
	}): Promise<ReviewAnalytics> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetPerformanceStatistics',
			variables: {
				managerId: params.managerId,
				departmentId: params.departmentId,
				period: params.period
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Performance statistics timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage: 'Performance statistics are loading slowly. Please try again.'
				});
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			// For now, we'll get all reviews and calculate stats manually
			const unsubscribe = this.client.subscribe(
				{
					query: GET_PERFORMANCE_REVIEWS,
					variables: {
						filter: {
							managerId: params.managerId,
							departmentId: params.departmentId
						},
						first: 1000, // Get all for stats calculation
						offset: 0
					}
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'GRAPHQL_ERROR',
							userMessage: 'Unable to load performance statistics. Please try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						const reviews = result.data.performanceReviews?.nodes || [];
						const analytics = generateReviewAnalytics(reviews);
						resolve(analytics);
						unsubscribe();
					}
				}
			);
		});
	}

	/**
	 * Delete performance review with error handling
	 */
	async deletePerformanceReview(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeletePerformanceReview',
			variables: { input: { id: params.id } },
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 2
		});

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(
					new Error('Performance review deletion timeout'),
					{
						type: 'TIMEOUT_ERROR',
						userMessage:
							'Review deletion is taking longer than expected. Please verify the action completed.'
					}
				);
				reject(errorResponse);
				unsubscribe();
			}, dataRequest.timeoutMs);

			const unsubscribe = this.client.subscribe(
				{
					query: DELETE_PERFORMANCE_REVIEW,
					variables: { input: { id: params.id } }
				},
				(result) => {
					clearTimeout(timeoutId);

					if (result.error) {
						const errorResponse = createErrorResponse(result.error, {
							type: 'PERMISSION_ERROR',
							userMessage:
								'Unable to delete performance review. Please check your permissions and try again.'
						});
						reject(errorResponse);
						unsubscribe();
					} else if (result.data) {
						console.log(`Deleted performance review: ${params.id}`);
						resolve(true);
						unsubscribe();
					}
				}
			);
		});
	}
}

/**
 * Factory function to create PerformanceOperations instance
 */
export function createPerformanceOperations(client: OperationStore): PerformanceOperations {
	return new PerformanceOperations(client);
}

/**
 * Helper function to check if user can manage performance reviews
 */
export function canManagePerformanceReview(
	review: PerformanceReview,
	userCredentials: UserCredentials
): boolean {
	// Admin can manage all reviews
	if (
		userCredentials.permissions.includes('*') ||
		userCredentials.permissions.includes('performance:write')
	) {
		return true;
	}

	// Reviewers can manage their own reviews
	if (review.reviewer?.id === userCredentials.userId) {
		return true;
	}

	return false;
}
