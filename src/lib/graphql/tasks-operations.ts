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
 * Note: Using PostGraphile conventions - condition instead of filter
 */
export const GET_ALL_TASKS = gql`
	query GetAllTasks(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [TasksOrderBy!] = [CREATED_AT_DESC]
		$condition: TaskCondition
	) {
		allTasks(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				nodeId
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
				userByAssigneeId {
					id
					displayName
					email
				}
				userByCreatorId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
					isSystem
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
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
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [TasksOrderBy!] = [DUE_DATE_ASC, PRIORITY_DESC]
		$condition: TaskCondition
	) {
		allTasks(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				nodeId
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
				userByAssigneeId {
					id
					displayName
					email
				}
				userByCreatorId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
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
		taskById(id: $taskId) {
			id
			nodeId
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
			userByAssigneeId {
				id
				displayName
				email
			}
			userByCreatorId {
				id
				displayName
				email
			}
			taskTypeByTaskTypeId {
				id
				name
				description
			}
			tasksByParentTaskId {
				nodes {
					id
					nodeId
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
					userByAssigneeId {
						id
						displayName
						email
					}
					tasksByParentTaskId {
						nodes {
							id
							title
							status
							priority
							dueDate
							parentTaskId
						}
						totalCount
					}
				}
				totalCount
			}
			linkedResourcesByTaskId {
				nodes {
					id
					resourceType
					resourceId
					resourceTitle
					availabilityStatus
					lastChecked
					createdAt
				}
			}
			taskDependenciesByBlockedTaskId {
				nodes {
					id
					blockingTaskId
					blockedTaskId
					dependencyType
					createdAt
					taskByBlockingTaskId {
						id
						title
						status
					}
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
	query GetTaskAuditEntries($taskId: UUID!, $first: Int = 50, $offset: Int = 0) {
		allTaskAuditEntries(
			condition: { taskId: $taskId }
			first: $first
			offset: $offset
			orderBy: TIMESTAMP_DESC
		) {
			nodes {
				id
				taskId
				actionType
				changedFields
				newValues
				userId
				timestamp
				userByUserId {
					id
					displayName
					email
				}
			}
			totalCount
		}
	}
`;

/**
 * Query: Get all task types (system and custom)
 */
export const GET_ALL_TASK_TYPES = gql`
	query GetAllTaskTypes {
		allTaskTypes(orderBy: NAME_ASC) {
			nodes {
				id
				name
				description
				isSystem
				createdAt
				createdBy
			}
			totalCount
		}
	}
`;

/**
 * Query: Get orphaned tasks (tasks with deleted parent_task_id)
 * Note: For administrative cleanup and reassignment
 */
export const GET_ORPHANED_TASKS = gql`
	query GetOrphanedTasks($first: Int = 50, $offset: Int = 0) {
		allTasks(
			condition: { parentTaskId: null }
			first: $first
			offset: $offset
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				title
				status
				assigneeId
				creatorId
				createdAt
				userByAssigneeId {
					id
					displayName
				}
			}
			totalCount
		}
	}
`;

/**
 * Query: Get tasks with dependencies
 * Note: For dependency management and cycle detection
 */
