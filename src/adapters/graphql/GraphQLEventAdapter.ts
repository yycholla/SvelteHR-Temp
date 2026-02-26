// src/adapters/graphql/GraphQLEventAdapter.ts
import { Client } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Event,
	EventTitle,
	EventDescription,
	EventTime,
	Location,
	EventStatus,
	EventType,
	RsvpStatus,
	EventColor,
	EventAttendee,
	EventError,
	EventNotFoundError,
	EventValidationError
} from '$domain/Event';
import type {
	EventRepository,
	CreateEventData,
	UpdateEventData,
	EventFilter,
	AddAttendeeData,
	UpdateAttendeeResponseData,
	SetAttendeeReminderData
} from '$services/ports/EventRepository';
import { GET_ALL_EVENTS, GET_EVENT_BY_ID } from '$lib/graphql/events/queries';
import {
	CREATE_EVENT,
	UPDATE_EVENT,
	DELETE_EVENT,
	INVITE_ATTENDEES,
	UPDATE_RSVP_STATUS,
	UPDATE_EVENT_REMINDER
} from '$lib/graphql/events/mutations';

/**
 * GraphQL schema response shape
 */
interface GraphQLEvent {
	id: string;
	title: string;
	description?: string | null;
	eventType: string;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	location?: string | null;
	organizerId: string;
	isPublic: boolean;
	status: string;
	color?: string | null;
	createdAt: string;
	updatedAt: string;
	attendees?: Array<{
		id: string;
		employeeId: string;
		responseStatus: string;
		isRequired?: boolean;
		reminderTime?: number | null;
	}>;
}

