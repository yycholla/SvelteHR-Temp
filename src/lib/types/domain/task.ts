// Task related types

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export interface Task {
	id: string;
	title: string;
	description?: string;
	status: TaskStatus;
	priority: TaskPriority;
	due_date?: string;
	dueDate?: string;
	assignee_id?: string;
	assigneeId?: string;
	created_by?: string;
	createdBy?: string;
	department_id?: string;
	departmentId?: string;
	parent_task_id?: string;
	parentTaskId?: string;
	task_type_id?: string;
	taskTypeId?: string;
	estimated_hours?: number;
	estimatedHours?: number;
	actual_hours?: number;
	actualHours?: number;
	completion_percentage?: number;
	completionPercentage?: number;
	completed_at?: string;
	completedAt?: string;
	created_at?: string;
	createdAt?: string;
	updated_at?: string;
	updatedAt?: string;
	deleted_at?: string;
	deletedAt?: string;
}

export interface TaskFilter {
	status?: TaskStatus;
	priority?: TaskPriority;
	assigneeId?: string;
	createdBy?: string;
	departmentId?: string;
	dueDateFrom?: string;
	dueDateTo?: string;
	search?: string;
}
