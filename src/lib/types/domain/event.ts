// Event related types

export type EventType =
	| 'meeting'
	| 'training'
	| 'review'
	| 'social'
	| 'holiday'
	| 'time_off'
	| 'other';

export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';

export interface Event {
	id: string;
	title: string;
	description?: string;
	event_type: string;
	eventType?: string;
	start_time: string;
	startTime?: string;
	end_time: string;
	endTime?: string;
	location?: string;
	organizer_id: string;
	organizerId?: string;
	is_all_day?: boolean;
	isAllDay?: boolean;
	recurrence_rule?: string;
	recurrenceRule?: string;
	status?: EventStatus;
	attendees?: EventAttendee[];
	created_at?: string;
	createdAt?: string;
	updated_at?: string;
	updatedAt?: string;
}

export interface EventAttendee {
	id: string;
	event_id: string;
	eventId?: string;
	user_id: string;
	userId?: string;
	status: string;
	response_status?: string; // Alias for status
	responseStatus?: string;
	created_at?: string;
	createdAt?: string;
	updated_at?: string;
	updatedAt?: string;
}
