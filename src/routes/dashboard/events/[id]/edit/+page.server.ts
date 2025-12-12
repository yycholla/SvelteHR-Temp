// Event Edit Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T035
// Purpose: Load existing event data for editing
// Refactored: Phase 2 - Using Phase 1 Foundation utilities

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { GET_EVENT_BY_ID } from '$lib/graphql/events/queries';

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
				errorMessage: 'Failed to load event for editing',
				dataPath: 'event'
			}
		);

		if (!eventData) {
			error(404, {
				message: 'Event not found or you do not have permission to view it.'
			});
		}

		// Check if user is the organizer or admin
		const roleLevel = getRoleLevel(loader.getUserRole());
		const isOrganizer = eventData.organizerId === loader.getUserId();
		const canEditEvent = isOrganizer || roleLevel >= 100; // Organizer or Admin

		if (!canEditEvent) {
			error(403, {
				message: 'Access denied. Only the event organizer or administrators can edit this event.'
			});
		}

		// Format dates for datetime-local input
		const startTime = new Date(eventData.startTime).toISOString().slice(0, 16);
		const endTime = new Date(eventData.endTime).toISOString().slice(0, 16);

		// TODO: Fetch list of employees for attendee selection
		// const employees = await client.query(GET_EMPLOYEES, ...);

		// TODO: Fetch list of departments for department-wide events
		// const departments = await client.query(GET_DEPARTMENTS, ...);

		return {
			event: {
				...eventData,
				startTime,
				endTime
			},
			isOrganizer,
			minDate: new Date().toISOString().split('T')[0] // Today's date for date picker min
			// employees: [],
			// departments: []
		};
	});
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
