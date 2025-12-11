import { logger } from '$lib/utils/logger';
/**
 * Task Audit Service
 * Feature: 028-task-system-expansion - T021
 *
 * Provides audit logging specifically for task management operations.
 * Tracks all task changes in the task_audit_entries table with detailed
 * before/after snapshots stored in JSONB format.
 */

import type { RequestEvent } from '@sveltejs/kit';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { AuditActionType, Task, TaskPriority, TaskStatus } from '$lib/types/task';

/**
 * Task audit entry input
 */
export interface TaskAuditInput {
	taskId: string;
	userId: string;
	action: AuditActionType;
	changes?: {
		field: string;
		oldValue: any;
		newValue: any;
	}[];
	metadata?: Record<string, any>;
}

/**
 * Task change tracking for audit trail
 */
export interface TaskChanges {
	title?: { from: string; to: string };
	description?: { from: string | null; to: string | null };
	status?: { from: TaskStatus; to: TaskStatus };
	priority?: { from: TaskPriority; to: TaskPriority };
	assigneeId?: { from: string | null; to: string | null };
	creatorId?: { from: string | null; to: string | null };
	taskTypeId?: { from: string; to: string };
	dueDate?: { from: string | null; to: string | null };
	parentTaskId?: { from: string | null; to: string | null };
	archived?: { from: boolean; to: boolean };
	archivedAt?: { from: string | null; to: string | null };
	archivedBy?: { from: string | null; to: string | null };
	requiresManualReassignment?: { from: boolean; to: boolean };
}

/**
 * GraphQL mutation for creating task audit entry
 */
