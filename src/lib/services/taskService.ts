import { writable, derived, get } from 'svelte/store';
import { client } from '$lib/graphql/client';
import type { Task, TaskStatus, TaskPriority, User, PaginationInput, SortInput } from '$lib/types';
import {
	GET_TASKS_QUERY,
	GET_TASK_DETAILS_QUERY,
	CREATE_TASK_MUTATION,
	UPDATE_TASK_MUTATION,
	COMPLETE_TASK_MUTATION,
	DELETE_TASK_MUTATION,
	GET_DASHBOARD_TASKS_QUERY,
	buildPaginationVariables,
	buildSortVariables,
	buildFilterVariables,
	extractEdges,
	extractPageInfo
} from '$lib/graphql/operations';

/**
 * Task Management Service for MountainHR
 *
 * Provides comprehensive task management including:
 * - Task CRUD operations
 * - Assignment and workflow management
 * - Progress tracking and time logging
 * - Dashboard and analytics
 * - Real-time updates via subscriptions
 */

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface TaskFilter {
	assignedToId?: string;
	createdById?: string;
	status?: TaskStatus[];
	priority?: TaskPriority[];
	departmentId?: string;
	dueDate?: {
		start?: string;
		end?: string;
	};
	isOverdue?: boolean;
	hasParent?: boolean;
	searchQuery?: string;
}

export interface CreateTaskInput {
	title: string;
	description?: string;
	priority: TaskPriority;
	assignedToId?: string;
	parentTaskId?: string;
	dependsOnIds?: string[];
	dueDate?: string;
	estimatedHours?: number;
	tags?: string[];
	attachments?: Array<{
		filename: string;
		url: string;
		fileType: string;
	}>;
}

export interface UpdateTaskInput {
	title?: string;
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	assignedToId?: string;
	dueDate?: string;
	estimatedHours?: number;
	actualHours?: number;
	completionPercentage?: number;
	notes?: string;
}

export interface TaskComment {
	id: string;
	content: string;
	author: User;
	createdAt: string;
	attachments?: Array<{
		id: string;
		filename: string;
		url: string;
	}>;
}

export interface TaskTimeEntry {
	id: string;
	task: Task;
	user: User;
	hoursWorked: number;
	description: string;
	date: string;
	billable: boolean;
	approved: boolean;
}

