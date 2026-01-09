import type { DepartmentReference, UserReference } from './common';
import type { TaskPriority, TaskStatus } from './enums';

export interface Task {
	id: string;
	assigneeId?: string;
	assignee?: UserReference;
	assignerId: string;
	assigner: UserReference;
	departmentId: string;
	department: DepartmentReference;
	assignedToDepartmentId?: string;
	assignedToDepartment?: DepartmentReference;
	title: string;
	description?: string;
	priority: TaskPriority;
	status: TaskStatus;
	dueDate?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}

export interface TaskFilter {
	status?: {
		equalTo?: TaskStatus;
		in?: TaskStatus[];
	};
	priority?: {
		equalTo?: TaskPriority;
		in?: TaskPriority[];
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
