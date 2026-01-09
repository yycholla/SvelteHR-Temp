import { gql } from '@urql/svelte';

export const GET_EMPLOYEE_SYNC_STATUS = gql`
	query GetEmployeeSyncStatus($employeeId: String!) {
		employee_sync {
			get_employee_sync_status(employee_id: $employeeId) {
				employeeId
				employeeName
				quickbooksId
				lastSyncedAt
				autoSyncEnabled
				syncDirection
				hasLocalChanges
				excludedFields
			}
		}
	}
`;

export const GET_EMPLOYEE_SYNC_HISTORY = gql`
	query GetEmployeeSyncHistory($employeeId: String!, $limit: Int) {
		employee_sync {
			get_employee_sync_history(employee_id: $employeeId, limit: $limit) {
				history {
					id
					employeeId
					employeeName
					syncType
					direction
					status
					syncedAt
					fieldsSynced
					errors
				}
				total
			}
		}
	}
`;

export const UPDATE_EMPLOYEE_SYNC_SETTINGS = gql`
	mutation UpdateEmployeeSyncSettings($input: EmployeeSyncSettingsInput!) {
		employee_sync {
			update_employee_sync_settings(input: $input) {
				success
				message
			}
		}
	}
`;

export const TRIGGER_EMPLOYEE_SYNC = gql`
	mutation TriggerEmployeeSync($employeeId: String!, $direction: String!) {
		employee_sync {
			trigger_employee_sync(employee_id: $employeeId, direction: $direction) {
				success
				message
			}
		}
	}
`;
