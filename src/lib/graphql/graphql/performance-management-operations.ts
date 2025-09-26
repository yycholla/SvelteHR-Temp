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