export interface TaskServiceState {
	tasks: Task[];
	currentTask: Task | null;
	dashboardTasks: {
		upcoming: Task[];
		overdue: Task[];
		inProgress: Task[];
	};
	quickStats: {
		pendingTasks: number;
		completedTasksThisWeek: number;
		overdueTasksCount: number;
		myTasksCount: number;
	};
	totalCount: number;
	isLoading: boolean;
	error: string | null;
	filters: TaskFilter;
	pagination: {
		currentPage: number;
		pageSize: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
	sorting: {
		field: string;
		direction: 'ASC' | 'DESC';
	};
}

// =============================================================================
// Store Implementation
// =============================================================================

const createTaskService = () => {
	const initialState: TaskServiceState = {
		tasks: [],
		currentTask: null,
		dashboardTasks: {
			upcoming: [],
			overdue: [],
			inProgress: []
		},
		quickStats: {
			pendingTasks: 0,
			completedTasksThisWeek: 0,
			overdueTasksCount: 0,
			myTasksCount: 0
		},
		totalCount: 0,
		isLoading: false,
		error: null,
		filters: {},
		pagination: {
			currentPage: 1,
			pageSize: 20,
			hasNextPage: false,
			hasPreviousPage: false
		},
		sorting: {
			field: 'dueDate',
			direction: 'ASC'
		}
	};

	const { subscribe, set, update } = writable(initialState);

	return {
		subscribe,

		// =============================================================================
		// Task Listing and Search
		// =============================================================================

		async loadTasks(options?: {
			filters?: TaskFilter;
			pagination?: { page?: number; pageSize?: number };
			sorting?: { field?: string; direction?: 'ASC' | 'DESC' };
			reset?: boolean;
		}) {
			const { filters = {}, pagination = {}, sorting = {}, reset = false } = options || {};

			update((state) => ({
				...state,
				isLoading: true,
				error: null,
				...(reset && { tasks: [], currentPage: 1 })
			}));

			try {
				const currentState = get({ subscribe });

				const variables = {
					...buildFilterVariables(filters),
					...buildPaginationVariables(
						pagination.page || currentState.pagination.currentPage,
						pagination.pageSize || currentState.pagination.pageSize
					),
					...buildSortVariables(
						sorting.field || currentState.sorting.field,
						sorting.direction || currentState.sorting.direction
					)
				};

				const result = await client.query(GET_TASKS_QUERY, variables).toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load tasks');
				}

				const tasks = extractEdges<Task>(result.data.tasks);
				const pageInfo = extractPageInfo(result.data.tasks);

				update((state) => ({
					...state,
					tasks: reset ? tasks : [...state.tasks, ...tasks],
					totalCount: result.data.tasks.totalCount,
					isLoading: false,
					filters: { ...state.filters, ...filters },
					pagination: {
						...state.pagination,
						currentPage: pagination.page || state.pagination.currentPage,
						pageSize: pagination.pageSize || state.pagination.pageSize,
						hasNextPage: pageInfo.hasNextPage,
						hasPreviousPage: pageInfo.hasPreviousPage
					},
					sorting: {
						field: sorting.field || state.sorting.field,
						direction: sorting.direction || state.sorting.direction
					}
				}));

				return { tasks, totalCount: result.data.tasks.totalCount };
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load tasks';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async loadDashboardTasks() {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client.query(GET_DASHBOARD_TASKS_QUERY, {}).toPromise();

				if (result.error) {
					throw new Error(
						result.error.graphQLErrors[0]?.message || 'Failed to load dashboard tasks'
					);
				}

				const { upcomingTasks, quickStats } = result.data.dashboardData;

				update((state) => ({
					...state,
					dashboardTasks: {
						upcoming: upcomingTasks.filter(
							(task: Task) => !task.isOverdue && task.status !== TaskStatus.COMPLETED
						),
						overdue: upcomingTasks.filter((task: Task) => task.isOverdue),
						inProgress: upcomingTasks.filter((task: Task) => task.status === TaskStatus.IN_PROGRESS)
					},
					quickStats,
					isLoading: false
				}));

				return result.data.dashboardData;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load dashboard tasks';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async searchTasks(query: string) {
			return this.loadTasks({
				filters: { searchQuery: query },
				reset: true
			});
		},

		async filterTasks(filters: TaskFilter) {
			return this.loadTasks({
				filters,
				pagination: { page: 1 },
				reset: true
			});
		},

		async getMyTasks() {
			// This would need the current user ID from auth service
			return this.loadTasks({
				filters: { assignedToId: 'current-user-id' },
				reset: true
			});
		},

		async getOverdueTasks() {
			return this.loadTasks({
				filters: { isOverdue: true },
				reset: true
			});
		},

		// =============================================================================
		// Individual Task Management
		// =============================================================================

		async getTaskDetails(taskId: string): Promise<Task> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client.query(GET_TASK_DETAILS_QUERY, { id: taskId }).toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to load task details');
				}

				const task = result.data.task;

				update((state) => ({
					...state,
					currentTask: task,
					isLoading: false
				}));

				return task;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to load task details';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async createTask(input: CreateTaskInput): Promise<Task> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client.mutation(CREATE_TASK_MUTATION, { input }).toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to create task');
				}

				const newTask = result.data.createTask;

				update((state) => ({
					...state,
					tasks: [newTask, ...state.tasks],
					totalCount: state.totalCount + 1,
					quickStats: {
						...state.quickStats,
						pendingTasks: state.quickStats.pendingTasks + 1,
						myTasksCount: newTask.assignedTo
							? state.quickStats.myTasksCount + 1
							: state.quickStats.myTasksCount
					},
					isLoading: false
				}));

				return newTask;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to create task';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client
					.mutation(UPDATE_TASK_MUTATION, {
						id: taskId,
						input
					})
					.toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to update task');
				}

				const updatedTask = result.data.updateTask;

				update((state) => ({
					...state,
					tasks: state.tasks.map((task) =>
						task.id === taskId ? { ...task, ...updatedTask } : task
					),
					currentTask:
						state.currentTask?.id === taskId
							? { ...state.currentTask, ...updatedTask }
							: state.currentTask,
					isLoading: false
				}));

				return updatedTask;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to update task';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async completeTask(taskId: string): Promise<Task> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client.mutation(COMPLETE_TASK_MUTATION, { id: taskId }).toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to complete task');
				}

				const completedTask = result.data.completeTask;

				update((state) => ({
					...state,
					tasks: state.tasks.map((task) =>
						task.id === taskId ? { ...task, ...completedTask } : task
					),
					currentTask:
						state.currentTask?.id === taskId
							? { ...state.currentTask, ...completedTask }
							: state.currentTask,
					quickStats: {
						...state.quickStats,
						pendingTasks: Math.max(0, state.quickStats.pendingTasks - 1),
						completedTasksThisWeek: state.quickStats.completedTasksThisWeek + 1
					},
					isLoading: false
				}));

				return completedTask;
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to complete task';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async deleteTask(taskId: string): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const result = await client.mutation(DELETE_TASK_MUTATION, { id: taskId }).toPromise();

				if (result.error) {
					throw new Error(result.error.graphQLErrors[0]?.message || 'Failed to delete task');
				}

				update((state) => ({
					...state,
					tasks: state.tasks.filter((task) => task.id !== taskId),
					currentTask: state.currentTask?.id === taskId ? null : state.currentTask,
					totalCount: Math.max(0, state.totalCount - 1),
					isLoading: false
				}));
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to delete task';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		// =============================================================================
		// Task Status Management
		// =============================================================================

		async startTask(taskId: string, notes?: string): Promise<Task> {
			return this.updateTask(taskId, {
				status: TaskStatus.IN_PROGRESS,
				notes
			});
		},

		async pauseTask(taskId: string, notes?: string): Promise<Task> {
			return this.updateTask(taskId, {
				status: TaskStatus.ON_HOLD,
				notes
			});
		},

		async assignTask(taskId: string, assigneeId: string): Promise<Task> {
			return this.updateTask(taskId, {
				assignedToId: assigneeId
			});
		},

		async updateProgress(taskId: string, percentage: number, notes?: string): Promise<Task> {
			return this.updateTask(taskId, {
				completionPercentage: Math.max(0, Math.min(100, percentage)),
				notes
			});
		},

		async logTime(taskId: string, hours: number, description: string): Promise<void> {
			// This would call a time logging mutation
			// For now, we'll update the actual hours
			const currentTask = get({ subscribe }).currentTask;
			const currentHours = currentTask?.actualHours || 0;

			await this.updateTask(taskId, {
				actualHours: currentHours + hours
			});
		},

		// =============================================================================
		// Bulk Operations
		// =============================================================================

		async bulkUpdateTasks(taskIds: string[], updates: UpdateTaskInput): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const updatePromises = taskIds.map((taskId) => this.updateTask(taskId, updates));

				await Promise.all(updatePromises);

				update((state) => ({ ...state, isLoading: false }));
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to bulk update tasks';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		async bulkAssignTasks(taskIds: string[], assigneeId: string): Promise<void> {
			return this.bulkUpdateTasks(taskIds, { assignedToId: assigneeId });
		},

		async bulkDeleteTasks(taskIds: string[]): Promise<void> {
			update((state) => ({ ...state, isLoading: true, error: null }));

			try {
				const deletePromises = taskIds.map((taskId) => this.deleteTask(taskId));

				await Promise.all(deletePromises);

				update((state) => ({ ...state, isLoading: false }));
			} catch (error: any) {
				const errorMessage = error.message || 'Failed to bulk delete tasks';
				update((state) => ({
					...state,
					isLoading: false,
					error: errorMessage
				}));
				throw new Error(errorMessage);
			}
		},

		// =============================================================================
		// Analytics and Reporting
		// =============================================================================

		getTasksByStatus(): { [key in TaskStatus]: number } {
			const currentState = get({ subscribe });
			const statusCounts = Object.values(TaskStatus).reduce(
				(acc, status) => {
					acc[status] = 0;
					return acc;
				},
				{} as { [key in TaskStatus]: number }
			);

			currentState.tasks.forEach((task) => {
				statusCounts[task.status]++;
			});

			return statusCounts;
		},

		getTasksByPriority(): { [key in TaskPriority]: number } {
			const currentState = get({ subscribe });
			const priorityCounts = Object.values(TaskPriority).reduce(
				(acc, priority) => {
					acc[priority] = 0;
					return acc;
				},
				{} as { [key in TaskPriority]: number }
			);

			currentState.tasks.forEach((task) => {
				priorityCounts[task.priority]++;
			});

			return priorityCounts;
		},

		getCompletionRate(): number {
			const currentState = get({ subscribe });
			if (currentState.tasks.length === 0) return 0;

			const completedTasks = currentState.tasks.filter(
				(task) => task.status === TaskStatus.COMPLETED
			).length;

			return (completedTasks / currentState.tasks.length) * 100;
		},

		getAverageCompletionTime(): number {
			const currentState = get({ subscribe });
			const completedTasks = currentState.tasks.filter(
				(task) => task.status === TaskStatus.COMPLETED && task.completionDate && task.createdAt
			);

			if (completedTasks.length === 0) return 0;

			const totalTime = completedTasks.reduce((sum, task) => {
				const created = new Date(task.createdAt).getTime();
				const completed = new Date(task.completionDate!).getTime();
				return sum + (completed - created);
			}, 0);

			return totalTime / completedTasks.length / (1000 * 60 * 60 * 24); // Days
		},

		// =============================================================================
		// State Management
		// =============================================================================

		clearCurrentTask() {
			update((state) => ({ ...state, currentTask: null }));
		},

		clearError() {
			update((state) => ({ ...state, error: null }));
		},

		resetFilters() {
			update((state) => ({
				...state,
				filters: {},
				pagination: { ...initialState.pagination },
				sorting: { ...initialState.sorting }
			}));
		},

		// =============================================================================
		// Utility Methods
		// =============================================================================

		getTaskById(taskId: string): Task | undefined {
			const currentState = get({ subscribe });
			return currentState.tasks.find((task) => task.id === taskId);
		},

		getTasksByAssignee(assigneeId: string): Task[] {
			const currentState = get({ subscribe });
			return currentState.tasks.filter((task) => task.assignedTo?.id === assigneeId);
		},

		getSubtasks(parentTaskId: string): Task[] {
			const currentState = get({ subscribe });
			return currentState.tasks.filter((task) => task.parentTask?.id === parentTaskId);
		},

		getDependentTasks(taskId: string): Task[] {
			const currentState = get({ subscribe });
			return currentState.tasks.filter((task) =>
				task.dependencies.some((dep) => dep.id === taskId)
			);
		}
	};
};

