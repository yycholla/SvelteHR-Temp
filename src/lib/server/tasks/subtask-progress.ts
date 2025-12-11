import { logger } from '$lib/utils/logger';
/**
 * Subtask Progress Calculation Service
 * Feature: 028-task-system-expansion - T025
 *
 * Provides comprehensive subtask progress tracking and calculation
 * for task hierarchies. Supports recursive progress calculation up to 3 levels
 * and provides progress summaries for parent tasks.
 */

import type { Task, TaskStatus } from '$lib/types/task';
import type { ApiResponse } from '$lib/types/index';
import { getGraphQLEndpoint } from '$lib/server/api-url';

/**
 * Task progress information
 */
export interface TaskProgress {
	taskId: string;
	taskTitle: string;
	totalSubtasks: number;
	completedSubtasks: number;
	inProgressSubtasks: number;
	notStartedSubtasks: number;
	blockedSubtasks: number;
	completionPercentage: number;
	hasSubtasks: boolean;
	level: number;
}

interface TaskWithSubtasks {
	id: string;
	title: string;
	status: TaskStatus;
	tasksByParentTaskId?: {
		nodes: Array<{
			id: string;
			title: string;
			status: TaskStatus;
			tasksByParentTaskId?: {
				nodes: Array<{
					id: string;
					title: string;
					status: TaskStatus;
					tasksByParentTaskId?: {
						nodes: Array<{
							id: string;
							status: TaskStatus;
						}>;
						totalCount: number;
					};
				}>;
				totalCount: number;
			};
		}>;
		totalCount: number;
	};
}

interface UserTaskStatisticsResponse {
	allTasks: {
		nodes: Array<{
			id: string;
			status: TaskStatus;
		}>;
		totalCount: number;
	};
}

interface DepartmentUsersResponse {
	allUsers: {
		nodes: Array<{
			id: string;
		}>;
	};
}

interface TopLevelTasksResponse {
	allTasks: {
		nodes: TaskWithSubtasks[];
		totalCount: number;
	};
}

/**
 * Hierarchical progress summary
 */
export interface HierarchicalProgressSummary {
	parentTask: TaskProgress;
	childProgress: TaskProgress[];
	overallCompletionPercentage: number;
	totalDescendants: number;
	completedDescendants: number;
}

/**
 * Progress statistics for a task
 */
export interface ProgressStatistics {
	total: number;
	completed: number;
	inProgress: number;
	notStarted: number;
	blocked: number;
	cancelled: number;
	completionRate: number;
	estimatedTimeRemaining?: number;
}

/**
 * Calculate basic subtask completion progress
 */
export function calculateSubtaskProgress(subtasks: Task[]): number {
	if (subtasks.length === 0) return 0;

	const completedCount = subtasks.filter((t) => t.status === 'DONE').length;
	return Math.round((completedCount / subtasks.length) * 10000) / 100; // Round to 2 decimal places
}

/**
 * Get detailed progress for a task including all subtasks
 */
