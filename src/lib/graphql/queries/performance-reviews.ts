/**
 * PostGraphile GraphQL Queries for Performance Reviews
 *
 * This file contains all GraphQL queries for performance review management
 * using PostGraphile's auto-generated schema.
 */

/**
 * Get all performance reviews with filtering, pagination, and user relationships
 */
export const GET_PERFORMANCE_REVIEWS = `
  query GetPerformanceReviews(
    $first: Int
    $offset: Int
    $orderBy: [PerformanceReviewsOrderBy!]
    $condition: PerformanceReviewCondition
  ) {
    allPerformanceReviews(
      first: $first
      offset: $offset
      orderBy: $orderBy
      condition: $condition
    ) {
      totalCount
      nodes {
        id
        nodeId
        employeeId
        reviewerId
        reviewPeriod
        status
        overallRating
        goals
        achievements
        areasForImprovement
        managerFeedback
        createdAt
        updatedAt
        userByEmployeeId {
          id
          email
          displayName
          departmentId
          departmentByDepartmentId {
            id
            name
          }
        }
        userByReviewerId {
          id
          email
          displayName
        }
      }
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
 * Get a single performance review by ID
 */
export const GET_PERFORMANCE_REVIEW_BY_ID = `
  query GetPerformanceReviewById($id: UUID!) {
    performanceReviewById(id: $id) {
      id
      nodeId
      employeeId
      reviewerId
      reviewPeriod
      status
      overallRating
      goals
      achievements
      areasForImprovement
      managerFeedback
      createdAt
      updatedAt
      userByEmployeeId {
        id
        email
        displayName
        departmentId
        departmentByDepartmentId {
          id
          name
        }
      }
      userByReviewerId {
        id
        email
        displayName
      }
    }
  }
`;

/**
 * Get performance review statistics
 */
export const GET_PERFORMANCE_REVIEW_STATS = `
  query GetPerformanceReviewStats(
    $reviewerId: UUID
  ) {
    notStarted: allPerformanceReviews(
      condition: { status: NOT_STARTED, reviewerId: $reviewerId }
    ) {
      totalCount
    }
    inProgress: allPerformanceReviews(
      condition: { status: IN_PROGRESS, reviewerId: $reviewerId }
    ) {
      totalCount
    }
    completed: allPerformanceReviews(
      condition: { status: COMPLETED, reviewerId: $reviewerId }
    ) {
      totalCount
    }
    allReviews: allPerformanceReviews(
      condition: { reviewerId: $reviewerId }
    ) {
      totalCount
      nodes {
        overallRating
        status
      }
    }
  }
`;

/**
 * Update performance review
 */
export const UPDATE_PERFORMANCE_REVIEW = `
  mutation UpdatePerformanceReview(
    $id: UUID!
    $status: ReviewStatus
    $overallRating: BigFloat
    $goals: String
    $achievements: String
    $areasForImprovement: String
    $managerFeedback: String
  ) {
    updatePerformanceReviewById(
      input: {
        id: $id
        performanceReviewPatch: {
          status: $status
          overallRating: $overallRating
          goals: $goals
          achievements: $achievements
          areasForImprovement: $areasForImprovement
          managerFeedback: $managerFeedback
          updatedAt: "now()"
        }
      }
    ) {
      performanceReview {
        id
        status
        overallRating
        updatedAt
      }
    }
  }
`;

/**
 * Create a new performance review
 */
export const CREATE_PERFORMANCE_REVIEW = `
  mutation CreatePerformanceReview(
    $employeeId: UUID!
    $reviewerId: UUID!
    $reviewPeriod: String!
    $goals: String
  ) {
    createPerformanceReview(
      input: {
        performanceReview: {
          employeeId: $employeeId
          reviewerId: $reviewerId
          reviewPeriod: $reviewPeriod
          status: NOT_STARTED
          goals: $goals
          overallRating: "0"
        }
      }
    ) {
      performanceReview {
        id
        nodeId
        employeeId
        reviewerId
        reviewPeriod
        status
        createdAt
      }
    }
  }
`;

/**
 * Delete a performance review
 */
export const DELETE_PERFORMANCE_REVIEW = `
  mutation DeletePerformanceReview($id: UUID!) {
    deletePerformanceReviewById(input: { id: $id }) {
      performanceReview {
        id
      }
    }
  }
