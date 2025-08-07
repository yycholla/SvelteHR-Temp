import { z } from 'zod';

// Priority enum (based on API schema)
export const prioritySchema = z.enum([
	'Low',
	'Medium',
	'High'
]);

// HR Request schema (based on actual API response structure)
export const hrRequestSchema = z.object({
	id: z.number(),
	employeeId: z.number(),
	type: z.string(),
	subject: z.string(),
	description: z.string(),
	status: z.string(),
	priority: prioritySchema,
	assignedToUserId: z.number().nullable().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

// HR Request Response schema (for responses to requests)
export const hrRequestResponseSchema = z.object({
	id: z.number(),
	hrRequestId: z.number(),
	responderId: z.number(),
	response: z.string(),
	isInternal: z.boolean().optional(),
	createdAt: z.string(),
	updatedAt: z.string().optional()
});

// Create HR Request schema
export const createHRRequestSchema = hrRequestSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	employeeId: z.number().min(1, 'Employee ID is required'),
	type: z.string().min(1, 'Request type is required'),
	subject: z.string().min(1, 'Subject is required'),
	description: z.string().min(1, 'Description is required'),
	status: z.string().default('Open'),
	priority: prioritySchema.default('Medium'),
});

// Update HR Request schema
export const updateHRRequestSchema = createHRRequestSchema.partial().extend({
	id: z.number(),
});

// Create HR Request Response schema
export const createHRRequestResponseSchema = hrRequestResponseSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	hrRequestId: z.number().min(1, 'HR Request ID is required'),
	responderId: z.number().min(1, 'Responder ID is required'),
	response: z.string().min(1, 'Response is required'),
	isInternal: z.boolean().default(false),
});

// HR Request filter schema
export const hrRequestFilterSchema = z.object({
	employeeId: z.number().optional(),
	type: z.string().optional(),
	status: z.string().optional(),
	priority: prioritySchema.optional(),
	assignedToUserId: z.number().optional(),
	createdAfter: z.string().optional(),
	createdBefore: z.string().optional(),
	page: z.number().min(1).default(1),
	pageSize: z.number().min(1).max(100).default(20),
	sort: z.enum(['subject', 'priority', 'status', 'createdAt']).default('createdAt'),
	order: z.enum(['ASC', 'DESC']).default('DESC'),
});

// HR Request list response schema
export const hrRequestListResponseSchema = z.object({
	data: z.array(hrRequestSchema),
	page: z.number(),
	pageSize: z.number(),
	total: z.number(),
	totalPages: z.number(),
	hasMore: z.boolean()
}).transform((response) => ({
	hrRequests: response.data,
	totalCount: response.total,
	page: response.page,
	limit: response.pageSize,
	totalPages: response.totalPages,
	hasMore: response.hasMore
}));

// HR Request with responses schema (for detailed view)
export const hrRequestWithResponsesSchema = hrRequestSchema.extend({
	responses: z.array(hrRequestResponseSchema).optional(),
	employee: z.object({
		id: z.number(),
		firstName: z.string(),
		lastName: z.string(),
		email: z.string().optional(),
	}).optional(),
	assignedTo: z.object({
		id: z.number(),
		firstName: z.string(),
		lastName: z.string(),
		email: z.string().optional(),
	}).optional(),
});

// Common HR Request types enum
export const hrRequestTypeSchema = z.enum([
	'General Inquiry',
	'Policy Question',
	'Benefits Change',
	'Time Off Request',
	'Equipment Request',
	'Training Request',
	'Complaint',
	'Suggestion',
	'Technical Support',
	'Other'
]);

// Common HR Request status enum
export const hrRequestStatusSchema = z.enum([
	'Open',
	'In Progress',
	'Pending Review',
	'Resolved',
	'Closed',
	'Escalated'
]);

// Export types
export type Priority = z.infer<typeof prioritySchema>;
export type HRRequest = z.infer<typeof hrRequestSchema>;
export type HRRequestResponse = z.infer<typeof hrRequestResponseSchema>;
export type CreateHRRequestInput = z.infer<typeof createHRRequestSchema>;
export type UpdateHRRequestInput = z.infer<typeof updateHRRequestSchema>;
export type CreateHRRequestResponseInput = z.infer<typeof createHRRequestResponseSchema>;
export type HRRequestFilter = z.infer<typeof hrRequestFilterSchema>;
export type HRRequestListResponse = z.infer<typeof hrRequestListResponseSchema>;
export type HRRequestWithResponses = z.infer<typeof hrRequestWithResponsesSchema>;
export type HRRequestType = z.infer<typeof hrRequestTypeSchema>;
export type HRRequestStatus = z.infer<typeof hrRequestStatusSchema>;