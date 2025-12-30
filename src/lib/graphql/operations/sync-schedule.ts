import { gql } from '@urql/svelte';

export const GET_SYNC_SCHEDULES = gql`
	query GetSyncSchedules(
		$enabledOnly: Boolean
		$entityType: String
		$limit: Int
		$offset: Int
	) {
		sync_schedule {
			sync_schedules(
				enabled_only: $enabledOnly
				entity_type: $entityType
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
		sync_schedule {
			sync_schedule(schedule_id: $scheduleId) {
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
		sync_schedule {
			sync_schedule_history(schedule_id: $scheduleId, limit: $limit) {
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
		sync_schedule {
			create_sync_schedule(input: $input) {
				success
				message
				scheduleId
			}
		}
	}
`;

export const UPDATE_SYNC_SCHEDULE = gql`
	mutation UpdateSyncSchedule($input: UpdateSyncScheduleInput!) {
		sync_schedule {
			update_sync_schedule(input: $input) {
				success
				message
				scheduleId
			}
		}
	}
`;

export const DELETE_SYNC_SCHEDULE = gql`
	mutation DeleteSyncSchedule($scheduleId: String!) {
		sync_schedule {
			delete_sync_schedule(schedule_id: $scheduleId) {
				success
				message
				scheduleId
			}
		}
	}
`;

export const TOGGLE_SYNC_SCHEDULE = gql`
	mutation ToggleSyncSchedule($scheduleId: String!, $enabled: Boolean!) {
		sync_schedule {
			toggle_sync_schedule(schedule_id: $scheduleId, enabled: $enabled) {
				success
				message
				scheduleId
			}
		}
	}
`;
