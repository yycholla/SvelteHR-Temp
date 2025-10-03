// Event Detail Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T029
// Purpose: Load single event details with attendees and RSVP status

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { EventsOperations } from '$lib/graphql/events-operations';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ params, locals, url, cookies }) => {
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

		// Fetch event details
		const event = await eventsOps.getEventById({
			eventId: params.id,
			userCredentials
		});

		if (!event) {
			throw error(404, {
				message: 'Event not found or you do not have permission to view it.'
			});
		}

		// Determine user's RSVP status
		const attendees = event.eventAttendeesByEventId?.nodes || [];
		const userAttendee = attendees.find((a: any) => a.employeeId === locals.user.id);
		const userRsvpStatus = userAttendee?.responseStatus || 'no_response';

		// Check if user is the organizer
		const isOrganizer = event.organizerId === locals.user.id;

		// Check if user can edit/delete (organizer or admin)
		const roleLevel = getRoleLevel(locals.user.role);
		const canManageEvent = isOrganizer || roleLevel >= 100; // Organizer or Admin

		// Calculate RSVP statistics
		const rsvpStats = {
			accepted: attendees.filter((a: any) => a.responseStatus === 'accepted').length || 0,
			declined: attendees.filter((a: any) => a.responseStatus === 'declined').length || 0,
			tentative: attendees.filter((a: any) => a.responseStatus === 'tentative').length || 0,
			pending: attendees.filter((a: any) => a.responseStatus === 'pending').length || 0,
			noResponse:
				attendees.filter((a: any) => a.responseStatus === 'no_response').length || 0,
			total: attendees.length || 0
		};

		// Check if event is in the past
		const isPastEvent = new Date(event.endTime) < new Date();

		return {
			event,
			userRsvpStatus,
			isOrganizer,
			canManageEvent,
			rsvpStats,
			isPastEvent,
			user: locals.user
		};
	} catch (err: any) {
		console.error('Error loading event details:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load event details. Please try again later.'
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

export const actions: Actions = {
	delete: async ({ params, locals, cookies }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const token = cookies.get('hr_token') || cookies.get('auth-token');
		if (!token) {
			throw redirect(303, '/login');
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
			const urqlClient = createUrqlClient(undefined, token);
			const eventsOps = new EventsOperations(urqlClient);

			// First, get the event to check permissions
			const event = await eventsOps.getEventById({
				eventId: params.id,
				userCredentials
			});

			if (!event) {
				return fail(404, {
					error: 'Event not found'
				});
			}

			// Check if user can delete (organizer or admin)
			const isOrganizer = event.organizerId === locals.user.id;
			const roleLevel = getRoleLevel(locals.user.role);
			const canDelete = isOrganizer || roleLevel >= 100;

			if (!canDelete) {
				return fail(403, {
					error: 'You do not have permission to delete this event'
				});
			}

			// Delete the event using nodeId
			await eventsOps.deleteEvent({
				nodeId: event.nodeId,
				userCredentials
			});

			// Redirect to events list
			throw redirect(303, '/dashboard/events');
		} catch (err: any) {
			console.error('Error deleting event:', err);

			// If it's a redirect, rethrow it
			if (err.status === 303) {
				throw err;
			}

			return fail(500, {
				error: err.userMessage || 'Failed to delete event. Please try again.'
			});
		}
	}
};
