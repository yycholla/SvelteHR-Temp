import { gql } from '@urql/svelte';

// ============================================================================
// MUTATIONS - Idiomatic Rust GraphQL Patterns
// ============================================================================

/**
 * Mutation: Create event
 * RLS Policy: event_manager_admin_access (manager/admin only)
 * Migration: ✅ Uses createEvent(input:) without nested wrapper
 */
export const CREATE_EVENT = gql`
	mutation CreateEvent($input: CreateEventInput!) {
		createEvent(input: $input) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			isPublic
			status
			color
			createdAt
			updatedAt
		}
	}
`;

/**
 * Mutation: Update event
 * RLS Policy: event_manager_admin_access (organizer or admin)
 * Migration: ✅ Uses updateEvent(id, input) - idiomatic pattern
 */
export const UPDATE_EVENT = gql`
	mutation UpdateEvent($id: UUID!, $input: UpdateEventInput!) {
		updateEvent(id: $id, input: $input) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			isPublic
			status
			color
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete event
 * RLS Policy: event_manager_admin_access (organizer or admin)
 * Migration: ✅ Uses deleteEvent(id) - returns Boolean
 */
export const DELETE_EVENT = gql`
	mutation DeleteEvent($id: UUID!) {
		deleteEvent(id: $id)
	}
`;

/**
 * Mutation: Update RSVP status
 * RLS Policy: event_attendees_own_access (employee updates own RSVP)
 * Migration: ✅ Uses updateEventAttendee(id, input)
 */
export const UPDATE_RSVP_STATUS = gql`
	mutation UpdateRsvpStatus($id: UUID!, $input: UpdateEventAttendeeInput!) {
		updateEventAttendee(id: $id, input: $input) {
			id
			eventId
			employeeId
			responseStatus
		}
	}
`;

/**
 * Mutation: Invite attendees to event
 * Migration: ✅ Uses createEventAttendee(input)
 */
export const INVITE_ATTENDEES = gql`
	mutation InviteAttendees($input: CreateEventAttendeeInput!) {
		createEventAttendee(input: $input) {
			id
			eventId
			employeeId
			responseStatus
			isRequired
			createdAt
		}
	}
`;

/**
 * Mutation: Update event reminder for an attendee
 * Migration: ✅ Idiomatic pattern
 */
export const UPDATE_EVENT_REMINDER = gql`
	mutation UpdateEventReminder($id: UUID!, $input: UpdateEventAttendeeInput!) {
		updateEventAttendee(id: $id, input: $input) {
			id
			eventId
			employeeId
			responseStatus
		}
	}
`;

/**
 * Mutation: Create event notification
 * Migration: ✅ Idiomatic pattern
 */
export const CREATE_EVENT_NOTIFICATION = gql`
	mutation CreateEventNotification($input: CreateNotificationInput!) {
		createNotification(input: $input) {
			id
			recipientId
			title
			message
			readStatus
			createdAt
		}
	}
`;

/**
 * Mutation: Create event comment
 * Migration: ✅ Updated to idiomatic Rust pattern (direct return)
 */
export const CREATE_EVENT_COMMENT = gql`
	mutation CreateEventComment($input: CreateEventCommentInput!) {
		createEventComment(input: $input) {
			id
			eventId
			userId
			commentText
			createdAt
			updatedAt
			user {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Mutation: Update event comment
 * Migration: ✅ Updated to idiomatic Rust pattern (direct return, id as param)
 */
export const UPDATE_EVENT_COMMENT = gql`
	mutation UpdateEventComment($id: UUID!, $input: UpdateEventCommentInput!) {
		updateEventComment(id: $id, input: $input) {
			id
			eventId
			userId
			commentText
			createdAt
			updatedAt
		}
	}
`;

/**
 * Mutation: Delete event comment
 */
export const DELETE_EVENT_COMMENT = gql`
	mutation DeleteEventComment($id: UUID!) {
		deleteEventComment(id: $id)
	}
`;

/**
 * Mutation: Join event waitlist
 * Migration: ✅ Updated to idiomatic Rust pattern (direct return)
 */
export const JOIN_EVENT_WAITLIST = gql`
	mutation JoinEventWaitlist($input: CreateEventWaitlistInput!) {
		createEventWaitlist(input: $input) {
			id
			eventId
			userId
			position
			promoted
			createdAt
		}
	}
`;

/**
 * Mutation: Leave event waitlist
 * Maps to deleteEventWaitlist backend mutation
 */
export const LEAVE_EVENT_WAITLIST = gql`
	mutation LeaveEventWaitlist($id: UUID!) {
		deleteEventWaitlist(id: $id)
	}
`;
