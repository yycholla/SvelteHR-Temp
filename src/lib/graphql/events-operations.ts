// GraphQL Operations: Events Management with RSVP and Visibility Controls
import type { Client } from '@urql/core';
// Feature: 019-we-need-to - Task T013
// Purpose: Event CRUD operations with multi-tier visibility (company/department/specific)

import { gql } from '@urql/svelte';
import type { UserCredentials } from '$lib/models/data-request';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Query: Get all events with visibility filtering (RLS-enforced)
 * RLS Policy: event_company_visibility, event_department_visibility, event_specific_visibility
 * Note: Using Rust GraphQL schema conventions - events with simple filtering
 */
export const GET_ALL_EVENTS = gql`
	query GetAllEvents(
		$limit: Int = 20
		$offset: Int = 0
		$upcomingOnly: Boolean
	) {
		events(limit: $limit, offset: $offset, upcomingOnly: $upcomingOnly) {
			id
			nodeId
			title
			description
			eventType
			startTime
			endTime
			allDay
			location
			organizerId
			userByOrganizerId {
				id
				displayName
				email
			}
			status
			color
			isPublic
			createdAt
			updatedAt
			eventAttendeesByEventId {
				nodes {
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
	}
`;

/**
 * Query: Get single event by ID with attendees
 * Note: Using Rust GraphQL schema - event query by ID
 */
export const GET_EVENT_BY_ID = gql`
	query GetEventById($id: UUID!) {
		event(id: $id) {
			id
			nodeId
			title
			description
			eventType
			startTime
			endTime
			allDay
			location
			organizerId
			userByOrganizerId {
				id
				displayName
				email
			}
			status
			color
			isPublic
			createdAt
			updatedAt
			eventAttendeesByEventId {
				nodes {
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
	}
`;

/**
 * Query: Get user's events with RSVP status
 * Note: Client-side filtering by employeeId since backend doesn't support it
 */
export const GET_USER_EVENTS = gql`
	query GetUserEvents(
		$limit: Int = 50
		$offset: Int = 0
	) {
		events(
			limit: $limit
			offset: $offset
		) {
			id
			nodeId
			title
			description
			eventType
			startTime
			endTime
			allDay
			location
			organizerId
			status
			color
			eventAttendeesByEventId {
				nodes {
					id
					employeeId
					responseStatus
					isRequired
					createdAt
				}
			}
		}
	}
`;

/**
 * Query: Get upcoming events (next 30 days)
 * Note: Using Rust GraphQL schema with upcomingOnly filter
 */
