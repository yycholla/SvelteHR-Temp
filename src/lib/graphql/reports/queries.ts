import { gql } from '@urql/svelte';

/**
 * Query: Get HR reports for manager's department only
 * Note: Reports table may not have RLS yet - implement when available
 * Covers: FR-006, FR-039
 */
export const GET_HR_REPORTS = gql`
	query GetHRReports(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [HrReportsOrderBy!] = [CREATED_AT_DESC]
		$filter: HrReportFilter
	) {
		hrReports(first: $first, offset: $offset, orderBy: $orderBy, filter: $filter) {
			nodes {
				id
				creatorId
				creator {
					id
					displayName
					email
				}
				departmentId
				department {
					id
					name
				}
				title
				reportType
				category
				filters
				data
				status
				scheduledAt
				generatedAt
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
 * Query: Get single report by ID (department-scoped)
 */
export const GET_HR_REPORT_BY_ID = gql`
	query GetHRReportById($id: UUID!) {
		hrReport(id: $id) {
			id
			creatorId
			creator {
				id
				displayName
				email
			}
			departmentId
			department {
				id
				name
			}
			title
			reportType
			category
			filters
			data
			status
			scheduledAt
			generatedAt
			createdAt
			updatedAt
		}
	}
`;

/**
 * Query: Get report analytics for manager's department
 * Covers: FR-039
 */
export const GET_REPORT_ANALYTICS = gql`
	query GetReportAnalytics($departmentId: UUID!) {
		totalReports: hrReports(filter: { departmentId: { equalTo: $departmentId } }) {
			totalCount
		}
		activeReports: hrReports(
			filter: { status: { equalTo: "active" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		scheduledReports: hrReports(
			filter: { status: { equalTo: "scheduled" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		completedReports: hrReports(
			filter: { status: { equalTo: "completed" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
			nodes {
				reportType
				category
				generatedAt
			}
		}
	}
`;
