import { logger } from '$lib/utils/logger';
// iCal Feed Endpoint for Events Calendar
// Generates RFC 5545 compliant iCalendar format for calendar applications

import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { GraphQLClient } from '$lib/server/graphql-client';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	// Get auth token
	const authToken = cookies.get('hr_token') || cookies.get('auth-token');
	if (!authToken || !locals.user?.id) {
		error(401, 'Authentication required');
	}

	// Optional: support filtering via query params
	const statusFilter = url.searchParams.get('status');
	const typeFilter = url.searchParams.get('type');
	const daysAhead = parseInt(url.searchParams.get('days') || '90'); // Default 90 days

	try {
		const graphqlClient = new GraphQLClient();
		graphqlClient.setToken(authToken);

		// Calculate date range
		const startDate = new Date();
		const endDate = new Date();
		endDate.setDate(endDate.getDate() + daysAhead);

		// Build filter condition
		const filterCondition: any = {};
		if (statusFilter) filterCondition.status = statusFilter;
		if (typeFilter) filterCondition.eventType = typeFilter;

		// Query events
		const eventsQuery = `
			query GetEventsForCalendar($userId: UUID!) {
				allEvents(
					orderBy: [START_TIME_ASC]
					first: 500
				) {
					nodes {
						id
						title
						description
						eventType
						startTime
						endTime
						allDay
						location
						status
						color
						isPublic
						createdAt
						updatedAt
						userByOrganizerId {
							id
							firstName
							lastName
							email
						}
						eventAttendeesByEventId(condition: { employeeId: $userId }) {
							nodes {
								responseStatus
								isRequired
							}
						}
					}
				}
			}
		`;

		const result = await graphqlClient.query(eventsQuery, {
			userId: locals.user.id
		});

		const events = result.data?.allEvents?.nodes || [];

		// Filter events within date range
		const filteredEvents = events.filter((event: any) => {
			const eventStart = new Date(event.startTime);
			return eventStart >= startDate && eventStart <= endDate;
		});

		// Generate iCal content
		const icalContent = generateICalendar(filteredEvents, locals.user);

		// Return iCal file
		return new Response(icalContent, {
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Content-Disposition': 'attachment; filename="sveltehr-events.ics"',
				'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
			}
		});
	} catch (err) {
		logger.error('Error generating iCal feed:', err as Error);
		error(500, 'Failed to generate calendar feed');
	}
};

// Generate RFC 5545 compliant iCalendar format
function generateICalendar(events: any[], user: any): string {
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//SvelteHR//Events Calendar//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'X-WR-CALNAME:SvelteHR Events',
		'X-WR-TIMEZONE:UTC',
		`X-WR-CALDESC:Events calendar for ${user.firstName || 'User'} ${user.lastName || ''}`
	];

	// Add each event
	for (const event of events) {
		lines.push(...generateVEvent(event));
	}

	lines.push('END:VCALENDAR');

	return lines.join('\r\n');
}

// Generate individual VEVENT component
function generateVEvent(event: any): string[] {
	const lines: string[] = ['BEGIN:VEVENT'];

	// Unique ID (required)
	lines.push(`UID:${event.id}@sveltehr.com`);

	// Timestamps (required)
	const now = new Date();
	lines.push(`DTSTAMP:${formatICalDate(now)}`);

	// Start and end times
	if (event.isAllDay) {
		// All-day events use VALUE=DATE format (YYYYMMDD)
		const startDate = new Date(event.startTime);
		const endDate = new Date(event.endTime);
		// Add 1 day to end date for all-day events (iCal convention)
		endDate.setDate(endDate.getDate() + 1);

		lines.push(`DTSTART;VALUE=DATE:${formatICalDateOnly(startDate)}`);
		lines.push(`DTEND;VALUE=DATE:${formatICalDateOnly(endDate)}`);
	} else {
		lines.push(`DTSTART:${formatICalDate(new Date(event.startTime))}`);
		lines.push(`DTEND:${formatICalDate(new Date(event.endTime))}`);
	}

	// Summary (title) - required, escape special characters
	lines.push(`SUMMARY:${escapeICalText(event.title)}`);

	// Description - optional
	if (event.description) {
		lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
	}

	// Location - optional
	if (event.location) {
		lines.push(`LOCATION:${escapeICalText(event.location)}`);
	}

	// Status
	const statusMap: Record<string, string> = {
		scheduled: 'CONFIRMED',
		cancelled: 'CANCELLED',
		completed: 'CONFIRMED'
	};
	lines.push(`STATUS:${statusMap[event.status] || 'CONFIRMED'}`);

	// Organizer
	if (event.userByOrganizerId) {
		const organizer = event.userByOrganizerId;
		const organizerName = `${organizer.firstName} ${organizer.lastName}`.trim();
		if (organizer.email) {
			lines.push(`ORGANIZER;CN="${organizerName}":MAILTO:${organizer.email}`);
		}
	}

	// Categories (event type)
	if (event.eventType) {
		lines.push(`CATEGORIES:${event.eventType.toUpperCase()}`);
	}

	// Color (non-standard but widely supported)
	if (event.color) {
		lines.push(`COLOR:${event.color}`);
	}

	// Last modified
	if (event.updatedAt) {
		lines.push(`LAST-MODIFIED:${formatICalDate(new Date(event.updatedAt))}`);
	}

	// Created
	if (event.createdAt) {
		lines.push(`CREATED:${formatICalDate(new Date(event.createdAt))}`);
	}

	// Visibility
	lines.push(`CLASS:${event.isPublic ? 'PUBLIC' : 'PRIVATE'}`);

	lines.push('END:VEVENT');

	return lines;
}

// Format date to iCal format: YYYYMMDDTHHMMSSZ
function formatICalDate(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const hours = String(date.getUTCHours()).padStart(2, '0');
	const minutes = String(date.getUTCMinutes()).padStart(2, '0');
	const seconds = String(date.getUTCSeconds()).padStart(2, '0');

	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Format date-only to iCal format: YYYYMMDD
function formatICalDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}${month}${day}`;
}

// Escape special characters for iCal text fields
function escapeICalText(text: string): string {
	return text
		.replace(/\\/g, '\\\\') // Backslash
		.replace(/;/g, '\\;') // Semicolon
		.replace(/,/g, '\\,') // Comma
		.replace(/\n/g, '\\n') // Newline
		.replace(/\r/g, ''); // Remove carriage return
}
