/**
 * GraphQL Operations for Performance Management
 * Generated for PostGraphile schema introspection
 */

import { gql } from '@urql/svelte';

// Fragments for reusable field sets
export const PERFORMANCE_CYCLE_FIELDS = gql`
	fragment PerformanceCycleFields on PerformanceCycle {
		id
		name
		description
		startDate
		endDate
		isActive
		createdAt
		updatedAt
	}
`;

export const PERFORMANCE_REVIEW_BASIC_FIELDS = gql`
	fragment PerformanceReviewBasicFields on PerformanceReview {
		id
		employeeId
		reviewerId
		cycleId
		reviewPeriodStart
		reviewPeriodEnd
		overallRating
		status
		submittedAt
		completedAt
		createdAt
		updatedAt
	}
`;

export const PERFORMANCE_REVIEW_FULL_FIELDS = gql`
	fragment PerformanceReviewFullFields on PerformanceReview {
		...PerformanceReviewBasicFields
		selfAssessment
		reviewerComments
		strengths
		areasForImprovement
		developmentPlan
		metadata
	}
	${PERFORMANCE_REVIEW_BASIC_FIELDS}
`;

export const PERFORMANCE_GOAL_FIELDS = gql`
	fragment PerformanceGoalFields on PerformanceGoal {
		id
		employeeId
		title
		description
		targetDate
		status
		progress
		priority
		reviewId
		createdAt
		updatedAt
	}
`;

export const USER_BASIC_FIELDS = gql`
	fragment UserBasicFields on User {
		id
		email
		displayName
		isActive
	}
`;

// Query: Get all performance cycles
export const GET_PERFORMANCE_CYCLES_QUERY = gql`
	query GetPerformanceCycles(
		$first: Int
		$offset: Int
		$orderBy: [PerformanceCyclesOrderBy!]
		$condition: PerformanceCycleCondition
	) {
		allPerformanceCycles(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				...PerformanceCycleFields
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${PERFORMANCE_CYCLE_FIELDS}
`;

// Query: Get active performance cycles
export const GET_ACTIVE_PERFORMANCE_CYCLES_QUERY = gql`
	query GetActivePerformanceCycles {
		allPerformanceCycles(condition: { isActive: true }, orderBy: START_DATE_DESC) {
			nodes {
				...PerformanceCycleFields
			}
		}
	}
	${PERFORMANCE_CYCLE_FIELDS}
`;

// Query: Get performance cycle by ID
export const GET_PERFORMANCE_CYCLE_BY_ID_QUERY = gql`
	query GetPerformanceCycleById($id: UUID!) {
		performanceCycleById(id: $id) {
			...PerformanceCycleFields
			performanceReviewsByCycleId {
				totalCount
				nodes {
					...PerformanceReviewBasicFields
					userByEmployeeId {
						...UserBasicFields
					}
				}
			}
		}
	}
	${PERFORMANCE_CYCLE_FIELDS}
	${PERFORMANCE_REVIEW_BASIC_FIELDS}
	${USER_BASIC_FIELDS}
`;

// Query: Get employee performance reviews
export const GET_EMPLOYEE_PERFORMANCE_REVIEWS_QUERY = gql`
	query GetEmployeePerformanceReviews(
		$employeeId: UUID!
		$first: Int
		$offset: Int
		$orderBy: [PerformanceReviewsOrderBy!]
	) {
		allPerformanceReviews(
			first: $first
			offset: $offset
			condition: { employeeId: $employeeId }
			orderBy: $orderBy
		) {
			nodes {
				...PerformanceReviewFullFields
				performanceCycleByCycleId {
					...PerformanceCycleFields
				}
				userByEmployeeId {
					...UserBasicFields
				}
				reviewerByReviewerId: userByReviewerId {
					...UserBasicFields
				}
				performanceGoalsByReviewId {
					nodes {
						...PerformanceGoalFields
					}
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${PERFORMANCE_REVIEW_FULL_FIELDS}
	${PERFORMANCE_CYCLE_FIELDS}
	${USER_BASIC_FIELDS}
	${PERFORMANCE_GOAL_FIELDS}
`;

