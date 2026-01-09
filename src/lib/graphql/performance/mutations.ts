import { gql } from '@urql/svelte';

/**
 * GraphQL Mutations for Performance Reviews
 *
 * Updated for Rust backend (async-graphql) schema
 * Removed PostGraphile patterns (nested returns, clientMutationId)
 *
 * Note: This file appears to be a duplicate of performance-management/mutations.ts
 * Consider consolidating these files in the future.
 */

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create performance review
 * Backend: Uses createPerformanceReview from Rust GraphQL schema
 * RLS Policy: manager_create_department_performance_reviews
 * Covers: FR-003
 */
export const CREATE_PERFORMANCE_REVIEW = gql`
	mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
		createPerformanceReview(input: $input) {
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
	}
`;

/**
 * Mutation: Update performance review
 * Backend: Uses updatePerformanceReview from Rust GraphQL schema
 * RLS Policy: manager_update_department_performance_reviews
 * Covers: FR-003
 */
export const UPDATE_PERFORMANCE_REVIEW = gql`
	mutation UpdatePerformanceReview($id: UUID!, $input: UpdatePerformanceReviewInput!) {
		updatePerformanceReview(id: $id, input: $input) {
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
	}
`;

/**
 * Mutation: Delete performance review
 * Backend: Uses deletePerformanceReview from Rust GraphQL schema
 * RLS Policy: manager_delete_department_performance_reviews
 * Covers: FR-003
 */
export const DELETE_PERFORMANCE_REVIEW = gql`
	mutation DeletePerformanceReview($id: UUID!) {
		deletePerformanceReview(id: $id)
	}
`;
