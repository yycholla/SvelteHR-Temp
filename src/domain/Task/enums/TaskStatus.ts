// src/domain/Task/enums/TaskStatus.ts
export enum TaskStatus {
	TODO = 'TODO',
	IN_PROGRESS = 'IN_PROGRESS',
	BLOCKED = 'BLOCKED',
	REVIEW = 'REVIEW',
	DONE = 'DONE',
	CANCELLED = 'CANCELLED'
}

const VALID_STATUSES = new Set(Object.values(TaskStatus));

export function isValidTaskStatus(status: string): status is TaskStatus {
	return VALID_STATUSES.has(status as TaskStatus);
}

// Status transition rules: TODO → IN_PROGRESS → REVIEW → DONE
// BLOCKED can be set from any status and can transition to any status
// CANCELLED can be set from any status (terminal)
// DONE is terminal (except to CANCELLED)
const VALID_TRANSITIONS: Record<TaskStatus, Set<TaskStatus>> = {
	[TaskStatus.TODO]: new Set([
		TaskStatus.TODO,
		TaskStatus.IN_PROGRESS,
		TaskStatus.BLOCKED,
		TaskStatus.CANCELLED
	]),
	[TaskStatus.IN_PROGRESS]: new Set([
		TaskStatus.IN_PROGRESS,
		TaskStatus.BLOCKED,
		TaskStatus.REVIEW,
		TaskStatus.CANCELLED
	]),
	[TaskStatus.BLOCKED]: new Set([
		TaskStatus.BLOCKED,
		TaskStatus.TODO,
		TaskStatus.IN_PROGRESS,
		TaskStatus.REVIEW,
		TaskStatus.CANCELLED
	]),
	[TaskStatus.REVIEW]: new Set([
		TaskStatus.REVIEW,
		TaskStatus.IN_PROGRESS,
		TaskStatus.DONE,
		TaskStatus.CANCELLED
	]),
	[TaskStatus.DONE]: new Set([TaskStatus.DONE, TaskStatus.CANCELLED]),
	[TaskStatus.CANCELLED]: new Set([TaskStatus.CANCELLED])
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
	return VALID_TRANSITIONS[from].has(to);
}
