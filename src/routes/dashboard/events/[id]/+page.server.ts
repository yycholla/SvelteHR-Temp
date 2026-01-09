// Event Detail Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T029
// Purpose: Load single event details with attendees and RSVP status
// Refactored: Phase 2 - Using Phase 1 Foundation utilities

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { StatisticsCalculator } from '$lib/server/analytics';
import { GET_EVENT_BY_ID } from '$lib/graphql/events/queries';
import { normalizeRsvpStatus } from '$lib/graphql/types';
import { EventsOperations } from '$lib/graphql/events-operations';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, [
		'events:read',
		'events:read:self',
		'events:read:team',
		'events:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { params } = event;

		// Fetch event details using UnifiedGraphQLClient
		const eventData = await client.query(
			GET_EVENT_BY_ID,
			{ id: params.id },
			{
				operationName: 'GetEventById',
				errorMessage: 'Failed to load event details',
				dataPath: 'event'
			}
		);

		if (!eventData) {
			error(404, {
				message: 'Event not found or you do not have permission to view it.'
			});
		}

		logger.info('[Event Detail] Retrieved event', {
			id: eventData.id,
			title: eventData.title,
			startTime: eventData.startTime,
			endTime: eventData.endTime
		});

		// Determine user's RSVP status
		const attendees = eventData.attendees || [];
		const userAttendee = attendees.find((a: any) => a.employeeId === loader.getUserId());

		// Normalize RSVP status
		const userRsvpStatus = normalizeRsvpStatus(userAttendee?.responseStatus);

		logger.info('[SERVER LOAD] User RSVP status', {
			userAttendeeExists: !!userAttendee,
			rawStatus: userAttendee?.responseStatus,
			normalizedStatus: userRsvpStatus
		});

		// Check if user is the organizer
		const isOrganizer = eventData.organizerId === loader.getUserId();

		// Check if user can edit/delete (organizer or admin)
		const roleLevel = getRoleLevel(loader.getUserRole());
		const canManageEvent = isOrganizer || roleLevel >= 100; // Organizer or Admin

		// Calculate RSVP statistics using Phase 1 helper
		const rsvpStats = StatisticsCalculator.forEventAttendees(attendees);

		// Check if event is in the past
		const isPastEvent = new Date(eventData.endTime) < new Date();

		return {
			event: eventData,
			userRsvpStatus,
			isOrganizer,
			canManageEvent,
			rsvpStats,
			isPastEvent
		};
	});
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
		super_admin: 200,
		admin: 100,
		hr_manager: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[role?.toLowerCase() || 'employee'] || 20;
}

export const actions: Actions = {
	delete: async (event) => {
		const { params, cookies } = event;

		// Use RBACDataLoader for permission checking
		const loader = new RBACDataLoader(event, [
			'events:write',
			'events:write:self',
			'events:write:team',
			'events:write:all'
		]);

		return loader.loadWithClient(async (client) => {
			// Fetch event to check permissions
			const eventData = await client.query(
				GET_EVENT_BY_ID,
				{ id: params.id },
				{
					operationName: 'GetEventById',
					errorMessage: 'Failed to load event for deletion',
					dataPath: 'event'
				}
			);

			if (!eventData) {
				return fail(404, {
					error: 'Event not found'
				});
			}

			// Check if user can delete (organizer or admin)
			const isOrganizer = eventData.organizerId === loader.getUserId();
			const roleLevel = getRoleLevel(loader.getUserRole());
			const canDelete = isOrganizer || roleLevel >= 100;

			if (!canDelete) {
				return fail(403, {
					error: 'You do not have permission to delete this event'
				});
			}

			// Use REST API for deletion
			const urqlClient = createUrqlClient();
			const eventsOps = new EventsOperations(urqlClient);

			// We need to use the EventsOperations delete method
			// For now, fall back to REST API
			const cookieHeader = serializeCookies(cookies);
			const backendUrl = process.env.PUBLIC_API_URL || 'http://localhost:4000';

			try {
				const response = await fetch(`${backendUrl}/api/events/${params.id}`, {
					method: 'DELETE',
					headers: {
						Cookie: cookieHeader
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
				logger.error('Error deleting event:', err as Error);

				// If it's a redirect, rethrow it
				if (err.status === 303) {
					throw err;
				}

				return fail(500, {
					error: err.message || 'Failed to delete event. Please try again.'
				});
			}
		});
	}
};
