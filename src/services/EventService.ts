// src/services/EventService.ts
import { Result } from '$domain/Result';
import { Event, EventNotFoundError, EventValidationError, EventError } from '$domain/Event';
import type {
	EventRepository,
	CreateEventData,
	UpdateEventData,
	EventFilter,
	AddAttendeeData,
	UpdateAttendeeResponseData,
	SetAttendeeReminderData
} from './ports/EventRepository';

export class EventService {
	constructor(private readonly repository: EventRepository) {}

	/**
	 * Get an event by ID
	 */
	async getEventById(id: string): Promise<Result<Event, EventNotFoundError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to fetch event: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<Event, EventNotFoundError>;
		}
	}

	/**
	 * Get all events with optional filtering
	 */
	async getAllEvents(filter?: EventFilter): Promise<Result<Event[], EventError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to fetch events: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new event
	 */
	async createEvent(data: CreateEventData): Promise<Result<Event, EventValidationError>> {
		try {
			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new EventValidationError(
					`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update an existing event
	 */
	async updateEvent(id: string, data: UpdateEventData): Promise<Result<Event, EventError>> {
		try {
			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete an event
	 */
	async deleteEvent(id: string): Promise<Result<void, EventNotFoundError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<void, EventNotFoundError>;
		}
	}

	/**
	 * Add an attendee to an event
	 */
	async addAttendee(data: AddAttendeeData): Promise<Result<void, EventError>> {
		try {
			return await this.repository.addAttendee(data);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to add attendee: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update an attendee's RSVP status
	 */
	async updateRsvp(data: UpdateAttendeeResponseData): Promise<Result<void, EventError>> {
		try {
			return await this.repository.updateAttendeeResponse(data);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to update RSVP: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Set a reminder for an event attendee
	 */
	async setReminder(data: SetAttendeeReminderData): Promise<Result<void, EventError>> {
		try {
			return await this.repository.setAttendeeReminder(data);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to set reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get upcoming events
	 */
	async getUpcomingEvents(limit?: number): Promise<Result<Event[], EventError>> {
		try {
			return await this.repository.findAll({
				upcomingOnly: true,
				limit: limit || 10
			});
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to fetch upcoming events: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get events for a specific user (where they are an attendee)
	 */
	async getUserEvents(employeeId: string, limit?: number): Promise<Result<Event[], EventError>> {
		try {
			return await this.repository.findAll({
				employeeId,
				limit: limit || 50
			});
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to fetch user events: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
