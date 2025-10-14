// GraphQL Operations: Task Management with Hierarchy and Dependencies
import type { Client } from '@urql/core';
// Feature: 028-task-system-expansion
// Purpose: Task CRUD operations with subtasks, dependencies, and RBAC enforcement

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';
import type {
	Task,
	TaskType,
	TaskAuditEntry,
	TaskDependency,
	LinkedResource,
	TaskStatus,
	TaskPriority,
	ResourceType,
	AvailabilityStatus,
	AuditActionType
} from '$lib/types/task';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get all tasks with filtering, sorting, and pagination
 * RLS Policy: task_read_policy (RBAC-enforced)
 * Note: Migrated to Rust idiomatic naming conventions
 */
export const GET_ALL_TASKS = gql`
	query GetAllTasks(
		$limit: Int = 20
		$offset: Int = 0
		$orderBy: String = "created_at_desc"
		$filter: TaskFilter
	) {
		tasks(limit: $limit, offset: $offset, orderBy: $orderBy, filter: $filter) {
			id
			title
			description
			assigneeId
			creatorId
			taskTypeId
			status
			priority
			dueDate
			parentTaskId
			archived
			archivedAt
			archivedBy
			requiresManualReassignment
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
			creator {
				id
				displayName
				email
			}
			taskType {
				id
				name
				description
				isSystem
			}
		}
	}
`;

/**
 * Query: Get current user's tasks with RBAC filtering
 * RLS Policy: Automatic filtering based on role (employee sees own, manager sees team, admin sees all)
 */
export const GET_MY_TASKS = gql`
	query GetMyTasks(
		$limit: Int = 20
		$offset: Int = 0
		$orderBy: String = "due_date_asc"
		$filter: TaskFilter
	) {
		tasks(limit: $limit, offset: $offset, orderBy: $orderBy, filter: $filter) {
			id
			title
			description
			assigneeId
			creatorId
			taskTypeId
			status
			priority
			dueDate
			parentTaskId
			archived
			requiresManualReassignment
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
			creator {
				id
				displayName
				email
			}
			taskType {
				id
				name
				description
			}
		}
	}
`;

/**
 * Query: Get task with full hierarchy (subtasks recursively loaded)
 * Note: Includes subtaskProgress calculation
 */
export const GET_TASK_HIERARCHY = gql`
	query GetTaskHierarchy($taskId: UUID!) {
		task(id: $taskId) {
			id
			title
			description
			assigneeId
			creatorId
			taskTypeId
			status
			priority
			dueDate
			parentTaskId
			archived
			archivedAt
			archivedBy
			requiresManualReassignment
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
			creator {
				id
				displayName
				email
			}
			taskType {
				id
				name
				description
			}
			subtasks {
				id
				title
				description
				assigneeId
				creatorId
				status
				priority
				dueDate
				parentTaskId
				archived
				createdAt
				updatedAt
				assignee {
					id
					displayName
					email
				}
				subtasks {
					id
					title
					status
					priority
					dueDate
					parentTaskId
				}
			}
			linkedResources {
				id
				resourceType
				resourceId
				resourceTitle
				availabilityStatus
				lastChecked
				createdAt
			}
			blockedByDependencies {
				id
				blockingTaskId
				blockedTaskId
				dependencyType
				createdAt
				blockingTask {
					id
					title
					status
				}
			}
		}
	}
`;

/**
 * Query: Get task audit trail
 * Note: Ordered by timestamp DESC
 */
export const GET_TASK_AUDIT_ENTRIES = gql`
	query GetTaskAuditEntries($taskId: UUID!, $limit: Int = 50, $offset: Int = 0) {
		task_audit_entries(
			taskId: $taskId
			limit: $limit
			offset: $offset
			orderBy: "timestamp_desc"
		) {
			id
			taskId
			actionType
			changedFields
			newValues
			userId
			timestamp
			user {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get all task types (system and custom)
 */
export const GET_ALL_TASK_TYPES = gql`
	query GetAllTaskTypes {
		task_types(orderBy: "name_asc") {
			id
			name
			description
			isSystem
			createdAt
			createdBy
		}
	}
