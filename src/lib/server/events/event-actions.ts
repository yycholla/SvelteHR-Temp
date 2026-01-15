import { fail } from '@sveltejs/kit';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { requireAuth } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';
import { EventsOperations } from '$lib/graphql/events-operations';
import { gql } from '@urql/svelte';
import { normalizeRsvpStatus } from '$lib/graphql/types';
import type { RequestEvent } from '@sveltejs/kit';

interface AttendeeSubset {
	id: string;
	employeeId: string;
	responseStatus: string;
}

export const eventActions = {
	updateEventTime: async (event: RequestEvent) => {
		const { request, cookies, locals } = event;

		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;

		if (!eventId || !startTime || !endTime) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			const existingEvent = await eventsOps.getEventById({
				eventId,
				userCredentials
			});

			if (!existingEvent) {
				return fail(404, { error: 'Event not found' });
			}

			await eventsOps.updateEvent({
				id: eventId,
				input: {
					startTime,
					endTime
				},
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error(
				'Error updating event time:',
				err instanceof Error ? err : new Error(String(err))
			);
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to update event. Please try again.'
			});
		}
	},

	createEvent: async (event: RequestEvent) => {
		const { request, cookies, fetch: eventFetch, locals } = event;

		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const userId = locals.user.id;

		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const isAllDay = formData.get('isAllDay') === 'on';
		const location = formData.get('location') as string;
		const eventType = formData.get('eventType') as string;
		const isPublic = formData.get('visibilityType') === 'company';
		const timezoneOffset = parseInt(formData.get('timezoneOffset') as string);

		if (!title || !startTime || !endTime) {
			return fail(400, { error: 'Title, start time, and end time are required.' });
		}

		try {
			const cookieHeader = request.headers.get('cookie') || '';
			const urqlClient = createUrqlClient(eventFetch, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			const parseLocalTime = (timeStr: string, offsetMinutes: number): Date => {
				const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
				if (!match) throw new Error('Invalid datetime format');

				const [, year, month, day, hours, minutes] = match;
				const date = new Date(
					Date.UTC(
						parseInt(year),
						parseInt(month) - 1,
						parseInt(day),
						parseInt(hours),
						parseInt(minutes)
					)
				);
				date.setMinutes(date.getMinutes() + offsetMinutes);
				return date;
			};

			const startDate = parseLocalTime(startTime, timezoneOffset);
			const endDate = parseLocalTime(endTime, timezoneOffset);

			await eventsOps.createEvent({
				input: {
					title,
					description,
					eventType,
					startTime: startDate.toISOString(),
					endTime: endDate.toISOString(),
					isAllDay,
					location,
					status: 'scheduled',
					isPublic,
					organizerId: locals.user.id
				},
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error creating event:', err instanceof Error ? err : new Error(String(err)));
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to create event. Please try again.'
			});
		}
	},

	updateEvent: async (event: RequestEvent) => {
		const { request, cookies, locals } = event;

		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const isAllDay = formData.get('isAllDay') === 'on';
		const location = formData.get('location') as string;
		const eventType = formData.get('eventType') as string;
		const isPublic = formData.get('visibilityType') === 'company';
		const timezoneOffset = parseInt(formData.get('timezoneOffset') as string);

		if (!eventId || !title || !startTime || !endTime) {
			return fail(400, { error: 'Event ID, title, start time, and end time are required.' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			const parseLocalTime = (timeStr: string, offsetMinutes: number): Date => {
				const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
				if (!match) throw new Error('Invalid datetime format');

				const [, year, month, day, hours, minutes] = match;
				const date = new Date(
					Date.UTC(
						parseInt(year),
						parseInt(month) - 1,
						parseInt(day),
						parseInt(hours),
						parseInt(minutes)
					)
				);
				date.setMinutes(date.getMinutes() + offsetMinutes);
				return date;
			};

			const startDate = parseLocalTime(startTime, timezoneOffset);
			const endDate = parseLocalTime(endTime, timezoneOffset);

			await eventsOps.updateEvent({
				id: eventId,
				input: {
					title,
					description,
					eventType,
					startTime: startDate.toISOString(),
					endTime: endDate.toISOString(),
					isAllDay,
					location,
					isPublic
				},
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error updating event:', err instanceof Error ? err : new Error(String(err)));
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to update event. Please try again.'
			});
		}
	},

	deleteEvent: async (event: RequestEvent) => {
		const { request, cookies, locals } = event; // Destructure locals here
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		logger.info('[SERVER] deleteEvent action called');

		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		logger.info('[SERVER] Deleting event with ID:', { eventId });

		if (!eventId) {
			return fail(400, { error: 'Event ID is required.' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const backendUrl = process.env.PUBLIC_API_URL || 'http://localhost:4000';
			const response = await fetch(`${backendUrl}/api/events/${eventId}`, {
				method: 'DELETE',
				headers: {
					Cookie: cookieHeader
				}
			});

			if (!response.ok) {
				if (response.status === 404) {
					return fail(404, {
						error:
							'Failed to delete event. It may have already been deleted or you do not have permission.'
					});
				}
				throw new Error(`Failed to delete event: ${response.statusText}`);
			}

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error deleting event:', err instanceof Error ? err : new Error(String(err)));
			const message =
				err instanceof Error ? err.message : 'Failed to delete event. Please try again.';
			return fail(500, {
				error: message
			});
		}
	},

	updateRsvpStatus: async (event: RequestEvent) => {
		const { request, cookies, locals } = event;

		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const userId = locals.user.id;

		requireAuth(event, {
			requiredPermissions: [
				'events:read',
				'events:read:self',
				'events:read:team',
				'events:read:all'
			]
		});

		const formData = await request.formData();
		const attendeeId = formData.get('attendeeId') as string | null;
		const eventId = formData.get('eventId') as string;
		const status = formData.get('status') as string;

		if (!eventId || !status) {
			return fail(400, { error: 'Event ID and status are required' });
		}

		const normalizedStatus = normalizeRsvpStatus(status);

		try {
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			if (attendeeId) {
				await eventsOps.updateRsvpStatus({
					attendeeId,
					status: normalizedStatus,
					userCredentials
				});
			} else {
				const CREATE_ATTENDEE_WITH_STATUS = gql`
					mutation CreateAttendeeWithStatus($input: CreateEventAttendeeInput!) {
						createEventAttendee(input: $input) {
							id
							eventId
							employeeId
							responseStatus
						}
					}
				`;

				const input = {
					eventId,
					employeeId: locals.user.id,
					responseStatus: normalizedStatus,
					isOrganizer: false,
					isRequired: false
				};

				const result = await urqlClient
					.mutation(CREATE_ATTENDEE_WITH_STATUS, { input })
					.toPromise();

				if (result.error) {
					const isDuplicateKey =
						result.error.message?.includes('event_attendees_unique') ||
						result.error.message?.includes('duplicate key');

					if (isDuplicateKey) {
						const existingEvent = await eventsOps.getEventById({
							eventId,
							userCredentials
						});

						const existingAttendee = (
							existingEvent.eventAttendees ||
							existingEvent.attendees ||
							[]
						).find((a: AttendeeSubset) => a.employeeId === userId);

						if (existingAttendee) {
							await eventsOps.updateRsvpStatus({
								attendeeId: existingAttendee.id,
								status: status as import('$lib/graphql/types').RsvpStatus,
								userCredentials
							});
						} else {
							throw new Error('Unable to update RSVP status. Please try again.');
						}
					} else {
						throw new Error(result.error.message || 'GraphQL error occurred');
					}
				}
			}

			return { success: true };
		} catch (err: unknown) {
			logger.error(
				'[SERVER] Error updating RSVP status:',
				err instanceof Error ? err : new Error(String(err))
			);
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to update RSVP status. Please try again.'
			});
		}
	},

	setEventReminder: async (event: RequestEvent) => {
		const { request, cookies, locals } = event;

		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const userId = locals.user.id;

		requireAuth(event, {
			requiredPermissions: [
				'events:read',
				'events:read:self',
				'events:read:team',
				'events:read:all'
			]
		});

		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const reminderMinutes = formData.get('reminderMinutes') as string;

		if (!eventId || !reminderMinutes) {
			return fail(400, { error: 'Event ID and reminder time are required' });
		}

		try {
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			const existingEvent = await eventsOps.getEventById({
				eventId,
				userCredentials
			});

			if (!existingEvent) {
				return fail(404, { error: 'Event not found' });
			}

			const attendee = (existingEvent.eventAttendees || existingEvent.attendees || []).find(
				(a: AttendeeSubset) => a.employeeId === userId
			);

			if (!attendee) {
				return fail(400, {
					error: 'You must RSVP to this event before setting a reminder'
				});
			}

			const minutes = parseInt(reminderMinutes);
			await eventsOps.setEventReminder({
				attendeeId: attendee.id,
				reminderMinutes: minutes === 0 ? null : minutes,
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error(
				'Error setting event reminder:',
				err instanceof Error ? err : new Error(String(err))
			);
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to set event reminder. Please try again.'
			});
		}
	}
};
