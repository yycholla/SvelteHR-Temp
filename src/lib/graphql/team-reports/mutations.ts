import { gql } from '@urql/svelte';

/**
 * GraphQL Mutations for Team Reports
 *
 * Updated for Rust backend (async-graphql) schema
 * Note: Team reports use the hrReports backend mutations
 */

/**
 * Mutation: Generate/Create new team report
 * Backend: Uses createHrReport from Rust GraphQL schema
 */
export const GENERATE_TEAM_REPORT = gql`
	mutation GenerateTeamReport($input: CreateHrReportInput!) {
		createHrReport(input: $input) {
			id
			title
			reportType
			status
			category
			filters
			data
			departmentId
			department {
				id
				name
			}
			creatorId
			creator {
				id
				displayName
				email
			}
			scheduledAt
			generatedAt
			createdAt
		}
	}
`;

/**
 * Mutation: Update team report
 * Backend: Uses updateHrReport from Rust GraphQL schema
 */
export const UPDATE_TEAM_REPORT = gql`
	mutation UpdateTeamReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
			id
			title
			reportType
			status
			category
			filters
			data
			departmentId
			department {
				id
				name
			}
			scheduledAt
			generatedAt
			updatedAt
		}
	}
`;

/**
 * Mutation: Schedule recurring report
 * Backend: Uses updateHrReport from Rust GraphQL schema
 * Note: Scheduling is set via scheduledAt field
 */
export const SCHEDULE_REPORT = gql`
	mutation ScheduleReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
			id
			title
			reportType
			scheduledAt
			status
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete team report
 * Backend: Uses deleteHrReport from Rust GraphQL schema
 */
export const DELETE_TEAM_REPORT = gql`
	mutation DeleteTeamReport($id: UUID!) {
		deleteHrReport(id: $id)
	}
`;

/**
 * Mutation: Regenerate report
 * Backend: Uses updateHrReport from Rust GraphQL schema
 */
export const REGENERATE_REPORT = gql`
	mutation RegenerateReport($input: UpdateHrReportInput!) {
		updateHrReport(input: $input) {
			id
			title
			reportType
			status
			data
			filters
			generatedAt
			updatedAt
		}
	}
`;
