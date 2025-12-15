import type { AuditActionType, TaskPriority, TaskStatus } from '$lib/types/task';

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
