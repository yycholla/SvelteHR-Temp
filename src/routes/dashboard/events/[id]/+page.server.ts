// Event Detail Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T029
// Purpose: Load single event details with attendees and RSVP status

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { EventsOperations } from '$lib/graphql/events-operations';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ params, locals, url, cookies }) => {
	// Check authentication and permissions
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	PermissionChecks.eventsRead({ params, locals, url, cookies } as any);

	// T036: Session-based authentication - jwtToken not needed
	const userCredentials = {
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	};

	try {
		// Initialize GraphQL client and operations
		// T036: Session-based authentication
		const urqlClient = createUrqlClient();
		const eventsOps = new EventsOperations(urqlClient);

		// Fetch event details
		const event = await eventsOps.getEventById({
			eventId: params.id,
			userCredentials
		});

		console.log('[Event Detail] Retrieved event:', JSON.stringify({
			id: event?.id,
			title: event?.title,
			startTime: event?.startTime,
			endTime: event?.endTime,
			startTimeType: typeof event?.startTime
		}, null, 2));

		if (!event) {
			error(404, {
            				message: 'Event not found or you do not have permission to view it.'
            			});
		}

		// Determine user's RSVP status
		// NOTE: Using Rust GraphQL schema - direct array access (no .nodes wrapper)
		const attendees = event.eventAttendees || event.attendees || [];
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
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		error(500, {
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
	delete: async (event) => {
		const { params, locals, cookies, fetch } = event;

		// Check authentication and permissions
		PermissionChecks.eventsWrite(event);

		// T036: Session-based authentication - jwtToken not needed
		const userCredentials = {
			userId: locals.user.id,
			roles: locals.roles || [],
			permissions: locals.permissions || [],
			isAuthenticated: true,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
		};

		try {
			// Initialize GraphQL client and operations for permission checking
			const urqlClient = createUrqlClient();
			const eventsOps = new EventsOperations(urqlClient);

			// First, get the event to check permissions
			const eventData = await eventsOps.getEventById({
				eventId: params.id,
				userCredentials
			});

			if (!eventData) {
				return fail(404, {
					error: 'Event not found'
				});
			}

			// Check if user can delete (organizer or admin)
			const isOrganizer = eventData.organizerId === locals.user.id;
			const roleLevel = getRoleLevel(locals.user.role);
			const canDelete = isOrganizer || roleLevel >= 100;

			if (!canDelete) {
				return fail(403, {
					error: 'You do not have permission to delete this event'
				});
			}

			// Use REST API for deletion
			const cookieHeader = serializeCookies(cookies);
			const backendUrl = process.env.PUBLIC_API_URL || 'http://localhost:4000';
			
			const response = await fetch(`${backendUrl}/api/events/${params.id}`, {
				method: 'DELETE',
				headers: {
					'Cookie': cookieHeader
				}
			});

			if (!response.ok) {
				if (response.status === 404) {
					return fail(404, {
						error: 'Failed to delete event. It may have already been deleted.'
					});
				}
				throw new Error(`Failed to delete event: ${response.statusText}`);
			}

			// Redirect to events list
			redirect(303, '/dashboard/events');
		} catch (err: any) {
			console.error('Error deleting event:', err);

			// If it's a redirect, rethrow it
			if (err.status === 303) {
				throw err;
			}

			return fail(500, {
				error: err.message || 'Failed to delete event. Please try again.'
			});
		}
	}
};
