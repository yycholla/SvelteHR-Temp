// Task System Zod Schemas
// Validation schemas for Task System Expansion (028)

import { z } from 'zod';

// Enumerated Type Schemas
export const taskStatusSchema = z.enum([
	'To Do',
	'In Progress',
	'Blocked',
	'Deferred',
	'Completed'
]);

export const taskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Urgent']);

export const resourceTypeSchema = z.enum(['assessment', 'document', 'training', 'event', 'other']);

export const availabilityStatusSchema = z.enum(['available', 'unavailable']);

export const auditActionTypeSchema = z.enum([
	'created',
	'edited',
	'reassigned',
	'deleted',
	'status_changed',
	'org_change'
]);

// Create Task Schema
export const createTaskSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, 'Title is required')
		.max(255, 'Title must be 255 characters or less'),
	description: z.string().optional(),
	assigneeId: z.string().uuid('Invalid assignee ID'),
	taskTypeId: z.string().uuid('Invalid task type ID'),
	status: taskStatusSchema.default('To Do'),
	priority: taskPrioritySchema.default('Medium'),
	dueDate: z.date().optional(),
	parentTaskId: z.string().uuid('Invalid parent task ID').optional(),
	linkedResources: z
		.array(
			z.object({
				resourceType: resourceTypeSchema,
				resourceId: z.string().uuid('Invalid resource ID'),
				resourceTitle: z.string().min(1, 'Resource title is required')
			})
		)
		.optional()
});

// Update Task Schema (all fields optional)
export const updateTaskSchema = z.object({
	title: z.string().trim().min(1, 'Title cannot be empty').max(255).optional(),
	description: z.string().optional(),
	assigneeId: z.string().uuid('Invalid assignee ID').optional(),
	taskTypeId: z.string().uuid('Invalid task type ID').optional(),
	status: taskStatusSchema.optional(),
	priority: taskPrioritySchema.optional(),
	dueDate: z.date().nullable().optional(),
	parentTaskId: z.string().uuid('Invalid parent task ID').nullable().optional()
});

// Create Task Dependency Schema
export const createTaskDependencySchema = z
	.object({
		blockingTaskId: z.string().uuid('Invalid blocking task ID'),
		blockedTaskId: z.string().uuid('Invalid blocked task ID'),
		dependencyType: z.string().default('must_complete_before')
	})
	.refine((data) => data.blockingTaskId !== data.blockedTaskId, {
		message: 'A task cannot depend on itself',
		path: ['blockedTaskId']
	});

// Create Linked Resource Schema
export const createLinkedResourceSchema = z.object({
	taskId: z.string().uuid('Invalid task ID'),
	resourceType: resourceTypeSchema,
	resourceId: z.string().uuid('Invalid resource ID'),
	resourceTitle: z.string().min(1, 'Resource title is required')
});

// Create Task Type Schema
export const createTaskTypeSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Task type name is required')
		.max(100, 'Task type name must be 100 characters or less'),
	description: z.string().optional()
});

// Task Filter Schema
export const taskFilterSchema = z.object({
	assigneeId: z.string().uuid().optional(),
	creatorId: z.string().uuid().optional(),
	taskTypeId: z.string().uuid().optional(),
	status: taskStatusSchema.optional(),
	priority: taskPrioritySchema.optional(),
	archived: z.boolean().optional(),
	requiresManualReassignment: z.boolean().optional(),
	search: z.string().optional()
});

// Task Sort Options Schema
export const taskSortOptionsSchema = z.object({
	field: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'title', 'status']),
	direction: z.enum(['asc', 'desc'])
});

// Helper function to parse dates from string inputs
export const parseDateInput = (input: string | Date | undefined | null): Date | undefined => {
	if (!input) return undefined;
	if (input instanceof Date) return input;
	const parsed = new Date(input);
	return isNaN(parsed.getTime()) ? undefined : parsed;
};
