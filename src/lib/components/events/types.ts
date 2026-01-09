import type { EventType, EventVisibilityType, RsvpStatus } from '$lib/graphql/types';

export interface EventData {
	id: string;
	title: string;
	description?: string;
	startTime: string;
	endTime: string;
	isAllDay?: boolean;
	location?: string;
	eventType: EventType;
	visibilityType?: EventVisibilityType;
	status: string;
	organizerId?: string; // Event organizer/creator ID
	rrule?: string | null; // Recurring event rule
	maxCapacity?: number | null; // Event capacity limit
	acceptedCount?: number; // Current accepted attendees
	waitlistCount?: number; // Current waitlist size
	waitlistEnabled?: boolean; // Whether waitlist is enabled
	isFull?: boolean; // Whether event is at capacity
	organizer?: {
		displayName: string;
	};
	attendees?: Array<{
		id: string;
		employeeId: string;
		responseStatus: RsvpStatus;
		reminderTime?: number | null;
		employee?: {
			displayName: string;
		};
	}>;
}
