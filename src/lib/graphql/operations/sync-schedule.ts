import { gql } from '@urql/svelte';

export const GET_SYNC_SCHEDULES = gql`
	query GetSyncSchedules(
		$enabledOnly: Boolean
		$entityType: String
		$limit: Int
		$offset: Int
	) {
		syncSchedule {
			syncSchedules(
				enabledOnly: $enabledOnly
				entityType: $entityType
				limit: $limit
				offset: $offset
			) {
				schedules {
					id
					name
					description
					cronExpression
					entityType
					syncDirection
					enabled
					businessHoursOnly
					timezone
					lastRunAt
					nextRunAt
					lastRunStatus
					lastRunError
					createdBy
					createdAt
					updatedAt
				}
				total
			}
		}
	}
`;

export const GET_SYNC_SCHEDULE = gql`
	query GetSyncSchedule($scheduleId: String!) {
		syncSchedule {
			syncSchedule(scheduleId: $scheduleId) {
				id
				name
				description
				cronExpression
				entityType
				syncDirection
				enabled
				businessHoursOnly
				timezone
				lastRunAt
				nextRunAt
				lastRunStatus
				lastRunError
				createdBy
				createdAt
				updatedAt
			}
		}
	}
`;

export const GET_SYNC_SCHEDULE_HISTORY = gql`
	query GetSyncScheduleHistory($scheduleId: String!, $limit: Int) {
		syncSchedule {
			syncScheduleHistory(scheduleId: $scheduleId, limit: $limit) {
				id
				scheduleId
				startedAt
				completedAt
				status
				recordsSynced
				recordsPushed
				recordsPulled
				errorsCount
				errorMessage
				executionTimeMs
				createdAt
			}
		}
	}
`;

export const CREATE_SYNC_SCHEDULE = gql`
	mutation CreateSyncSchedule($input: CreateSyncScheduleInput!) {
		syncSchedule {
			createSyncSchedule(input: $input) {
				success
				message
				scheduleId
			}
		}
	}
`;

export const UPDATE_SYNC_SCHEDULE = gql`
	mutation UpdateSyncSchedule($input: UpdateSyncScheduleInput!) {
		syncSchedule {
			updateSyncSchedule(input: $input) {
				success
				message
				scheduleId
			}
		}
	}
`;

export const DELETE_SYNC_SCHEDULE = gql`
	mutation DeleteSyncSchedule($scheduleId: String!) {
		syncSchedule {
			deleteSyncSchedule(scheduleId: $scheduleId) {
				success
				message
				scheduleId
			}
		}
	}
`;

export const TOGGLE_SYNC_SCHEDULE = gql`
	mutation ToggleSyncSchedule($scheduleId: String!, $enabled: Boolean!) {
		syncSchedule {
			toggleSyncSchedule(scheduleId: $scheduleId, enabled: $enabled) {
				success
				message
				scheduleId
			}
		}
	}
`;
