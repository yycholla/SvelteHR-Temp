import type { Event, RsvpStatus, EventVisibilityType } from './types';

/**
 * Helper: Validate event input
 */
export function validateEventInput(input: {
	title: string;
	description?: string;
	startTime: string;
	endTime: string;
	location?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!input.title || input.title.trim().length === 0) {
		errors.push('Title is required');
	}

	if (input.title && input.title.length > 200) {
		errors.push('Title must be less than 200 characters');
	}

	if (input.description && input.description.length > 2000) {
		errors.push('Description must be less than 2000 characters');
	}

	const startTime = new Date(input.startTime);
	const endTime = new Date(input.endTime);

	if (endTime < startTime) {
		errors.push('End time must be after start time');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Helper: Check if event is upcoming
 */
export function isEventUpcoming(event: Event): boolean {
	const startTime = new Date(event.startTime);
	const now = new Date();
	return startTime > now && event.status === 'scheduled';
}

/**
 * Helper: Calculate event duration
 */
export function calculateEventDuration(startTime: string, endTime: string): string {
	const start = new Date(startTime);
	const end = new Date(endTime);
	const diffMs = end.getTime() - start.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) {
		return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
	} else if (diffHours > 0) {
		return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
	} else {
		return `${diffMins} minute${diffMins === 1 ? '' : 's'}`;
	}
}

/**
 * Helper: Get RSVP status color
 */
export function getRsvpStatusColor(status: RsvpStatus): string {
	const statusColors: Record<RsvpStatus, string> = {
		pending: 'gray',
		accepted: 'green',
		declined: 'red',
		tentative: 'yellow',
		no_response: 'gray'
	};
	return statusColors[status] || 'gray';
}

/**
 * Helper: Get event visibility label
 */
export function getEventVisibilityLabel(visibilityType: EventVisibilityType): string {
	const labels: Record<EventVisibilityType, string> = {
		company: 'Company-Wide',
		department: 'Department Only',
		specific: 'Specific People'
	};
	return labels[visibilityType] || 'Unknown';
}
