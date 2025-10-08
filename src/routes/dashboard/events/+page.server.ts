// Events List Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T028
// Purpose: Load events with filtering and visibility controls

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { EventsOperations } from '$lib/graphql/events-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { EventVisibilityType, EventStatus, EventType } from '$lib/graphql/types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Get user credentials for GraphQL operations
	const token = cookies.get('hr_token') || cookies.get('auth-token');
	if (!token) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	const userCredentials = {
		jwtToken: token,
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	};

	try {
		// Initialize GraphQL client and operations
		// For server-side: createUrqlClient(fetchFn?, authToken?)
		const urqlClient = createUrqlClient(undefined, token);
		const eventsOps = new EventsOperations(urqlClient);

		// Get query parameters for filtering
		const visibilityFilter = url.searchParams.get('visibility') as EventVisibilityType | null;
		const statusFilter = url.searchParams.get('status') as EventStatus | null;
		const typeFilter = url.searchParams.get('type') as EventType | null;
		const sortBy = url.searchParams.get('sort') || 'date';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const view = url.searchParams.get('view') || 'list'; // 'list' or 'calendar'

		// Determine sort order for GraphQL
		const orderByMap: Record<string, string> = {
			date: 'START_TIME_ASC',
			created: 'CREATED_AT_DESC',
			title: 'TITLE_ASC'
		};
		const orderBy = orderByMap[sortBy] || 'START_TIME_ASC';

		// Build filter for events based on actual schema fields
		// PostGraphile's condition expects direct values
		const filter: any = {};

		// Note: events table has is_public (boolean), not visibility_type
		// For now, we'll filter by status and type only
		if (statusFilter) {
			filter.status = statusFilter;
		}

		if (typeFilter) {
			filter.eventType = typeFilter;
		}

		// Fetch events visible to the user (RLS handles visibility rules)
		const eventsResult = await eventsOps.getAllEvents({
			first: limit,
			offset: (page - 1) * limit,
			filter,
			orderBy,
			userCredentials
		});

		// Fetch upcoming events without pagination for statistics
		const upcomingEventsResult = await eventsOps.getUpcomingEvents({
			limit: 1000, // Reasonable max for statistics
			filter: statusFilter ? { status: statusFilter } : {},
			userCredentials
		});

		// Fetch user's events for "My Events" tab
		const userEventsResult = await eventsOps.getUserEvents({
			employeeId: locals.user.id,
			limit: 1000,
			userCredentials
		});

		// Calculate statistics
		const stats = {
			total: eventsResult.totalCount,
			upcoming: upcomingEventsResult.events.filter(
				(e: any) => new Date(e.startTime) > new Date()
			).length,
			myEvents: userEventsResult.events.length,
			accepted: userEventsResult.events.filter((e: any) =>
				e.eventAttendeesByEventId?.nodes?.some((a: any) => a.employeeId === locals.user.id && a.responseStatus === 'accepted')
			).length
		};

		// Check if user has manager or admin privileges for event creation
		// Permissions come from JWT token in locals.permissions
		const canCreateEvents = locals.permissions?.includes('*') || locals.permissions?.includes('manage_events') || false;

		return {
			events: eventsResult.events,
			totalCount: eventsResult.totalCount,
			hasNextPage: eventsResult.hasNextPage,
			currentPage: page,
			limit,
			filters: {
				visibility: visibilityFilter,
				status: statusFilter,
				type: typeFilter,
				sortBy,
				view
			},
			statistics: stats,
			canCreateEvents,
			user: locals.user
		};
	} catch (err: any) {
		console.error('Error loading events:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load events. Please try again later.'
		});
	}
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
		super_admin: 200, // Highest level - system administrator
		admin: 100,
		hr_manager: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[role?.toLowerCase() || 'employee'] || 20;
}

