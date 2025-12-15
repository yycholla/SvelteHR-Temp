import { gql } from '@urql/svelte';

/**
 * Mutation: Create HR report
 * Covers: FR-006, FR-039
 */
export const CREATE_HR_REPORT = gql`
	mutation CreateHRReport($input: CreateHrReportInput!) {
		createHrReport(input: $input) {
			hrReport {
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
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update HR report
 * Covers: FR-006
 */
export const UPDATE_HR_REPORT = gql`
	mutation UpdateHRReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
			hrReport {
				id
				creatorId
				creator {
					id
					displayName
					email
				}
				departmentId
				title
				reportType
				category
				filters
				data
				status
				scheduledAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete HR report
 * Covers: FR-006
 */
export const DELETE_HR_REPORT = gql`
	mutation DeleteHRReport($input: DeleteHrReportInput!) {
		deleteHrReport(input: $input) {
			deletedHrReportId
			clientMutationId
		}
	}
`;
