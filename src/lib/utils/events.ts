// Event Utility Functions
// Feature: 019-we-need-to - Task T018
// Purpose: Business logic helpers for event operations

import type {
	Event,
	EventVisibilityType,
	RsvpStatus,
	EventStatus
} from '$lib/graphql/types';

/**
 * Check if a user can view an event based on visibility rules
 * @param event - The event to check
 * @param userId - Current user's employee ID
 * @param userDepartmentId - Current user's department ID
 * @returns true if user can view the event
 */
export function canUserViewEvent(
	event: Event,
	userId: string,
	userDepartmentId: string | null
): boolean {
	// Company-wide events are visible to all authenticated users
	if (event.visibilityType === 'company') {
		return true;
	}

	// Department events visible to department members
	if (event.visibilityType === 'department') {
		return event.departmentId === userDepartmentId;
	}

	// Specific people events visible to invited attendees
	if (event.visibilityType === 'specific') {
		if (!event.eventAttendees) return false;
		return event.eventAttendees.nodes.some((attendee) => attendee.employeeId === userId);
	}

	return false;
}

/**
 * Get human-readable label for event visibility type
 */
export function getEventVisibilityLabel(visibilityType: EventVisibilityType): string {
	const labels: Record<EventVisibilityType, string> = {
		company: 'Company-Wide',
		department: 'Department Only',
		specific: 'Specific People'
	};
	return labels[visibilityType] || visibilityType;
}

/**
 * Check if an event is upcoming (starts in the future)
 */
export function isEventUpcoming(event: Event): boolean {
	const now = new Date();
	const startDate = new Date(event.startDate);
	return startDate > now;
}

/**
 * Check if an event is currently ongoing
 */
export function isEventOngoing(event: Event): boolean {
	const now = new Date();
	const startDate = new Date(event.startDate);
	const endDate = new Date(event.endDate);
	return startDate <= now && now <= endDate;
}

/**
 * Check if an event has ended
 */
export function isEventPast(event: Event): boolean {
	const now = new Date();
	const endDate = new Date(event.endDate);
	return endDate < now;
}

/**
 * Calculate human-readable event duration
 * @returns Duration string like "2 hours", "1 day", "3 days 4 hours"
 */
export function calculateEventDuration(startDate: string, endDate: string): string {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const durationMs = end.getTime() - start.getTime();

	const minutes = Math.floor(durationMs / (1000 * 60));
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		const remainingHours = hours % 24;
		if (remainingHours === 0) {
			return days === 1 ? '1 day' : `${days} days`;
		}
		return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
	}

	if (hours > 0) {
		const remainingMinutes = minutes % 60;
		if (remainingMinutes === 0) {
			return hours === 1 ? '1 hour' : `${hours} hours`;
		}
		return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
	}

	return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/**
 * Get Tailwind CSS color class for RSVP status badge
 */
export function getRsvpStatusColor(status: RsvpStatus): string {
	const colorMap: Record<RsvpStatus, string> = {
		accepted: 'bg-green-100 text-green-800',
		declined: 'bg-red-100 text-red-800',
		tentative: 'bg-yellow-100 text-yellow-800',
		pending: 'bg-blue-100 text-blue-800',
		no_response: 'bg-gray-100 text-gray-800'
	};
	return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get Tailwind CSS color class for event status badge
 */
export function getEventStatusColor(status: EventStatus): string {
	const colorMap: Record<EventStatus, string> = {
		scheduled: 'bg-blue-100 text-blue-800',
		ongoing: 'bg-green-100 text-green-800',
		completed: 'bg-gray-100 text-gray-800',
		cancelled: 'bg-red-100 text-red-800',
		postponed: 'bg-yellow-100 text-yellow-800'
	};
	return colorMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get icon for RSVP status
 */
export function getRsvpStatusIcon(status: RsvpStatus): string {
	const iconMap: Record<RsvpStatus, string> = {
		accepted: '✓',
		declined: '✗',
		tentative: '?',
		pending: '⏳',
		no_response: '-'
	};
	return iconMap[status] || '-';
}

/**
 * Filter events by date range
 */
export function filterEventsByDateRange(
	events: Event[],
	startDate: Date,
	endDate: Date
): Event[] {
	return events.filter((event) => {
		const eventStart = new Date(event.startDate);
		return eventStart >= startDate && eventStart <= endDate;
	});
}

/**
 * Filter events by visibility type
 */
export function filterEventsByVisibility(
	events: Event[],
	visibilityType: EventVisibilityType
): Event[] {
	return events.filter((event) => event.visibilityType === visibilityType);
}

/**
 * Sort events by start date (ascending by default)
 */
export function sortEventsByDate(events: Event[], ascending = true): Event[] {
	return [...events].sort((a, b) => {
		const dateA = new Date(a.startDate).getTime();
		const dateB = new Date(b.startDate).getTime();
		return ascending ? dateA - dateB : dateB - dateA;
	});
}

/**
 * Group events by month for calendar display
 */
export function groupEventsByMonth(events: Event[]): Map<string, Event[]> {
	const grouped = new Map<string, Event[]>();

	events.forEach((event) => {
		const date = new Date(event.startDate);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

		if (!grouped.has(monthKey)) {
			grouped.set(monthKey, []);
		}
		grouped.get(monthKey)!.push(event);
	});

	return grouped;
}

/**
 * Get upcoming events within next N days
 */
export function getUpcomingEvents(events: Event[], daysAhead = 30): Event[] {
	const now = new Date();
	const futureDate = new Date();
	futureDate.setDate(now.getDate() + daysAhead);

	return events.filter((event) => {
		const eventStart = new Date(event.startDate);
		return eventStart >= now && eventStart <= futureDate;
	});
}

/**
 * Check if user is event organizer
 */
export function isEventOrganizer(event: Event, userId: string): boolean {
	return event.organizerId === userId;
}

/**
 * Get user's RSVP status for an event
 */
export function getUserRsvpStatus(event: Event, userId: string): RsvpStatus | null {
	if (!event.eventAttendees) return null;

	const attendee = event.eventAttendees.nodes.find((a) => a.employeeId === userId);
	return attendee ? attendee.responseStatus : null;
}

/**
 * Count attendees by RSVP status
 */
export function countRsvpStatuses(event: Event): Record<RsvpStatus, number> {
	const counts: Record<RsvpStatus, number> = {
		accepted: 0,
		declined: 0,
		tentative: 0,
		pending: 0,
		no_response: 0
	};

	if (!event.eventAttendees) return counts;

	event.eventAttendees.nodes.forEach((attendee) => {
		counts[attendee.responseStatus]++;
	});

	return counts;
}

/**
 * Format event time range for display
 */
export function formatEventTimeRange(startDate: string, endDate: string, allDay: boolean): string {
	const start = new Date(startDate);
	const end = new Date(endDate);

	if (allDay) {
		const isSameDay =
			start.getDate() === end.getDate() &&
			start.getMonth() === end.getMonth() &&
			start.getFullYear() === end.getFullYear();

		if (isSameDay) {
			return start.toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		}

		return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
	}

	const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

	const isSameDay =
		start.getDate() === end.getDate() &&
		start.getMonth() === end.getMonth() &&
		start.getFullYear() === end.getFullYear();

	if (isSameDay) {
		return `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${startTime} - ${endTime}`;
	}

	return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${startTime} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${endTime}`;
}
