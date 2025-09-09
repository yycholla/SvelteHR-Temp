import { z } from 'zod';

// Task status enum (based on API schema)
export const taskStatusSchema = z.enum(['Pending', 'InProgress', 'Completed', 'Blocked']);

// Related entity type enum (based on API schema)
export const relatedEntityTypeSchema = z.enum([
	'Onboarding',
	'Offboarding',
	'Compliance',
	'General'
]);

// Task schema (based on actual API response structure)
export const taskSchema = z.object({
	id: z.number(),
	title: z.string(),
	description: z.string().nullable().optional(),
	status: taskStatusSchema,
	dueDate: z.string().nullable().optional(),
	assignedToId: z.number().nullable().optional(),
	createdById: z.number().nullable().optional(),
	relatedEntityType: relatedEntityTypeSchema.nullable().optional(),
	relatedEntityId: z.number().nullable().optional(),
	sequence: z.number().nullable().optional(),
	requiresVerification: z.boolean().nullable().optional(),
	taskType: z.string().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

// Create task schema
export const createTaskSchema = taskSchema
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.extend({
		title: z.string().min(1, 'Title is required'),
		status: taskStatusSchema.default('Pending')
	});

// Update task schema
export const updateTaskSchema = createTaskSchema.partial().extend({
	id: z.number()
});

// Task status update schema
export const taskStatusUpdateSchema = z.object({
	status: taskStatusSchema
});

// Task filter schema
export const taskFilterSchema = z.object({
	assignedToId: z.number().optional(),
	createdById: z.number().optional(),
	status: taskStatusSchema.optional(),
	relatedEntityType: relatedEntityTypeSchema.optional(),
	relatedEntityId: z.number().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['title', 'status', 'dueDate', 'createdAt']).default('createdAt'),
	order: z.enum(['ASC', 'DESC']).default('DESC')
});

// Task list response schema
export const taskListResponseSchema = z
	.object({
		data: z.array(taskSchema),
		page: z.number(),
		pageSize: z.number(),
		total: z.number(),
		totalPages: z.number(),
		hasMore: z.boolean()
	})
	.transform((response) => ({
		tasks: response.data,
		totalCount: response.total,
		page: response.page,
		limit: response.pageSize,
		totalPages: response.totalPages,
		hasMore: response.hasMore
	}));

// Export types
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type RelatedEntityType = z.infer<typeof relatedEntityTypeSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskStatusUpdate = z.infer<typeof taskStatusUpdateSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;
