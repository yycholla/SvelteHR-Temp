import { gql } from '@urql/svelte';

/**
 * GraphQL Mutations for HR Reports
 *
 * Updated for Rust backend (async-graphql) schema
 */

/**
 * Mutation: Create HR report
 * Backend: Uses createHrReport from Rust GraphQL schema
 * Covers: FR-006, FR-039
 */
export const CREATE_HR_REPORT = gql`
	mutation CreateHRReport($input: CreateHrReportInput!) {
		createHrReport(input: $input) {
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
		}
	}
`;

/**
 * Mutation: Update HR report
 * Backend: Uses updateHrReport from Rust GraphQL schema
 * Covers: FR-006
 */
export const UPDATE_HR_REPORT = gql`
	mutation UpdateHRReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
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
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete HR report
 * Backend: Uses deleteHrReport from Rust GraphQL schema
 * Covers: FR-006
 */
export const DELETE_HR_REPORT = gql`
	mutation DeleteHRReport($id: UUID!) {
		deleteHrReport(id: $id)
	}
`;