// Query: Get performance review by ID
export const GET_PERFORMANCE_REVIEW_BY_ID_QUERY = gql`
	query GetPerformanceReviewById($id: UUID!) {
		performanceReviewById(id: $id) {
			...PerformanceReviewFullFields
			performanceCycleByCycleId {
				...PerformanceCycleFields
			}
			userByEmployeeId {
				...UserBasicFields
			}
			reviewerByReviewerId: userByReviewerId {
				...UserBasicFields
			}
			performanceGoalsByReviewId {
				nodes {
					...PerformanceGoalFields
				}
			}
		}
	}
	${PERFORMANCE_REVIEW_FULL_FIELDS}
	${PERFORMANCE_CYCLE_FIELDS}
	${USER_BASIC_FIELDS}
	${PERFORMANCE_GOAL_FIELDS}
`;

// Query: Get pending performance reviews for reviewer
export const GET_PENDING_REVIEWS_FOR_REVIEWER_QUERY = gql`
	query GetPendingReviewsForReviewer($reviewerId: UUID!, $first: Int, $offset: Int) {
		allPerformanceReviews(
			first: $first
			offset: $offset
			condition: { reviewerId: $reviewerId, status: IN_PROGRESS }
			orderBy: REVIEW_PERIOD_END_ASC
		) {
			nodes {
				...PerformanceReviewBasicFields
				userByEmployeeId {
					...UserBasicFields
				}
				performanceCycleByCycleId {
					...PerformanceCycleFields
				}
			}
			totalCount
		}
	}
	${PERFORMANCE_REVIEW_BASIC_FIELDS}
	${USER_BASIC_FIELDS}
	${PERFORMANCE_CYCLE_FIELDS}
`;

// Query: Get all performance reviews for management view
export const GET_ALL_PERFORMANCE_REVIEWS_QUERY = gql`
	query GetAllPerformanceReviews(
		$cycleId: UUID
		$status: String
		$first: Int
		$offset: Int
		$orderBy: [PerformanceReviewsOrderBy!]
	) {
		allPerformanceReviews(
			first: $first
			offset: $offset
			condition: { cycleId: $cycleId, status: $status }
			orderBy: $orderBy
		) {
			nodes {
				...PerformanceReviewBasicFields
				userByEmployeeId {
					...UserBasicFields
				}
				reviewerByReviewerId: userByReviewerId {
					...UserBasicFields
				}
				performanceCycleByCycleId {
					...PerformanceCycleFields
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${PERFORMANCE_REVIEW_BASIC_FIELDS}
	${USER_BASIC_FIELDS}
	${PERFORMANCE_CYCLE_FIELDS}
`;

// Query: Get employee performance goals
export const GET_EMPLOYEE_PERFORMANCE_GOALS_QUERY = gql`
	query GetEmployeePerformanceGoals(
		$employeeId: UUID!
		$status: String
		$first: Int
		$offset: Int
		$orderBy: [PerformanceGoalsOrderBy!]
	) {
		allPerformanceGoals(
			first: $first
			offset: $offset
			condition: { employeeId: $employeeId, status: $status }
			orderBy: $orderBy
		) {
			nodes {
				...PerformanceGoalFields
				userByEmployeeId {
					...UserBasicFields
				}
				performanceReviewByReviewId {
					...PerformanceReviewBasicFields
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
	${PERFORMANCE_GOAL_FIELDS}
	${USER_BASIC_FIELDS}
	${PERFORMANCE_REVIEW_BASIC_FIELDS}
`;

// Query: Get performance goal by ID
export const GET_PERFORMANCE_GOAL_BY_ID_QUERY = gql`
	query GetPerformanceGoalById($id: UUID!) {
		performanceGoalById(id: $id) {
			...PerformanceGoalFields
			userByEmployeeId {
				...UserBasicFields
			}
			performanceReviewByReviewId {
				...PerformanceReviewBasicFields
			}
		}
	}
	${PERFORMANCE_GOAL_FIELDS}
	${USER_BASIC_FIELDS}
	${PERFORMANCE_REVIEW_BASIC_FIELDS}
`;

