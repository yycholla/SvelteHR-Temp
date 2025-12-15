import { gql } from '@urql/svelte';

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
