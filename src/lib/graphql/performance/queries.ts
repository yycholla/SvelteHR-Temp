import { gql } from '@urql/svelte';

/**
 * GraphQL Queries for Performance Reviews
 *
 * Updated for Rust backend (async-graphql) schema
 * Removed PostGraphile patterns (PerformanceReviewsOrderBy, PerformanceReviewFilter, Relay connections)
 *
 * Note: This file appears to be a duplicate of performance-management/queries.ts
 * Consider consolidating these files in the future.
 */

// ============================================================================
// QUERIES
// ============================================================================

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

// ============================================================================
// DEPRECATED - Use GET_PERFORMANCE_REVIEWS_FOR_STATS + client-side calculation
// ============================================================================
/**
 * @deprecated Use GET_PERFORMANCE_REVIEWS_FOR_STATS with calculatePerformanceStatistics()
 * Complex nested filters not supported in Rust backend - statistics calculated client-side
 */
export const GET_PERFORMANCE_STATISTICS = GET_PERFORMANCE_REVIEWS_FOR_STATS;
