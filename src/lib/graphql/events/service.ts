// Events Operations Service
// Migrated from events-operations.ts

import { Client } from '@urql/core';
import type { UserCredentials } from '$lib/models/data-request';
import type {
	CreateEventAttendeeInput,
	CreateEventInput,
	Event,
	EventAttendee,
	RsvpStatus,
	UpdateEventInput
} from './types';
import {
	GET_ALL_EVENTS,
	GET_EVENT_BY_ID,
	GET_PENDING_REMINDERS,
	GET_UPCOMING_EVENTS,
	GET_USER_EVENTS
} from './queries';
import {
	CREATE_EVENT,
	CREATE_EVENT_NOTIFICATION,
	DELETE_EVENT,
	INVITE_ATTENDEES,
	UPDATE_EVENT,
	UPDATE_EVENT_REMINDER,
	UPDATE_RSVP_STATUS
} from './mutations';
import { BaseOperations } from '$lib/graphql/base-operations';
import { validateEventInput as validate } from './utils';
import { createErrorResponse } from '$lib/models/error-response'; // Keep for validation errors

/**
 * T013: Events Operations with Multi-Tier Visibility and RSVP
 * Migration: ✅ Fully migrated to Rust idiomatic patterns
 */
export class EventsOperations extends BaseOperations {
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
		const events = await this.execute<Event[]>({
			query: GET_ALL_EVENTS,
			variables: {
				limit: params.first || 20,
				offset: params.offset || 0,
				upcomingOnly: params.filter?.upcomingOnly || false
			},
			userCredentials: params.userCredentials,
			operationName: 'GetAllEvents',
			dataPath: 'events',
			errorMessage: 'Failed to load events. Please try again.'
		});