// Form actions
export const actions: Actions = {
	updateEventTime: async ({ request, locals, cookies }) => {
		// Check authentication
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		const token = cookies.get('hr_token') || cookies.get('auth-token');
		if (!token) {
			return fail(401, { error: 'Authentication required' });
		}

		// Check permissions (manager or admin)
		const hasWildcardPermission = locals.permissions?.includes('*');
		const roleLevel = getRoleLevel(locals.user.role);

		if (!hasWildcardPermission && roleLevel < 60) {
			return fail(403, { error: 'Access denied. Manager privileges required.' });
		}

		// Parse form data
		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const startTime = formData.get('startTime') as string; // Already in UTC from toISOString()
		const endTime = formData.get('endTime') as string; // Already in UTC from toISOString()

		if (!eventId || !startTime || !endTime) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			const urqlClient = createUrqlClient(undefined, token);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				jwtToken: token,
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// Verify the event exists
			const event = await eventsOps.getEventById({
				eventId: eventId,
				userCredentials
			});

			if (!event) {
				return fail(404, { error: 'Event not found' });
			}

			// The client sends ISO strings that are already in UTC format (from toISOString())
			// We don't need to apply timezone offset because the conversion is already done client-side
			const startTimeUTC = startTime;
			const endTimeUTC = endTime;

			// Update the event using event ID
			await eventsOps.updateEvent({
				input: {
					id: eventId,
					eventPatch: {
						startTime: startTimeUTC,
						endTime: endTimeUTC
					}
				},
				userCredentials
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error updating event time:', err);
			return fail(500, {
				error: err.userMessage || 'Failed to update event. Please try again.'
			});
		}
	},

	createEvent: async ({ request, locals, cookies }) => {
		// Check authentication
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		const token = cookies.get('hr_token') || cookies.get('auth-token');
		if (!token) {
			return fail(401, { error: 'Authentication required' });
		}

		// Check permissions
		const hasWildcardPermission = locals.permissions?.includes('*');
		const roleLevel = getRoleLevel(locals.user.role);

		if (!hasWildcardPermission && roleLevel < 60) {
			return fail(403, { error: 'Access denied. Manager privileges required.' });
		}

		// Parse form data
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

		// Validate required fields
		if (!title || !startTime || !endTime) {
			return fail(400, { error: 'Title, start time, and end time are required.' });
		}

		try {
			const urqlClient = createUrqlClient(undefined, token);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				jwtToken: token,
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// Parse datetime-local as user's local time and convert to UTC
			const parseLocalTime = (timeStr: string, offsetMinutes: number): Date => {
				const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
				if (!match) throw new Error('Invalid datetime format');

				const [, year, month, day, hours, minutes] = match;

				// Create Date in UTC
				const date = new Date(Date.UTC(
					parseInt(year),
					parseInt(month) - 1,
					parseInt(day),
					parseInt(hours),
					parseInt(minutes)
				));

				// Adjust for user's timezone offset
				date.setMinutes(date.getMinutes() + offsetMinutes);

				return date;
			};

			const startDate = parseLocalTime(startTime, timezoneOffset);
			const endDate = parseLocalTime(endTime, timezoneOffset);

			// Convert to UTC ISO strings
			const startTimeUTC = startDate.toISOString();
			const endTimeUTC = endDate.toISOString();

			await eventsOps.createEvent({
				input: {
					event: {
						title,
						description,
						eventType,
						startTime: startTimeUTC,
						endTime: endTimeUTC,
						allDay: isAllDay,
						location,
						organizerId: locals.user.id,
						isPublic,
						status: 'scheduled'
					}
				},
				userCredentials
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error creating event:', err);
			return fail(500, {
				error: err.userMessage || 'Failed to create event. Please try again.'
			});
		}
	},

	updateEvent: async ({ request, locals, cookies }) => {
		// Check authentication
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		const token = cookies.get('hr_token') || cookies.get('auth-token');
		if (!token) {
			return fail(401, { error: 'Authentication required' });
		}

		// Parse form data
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

		// Validate required fields
		if (!eventId || !title || !startTime || !endTime) {
			return fail(400, { error: 'Event ID, title, start time, and end time are required.' });
		}

		try {
			const urqlClient = createUrqlClient(undefined, token);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				jwtToken: token,
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// Parse datetime-local as user's local time and convert to UTC
			const parseLocalTime = (timeStr: string, offsetMinutes: number): Date => {
				const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
				if (!match) throw new Error('Invalid datetime format');

				const [, year, month, day, hours, minutes] = match;

				const date = new Date(Date.UTC(
					parseInt(year),
					parseInt(month) - 1,
					parseInt(day),
					parseInt(hours),
					parseInt(minutes)
				));

				date.setMinutes(date.getMinutes() + offsetMinutes);
				return date;
			};

			const startDate = parseLocalTime(startTime, timezoneOffset);
			const endDate = parseLocalTime(endTime, timezoneOffset);

			const startTimeUTC = startDate.toISOString();
			const endTimeUTC = endDate.toISOString();

			await eventsOps.updateEvent({
				input: {
					id: eventId,
					eventPatch: {
						title,
						description,
						eventType,
						startTime: startTimeUTC,
						endTime: endTimeUTC,
						allDay: isAllDay,
						location,
						isPublic
					}
				},
				userCredentials
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error updating event:', err);
			return fail(500, {
				error: err.userMessage || 'Failed to update event. Please try again.'
			});
		}
	},

	deleteEvent: async ({ request, locals, cookies }) => {
		// Check authentication
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		const token = cookies.get('hr_token') || cookies.get('auth-token');
		if (!token) {
			return fail(401, { error: 'Authentication required' });
		}

		// Check permissions
		const hasWildcardPermission = locals.permissions?.includes('*');
		const roleLevel = getRoleLevel(locals.user.role);

		if (!hasWildcardPermission && roleLevel < 60) {
			return fail(403, { error: 'Access denied. Manager privileges required.' });
		}

		// Parse form data
		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;

		if (!eventId) {
			return fail(400, { error: 'Event ID is required.' });
		}

		try {
			const urqlClient = createUrqlClient(undefined, token);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				jwtToken: token,
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			await eventsOps.deleteEvent({
				eventId,
				userCredentials
			});

			return { success: true };
		} catch (err: any) {
			console.error('Error deleting event:', err);
			return fail(500, {
				error: err.userMessage || 'Failed to delete event. Please try again.'
			});
		}
	},

	updateRsvpStatus: async ({ request, locals, cookies }) => {
		// Check authentication
		if (!locals.user) {
			return fail(401, { error: 'Authentication required' });
		}

		const token = cookies.get('hr_token') || cookies.get('auth-token');
		if (!token) {
			return fail(401, { error: 'Authentication required' });
		}

		// Parse form data
		const formData = await request.formData();
		const attendeeId = formData.get('attendeeId') as string | null;
		const eventId = formData.get('eventId') as string;
		const status = formData.get('status') as string;

		if (!eventId || !status) {
			return fail(400, { error: 'Event ID and status are required' });
		}

		try {
			const urqlClient = createUrqlClient(undefined, token);
			const eventsOps = new EventsOperations(urqlClient);

			const userCredentials = {
				jwtToken: token,
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			if (attendeeId) {
				// Update existing attendee
				await eventsOps.updateRsvpStatus({
					attendeeId,
					status: status as any,
					userCredentials
				});
			} else {
				// Create new attendee record
				await eventsOps.inviteAttendee({
					eventId,
					employeeId: locals.user.id,
					isRequired: false,
					userCredentials
				});

				// Then update their RSVP status
				// We need to get the newly created attendee ID first
				const event = await eventsOps.getEventById({
					eventId,
					userCredentials
				});

				const newAttendee = event.eventAttendeesByEventId?.nodes?.find(
					(a: any) => a.employeeId === locals.user.id
				);

				if (newAttendee) {
					await eventsOps.updateRsvpStatus({
						attendeeId: newAttendee.id,
						status: status as any,
						userCredentials
					});
				}
			}

			return { success: true };
		} catch (err: any) {
			console.error('Error updating RSVP status:', err);
			return fail(500, {
				error: err.userMessage || 'Failed to update RSVP status. Please try again.'
			});
		}
	}
};
