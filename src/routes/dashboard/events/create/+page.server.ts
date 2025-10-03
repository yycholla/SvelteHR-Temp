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
		// Get date/time parameters from URL (from calendar click or selection)
		const startParam = url.searchParams.get('start');
		const endParam = url.searchParams.get('end');
		const dateParam = url.searchParams.get('date'); // Fallback for single click
		const allDayParam = url.searchParams.get('allDay');

		let defaultStartTime: string;
		let defaultEndTime: string;
		let defaultAllDay: boolean = allDayParam === 'true';

		if (startParam && endParam) {
			// Use start and end times from calendar selection (drag)
			defaultStartTime = formatDateTimeLocal(new Date(startParam));
			defaultEndTime = formatDateTimeLocal(new Date(endParam));
		} else if (dateParam) {
			// Use the single date from calendar click
			const clickedDate = new Date(dateParam);
			defaultStartTime = formatDateTimeLocal(clickedDate);

			// Default end time is 30 minutes after start (matches calendar slot)
			const endDate = new Date(clickedDate);
			endDate.setMinutes(endDate.getMinutes() + 30);
			defaultEndTime = formatDateTimeLocal(endDate);
		} else {
			// Use default times (next hour)
			defaultStartTime = getDefaultStartTime();
			defaultEndTime = getDefaultEndTime();
			defaultAllDay = false;
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
			defaultEndTime,
			defaultAllDay
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

// Helper to format Date to datetime-local input format (local time)
function formatDateTimeLocal(date: Date): string {
	// Get local time components
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper to get default start time (next hour)
function getDefaultStartTime(): string {
	const now = new Date();
	now.setHours(now.getHours() + 1);
	now.setMinutes(0);
	now.setSeconds(0);
	return formatDateTimeLocal(now);
}

// Helper to get default end time (30 minutes after start)
function getDefaultEndTime(): string {
	const now = new Date();
	now.setHours(now.getHours() + 1);
	now.setMinutes(30); // 30 minutes after start time
	now.setSeconds(0);
	return formatDateTimeLocal(now);
}