export async function getTaskProgress(taskId: string): Promise<TaskProgress | null> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTaskWithSubtasks($taskId: UUID!) {
						taskById(id: $taskId) {
							id
							title
							status
							tasksByParentTaskId {
								nodes {
									id
									status
								}
								totalCount
							}
						}
					}
				`,
				variables: { taskId }
			})
		});

		if (!response.ok) {
			logger.error('[Subtask Progress] Failed to fetch task');
			return null;
		}

		const data = (await response.json()) as ApiResponse<{ taskById: TaskWithSubtasks }>;
		const task = data?.data?.taskById;

		if (!task) {
			return null;
		}

		const subtasks = task.tasksByParentTaskId?.nodes || [];
		const totalSubtasks = task.tasksByParentTaskId?.totalCount || 0;

		// Count subtasks by status
		const completedSubtasks = subtasks.filter((t) => t.status === 'DONE').length;
		const inProgressSubtasks = subtasks.filter((t) => t.status === 'IN_PROGRESS').length;
		const notStartedSubtasks = subtasks.filter((t) => t.status === 'TODO').length;
		const blockedSubtasks = subtasks.filter((t) => t.status === 'BLOCKED').length;

		const completionPercentage =
			totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 10000) / 100 : 0;

		return {
			taskId: task.id,
			taskTitle: task.title,
			totalSubtasks,
			completedSubtasks,
			inProgressSubtasks,
			notStartedSubtasks,
			blockedSubtasks,
			completionPercentage,
			hasSubtasks: totalSubtasks > 0,
			level: 0
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return null;
	}
}

/**
 * Get hierarchical progress summary including nested subtasks
 */
export async function getHierarchicalProgress(
	taskId: string
): Promise<HierarchicalProgressSummary | null> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetHierarchicalProgress($taskId: UUID!) {
						taskById(id: $taskId) {
							id
							title
							status
							tasksByParentTaskId {
								nodes {
									id
									title
									status
									tasksByParentTaskId {
										nodes {
											id
											title
											status
											tasksByParentTaskId {
												nodes {
													id
													status
												}
												totalCount
											}
										}
										totalCount
									}
								}
								totalCount
							}
						}
					}
				`,
				variables: { taskId }
			})
		});

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as ApiResponse<{ taskById: TaskWithSubtasks }>;
		const task = data?.data?.taskById;

		if (!task) {
			return null;
		}

		// Calculate parent progress
		const parentProgress = await getTaskProgress(taskId);
		if (!parentProgress) {
			return null;
		}

		// Calculate progress for each child
		const childProgress: TaskProgress[] = [];
		const level1Subtasks = task.tasksByParentTaskId?.nodes || [];

		for (const subtask of level1Subtasks) {
			const level2Subtasks = subtask.tasksByParentTaskId?.nodes || [];
			const totalLevel2 = subtask.tasksByParentTaskId?.totalCount || 0;

			const completedLevel2 = level2Subtasks.filter((t) => t.status === 'DONE').length;
			const inProgressLevel2 = level2Subtasks.filter((t) => t.status === 'IN_PROGRESS').length;
			const notStartedLevel2 = level2Subtasks.filter((t) => t.status === 'TODO').length;
			const blockedLevel2 = level2Subtasks.filter((t) => t.status === 'BLOCKED').length;

			const completionPercentage =
				totalLevel2 > 0 ? Math.round((completedLevel2 / totalLevel2) * 10000) / 100 : 0;

			childProgress.push({
				taskId: subtask.id,
				taskTitle: subtask.title,
				totalSubtasks: totalLevel2,
				completedSubtasks: completedLevel2,
				inProgressSubtasks: inProgressLevel2,
				notStartedSubtasks: notStartedLevel2,
				blockedSubtasks: blockedLevel2,
				completionPercentage,
				hasSubtasks: totalLevel2 > 0,
				level: 1
			});
		}

		// Calculate overall completion across entire hierarchy
		const totalDescendants = countAllDescendants(task);
		const completedDescendants = countCompletedDescendants(task);
		const overallCompletionPercentage =
			totalDescendants > 0
				? Math.round((completedDescendants / totalDescendants) * 10000) / 100
				: 0;

		return {
			parentTask: parentProgress,
			childProgress,
			overallCompletionPercentage,
			totalDescendants,
			completedDescendants
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return null;
	}
}

/**
 * Count all descendants (subtasks at all levels)
 */
function countAllDescendants(task: TaskWithSubtasks): number {
	let count = 0;

	const level1 = task.tasksByParentTaskId?.nodes || [];
	count += level1.length;

	for (const level1Task of level1) {
		const level2 = level1Task.tasksByParentTaskId?.nodes || [];
		count += level2.length;

		for (const level2Task of level2) {
			const level3Count = level2Task.tasksByParentTaskId?.totalCount || 0;
			count += level3Count;
		}
	}

	return count;
}

/**
 * Count completed descendants at all levels
 */
