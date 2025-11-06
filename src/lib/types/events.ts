/**
 * Event Types
 * Feature: 027-we-need-to - Events Calendar with FullCalendar 6.x
 */

export type RsvpStatus = 'accepted' | 'declined' | 'pending' | 'waitlisted';
export type EventType = 'meeting' | 'training' | 'company_event' | 'holiday' | 'other';
export type EventVisibility = 'public' | 'private' | 'department';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface CalendarEvent {
	id: string;
	title: string;
	description?: string;
	startDate: Date;
	endDate: Date;
	allDay: boolean;
	type: EventType;
	visibility: EventVisibility;

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
	createdBy: string;
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
