import type { TaskPriority, TaskStatus } from '$lib/types/task';

// Input types
export interface CreateTaskInput {
	title: string;
	description?: string;
	status: TaskStatus;
	priority: TaskPriority;
	dueDate?: string;
	assigneeId?: string;
	departmentId?: string;
	projectId?: string;
	estimatedHours?: number;
	tags?: string[];
	taskTypeId?: string;
	parentTaskId?: string;
	requiresManualReassignment?: boolean;
}

export interface UpdateTaskInput {
	title?: string;
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	dueDate?: string;
	assigneeId?: string;
	estimatedHours?: number;
	actualHours?: number;
	tags?: string[];
	taskTypeId?: string;
	parentTaskId?: string;
	requiresManualReassignment?: boolean;
}

export interface ChangeTaskStatusInput {
	taskId: string;
	newStatus: TaskStatus;
	comment?: string;
}

export interface AssignTaskInput {
	taskId: string;
	userId: string;
	role: string;
}

export interface CreateTaskDependencyInput {
	taskId: string;
	dependsOnTaskId: string;
	dependencyType: string;
}
