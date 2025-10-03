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
 * Note: Using PostGraphile conventions - condition instead of filter
 */
export const GET_ALL_EVENTS = gql`
	query GetAllEvents(
		$first: Int = 20
		$offset: Int = 0
		$orderBy: [EventsOrderBy!] = [START_TIME_ASC]
		$condition: EventCondition
	) {
		allEvents(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
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
				createdAt
				updatedAt
				eventAttendeesByEventId {
					nodes {
						id
						employeeId
						responseStatus
					}
				}
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
				startCursor
				endCursor
			}
		}
	}
`;

/**
 * Query: Get single event by ID with attendees
 * Note: Using UUID for id parameter (not Int)
 */
export const GET_EVENT_BY_ID = gql`
	query GetEventById($id: UUID!) {
		eventById(id: $id) {
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
					createdAt
					userByEmployeeId {
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
 * Note: Using UUID for employeeId, condition instead of filter
 */
export const GET_USER_EVENTS = gql`
	query GetUserEvents(
		$employeeId: UUID!
		$first: Int = 50
		$offset: Int = 0
	) {
		allEvents(
			first: $first
			offset: $offset
			orderBy: [START_TIME_ASC]
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
				status
				color
				eventAttendeesByEventId(condition: { employeeId: $employeeId }) {
					nodes {
						responseStatus
						isRequired
						createdAt
					}
				}
			}
			totalCount
		}
	}
`;

/**
 * Query: Get upcoming events (next 30 days)
 * Note: Using condition instead of filter
 */
export const GET_UPCOMING_EVENTS = gql`
	query GetUpcomingEvents($first: Int = 10, $condition: EventCondition) {
		allEvents(
			first: $first
			condition: $condition
			orderBy: [START_TIME_ASC]
		) {
			nodes {
				id
				nodeId
				title
				startTime
				endTime
				location
				status
				isPublic
			}
			totalCount
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
 */
export const UPDATE_EVENT = gql`
	mutation UpdateEvent($input: UpdateEventInput!) {
		updateEvent(input: $input) {
			event {
				id
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
	mutation UpdateRsvpStatus($input: UpdateEventAttendeeInput!) {
		updateEventAttendee(input: $input) {
			eventAttendee {
				id
				eventId
				employeeId
				responseStatus
				respondedAt
			}
			clientMutationId
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
	id: string;
	patch: {
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
				first: params.first || 20,
				offset: params.offset || 0,
				condition: params.filter || {},
				orderBy: params.orderBy ? [params.orderBy] : ['START_TIME_ASC']
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
				events: result.data.allEvents.nodes,
				totalCount: result.data.allEvents.totalCount,
				hasNextPage: result.data.allEvents.pageInfo.hasNextPage
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

			if (!result.data || !result.data.eventById) {
				throw createErrorResponse(new Error('No data returned'), {
					type: 'graphql',
					userMessage: 'Event not found. Please try again.'
				});
			}

			// Extract return data from result.data.eventById
			return result.data.eventById;
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
				employeeId: params.employeeId, // Keep as UUID string
				first: params.first || params.limit || 50,
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
			return {
				events: result.data.allEvents.nodes,
				totalCount: result.data.allEvents.totalCount
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
				first: params.first || params.limit || 10,
				condition: params.filter || {}
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
				events: result.data.allEvents.nodes,
				totalCount: result.data.allEvents.totalCount
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
	 * Update RSVP status (employee updates own RSVP)
	 */
	async updateRsvpStatus(params: {
		attendeeId: string;
		status: RsvpStatus;
		userCredentials: UserCredentials;
	}): Promise<EventAttendee> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const input: UpdateEventAttendeeInput = {
			id: params.attendeeId,
			patch: {
				responseStatus: params.status,
				respondedAt: new Date().toISOString()
			}
		};

		const dataRequest = createDataRequest({
			operationName: 'UpdateRsvpStatus',
			variables: { input },
			userCredentials: params.userCredentials,
			timeoutMs: 5000
		});

		try {
			// Server-side mutation using toPromise()
			const result = await this.client.mutation(UPDATE_RSVP_STATUS, dataRequest.variables).toPromise();

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
					responseStatus: 'pending',
					isOrganizer: false,
					isRequired: params.isRequired || false
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
}

/**
 * Factory function to create EventsOperations instance
 */
export function createEventsOperations(client: Client): EventsOperations {
	return new EventsOperations(client);
}
