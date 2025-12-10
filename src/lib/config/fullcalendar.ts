/**
 * FullCalendar Configuration
 * Feature: 025-events-flesh-out
 * Configures FullCalendar with RRULE plugin support for recurring events
 */

import type { CalendarOptions, DurationInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';

/**
 * Base FullCalendar configuration with RRULE support
 */
export const fullCalendarConfig: Partial<CalendarOptions> = {
	plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin],

	// Calendar views
	initialView: 'dayGridMonth',
	headerToolbar: {
		left: 'prev,next today',
		center: 'title',
		right: 'dayGridMonth,timeGridWeek,timeGridDay'
	},

	// Interaction
	editable: true,
	selectable: true,
	selectMirror: true,
	dayMaxEvents: true,

	// Timezone
	timeZone: 'local',

	// Event display
	eventDisplay: 'block',
	eventTimeFormat: {
		hour: '2-digit',
		minute: '2-digit',
		meridiem: 'short'
	},

	// Responsive
	height: 'auto',

	// RRULE Support
	// Events with rrule field will be automatically expanded
	// Example event: { title: 'Weekly Meeting', rrule: 'FREQ=WEEKLY;BYDAY=MO' }
	eventDataTransform: (eventData) => {
		// If event has duration instead of end time, calculate end
		if (eventData.duration && !eventData.end && eventData.start) {
			// Convert DateInput to Date object
			// DateInput can be: string | number | Date | number[]
			const startDate = normalizeDateInput(eventData.start);

			// Parse duration - handle DurationInput type (string, number, or Duration object)
			const durationMs = parseDurationInput(eventData.duration);
			eventData.end = new Date(startDate.getTime() + durationMs).toISOString();
		}
		return eventData;
	}
};

/**
 * Normalize DateInput to Date object
 * Handles FullCalendar's DateInput type which can be:
 * - string: ISO date string
 * - number: timestamp in milliseconds
 * - Date: already a Date object
 * - number[]: array format [year, month, date, hours?, minutes?, seconds?, ms?]
 */
function normalizeDateInput(dateInput: string | number | Date | number[]): Date {
	// Already a Date object
	if (dateInput instanceof Date) {
		return dateInput;
	}

	// String or number timestamp
	if (typeof dateInput === 'string' || typeof dateInput === 'number') {
		return new Date(dateInput);
	}

	// Array format: [year, month, date, hours?, minutes?, seconds?, ms?]
	if (Array.isArray(dateInput)) {
		const [year, month = 0, date = 1, hours = 0, minutes = 0, seconds = 0, ms = 0] = dateInput;
		// Note: month in JavaScript Date is 0-indexed, but FullCalendar passes 1-indexed months
		return new Date(year, month - 1, date, hours, minutes, seconds, ms);
	}

	// Fallback: current date
	return new Date();
}

/**
 * Parse DurationInput (string, number, or Duration object) to milliseconds
 * Handles FullCalendar's DurationInput type which can be:
 * - string: '01:00', '90m', '2h'
 * - number: milliseconds
 * - Duration object: { hours: 1, minutes: 30 }
 */
function parseDurationInput(duration: DurationInput): number {
	// Handle number (already in milliseconds)
	if (typeof duration === 'number') {
		return duration;
	}

	// Handle string formats
	if (typeof duration === 'string') {
		// Handle HH:MM format
		if (duration.includes(':')) {
			const [hours, minutes] = duration.split(':').map(Number);
			return (hours * 60 + minutes) * 60 * 1000;
		}

		// Handle XXm or XXh format
		const match = duration.match(/(\d+)([hm])/);
		if (match) {
			const value = parseInt(match[1]);
			const unit = match[2];
			if (unit === 'h') return value * 60 * 60 * 1000;
			if (unit === 'm') return value * 60 * 1000;
		}
	}

	// Handle Duration object (e.g., { hours: 1, minutes: 30 })
	if (typeof duration === 'object' && duration !== null) {
		let totalMs = 0;
		const durationObj = duration as Record<string, number>;

		if (durationObj.hours) totalMs += durationObj.hours * 60 * 60 * 1000;
		if (durationObj.minutes) totalMs += durationObj.minutes * 60 * 1000;
		if (durationObj.seconds) totalMs += durationObj.seconds * 1000;
		if (durationObj.milliseconds) totalMs += durationObj.milliseconds;

		if (totalMs > 0) return totalMs;
	}

	// Default: 1 hour
	return 60 * 60 * 1000;
}

/**
 * Generate RSVP-aware event color based on user's response
 */
export function getEventColor(rsvpStatus?: string): string {
	switch (rsvpStatus) {
		case 'accepted':
			return '#10b981'; // green-500
		case 'declined':
			return '#ef4444'; // red-500
		case 'tentative':
			return '#f59e0b'; // amber-500
		case 'pending':
		default:
			return '#6b7280'; // gray-500
	}
}

/**
 * Generate event class names based on visibility and type
 */
export function getEventClassNames(event: {
	visibility?: string;
	type?: string;
	rsvpStatus?: string;
}): string[] {
	const classes: string[] = [];

	if (event.visibility === 'private') {
		classes.push('event-private');
	}

	if (event.type) {
		classes.push(`event-type-${event.type.toLowerCase()}`);
	}

	if (event.rsvpStatus) {
		classes.push(`event-rsvp-${event.rsvpStatus}`);
	}

	return classes;
}
