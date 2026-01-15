// Event Create Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T033
// Purpose: Load initial data for event creation form
// Refactored: Phase 2 - Using Phase 1 Foundation utilities

import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { EventsOperations } from '$lib/graphql/events-operations';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, [
		'events:write',
		'events:write:self',
		'events:write:team',
		'events:write:all'
	]);

	return loader.loadWithClient(async () => {
		const { url } = event;
		const params = new QueryParamExtractor(url);

		// Get date/time parameters from URL (from calendar click or selection)
		const startParam = params.getString('start');
		const endParam = params.getString('end');
		const dateParam = params.getString('date'); // Fallback for single click
		const defaultAllDay = params.getBoolean('allDay', false);

		let defaultStartTime: string;
		let defaultEndTime: string;

		if (startParam && endParam) {
			// Use start and end times from calendar selection (drag)
			// Parse as local time (not UTC)
			defaultStartTime = parseLocalDateTime(startParam);
			defaultEndTime = parseLocalDateTime(endParam);
		} else if (dateParam) {
			// Use the single date from calendar click
			// Parse as local time (not UTC)
			defaultStartTime = parseLocalDateTime(dateParam);

			// Default end time is 30 minutes after start (matches calendar slot)
			const clickedDate = parseLocalDateTimeAsDate(dateParam);
			clickedDate.setMinutes(clickedDate.getMinutes() + 30);
			defaultEndTime = formatDateTimeLocal(clickedDate);
		} else {
			// Use default times (next hour)
			defaultStartTime = getDefaultStartTime();
			defaultEndTime = getDefaultEndTime();
		}

		// TODO: Fetch list of employees for attendee selection
		// const employees = await client.query(GET_EMPLOYEES, ...);

		// TODO: Fetch list of departments for department-wide events
		// const departments = await client.query(GET_DEPARTMENTS, ...);

		return {
			// employees: [],
			// departments: [],
			minDate: new Date().toISOString().split('T')[0], // Today's date for date picker min
			defaultStartTime,
			defaultEndTime,
			defaultAllDay
		};
	});
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
		system_admin: 200, // Highest level - system administrator
		super_admin: 200, // Alias for system_admin
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
	default: async (event) => {
		const loader = new RBACDataLoader(event, [
			'events:write',
			'events:write:self',
			'events:write:team',
			'events:write:all'
		]);

		const { request, fetch: eventFetch } = event;

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
			// Session-based authentication - pass fetch and cookies to forward session
			const cookieHeader = request.headers.get('cookie') || '';
			const urqlClient = createUrqlClient(eventFetch, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			// Parse datetime-local as user's local time and convert to UTC
			const parseLocalTime = (timeStr: string, offsetMinutes: number): Date => {
				const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
				if (!match) throw new Error('Invalid datetime format');

				const [, year, month, day, hours, minutes] = match;

				// Create Date in UTC (server timezone)
				const date = new Date(
					Date.UTC(
						parseInt(year),
						parseInt(month) - 1, // 0-indexed
						parseInt(day),
						parseInt(hours),
						parseInt(minutes)
					)
				);

				// Adjust for user's timezone offset
				// getTimezoneOffset() returns positive for west of UTC (e.g., 360 for MDT)
				// So we ADD the offset to convert from user's local time to UTC
				date.setMinutes(date.getMinutes() + offsetMinutes);

				return date;
			};

			const startDate = parseLocalTime(startTime, timezoneOffset);
			const endDate = parseLocalTime(endTime, timezoneOffset);

			// Convert to UTC ISO strings
			const startTimeUTC = startDate.toISOString();
			const endTimeUTC = endDate.toISOString();

			// Session-based authentication credentials
			const userCredentials = {
				userId: loader.getUserId(),
				roles: loader['locals'].roles || [],
				permissions: loader['locals'].permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// Create the event
			const result = await eventsOps.createEvent({
				input: {
					title,
					description,
					eventType,
					startTime: startTimeUTC,
					endTime: endTimeUTC,
					isAllDay,
					location,
					status: 'scheduled',
					isPublic,
					organizerId: loader.getUserId()
				},
				userCredentials
			});

			// Redirect to events list on success
			redirect(303, '/dashboard/events');
		} catch (err: unknown) {
			logger.error('Error creating event:', err as Error);

			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err; // Re-throw redirect
			}

			return fail(500, {
				error:
					(err &&
					typeof err === 'object' &&
					'userMessage' in err &&
					typeof err.userMessage === 'string'
						? err.userMessage
						: null) || 'Failed to create event. Please try again.'
			});
		}
	}
};
