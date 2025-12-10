// Tasks Operations - Main Entry Point
import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import type { Task, TaskDependency, TaskPriority, TaskStatus } from '$lib/types/task';
import { GET_ALL_TASKS, GET_MY_TASKS, GET_TASK } from './queries';
import {
	ASSIGN_TASK,
	CHANGE_TASK_STATUS,
	CREATE_TASK,
	CREATE_TASK_DEPENDENCY,
	DELETE_TASK,
	DELETE_TASK_DEPENDENCY,
	UPDATE_TASK
} from './mutations';
import { validateTaskInput } from './utils';

// Re-export queries, mutations, and utils
export * from './queries';
export * from './mutations';
export * from './utils';

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

/**
 * Tasks Operations with Idiomatic Rust GraphQL Patterns
 */
export class TasksOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get all tasks (RBAC-filtered)
	 */
	async getAllTasks(params: {
		assigneeId?: string;
		departmentId?: string;
		status?: TaskStatus;
		priority?: TaskPriority;
		limit?: number;
		offset?: number;
		userCredentials: UserCredentials;
	}): Promise<{
		tasks: Task[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const limit = params.limit || 20;

		// Build filter object from params
		const filter: any = {};
		if (params.assigneeId) filter.assigneeId = params.assigneeId;
		if (params.departmentId) filter.departmentId = params.departmentId;
		if (params.status) filter.status = params.status;
		if (params.priority) filter.priority = params.priority;

		const dataRequest = createDataRequest({
			operationName: 'GetAllTasks',
			variables: {
				filter: Object.keys(filter).length > 0 ? filter : null,
				limit,
				offset: params.offset || 0
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_ALL_TASKS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load tasks. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.tasks) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No tasks data returned. Please try again.'
				});
			}

			const tasks = result.data.tasks;
			return {
				tasks,
				totalCount: tasks.length,
				hasNextPage: tasks.length === limit
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load tasks. Please try again.'
			});
		}
	}

	/**
	 * Get single task by ID
	 */
	async getTask(params: { taskId: string; userCredentials: UserCredentials }): Promise<Task> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetTask',
			variables: { id: params.taskId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.task) {
				throw createErrorResponse(new Error('Task not found'), {
					type: 'graphql',
					userMessage: 'Task not found. Please try again.'
				});
			}

			return result.data.task;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load task. Please try again.'
			});
		}
	}

	/**
	 * Get current user's tasks (RBAC-aware)
	 */
	async getMyTasks(params: {
		userId: string;
		limit?: number;
		offset?: number;
		userCredentials: UserCredentials;
	}): Promise<{ tasks: Task[]; totalCount: number }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetMyTasks',
			variables: {
				filter: { assigneeId: params.userId },
				limit: params.limit || 20,
				offset: params.offset || 0
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_MY_TASKS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load your tasks. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.tasks) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No tasks data returned. Please try again.'
				});
			}

			const tasks = result.data.tasks;
			return {
				tasks,
				totalCount: tasks.length
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load tasks. Please try again.'
			});
		}
	}

	/**
	 * Create task
	 */
	async createTask(params: {
		input: CreateTaskInput;
		userCredentials: UserCredentials;
	}): Promise<Task> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input
		const validation = validateTaskInput(params.input);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.errors.join(', ')), {
				type: 'validation',
				userMessage: validation.errors.join(', ')
			});
		}

		const dataRequest = createDataRequest({
			operationName: 'CreateTask',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(CREATE_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createTask) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task creation failed. Please try again.'
				});
			}

			return result.data.createTask;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create task. Please try again.'
			});
		}
	}

	/**
	 * Update task
	 */
	async updateTask(params: {
		id: string;
		input: UpdateTaskInput;
		userCredentials: UserCredentials;
	}): Promise<Task> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateTask',
			variables: { id: params.id, input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(UPDATE_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.updateTask) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task update failed. Please try again.'
				});
			}

			return result.data.updateTask;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update task. Please try again.'
			});
		}
	}

	/**
	 * Delete task
	 * Returns: Boolean indicating success
	 */
	async deleteTask(params: { taskId: string; userCredentials: UserCredentials }): Promise<boolean> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeleteTask',
			variables: { id: params.taskId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(DELETE_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to delete task. Please try again.'
				});
				throw errorResponse;
			}

			return result.data?.deleteTask || false;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete task. Please try again.'
			});
		}
	}

	/**
	 * Change task status
	 */
	async changeTaskStatus(params: {
		taskId: string;
		newStatus: TaskStatus;
		comment?: string;
		userCredentials: UserCredentials;
	}): Promise<Task> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: ChangeTaskStatusInput = {
			taskId: params.taskId,
			newStatus: params.newStatus,
			comment: params.comment
		};

		const dataRequest = createDataRequest({
			operationName: 'ChangeTaskStatus',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.mutation(CHANGE_TASK_STATUS, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to change task status. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.changeTaskStatus) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Status change failed. Please try again.'
				});
			}

			return result.data.changeTaskStatus;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to change status. Please try again.'
			});
		}
	}

	/**
	 * Assign task to user
	 */
	async assignTaskToUser(params: {
		taskId: string;
		userId: string;
		role: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: AssignTaskInput = {
			taskId: params.taskId,
			userId: params.userId,
			role: params.role
		};

		const dataRequest = createDataRequest({
			operationName: 'AssignTaskToUser',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(ASSIGN_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to assign task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.assignTaskToUser) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task assignment failed. Please try again.'
				});
			}

			return result.data.assignTaskToUser;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to assign task. Please try again.'
			});
		}
	}

	/**
	 * Create task dependency
	 */
	async createTaskDependency(params: {
		input: CreateTaskDependencyInput;
		userCredentials: UserCredentials;
	}): Promise<{ taskDependency: TaskDependency }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateTaskDependency',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.mutation(CREATE_TASK_DEPENDENCY, dataRequest.variables)
				.toPromise();

			if (result.error) {
				// Check for circular dependency error
				if (result.error.message.includes('Circular dependency')) {
					throw createErrorResponse(result.error, {
						type: 'validation',
						userMessage: 'Circular dependency detected. Cannot create this dependency.'
					});
				}

				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create dependency. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data?.createTaskDependency) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Dependency creation failed. Please try again.'
				});
			}

			return { taskDependency: result.data.createTaskDependency };
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create dependency. Please try again.'
			});
		}
	}

	/**
	 * Delete task dependency
	 * Returns: Boolean indicating success
	 */
	async deleteTaskDependency(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeleteTaskDependency',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.mutation(DELETE_TASK_DEPENDENCY, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to delete dependency. Please try again.'
				});
				throw errorResponse;
			}

			return result.data?.deleteTaskDependency || false;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete dependency. Please try again.'
			});
		}
	}
}

/**
 * Factory function to create TasksOperations instance
 */
export function createTasksOperations(client: Client): TasksOperations {
	return new TasksOperations(client);
}