/**
 * GraphQLEventAdapter implements EventRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLEventAdapter(urqlClient);
 * const result = await adapter.findById('event-123');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLEventAdapter implements EventRepository {
	constructor(private readonly client: Client) {}

	async findById(id: string): Promise<Result<Event, EventNotFoundError>> {
		try {
			const result = await this.client.query(GET_EVENT_BY_ID, { id }).toPromise();

			if (result.error) {
				return Result.error(new EventNotFoundError(id));
			}

			if (!result.data?.event) {
				return Result.error(new EventNotFoundError(id));
			}

			return this.mapToEvent(result.data.event);
		} catch (error) {
			return Result.error(new EventNotFoundError(id));
		}
	}

	async findAll(filter?: EventFilter): Promise<Result<Event[], EventError>> {
		try {
			// Map domain filter to GraphQL filter
			const graphqlFilter = filter
				? {
						limit: filter.limit ?? 20,
						offset: filter.offset ?? 0,
						upcomingOnly: filter.upcomingOnly
					}
				: { limit: 20, offset: 0 };

			const result = await this.client.query(GET_ALL_EVENTS, graphqlFilter).toPromise();

			if (result.error) {
				return Result.error(new EventError(result.error.message));
			}

			const events = result.data?.events ?? [];
			const mappedEvents: Event[] = [];

			// Resilient error handling: skip invalid events instead of failing
			for (const eventData of events) {
				const eventResult = this.mapToEvent(eventData);
				if (eventResult.isOk) {
					// Client-side filtering for fields not supported by backend
					if (filter?.employeeId) {
						const hasAttendee = eventResult.value.attendees.some(
							(a) => a.employeeId === filter.employeeId
						);
						if (hasAttendee) {
							mappedEvents.push(eventResult.value);
						}
					} else if (filter?.organizerId) {
						if (eventResult.value.organizerId === filter.organizerId) {
							mappedEvents.push(eventResult.value);
						}
					} else if (filter?.type) {
						if (eventResult.value.eventType.value === filter.type) {
							mappedEvents.push(eventResult.value);
						}
					} else if (filter?.status) {
						if (eventResult.value.status.value === filter.status) {
							mappedEvents.push(eventResult.value);
						}
					} else {
						mappedEvents.push(eventResult.value);
					}
				}
				// Skip invalid events (e.g., invalid title, dates, etc.)
			}

			return Result.ok(mappedEvents);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to fetch events: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(data: CreateEventData): Promise<Result<Event, EventValidationError>> {
		try {
			// Map domain data to GraphQL input
			const input = {
				title: data.title,
				description: data.description ?? '',
				eventType: data.eventType,
				startTime: data.startTime,
				endTime: data.endTime,
				isAllDay: data.isAllDay,
				location: data.location,
				organizerId: data.organizerId,
				isPublic: data.isPublic,
				status: data.status,
				color: data.color
			};

			const result = await this.client.mutation(CREATE_EVENT, { input }).toPromise();

			if (result.error) {
				return Result.error(new EventValidationError(result.error.message));
			}

			if (!result.data?.createEvent) {
				return Result.error(new EventValidationError('Failed to create event'));
			}

			return this.mapToEvent(result.data.createEvent);
		} catch (error) {
			return Result.error(
				new EventValidationError(
					`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(id: string, data: UpdateEventData): Promise<Result<Event, EventError>> {
		try {
			// Map domain data to GraphQL input (only include provided fields)
			const input: Record<string, unknown> = {};
			if (data.title !== undefined) input.title = data.title;
			if (data.description !== undefined) input.description = data.description;
			if (data.eventType !== undefined) input.eventType = data.eventType;
			if (data.startTime !== undefined) input.startTime = data.startTime;
			if (data.endTime !== undefined) input.endTime = data.endTime;
			if (data.isAllDay !== undefined) input.isAllDay = data.isAllDay;
			if (data.location !== undefined) input.location = data.location;
			if (data.isPublic !== undefined) input.isPublic = data.isPublic;
			if (data.status !== undefined) input.status = data.status;
			if (data.color !== undefined) input.color = data.color;

			const result = await this.client.mutation(UPDATE_EVENT, { id, input }).toPromise();

			if (result.error) {
				return Result.error(new EventError(result.error.message));
			}

			if (!result.data?.updateEvent) {
				return Result.error(new EventNotFoundError(id));
			}

			return this.mapToEvent(result.data.updateEvent);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, EventNotFoundError>> {
		try {
			const result = await this.client.mutation(DELETE_EVENT, { id }).toPromise();

			if (result.error) {
				return Result.error(new EventNotFoundError(id));
			}

			if (!result.data?.deleteEvent) {
				return Result.error(new EventNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new EventNotFoundError(id));
		}
	}

	async addAttendee(data: AddAttendeeData): Promise<Result<void, EventError>> {
		try {
			const input = {
				eventId: data.eventId,
				employeeId: data.employeeId,
				responseStatus: data.responseStatus,
				isOrganizer: false,
				isRequired: data.isRequired ?? false
			};

			const result = await this.client.mutation(INVITE_ATTENDEES, { input }).toPromise();

			if (result.error) {
				return Result.error(new EventError(result.error.message));
			}

			if (!result.data?.createEventAttendee) {
				return Result.error(new EventError('Failed to add attendee'));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to add attendee: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateAttendeeResponse(
		data: UpdateAttendeeResponseData
	): Promise<Result<void, EventError>> {
		try {
			const input = {
				responseStatus: data.responseStatus
			};

			const result = await this.client
				.mutation(UPDATE_RSVP_STATUS, { id: data.attendeeId, input })
				.toPromise();

			if (result.error) {
				return Result.error(new EventError(result.error.message));
			}

			if (!result.data?.updateEventAttendee) {
				return Result.error(new EventError('Failed to update RSVP'));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to update RSVP: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async setAttendeeReminder(data: SetAttendeeReminderData): Promise<Result<void, EventError>> {
		try {
			const input = {
				reminderTime: data.reminderTime
			};

			const result = await this.client
				.mutation(UPDATE_EVENT_REMINDER, { id: data.attendeeId, input })
				.toPromise();

			if (result.error) {
				return Result.error(new EventError(result.error.message));
			}

			if (!result.data?.updateEventAttendee) {
				return Result.error(new EventError('Failed to set reminder'));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new EventError(
					`Failed to set reminder: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Map GraphQL event data to domain Event entity
	 * Returns error if required fields are missing or invalid
	 */
	private mapToEvent(data: GraphQLEvent): Result<Event, EventNotFoundError> {
		try {
			// Create value objects
			const titleResult = EventTitle.create(data.title);
			if (titleResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			const descriptionResult = EventDescription.create(data.description ?? '');
			if (descriptionResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			const typeResult = EventType.create(data.eventType);
			if (typeResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			const statusResult = EventStatus.create(data.status);
			if (statusResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			const eventTimeResult = EventTime.create(new Date(data.startTime), new Date(data.endTime));
			if (eventTimeResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			const locationResult = Location.create(data.location ?? '');
			if (locationResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			const colorResult = EventColor.create(data.color ?? '#3b82f6');
			if (colorResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			// Map attendees
			const attendees: EventAttendee[] = [];
			if (data.attendees) {
				for (const att of data.attendees) {
					const rsvpResult = RsvpStatus.create(att.responseStatus);
					if (rsvpResult.isError) continue;

					const attendeeResult = EventAttendee.create({
						id: att.id,
						employeeId: att.employeeId,
						eventId: data.id,
						responseStatus: rsvpResult.value,
						isRequired: att.isRequired ?? false,
						isOrganizer: false,
						reminderTime: att.reminderTime ?? null,
						createdAt: new Date(data.createdAt),
						updatedAt: new Date(data.updatedAt)
					});
					if (attendeeResult.isOk) {
						attendees.push(attendeeResult.value);
					}
				}
			}

			const eventResult = Event.create({
				id: data.id,
				title: titleResult.value,
				description: descriptionResult.value,
				eventType: typeResult.value,
				eventTime: eventTimeResult.value,
				location: locationResult.value,
				organizerId: data.organizerId,
				isPublic: data.isPublic,
				status: statusResult.value,
				color: colorResult.value,
				isAllDay: data.isAllDay,
				createdAt: new Date(data.createdAt),
				updatedAt: new Date(data.updatedAt),
				attendees
			});

			if (eventResult.isError) {
				return Result.error(new EventNotFoundError(data.id));
			}

			return Result.ok(eventResult.value);
		} catch (error) {
			return Result.error(new EventNotFoundError(data.id));
		}
	}
}
