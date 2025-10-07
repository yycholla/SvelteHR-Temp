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
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const timezoneOffset = parseInt(formData.get('timezoneOffset') as string);

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

			// Get the event to obtain its nodeId
			const event = await eventsOps.getEventById({
				eventId: eventId,
				userCredentials
			});

			if (!event || !event.nodeId) {
				return fail(404, { error: 'Event not found' });
			}

			// Parse datetime strings and convert to UTC with timezone offset
			const parseLocalTime = (isoStr: string, offsetMinutes: number): string => {
				// Parse the ISO string as a Date (will be in UTC)
				const date = new Date(isoStr);

				// Adjust for user's timezone offset
				// getTimezoneOffset() returns positive for west of UTC (e.g., 360 for MDT)
				// We need to add the offset to convert from user's local time to UTC
				date.setMinutes(date.getMinutes() + offsetMinutes);

				return date.toISOString();
			};

			const startTimeUTC = parseLocalTime(startTime, timezoneOffset);
			const endTimeUTC = parseLocalTime(endTime, timezoneOffset);

			// Update the event using nodeId
			await eventsOps.updateEvent({
				input: {
					nodeId: event.nodeId,
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
	}
};
