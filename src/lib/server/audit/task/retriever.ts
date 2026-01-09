import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import { GET_TASK_AUDIT_TRAIL, GET_USER_TASK_ACTIONS } from './queries';

/**
 * Get audit trail for a specific task
 */
export async function getTaskAuditTrail(taskId: string, limit: number = 50): Promise<any[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: GET_TASK_AUDIT_TRAIL,
				variables: { taskId, limit }
			})
		});

		if (!response.ok) {
			logger.error('[TASK AUDIT] Failed to fetch audit trail', new Error(response.statusText));
			return [];
		}

		const data = await response.json();
		return data?.data?.taskAuditEntries?.nodes || [];
	} catch (error) {
		logger.error('Failed to fetch task audit trail', error as Error);
		return [];
	}
}

/**
 * Get recent task actions by a specific user
 */
export async function getUserTaskActions(userId: string, limit: number = 20): Promise<any[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: GET_USER_TASK_ACTIONS,
				variables: { userId, limit }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return data?.data?.taskAuditEntries?.nodes || [];
	} catch (error) {
		logger.error('Failed to fetch user task actions', error as Error);
		return [];
	}
}