`;

/**
 * Query: Get orphaned tasks (tasks with deleted parent_task_id)
 * Note: For administrative cleanup and reassignment
 */
export const GET_ORPHANED_TASKS = gql`
	query GetOrphanedTasks($limit: Int = 50, $offset: Int = 0) {
		tasks(
			filter: { parentTaskId: null }
			limit: $limit
			offset: $offset
			orderBy: "created_at_desc"
		) {
			id
			title
			status
			assigneeId
			creatorId
			createdAt
			assignee {
				id
				displayName
			}
		}
	}
`;

/**
 * Query: Get tasks with dependencies
 * Note: For dependency management and cycle detection
 */
export const GET_TASKS_WITH_DEPENDENCIES = gql`
	query GetTasksWithDependencies($limit: Int = 20, $offset: Int = 0) {
		tasks(limit: $limit, offset: $offset, orderBy: "created_at_desc") {
			id
			title
			status
			priority
			dueDate
			blockingDependencies {
				id
				blockedTaskId
				dependencyType
				blockedTask {
					id
					title
					status
				}
			}
			blockedByDependencies {
				id
				blockingTaskId
				dependencyType
				blockingTask {
					id
					title
					status
				}
			}
		}
	}
`;


// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create task
 * RLS Policy: task_write_policy (creator/assignee/manager/admin)
 */
export const CREATE_TASK = gql`
	mutation CreateTask($input: CreateTaskInput!) {
		create_task(input: $input) {
			id
			title
			description
			assigneeId
			creatorId
			taskTypeId
			status
			priority
			dueDate
			parentTaskId
			archived
			requiresManualReassignment
			createdAt
			updatedAt
			assignee {
				id
				displayName
				email
			}
			creator {
				id
				displayName
				email
			}
			taskType {
				id
				name
				description
			}
		}
	}
`;

/**
 * Mutation: Update task
 * RLS Policy: task_write_policy (creator/assignee/manager/admin)
 * Note: Automatically creates audit entry via database trigger
 */
export const UPDATE_TASK = gql`
	mutation UpdateTask($input: UpdateTaskInput!) {
		update_task(input: $input) {
			id
			title
			description
			assigneeId
			creatorId
			taskTypeId
			status
			priority
			dueDate
			parentTaskId
			archived
			archivedAt
			archivedBy
			requiresManualReassignment
			updatedAt
			assignee {
				id
				displayName
				email
			}
			taskType {
				id
				name
				description
			}
		}
	}
`;

/**
 * Mutation: Delete task (soft delete - sets archived=true)
 * RLS Policy: task_delete_policy (admin only)
 */
export const DELETE_TASK = gql`
	mutation DeleteTask($input: UpdateTaskInput!) {
		update_task(input: $input) {
			id
			title
			archived
			archivedAt
			archivedBy
		}
	}
