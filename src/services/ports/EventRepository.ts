// src/services/ports/EventRepository.ts
import { Result } from '$domain/Result';
import { Event, EventNotFoundError, EventValidationError, EventError } from '$domain/Event';

export interface EventFilter {
	type?: string;
	status?: string;
	upcomingOnly?: boolean;
	organizerId?: string;
	employeeId?: string; // For filtering user's events
	limit?: number;
	offset?: number;
}

export interface CreateEventData {
	title: string;
	description?: string;
	eventType: string;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	location?: string;
	organizerId: string;
	isPublic: boolean;
	status: string;
	color?: string;
}

export interface UpdateEventData {
	title?: string;
	description?: string;
	eventType?: string;
	startTime?: string;
	endTime?: string;
	isAllDay?: boolean;
	location?: string;
	isPublic?: boolean;
	status?: string;
	color?: string;
}

export interface AddAttendeeData {
	eventId: string;
	employeeId: string;
	responseStatus: string;
	isRequired?: boolean;
}

export interface UpdateAttendeeResponseData {
	attendeeId: string;
	responseStatus: string;
}

export interface SetAttendeeReminderData {
	attendeeId: string;
	reminderTime: string;
}

export interface EventRepository {
	/**
	 * Find an event by ID
	 * @returns Event if found, NotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Event, EventNotFoundError>>;

	/**
	 * Find all events with optional filtering
	 * @returns Array of events or error
	 */
	findAll(filter?: EventFilter): Promise<Result<Event[], EventError>>;

	/**
	 * Create a new event
	 * @returns Created event or validation error
	 */
	create(data: CreateEventData): Promise<Result<Event, EventValidationError>>;

	/**
	 * Update an existing event
	 * @returns Updated event or error
	 */
	update(id: string, data: UpdateEventData): Promise<Result<Event, EventError>>;

	/**
	 * Delete an event
	 * @returns Success or not found error
	 */
	delete(id: string): Promise<Result<void, EventNotFoundError>>;

	/**
	 * Add an attendee to an event
	 * @returns Success or error
	 */
	addAttendee(data: AddAttendeeData): Promise<Result<void, EventError>>;

	/**
	 * Update an attendee's RSVP response
	 * @returns Success or error
	 */
	updateAttendeeResponse(data: UpdateAttendeeResponseData): Promise<Result<void, EventError>>;

	/**
	 * Set a reminder for an attendee
	 * @returns Success or error
	 */
	setAttendeeReminder(data: SetAttendeeReminderData): Promise<Result<void, EventError>>;
}
