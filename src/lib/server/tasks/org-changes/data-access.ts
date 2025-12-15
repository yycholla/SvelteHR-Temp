import { getGraphQLEndpoint } from '$lib/server/api-url';
import { logger } from '$lib/utils/logger';
import type { Task } from '$lib/types/task';
import { logTaskReassigned } from '$lib/server/audit/task-audit-service';

/**
 * Get all tasks assigned to a specific user
 */
export async function getTasksAssignedToUser(userId: string): Promise<Task[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetUserTasks($userId: UUID!) {
						allTasks(
							condition: { assigneeId: $userId, archived: false }
							orderBy: CREATED_AT_DESC
						) {
							nodes {
								id
								title
								assigneeId
								creatorId
								taskTypeId
								status
								priority
								dueDate
								parentTaskId
								requiresManualReassignment
								createdAt
								updatedAt
							}
						}
					}
				`,
				variables: { userId }
			})
		});

		if (!response.ok) {
			logger.error('[ORG CHANGE] Failed to fetch user tasks');
			return [];
		}

		const data = await response.json();
		return data?.data?.allTasks?.nodes || [];
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching user tasks:',
			error instanceof Error ? error : new Error(String(error))
		);
		return [];
	}
}

/**
 * Get department manager ID
 */
export async function getDepartmentManager(departmentId: string): Promise<string | null> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetDepartmentManager($departmentId: UUID!) {
						departmentById(id: $departmentId) {
							id
							managerId
						}
					}
				`,
				variables: { departmentId }
			})
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data?.data?.departmentById?.managerId || null;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching department manager:',
			error instanceof Error ? error : new Error(String(error))
		);
		return null;
	}
}

/**
 * Get all employee IDs in a department
 */
export async function getDepartmentEmployees(departmentId: string): Promise<string[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetDepartmentEmployees($departmentId: UUID!) {
						allUsers(condition: { departmentId: $departmentId }) {
							nodes {
								id
							}
						}
					}
				`,
				variables: { departmentId }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		const users = data?.data?.allUsers?.nodes || [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return users.map((user: any) => user.id);
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching department employees:',
			error instanceof Error ? error : new Error(String(error))
		);
		return [];
	}
}

/**
 * Reassign a task to a new user
 */
export async function reassignTask(
	taskId: string,
	oldAssigneeId: string,
	newAssigneeId: string,
	performedBy: string,
	reason: string
): Promise<boolean> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					mutation ReassignTask($input: UpdateTaskInput!) {
						updateTaskById(input: $input) {
							task {
								id
								assigneeId
								updatedAt
							}
						}
					}
				`,
				variables: {
					input: {
						id: taskId,
						taskPatch: {
							assigneeId: newAssigneeId,
							updatedAt: new Date().toISOString()
						}
					}
				}
			})
		});

		if (!response.ok) {
			logger.error('[ORG CHANGE] Failed to reassign task:', undefined, { taskId });
			return false;
		}

		const data = await response.json();

		if (data.errors) {
			logger.error('[ORG CHANGE] GraphQL errors reassigning task:', undefined, {
				errors: data.errors
			});
			return false;
		}

		// Log the reassignment in audit trail
		await logTaskReassigned(taskId, performedBy, oldAssigneeId, newAssigneeId, reason);

		return true;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error reassigning task:',
			error instanceof Error ? error : new Error(String(error))
		);
		return false;
	}
}

/**
 * Flag a task for manual reassignment
 */
export async function flagTaskForManualReassignment(
	taskId: string,
	performedBy: string
): Promise<boolean> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					mutation FlagTaskForReassignment($input: UpdateTaskInput!) {
						updateTaskById(input: $input) {
							task {
								id
								requiresManualReassignment
								updatedAt
							}
						}
					}
				`,
				variables: {
					input: {
						id: taskId,
						taskPatch: {
							requiresManualReassignment: true,
							updatedAt: new Date().toISOString()
						}
					}
				}
			})
		});

		if (!response.ok) {
			logger.error('[ORG CHANGE] Failed to flag task for manual reassignment:', undefined, {
				taskId
			});
			return false;
		}

		const data = await response.json();

		if (data.errors) {
			logger.error('[ORG CHANGE] GraphQL errors flagging task:', undefined, {
				errors: data.errors
			});
			return false;
		}

		logger.info('[ORG CHANGE] Flagged task for manual reassignment:', { taskId });
		return true;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error flagging task:',
			error instanceof Error ? error : new Error(String(error))
		);
		return false;
	}
}

/**
 * Get tasks requiring manual reassignment
 */
export async function getTasksRequiringManualReassignment(departmentId?: string): Promise<Task[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const condition: any = {
			requiresManualReassignment: true,
			archived: false
		};

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTasksRequiringReassignment($condition: TaskCondition!) {
						allTasks(
							condition: $condition
							orderBy: CREATED_AT_DESC
						) {
							nodes {
								id
								title
								description
								assigneeId
								creatorId
								taskTypeId
								status
								priority
								dueDate
								parentTaskId
								requiresManualReassignment
								createdAt
								updatedAt
								userByAssigneeId {
									id
									displayName
									email
									departmentId
								}
								taskTypeByTaskTypeId {
									id
									name
								}
							}
						}
					}
				`,
				variables: { condition }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		let tasks = data?.data?.allTasks?.nodes || [];

		// Filter by department if specified
		if (departmentId) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			tasks = tasks.filter((task: any) => task.userByAssigneeId?.departmentId === departmentId);
		}

		return tasks;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching tasks requiring reassignment:',
			error instanceof Error ? error : new Error(String(error))
		);
		return [];
	}
}
