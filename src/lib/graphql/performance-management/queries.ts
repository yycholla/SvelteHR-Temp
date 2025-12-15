import { gql } from '@urql/svelte';

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
