import { gql } from '@urql/svelte';
import { logger } from '$lib/utils/logger';

/**
 * GraphQL Queries for Performance Reviews
 *
 * Updated for Rust backend (async-graphql) schema
 */

/**
 * Get all performance reviews with filtering and pagination
 * Backend: Uses performanceReviews from Rust GraphQL schema
 */
export const GET_PERFORMANCE_REVIEWS = gql`
	query GetPerformanceReviews($employeeId: UUID, $limit: Int = 50, $offset: Int = 0) {
		performanceReviews(employeeId: $employeeId, limit: $limit, offset: $offset) {
			id
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
			employee {
				id
				email
				displayName
				departmentId
				department {
					id
					name
				}
			}
			reviewer {
				id
				email
				displayName
			}
		}
	}
`;

/**
 * Get a single performance review by ID
 * Backend: Uses performanceReview (singular) from Rust GraphQL schema
 */
export const GET_PERFORMANCE_REVIEW_BY_ID = gql`
	query GetPerformanceReviewById($id: UUID!) {
		performanceReview(id: $id) {
			id
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
			employee {
				id
				email
				displayName
				departmentId
				department {
					id
					name
				}
			}
			reviewer {
				id
				email
				displayName
			}
		}
	}
`;

/**
 * Get performance review statistics
 * Backend: Uses performanceReviews from Rust GraphQL schema
 * Note: Statistics calculated client-side for now
 */
export const GET_PERFORMANCE_REVIEW_STATS = gql`
	query GetPerformanceReviewStats($employeeId: UUID, $limit: Int = 1000) {
		performanceReviews(employeeId: $employeeId, limit: $limit, offset: 0) {
			id
			status
			overallRating
			reviewerId
		}
	}
`;

/**
 * Check for active reviews for an employee
 * Backend: Uses performanceReviews from Rust GraphQL schema
 * Note: Status filtering done client-side
 */
export const GET_ACTIVE_REVIEWS_FOR_EMPLOYEE = gql`
	query GetActiveReviewsForEmployee($employeeId: UUID!, $limit: Int = 100) {
		performanceReviews(employeeId: $employeeId, limit: $limit, offset: 0) {
			id
			status
			reviewPeriod
		}
	}
`;

/**
 * Update performance review
 * Backend: Uses updatePerformanceReview mutation from Rust GraphQL schema
 */
export const UPDATE_PERFORMANCE_REVIEW = gql`
	mutation UpdatePerformanceReview($input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(input: $input) {
			id
			status
			overallRating
			goals
			achievements
			areasForImprovement
			managerFeedback
			updatedAt
		}
	}
`;

/**
 * Create a new performance review
 * Backend: Uses createPerformanceReview mutation from Rust GraphQL schema
 */
export const CREATE_PERFORMANCE_REVIEW = gql`
	mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
		createPerformanceReview(input: $input) {
			id
			employeeId
			reviewerId
			reviewPeriod
			status
			createdAt
		}
	}
`;

/**
 * Delete a performance review
 * Backend: Uses deletePerformanceReview mutation from Rust GraphQL schema
 */
export const DELETE_PERFORMANCE_REVIEW = gql`
	mutation DeletePerformanceReview($id: UUID!) {
		deletePerformanceReview(id: $id)
	}
`;

// TypeScript types for query variables
export interface GetPerformanceReviewsVariables {
	employeeId?: string;
	limit?: number;
	offset?: number;
}

export interface GetPerformanceReviewByIdVariables {
	id: string;
}

export interface GetPerformanceReviewStatsVariables {
	employeeId?: string;
	limit?: number;
}

export interface UpdatePerformanceReviewInput {
	id: string;
	status?: string;
	overallRating?: number;
	goals?: string;
	achievements?: string;
	areasForImprovement?: string;
	managerFeedback?: string;
}

export interface UpdatePerformanceReviewVariables {
	input: UpdatePerformanceReviewInput;
}

export interface CreatePerformanceReviewInput {
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	goals?: string;
	status?: string;
}

export interface CreatePerformanceReviewVariables {
	input: CreatePerformanceReviewInput;
}

export interface DeletePerformanceReviewVariables {
	id: string;
}

// Response types
export interface PerformanceReview {
	id: string;
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
	employee?: {
		id: string;
		email: string;
		displayName: string;
		departmentId: string | null;
		department?: {
			id: string;
			name: string;
		} | null;
	};
	reviewer?: {
		id: string;
		email: string;
		displayName: string;
	};
}

export interface PerformanceReviewsResponse {
	performanceReviews: PerformanceReview[];
}

export interface PerformanceReviewStatsResponse {
	notStarted: number;
	inProgress: number;
	completed: number;
	totalCount: number;
	averageRating: number;
}

// Helper functions for status conversion
export function normalizeStatus(status: string): string {
	return status.toLowerCase().replace(/_/g, '-');
}

export function toBackendStatus(status: string): string {
	// Backend may expect specific enum values
	return status.toUpperCase().replace(/-/g, '_');
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
export function formatReviewPeriod(startDate?: string | null, endDate?: string | null): string {
	if (!startDate && !endDate) return 'No period specified';
	if (!startDate) return `Ends ${new Date(endDate!).toLocaleDateString()}`;
	if (!endDate) return `Starts ${new Date(startDate).toLocaleDateString()}`;

	const start = new Date(startDate).toLocaleDateString();
	const end = new Date(endDate).toLocaleDateString();
	return `${start} - ${end}`;
}

/**
 * Check if review is overdue based on period
 */
export function isReviewOverdue(review: PerformanceReview): boolean {
	// If no review or already completed, not overdue
	if (!review || review.status?.toLowerCase() === 'completed') return false;

	// If no period, check if created date is older than 30 days
	if (!review.reviewPeriod && review.createdAt) {
		const createdDate = new Date(review.createdAt);
		const now = new Date();
		const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
		return daysDiff > 30;
	}

	// Simple logic: if period contains a past year or quarter, it's overdue
	const currentYear = new Date().getFullYear();
	const periodYear = parseInt(review.reviewPeriod?.match(/\d{4}/)?.[0] || '0');

	return periodYear < currentYear;
}

/**
 * Calculate statistics from review data (client-side)
 */
export function calculateReviewStats(reviews: PerformanceReview[]): PerformanceReviewStatsResponse {
	const notStarted = reviews.filter((r) => normalizeStatus(r.status) === 'not-started').length;
	const inProgress = reviews.filter((r) => normalizeStatus(r.status) === 'in-progress').length;
	const completed = reviews.filter((r) => normalizeStatus(r.status) === 'completed').length;

	const ratingsSum = reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0);
	const averageRating = reviews.length > 0 ? ratingsSum / reviews.length : 0;

	return {
		notStarted,
		inProgress,
		completed,
		totalCount: reviews.length,
		averageRating: Math.round(averageRating * 10) / 10 // Round to 1 decimal
	};
}

/**
 * Filter active reviews (client-side)
 */
export function filterActiveReviews(reviews: PerformanceReview[]): PerformanceReview[] {
	return reviews.filter((r) => normalizeStatus(r.status) !== 'completed');
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
			logger.info(`Update performance review: ${params}`);
			return { success: true };
		},

		async submitReview(params: { id: string; overallRating: number; managerFeedback: string }) {
			logger.info(`Submit performance review: ${params}`);
			return { success: true };
		}
	};
}
