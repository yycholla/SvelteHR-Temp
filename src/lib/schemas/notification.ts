import { z } from 'zod';

// Notification type enum (based on API schema)
export const notificationTypeSchema = z.enum([
	'ChangeRequest',
	'OnboardingReminder',
	'TaskUpdate',
	'General',
	'info',
	'success',
	'warning',
	'error'
]);

// Notification schema (based on actual API response structure)
export const notificationSchema = z.object({
	id: z.number(),
	employeeId: z.number(),
	message: z.string(),
	type: notificationTypeSchema,
	relatedEntityType: z.string().nullable().optional(),
	relatedEntityId: z.number().nullable().optional(),
	isRead: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string().optional()
});

// Create notification schema
export const createNotificationSchema = notificationSchema
	.omit({
		id: true,
		createdAt: true,
		updatedAt: true
	})
	.extend({
		employeeId: z.number().min(1, 'Employee ID is required'),
		message: z.string().min(1, 'Message is required'),
		type: notificationTypeSchema,
		isRead: z.boolean().default(false)
	});

// Update notification schema
export const updateNotificationSchema = z.object({
	id: z.number(),
	isRead: z.boolean().optional(),
	message: z.string().optional(),
	type: notificationTypeSchema.optional()
});

// Notification filter schema
export const notificationFilterSchema = z.object({
	employeeId: z.number().optional(),
	type: notificationTypeSchema.optional(),
	isRead: z.boolean().optional(),
	relatedEntityType: z.string().optional(),
	relatedEntityId: z.number().optional(),
	createdAfter: z.string().optional(),
	createdBefore: z.string().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['createdAt', 'type', 'isRead']).default('createdAt'),
	order: z.enum(['ASC', 'DESC']).default('DESC')
});

// Notification list response schema
export const notificationListResponseSchema = z
	.object({
		data: z.array(notificationSchema),
		page: z.number(),
		pageSize: z.number(),
		total: z.number(),
		totalPages: z.number(),
		hasMore: z.boolean()
	})
	.transform((response) => ({
		notifications: response.data,
		totalCount: response.total,
		page: response.page,
		limit: response.pageSize,
		totalPages: response.totalPages,
		hasMore: response.hasMore
	}));

// Unread count response schema
export const unreadCountSchema = z.object({
	unreadCount: z.number(),
	totalCount: z.number(),
	byType: z.record(z.number()).optional()
});

// Mark as read response schema
export const markReadResponseSchema = z.object({
	success: z.boolean(),
	message: z.string().optional(),
	notification: notificationSchema.optional()
});

// Export types
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationFilter = z.infer<typeof notificationFilterSchema>;
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;
export type UnreadCount = z.infer<typeof unreadCountSchema>;
export type MarkReadResponse = z.infer<typeof markReadResponseSchema>;
