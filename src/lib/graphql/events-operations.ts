// GraphQL Operations: Events Management with RSVP and Visibility Controls
import type { Client } from '@urql/core';
// Feature: 019-we-need-to - Task T013
// Purpose: Event CRUD operations with multi-tier visibility (company/department/specific)
// Migration: PostGraphile → Rust Idiomatic GraphQL (Phase 1, Task 1.1)

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES - Idiomatic Rust GraphQL Patterns
// ============================================================================

/**
 * Query: Get all events with visibility filtering (RLS-enforced)
 * RLS Policy: event_company_visibility, event_department_visibility, event_specific_visibility
 * Migration: ✅ Uses idiomatic Rust patterns (events, not allEvents)
 */
export const GET_ALL_EVENTS = gql`
	query GetAllEvents($limit: Int = 20, $offset: Int = 0, $upcomingOnly: Boolean) {
		events(limit: $limit, offset: $offset, upcomingOnly: $upcomingOnly) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			organizer {
				id
				displayName
				email
			}
			status
			color
			isPublic
			createdAt
			updatedAt
			attendees(limit: 100) {
				id
				employeeId
				responseStatus
				reminderTime
				employee {
					id
					displayName
					email
				}
			}
		}
	}
`;

/**
 * Query: Get single event by ID with attendees
 * Migration: ✅ Uses event(id:), organizer, attendees(limit:)
 */
export const GET_EVENT_BY_ID = gql`
	query GetEventById($id: UUID!) {
		event(id: $id) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			organizer {
				id
				displayName
				email
			}
			status
			color
			isPublic
			createdAt
			updatedAt
			attendees(limit: 100) {
				id
				employeeId
				responseStatus
				isRequired
				reminderTime
				createdAt
				employee {
					id
					displayName
					email
				}
			}
		}
	}
`;

/**
 * Query: Get user's events with RSVP status
 * Migration: ✅ Idiomatic pattern
 * Note: Backend gap - userId filter not available, must filter client-side
 */
export const GET_USER_EVENTS = gql`
	query GetUserEvents($limit: Int = 50, $offset: Int = 0) {
		events(limit: $limit, offset: $offset) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			status
			color
			attendees(limit: 100) {
				id
				employeeId
				responseStatus
				isRequired
				createdAt
			}
		}
	}
`;

/**
 * Query: Get upcoming events (next 30 days)
 * Migration: ✅ Uses upcomingOnly filter
 */
export const GET_UPCOMING_EVENTS = gql`
	query GetUpcomingEvents($limit: Int = 10, $upcomingOnly: Boolean) {
		events(limit: $limit, upcomingOnly: $upcomingOnly) {
			id
			title
			startTime
			endTime
			location
			status
			isPublic
		}
	}
`;

// ============================================================================
// MUTATIONS - Idiomatic Rust GraphQL Patterns
// ============================================================================

/**
 * Mutation: Create event
 * RLS Policy: event_manager_admin_access (manager/admin only)
 * Migration: ✅ Uses createEvent(input:) without nested wrapper
 */
export const CREATE_EVENT = gql`
	mutation CreateEvent($input: CreateEventInput!) {
		createEvent(input: $input) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			isPublic
			status
			color
			createdAt
			updatedAt
		}
	}
`;

/**
 * Mutation: Update event
 * RLS Policy: event_manager_admin_access (organizer or admin)
 * Migration: ✅ Uses updateEvent(id, input) - idiomatic pattern
 */
export const UPDATE_EVENT = gql`
	mutation UpdateEvent($id: UUID!, $input: UpdateEventInput!) {
		updateEvent(id: $id, input: $input) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			isPublic
			status
			color
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete event
 * RLS Policy: event_manager_admin_access (organizer or admin)
 * Migration: ✅ Uses deleteEvent(id) - returns Boolean
 */
export const DELETE_EVENT = gql`
	mutation DeleteEvent($id: UUID!) {
		deleteEvent(id: $id)
	}
`;

/**
 * Mutation: Update RSVP status
 * RLS Policy: event_attendees_own_access (employee updates own RSVP)
 * Migration: ✅ Uses updateEventAttendee(id, input)
 */
export const UPDATE_RSVP_STATUS = gql`
	mutation UpdateRsvpStatus($id: UUID!, $input: UpdateEventAttendeeInput!) {
		updateEventAttendee(id: $id, input: $input) {
			id
			eventId
			employeeId
			responseStatus
		}
	}
