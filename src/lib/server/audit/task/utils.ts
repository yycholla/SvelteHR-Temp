import type { Task, AuditActionType } from '$lib/types/task';
import type { TaskChanges } from './types';

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
