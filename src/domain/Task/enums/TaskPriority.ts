// src/domain/Task/enums/TaskPriority.ts
export enum TaskPriority {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	URGENT = 'URGENT'
}

const VALID_PRIORITIES = new Set(Object.values(TaskPriority));

export function isValidTaskPriority(priority: string): priority is TaskPriority {
	return VALID_PRIORITIES.has(priority as TaskPriority);
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
	[TaskPriority.LOW]: 1,
	[TaskPriority.MEDIUM]: 2,
	[TaskPriority.HIGH]: 3,
	[TaskPriority.URGENT]: 4
};

export function comparePriority(a: TaskPriority, b: TaskPriority): number {
	return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}