// Query: Get performance statistics for dashboard
export const GET_PERFORMANCE_STATS_QUERY = gql`
	query GetPerformanceStats($cycleId: UUID!) {
		totalReviews: allPerformanceReviews(condition: { cycleId: $cycleId }) {
			totalCount
		}
		completedReviews: allPerformanceReviews(condition: { cycleId: $cycleId, status: COMPLETED }) {
			totalCount
		}
		inProgressReviews: allPerformanceReviews(
			condition: { cycleId: $cycleId, status: IN_PROGRESS }
		) {
			totalCount
		}
		notStartedReviews: allPerformanceReviews(
			condition: { cycleId: $cycleId, status: NOT_STARTED }
		) {
			totalCount
		}
		overdueReviews: allPerformanceReviews(
			condition: { cycleId: $cycleId }
			filter: {
				and: [{ status: { notEqualTo: COMPLETED } }, { reviewPeriodEnd: { lessThan: "now()" } }]
			}
		) {
			totalCount
		}
	}
`;

// Query: Get performance ratings distribution
export const GET_PERFORMANCE_RATINGS_DISTRIBUTION_QUERY = gql`
	query GetPerformanceRatingsDistribution($cycleId: UUID!) {
		exceededExpectations: allPerformanceReviews(
			condition: { cycleId: $cycleId, overallRating: EXCEEDED_EXPECTATIONS }
		) {
			totalCount
		}
		metExpectations: allPerformanceReviews(
			condition: { cycleId: $cycleId, overallRating: MET_EXPECTATIONS }
		) {
			totalCount
		}
		partiallyMetExpectations: allPerformanceReviews(
			condition: { cycleId: $cycleId, overallRating: PARTIALLY_MET_EXPECTATIONS }
		) {
			totalCount
		}
		didNotMeetExpectations: allPerformanceReviews(
			condition: { cycleId: $cycleId, overallRating: DID_NOT_MEET_EXPECTATIONS }
		) {
			totalCount
		}
	}
`;

// Mutation: Create performance cycle
export const CREATE_PERFORMANCE_CYCLE_MUTATION = gql`
	mutation CreatePerformanceCycle($input: CreatePerformanceCycleInput!) {
		createPerformanceCycle(input: $input) {
			performanceCycle {
				...PerformanceCycleFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_CYCLE_FIELDS}
`;

// Mutation: Update performance cycle
export const UPDATE_PERFORMANCE_CYCLE_MUTATION = gql`
	mutation UpdatePerformanceCycle($input: UpdatePerformanceCycleByIdInput!) {
		updatePerformanceCycleById(input: $input) {
			performanceCycle {
				...PerformanceCycleFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_CYCLE_FIELDS}
`;

// Mutation: Create performance review
export const CREATE_PERFORMANCE_REVIEW_MUTATION = gql`
	mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
		createPerformanceReview(input: $input) {
			performanceReview {
				...PerformanceReviewFullFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_REVIEW_FULL_FIELDS}
`;

// Mutation: Update performance review
export const UPDATE_PERFORMANCE_REVIEW_MUTATION = gql`
	mutation UpdatePerformanceReview($input: UpdatePerformanceReviewByIdInput!) {
		updatePerformanceReviewById(input: $input) {
			performanceReview {
				...PerformanceReviewFullFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_REVIEW_FULL_FIELDS}
`;

// Mutation: Submit self-assessment
export const SUBMIT_SELF_ASSESSMENT_MUTATION = gql`
	mutation SubmitSelfAssessment(
		$id: UUID!
		$selfAssessment: JSON!
		$status: PerformanceRatingEnum
	) {
		updatePerformanceReviewById(
			input: {
				id: $id
				performanceReviewPatch: {
					selfAssessment: $selfAssessment
					status: $status
					submittedAt: "now()"
				}
			}
		) {
			performanceReview {
				...PerformanceReviewFullFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_REVIEW_FULL_FIELDS}
`;

