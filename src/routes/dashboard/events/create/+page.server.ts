// Event Create Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T033
// Purpose: Load initial data for event creation form

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';

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

	// Check if user has manager or admin privileges to create events
	// Allow if user has wildcard permission or sufficient role level
	const hasWildcardPermission = locals.permissions?.includes('*');
	const roleLevel = getRoleLevel(locals.user.role);

	if (!hasWildcardPermission && roleLevel < 60) {
		// Only managers and above can create events
		throw error(403, {
			message: 'Access denied. Manager privileges required to create events.'
		});
	}

	try {
		// Get date from URL parameter if provided (from calendar click)
		const dateParam = url.searchParams.get('date');
		let defaultStartTime: string;
		let defaultEndTime: string;

		if (dateParam) {
			// Use the date from the calendar click
			const clickedDate = new Date(dateParam);
			defaultStartTime = clickedDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM

			// Default end time is 1 hour after start
			const endDate = new Date(clickedDate);
			endDate.setHours(endDate.getHours() + 1);
			defaultEndTime = endDate.toISOString().slice(0, 16);
		} else {
			// Use default times (next hour)
			defaultStartTime = getDefaultStartTime();
			defaultEndTime = getDefaultEndTime();
		}

		// TODO: Fetch list of employees for attendee selection
		// const urqlClient = createUrqlClient(token);
		// const employees = await fetchEmployees(urqlClient);

		// TODO: Fetch list of departments for department-wide events
		// const departments = await fetchDepartments(urqlClient);

		return {
			user: locals.user,
			// employees: [],
			// departments: [],
			minDate: new Date().toISOString().split('T')[0], // Today's date for date picker min
			defaultStartTime,
			defaultEndTime
		};
	} catch (err: any) {
		console.error('Error loading event creation page:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load event creation form. Please try again later.'
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

// Helper to get default start time (next hour)
function getDefaultStartTime(): string {
	const now = new Date();
	now.setHours(now.getHours() + 1);
	now.setMinutes(0);
	now.setSeconds(0);
	return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
}

// Helper to get default end time (2 hours from now)
function getDefaultEndTime(): string {
	const now = new Date();
	now.setHours(now.getHours() + 2);
	now.setMinutes(0);
	now.setSeconds(0);
	return now.toISOString().slice(0, 16);
}
