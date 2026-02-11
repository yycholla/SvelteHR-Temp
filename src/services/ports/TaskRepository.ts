// src/services/ports/TaskRepository.ts
import { Result } from '$domain/Result';
import { Task, TaskError, TaskNotFoundError, TaskValidationError } from '$domain/Task';

export interface TaskFilter {
	status?: string[];
	priority?: string[];
	assigneeId?: string;
	createdBy?: string;
	search?: string;
	dueBefore?: Date;
	dueAfter?: Date;
	archived?: boolean;
}

export interface CreateTaskData {
	title: string;
	description?: string;
	status?: string;
	priority?: string;
	assigneeId?: string;
	dueDate?: Date;
	parentTaskId?: string;
	tags?: string[];
}

export interface UpdateTaskData {
	title?: string;
	description?: string;
	status?: string;
	priority?: string;
	assigneeId?: string;
	dueDate?: Date | null;
	parentTaskId?: string | null;
	tags?: string[];
}

export interface TaskRepository {
	/**
	 * Find a task by ID
	 * @returns Task if found, TaskNotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Task, TaskNotFoundError>>;

	/**
	 * Find all tasks matching filter
	 * @returns Array of tasks (empty if none found)
	 */
	findAll(filter?: TaskFilter): Promise<Result<Task[], TaskError>>;

	/**
	 * Create a new task
	 * @returns Created task or validation error
	 */
	create(data: CreateTaskData): Promise<Result<Task, TaskValidationError>>;

	/**
	 * Update an existing task
	 * @returns Updated task or error
	 */
	update(id: string, data: UpdateTaskData): Promise<Result<Task, TaskError>>;

	/**
	 * Delete a task (soft delete - sets archived flag)
	 * @returns Success or error
	 */
	delete(id: string): Promise<Result<void, TaskNotFoundError>>;

	/**
	 * Find subtasks of a parent task
	 * @returns Array of subtasks (empty if none)
	 */
	findSubtasks(parentId: string): Promise<Result<Task[], TaskError>>;
}