function countCompletedDescendants(task: TaskWithSubtasks): number {
	let count = 0;

	const level1 = task.tasksByParentTaskId?.nodes || [];
	count += level1.filter((t) => t.status === 'DONE').length;

	for (const level1Task of level1) {
		const level2 = level1Task.tasksByParentTaskId?.nodes || [];
		count += level2.filter((t) => t.status === 'DONE').length;

		for (const level2Task of level2) {
			const level3 = level2Task.tasksByParentTaskId?.nodes || [];
			count += level3.filter((t) => t.status === 'DONE').length;
		}
	}

	return count;
}

/**
 * Get progress statistics for a user's tasks
 */
export async function getUserTaskStatistics(userId: string): Promise<ProgressStatistics | null> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetUserTaskStatistics($userId: UUID!) {
						allTasks(
							condition: { assigneeId: $userId, archived: false }
						) {
							nodes {
								id
								status
							}
							totalCount
						}
					}
				`,
				variables: { userId }
			})
		});

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as ApiResponse<UserTaskStatisticsResponse>;
		const tasks = data?.data?.allTasks?.nodes || [];
		const total = tasks.length;
		const completed = tasks.filter((t) => t.status === 'DONE').length;
		const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
		const notStarted = tasks.filter((t) => t.status === 'TODO').length;
		const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
		const cancelled = tasks.filter((t) => t.status === 'CANCELLED').length;
		const completionRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

		return {
			total,
			completed,
			inProgress,
			notStarted,
			blocked,
			cancelled,
			completionRate
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return null;
	}
}

/**
 * Get progress statistics for a department
 */
export async function getDepartmentTaskStatistics(
	departmentId: string
): Promise<ProgressStatistics | null> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		// First get all users in the department
		const deptResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetDepartmentUsers($departmentId: UUID!) {
						allUsers(condition: { departmentId: $departmentId }) {
							nodes {
								id
							}
						}
					}
				`,
				variables: { departmentId }
			})
		});

		if (!deptResponse.ok) {
			return null;
		}

		const deptData = (await deptResponse.json()) as ApiResponse<DepartmentUsersResponse>;
		const users = deptData?.data?.allUsers?.nodes || [];
		const userIds = users.map((u) => u.id);

		if (userIds.length === 0) {
			return {
				total: 0,
				completed: 0,
				inProgress: 0,
				notStarted: 0,
				blocked: 0,
				cancelled: 0,
				completionRate: 0
			};
		}

		// Get all tasks for these users
		const tasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetDepartmentTasks($userIds: [UUID!]!) {
						allTasks(
							filter: {
								assigneeId: { in: $userIds }
								archived: { equalTo: false }
							}
						) {
							nodes {
								id
								status
							}
							totalCount
						}
					}
				`,
				variables: { userIds }
			})
		});

		if (!tasksResponse.ok) {
			return null;
		}

		const tasksData = (await tasksResponse.json()) as ApiResponse<UserTaskStatisticsResponse>;
		const tasks = tasksData?.data?.allTasks?.nodes || [];
		const total = tasks.length;
		const completed = tasks.filter((t) => t.status === 'DONE').length;
		const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
		const notStarted = tasks.filter((t) => t.status === 'TODO').length;
		const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
		const cancelled = tasks.filter((t) => t.status === 'CANCELLED').length;

		const completionRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

		return {
			total,
			completed,
			inProgress,
			notStarted,
			blocked,
			cancelled,
			completionRate
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return null;
	}
}

/**
 * Get progress summary for all top-level tasks (no parent)
 */
export async function getTopLevelTasksProgress(): Promise<{
	tasks: TaskProgress[];
	overallProgress: ProgressStatistics;
}> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTopLevelTasks {
						allTasks(
							condition: { archived: false }
							filter: { parentTaskId: { isNull: true } }
							orderBy: CREATED_AT_DESC
						) {
							nodes {
								id
								title
								status
								tasksByParentTaskId {
									nodes {
										id
										status
									}
									totalCount
								}
							}
							totalCount
						}
					}
				`
			})
		});

		if (!response.ok) {
			return { tasks: [], overallProgress: getEmptyProgressStats() };
		}

		const data = (await response.json()) as ApiResponse<TopLevelTasksResponse>;
		const tasks = data?.data?.allTasks?.nodes || [];
		const totalTasks = data?.data?.allTasks?.totalCount || 0;

		const taskProgressList: TaskProgress[] = tasks.map((task) => {
			const subtasks = task.tasksByParentTaskId?.nodes || [];
			const totalSubtasks = task.tasksByParentTaskId?.totalCount || 0;

			const completedSubtasks = subtasks.filter((t) => t.status === 'DONE').length;
			const inProgressSubtasks = subtasks.filter((t) => t.status === 'IN_PROGRESS').length;
			const notStartedSubtasks = subtasks.filter((t) => t.status === 'TODO').length;
			const blockedSubtasks = subtasks.filter((t) => t.status === 'BLOCKED').length;

			const completionPercentage =
				totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 10000) / 100 : 0;

			return {
				taskId: task.id,
				taskTitle: task.title,
				totalSubtasks,
				completedSubtasks,
				inProgressSubtasks,
				notStartedSubtasks,
				blockedSubtasks,
				completionPercentage,
				hasSubtasks: totalSubtasks > 0,
				level: 0
			};
		});

		// Calculate overall progress
		const completed = tasks.filter((t) => t.status === 'DONE').length;
		const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
		const notStarted = tasks.filter((t) => t.status === 'TODO').length;
		const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
		const cancelled = tasks.filter((t) => t.status === 'CANCELLED').length;

		const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 10000) / 100 : 0;

		const overallProgress: ProgressStatistics = {
			total: totalTasks,
			completed,
			inProgress,
			notStarted,
			blocked,
			cancelled,
			completionRate
		};

		return {
			tasks: taskProgressList,
			overallProgress
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return { tasks: [], overallProgress: getEmptyProgressStats() };
	}
}

