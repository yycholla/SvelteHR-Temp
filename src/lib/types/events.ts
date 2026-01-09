/**
 * Event Types
 * Feature: 027-we-need-to - Events Calendar with FullCalendar 6.x
 */

export type RsvpStatus =
	| 'pending'
	| 'accepted'
	| 'declined'
	| 'tentative'
	| 'no_response'
	| 'waitlisted';
export type EventType = 'meeting' | 'training' | 'company_event' | 'holiday' | 'other';
export type EventVisibility = 'public' | 'private' | 'department';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 for Sunday, 1 for Monday, etc.

export interface CalendarEvent {
	id: string;
	title: string;
	description?: string;
	startDate: Date;
	endDate: Date;
	isAllDay: boolean;
	allDay?: boolean; // Alias for backward compatibility
	type: EventType;
	visibility: EventVisibility;
	visibilityType?: EventVisibility; // Alias for consistency

	// Recurrence
	isRecurring: boolean;
	rrule: string | null;
	parentEventId: string | null;

	// Capacity
	capacity: number | null;
	attendeeCount: number;
	waitlistCount: number;
	waitlistEnabled: boolean;

	// User-specific
	userRsvpStatus: RsvpStatus | null;
	userWaitlistPosition: number | null;

	// Image
	imageUrl: string | null;
	imageAspectRatio: '16:9' | '9:16' | null;

	// Metadata
	organizerId?: string;
	userByOrganizerId?: {
		id: string;
		displayName: string;
		email: string;
	};
	createdBy: string;
	createdAt?: Date;
	updatedAt?: Date;
	canEdit: boolean;
	canDelete: boolean;

	// Conflicts
	hasConflict: boolean;
	conflictingEventIds: string[];
}

export interface RecurrencePattern {
	frequency: RecurrenceFrequency;
	interval: number;
	endDate: Date | null;
	daysOfWeek?: DayOfWeek[];
	dayOfMonth?: number;
	monthOfYear?: number;
	rruleString?: string; // Added to match rrule.ts logic
}

export interface EventConflict {
	id: string;
	title: string;
	startDate: Date;
	endDate: Date;
	overlapDuration: number;
	overlapPercentage: number;
	severity: 'minor' | 'major';
}

export interface EventAttendee {
	id: string;
	userId: string;
	eventId: string;
	rsvpStatus: RsvpStatus;
	respondedAt: Date | null;
	waitlistPosition: number | null;
}

export interface EventNotificationPreferences {
	userId: string;
	enableReminders: boolean;
	defaultReminderMinutes: number;
	emailNotifications: boolean;
	pushNotifications: boolean;
	notifyOnRsvpChange: boolean;
	notifyOnEventUpdate: boolean;
	notifyOnWaitlistPromotion: boolean;
}
