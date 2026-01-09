import { gql } from '@urql/svelte';

/**
 * GraphQL Queries for Performance Management
 *
 * Updated for Rust backend (async-graphql) schema
 * Removed PostGraphile patterns (PerformanceReviewsOrderBy, PerformanceReviewFilter, Relay connections)
 */

/**
 * Query: Get performance reviews with pagination
 * Backend: Uses performanceReviews from Rust GraphQL schema
 * RLS Policy: manager_view_department_performance_reviews
 * Covers: FR-003, FR-014
 */
export const GET_PERFORMANCE_REVIEWS = gql`
	query GetPerformanceReviews($employeeId: UUID, $limit: Int = 20, $offset: Int = 0) {
		performanceReviews(employeeId: $employeeId, limit: $limit, offset: $offset) {
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
 * Query: Get single performance review by ID (department-scoped)
 * Backend: Uses performanceReview from Rust GraphQL schema
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
 * Query: Get all performance reviews for statistics calculation
 * Backend: Uses performanceReviews from Rust GraphQL schema
 * Note: Statistics are calculated client-side
 * Covers: FR-014
 */
export const GET_PERFORMANCE_REVIEWS_FOR_STATS = gql`
	query GetPerformanceReviewsForStats($limit: Int = 1000, $offset: Int = 0) {
		performanceReviews(limit: $limit, offset: $offset) {
			id
			employeeId
			employee {
				id
				departmentId
			}
			overallRating
			goalsAchievement
			collaboration
			communication
			leadership
			technicalSkills
			status
			reviewDate
		}
	}
