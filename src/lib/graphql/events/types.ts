// Event Types
// Migrated from events-operations.ts

import type { EventType } from '../types';

export type EventVisibilityType = 'company' | 'department' | 'specific';
export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
export type RsvpStatus =
	| 'pending'
	| 'accepted'
	| 'declined'
	| 'tentative'
	| 'no_response'
	| 'waitlisted';

/**
 * Event Notification Preferences Interface
 * Feature: 027-we-need-to - Events Calendar
 */
export interface EventNotificationPreferences {
	emailNotifications: boolean;
	pushNotifications: boolean;
	reminderTime?: number; // Minutes before event
	notifyOnUpdate?: boolean;
	notifyOnCancellation?: boolean;
	commentMentions: boolean;
	waitlistPromotions: boolean;
	eventUpdates: boolean;
	reminderDefaults?: {
		enabled: boolean;
		minutesBefore: number;
	};
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

/**
 * CreateEventInput - Updated to match Rust backend
 * Migration: ✅ Removed nested wrapper
 */
export interface CreateEventInput {
	title: string;
	description?: string;
	eventType: string;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	location?: string;
	organizerId: string;
	isPublic: boolean;
	status: EventStatus;
	color?: string;
	capacity?: number;
	recurrenceRule?: string;
	recurrenceEndDate?: string;
	imageUrl?: string;
	imageAspectRatio?: '16:9' | '9:16';
}

/**
 * UpdateEventInput - Updated to match Rust backend
 * Migration: ✅ Removed patch wrapper, uses direct fields
 */
export interface UpdateEventInput {
	title?: string;
	description?: string;
	eventType?: string;
	startTime?: string;
	endTime?: string;
	isAllDay?: boolean;
	location?: string;
	isPublic?: boolean;
	status?: EventStatus;
	color?: string;
}

/**
 * UpdateEventAttendeeInput - Updated to match Rust backend
 * Migration: ✅ Simplified structure
 */
export interface UpdateEventAttendeeInput {
	responseStatus?: RsvpStatus;
	reminderTime?: string;
	scope?: string;
}

/**
 * CreateEventAttendeeInput - Updated to match Rust backend
 * Migration: ✅ Removed nested wrapper
 */
export interface CreateEventAttendeeInput {
	eventId: string;
	employeeId: string;
	responseStatus: RsvpStatus;
	isOrganizer: boolean;
	isRequired: boolean;
}

/**
 * Event - Updated interface
 * Migration: ✅ Removed nodeId, updated relationship names
 */
export interface Event {
	id: string;
	title: string;
	description?: string;
	eventType: EventType;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	allDay?: boolean; // Alias for backward compatibility
	location?: string;
	organizerId: string;
	organizer?: {
		id: string;
		displayName: string;
		email: string;
	};
	userByOrganizerId?: {
		id: string;
		displayName: string;
		email: string;
	}; // Alias for organizer
	isPublic: boolean;
	visibilityType?: EventVisibilityType; // Multi-tier visibility support
	status: EventStatus;
	color?: string;
	createdAt: string;
	updatedAt: string;
	attendees?: Array<{
		id: string;
		employeeId: string;
		responseStatus: string;
		employee?: {
			id: string;
			displayName: string;
			email: string;
		};
	}>;
	// Alias for attendees (backward compatibility)
	eventAttendees?: Array<{
		id: string;
		employeeId: string;
		responseStatus: string;
		employee?: {
			id: string;
			displayName: string;
			email: string;
		};
	}>;
	// GraphQL-style nested property (PostGraphile naming convention)
	eventAttendeesByEventId?: {
		nodes: Array<{
			id: string;
			employeeId: string;
			responseStatus: string;
			employee?: {
				id: string;
				displayName: string;
				email: string;
			};
		}>;
	};
}

/**
 * EventAttendee - Updated interface
 * Migration: ✅ Updated to match Rust backend
 */
export interface EventAttendee {
	id: string;
	eventId: string;
	employeeId: string;
	employee: {
		id: string;
		displayName: string;
		email: string;
		jobTitle?: string;
	};
	responseStatus: RsvpStatus;
	isOrganizer: boolean;
	isRequired: boolean;
	createdAt: string;
}

/**
 * EventComment interface
 */
export interface EventComment {
	id: string;
	eventId: string;
	userId: string;
	commentText: string;
	content?: string; // Alias for commentText (for Comment interface compatibility)
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	user?: {
		id: string;
		displayName: string;
		email: string;
	};
	author?: {
		id: string;
		name: string;
		displayName?: string;
		avatarUrl?: string;
	}; // Alias for user (for Comment interface compatibility)
	mentions?: Array<{ id: string; name: string }>; // Parsed mentions from commentText
}

/**
 * EventHistoryEntry interface
 */
export interface EventHistoryEntry {
	id: string;
	eventId: string;
	changedById: string;
	changeType: string;
	oldValues?: any;
	newValues?: any;
	createdAt: string;
	changedAt?: string; // Alias for createdAt (for HistoryEntry interface compatibility)
	fieldName?: string; // For specific field changes
	oldValue?: any; // Alias for oldValues
	newValue?: any; // Alias for newValues
	changedBy?: {
		id: string;
		displayName: string;
		name?: string; // Alias for displayName
		email: string;
	};
}

/**
 * UserWaitlistStatus interface
 */
export interface UserWaitlistStatus {
	isOnWaitlist: boolean;
	position?: number | null;
	waitlistEntryId?: string | null;
	joinedAt?: string | null;
}
