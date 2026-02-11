// src/services/TaskService.ts
import { Result } from '$domain/Result';
import { Task, TaskError, TaskNotFoundError, TaskValidationError, TaskTitle } from '$domain/Task';
import type {
	TaskRepository,
	CreateTaskData,
	UpdateTaskData,
	TaskFilter
} from './ports/TaskRepository';

export class TaskService {
	constructor(private readonly repository: TaskRepository) {}

	async getTaskById(id: string): Promise<Result<Task, TaskNotFoundError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(
				new TaskError(
					`Failed to fetch task: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<Task, TaskNotFoundError>;
		}
	}

	async getAllTasks(filter?: TaskFilter): Promise<Result<Task[], TaskError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new TaskError(
					`Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createTask(data: CreateTaskData): Promise<Result<Task, TaskValidationError>> {
		try {
			// Validate title before delegating to repository
			const titleResult = TaskTitle.create(data.title);

			if (titleResult.isError) {
				return Result.error(titleResult.error);
			}

			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new TaskValidationError(
					`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateTask(id: string, data: UpdateTaskData): Promise<Result<Task, TaskError>> {
		try {
			// Validate title if provided
			if (data.title !== undefined) {
				const titleResult = TaskTitle.create(data.title);

				if (titleResult.isError) {
					return Result.error(titleResult.error);
				}
			}

			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new TaskError(
					`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteTask(id: string): Promise<Result<void, TaskNotFoundError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(
				new TaskError(
					`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<void, TaskNotFoundError>;
		}
	}

	async getSubtasks(parentId: string): Promise<Result<Task[], TaskError>> {
		try {
			return await this.repository.findSubtasks(parentId);
		} catch (error) {
			return Result.error(
				new TaskError(
					`Failed to fetch subtasks: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