`;

// =============================================================================
// CLIENT-SIDE HELPER FUNCTIONS & TYPES
// =============================================================================

/**
 * Performance review interface
 */
export interface PerformanceReview {
	id: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
		departmentId?: string;
		department?: {
			id: string;
			name: string;
		} | null;
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
	technicalSkills: number;
	strengths: string;
	areasForImprovement: string;
	comments: string | null;
	status: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Performance statistics interface
 */
export interface PerformanceStatistics {
	totalReviews: number;
	completedReviews: number;
	inProgressReviews: number;
	overdueReviews: number;
	averageOverallRating: number;
	averageGoalsAchievement: number;
	averageCollaboration: number;
	averageCommunication: number;
	averageLeadership: number;
	averageTechnicalSkills: number;
}

/**
 * Filter reviews by department (client-side)
 */
export function filterByDepartment(
	reviews: PerformanceReview[],
	departmentId: string
): PerformanceReview[] {
	return reviews.filter((review) => review.employee.departmentId === departmentId);
}

/**
 * Filter reviews by status (client-side)
 */
export function filterByStatus(
	reviews: PerformanceReview[],
	status: string
): PerformanceReview[] {
	return reviews.filter((review) => review.status === status);
}

/**
 * Filter reviews by employee (client-side)
 */
export function filterByEmployee(
	reviews: PerformanceReview[],
	employeeId: string
): PerformanceReview[] {
	return reviews.filter((review) => review.employeeId === employeeId);
}

/**
 * Filter reviews by reviewer (client-side)
 */
export function filterByReviewer(
	reviews: PerformanceReview[],
	reviewerId: string
): PerformanceReview[] {
	return reviews.filter((review) => review.reviewerId === reviewerId);
}

/**
 * Filter reviews by date range (client-side)
 */
export function filterByDateRange(
	reviews: PerformanceReview[],
	startDate?: string,
	endDate?: string
): PerformanceReview[] {
	let filtered = reviews;

	if (startDate) {
		const start = new Date(startDate);
		filtered = filtered.filter((review) => new Date(review.reviewDate) >= start);
	}

	if (endDate) {
		const end = new Date(endDate);
		filtered = filtered.filter((review) => new Date(review.reviewDate) <= end);
	}

	return filtered;
}

/**
 * Filter overdue reviews (client-side)
 * A review is overdue if status is 'overdue' or if reviewDate is in the past and status is not 'completed'
 */
export function filterOverdueReviews(reviews: PerformanceReview[]): PerformanceReview[] {
	const now = new Date();
	return reviews.filter(
		(review) =>
			review.status === 'overdue' ||
			(review.status !== 'completed' && new Date(review.reviewDate) < now)
	);
}

/**
 * Calculate performance statistics for a department (client-side)
 */
export function calculatePerformanceStatistics(
	reviews: PerformanceReview[],
	departmentId?: string
): PerformanceStatistics {
	// Filter by department if specified
	let filteredReviews = reviews;
	if (departmentId) {
		filteredReviews = filterByDepartment(reviews, departmentId);
	}

	const totalReviews = filteredReviews.length;
	const completedReviews = filteredReviews.filter((r) => r.status === 'completed').length;
	const inProgressReviews = filteredReviews.filter((r) => r.status === 'in_progress').length;
	const overdueReviews = filterOverdueReviews(filteredReviews).length;

	// Calculate averages from completed reviews only
	const completed = filteredReviews.filter((r) => r.status === 'completed');
	const count = completed.length || 1; // Avoid division by zero

	const averageOverallRating =
		completed.reduce((sum, r) => sum + (r.overallRating || 0), 0) / count;
	const averageGoalsAchievement =
		completed.reduce((sum, r) => sum + (r.goalsAchievement || 0), 0) / count;
	const averageCollaboration =
		completed.reduce((sum, r) => sum + (r.collaboration || 0), 0) / count;
	const averageCommunication =
		completed.reduce((sum, r) => sum + (r.communication || 0), 0) / count;
	const averageLeadership = completed.reduce((sum, r) => sum + (r.leadership || 0), 0) / count;
	const averageTechnicalSkills =
		completed.reduce((sum, r) => sum + (r.technicalSkills || 0), 0) / count;

	return {
		totalReviews,
		completedReviews,
		inProgressReviews,
		overdueReviews,
		averageOverallRating: Math.round(averageOverallRating * 10) / 10,
		averageGoalsAchievement: Math.round(averageGoalsAchievement * 10) / 10,
		averageCollaboration: Math.round(averageCollaboration * 10) / 10,
		averageCommunication: Math.round(averageCommunication * 10) / 10,
		averageLeadership: Math.round(averageLeadership * 10) / 10,
		averageTechnicalSkills: Math.round(averageTechnicalSkills * 10) / 10
	};
}

/**
 * Sort reviews by date (newest first)
 */
export function sortByDateDesc(reviews: PerformanceReview[]): PerformanceReview[] {
	return [...reviews].sort((a, b) => {
		return new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime();
	});
}

/**
 * Sort reviews by date (oldest first)
 */
export function sortByDateAsc(reviews: PerformanceReview[]): PerformanceReview[] {
	return [...reviews].sort((a, b) => {
		return new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime();
	});
}

/**
 * Sort reviews by overall rating (highest first)
 */
export function sortByRatingDesc(reviews: PerformanceReview[]): PerformanceReview[] {
	return [...reviews].sort((a, b) => {
		return (b.overallRating || 0) - (a.overallRating || 0);
	});
}

/**
 * Sort reviews by overall rating (lowest first)
 */
export function sortByRatingAsc(reviews: PerformanceReview[]): PerformanceReview[] {
	return [...reviews].sort((a, b) => {
		return (a.overallRating || 0) - (b.overallRating || 0);
	});
}

/**
 * Get status badge info for UI
 */
export function getStatusInfo(status: string): {
	label: string;
	color: string;
	variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
	switch (status.toLowerCase()) {
		case 'completed':
			return { label: 'Completed', color: 'green', variant: 'default' };
		case 'in_progress':
			return { label: 'In Progress', color: 'blue', variant: 'secondary' };
		case 'overdue':
			return { label: 'Overdue', color: 'red', variant: 'destructive' };
		case 'scheduled':
			return { label: 'Scheduled', color: 'gray', variant: 'outline' };
		default:
			return { label: 'Unknown', color: 'gray', variant: 'outline' };
	}
}

/**
 * Format rating for display (e.g., 4.5 → "4.5 / 5.0")
 */
export function formatRating(rating: number, maxRating: number = 5): string {
	return `${rating.toFixed(1)} / ${maxRating.toFixed(1)}`;
}

/**
 * Get rating color based on value
 */
export function getRatingColor(rating: number): string {
	if (rating >= 4.5) return 'green';
	if (rating >= 3.5) return 'blue';
	if (rating >= 2.5) return 'yellow';
	return 'red';
}

/**
 * Check if review is overdue
 */
export function isOverdue(review: PerformanceReview): boolean {
	if (review.status === 'completed') return false;
	if (review.status === 'overdue') return true;
	return new Date(review.reviewDate) < new Date();
}

/**
 * Format review period for display
 */
export function formatReviewPeriod(period: string): string {
	// Assuming period format like "2024-Q1" or "2024-H1"
	const [year, quarter] = period.split('-');
	if (quarter.startsWith('Q')) {
		return `Q${quarter.slice(1)} ${year}`;
	} else if (quarter.startsWith('H')) {
		return `H${quarter.slice(1)} ${year}`;
	}
	return period;
}