`;

/**
 * Mutation: Reassign task to new assignee
 * RLS Policy: task_write_policy (manager/admin)
 * Note: Creates notifications for both old and new assignees
 */
export const REASSIGN_TASK = gql`
	mutation ReassignTask($input: UpdateTaskInput!) {
		update_task(input: $input) {
			id
			title
			assigneeId
			status
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
 * Mutation: Create task dependency
 * Note: Database trigger prevents circular dependencies
 */
export const CREATE_TASK_DEPENDENCY = gql`
	mutation CreateTaskDependency($input: CreateTaskDependencyInput!) {
		create_task_dependency(input: $input) {
			id
			blockingTaskId
			blockedTaskId
			dependencyType
			createdAt
			blockingTask {
				id
				title
				status
			}
			blockedTask {
				id
				title
				status
			}
		}
	}
`;

/**
 * Mutation: Delete task dependency
 */
export const DELETE_TASK_DEPENDENCY = gql`
	mutation DeleteTaskDependency($id: UUID!) {
		delete_task_dependency(id: $id)
	}
`;

/**
 * Mutation: Create linked resource
 */
export const CREATE_LINKED_RESOURCE = gql`
	mutation CreateLinkedResource($input: CreateLinkedResourceInput!) {
		create_linked_resource(input: $input) {
			id
			taskId
			resourceType
			resourceId
			resourceTitle
			availabilityStatus
			lastChecked
			createdAt
		}
	}
`;

/**
 * Mutation: Delete linked resource
 */
export const DELETE_LINKED_RESOURCE = gql`
	mutation DeleteLinkedResource($id: UUID!) {
		delete_linked_resource(id: $id)
	}
`;

/**
 * Mutation: Update linked resource availability status
 */
export const UPDATE_LINKED_RESOURCE_STATUS = gql`
	mutation UpdateLinkedResourceStatus($input: UpdateLinkedResourceInput!) {
		update_linked_resource(input: $input) {
			id
			resourceType
			resourceId
			resourceTitle
			availabilityStatus
			lastChecked
		}
	}
`;

/**
 * Mutation: Create custom task type
 * RLS Policy: Admin only
 */
export const CREATE_TASK_TYPE = gql`
	mutation CreateTaskType($input: CreateTaskTypeInput!) {
		create_task_type(input: $input) {
			id
			name
			description
			isSystem
			createdAt
			createdBy
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface TaskFilter {
	assigneeId?: {
		equalTo?: string;
		in?: string[];
	};
	creatorId?: {
		equalTo?: string;
	};
	status?: {
		equalTo?: TaskStatus;
		in?: TaskStatus[];
	};
	priority?: {
		equalTo?: TaskPriority;
		in?: TaskPriority[];
	};
	taskTypeId?: {
		equalTo?: string;
		in?: string[];
	};
	parentTaskId?: {
		equalTo?: string | null;
		isNull?: boolean;
	};
	archived?: {
		equalTo?: boolean;
	};
	dueDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
	description?: {
		includesInsensitive?: string;
	};
}

export interface CreateTaskInput {
	title: string;
	description?: string;
	assigneeId: string;
	taskTypeId: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	dueDate?: string;
	parentTaskId?: string;
	requiresManualReassignment?: boolean;
}

export interface UpdateTaskInput {
	id: string;
	title?: string;
	description?: string;
	assigneeId?: string;
	taskTypeId?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	dueDate?: string;
	parentTaskId?: string;
	archived?: boolean;
	archivedAt?: string;
	archivedBy?: string;
	requiresManualReassignment?: boolean;
}

export interface DeleteTaskInput {
	id: string;
	archived: boolean;
	archivedAt: string;
	archivedBy: string;
}

export interface ReassignTaskInput {
	id: string;
	assigneeId: string;
}

export interface CreateTaskDependencyInput {
	blockingTaskId: string;
	blockedTaskId: string;
	dependencyType?: string;
}

export interface DeleteTaskDependencyInput {
	id: string;
}

export interface CreateLinkedResourceInput {
	taskId: string;
	resourceType: ResourceType;
	resourceId: string;
	resourceTitle: string;
	availabilityStatus?: AvailabilityStatus;
}

export interface DeleteLinkedResourceInput {
	id: string;
}

export interface UpdateLinkedResourceInput {
	id: string;
	availabilityStatus: AvailabilityStatus;
	lastChecked: string;
}

export interface CreateTaskTypeInput {
	name: string;
	description?: string;
	isSystem?: boolean;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build task filter safely
 */
export function buildTaskFilter({
	assigneeId,
	creatorId,
	status,
	priority,
	taskTypeId,
	parentTaskId,
	archived,
	dueDateFrom,
	dueDateTo,
	searchTerm
}: {
	assigneeId?: string;
	creatorId?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	taskTypeId?: string;
	parentTaskId?: string | null;
	archived?: boolean;
	dueDateFrom?: string;
	dueDateTo?: string;
	searchTerm?: string;
}): TaskFilter {
	const filter: TaskFilter = {};

	if (assigneeId) {
		filter.assigneeId = { equalTo: assigneeId };
	}

	if (creatorId) {
		filter.creatorId = { equalTo: creatorId };
	}

	if (status) {
		filter.status = { equalTo: status };
	}

	if (priority) {
		filter.priority = { equalTo: priority };
	}

	if (taskTypeId) {
		filter.taskTypeId = { equalTo: taskTypeId };
	}

	if (parentTaskId !== undefined) {
		if (parentTaskId === null) {
			filter.parentTaskId = { isNull: true };
		} else {
			filter.parentTaskId = { equalTo: parentTaskId };
		}
	}

	if (archived !== undefined) {
		filter.archived = { equalTo: archived };
	}

	if (dueDateFrom || dueDateTo) {
		filter.dueDate = {};
		if (dueDateFrom) {
			filter.dueDate.greaterThanOrEqualTo = dueDateFrom;
		}
		if (dueDateTo) {
			filter.dueDate.lessThanOrEqualTo = dueDateTo;
		}
	}

	if (searchTerm) {
		filter.title = { includesInsensitive: searchTerm };
	}

	return filter;
}

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
 * Helper: Calculate subtask progress percentage
 * NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
 */
export function calculateSubtaskProgress(subtasks: Task[]): number {
	if (subtasks.length === 0) return 0;

	const completedCount = subtasks.filter((t) => t.status === 'COMPLETED').length;
	return Math.round((completedCount / subtasks.length) * 10000) / 100; // Round to 2 decimal places
}

/**
 * Helper: Check if task is overdue
 * NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
 */
export function isTaskOverdue(task: Task): boolean {
	if (!task.dueDate || task.status === 'COMPLETED' || task.archived) {
		return false;
	}
	const dueDate = new Date(task.dueDate);
	const now = new Date();
	return dueDate < now;
}

/**
 * Helper: Get task status color
 * NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
 */
export function getTaskStatusColor(status: TaskStatus): string {
	const statusColors: Record<TaskStatus, string> = {
		'TO_DO': 'gray',
		'IN_PROGRESS': 'blue',
		'BLOCKED': 'red',
		'DEFERRED': 'yellow',
		'COMPLETED': 'green'
	};
	return statusColors[status] || 'gray';
}

/**
 * Helper: Get task priority color
 * NOTE: Using GraphQL enum format (SCREAMING_SNAKE_CASE)
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
	const priorityColors: Record<TaskPriority, string> = {
		'LOW': 'gray',
		'MEDIUM': 'blue',
		'HIGH': 'orange',
		'URGENT': 'red'
	};
	return priorityColors[priority] || 'gray';
}

/**
 * Helper: Format audit action type
 */
export function formatAuditAction(action: AuditActionType): string {
	const actionLabels: Record<AuditActionType, string> = {
		created: 'Created',
		edited: 'Edited',
		reassigned: 'Reassigned',
		deleted: 'Deleted',
		status_changed: 'Status Changed',
		org_change: 'Organizational Change'
	};
	return actionLabels[action] || action;
}

// ============================================================================
// OPERATIONS CLASS
// ============================================================================

/**
 * T019: Tasks Operations with Hierarchy and Dependencies
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
		limit?: number;
		offset?: number;
		filter?: any;
		orderBy?: string;
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
				limit,
				offset: params.offset || 0,
				filter: params.filter || {},
				orderBy: params.orderBy || 'created_at_desc'
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
	 * Get current user's tasks (RBAC-aware)
	 */
	async getMyTasks(params: {
		limit?: number;
		offset?: number;
		filter?: any;
		orderBy?: string;
		userCredentials: UserCredentials;
	}): Promise<{ tasks: Task[]; totalCount: number }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetMyTasks',
			variables: {
				limit: params.limit || 20,
				offset: params.offset || 0,
				filter: params.filter || {},
				orderBy: params.orderBy || 'due_date_asc'
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
	 * Get task hierarchy (with subtasks recursively loaded)
	 */
	async getTaskHierarchy(params: {
		taskId: string;
		userCredentials: UserCredentials;
	}): Promise<Task> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetTaskHierarchy',
			variables: { taskId: params.taskId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_TASK_HIERARCHY, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load task hierarchy. Please try again.'
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
	 * Get task audit entries
	 */
	async getTaskAuditEntries(params: {
		taskId: string;
		limit?: number;
		offset?: number;
		userCredentials: UserCredentials;
	}): Promise<{ entries: TaskAuditEntry[]; totalCount: number }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetTaskAuditEntries',
			variables: {
				taskId: params.taskId,
				limit: params.limit || 50,
				offset: params.offset || 0
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.query(GET_TASK_AUDIT_ENTRIES, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load audit trail. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.task_audit_entries) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No audit data returned. Please try again.'
				});
			}

			const entries = result.data.task_audit_entries;
			return {
				entries,
				totalCount: entries.length
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load audit trail. Please try again.'
			});
		}
	}

	/**
	 * Get all task types
	 */
	async getAllTaskTypes(params: { userCredentials: UserCredentials }): Promise<TaskType[]> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetAllTaskTypes',
			variables: {},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_ALL_TASK_TYPES, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load task types. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.task_types) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No task types data returned. Please try again.'
				});
			}

			return result.data.task_types;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load task types. Please try again.'
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

			if (!result.data || !result.data.create_task) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task creation failed. Please try again.'
				});
			}

			return result.data.create_task;
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
		input: UpdateTaskInput;
		userCredentials: UserCredentials;
	}): Promise<Task> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateTask',
			variables: { input: params.input },
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

			if (!result.data || !result.data.update_task) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task update failed. Please try again.'
				});
			}

			return result.data.update_task;
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
	 * Delete task (soft delete - sets archived=true)
	 */
	async deleteTask(params: {
		taskId: string;
		userId: string;
		userCredentials: UserCredentials;
	}): Promise<{ task: Task }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: UpdateTaskInput = {
			id: params.taskId,
			archived: true,
			archivedAt: new Date().toISOString(),
			archivedBy: params.userId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeleteTask',
			variables: { input },
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

			if (!result.data || !result.data.update_task) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task deletion failed. Please try again.'
				});
			}

			return { task: result.data.update_task };
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
	 * Reassign task to new assignee
	 */
	async reassignTask(params: {
		taskId: string;
		newAssigneeId: string;
		userCredentials: UserCredentials;
	}): Promise<{ task: Task; oldAssignee: any; newAssignee: any }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: UpdateTaskInput = {
			id: params.taskId,
			assigneeId: params.newAssigneeId
		};

		const dataRequest = createDataRequest({
			operationName: 'ReassignTask',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(REASSIGN_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to reassign task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.update_task) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task reassignment failed. Please try again.'
				});
			}

			const task = result.data.update_task;

			// Return structure expected by contract tests
			return {
				task,
				oldAssignee: null, // Would need to fetch from audit trail
				newAssignee: task.assignee
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to reassign task. Please try again.'
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

			if (!result.data || !result.data.create_task_dependency) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Dependency creation failed. Please try again.'
				});
			}

			return { taskDependency: result.data.create_task_dependency };
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
	 */
	async deleteTaskDependency(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
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

			if (!result.data || !result.data.delete_task_dependency) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Dependency deletion failed. Please try again.'
				});
			}

			return result.data.delete_task_dependency;
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

	/**
	 * Create linked resource
	 */
	async createLinkedResource(params: {
		input: CreateLinkedResourceInput;
		userCredentials: UserCredentials;
	}): Promise<LinkedResource> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateLinkedResource',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.mutation(CREATE_LINKED_RESOURCE, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to link resource. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.create_linked_resource) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Resource linking failed. Please try again.'
				});
			}

			return result.data.create_linked_resource;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to link resource. Please try again.'
			});
		}
	}

	/**
	 * Update linked resource status
	 */
	async updateLinkedResourceStatus(params: {
		resourceId: string;
		status: AvailabilityStatus;
		userCredentials: UserCredentials;
	}): Promise<LinkedResource> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: UpdateLinkedResourceInput = {
			id: params.resourceId,
			availabilityStatus: params.status,
			lastChecked: new Date().toISOString()
		};

		const dataRequest = createDataRequest({
			operationName: 'UpdateLinkedResourceStatus',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client
				.mutation(UPDATE_LINKED_RESOURCE_STATUS, dataRequest.variables)
				.toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update resource status. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.update_linked_resource) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Resource update failed. Please try again.'
				});
			}

			return result.data.update_linked_resource;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update resource. Please try again.'
			});
		}
	}

	/**
	 * Create custom task type
	 */
	async createTaskType(params: {
		input: CreateTaskTypeInput;
		userCredentials: UserCredentials;
	}): Promise<TaskType> {
		const { createDataRequest} = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'CreateTaskType',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(CREATE_TASK_TYPE, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create task type. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.create_task_type) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task type creation failed. Please try again.'
				});
			}

			return result.data.create_task_type;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create task type. Please try again.'
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
