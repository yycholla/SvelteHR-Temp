// Event Edit Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T035
// Purpose: Load existing event data for editing

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { EventsOperations } from '$lib/graphql/events-operations';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ params, locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

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

		if (!event) {
			error(404, {
            				message: 'Event not found or you do not have permission to view it.'
            			});
		}

		// Check if user is the organizer or admin
		const roleLevel = getRoleLevel(locals.user.role);
		const isOrganizer = event.organizerId === locals.user.id;
		const canEditEvent = isOrganizer || roleLevel >= 100; // Organizer or Admin

		if (!canEditEvent) {
			error(403, {
            				message: 'Access denied. Only the event organizer or administrators can edit this event.'
            			});
		}

		// Format dates for datetime-local input
		const startTime = new Date(event.startTime).toISOString().slice(0, 16);
		const endTime = new Date(event.endTime).toISOString().slice(0, 16);

		// TODO: Fetch list of employees for attendee selection
		// const employees = await fetchEmployees(urqlClient);

		// TODO: Fetch list of departments for department-wide events
		// const departments = await fetchDepartments(urqlClient);

		return {
			event: {
				...event,
				startTime,
				endTime
			},
			user: locals.user,
			isOrganizer,
			minDate: new Date().toISOString().split('T')[0] // Today's date for date picker min
			// employees: [],
			// departments: []
		};
	} catch (err: any) {
		console.error('Error loading event edit page:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		error(500, {
        			message: 'Failed to load event edit form. Please try again later.'
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