const CREATE_TASK_AUDIT_ENTRY = `
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
 * Log a task action to the audit trail
 *
 * @param input - Task audit entry data
 * @returns true if logged successfully, false otherwise
 */
export async function logTaskAction(input: TaskAuditInput): Promise<boolean> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		// Construct audit entry
		const auditEntry = {
			taskId: input.taskId,
			userId: input.userId,
			action: input.action,
			changes: input.changes || null,
			createdAt: new Date().toISOString()
		};

		// Insert via GraphQL mutation
		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: CREATE_TASK_AUDIT_ENTRY,
				variables: {
					input: { taskAuditEntry: auditEntry }
				}
			})
		});

		if (!response.ok) {
			logger.error('[TASK AUDIT] GraphQL mutation failed', new Error(response.statusText));
			return false;
		}

		const result = await response.json();

		if (result.errors) {
			logger.error('[TASK AUDIT] GraphQL errors', new Error(JSON.stringify(result.errors)));
			return false;
		}

		logger.info('[TASK AUDIT] Logged task action:', {
			action: input.action,
			taskId: input.taskId,
			userId: input.userId,
			changeCount: input.changes?.length || 0
		});

		return true;
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return false;
	}
}

/**
 * Log task creation
 */
export async function logTaskCreated(
	taskId: string,
	userId: string,
	taskData: Partial<Task>
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'task_created',
		changes: [
			{
				field: 'task',
				oldValue: null,
				newValue: {
					title: taskData.title,
					description: taskData.description,
					status: taskData.status,
					priority: taskData.priority,
					assigneeId: taskData.assigneeId,
					dueDate: taskData.dueDate,
					parentTaskId: taskData.parentTaskId
				}
			}
		],
		metadata: {
			createdAt: new Date().toISOString()
		}
	});
}

/**
 * Log task update with before/after comparison
 */
export async function logTaskUpdated(
	taskId: string,
	userId: string,
	beforeTask: Partial<Task>,
	afterTask: Partial<Task>
): Promise<boolean> {
	const changes: { field: string; oldValue: any; newValue: any }[] = [];

	// Compare all fields and track changes
	const fieldsToCheck: (keyof Task)[] = [
		'title',
		'description',
		'status',
		'priority',
		'assigneeId',
		'creatorId',
		'taskTypeId',
		'dueDate',
		'parentTaskId',
		'archived',
		'requiresManualReassignment'
	];

	for (const field of fieldsToCheck) {
		if (beforeTask[field] !== afterTask[field]) {
			changes.push({
				field,
				oldValue: beforeTask[field],
				newValue: afterTask[field]
			});
		}
	}

	// Only log if there are actual changes
	if (changes.length === 0) {
		logger.info('[TASK AUDIT] No changes detected for task:', { taskId });
		return true;
	}

	return logTaskAction({
		taskId,
		userId,
		action: 'task_updated',
		changes,
		metadata: {
			updatedAt: new Date().toISOString(),
			changeCount: changes.length
		}
	});
}

/**
 * Log task deletion/archival
 */
export async function logTaskDeleted(
	taskId: string,
	userId: string,
	taskData: Partial<Task>
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'task_deleted',
		changes: [
			{
				field: 'archived',
				oldValue: false,
				newValue: true
			},
			{
				field: 'archivedAt',
				oldValue: null,
				newValue: new Date().toISOString()
			},
			{
				field: 'archivedBy',
				oldValue: null,
				newValue: userId
			}
		],
		metadata: {
			taskTitle: taskData.title,
			deletedAt: new Date().toISOString()
		}
	});
}

/**
 * Log task reassignment
 */
export async function logTaskReassigned(
	taskId: string,
	userId: string,
	oldAssigneeId: string,
	newAssigneeId: string,
	reason?: string
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'task_reassigned',
		changes: [
			{
				field: 'assigneeId',
				oldValue: oldAssigneeId,
				newValue: newAssigneeId
			}
		],
		metadata: {
			reason,
			reassignedAt: new Date().toISOString(),
			reassignedBy: userId
		}
	});
}

/**
 * Log task status change
 */
export async function logTaskStatusChanged(
	taskId: string,
	userId: string,
	oldStatus: TaskStatus,
	newStatus: TaskStatus,
	comment?: string
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'status_changed',
		changes: [
			{
				field: 'status',
				oldValue: oldStatus,
				newValue: newStatus
			}
		],
		metadata: {
			comment,
			changedAt: new Date().toISOString()
		}
	});
}

/**
 * Log task priority change
 */
export async function logTaskPriorityChanged(
	taskId: string,
	userId: string,
	oldPriority: TaskPriority,
	newPriority: TaskPriority
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'priority_changed',
		changes: [
			{
				field: 'priority',
				oldValue: oldPriority,
				newValue: newPriority
			}
		],
		metadata: {
			changedAt: new Date().toISOString()
		}
	});
}

/**
 * Log dependency creation
 */
export async function logDependencyCreated(
	taskId: string,
	userId: string,
	blockingTaskId: string,
	blockedTaskId: string,
	dependencyType?: string
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'dependency_added',
		changes: [
			{
				field: 'dependency',
				oldValue: null,
				newValue: {
					blockingTaskId,
					blockedTaskId,
					dependencyType: dependencyType || 'blocks'
				}
			}
		],
		metadata: {
			blockingTaskId,
			blockedTaskId,
			dependencyType,
			createdAt: new Date().toISOString()
		}
	});
}

/**
 * Log dependency deletion
 */
export async function logDependencyDeleted(
	taskId: string,
	userId: string,
	blockingTaskId: string,
	blockedTaskId: string
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'dependency_removed',
		changes: [
			{
				field: 'dependency',
				oldValue: {
					blockingTaskId,
					blockedTaskId
				},
				newValue: null
			}
		],
		metadata: {
			blockingTaskId,
			blockedTaskId,
			deletedAt: new Date().toISOString()
		}
	});
}

/**
 * Log linked resource addition
 */
export async function logLinkedResourceAdded(
	taskId: string,
	userId: string,
	resourceType: string,
	resourceId: string,
	resourceTitle?: string
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'resource_linked',
		changes: [
			{
				field: 'linkedResource',
				oldValue: null,
				newValue: {
					resourceType,
					resourceId,
					resourceTitle
				}
			}
		],
		metadata: {
			resourceType,
			resourceId,
			resourceTitle,
			linkedAt: new Date().toISOString()
		}
	});
}

/**
 * Log linked resource removal
 */
export async function logLinkedResourceRemoved(
	taskId: string,
	userId: string,
	resourceType: string,
	resourceId: string
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'resource_unlinked',
		changes: [
			{
				field: 'linkedResource',
				oldValue: {
					resourceType,
					resourceId
				},
				newValue: null
			}
		],
		metadata: {
			resourceType,
			resourceId,
			unlinkedAt: new Date().toISOString()
		}
	});
}

/**
 * Log comment addition to task
 */
export async function logCommentAdded(
	taskId: string,
	userId: string,
	commentId: string,
	commentText: string
): Promise<boolean> {
	return logTaskAction({
		taskId,
		userId,
		action: 'comment_added',
		changes: [
			{
				field: 'comment',
				oldValue: null,
				newValue: {
					commentId,
					text: commentText.substring(0, 200) // Truncate for audit log
				}
			}
		],
		metadata: {
			commentId,
			commentLength: commentText.length,
			addedAt: new Date().toISOString()
		}
	});
}

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
				query: `
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
				`,
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
		logger.error('Catch failed', error as Error);
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
				query: `
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
				`,
				variables: { userId, limit }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		return data?.data?.taskAuditEntries?.nodes || [];
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return [];
	}
}

/**
 * Compare two task objects and return only the changed fields
 */
export function getTaskChanges(before: Partial<Task>, after: Partial<Task>): TaskChanges {
	const changes: TaskChanges = {};

	if (before.title !== after.title && after.title !== undefined) {
		changes.title = { from: before.title!, to: after.title };
	}

	if (before.description !== after.description && after.description !== undefined) {
		changes.description = {
			from: before.description || null,
			to: after.description || null
		};
	}

	if (before.status !== after.status && after.status !== undefined) {
		changes.status = { from: before.status!, to: after.status };
	}

	if (before.priority !== after.priority && after.priority !== undefined) {
		changes.priority = { from: before.priority!, to: after.priority };
	}

	if (before.assigneeId !== after.assigneeId && after.assigneeId !== undefined) {
		changes.assigneeId = { from: before.assigneeId || '', to: after.assigneeId };
	}

	if (before.taskTypeId !== after.taskTypeId && after.taskTypeId !== undefined) {
		changes.taskTypeId = { from: before.taskTypeId || '', to: after.taskTypeId };
	}

	if (before.dueDate !== after.dueDate && after.dueDate !== undefined) {
		const fromDate = before.dueDate ? String(before.dueDate) : null;
		const toDate = after.dueDate ? String(after.dueDate) : null;
		if (fromDate !== toDate) {
			changes.dueDate = {
				from: fromDate,
				to: toDate
			};
		}
	}

	if (before.parentTaskId !== after.parentTaskId && after.parentTaskId !== undefined) {
		changes.parentTaskId = {
			from: before.parentTaskId || null,
			to: after.parentTaskId || null
		};
	}

	if (before.archived !== after.archived && after.archived !== undefined) {
		changes.archived = { from: before.archived || false, to: after.archived };
	}

	if (
		before.requiresManualReassignment !== after.requiresManualReassignment &&
		after.requiresManualReassignment !== undefined
	) {
		changes.requiresManualReassignment = {
			from: before.requiresManualReassignment || false,
			to: after.requiresManualReassignment
		};
	}

	return changes;
}

/**
 * Format audit action for display
 */
export function formatAuditAction(action: AuditActionType): string {
	const actionMap: Record<AuditActionType, string> = {
		task_created: 'Created task',
		task_updated: 'Updated task',
		task_deleted: 'Deleted task',
		task_reassigned: 'Reassigned task',
		status_changed: 'Changed status',
		priority_changed: 'Changed priority',
		dependency_added: 'Added dependency',
		dependency_removed: 'Removed dependency',
		resource_linked: 'Linked resource',
		resource_unlinked: 'Unlinked resource',
		comment_added: 'Added comment',
		due_date_changed: 'Changed due date',
		description_updated: 'Updated description',
		parent_changed: 'Changed parent task'
	};

	return actionMap[action] || action;
}