// Mutation: Complete performance review
export const COMPLETE_PERFORMANCE_REVIEW_MUTATION = gql`
	mutation CompletePerformanceReview(
		$id: UUID!
		$reviewerComments: String
		$overallRating: PerformanceRatingEnum!
		$strengths: String
		$areasForImprovement: String
		$developmentPlan: String
	) {
		updatePerformanceReviewById(
			input: {
				id: $id
				performanceReviewPatch: {
					reviewerComments: $reviewerComments
					overallRating: $overallRating
					strengths: $strengths
					areasForImprovement: $areasForImprovement
					developmentPlan: $developmentPlan
					status: COMPLETED
					completedAt: "now()"
				}
			}
		) {
			performanceReview {
				...PerformanceReviewFullFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_REVIEW_FULL_FIELDS}
`;

// Mutation: Create performance goal
export const CREATE_PERFORMANCE_GOAL_MUTATION = gql`
	mutation CreatePerformanceGoal($input: CreatePerformanceGoalInput!) {
		createPerformanceGoal(input: $input) {
			performanceGoal {
				...PerformanceGoalFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_GOAL_FIELDS}
`;

// Mutation: Update performance goal
export const UPDATE_PERFORMANCE_GOAL_MUTATION = gql`
	mutation UpdatePerformanceGoal($input: UpdatePerformanceGoalByIdInput!) {
		updatePerformanceGoalById(input: $input) {
			performanceGoal {
				...PerformanceGoalFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_GOAL_FIELDS}
`;

// Mutation: Update goal progress
export const UPDATE_GOAL_PROGRESS_MUTATION = gql`
	mutation UpdateGoalProgress($id: UUID!, $progress: Int!, $status: String) {
		updatePerformanceGoalById(
			input: { id: $id, performanceGoalPatch: { progress: $progress, status: $status } }
		) {
			performanceGoal {
				...PerformanceGoalFields
			}
			clientMutationId
		}
	}
	${PERFORMANCE_GOAL_FIELDS}
`;

