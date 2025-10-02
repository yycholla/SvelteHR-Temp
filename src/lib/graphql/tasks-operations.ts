// GraphQL Operations: Tasks Management (Manager Department-Scoped)
// Feature: 016-repair-management-pages - Task T017
// Purpose: Manager CRUD operations for task assignment with department-scoped RLS

import { gql } from '@urql/svelte';
import type { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get tasks for manager's department only
 * RLS Policy: manager_view_department_tasks
 * Covers: FR-005, FR-038
 */
export const GET_DEPARTMENT_TASKS = gql`
	query GetDepartmentTasks(
		$first: Int = 20
		$offset: Int = 0
		$condition: TaskCondition
	) {
		allTasks(first: $first, offset: $offset, condition: $condition, orderBy: DUE_DATE_ASC) {
			nodes {
				id
				assigneeId
				userByAssigneeId {
					id
					displayName
					email
				}
				assignerId
				userByAssignerId {
					id
					displayName
					email
				}
				departmentId
				departmentByDepartmentId {
					id
					name
				}
				assignedToDepartmentId
				departmentByAssignedToDepartmentId {
					id
					name
				}
				title
				description
				priority
				status
				dueDate
				category
				createdAt
				updatedAt
				completedAt
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
 * Query: Get single task by ID (department-scoped)
 * RLS Policy: manager_view_department_tasks
 */
export const GET_TASK_BY_ID = gql`
	query GetTaskById($id: UUID!) {
		taskById(id: $id) {
			id
			assigneeId
			userByAssigneeId {
				id
				displayName
				email
			}
			assignerId
			userByAssignerId {
				id
				displayName
				email
			}
			departmentId
			departmentByDepartmentId {
				id
				name
			}
			assignedToDepartmentId
			departmentByAssignedToDepartmentId {
				id
				name
			}
			title
			description
			priority
			status
			dueDate
			category
			createdAt
			updatedAt
			completedAt
		}
	}
`;

/**
 * Query: Get task statistics for manager's department
 * Covers: FR-038
 */
export const GET_TASK_STATISTICS = gql`
	query GetTaskStatistics($departmentId: UUID!) {
		totalTasks: tasks(filter: { departmentId: { equalTo: $departmentId } }) {
			totalCount
		}
		todoTasks: tasks(
			filter: { status: { equalTo: "todo" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		inProgressTasks: tasks(
			filter: { status: { equalTo: "in_progress" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		completedTasks: tasks(
			filter: { status: { equalTo: "completed" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		overdueTasks: tasks(
			filter: {
				status: { in: ["todo", "in_progress"] }
				dueDate: { lessThan: "now()" }
				departmentId: { equalTo: $departmentId }
			}
		) {
			totalCount
		}
		highPriorityTasks: tasks(
			filter: { priority: { equalTo: "high" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
		urgentTasks: tasks(
			filter: { priority: { equalTo: "urgent" }, departmentId: { equalTo: $departmentId } }
		) {
			totalCount
		}
	}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create task
 * RLS Policy: manager_create_department_tasks
 * Covers: FR-005, FR-038
 * Note: Cannot assign task to self (CHECK constraint)
 */
export const CREATE_TASK = gql`
	mutation CreateTask($input: CreateTaskInput!) {
		createTask(input: $input) {
			task {
				id
				assigneeId
				userByAssigneeId {
					id
					displayName
					email
				}
				assignerId
				userByAssignerId {
					id
					displayName
					email
				}
				departmentId
				departmentByDepartmentId {
					id
					name
				}
				assignedToDepartmentId
				departmentByAssignedToDepartmentId {
					id
					name
				}
				title
				description
				priority
				status
				dueDate
				category
				createdAt
			}
		}
	}
`;

/**
 * Mutation: Update task
 * RLS Policy: manager_update_department_tasks
 * Covers: FR-005, FR-038
 * Note: Auto-timestamps completedAt when status changes to 'completed'
 */
export const UPDATE_TASK = gql`
	mutation UpdateTask($input: UpdateTaskInput!) {
		updateTask(input: $input) {
			task {
				id
				assigneeId
				userByAssigneeId {
					id
					displayName
					email
				}
				assignerId
				userByAssignerId {
					id
					displayName
					email
				}
				departmentId
				departmentByDepartmentId {
					id
					name
				}
				assignedToDepartmentId
				departmentByAssignedToDepartmentId {
					id
					name
				}
				title
				description
				priority
				status
				dueDate
				category
				updatedAt
				completedAt
			}
		}
	}
`;

/**
 * Mutation: Delete task
 * RLS Policy: manager_delete_department_tasks
 * Covers: FR-005
 */
export const DELETE_TASK = gql`
	mutation DeleteTask($input: DeleteTaskInput!) {
		deleteTask(input: $input) {
			deletedTaskId
			clientMutationId
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

export interface TaskFilter {
	status?: {
		equalTo?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
		in?: Array<'todo' | 'in_progress' | 'completed' | 'cancelled'>;
	};
	priority?: {
		equalTo?: 'low' | 'medium' | 'high' | 'urgent';
		in?: Array<'low' | 'medium' | 'high' | 'urgent'>;
	};
	assigneeId?: {
		equalTo?: string;
	};
	assignerId?: {
		equalTo?: string;
	};
	departmentId?: {
		equalTo?: string;
	};
	assignedToDepartmentId?: {
		equalTo?: string;
		isNull?: boolean;
	};
	dueDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
		lessThan?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
}

export interface CreateTaskInput {
	clientMutationId?: string;
	task: {
		assigneeId?: string; // Either assigneeId OR assignedToDepartmentId (mutually exclusive)
		assignedToDepartmentId?: string; // Either assigneeId OR assignedToDepartmentId (mutually exclusive)
		assignerId: string;
		departmentId: string;
		title: string;
		description?: string;
		priority?: 'low' | 'medium' | 'high' | 'urgent';
		status?: 'todo' | 'in_progress';
		dueDate?: string;
	};
}

export interface UpdateTaskInput {
	clientMutationId?: string;
	id: string;
	patch: {
		title?: string;
		description?: string;
		priority?: 'low' | 'medium' | 'high' | 'urgent';
		status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
		dueDate?: string;
		assigneeId?: string;
	};
}

export interface DeleteTaskInput {
	clientMutationId?: string;
	id: string;
}

export interface Task {
	id: string;
	assigneeId?: string; // Optional - mutually exclusive with assignedToDepartmentId
	assignee?: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
	};
	assignerId: string;
	assigner: {
		id: string;
		displayName: string;
		email: string;
	};
	departmentId: string;
	department: {
		id: string;
		name: string;
	};
	assignedToDepartmentId?: string; // Optional - mutually exclusive with assigneeId
	assignedToDepartment?: {
		id: string;
		name: string;
	};
	title: string;
	description?: string;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
	dueDate?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}

export interface TaskStatistics {
	totalTasks: number;
	todoTasks: number;
	inProgressTasks: number;
	completedTasks: number;
	overdueTasks: number;
	highPriorityTasks: number;
	urgentTasks: number;
	completionRate: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build task filter safely
 */
export function buildTaskFilter({
	status,
	priority,
	assigneeId,
	assignerId,
	departmentId,
	searchTerm,
	includeOverdue
}: {
	status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
	priority?: 'low' | 'medium' | 'high' | 'urgent';
	assigneeId?: string;
	assignerId?: string;
	departmentId?: string;
	searchTerm?: string;
	includeOverdue?: boolean;
}): TaskFilter {
	const filter: TaskFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (priority) {
		filter.priority = { equalTo: priority };
	}

	if (assigneeId) {
		filter.assigneeId = { equalTo: assigneeId };
	}

	if (assignerId) {
		filter.assignerId = { equalTo: assignerId };
	}

	if (departmentId) {
		filter.departmentId = { equalTo: departmentId };
	}

	if (searchTerm) {
		filter.title = { includesInsensitive: searchTerm };
	}

	if (includeOverdue) {
		filter.dueDate = { lessThan: new Date().toISOString() };
		filter.status = { in: ['todo', 'in_progress'] };
	}

	return filter;
}

/**
 * Helper: Calculate task statistics from raw data
 */
export function calculateTaskStatistics(data: {
	totalTasks: { totalCount: number };
	todoTasks: { totalCount: number };
	inProgressTasks: { totalCount: number };
	completedTasks: { totalCount: number };
	overdueTasks: { totalCount: number };
	highPriorityTasks: { totalCount: number };
	urgentTasks: { totalCount: number };
}): TaskStatistics {
	const totalCount = data.totalTasks.totalCount;
	const completedCount = data.completedTasks.totalCount;
	const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	return {
		totalTasks: totalCount,
		todoTasks: data.todoTasks.totalCount,
		inProgressTasks: data.inProgressTasks.totalCount,
		completedTasks: completedCount,
		overdueTasks: data.overdueTasks.totalCount,
		highPriorityTasks: data.highPriorityTasks.totalCount,
		urgentTasks: data.urgentTasks.totalCount,
		completionRate
	};
}

/**
 * Helper: Validate task input (no self-assignment, mutually exclusive assignment)
 */
export function validateTaskInput(input: {
	assigneeId?: string;
	assignedToDepartmentId?: string;
	assignerId: string;
	title: string;
	description?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Must have either assigneeId OR assignedToDepartmentId (mutually exclusive)
	if (!input.assigneeId && !input.assignedToDepartmentId) {
		errors.push('Task must be assigned to either an employee or a department');
	}

	if (input.assigneeId && input.assignedToDepartmentId) {
		errors.push('Task cannot be assigned to both an employee and a department');
	}

	// No self-assignment for employee tasks
	if (input.assigneeId && input.assigneeId === input.assignerId) {
		errors.push('Cannot assign task to yourself');
	}

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 255) {
		errors.push('Title must be less than 255 characters');
	}

	if (input.description && input.description.length > 2000) {
		errors.push('Description must be less than 2000 characters');
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
	if (!task.dueDate) return false;
	if (task.status === 'completed' || task.status === 'cancelled') return false;
	return new Date(task.dueDate) < new Date();
}

/**
 * Helper: Get priority badge color
 */
export function getTaskPriorityBadgeColor(priority: string): string {
	const priorityColors: Record<string, string> = {
		low: 'gray',
		medium: 'blue',
		high: 'orange',
		urgent: 'red'
	};
	return priorityColors[priority.toLowerCase()] || 'gray';
}

/**
 * Helper: Get status badge color
 */
export function getTaskStatusBadgeColor(status: string): string {
	const statusColors: Record<string, string> = {
		todo: 'gray',
		in_progress: 'blue',
		completed: 'green',
		cancelled: 'red'
	};
	return statusColors[status.toLowerCase()] || 'gray';
}

/**
 * Helper: Format due date relative to today
 */
export function formatDueDateRelative(dueDate: string): string {
	const due = new Date(dueDate);
	const now = new Date();
	const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
	} else if (diffDays === 0) {
		return 'Due today';
	} else if (diffDays === 1) {
		return 'Due tomorrow';
	} else if (diffDays <= 7) {
		return `Due in ${diffDays} days`;
	} else {
		return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
}

/**
 * Helper: Get task assignee display (employee name or department name)
 */
export function getTaskAssigneeDisplay(task: Task): string {
	if (task.assigneeId && task.assignee) {
		return task.assignee.displayName;
	} else if (task.assignedToDepartmentId && task.assignedToDepartment) {
		return `Department: ${task.assignedToDepartment.name}`;
	} else {
		return 'Unassigned';
	}
}

/**
 * Helper: Check if task is assigned to department
 */
export function isTaskDepartmentAssigned(task: Task): boolean {
	return !!task.assignedToDepartmentId;
}

/**
 * Helper: Filter tasks by department assignment
 */
export function filterTasksByDepartment(
	tasks: Task[],
	departmentId: string | null
): Task[] {
	if (!departmentId) {
		return tasks.filter((task) => !task.assignedToDepartmentId);
	}
	return tasks.filter((task) => task.assignedToDepartmentId === departmentId);
}

// ============================================================================
// OPERATIONS CLASS (Standardized Error Handling)
// ============================================================================

/**
 * T017: Manager Tasks Operations with Department-Scoped RLS
 * This class follows TDD principles - tests are written first in
 * tests/contract/manager-tasks-operations.test.ts
 */
export class TasksOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get tasks for manager's department
	 * RLS automatically filters to department only via JWT claims
	 */
	async getDepartmentTasks(params: {
		first?: number;
		offset?: number;
		filter?: any;
		userCredentials: UserCredentials;
	}): Promise<{
		tasks: Task[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetDepartmentTasks',
			variables: {
				first: params.first || 20,
				offset: params.offset || 0,
				condition: params.filter || {}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_DEPARTMENT_TASKS, dataRequest.variables).toPromise();

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
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load department tasks. Please try again.'
			});
		}
	}

	/**
	 * Get task statistics for manager's department
	 */
	async getTaskStatistics(params: {
		departmentId: string;
		userCredentials: UserCredentials;
	}): Promise<TaskStatistics> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetTaskStatistics',
			variables: { departmentId: params.departmentId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_TASK_STATISTICS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load statistics. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No statistics data returned. Please try again.'
				});
			}

			const stats = calculateTaskStatistics(result.data);
			return stats;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load task statistics. Please try again.'
			});
		}
	}

	/**
	 * Create task (manager department-scoped)
	 * RLS policy enforces department membership
	 * Cannot assign task to self (CHECK constraint)
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
			// Server-side query using toPromise()
			const result = await this.client.query(CREATE_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to create task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No task data returned. Please try again.'
				});
			}

			return result.data.createTask.task;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to create task. Please try again.'
			});
		}
	}

	/**
	 * Update task (manager department-scoped)
	 * RLS policy enforces department membership
	 * Auto-timestamps completedAt when status changes to 'completed'
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
			// Server-side query using toPromise()
			const result = await this.client.query(UPDATE_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No task data returned. Please try again.'
				});
			}

			return result.data.updateTask.task;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update task. Please try again.'
			});
		}
	}

	/**
	 * Delete task (manager department-scoped)
	 * RLS policy enforces department membership
	 */
	async deleteTask(params: {
		taskId: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: DeleteTaskInput = {
			id: params.taskId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeleteTask',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(DELETE_TASK, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to delete task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			return result.data.deleteTask.deletedTaskId;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to delete task. Please try again.'
			});
		}
	}

	/**
	 * Get single task by ID (department-scoped)
	 * RLS automatically filters to department only via JWT claims
	 */
	async getTaskById(params: {
		taskId: string;
		userCredentials: UserCredentials;
	}): Promise<Task | null> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetTaskById',
			variables: { id: params.taskId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side query using toPromise()
			const result = await this.client.query(GET_TASK_BY_ID, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load task. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.taskById) {
				return null;
			}

			return result.data.taskById;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load task. Please try again.'
			});
		}
	}

	// Legacy method for backwards compatibility
	async getTasks(params: any) {
		return this.getDepartmentTasks({
			first: params.first,
			offset: params.offset,
			filter: params.filter,
			userCredentials: params.userCredentials
		});
	}
}

/**
 * Factory function to create TasksOperations instance
 */
export function createTasksOperations(client: Client): TasksOperations {
	return new TasksOperations(client);
}
