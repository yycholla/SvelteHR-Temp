import type { TaskStatus } from '$lib/types/task';

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

export interface TaskWithSubtasks {
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

export interface UserTaskStatisticsResponse {
	allTasks: {
		nodes: Array<{
			id: string;
			status: TaskStatus;
		}>;
		totalCount: number;
	};
}

export interface DepartmentUsersResponse {
	allUsers: {
		nodes: Array<{
			id: string;
		}>;
	};
}

export interface TopLevelTasksResponse {
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
