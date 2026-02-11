// src/services/TaskService.ts
import { Result } from '$domain/Result';
import { Task, TaskError, TaskNotFoundError, TaskValidationError } from '$domain/Task';
import type {
	TaskRepository,
	CreateTaskData,
	UpdateTaskData,
	TaskFilter
} from './ports/TaskRepository';

export class TaskService {
	constructor(private readonly repository: TaskRepository) {}

	async getTaskById(id: string): Promise<Result<Task, TaskNotFoundError>> {
		return this.repository.findById(id);
	}

	async getAllTasks(filter?: TaskFilter): Promise<Result<Task[], TaskError>> {
		return this.repository.findAll(filter);
	}

	async createTask(data: CreateTaskData): Promise<Result<Task, TaskValidationError>> {
		// Validate title before delegating to repository
		const { TaskTitle } = await import('$domain/Task');
		const titleResult = TaskTitle.create(data.title);

		if (titleResult.isError) {
			return Result.error(titleResult.error);
		}

		return this.repository.create(data);
	}

	async updateTask(id: string, data: UpdateTaskData): Promise<Result<Task, TaskError>> {
		// Validate title if provided
		if (data.title !== undefined) {
			const { TaskTitle } = await import('$domain/Task');
			const titleResult = TaskTitle.create(data.title);

			if (titleResult.isError) {
				return Result.error(titleResult.error);
			}
		}

		return this.repository.update(id, data);
	}

	async deleteTask(id: string): Promise<Result<void, TaskNotFoundError>> {
		return this.repository.delete(id);
	}

	async getSubtasks(parentId: string): Promise<Result<Task[], TaskError>> {
		return this.repository.findSubtasks(parentId);
	}
}
