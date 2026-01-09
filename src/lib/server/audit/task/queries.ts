/**
 * GraphQL mutation for creating task audit entry
 */
export const CREATE_TASK_AUDIT_ENTRY = `
	mutation CreateTaskAuditEntry($input: CreateTaskAuditEntryInput!) {
		createTaskAuditEntry(input: $input) {
			taskAuditEntry {
				id
				taskId
				userId
				action
				changes
				createdAt
			}
		}
	}
`;

/**
 * GraphQL query for getting task audit trail
 */
export const GET_TASK_AUDIT_TRAIL = `
	query GetTaskAuditTrail($taskId: UUID!, $limit: Int!) {
		taskAuditEntries(
			condition: { taskId: $taskId }
			first: $limit
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				taskId
				userId
				action
				changes
				createdAt
				userByUserId {
					id
					displayName
					email
				}
			}
		}
	}
`;

/**
 * GraphQL query for getting user task actions
 */
export const GET_USER_TASK_ACTIONS = `
	query GetUserTaskActions($userId: UUID!, $limit: Int!) {
		taskAuditEntries(
			condition: { userId: $userId }
			first: $limit
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				taskId
				userId
				action
				changes
				createdAt
				taskByTaskId {
					id
					title
					status
				}
			}
		}
	}
`;