/**
 * Helper: Get empty progress statistics
 */
function getEmptyProgressStats(): ProgressStatistics {
	return {
		total: 0,
		completed: 0,
		inProgress: 0,
		notStarted: 0,
		blocked: 0,
		cancelled: 0,
		completionRate: 0
	};
}

/**
 * Format progress percentage as string
 */
export function formatProgressPercentage(percentage: number): string {
	return `${percentage.toFixed(1)}%`;
}

/**
 * Get progress color based on completion percentage
 */
export function getProgressColor(percentage: number): string {
	if (percentage >= 100) return 'green';
	if (percentage >= 75) return 'blue';
	if (percentage >= 50) return 'yellow';
	if (percentage >= 25) return 'orange';
	return 'red';
}

/**
 * Determine if a task is on track based on due date and progress
 */
export function isTaskOnTrack(
	dueDate: Date | null,
	completionPercentage: number,
	status: TaskStatus
): { onTrack: boolean; reason: string } {
	if (status === 'DONE') {
		return { onTrack: true, reason: 'Task completed' };
	}

	if (status === 'CANCELLED') {
		return { onTrack: false, reason: 'Task cancelled' };
	}

	if (!dueDate) {
		return { onTrack: true, reason: 'No due date set' };
	}

	const now = new Date();
	const timeTotal = dueDate.getTime() - now.getTime();
	const daysRemaining = Math.ceil(timeTotal / (1000 * 60 * 60 * 24));

	if (daysRemaining < 0) {
		return { onTrack: false, reason: 'Task overdue' };
	}

	// Simple heuristic: if completion % is less than expected based on time elapsed
	// For example, if 50% of time has passed, we expect at least 40% completion
	const expectedProgress = 100 - (daysRemaining / 7) * 10; // Rough estimate
	if (completionPercentage < expectedProgress - 20) {
		return { onTrack: false, reason: 'Progress behind schedule' };
	}

	return { onTrack: true, reason: 'On track' };
}
