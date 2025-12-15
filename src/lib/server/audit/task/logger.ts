import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { Task, TaskStatus, TaskPriority } from '$lib/types/task';
import type { TaskAuditInput } from './types';
import { CREATE_TASK_AUDIT_ENTRY } from './queries';

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
		logger.error('Task audit log failed', error as Error);
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
