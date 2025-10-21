/**
 * FullCalendar Configuration
 * Feature: 025-events-flesh-out
 * Configures FullCalendar with RRULE plugin support for recurring events
 */

import type { CalendarOptions } from '@fullcalendar/core';
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
		if (eventData.duration && !eventData.end) {
			const start = new Date(eventData.start);
			const durationMs = parseDuration(eventData.duration);
			eventData.end = new Date(start.getTime() + durationMs).toISOString();
		}
		return eventData;
	}
};

/**
 * Parse duration string (e.g., '01:00' or '90m') to milliseconds
 */
function parseDuration(duration: string): number {
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

	return 60 * 60 * 1000; // Default 1 hour
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
