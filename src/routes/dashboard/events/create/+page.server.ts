// Event Create Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T033
// Purpose: Load initial data for event creation form

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';
import { EventsOperations } from '$lib/graphql/events-operations';

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

		console.log('[Event Create Load] URL params:', { startParam, endParam, dateParam, allDayParam });

		let defaultStartTime: string;
		let defaultEndTime: string;
		let defaultAllDay: boolean = allDayParam === 'true';

		if (startParam && endParam) {
			// Use start and end times from calendar selection (drag)
			// Parse as local time (not UTC)
			defaultStartTime = parseLocalDateTime(startParam);
			defaultEndTime = parseLocalDateTime(endParam);
			console.log('[Event Create Load] Using start/end params:', { defaultStartTime, defaultEndTime });
		} else if (dateParam) {
			// Use the single date from calendar click
			// Parse as local time (not UTC)
			defaultStartTime = parseLocalDateTime(dateParam);

			// Default end time is 30 minutes after start (matches calendar slot)
			const clickedDate = parseLocalDateTimeAsDate(dateParam);
			clickedDate.setMinutes(clickedDate.getMinutes() + 30);
			defaultEndTime = formatDateTimeLocal(clickedDate);
			console.log('[Event Create Load] Using date param:', { dateParam, clickedDate, defaultStartTime, defaultEndTime });
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

// Helper to parse datetime string as local time and return datetime-local format
function parseLocalDateTime(dateTimeStr: string): string {
	// If already in correct format, return as-is
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTimeStr)) {
		return dateTimeStr;
	}

	// Remove trailing seconds and timezone info
	const normalized = dateTimeStr.replace(/Z$/, '').split('.')[0];

	// Parse components manually to create Date in local timezone
	const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);

	if (match) {
		const [, year, month, day, hours, minutes] = match;
		// Return in datetime-local format
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	// Fallback: return as-is
	return dateTimeStr;
}

// Helper to parse datetime string as a Date object in local time (for calculations)
function parseLocalDateTimeAsDate(dateTimeStr: string): Date {
	// Remove any trailing seconds or timezone info
	const normalized = dateTimeStr.replace(/Z$/, '').split('.')[0];

	// Parse components manually to avoid timezone conversion
	const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);

	if (match) {
		const [, year, month, day, hours, minutes, seconds = '0'] = match;
		// Create Date in local timezone using individual components
		return new Date(
			parseInt(year),
			parseInt(month) - 1, // Month is 0-indexed
			parseInt(day),
			parseInt(hours),
			parseInt(minutes),
			parseInt(seconds)
		);
	}

	// Fallback: parse normally (will be UTC)
	return new Date(dateTimeStr);
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

// Form actions
export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		// Check authentication
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const token = cookies.get('hr_token') || cookies.get('auth-token');
		if (!token) {
			throw redirect(303, '/login');
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

			// Create the event
			// Best practice: Send datetime with explicit timezone offset
			// This ensures PostgreSQL stores the correct UTC time
			console.log('[Event Create] Form startTime string:', startTime);
			console.log('[Event Create] Form endTime string:', endTime);

			// Get the timezone offset for the current local time
			const now = new Date();
			const tzOffset = -now.getTimezoneOffset(); // getTimezoneOffset() returns opposite sign
			const offsetHours = Math.floor(Math.abs(tzOffset) / 60);
			const offsetMinutes = Math.abs(tzOffset) % 60;
			const offsetSign = tzOffset >= 0 ? '+' : '-';
			const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

			// Append timezone offset to datetime-local values
			// This tells PostgreSQL: "this is Oct 16 midnight in MDT (UTC-6)"
			const startTimeWithTZ = `${startTime}:00${offsetString}`;
			const endTimeWithTZ = `${endTime}:00${offsetString}`;

			console.log('[Event Create] Timezone offset:', offsetString);
			console.log('[Event Create] Start time with TZ:', startTimeWithTZ);
			console.log('[Event Create] End time with TZ:', endTimeWithTZ);

			const result = await eventsOps.createEvent({
				input: {
					event: {
						title,
						description,
						eventType,
						startTime: startTimeWithTZ,
						endTime: endTimeWithTZ,
						allDay: isAllDay,
						location,
						organizerId: locals.user.id,
						isPublic,
						status: 'scheduled'
					}
				},
				userCredentials
			});

			console.log('[Event Create] Result from GraphQL:', JSON.stringify(result, null, 2));
			console.log('[Event Create] Created event startTime:', result.createEvent?.event?.startTime);
			console.log('[Event Create] Created event endTime:', result.createEvent?.event?.endTime);

			// Redirect to events list on success
			throw redirect(303, '/dashboard/events');
		} catch (err: any) {
			console.error('Error creating event:', err);

			if (err.status === 303) {
				throw err; // Re-throw redirect
			}

			return fail(500, {
				error: err.userMessage || 'Failed to create event. Please try again.'
			});
		}
	}
};