export const GET_UPCOMING_EVENTS = gql`
	query GetUpcomingEvents($limit: Int = 10, $upcomingOnly: Boolean) {
		events(
			limit: $limit
			upcomingOnly: $upcomingOnly
		) {
			id
			nodeId
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
// MUTATIONS
// ============================================================================

/**
 * Mutation: Create event
 * RLS Policy: event_manager_admin_access (manager/admin only)
 */
export const CREATE_EVENT = gql`
	mutation CreateEvent($input: CreateEventInput!) {
		createEvent(input: $input) {
			event {
				id
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				isPublic
				status
				color
				createdAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update event
 * RLS Policy: event_manager_admin_access (organizer or admin)
 * Note: Using PostGraphile conventions - nodeId and eventPatch
 */
export const UPDATE_EVENT = gql`
	mutation UpdateEvent($input: UpdateEventByIdInput!) {
		updateEventById(input: $input) {
			event {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				isPublic
				status
				color
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Delete event
 * RLS Policy: event_manager_admin_access (organizer or admin)
 */
export const DELETE_EVENT = gql`
	mutation DeleteEvent($input: DeleteEventInput!) {
		deleteEvent(input: $input) {
			deletedEventId
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update RSVP status
 * RLS Policy: event_attendees_own_access (employee updates own RSVP)
 */
export const UPDATE_RSVP_STATUS = gql`
	mutation UpdateRsvpStatus($input: UpdateEventAttendeeByIdInput!) {
		updateEventAttendeeById(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
				respondedAt
			}
		}
	}
`;

/**
 * Mutation: Invite attendees to event
 */
export const INVITE_ATTENDEES = gql`
	mutation InviteAttendees($input: CreateEventAttendeeInput!) {
		createEventAttendee(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
				isRequired
				createdAt
			}
			clientMutationId
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES
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

export interface CreateEventInput {
	clientMutationId?: string;
	event: {
		title: string;
		description?: string;
		eventType: string;
		startTime: string;
		endTime: string;
		allDay?: boolean;
		location?: string;
		organizerId: string;
		isPublic?: boolean;
		status?: EventStatus;
		color?: string;
	};
}

export interface UpdateEventInput {
	clientMutationId?: string;
	id: string; // UUID of the event
	eventPatch: {
		title?: string;
		description?: string;
		eventType?: string;
		startTime?: string;
		endTime?: string;
		allDay?: boolean;
		location?: string;
		isPublic?: boolean;
		status?: EventStatus;
		color?: string;
	};
}

export interface DeleteEventInput {
	clientMutationId?: string;
	nodeId: string;
}

export interface UpdateEventAttendeeInput {
	clientMutationId?: string;
	id: string;
	patch: {
		responseStatus: RsvpStatus;
		respondedAt?: string;
	};
}

export interface CreateEventAttendeeInput {
	clientMutationId?: string;
	eventAttendee: {
		eventId: string;
		employeeId: string;
		responseStatus?: RsvpStatus;
		isOrganizer?: boolean;
		isRequired?: boolean;
	};
}

export interface Event {
	id: string;
	nodeId: string;
	title: string;
	description?: string;
	eventType: string;
	startTime: string;
	endTime: string;
	allDay: boolean;
	location?: string;
	organizerId: string;
	userByOrganizerId?: {
		id: string;
		displayName: string;
		email: string;
	};
	isPublic: boolean;
	status: EventStatus;
	color?: string;
	createdAt: string;
	updatedAt: string;
	eventAttendeesByEventId?: {
		nodes: Array<{
			id: string;
			employeeId: string;
			responseStatus: string;
			employee?: {
				id: string;
				displayName: string;
				email: string;
			};
		}>;
	};
}

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
	respondedAt?: string;
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
// OPERATIONS CLASS
// ============================================================================

/**
 * Mutation: Update event reminder for an attendee (using standard PostGraphile mutation)
 * Note: Not querying reminderTime in response as it may not be exposed in GraphQL schema
 */
export const UPDATE_EVENT_REMINDER = gql`
	mutation UpdateEventReminder($input: UpdateEventAttendeeByIdInput!) {
		updateEventAttendeeById(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
			}
		}
	}
`;

/**
 * Query: Get pending event reminders for scheduler
 * Fetches event attendees with reminders set who have accepted/tentative status
 * Note: Using Rust GraphQL server naming (eventAttendees, event, employee)
 * Note: Rust Event model now includes status field (draft, scheduled, in_progress, completed, cancelled)
 * Note: Uses EventAttendeeFilter with responseStatus field
 */
export const GET_PENDING_REMINDERS = gql`
	query GetPendingReminders {
		eventAttendees(filter: { responseStatus: accepted }) {
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
 */
export const CREATE_EVENT_NOTIFICATION = gql`
	mutation CreateEventNotification($input: CreateNotificationInput!) {
		createNotification(input: $input) {
			notification {
				id
				recipientId
				type
				category
				title
				message
				relatedResourceType
				relatedResourceId
				readStatus
				deliveredAt
				createdAt
			}
		}
	}
`;

/**
 * T013: Events Operations with Multi-Tier Visibility and RSVP
 */
export class EventsOperations {
	private client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	/**
	 * Get all events (RLS-filtered by visibility)
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
			// Server-side query using toPromise()
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
				hasNextPage: false // Rust backend doesn't provide pagination info
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to load events. Please try again.'
			});
		}
	}

	/**
	 * Get single event by ID with attendees
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
			// Server-side query using toPromise()
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

			// Extract return data from result.data.event
			return result.data.event;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Get user's events with RSVP status
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
			// Server-side query using toPromise()
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

			// Extract return data from result.data
			// Filter events by employeeId client-side since backend doesn't support it yet
			const allEvents = result.data.events || [];
			const filteredEvents = params.employeeId
				? allEvents.filter((e: any) =>
					e.eventAttendeesByEventId?.nodes?.some((a: any) => a.employeeId === params.employeeId)
				)
				: allEvents;

			return {
				events: filteredEvents,
				totalCount: filteredEvents.length
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Get upcoming events (next 30 days)
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
			// Server-side query using toPromise()
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

			// Extract return data from result.data
			return {
				events: result.data.events || [],
				totalCount: result.data.events?.length || 0
			};
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Create event (manager/admin only)
	 */
	async createEvent(params: {
		input: CreateEventInput;
		userCredentials: UserCredentials;
	}): Promise<Event> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Validate input
		const validation = validateEventInput(params.input.event);
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
			// Server-side mutation using toPromise()
			const result = await this.client.mutation(CREATE_EVENT, dataRequest.variables).toPromise();

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

			// Extract return data from result.data
			return result.data;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Update event (organizer or admin)
	 */
	async updateEvent(params: {
		input: UpdateEventInput;
		userCredentials: UserCredentials;
	}): Promise<Event> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateEvent',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client.mutation(UPDATE_EVENT, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to complete operation. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.updateEventById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'No data returned. Please try again.'
				});
			}

			// Extract return data from result.data.updateEventById.event
			return result.data.updateEventById.event;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Delete event (organizer or admin)
	 */
	async deleteEvent(params: {
		nodeId: string;
		userCredentials: UserCredentials;
	}): Promise<string> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: DeleteEventInput = {
			nodeId: params.nodeId
		};

		const dataRequest = createDataRequest({
			operationName: 'DeleteEvent',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client.mutation(DELETE_EVENT, dataRequest.variables).toPromise();

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

			// Extract return data from result.data
			return result.data;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Operation failed. Please try again.'
			});
		}
	}

	/**
	 * Set event reminder for the current user
	 * Updates the attendee record with the reminder time
	 */
	async setEventReminder(params: {
		attendeeId: string;
		reminderMinutes: number | null;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateEventReminder',
			variables: {
				input: {
					id: params.attendeeId,
					eventAttendeePatch: {
						reminderTime: params.reminderMinutes
					}
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

			if (!result.data || !result.data.updateEventAttendeeById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Failed to set reminder. Please try again.'
				});
			}

			return result.data.updateEventAttendeeById.eventAttendee;
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
				input: {
					id: params.attendeeId,
					eventAttendeePatch: {
						responseStatus: params.status,
						respondedAt: new Date().toISOString()
					}
				}
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client.mutation(UPDATE_RSVP_STATUS, dataRequest.variables).toPromise();

			if (result.error) {
				const errorResponse = createErrorResponse(result.error, {
					type: 'graphql',
					userMessage: 'Unable to update RSVP. Please try again.'
				});
				throw errorResponse;
			}

			if (!result.data || !result.data.updateEventAttendeeById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Failed to update RSVP. Please try again.'
				});
			}

			// Extract return data from result.data.updateEventAttendeeById.eventAttendee
			return result.data.updateEventAttendeeById.eventAttendee;
		} catch (error: any) {
			if (error.userMessage) {
				throw error; // Already formatted error
			}
			throw createErrorResponse(error, {
				type: 'graphql',
				userMessage: 'Failed to update RSVP. Please try again.'
			});
		}
	}

	/**
	 * Invite attendees to event
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

		// Create attendee records for each employee
		for (const employeeId of params.employeeIds) {
			const input: CreateEventAttendeeInput = {
				eventAttendee: {
					eventId: params.eventId,
					employeeId: employeeId,
					responseStatus: 'pending'
					// Note: isOrganizer and isRequired are NOT part of EventAttendeeInput schema
				}
			};

			const dataRequest = createDataRequest({
				operationName: 'InviteAttendees',
				variables: { input },
				userCredentials: params.userCredentials,
				timeoutMs: 5000
			});

			try {
				// Server-side mutation using toPromise()
				const result = await this.client.mutation(INVITE_ATTENDEES, dataRequest.variables).toPromise();

				if (result.error) {
					const errorResponse = createErrorResponse(result.error, {
						type: 'graphql',
						userMessage: 'Unable to invite attendee. Please try again.'
					});
					throw errorResponse;
				}

				if (!result.data) {
					throw createErrorResponse(new Error('No data returned'), {
						type: 'graphql',
						userMessage: 'No attendee data returned. Please try again.'
					});
				}

				const attendee = result.data.createEventAttendee.eventAttendee;
				results.push(attendee);
			} catch (error: any) {
				if (error.userMessage) {
					throw error; // Already formatted error
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
	 * Feature: 026-integrate-ui-components
	 */
	async getPendingReminders(params: {
		userCredentials: UserCredentials;
	}): Promise<any[]> {
		const { createDataRequest } = await import('$lib/models/data-request');

		const dataRequest = createDataRequest({
			operationName: 'GetPendingReminders',
			variables: {},
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		const result = await this.client.query(GET_PENDING_REMINDERS, dataRequest.variables).toPromise();

		if (result.error) {
			console.error('[EventsOperations] Error fetching pending reminders:', result.error);
			return [];
		}

		return result.data?.eventAttendees || [];
	}

	/**
	 * Create event notification
	 * Feature: 026-integrate-ui-components
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
						notification: {
							recipientId: params.userId,
							type: 'EVENT_REMINDER',
							category: 'EVENT',
							title: 'Event Reminder',
							message: params.message,
							relatedResourceType: 'EVENT',
							relatedResourceId: params.eventId,
							readStatus: false
						}
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
				notificationId: result.data?.createNotification?.notification?.id
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

// ============================================================================
// FEATURE 027: EVENTS CALENDAR UI INTEGRATION WITH RECURRING EVENTS
// ============================================================================

/**
 * Query: Get events for calendar with 3-month buffer
 * Feature: 027-we-need-to - Task T036
 * Purpose: Load calendar events within 3-month range (current month ± 1)
 *
 * Uses 3-month buffer strategy for performance:
 * - bufferStart: first day of previous month at 00:00:00
 * - bufferEnd: last day of next month at 23:59:59.999
 *
 * Returns:
 * - Base events (one-time and recurring patterns)
 * - Expanded recurring occurrences within buffer range
 * - User's RSVP status for each event
 * - Conflict detection data (capacity, acceptance count)
 */
export const GET_EVENTS_FOR_CALENDAR = gql`
	query GetEventsForCalendar(
		$bufferStart: Datetime!
		$bufferEnd: Datetime!
		$userId: UUID!
		$eventTypes: [String!]
		$visibilityFilter: String
	) {
		allEvents(
			condition: {
				isPublic: true
			}
			filter: {
				or: [
					{
						# One-time events within buffer
						and: [
							{ recurrencePattern: { isNull: true } }
							{ startTime: { greaterThanOrEqualTo: $bufferStart } }
							{ startTime: { lessThanOrEqualTo: $bufferEnd } }
						]
					}
					{
						# Recurring events that overlap buffer
						and: [
							{ recurrencePattern: { isNull: false } }
							{ startTime: { lessThanOrEqualTo: $bufferEnd } }
							{ recurrenceEndDate: { greaterThanOrEqualTo: $bufferStart } }
						]
					}
				]
			}
		) {
			nodes {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				userByOrganizerId {
					id
					displayName
					email
				}
				status
				color
				isPublic
				maxCapacity
				currentAcceptanceCount
				recurrencePattern
				recurrenceEndDate
				imageUrl
				imageAspectRatio
				createdAt
				updatedAt
				# User's RSVP status for this event
				eventAttendeesByEventId(condition: { employeeId: $userId }) {
					nodes {
						id
						responseStatus
						scope
						reminderTime
					}
				}
				# Acceptance count for conflict detection
				eventAttendeesByEventId(condition: { responseStatus: "accepted" }) {
					totalCount
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
`;

/**
 * Query: Get event details with full attendee list
 * Feature: 027-we-need-to - Task T037
 * Purpose: Load complete event details for EventDetailsDialog
 */
export const GET_EVENT_DETAILS = gql`
	query GetEventDetails($eventId: UUID!, $userId: UUID!) {
		eventById(id: $eventId) {
			id
			nodeId
			title
			description
			eventType
			startTime
			endTime
			allDay
			location
			organizerId
			userByOrganizerId {
				id
				displayName
				email
			}
			status
			color
			isPublic
			maxCapacity
			currentAcceptanceCount
			recurrencePattern
			recurrenceEndDate
			imageUrl
			imageAspectRatio
			createdAt
			updatedAt
			# All attendees with full details
			eventAttendeesByEventId {
				nodes {
					id
					employeeId
					responseStatus
					scope
					reminderTime
					isOrganizer
					respondedAt
					employee {
						id
						displayName
						email
						jobTitle
					}
				}
				totalCount
			}
			# Waitlist entries
			eventWaitlistsByEventId(orderBy: POSITION_ASC) {
				nodes {
					id
					employeeId
					position
					joinedAt
					employee {
						id
						displayName
						email
					}
				}
				totalCount
			}
			# User's specific RSVP
			eventAttendeesByEventId(condition: { employeeId: $userId }) {
				nodes {
					id
					responseStatus
					scope
					reminderTime
				}
			}
		}
	}
`;

/**
 * Query: Get notification preferences for current user
 * Feature: 027-we-need-to - Task T040
 * Purpose: Load user's event notification settings
 */
export const GET_NOTIFICATION_PREFERENCES = gql`
	query GetNotificationPreferences($userId: UUID!) {
		userById(id: $userId) {
			id
			eventNotificationPreferences
		}
	}
`;

/**
 * Mutation: Create event with all fields including recurrence
 * Feature: 027-we-need-to - Task T041
 * Purpose: Create new event with optional recurrence pattern
 */
export const CREATE_EVENT_FULL = gql`
	mutation CreateEventFull($input: CreateEventInput!) {
		createEvent(input: $input) {
			event {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				organizerId
				status
				color
				isPublic
				maxCapacity
				recurrencePattern
				recurrenceEndDate
				imageUrl
				imageAspectRatio
				createdAt
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update event with all fields
 * Feature: 027-we-need-to - Task T042
 * Purpose: Update existing event including recurrence changes
 */
export const UPDATE_EVENT_FULL = gql`
	mutation UpdateEventFull($input: UpdateEventByIdInput!) {
		updateEventById(input: $input) {
			event {
				id
				nodeId
				title
				description
				eventType
				startTime
				endTime
				allDay
				location
				status
				color
				isPublic
				maxCapacity
				recurrencePattern
				recurrenceEndDate
				imageUrl
				imageAspectRatio
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: RSVP to event with scope selection
 * Feature: 027-we-need-to - Task T043
 * Purpose: RSVP to recurring event with scope (this/future/all)
 */
export const RSVP_TO_EVENT = gql`
	mutation RsvpToEvent($input: UpdateEventAttendeeByIdInput!) {
		updateEventAttendeeById(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
				scope
				respondedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Join waitlist
 * Feature: 027-we-need-to - Task T044
 * Purpose: Join event waitlist when at capacity
 */
export const JOIN_WAITLIST = gql`
	mutation JoinWaitlist($input: CreateEventWaitlistInput!) {
		createEventWaitlist(input: $input) {
			eventWaitlist {
				id
				eventId
				employeeId
				position
				joinedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Post event comment with @mentions
 * Feature: 027-we-need-to - Task T045
 * Purpose: Add comment to event with markdown and mentions support
 */
export const POST_EVENT_COMMENT = gql`
	mutation PostEventComment($input: CreateEventCommentInput!) {
		createEventComment(input: $input) {
			eventComment {
				id
				eventId
				employeeId
				content
				mentions
				createdAt
				employee {
					id
					displayName
				}
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Update notification preferences
 * Feature: 027-we-need-to - Task T046
 * Purpose: Save user's event notification settings
 */
export const UPDATE_NOTIFICATION_PREFERENCES = gql`
	mutation UpdateNotificationPreferences($input: UpdateUserByIdInput!) {
		updateUserById(input: $input) {
			user {
				id
				eventNotificationPreferences
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Upload event image
 * Feature: 027-we-need-to - Task T047
 * Purpose: Upload and process event image with aspect ratio validation
 */
export const UPLOAD_EVENT_IMAGE = gql`
	mutation UploadEventImage($input: UploadEventImageInput!) {
		uploadEventImage(input: $input) {
			imageUrl
			aspectRatio
			clientMutationId
		}
	}
`;

/**
 * Mutation: Reschedule event with scope
 * Feature: 027-we-need-to - Task T048
 * Purpose: Reschedule recurring event with scope (this/future/all)
 */
export const RESCHEDULE_EVENT = gql`
	mutation RescheduleEvent($input: RescheduleEventInput!) {
		rescheduleEvent(input: $input) {
			event {
				id
				startTime
				endTime
				updatedAt
			}
			affectedOccurrences
			clientMutationId
		}
	}
`;

/**
 * Subscription: Real-time event updates
 * Feature: 027-we-need-to - Task T049
 * Purpose: Subscribe to event changes for live calendar updates
 */
export const ON_EVENT_UPDATE = gql`
	subscription OnEventUpdate($eventId: UUID!) {
		eventUpdated(eventId: $eventId) {
			event {
				id
				title
				startTime
				endTime
				status
				currentAcceptanceCount
				updatedAt
			}
			updateType
			userId
		}
	}
`;

/**
 * Subscription: Waitlist promotion notifications
 * Feature: 027-we-need-to - Task T050
 * Purpose: Notify user when promoted from waitlist
 */
export const ON_WAITLIST_PROMOTION = gql`
	subscription OnWaitlistPromotion($userId: UUID!) {
		waitlistPromoted(userId: $userId) {
			eventId
			eventTitle
			newPosition
			promoted
		}
	}
`;

// ============================================================================
// FEATURE 026: EVENT COMMENTS, HISTORY, AND WAITLIST
// ============================================================================

/**
 * Query: Get event comments with pagination (20 per page)
 * Feature: 026-integrate-ui-components
 * FR-015: Display 20 most recent comments on initial load
 */
export const GET_EVENT_COMMENTS = gql`
	query GetEventComments($eventId: UUID!, $limit: Int = 20, $offset: Int = 0) {
		allEventComments(
			condition: { eventId: $eventId }
			first: $limit
			offset: $offset
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				eventId
				employeeId
				content
				mentions
				createdAt
				updatedAt
				employee {
					id
					displayName
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
`;

/**
 * Query: Get event history with pagination (25 per page)
 * Feature: 026-integrate-ui-components
 * FR-023: Display 25 most recent history entries
 */
export const GET_EVENT_HISTORY = gql`
	query GetEventHistory($eventId: UUID!, $limit: Int = 25, $offset: Int = 0) {
		allEventHistories(
			condition: { eventId: $eventId }
			first: $limit
			offset: $offset
			orderBy: CREATED_AT_DESC
		) {
			nodes {
				id
				eventId
				changedBy
				fieldName
				oldValue
				newValue
				changeType
				createdAt
				userByChangedBy {
					id
					displayName
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
`;

/**
 * Query: Get user's waitlist status for an event
 * Feature: 026-integrate-ui-components
 * FR-012: Display waitlist button with position
 */
export const GET_USER_WAITLIST_STATUS = gql`
	query GetUserWaitlistStatus($eventId: UUID!, $userId: UUID!) {
		allEventWaitlists(condition: { eventId: $eventId, employeeId: $userId }) {
			nodes {
				id
				position
				joinedAt
			}
		}
	}
`;

/**
 * Mutation: Create event comment
 * Feature: 026-integrate-ui-components
 * FR-016, FR-017: Add comment with @mentions and XSS sanitization
 */
export const CREATE_EVENT_COMMENT = gql`
	mutation CreateEventComment($eventId: UUID!, $employeeId: UUID!, $content: String!, $mentions: [UUID]) {
		createEventComment(
			input: {
				eventComment: { eventId: $eventId, employeeId: $employeeId, content: $content, mentions: $mentions }
			}
		) {
			eventComment {
				id
				content
				mentions
				createdAt
				employee {
					id
					displayName
				}
			}
		}
	}
`;

/**
 * Mutation: Update event comment (own comments only)
 * Feature: 026-integrate-ui-components
 * FR-020: Edit own comments only
 */
export const UPDATE_EVENT_COMMENT = gql`
	mutation UpdateEventComment($commentId: UUID!, $content: String!, $mentions: [UUID]) {
		updateEventCommentById(
			input: { id: $commentId, eventCommentPatch: { content: $content, mentions: $mentions } }
		) {
			eventComment {
				id
				content
				mentions
				updatedAt
				employee {
					id
					displayName
				}
			}
		}
	}
`;

/**
 * Mutation: Delete event comment (own comments only)
 * Feature: 026-integrate-ui-components
 * FR-020: Delete own comments only
 */
export const DELETE_EVENT_COMMENT = gql`
	mutation DeleteEventComment($commentId: UUID!) {
		deleteEventCommentById(input: { id: $commentId }) {
			deletedEventCommentId
		}
	}
`;

/**
 * Mutation: Join event waitlist
 * Feature: 026-integrate-ui-components
 * FR-012: Join waitlist when event is full
 */
export const JOIN_EVENT_WAITLIST = gql`
	mutation JoinEventWaitlist($eventId: UUID!) {
		createEventWaitlist(input: { eventWaitlist: { eventId: $eventId } }) {
			eventWaitlist {
				id
				position
				joinedAt
			}
		}
	}
`;

/**
 * Mutation: Leave event waitlist
 * Feature: 026-integrate-ui-components
 * FR-013: Leave waitlist and reorder positions
 */
export const LEAVE_EVENT_WAITLIST = gql`
	mutation LeaveEventWaitlist($eventId: UUID!, $userId: UUID!) {
		deleteEventWaitlist(input: { condition: { eventId: $eventId, employeeId: $userId } }) {
			deletedEventWaitlistId
		}
	}
`;

// ============================================================================
// TYPESCRIPT INTERFACES FOR FEATURE 026
// ============================================================================

export interface EventComment {
	id: string;
	eventId: string;
	employeeId: string;
	content: string; // XSS-sanitized plain text
	mentions: string[]; // Array of @mentioned usernames
	createdAt: string; // ISO 8601 timestamp
	updatedAt: string; // ISO 8601 timestamp
	employeeByEmployeeId: {
		id: string;
		displayName: string;
		avatarUrl?: string;
	};
}

export interface EventHistoryEntry {
	id: string;
	eventId: string;
	changedBy: string;
	fieldName: string; // e.g., "title", "startTime", "maxCapacity"
	oldValue?: string | null;
	newValue?: string | null;
	changeType: 'created' | 'updated' | 'deleted';
	createdAt: string; // ISO 8601 timestamp
	employeeByChangedBy: {
		id: string;
		displayName: string;
	};
}

export interface UserWaitlistStatus {
	isOnWaitlist: boolean;
	position: number | null; // FIFO position (1 = first in line)
	joinedAt?: string; // ISO 8601 timestamp
}

export interface CreateEventCommentInput {
	eventId: string;
	content: string; // Will be XSS-sanitized server-side
	mentions: string[]; // Extracted @usernames
}

export interface UpdateEventCommentInput {
	commentId: string;
	content: string; // Will be XSS-sanitized server-side
}

// ============================================================================
// TYPESCRIPT INTERFACES FOR FEATURE 027
// ============================================================================

/**
 * Recurrence pattern for recurring events (RFC 5545 RRULE)
 */
export interface RecurrencePattern {
	frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
	interval: number; // Every N days/weeks/months/years
	daysOfWeek: number[] | null; // 0=Sunday, 1=Monday, ..., 6=Saturday (weekly only)
	endDate: Date; // Recurrence end date (max 5 years from start)
	rruleString: string; // Generated RFC 5545 RRULE string
}

/**
 * Calendar event with recurrence support
 */
export interface CalendarEvent {
	id: string;
	nodeId: string;
	title: string;
	description?: string;
	eventType: string;
	startDate: Date; // Renamed from startTime for consistency
	endDate: Date; // Renamed from endTime for consistency
	allDay: boolean;
	location?: string;
	organizerId: string;
	organizer?: {
		id: string;
		displayName: string;
		email: string;
	};
	status: EventStatus;
	color?: string;
	isPublic: boolean;
	maxCapacity?: number;
	currentAcceptanceCount: number;
	recurrencePattern?: RecurrencePattern | null;
	recurrenceEndDate?: Date | null;
	imageUrl?: string | null;
	imageAspectRatio?: '16:9' | '9:16' | null;
	createdAt: Date;
	updatedAt: Date;
	userRsvpStatus?: RsvpStatus; // Current user's RSVP status
	reminderTime?: number | null; // Minutes before event
}

/**
 * Event attendee with scope support for recurring events
 */
export interface EventAttendeeWithScope extends EventAttendee {
	scope: 'this' | 'future' | 'all'; // RSVP scope for recurring events
}

/**
 * Notification preferences for events
 */
export interface EventNotificationPreferences {
	emailNotifications: boolean;
	pushNotifications: boolean;
	reminderDefaults: {
		enabled: boolean;
		minutesBefore: number; // Default reminder time
	};
	commentMentions: boolean;
	waitlistPromotions: boolean;
	eventUpdates: boolean;
}

/**
 * Input for creating event with recurrence
 */
export interface CreateEventFullInput {
	clientMutationId?: string;
	event: {
		title: string;
		description?: string;
		eventType: string;
		startTime: string; // ISO 8601
		endTime: string; // ISO 8601
		allDay?: boolean;
		location?: string;
		organizerId: string;
		isPublic?: boolean;
		status?: EventStatus;
		color?: string;
		maxCapacity?: number;
		recurrencePattern?: string | null; // RRULE string
		recurrenceEndDate?: string | null; // ISO 8601
		imageUrl?: string | null;
		imageAspectRatio?: '16:9' | '9:16' | null;
	};
}

/**
 * Input for updating event
 */
export interface UpdateEventFullInput {
	clientMutationId?: string;
	id: string;
	eventPatch: {
		title?: string;
		description?: string;
		eventType?: string;
		startTime?: string;
		endTime?: string;
		allDay?: boolean;
		location?: string;
		isPublic?: boolean;
		status?: EventStatus;
		color?: string;
		maxCapacity?: number;
		recurrencePattern?: string | null;
		recurrenceEndDate?: string | null;
		imageUrl?: string | null;
		imageAspectRatio?: '16:9' | '9:16' | null;
	};
}

/**
 * Input for RSVP with scope
 */
export interface RsvpToEventInput {
	clientMutationId?: string;
	id: string; // attendee ID
	eventAttendeePatch: {
		responseStatus: RsvpStatus;
		scope: 'this' | 'future' | 'all';
		respondedAt?: string;
	};
}

/**
 * Input for joining waitlist
 */
export interface JoinWaitlistInput {
	clientMutationId?: string;
	eventWaitlist: {
		eventId: string;
		employeeId: string;
	};
}

/**
 * Input for posting comment
 */
export interface PostEventCommentInput {
	clientMutationId?: string;
	eventComment: {
		eventId: string;
		employeeId: string;
		content: string; // Markdown with @mentions
		mentions: string[]; // Array of mentioned user IDs
	};
}

/**
 * Input for updating notification preferences
 */
export interface UpdateNotificationPreferencesInput {
	clientMutationId?: string;
	id: string; // user ID
	userPatch: {
		eventNotificationPreferences: EventNotificationPreferences;
	};
}

/**
 * Input for uploading event image
 */
export interface UploadEventImageInput {
	clientMutationId?: string;
	eventId: string;
	imageData: string; // Base64 encoded image
	aspectRatio: '16:9' | '9:16';
}

/**
 * Input for rescheduling event with scope
 */
export interface RescheduleEventInput {
	clientMutationId?: string;
	eventId: string;
	newStartTime: string; // ISO 8601
	newEndTime: string; // ISO 8601
	scope: 'this' | 'future' | 'all';
}

/**
 * Event update subscription payload
 */
export interface EventUpdatePayload {
	event: CalendarEvent;
	updateType: 'created' | 'updated' | 'deleted' | 'rescheduled';
	userId: string; // User who made the change
}

/**
 * Waitlist promotion subscription payload
 */
export interface WaitlistPromotionPayload {
	eventId: string;
	eventTitle: string;
	newPosition: number;
	promoted: boolean; // true if promoted to attendee
}
