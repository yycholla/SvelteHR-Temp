// src/adapters/graphql/GraphQLTaskAdapter.ts
import { Client } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Task,
	TaskTitle,
	TaskDescription,
	DueDate,
	TaskStatus,
	TaskPriority,
	TaskError,
	TaskNotFoundError,
	TaskValidationError
} from '$domain/Task';
import type {
	TaskRepository,
	CreateTaskData,
	UpdateTaskData,
	TaskFilter
} from '$services/ports/TaskRepository';
import { GET_TASK, GET_ALL_TASKS } from '$lib/graphql/tasks/queries';
import { CREATE_TASK, UPDATE_TASK, DELETE_TASK } from '$lib/graphql/tasks/mutations';

/**
 * GraphQL schema response shape
 * NOTE: GraphQL schema has extra fields (departmentId, projectId, estimatedHours, etc.)
 * that aren't in the current domain model. We map only the domain fields.
 */
interface GraphQLTask {
	id: string;
	title: string;
	description?: string | null;
	status: string;
	priority: string;
	assigneeId?: string | null;
	dueDate?: string | null;
	createdAt: string;
	updatedAt: string;
	// Extra GraphQL fields we ignore for now
	departmentId?: string | null;
	projectId?: string | null;
	estimatedHours?: number | null;
	actualHours?: number | null;
	tags?: string[];
}

/**
 * GraphQLTaskAdapter implements TaskRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLTaskAdapter(urqlClient, currentUserId);
 * const result = await adapter.findById('task-123');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLTaskAdapter implements TaskRepository {
	constructor(
		private readonly client: Client,
		private readonly currentUserId: string
	) {}

	async findById(id: string): Promise<Result<Task, TaskNotFoundError>> {
		try {
			const result = await this.client.query(GET_TASK, { id }).toPromise();

			if (result.error) {
				return Result.error(new TaskNotFoundError(id));
			}

			if (!result.data?.task) {
				return Result.error(new TaskNotFoundError(id));
			}

			return this.mapToTask(result.data.task);
		} catch (error) {
			return Result.error(new TaskNotFoundError(id));
		}
	}

	async findAll(filter?: TaskFilter): Promise<Result<Task[], TaskError>> {
		try {
			// Map domain filter to GraphQL filter
			const graphqlFilter = filter
				? {
						status: filter.status,
						priority: filter.priority,
						assigneeId: filter.assigneeId
					}
				: undefined;

			const result = await this.client.query(GET_ALL_TASKS, { filter: graphqlFilter }).toPromise();

			if (result.error) {
				return Result.error(new TaskError(result.error.message));
			}

			const tasks = result.data?.tasks ?? [];
			const mappedTasks: Task[] = [];

			// Resilient error handling: skip invalid tasks instead of failing
			for (const taskData of tasks) {
				const taskResult = this.mapToTask(taskData);
				if (taskResult.isOk) {
					mappedTasks.push(taskResult.value);
				}
				// Skip invalid tasks (e.g., invalid title, description)
			}

			return Result.ok(mappedTasks);
		} catch (error) {
			return Result.error(
				new TaskError(
					`Failed to fetch tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(data: CreateTaskData): Promise<Result<Task, TaskValidationError>> {
		try {
			// Map domain data to GraphQL input
			const input = {
				title: data.title,
				description: data.description ?? '',
				status: data.status ?? TaskStatus.TODO,
				priority: data.priority ?? TaskPriority.MEDIUM,
				assigneeId: data.assigneeId,
				dueDate: data.dueDate?.toISOString(),
				parentTaskId: data.parentTaskId,
				tags: data.tags ?? []
			};

			const result = await this.client.mutation(CREATE_TASK, { input }).toPromise();

			if (result.error) {
				return Result.error(new TaskValidationError(result.error.message));
			}

			if (!result.data?.createTask) {
				return Result.error(new TaskValidationError('Failed to create task'));
			}

			return this.mapToTask(result.data.createTask);
		} catch (error) {
			return Result.error(
				new TaskValidationError(
					`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(id: string, data: UpdateTaskData): Promise<Result<Task, TaskError>> {
		try {
			// Map domain data to GraphQL input
			const input = {
				title: data.title,
				description: data.description,
				status: data.status,
				priority: data.priority,
				assigneeId: data.assigneeId,
				dueDate: data.dueDate ? data.dueDate.toISOString() : null,
				parentTaskId: data.parentTaskId,
				tags: data.tags
			};

			const result = await this.client.mutation(UPDATE_TASK, { id, input }).toPromise();

			if (result.error) {
				return Result.error(new TaskError(result.error.message));
			}

			if (!result.data?.updateTask) {
				return Result.error(new TaskNotFoundError(id));
			}

			return this.mapToTask(result.data.updateTask);
		} catch (error) {
			return Result.error(
				new TaskError(
					`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, TaskNotFoundError>> {
		try {
			const result = await this.client.mutation(DELETE_TASK, { id }).toPromise();

			if (result.error) {
				return Result.error(new TaskNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new TaskNotFoundError(id));
		}
	}

	async findSubtasks(parentId: string): Promise<Result<Task[], TaskError>> {
		return this.findAll({ parentTaskId: parentId } as TaskFilter);
	}

	/**
	 * Map GraphQL task data to domain Task entity
	 * @private
	 */
	private mapToTask(data: GraphQLTask): Result<Task, TaskValidationError> {
		// Validate and create TaskTitle
		const titleResult = TaskTitle.create(data.title);
		if (titleResult.isError) {
			return Result.error(titleResult.error);
		}

		// Validate and create TaskDescription
		const descriptionResult = TaskDescription.create(data.description ?? '');
		if (descriptionResult.isError) {
			return Result.error(descriptionResult.error);
		}

		// Create DueDate if present
		let dueDate: DueDate | undefined;
		if (data.dueDate) {
			const dueDateResult = DueDate.create(new Date(data.dueDate));
			// Allow past dates from database (they may have been valid when created)
			if (dueDateResult.isOk) {
				dueDate = dueDateResult.value;
			}
			// Skip invalid due dates (don't fail the entire task)
		}

		// Create Task entity
		return Task.create({
			id: data.id,
			title: titleResult.value,
			description: descriptionResult.value,
			status: data.status as TaskStatus,
			priority: data.priority as TaskPriority,
			createdBy: this.currentUserId, // GraphQL doesn't return createdBy, use current user
			assigneeId: data.assigneeId ?? undefined,
			dueDate,
			parentTaskId: undefined, // GraphQL doesn't have this field yet
			completedAt: undefined, // Would need to derive from status or add to GraphQL schema
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
			archived: false, // GraphQL doesn't have this field yet
			archivedAt: undefined,
			archivedBy: undefined
		});
	}
}
