// GraphQL Operations: Task Management with Hierarchy and Dependencies
// Migrated to Rust idiomatic GraphQL patterns (PostGraphile removed)
import type { Client } from '@urql/core';

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';
import type {
	Task,
	TaskDependency,
	TaskStatus,
	TaskPriority
} from '$lib/types/task';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get all tasks with filtering, sorting, and pagination
 * Backend: Rust idiomatic pattern - direct array return
 * RLS: Automatic RBAC filtering
 */
export const GET_ALL_TASKS = gql`
	query GetAllTasks($assigneeId: UUID, $limit: Int = 20, $offset: Int = 0) {
		tasks(assigneeId: $assigneeId, limit: $limit, offset: $offset) {
			id
			title
			description
			assigneeId
			departmentId
			status
			priority
			dueDate
			estimatedHours
			actualHours
			tags
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get single task by ID
 * Backend: Rust idiomatic pattern - task(id) not taskById
 */
export const GET_TASK = gql`
	query GetTask($id: UUID!) {
		task(id: $id) {
			id
			title
			description
			assigneeId
			departmentId
			projectId
			status
			priority
			dueDate
			estimatedHours
			actualHours
			tags
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get current user's tasks
 * Note: Use assigneeId filter with current user's ID
 */
export const GET_MY_TASKS = gql`
	query GetMyTasks($assigneeId: UUID!, $limit: Int = 20, $offset: Int = 0) {
		tasks(assigneeId: $assigneeId, limit: $limit, offset: $offset) {
			id
			title
			description
			status
			priority
			dueDate
			estimatedHours
			actualHours
			tags
			createdAt
			updatedAt
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create task
 * Backend: Rust idiomatic - createTask not create_task
 * RLS: Automatic permission checking
 */
export const CREATE_TASK = gql`
	mutation CreateTask($input: CreateTaskInput!) {
		createTask(input: $input) {
			id
			title
			description
			status
			priority
			dueDate
			assigneeId
			departmentId
			projectId
			estimatedHours
			tags
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Mutation: Update task
 * Backend: Rust idiomatic - updateTask(id, input) not update_task
 */
export const UPDATE_TASK = gql`
	mutation UpdateTask($id: UUID!, $input: UpdateTaskInput!) {
		updateTask(id: $id, input: $input) {
			id
			title
			description
			status
			priority
			dueDate
			assigneeId
			estimatedHours
			actualHours
			tags
			updatedAt
			assignee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Mutation: Delete task
 * Backend: Rust idiomatic - deleteTask(id) returns Boolean
 */
export const DELETE_TASK = gql`
	mutation DeleteTask($id: UUID!) {
		deleteTask(id: $id)
	}
`;

/**
 * Mutation: Change task status
 * Backend: Dedicated mutation for status changes
 */
export const CHANGE_TASK_STATUS = gql`
	mutation ChangeTaskStatus($input: ChangeTaskStatusInput!) {
		changeTaskStatus(input: $input) {
			id
			status
			updatedAt
		}
	}
`;

/**
 * Mutation: Assign task to user
 * Backend: Dedicated mutation for task assignment
 */
export const ASSIGN_TASK = gql`
	mutation AssignTaskToUser($input: AssignTaskInput!) {
		assignTaskToUser(input: $input) {
			id
			taskId
			userId
			role
			assignedAt
		}
	}
`;

/**
 * Mutation: Create task dependency
 * Backend: Rust idiomatic - createTaskDependency
 */
export const CREATE_TASK_DEPENDENCY = gql`
	mutation CreateTaskDependency($input: CreateTaskDependencyInput!) {
		createTaskDependency(input: $input) {
			id
			taskId
			dependsOnTaskId
			dependencyType
			createdAt
		}
	}
`;

/**
 * Mutation: Delete task dependency
 * Backend: Rust idiomatic - deleteTaskDependency(id) returns Boolean
 */
export const DELETE_TASK_DEPENDENCY = gql`
	mutation DeleteTaskDependency($id: UUID!) {
		deleteTaskDependency(id: $id)
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Validate task input
 */
export function validateTaskInput(input: {
	title: string;
	description?: string;
	dueDate?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 255) {
		errors.push('Title must be less than 255 characters');
	}

	if (input.description && input.description.length > 5000) {
		errors.push('Description must be less than 5000 characters');
	}

	if (input.dueDate) {
		const dueDate = new Date(input.dueDate);
		const now = new Date();
		if (dueDate < now) {
			errors.push('Due date cannot be in the past');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Check if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
	if (!task.dueDate || task.status === 'COMPLETED') {
		return false;
	}
	const dueDate = new Date(task.dueDate);
	const now = new Date();
	return dueDate < now;
}

/**
 * Helper: Get task status color
 */
export function getTaskStatusColor(status: TaskStatus): string {
	const statusColors: Record<TaskStatus, string> = {
		TODO: 'gray',
		IN_PROGRESS: 'blue',
		BLOCKED: 'red',
		DEFERRED: 'yellow',
		COMPLETED: 'green'
	};
	return statusColors[status] || 'gray';
}

/**
 * Helper: Get task priority color
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
	const priorityColors: Record<TaskPriority, string> = {
		LOW: 'gray',
		MEDIUM: 'blue',
		HIGH: 'orange',
		URGENT: 'red'
	};
	return priorityColors[priority] || 'gray';
}

// ============================================================================
// OPERATIONS CLASS
// ============================================================================

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
		const dataRequest = createDataRequest({
			operationName: 'GetAllTasks',
			variables: {
				assigneeId: params.assigneeId,
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

			if (!result.data || !result.data.tasks) {
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
	async getTask(params: {
		taskId: string;
		userCredentials: UserCredentials;
	}): Promise<Task> {
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

			if (!result.data || !result.data.task) {
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
				assigneeId: params.userId,
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

			if (!result.data || !result.data.tasks) {
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

			if (!result.data || !result.data.createTask) {
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

			if (!result.data || !result.data.updateTask) {
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
	async deleteTask(params: {
		taskId: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
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

			if (!result.data || !result.data.changeTaskStatus) {
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

			if (!result.data || !result.data.assignTaskToUser) {
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

			if (!result.data || !result.data.createTaskDependency) {
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
