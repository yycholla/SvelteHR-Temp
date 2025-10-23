/**
 * Client-safe audit utilities
 * Provides formatting functions for audit trail display
 */

export type AuditActionType =
	| 'task_created'
	| 'task_updated'
	| 'task_deleted'
	| 'task_reassigned'
	| 'status_changed'
	| 'priority_changed'
	| 'dependency_added'
	| 'dependency_removed'
	| 'resource_linked'
	| 'resource_unlinked'
	| 'comment_added'
	| 'due_date_changed'
	| 'description_updated'
	| 'parent_changed';

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

	return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Get icon for audit action type
 */
export function getAuditActionIcon(action: AuditActionType): string {
	const iconMap: Record<AuditActionType, string> = {
		task_created: 'plus',
		task_updated: 'edit',
		task_deleted: 'trash',
		task_reassigned: 'user-check',
		status_changed: 'refresh-cw',
		priority_changed: 'alert-triangle',
		dependency_added: 'link',
		dependency_removed: 'unlink',
		resource_linked: 'paperclip',
		resource_unlinked: 'paperclip',
		comment_added: 'message-circle',
		due_date_changed: 'calendar',
		description_updated: 'file-text',
		parent_changed: 'git-branch'
	};

	return iconMap[action] || 'activity';
}

/**
 * Get color for audit action type
 */
export function getAuditActionColor(action: AuditActionType): string {
	const colorMap: Record<AuditActionType, string> = {
		task_created: 'green',
		task_updated: 'blue',
		task_deleted: 'red',
		task_reassigned: 'purple',
		status_changed: 'orange',
		priority_changed: 'yellow',
		dependency_added: 'indigo',
		dependency_removed: 'gray',
		resource_linked: 'cyan',
		resource_unlinked: 'gray',
		comment_added: 'pink',
		due_date_changed: 'lime',
		description_updated: 'teal',
		parent_changed: 'violet'
	};

	return colorMap[action] || 'gray';
}