`;

/**
 * Mutation: Invite attendees to event
 * Migration: ✅ Uses createEventAttendee(input)
 */
export const INVITE_ATTENDEES = gql`
	mutation InviteAttendees($input: CreateEventAttendeeInput!) {
		createEventAttendee(input: $input) {
			id
			eventId
			employeeId
			responseStatus
			isRequired
			createdAt
		}
	}
`;

/**
 * Mutation: Update event reminder for an attendee
 * Migration: ✅ Idiomatic pattern
 */
export const UPDATE_EVENT_REMINDER = gql`
	mutation UpdateEventReminder($id: UUID!, $input: UpdateEventAttendeeInput!) {
		updateEventAttendee(id: $id, input: $input) {
			id
			eventId
			employeeId
			responseStatus
		}
	}
`;

/**
 * Query: Get pending event reminders for scheduler
 * Migration: ✅ Uses eventAttendees query
 * Note: Backend gap - responseStatus filter not available, filter client-side
 */
export const GET_PENDING_REMINDERS = gql`
	query GetPendingReminders($limit: Int) {
		eventAttendees(reminderTimeIsNull: false, limit: $limit) {
			id
			employeeId
			eventId
			reminderTime
			responseStatus
			event {
				id
				title
				startTime
				endTime
				status
			}
			employee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Mutation: Create event notification
 * Migration: ✅ Idiomatic pattern
 */
export const CREATE_EVENT_NOTIFICATION = gql`
	mutation CreateEventNotification($input: CreateNotificationInput!) {
		createNotification(input: $input) {
			id
			recipientId
			title
			message
			readStatus
			createdAt
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES - Updated for Idiomatic Patterns
// ============================================================================

export type EventVisibilityType = 'company' | 'department' | 'specific';
export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
export type RsvpStatus = 'pending' | 'accepted' | 'declined' | 'tentative' | 'no_response';

export interface EventFilter {
	type?: {
		equalTo?: string;
		in?: string[];
	};
	status?: {
		equalTo?: EventStatus;
		in?: EventStatus[];
	};
	visibilityType?: {
		equalTo?: EventVisibilityType;
	};
	startDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	organizerId?: {
		equalTo?: string;
	};
	departmentId?: {
		equalTo?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
}

/**
 * CreateEventInput - Updated to match Rust backend
 * Migration: ✅ Removed nested wrapper
 */
export interface CreateEventInput {
	title: string;
	description?: string;
	eventType: string;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	location?: string;
	organizerId: string;
	isPublic: boolean;
	status: EventStatus;
	color?: string;
	capacity?: number;
	recurrenceRule?: string;
	recurrenceEndDate?: string;
	imageUrl?: string;
	imageAspectRatio?: '16:9' | '9:16';
}

/**
 * UpdateEventInput - Updated to match Rust backend
 * Migration: ✅ Removed patch wrapper, uses direct fields
 */
export interface UpdateEventInput {
	title?: string;
	description?: string;
	eventType?: string;
	startTime?: string;
	endTime?: string;
	isAllDay?: boolean;
	location?: string;
	isPublic?: boolean;
	status?: EventStatus;
	color?: string;
}

/**
 * UpdateEventAttendeeInput - Updated to match Rust backend
 * Migration: ✅ Simplified structure
 */
export interface UpdateEventAttendeeInput {
	responseStatus?: RsvpStatus;
	reminderTime?: string;
	scope?: string;
}

/**
 * CreateEventAttendeeInput - Updated to match Rust backend
 * Migration: ✅ Removed nested wrapper
 */
export interface CreateEventAttendeeInput {
	eventId: string;
	employeeId: string;
	responseStatus: RsvpStatus;
	isOrganizer: boolean;
	isRequired: boolean;
}

/**
 * Event - Updated interface
 * Migration: ✅ Removed nodeId, updated relationship names
 */
export interface Event {
	id: string;
	title: string;
	description?: string;
	eventType: string;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	location?: string;
	organizerId: string;
	organizer?: {
		id: string;
		displayName: string;
		email: string;
	};
	isPublic: boolean;
	status: EventStatus;
	color?: string;
	createdAt: string;
	updatedAt: string;
	attendees?: Array<{
		id: string;
		employeeId: string;
		responseStatus: string;
		employee?: {
			id: string;
			displayName: string;
			email: string;
		};
	}>;
}

/**
 * EventAttendee - Updated interface
 * Migration: ✅ Updated to match Rust backend
 */
export interface EventAttendee {
	id: string;
	eventId: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
	};
	responseStatus: RsvpStatus;
	isOrganizer: boolean;
	isRequired: boolean;
	createdAt: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper: Build event filter safely
 */
export function buildEventFilter({
	status,
	visibilityType,
	type,
	organizerId,
	departmentId,
	searchTerm,
	startDateFrom,
	startDateTo
}: {
	status?: EventStatus;
	visibilityType?: EventVisibilityType;
	type?: string;
	organizerId?: string;
	departmentId?: string;
	searchTerm?: string;
	startDateFrom?: string;
	startDateTo?: string;
}): EventFilter {
	const filter: EventFilter = {};

	if (status) {
		filter.status = { equalTo: status };
	}

	if (visibilityType) {
		filter.visibilityType = { equalTo: visibilityType };
	}

	if (type) {
		filter.type = { equalTo: type };
	}

	if (organizerId) {
		filter.organizerId = { equalTo: organizerId };
	}

	if (departmentId) {
		filter.departmentId = { equalTo: departmentId };
	}

	if (searchTerm) {
		filter.title = { includesInsensitive: searchTerm };
	}

	if (startDateFrom || startDateTo) {
		filter.startDate = {};
		if (startDateFrom) {
			filter.startDate.greaterThanOrEqualTo = startDateFrom;
		}
		if (startDateTo) {
			filter.startDate.lessThanOrEqualTo = startDateTo;
		}
	}

	return filter;
}

/**
 * Helper: Validate event input
 */
export function validateEventInput(input: {
	title: string;
	description?: string;
	startTime: string;
	endTime: string;
	location?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 200) {
		errors.push('Title must be less than 200 characters');
	}

	if (input.description && input.description.length > 2000) {
		errors.push('Description must be less than 2000 characters');
	}

	const startTime = new Date(input.startTime);
	const endTime = new Date(input.endTime);

	if (endTime < startTime) {
		errors.push('End time must be after start time');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Check if event is upcoming
 */
export function isEventUpcoming(event: Event): boolean {
	const startTime = new Date(event.startTime);
	const now = new Date();
	return startTime > now && event.status === 'scheduled';
}

/**
 * Helper: Calculate event duration
 */
export function calculateEventDuration(startTime: string, endTime: string): string {
	const start = new Date(startTime);
	const end = new Date(endTime);
	const diffMs = end.getTime() - start.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) {
		return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
	} else if (diffHours > 0) {
		return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
	} else {
		return `${diffMins} minute${diffMins === 1 ? '' : 's'}`;
	}
}

/**
 * Helper: Get RSVP status color
 */
export function getRsvpStatusColor(status: RsvpStatus): string {
	const statusColors: Record<RsvpStatus, string> = {
		pending: 'gray',
		accepted: 'green',
		declined: 'red',
		tentative: 'yellow',
		no_response: 'gray'
	};
	return statusColors[status] || 'gray';
}

/**
 * Helper: Get event visibility label
 */
export function getEventVisibilityLabel(visibilityType: EventVisibilityType): string {
	const labels: Record<EventVisibilityType, string> = {
		company: 'Company-Wide',
		department: 'Department Only',
		specific: 'Specific People'
	};
	return labels[visibilityType] || 'Unknown';
}

// ============================================================================
// OPERATIONS CLASS - Updated for Idiomatic Patterns
// ============================================================================

/**
 * T013: Events Operations with Multi-Tier Visibility and RSVP
 * Migration: ✅ Fully migrated to Rust idiomatic patterns
 */
export class EventsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get all events (RLS-filtered by visibility)
	 * Migration: ✅ Updated to use direct array access (no .nodes)
	 */
	async getAllEvents(params: {
		first?: number;
		offset?: number;
		filter?: any;
		orderBy?: string;
		userCredentials: UserCredentials;
	}): Promise<{
		events: Event[];
		totalCount: number;
		hasNextPage: boolean;
	}> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetAllEvents',
			variables: {
				limit: params.first || 20,
				offset: params.offset || 0,
				upcomingOnly: params.filter?.upcomingOnly || false
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_ALL_EVENTS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to load events. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No events data returned. Please try again.'
				});
			}

			return {
				events: result.data.events || [],
				totalCount: result.data.events?.length || 0,
				hasNextPage: false
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load events. Please try again.'
			});
		}
	}

	/**
	 * Get single event by ID with attendees
	 * Migration: ✅ Updated to use direct access (no nesting)
	 */
	async getEventById(params: {
		eventId: string;
		userCredentials: UserCredentials;
	}): Promise<Event> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetEventById',
			variables: { id: params.eventId },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_EVENT_BY_ID, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to complete operation. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.event) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Event not found. Please try again.'
				});
			}

			return result.data.event;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Get user's events with RSVP status
	 * Migration: ✅ Updated client-side filtering for attendees array
	 */
	async getUserEvents(params: {
		employeeId: string;
		first?: number;
		limit?: number;
		offset?: number;
		userCredentials: UserCredentials;
	}): Promise<{ events: Event[]; totalCount: number }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetUserEvents',
			variables: {
				limit: params.first || params.limit || 50,
				offset: params.offset || 0
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_USER_EVENTS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to complete operation. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			// Filter events by employeeId client-side (backend gap)
			const allEvents = result.data.events || [];
			const filteredEvents = params.employeeId
				? allEvents.filter((e: any) =>
						e.attendees?.some((a: any) => a.employeeId === params.employeeId)
					)
				: allEvents;

			return {
				events: filteredEvents,
				totalCount: filteredEvents.length
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Get upcoming events (next 30 days)
	 * Migration: ✅ Direct array access
	 */
	async getUpcomingEvents(params: {
		first?: number;
		limit?: number;
		filter?: any;
		userCredentials: UserCredentials;
	}): Promise<{ events: Event[]; totalCount: number }> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'GetUpcomingEvents',
			variables: {
				limit: params.first || params.limit || 10,
				upcomingOnly: true
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.query(GET_UPCOMING_EVENTS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to complete operation. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			return {
				events: result.data.events || [],
				totalCount: result.data.events?.length || 0
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Create event (manager/admin only)
	 * Migration: ✅ Updated to use direct input (no nesting)
	 */
	async createEvent(params: {
		input: CreateEventInput;
		userCredentials: UserCredentials;
	}): Promise<Event> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input
		const validation = validateEventInput(params.input);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.errors.join(', ')), {
				type: 'validation',
				userMessage: validation.errors.join(', ')
			});
		}

		const dataRequest = createDataRequest({
			operationName: 'CreateEvent',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(CREATE_EVENT, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to complete operation. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.createEvent) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			return result.data.createEvent;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Update event (organizer or admin)
	 * Migration: ✅ Updated to use id param (not nodeId)
	 */
	async updateEvent(params: {
		id: string;
		input: UpdateEventInput;
		userCredentials: UserCredentials;
	}): Promise<Event> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateEvent',
			variables: { id: params.id, input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(UPDATE_EVENT, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to complete operation. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.updateEvent) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			return result.data.updateEvent;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Delete event (organizer or admin)
	 * Migration: ✅ Updated to use id param, returns Boolean
	 */
	async deleteEvent(params: {
		id: string;
		userCredentials: UserCredentials;
	}): Promise<boolean> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'DeleteEvent',
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(DELETE_EVENT, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to complete operation. Please try again.'
				});
				throw errorResponse;
			}

			return result.data?.deleteEvent || false;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Set event reminder for the current user
	 * Migration: ✅ Updated to use id param
	 */
	async setEventReminder(params: {
		attendeeId: string;
		reminderMinutes: number | null;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse} = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateEventReminder',
			variables: {
				id: params.attendeeId,
				input: {
					reminderTime: params.reminderMinutes?.toString()
				}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(UPDATE_EVENT_REMINDER, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to set reminder. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.updateEventAttendee) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Failed to set reminder. Please try again.'
				});
			}

			return result.data.updateEventAttendee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to set event reminder. Please try again.'
			});
		}
	}

	/**
	 * Update RSVP status (employee updates own RSVP)
	 * Migration: ✅ Updated to use id param
	 */
	async updateRsvpStatus(params: {
		attendeeId: string;
		status: RsvpStatus;
		userCredentials: UserCredentials;
	}): Promise<EventAttendee> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateRsvpStatus',
			variables: {
				id: params.attendeeId,
				input: {
					responseStatus: params.status
				}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			const result = await this.client.mutation(UPDATE_RSVP_STATUS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update RSVP. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.updateEventAttendee) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Failed to update RSVP. Please try again.'
				});
			}

			return result.data.updateEventAttendee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error;
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update RSVP. Please try again.'
			});
		}
	}

	/**
	 * Invite attendees to event
	 * Migration: ✅ Updated to use direct input
	 */
	async inviteAttendees(params: {
		eventId: string;
		employeeIds: string[];
		isRequired?: boolean;
		userCredentials: UserCredentials;
	}): Promise<EventAttendee[]> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const results: EventAttendee[] = [];

		for (const employeeId of params.employeeIds) {
			const input: CreateEventAttendeeInput = {
				eventId: params.eventId,
				employeeId: employeeId,
				responseStatus: 'pending',
				isOrganizer: false,
				isRequired: params.isRequired || false
			};

			const dataRequest = createDataRequest({
				operationName: 'InviteAttendees',
				variables: { input },
				userCredentials: params.userCredentials,
				timeoutMs: 5000
			});

			try {
				const result = await this.client.mutation(INVITE_ATTENDEES, dataRequest.variables).toPromise();

				if (result.error) {
					const errorResponse = createErrorResponse(result.error, {
						type: 'graphql',
						userMessage: 'Unable to invite attendee. Please try again.'
					});
					throw errorResponse;
				}

				if (!result.data || !result.data.createEventAttendee) {
					throw createErrorResponse(new Error('No data returned'), {
						type: 'graphql',
						userMessage: 'No attendee data returned. Please try again.'
					});
				}

				const attendee = result.data.createEventAttendee;
				results.push(attendee as EventAttendee);
			} catch (error: any) {
				if (error.userMessage) {
					throw error;
				}
				throw createErrorResponse(error, {
					type: 'graphql',
					userMessage: 'Failed to invite attendee. Please try again.'
				});
			}
		}

		return results;
	}

	/**
	 * Invite single attendee to event (convenience method)
	 */
	async inviteAttendee(params: {
		eventId: string;
		employeeId: string;
		isRequired?: boolean;
		userCredentials: UserCredentials;
	}): Promise<EventAttendee> {
		const results = await this.inviteAttendees({
			eventId: params.eventId,
			employeeIds: [params.employeeId],
			isRequired: params.isRequired,
			userCredentials: params.userCredentials
		});
		return results[0];
	}

	/**
	 * Get pending event reminders for scheduler
	 * Migration: ✅ Updated to filter client-side
	 */
	async getPendingReminders(params: {
		userCredentials: UserCredentials;
	}): Promise<any[]> {
		const { createDataRequest } = await import('$lib/models/data-request');

		const dataRequest = createDataRequest({
			operationName: 'GetPendingReminders',
			variables: {
				limit: 1000
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		const result = await this.client.query(GET_PENDING_REMINDERS, dataRequest.variables).toPromise();

		if (result.error) {
			console.error('[EventsOperations] Error fetching pending reminders:', result.error);
			return [];
		}

		// Filter client-side for accepted/tentative status
		const allAttendees = result.data?.eventAttendees || [];
		return allAttendees.filter(
			(attendee: any) =>
				attendee.responseStatus === 'accepted' || attendee.responseStatus === 'tentative'
		);
	}

	/**
	 * Create event notification
	 * Migration: ✅ Updated input structure
	 */
	async createEventNotification(params: {
		userId: string;
		eventId: string;
		type: string;
		message: string;
		userCredentials: UserCredentials;
	}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
		const { createDataRequest } = await import('$lib/models/data-request');

		try {
			const dataRequest = createDataRequest({
				operationName: 'CreateEventNotification',
				variables: {
					input: {
						recipientId: params.userId,
						title: 'Event Reminder',
						message: params.message,
						readStatus: false
					}
				},
				userCredentials: params.userCredentials,
				timeoutMs: 5000
			});

			const result = await this.client
				.mutation(CREATE_EVENT_NOTIFICATION, dataRequest.variables)
				.toPromise();

			if (result.error) {
				console.error('[EventsOperations] Error creating notification:', result.error);
				return {
					success: false,
					error: result.error.message
				};
			}

			return {
				success: true,
				notificationId: result.data?.createNotification?.id
			};
		} catch (error) {
			console.error('[EventsOperations] Error creating notification:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}

/**
 * Factory function to create EventsOperations instance
 */
export function createEventsOperations(client: Client): EventsOperations {
	return new EventsOperations(client);
}