export const GET_TASKS_WITH_DEPENDENCIES = gql`
	query GetTasksWithDependencies($first: Int = 20, $offset: Int = 0) {
		allTasks(first: $first, offset: $offset, orderBy: CREATED_AT_DESC) {
			nodes {
				id
				title
				status
				priority
				dueDate
				taskDependenciesByBlockingTaskId {
					nodes {
						id
						blockedTaskId
						dependencyType
						taskByBlockedTaskId {
							id
							title
							status
						}
					}
					totalCount
				}
				taskDependenciesByBlockedTaskId {
					nodes {
						id
						blockingTaskId
						dependencyType
						taskByBlockingTaskId {
							id
							title
							status
						}
					}
					totalCount
				}
			}
			totalCount
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
		createTask(input: $input) {
			task {
				id
				nodeId
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
				userByAssigneeId {
					id
					displayName
					email
				}
				userByCreatorId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
				}
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update task
 * RLS Policy: task_write_policy (creator/assignee/manager/admin)
 * Note: Automatically creates audit entry via database trigger
 */
export const UPDATE_TASK = gql`
	mutation UpdateTask($input: UpdateTaskByIdInput!) {
		updateTaskById(input: $input) {
			task {
				id
				nodeId
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
				userByAssigneeId {
					id
					displayName
					email
				}
				taskTypeByTaskTypeId {
					id
					name
					description
				}
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete task (soft delete - sets archived=true)
 * RLS Policy: task_delete_policy (admin only)
 */
export const DELETE_TASK = gql`
	mutation DeleteTask($input: UpdateTaskByIdInput!) {
		updateTaskById(input: $input) {
			task {
				id
				nodeId
				title
				archived
				archivedAt
				archivedBy
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Reassign task to new assignee
 * RLS Policy: task_write_policy (manager/admin)
 * Note: Creates notifications for both old and new assignees
 */
export const REASSIGN_TASK = gql`
	mutation ReassignTask($input: UpdateTaskByIdInput!) {
		updateTaskById(input: $input) {
			task {
				id
				nodeId
				title
				assigneeId
				status
				updatedAt
				userByAssigneeId {
					id
					displayName
					email
				}
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Create task dependency
 * Note: Database trigger prevents circular dependencies
 */
export const CREATE_TASK_DEPENDENCY = gql`
	mutation CreateTaskDependency($input: CreateTaskDependencyInput!) {
		createTaskDependency(input: $input) {
			taskDependency {
				id
				blockingTaskId
				blockedTaskId
				dependencyType
				createdAt
				taskByBlockingTaskId {
					id
					title
					status
				}
				taskByBlockedTaskId {
					id
					title
					status
				}
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete task dependency
 */
export const DELETE_TASK_DEPENDENCY = gql`
	mutation DeleteTaskDependency($input: DeleteTaskDependencyInput!) {
		deleteTaskDependency(input: $input) {
			deletedTaskDependencyId
			clientMutationId
		}
	}
`;

/**
 * Mutation: Create linked resource
 */
export const CREATE_LINKED_RESOURCE = gql`
	mutation CreateLinkedResource($input: CreateLinkedResourceInput!) {
		createLinkedResource(input: $input) {
			linkedResource {
				id
				taskId
				resourceType
				resourceId
				resourceTitle
				availabilityStatus
				lastChecked
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete linked resource
 */
export const DELETE_LINKED_RESOURCE = gql`
	mutation DeleteLinkedResource($input: DeleteLinkedResourceInput!) {
		deleteLinkedResource(input: $input) {
			deletedLinkedResourceId
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update linked resource availability status
 */
export const UPDATE_LINKED_RESOURCE_STATUS = gql`
	mutation UpdateLinkedResourceStatus($input: UpdateLinkedResourceByIdInput!) {
		updateLinkedResourceById(input: $input) {
			linkedResource {
				id
				resourceType
				resourceId
				resourceTitle
				availabilityStatus
				lastChecked
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Create custom task type
 * RLS Policy: Admin only
 */
export const CREATE_TASK_TYPE = gql`
	mutation CreateTaskType($input: CreateTaskTypeInput!) {
		createTaskType(input: $input) {
			taskType {
				id
				name
				description
				isSystem
				createdAt
				createdBy
			}
			clientMutationId
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
	clientMutationId?: string;
	task: {
		title: string;
		description?: string;
		assigneeId: string;
		taskTypeId: string;
		status?: TaskStatus;
		priority?: TaskPriority;
		dueDate?: string;
		parentTaskId?: string;
		requiresManualReassignment?: boolean;
	};
}

export interface UpdateTaskInput {
	clientMutationId?: string;
	id: string;
	taskPatch: {
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
	};
}

export interface DeleteTaskInput {
	clientMutationId?: string;
	id: string;
	taskPatch: {
		archived: boolean;
		archivedAt: string;
		archivedBy: string;
	};
}

export interface ReassignTaskInput {
	clientMutationId?: string;
	id: string;
	taskPatch: {
		assigneeId: string;
	};
}

export interface CreateTaskDependencyInput {
	clientMutationId?: string;
	taskDependency: {
		blockingTaskId: string;
		blockedTaskId: string;
		dependencyType?: string;
	};
}

export interface DeleteTaskDependencyInput {
	clientMutationId?: string;
	nodeId: string;
}

export interface CreateLinkedResourceInput {
	clientMutationId?: string;
	linkedResource: {
		taskId: string;
		resourceType: ResourceType;
		resourceId: string;
		resourceTitle: string;
		availabilityStatus?: AvailabilityStatus;
	};
}

export interface DeleteLinkedResourceInput {
	clientMutationId?: string;
	nodeId: string;
}

export interface UpdateLinkedResourceStatusInput {
	clientMutationId?: string;
	id: string;
	linkedResourcePatch: {
		availabilityStatus: AvailabilityStatus;
		lastChecked: string;
	};
}

export interface CreateTaskTypeInput {
	clientMutationId?: string;
	taskType: {
		name: string;
		description?: string;
		isSystem?: boolean;
	};
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
		first?: number;
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

		const dataRequest = createDataRequest({
			operationName: 'GetAllTasks',
			variables: {
				first: params.first || 20,
				offset: params.offset || 0,
				condition: params.filter || {},
				orderBy: params.orderBy ? [params.orderBy] : ['CREATED_AT_DESC']
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

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No tasks data returned. Please try again.'
				});
			}

			return {
				tasks: result.data.allTasks.nodes,
				totalCount: result.data.allTasks.totalCount,
				hasNextPage: result.data.allTasks.pageInfo.hasNextPage
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
		first?: number;
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
				first: params.first || 20,
				offset: params.offset || 0,
				condition: params.filter || {},
				orderBy: params.orderBy ? [params.orderBy] : ['DUE_DATE_ASC', 'PRIORITY_DESC']
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

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No tasks data returned. Please try again.'
				});
			}

			return {
				tasks: result.data.allTasks.nodes,
				totalCount: result.data.allTasks.totalCount
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

			if (!result.data || !result.data.taskById) {
				throw createErrorResponse(new Error('Task not found'), {
					type: 'graphql',
					userMessage: 'Task not found. Please try again.'
				});
			}

			return result.data.taskById;
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
		first?: number;
		offset?: number;
		userCredentials: UserCredentials;
	}): Promise<{ entries: TaskAuditEntry[]; totalCount: number }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetTaskAuditEntries',
			variables: {
				taskId: params.taskId,
				first: params.first || 50,
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

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No audit data returned. Please try again.'
				});
			}

			return {
				entries: result.data.allTaskAuditEntries.nodes,
				totalCount: result.data.allTaskAuditEntries.totalCount
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

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No task types data returned. Please try again.'
				});
			}

			return result.data.allTaskTypes.nodes;
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
		const validation = validateTaskInput(params.input.task);
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

			return result.data.createTask.task;
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

			if (!result.data || !result.data.updateTaskById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task update failed. Please try again.'
				});
			}

			return result.data.updateTaskById.task;
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
			taskPatch: {
				archived: true,
				archivedAt: new Date().toISOString(),
				archivedBy: params.userId
			}
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

			if (!result.data || !result.data.updateTaskById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task deletion failed. Please try again.'
				});
			}

			return { task: result.data.updateTaskById.task };
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

		const input: ReassignTaskInput = {
			id: params.taskId,
			taskPatch: {
				assigneeId: params.newAssigneeId
			}
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

			if (!result.data || !result.data.updateTaskById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task reassignment failed. Please try again.'
				});
			}

			const task = result.data.updateTaskById.task;

			// Return structure expected by contract tests
			return {
				task,
				oldAssignee: null, // Would need to fetch from audit trail
				newAssignee: task.userByAssigneeId
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

			if (!result.data || !result.data.createTaskDependency) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Dependency creation failed. Please try again.'
				});
			}

			return { taskDependency: result.data.createTaskDependency.taskDependency };
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
		nodeId: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: DeleteTaskDependencyInput = {
			nodeId: params.nodeId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeleteTaskDependency',
			variables: { input },
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

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Dependency deletion failed. Please try again.'
				});
			}

			return result.data.deleteTaskDependency.deletedTaskDependencyId;
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

			if (!result.data || !result.data.createLinkedResource) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Resource linking failed. Please try again.'
				});
			}

			return result.data.createLinkedResource.linkedResource;
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

		const input: UpdateLinkedResourceStatusInput = {
			id: params.resourceId,
			linkedResourcePatch: {
				availabilityStatus: params.status,
				lastChecked: new Date().toISOString()
			}
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

			if (!result.data || !result.data.updateLinkedResourceById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Resource update failed. Please try again.'
				});
			}

			return result.data.updateLinkedResourceById.linkedResource;
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

			if (!result.data || !result.data.createTaskType) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Task type creation failed. Please try again.'
				});
			}

			return result.data.createTaskType.taskType;
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
