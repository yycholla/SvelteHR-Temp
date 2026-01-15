import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { ApiResponse } from '$lib/types/index';
import type {
	TaskProgress,
	TaskWithSubtasks,
	HierarchicalProgressSummary,
	ProgressStatistics,
	UserTaskStatisticsResponse,
	DepartmentUsersResponse,
	TopLevelTasksResponse
} from './types';
import {
	countAllDescendants,
	countCompletedDescendants,
	calculateCompletionPercentage
} from './calculators';

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

		const completionPercentage = calculateCompletionPercentage(completedSubtasks, totalSubtasks);

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
		logger.error('Failed to calculate task progress', error as Error);
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

			const completionPercentage = calculateCompletionPercentage(completedLevel2, totalLevel2);

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
		const overallCompletionPercentage = calculateCompletionPercentage(
			completedDescendants,
			totalDescendants
		);

		return {
			parentTask: parentProgress,
			childProgress,
			overallCompletionPercentage,
			totalDescendants,
			completedDescendants
		};
	} catch (error) {
		logger.error('Failed to calculate hierarchical progress', error as Error);
		return null;
	}
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
		const completionRate = calculateCompletionPercentage(completed, total);

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
		logger.error('Failed to get user task statistics', error as Error);
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
			return getEmptyProgressStats();
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

		const completionRate = calculateCompletionPercentage(completed, total);

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
		logger.error('Failed to get department task statistics', error as Error);
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

			const completionPercentage = calculateCompletionPercentage(completedSubtasks, totalSubtasks);

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

		const completionRate = calculateCompletionPercentage(completed, totalTasks);

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
		logger.error('Failed to get top-level tasks progress', error as Error);
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