		return {
			events: events || [],
			totalCount: events?.length || 0,
			hasNextPage: false
		};
	}

	/**
	 * Get single event by ID with attendees
	 * Migration: ✅ Updated to use direct access (no nesting)
	 */
	async getEventById(params: {
		eventId: string;
		userCredentials: UserCredentials;
	}): Promise<Event> {
		return this.execute<Event>({
			query: GET_EVENT_BY_ID,
			variables: { id: params.eventId },
			userCredentials: params.userCredentials,
			operationName: 'GetEventById',
			dataPath: 'event',
			errorMessage: 'Operation failed. Please try again.'
		});
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
		const allEvents = await this.execute<Event[]>({
			query: GET_USER_EVENTS,
			variables: {
				limit: params.first || params.limit || 50,
				offset: params.offset || 0
			},
			userCredentials: params.userCredentials,
			operationName: 'GetUserEvents',
			dataPath: 'events',
			errorMessage: 'Operation failed. Please try again.'
		});

		// Filter events by employeeId client-side (backend gap)
		const filteredEvents = params.employeeId
			? (allEvents || []).filter((e: any) =>
					e.attendees?.some((a: any) => a.employeeId === params.employeeId)
				)
			: allEvents || [];

		return {
			events: filteredEvents,
			totalCount: filteredEvents.length
		};
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
		const events = await this.execute<Event[]>({
			query: GET_UPCOMING_EVENTS,
			variables: {
				limit: params.first || params.limit || 10,
				upcomingOnly: true
			},
			userCredentials: params.userCredentials,
			operationName: 'GetUpcomingEvents',
			dataPath: 'events',
			errorMessage: 'Operation failed. Please try again.'
		});

		return {
			events: events || [],
			totalCount: events?.length || 0
		};
	}

	/**
	 * Create event (manager/admin only)
	 * Migration: ✅ Updated to use direct input (no nesting)
	 */
	async createEvent(params: {
		input: CreateEventInput;
		userCredentials: UserCredentials;
	}): Promise<Event> {
		// Validate input
		const validation = validate(params.input);
		if (!validation.valid) {
			throw createErrorResponse(new Error(validation.errors.join(', ')), {
				type: 'validation',
				userMessage: validation.errors.join(', ')
			});
		}

		return this.execute<Event>({
			query: CREATE_EVENT,
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			operationName: 'CreateEvent',
			dataPath: 'createEvent',
			errorMessage: 'Operation failed. Please try again.'
		});
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
		return this.execute<Event>({
			query: UPDATE_EVENT,
			variables: { id: params.id, input: params.input },
			userCredentials: params.userCredentials,
			operationName: 'UpdateEvent',
			dataPath: 'updateEvent',
			errorMessage: 'Operation failed. Please try again.'
		});
	}

	/**
	 * Delete event (organizer or admin)
	 * Migration: ✅ Updated to use id param, returns Boolean
	 */
	async deleteEvent(params: { id: string; userCredentials: UserCredentials }): Promise<boolean> {
		return this.execute<boolean>({
			query: DELETE_EVENT,
			variables: { id: params.id },
			userCredentials: params.userCredentials,
			operationName: 'DeleteEvent',
			dataPath: 'deleteEvent',
			errorMessage: 'Operation failed. Please try again.'
		});
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
		return this.execute<any>({
			query: UPDATE_EVENT_REMINDER,
			variables: {
				id: params.attendeeId,
				input: {
					reminderTime: params.reminderMinutes?.toString()
				}
			},
			userCredentials: params.userCredentials,
			operationName: 'UpdateEventReminder',
			dataPath: 'updateEventAttendee',
			errorMessage: 'Failed to set event reminder. Please try again.'
		});
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
		return this.execute<EventAttendee>({
			query: UPDATE_RSVP_STATUS,
			variables: {
				id: params.attendeeId,
				input: {
					responseStatus: params.status
				}
			},
			userCredentials: params.userCredentials,
			operationName: 'UpdateRsvpStatus',
			dataPath: 'updateEventAttendee',
			errorMessage: 'Failed to update RSVP. Please try again.'
		});
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
		const results: EventAttendee[] = [];

		// This loop is still needed as we might want to invite multiple people individually
		// or batch them if the API supported it. Assuming individual invites for now.
		for (const employeeId of params.employeeIds) {
			const input = {
				eventId: params.eventId,
				employeeId,
				responseStatus: 'pending',
				isOrganizer: false,
				isRequired: params.isRequired || false
			};

			const attendee = await this.execute<EventAttendee>({
				query: INVITE_ATTENDEES,
				variables: { input },
				userCredentials: params.userCredentials,
				operationName: 'InviteAttendees',
				dataPath: 'createEventAttendee',
				errorMessage: 'Failed to invite attendee. Please try again.'
			});
			results.push(attendee);
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
	async getPendingReminders(params: { userCredentials: UserCredentials }): Promise<any[]> {
		const allAttendees = await this.execute<any[]>({
			query: GET_PENDING_REMINDERS,
			variables: { limit: 1000 },
			userCredentials: params.userCredentials,
			operationName: 'GetPendingReminders',
			dataPath: 'eventAttendees',
			errorMessage: 'Error fetching pending reminders' // Note: Original code just logged error and returned [], BaseOperations throws.
			// If we want to return [] on error, we'd need to try/catch here.
			// But standardized error handling suggests throwing is better for the UI to handle.
			// However, for scheduler/background tasks, maybe we want to catch.
			// Let's stick to the pattern of throwing for now as it's cleaner.
		});

		// Filter client-side for accepted/tentative status
		return (allAttendees || []).filter(
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
		try {
			const notification = await this.execute<any>({
				query: CREATE_EVENT_NOTIFICATION,
				variables: {
					input: {
						recipientId: params.userId,
						title: 'Event Reminder',
						message: params.message,
						readStatus: false
					}
				},
				userCredentials: params.userCredentials,
				operationName: 'CreateEventNotification',
				dataPath: 'createNotification',
				errorMessage: 'Error creating notification'
			});

			return {
				success: true,
				notificationId: notification?.id
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