// TypeScript interfaces for type safety
export interface PerformanceCycle {
	id: string;
	name: string;
	description?: string;
	startDate: string;
	endDate: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface PerformanceReview {
	id: string;
	employeeId: string;
	reviewerId: string;
	cycleId: string;
	reviewPeriodStart: string;
	reviewPeriodEnd: string;
	overallRating?:
		| 'EXCEEDED_EXPECTATIONS'
		| 'MET_EXPECTATIONS'
		| 'PARTIALLY_MET_EXPECTATIONS'
		| 'DID_NOT_MEET_EXPECTATIONS';
	status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
	selfAssessment?: Record<string, any>;
	reviewerComments?: string;
	strengths?: string;
	areasForImprovement?: string;
	developmentPlan?: string;
	submittedAt?: string;
	completedAt?: string;
	metadata?: Record<string, any>;
	createdAt: string;
	updatedAt: string;
	performanceCycleByCycleId?: PerformanceCycle;
	userByEmployeeId?: {
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
	};
	reviewerByReviewerId?: {
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
	};
	performanceGoalsByReviewId?: {
		nodes: PerformanceGoal[];
	};
}

export interface PerformanceGoal {
	id: string;
	employeeId: string;
	title: string;
	description?: string;
	targetDate: string;
	status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	progress: number;
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
	reviewId?: string;
	createdAt: string;
	updatedAt: string;
	userByEmployeeId?: {
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
	};
	performanceReviewByReviewId?: PerformanceReview;
}

export interface PerformanceStats {
	totalReviews: { totalCount: number };
	completedReviews: { totalCount: number };
	inProgressReviews: { totalCount: number };
	notStartedReviews: { totalCount: number };
	overdueReviews: { totalCount: number };
}

export interface PerformanceRatingsDistribution {
	exceededExpectations: { totalCount: number };
	metExpectations: { totalCount: number };
	partiallyMetExpectations: { totalCount: number };
	didNotMeetExpectations: { totalCount: number };
}

export interface CreatePerformanceCycleInput {
	performanceCycle: {
		name: string;
		description?: string;
		startDate: string;
		endDate: string;
		isActive?: boolean;
	};
	clientMutationId?: string;
}

export interface CreatePerformanceReviewInput {
	performanceReview: {
		employeeId: string;
		reviewerId: string;
		cycleId: string;
		reviewPeriodStart: string;
		reviewPeriodEnd: string;
		status?: string;
	};
	clientMutationId?: string;
}

export interface CreatePerformanceGoalInput {
	performanceGoal: {
		employeeId: string;
		title: string;
		description?: string;
		targetDate: string;
		priority?: string;
		reviewId?: string;
	};
	clientMutationId?: string;
}

export interface UpdatePerformanceReviewInput {
	id: string;
	performanceReviewPatch: {
		overallRating?: string;
		status?: string;
		selfAssessment?: Record<string, any>;
		reviewerComments?: string;
		strengths?: string;
		areasForImprovement?: string;
		developmentPlan?: string;
		submittedAt?: string;
		completedAt?: string;
		metadata?: Record<string, any>;
	};
	clientMutationId?: string;
}

// Utility functions for performance management
export const PerformanceUtils = {
	/**
	 * Calculate progress percentage
	 */
	calculateProgress: (completed: number, total: number): number => {
		return total > 0 ? Math.round((completed / total) * 100) : 0;
	},

	/**
	 * Get rating color for UI
	 */
	getRatingColor: (rating: string): string => {
		switch (rating) {
			case 'EXCEEDED_EXPECTATIONS':
				return 'success';
			case 'MET_EXPECTATIONS':
				return 'primary';
			case 'PARTIALLY_MET_EXPECTATIONS':
				return 'warning';
			case 'DID_NOT_MEET_EXPECTATIONS':
				return 'error';
			default:
				return 'default';
		}
	},

	/**
	 * Get status color for UI
	 */
	getStatusColor: (status: string): string => {
		switch (status) {
			case 'COMPLETED':
				return 'success';
			case 'IN_PROGRESS':
				return 'primary';
			case 'NOT_STARTED':
				return 'secondary';
			case 'OVERDUE':
				return 'error';
			case 'CANCELLED':
				return 'warning';
			default:
				return 'default';
		}
	},

	/**
	 * Format rating for display
	 */
	formatRating: (rating: string): string => {
		switch (rating) {
			case 'EXCEEDED_EXPECTATIONS':
				return 'Exceeded Expectations';
			case 'MET_EXPECTATIONS':
				return 'Met Expectations';
			case 'PARTIALLY_MET_EXPECTATIONS':
				return 'Partially Met Expectations';
			case 'DID_NOT_MEET_EXPECTATIONS':
				return 'Did Not Meet Expectations';
			default:
				return rating;
		}
	},

	/**
	 * Format status for display
	 */
	formatStatus: (status: string): string => {
		switch (status) {
			case 'NOT_STARTED':
				return 'Not Started';
			case 'IN_PROGRESS':
				return 'In Progress';
			case 'COMPLETED':
				return 'Completed';
			case 'OVERDUE':
				return 'Overdue';
			case 'CANCELLED':
				return 'Cancelled';
			default:
				return status;
		}
	},

	/**
	 * Check if review is overdue
	 */
	isOverdue: (review: PerformanceReview): boolean => {
		if (review.status === 'COMPLETED') return false;
		const endDate = new Date(review.reviewPeriodEnd);
		const now = new Date();
		return endDate < now;
	},

	/**
	 * Get days until deadline
	 */
	getDaysUntilDeadline: (targetDate: string): number => {
		const target = new Date(targetDate);
		const now = new Date();
		const diffTime = target.getTime() - now.getTime();
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	},

	/**
	 * Calculate review completion rate
	 */
	calculateCompletionRate: (stats: PerformanceStats): number => {
		const total = stats.totalReviews.totalCount;
		const completed = stats.completedReviews.totalCount;
		return total > 0 ? Math.round((completed / total) * 100) : 0;
	}
};