// =============================================================================
// Create Service Instance
// =============================================================================

export const taskService = createTaskService();

// =============================================================================
// Derived Stores
// =============================================================================

export const tasks = derived(taskService, ($taskService) => $taskService.tasks);

export const currentTask = derived(taskService, ($taskService) => $taskService.currentTask);

export const dashboardTasks = derived(taskService, ($taskService) => $taskService.dashboardTasks);

export const taskStats = derived(taskService, ($taskService) => $taskService.quickStats);

export const isLoadingTasks = derived(taskService, ($taskService) => $taskService.isLoading);

export const taskError = derived(taskService, ($taskService) => $taskService.error);

export const pendingTasks = derived(tasks, ($tasks) =>
	$tasks.filter((task) => task.status === TaskStatus.PENDING)
);

export const inProgressTasks = derived(tasks, ($tasks) =>
	$tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS)
);

export const completedTasks = derived(tasks, ($tasks) =>
	$tasks.filter((task) => task.status === TaskStatus.COMPLETED)
);

export const overdueTasks = derived(tasks, ($tasks) => $tasks.filter((task) => task.isOverdue));

export const highPriorityTasks = derived(tasks, ($tasks) =>
	$tasks.filter(
		(task) => task.priority === TaskPriority.HIGH || task.priority === TaskPriority.URGENT
	)
);

export const myTasks = derived(tasks, ($tasks) =>
	// This would filter by current user ID from auth service
	$tasks.filter((task) => task.assignedTo?.id === 'current-user-id')
);

export const assignedTasks = derived(tasks, ($tasks) =>
	$tasks.filter((task) => task.assignedTo?.id === 'current-user-id')
);

// Derived store for tasks completed this week
export const tasksCompletedThisWeek = derived(tasks, ($tasks) => {
	const oneWeekAgo = new Date();
	oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

	return $tasks.filter(
		(task) =>
			task.status === TaskStatus.COMPLETED &&
			task.completionDate &&
			new Date(task.completionDate) >= oneWeekAgo
	);
});

// =============================================================================
// Utility Functions for Dashboard
// =============================================================================

/**
 * Get overdue tasks - wrapper around the existing service method and derived store
 */
export function getOverdueTasks() {
	return overdueTasks;
}

/**
 * Get tasks completed this week - returns the derived store
 */
export function getTasksCompletedThisWeek() {
	return tasksCompletedThisWeek;
}

// =============================================================================
// Export Service as Default
// =============================================================================

export default taskService;
