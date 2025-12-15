import type { TaskPriority, TaskStatus } from '$lib/types/task';

// Filter state interface
export interface TaskFilterState {
	search: string;
	statuses: TaskStatus[];
	priorities: TaskPriority[];
	assigneeId: string | null;
	taskTypeId: string | null;
	dueDateStart: string | null;
	dueDateEnd: string | null;
	hasParent: boolean | null; // null = all, true = subtasks only, false = top-level only
	hasDependencies: boolean | null; // null = all, true = with deps, false = without deps
}
