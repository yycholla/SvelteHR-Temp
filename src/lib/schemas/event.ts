import { z } from 'zod';

// Event type enum
export const eventTypeSchema = z.enum([
	'Meeting',
	'Appointment',
	'Holiday',
	'Training',
	'Review',
	'Social',
	'Other'
]);

// Event priority enum
export const eventPrioritySchema = z.enum([
	'Low',
	'Medium',
	'High',
	'Urgent'
]);

// Event recurrence enum
export const eventRecurrenceSchema = z.enum([
	'None',
	'Daily',
	'Weekly',
	'Monthly',
	'Yearly'
]);

// Base event schema for API responses (assuming uppercase fields like other APIs)
export const eventApiSchema = z.object({
	ID: z.number(),
	Title: z.string(),
	Description: z.string().nullable().optional(),
	StartDate: z.string(), // ISO date string
	EndDate: z.string(), // ISO date string
	AllDay: z.boolean().default(false),
	Type: eventTypeSchema,
	Priority: eventPrioritySchema.default('Medium'),
	Location: z.string().nullable().optional(),
	Attendees: z.string().nullable().optional(), // JSON string of attendee IDs
	CreatedByID: z.number(),
	CreatedBy: z.object({
		ID: z.number(),
		FirstName: z.string(),
		LastName: z.string(),
		Email: z.string()
	}).optional(),
	Recurrence: eventRecurrenceSchema.default('None'),
	RecurrenceEnd: z.string().nullable().optional(), // ISO date string
	Color: z.string().default('#3b82f6'), // Hex color for calendar display
	IsPublic: z.boolean().default(true),
	CreatedAt: z.string(),
	UpdatedAt: z.string()
});

// UI-friendly event schema (lowercase fields)
export const eventSchema = z.object({
	id: z.number(),
	title: z.string(),
	description: z.string().nullable().optional(),
	startDate: z.string(), // ISO date string
	endDate: z.string(), // ISO date string
	allDay: z.boolean().default(false),
	type: eventTypeSchema,
	priority: eventPrioritySchema.default('Medium'),
	location: z.string().nullable().optional(),
	attendees: z.array(z.number()).optional(), // Array of employee IDs
	createdById: z.number(),
	createdBy: z.object({
		id: z.number(),
		firstName: z.string(),
		lastName: z.string(),
		email: z.string()
	}).optional(),
	recurrence: eventRecurrenceSchema.default('None'),
	recurrenceEnd: z.string().nullable().optional(),
	color: z.string().default('#3b82f6'),
	isPublic: z.boolean().default(true),
	createdAt: z.string(),
	updatedAt: z.string()
});

// Event creation schema (for forms)
export const eventCreateSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().optional(),
	startDate: z.string().min(1, 'Start date is required'),
	endDate: z.string().min(1, 'End date is required'),
	allDay: z.boolean().default(false),
	type: eventTypeSchema.default('Meeting'),
	priority: eventPrioritySchema.default('Medium'),
	location: z.string().optional(),
	attendees: z.array(z.number()).optional(),
	recurrence: eventRecurrenceSchema.default('None'),
	recurrenceEnd: z.string().optional(),
	color: z.string().default('#3b82f6'),
	isPublic: z.boolean().default(true)
});

// Event update schema (partial)
export const eventUpdateSchema = eventCreateSchema.partial();

// Event query parameters schema
export const eventQuerySchema = z.object({
	startDate: z.string().optional(), // ISO date string
	endDate: z.string().optional(), // ISO date string
	type: eventTypeSchema.optional(),
	createdById: z.number().optional(),
	isPublic: z.boolean().optional(),
	limit: z.number().optional(),
	offset: z.number().optional()
});

// Export types
export type Event = z.infer<typeof eventSchema>;
export type EventApi = z.infer<typeof eventApiSchema>;
export type EventCreate = z.infer<typeof eventCreateSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>;
export type EventQuery = z.infer<typeof eventQuerySchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type EventPriority = z.infer<typeof eventPrioritySchema>;
export type EventRecurrence = z.infer<typeof eventRecurrenceSchema>;

// Event colors for different types
export const eventTypeColors = {
	Meeting: '#3b82f6', // blue
	Appointment: '#10b981', // green
	Holiday: '#f59e0b', // yellow
	Training: '#8b5cf6', // purple
	Review: '#ef4444', // red
	Social: '#ec4899', // pink
	Other: '#6b7280' // gray
} as const;