`;

// TypeScript types for query variables
export interface GetPerformanceReviewsVariables {
	first?: number;
	offset?: number;
	orderBy?: string[];
	condition?: PerformanceReviewCondition;
}

export interface PerformanceReviewCondition {
	employeeId?: string;
	reviewerId?: string;
	reviewPeriod?: string;
	status?: string;
}

export interface GetPerformanceReviewByIdVariables {
	id: string;
}

export interface GetPerformanceReviewStatsVariables {
	reviewerId?: string;
}

export interface UpdatePerformanceReviewVariables {
	id: string;
	status?: string;
	overallRating?: number;
	goals?: string;
	achievements?: string;
	areasForImprovement?: string;
	managerFeedback?: string;
}

export interface CreatePerformanceReviewVariables {
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	goals?: string;
}

export interface DeletePerformanceReviewVariables {
	id: string;
}

// Response types
export interface PerformanceReview {
	id: string;
	nodeId: string;
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	status: string;
	overallRating: number;
	goals: string | null;
	achievements: string | null;
	areasForImprovement: string | null;
	managerFeedback: string | null;
	createdAt: string;
	updatedAt: string;
	userByEmployeeId?: {
		id: string;
		email: string;
		displayName: string;
		departmentId: string | null;
		departmentByDepartmentId?: {
			id: string;
			name: string;
		} | null;
	};
	userByReviewerId?: {
		id: string;
		email: string;
		displayName: string;
	};
}

export interface PerformanceReviewsResponse {
	allPerformanceReviews: {
		totalCount: number;
		nodes: PerformanceReview[];
		pageInfo: {
			hasNextPage: boolean;
			hasPreviousPage: boolean;
			startCursor: string | null;
			endCursor: string | null;
		};
	};
}

export interface PerformanceReviewStatsResponse {
	notStarted: { totalCount: number };
	inProgress: { totalCount: number };
	completed: { totalCount: number };
	allReviews: {
		totalCount: number;
		nodes: Array<{
			overallRating: number;
			status: string;
		}>;
	};
}

// Helper functions for status conversion
export function toPostGraphileStatus(status: string): string {
	return status.toUpperCase().replace(/-/g, '_');
}

export function fromPostGraphileStatus(status: string): string {
	return status.toLowerCase().replace(/_/g, '-');
}

// UI Helper Functions

/**
 * Performance rating options
 */
export const performanceRatings = [
	{ value: 1, label: 'Needs Improvement', color: 'red' },
	{ value: 2, label: 'Below Expectations', color: 'orange' },
	{ value: 3, label: 'Meets Expectations', color: 'yellow' },
	{ value: 4, label: 'Exceeds Expectations', color: 'green' },
	{ value: 5, label: 'Outstanding', color: 'blue' }
];

/**
 * Review status options for UI
 */
export const reviewStatusOptions = [
	{ value: 'not-started', label: 'Not Started' },
	{ value: 'in-progress', label: 'In Progress' },
	{ value: 'completed', label: 'Completed' }
];

/**
 * Review period options
 */
export const reviewPeriods = [
	{ value: 'Q1-2025', label: 'Q1 2025' },
	{ value: 'Q2-2025', label: 'Q2 2025' },
	{ value: 'Q3-2025', label: 'Q3 2025' },
	{ value: 'Q4-2025', label: 'Q4 2025' },
	{ value: 'H1-2025', label: 'H1 2025' },
	{ value: 'H2-2025', label: 'H2 2025' },
	{ value: 'Annual-2025', label: 'Annual 2025' }
];

/**
 * Get rating information including color and label
 */
export function getRatingInfo(rating: number): { label: string; color: string; value: number } {
	const ratingInfo = performanceRatings.find((r) => r.value === Math.round(rating));
	return ratingInfo || { value: 0, label: 'Not Rated', color: 'gray' };
}

/**
 * Get status information including color and icon
 */
export function getStatusInfo(status: string): {
	label: string;
	color: string;
	variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
	const statusLower = status.toLowerCase().replace(/_/g, '-');
	switch (statusLower) {
		case 'not-started':
			return { label: 'Not Started', color: 'gray', variant: 'outline' };
		case 'in-progress':
			return { label: 'In Progress', color: 'blue', variant: 'secondary' };
		case 'completed':
			return { label: 'Completed', color: 'green', variant: 'default' };
		default:
			return { label: 'Unknown', color: 'gray', variant: 'outline' };
	}
}

/**
 * Format review period for display
 */
export function formatReviewPeriod(period: string): string {
	return period.replace(/-/g, ' ');
}

/**
 * Check if review is overdue based on period
 */
export function isReviewOverdue(period: string, status: string): boolean {
	if (status.toLowerCase().replace(/_/g, '-') === 'completed') return false;

	// Simple logic: if period contains a past year or quarter, it's overdue
	const currentYear = new Date().getFullYear();
	const periodYear = parseInt(period.match(/\d{4}/)?.[0] || '0');

	return periodYear < currentYear;
}

/**
 * Create performance management operations
 */
export function createPerformanceOperations(client: any) {
	return {
		async updateReview(params: {
			id: string;
			status?: string;
			overallRating?: number;
			goals?: string;
			achievements?: string;
			areasForImprovement?: string;
			managerFeedback?: string;
		}) {
			console.log('Update performance review:', params);
			return { success: true };
		},

		async submitReview(params: { id: string; overallRating: number; managerFeedback: string }) {
			console.log('Submit performance review:', params);
			return { success: true };
		}
	};
}
