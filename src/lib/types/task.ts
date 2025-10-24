// Task System Types
// Generated from data-model.md for Task System Expansion (028)

import type { User } from './index';

// Import and re-export the correct audit action type
import type { AuditActionType as AuditActionTypeInternal } from '$lib/utils/audit';
export type AuditActionType = AuditActionTypeInternal;

// Task status and priority types
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// Resource and availability types
export type ResourceType =
	| 'event'
	| 'task'
	| 'leave_request'
	| 'profile'
	| 'document'
	| 'employee'
	| 'department'
	| 'performance_review';
export type AvailabilityStatus = 'Available' | 'Deleted' | 'Moved' | 'Restricted';

// Main Task Interface
export interface Task {
	id: string;
	title: string;
	description: string | null;
	assigneeId: string;
	creatorId: string;
	taskTypeId: string;
	status: TaskStatus;
	priority: TaskPriority;
	dueDate: Date | null;
	parentTaskId: string | null;
	archived: boolean;
	archivedAt: Date | null;
	archivedBy: string | null;
	requiresManualReassignment: boolean;
	createdAt: Date;
	updatedAt: Date;

	// Populated relationships (optional)
	assignee?: User;
	creator?: User;
	taskType?: TaskType;
	parentTask?: Task;
	subtasks?: Task[];
	linkedResources?: LinkedResource[];
	auditEntries?: TaskAuditEntry[];
	blockingTasks?: TaskDependency[];
	blockedByTasks?: TaskDependency[];
}

// Task Type Interface
export interface TaskType {
	id: string;
	name: string;
	description?: string | null;
	defaultPriority?: string | null;
	colorCode?: string | null;
	isActive: boolean;
	isSystem?: boolean;
	createdAt: Date;
	updatedAt?: Date;
	createdBy?: string | null;
}

// Task Audit Entry Interface
export interface TaskAuditEntry {
	id: string;
	taskId: string;
	actionType: string; // Allow both old and new action types
	changedFields: string[];
	newValues: Record<string, any>;
	userId: string | null;
	timestamp: Date;

	// Populated relationships
	user?: User;
}

// Task Dependency Interface
export interface TaskDependency {
	id: string;
	blockingTaskId: string;
	blockedTaskId: string;
	dependencyType: string;
	createdAt: Date;

	// Populated relationships
	blockingTask?: Task;
	blockedTask?: Task;
}

// Linked Resource Interface
export interface LinkedResource {
	id: string;
	taskId: string;
	resourceType: ResourceType;
	resourceId: string;
	resourceTitle: string;
	availabilityStatus: AvailabilityStatus;
	lastChecked: Date;
	createdAt: Date;
}

// Helper Types for Filtering and Sorting
export interface TaskFilter {
	assigneeId?: string;
	creatorId?: string;
	taskTypeId?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	archived?: boolean;
	requiresManualReassignment?: boolean;
	search?: string; // Full-text search on title and description
}

export interface TaskSortOptions {
	field: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title' | 'status';
	direction: 'asc' | 'desc';
}

// Form Input Types
export interface CreateTaskInput {
	title: string;
	description?: string;
	assigneeId: string;
	taskTypeId: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	dueDate?: Date;
	parentTaskId?: string;
	linkedResources?: {
		resourceType: ResourceType;
		resourceId: string;
		resourceTitle: string;
	}[];
}

export interface UpdateTaskInput {
	title?: string;
	description?: string;
	assigneeId?: string;
	taskTypeId?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	dueDate?: Date | null;
	parentTaskId?: string | null;
}

export interface CreateTaskDependencyInput {
	blockingTaskId: string;
	blockedTaskId: string;
	dependencyType?: string;
}

export interface CreateLinkedResourceInput {
	taskId: string;
	resourceType: ResourceType;
	resourceId: string;
	resourceTitle: string;
}

export interface CreateTaskTypeInput {
	name: string;
	description?: string;
	defaultPriority?: string;
	colorCode?: string;
}

export interface UpdateTaskTypeInput {
	name?: string;
	description?: string;
	defaultPriority?: string;
	colorCode?: string;
	isActive?: boolean;
}
