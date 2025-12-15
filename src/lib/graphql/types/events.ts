import type { DepartmentReference, UserReference } from './common';
import type { EventStatus, EventType, EventVisibilityType, RsvpStatus } from './enums';

export interface Event {
	id: string;
	title: string;
	description?: string;
	type: EventType;
	startDate: string;
	endDate: string;
	isAllDay: boolean;
	allDay?: boolean; // Alias for backward compatibility
	location?: string;
	organizerId: string;
	organizer: UserReference;
	userByOrganizerId?: UserReference; // Alias for organizer
	departmentId?: string;
	department?: DepartmentReference;
	visibilityType: EventVisibilityType;
	status: EventStatus;
	color: string;
	reminderMinutes: number;
	notes?: string;
	createdAt: string;
	updatedAt: string;
	eventAttendees?: {
		nodes: EventAttendee[];
	};
}

export interface EventAttendee {
	id: string;
	eventId: string;
	employeeId: string;
	employee: UserReference;
	responseStatus: RsvpStatus;
	isOrganizer: boolean;
	isRequired: boolean;
	respondedAt?: string;
	createdAt: string;
}

export interface EventFilter {
	type?: {
		equalTo?: string;
		in?: string[];
	};
	status?: {
		equalTo?: EventStatus;
		in?: EventStatus[];
	};
	visibilityType?: {
		equalTo?: EventVisibilityType;
	};
	startDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	organizerId?: {
		equalTo?: string;
	};
	departmentId?: {
		equalTo?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
}

export interface EventStatistics {
	totalEvents: number;
	upcomingEvents: number;
	pastEvents: number;
	acceptedRsvps: number;
	pendingRsvps: number;
	declinedRsvps: number;
}
