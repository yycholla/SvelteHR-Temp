import { gql } from '@urql/svelte';

// Mutation: Generate new report
export const GENERATE_TEAM_REPORT = gql`
	mutation GenerateTeamReport($input: CreateTeamReportInput!) {
		createTeamReport(input: $input) {
			teamReport {
				id
				title
				reportType
				status
				dateFrom
				dateTo
				team: department {
					id
					name
				}
				generatedBy {
					id
					displayName
				}
				parameters
				createdAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update report
export const UPDATE_TEAM_REPORT = gql`
	mutation UpdateTeamReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				status
				summary
				data
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Schedule recurring report
export const SCHEDULE_REPORT = gql`
	mutation ScheduleReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				title
				isScheduled
				scheduleCron
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Delete report
export const DELETE_TEAM_REPORT = gql`
	mutation DeleteTeamReport($input: DeleteTeamReportInput!) {
		deleteTeamReport(input: $input) {
			deletedTeamReportId
			clientMutationId
		}
	}
`;

// Mutation: Regenerate report
export const REGENERATE_REPORT = gql`
	mutation RegenerateReport($input: UpdateTeamReportInput!) {
		updateTeamReport(input: $input) {
			teamReport {
				id
				status
				data
				summary
				updatedAt
			}
			clientMutationId
		}
	}
`;
