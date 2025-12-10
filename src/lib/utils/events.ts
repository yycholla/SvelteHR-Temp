// Event Utility Functions
// Feature: 019-we-need-to - Task T018
// Purpose: Business logic helpers for event operations

import type { Event } from '$lib/types/domain-extensions';
import type { EventAttendee } from '$lib/graphql/events-operations';
import type { EventStatus, EventVisibilityType, RsvpStatus } from '$lib/graphql/types';

/**
 * Check if a user can view an event based on visibility rules
 * @param event - The event to check
 * @param userId - Current user's employee ID
 * @param userDepartmentId - Current user's department ID (unused for now)
 * @returns true if user can view the event
 */
export function canUserViewEvent(
	event: Event,
	userId: string,
	userDepartmentId: string | null
): boolean {
	// Public events are visible to all authenticated users
	if (event.isPublic) {
		return true;
	}

	// Private events visible to invited attendees only
	if (!event.eventAttendeesByEventId) return false;
	return event.eventAttendeesByEventId.nodes.some((attendee) => attendee.employeeId === userId);
}

/**
 * Get human-readable label for event visibility
 */
export function getEventVisibilityLabel(isPublic: boolean): string {
	return isPublic ? 'Company-Wide' : 'Private';
}

/**
 * Check if an event is upcoming (starts in the future)
 */
export function isEventUpcoming(event: Event): boolean {
	const now = new Date();
	const startDate = new Date(event.startTime);
	return startDate > now;
}

/**
 * Check if an event is currently ongoing
 */
export function isEventOngoing(event: Event): boolean {
	const now = new Date();
	const startDate = new Date(event.startTime);
	const endDate = new Date(event.endTime);
	return startDate <= now && now <= endDate;
}

/**
 * Check if an event has ended
 */
export function isEventPast(event: Event): boolean {
	const now = new Date();
	const endDate = new Date(event.endTime);
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
		accepted: 'bg-green-500/10 text-green-600 dark:text-green-400',
		declined: 'bg-red-500/10 text-red-600 dark:text-red-400',
		tentative: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
		pending: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
		no_response: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
		waitlisted: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
	};
	return colorMap[status] || 'bg-muted text-muted-foreground';
}

/**
 * Get Tailwind CSS color class for event status badge
 */
export function getEventStatusColor(status: EventStatus): string {
	const colorMap: Record<EventStatus, string> = {
		scheduled: 'bg-primary/10 text-primary',
		ongoing: 'bg-accent text-accent-foreground',
		completed: 'bg-muted text-muted-foreground',
		cancelled: 'bg-destructive/10 text-destructive',
		postponed: 'bg-accent text-accent-foreground'
	};
	return colorMap[status] || 'bg-muted text-muted-foreground';
}

/**
 * Get icon for RSVP status
 */
export function getRsvpStatusIcon(status: RsvpStatus): string {
	const iconMap: Record<string, string> = {
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
export function filterEventsByDateRange(events: Event[], startDate: Date, endDate: Date): Event[] {
	return events.filter((event) => {
		const eventStart = new Date(event.startTime);
		return eventStart >= startDate && eventStart <= endDate;
	});
}

/**
 * Filter events by visibility type
 */
export function filterEventsByVisibility(events: Event[], visibilityType: string): Event[] {
	// Handle both isPublic boolean and visibilityType string
	if (visibilityType === 'company') {
		return events.filter((event) => event.isPublic === true);
	}
	return events.filter((event) => event.isPublic === false);
}

/**
 * Sort events by start date (ascending by default)
 */
export function sortEventsByDate(events: Event[], ascending = true): Event[] {
	return [...events].sort((a, b) => {
		const dateA = new Date(a.startTime).getTime();
		const dateB = new Date(b.startTime).getTime();
		return ascending ? dateA - dateB : dateB - dateA;
	});
}

/**
 * Group events by month for calendar display
 */
export function groupEventsByMonth(events: Event[]): Map<string, Event[]> {
	const grouped = new Map<string, Event[]>();

	events.forEach((event) => {
		const date = new Date(event.startTime);
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
		const eventStart = new Date(event.startTime);
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
	if (!event.eventAttendeesByEventId) return null;

	const attendee = event.eventAttendeesByEventId.nodes.find((a) => a.employeeId === userId);
	return attendee ? (attendee.responseStatus as RsvpStatus) : null;
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
		no_response: 0,
		waitlisted: 0
	};

	if (!event.eventAttendeesByEventId) return counts;

	event.eventAttendeesByEventId.nodes.forEach((attendee) => {
		const status = attendee.responseStatus as RsvpStatus;
		if (status in counts) {
			counts[status]++;
		}
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
