import type { User } from './user';
import type { Attachment } from './hr-request';
import type { TaskStatus, TaskPriority } from './enums';

export interface Task {
	id: string;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	assignedTo?: User;
	createdBy: User;
	parentTask?: Task;
	subtasks: Task[];
	dependencies: Task[];
	dueDate?: string;
	completionDate?: string;
	estimatedHours?: number;
	actualHours?: number;
	completionPercentage: number;
	isOverdue: boolean;
	attachments: Attachment[];
	comments: TaskComment[];
	createdAt: string;
	updatedAt: string;
}

export interface TaskComment {
	id: string;
	content: string;
	author: User;
	task: Task;
	createdAt: string;
	updatedAt: string;
}