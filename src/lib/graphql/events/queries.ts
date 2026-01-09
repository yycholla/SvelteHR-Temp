import { gql } from '@urql/svelte';

// ============================================================================
// QUERIES - Idiomatic Rust GraphQL Patterns
// ============================================================================

/**
 * Query: Get all events with visibility filtering (RLS-enforced)
 * RLS Policy: event_company_visibility, event_department_visibility, event_specific_visibility
 * Migration: ✅ Uses idiomatic Rust patterns (events, not allEvents)
 */
export const GET_ALL_EVENTS = gql`
	query GetAllEvents($limit: Int = 20, $offset: Int = 0, $upcomingOnly: Boolean) {
		events(limit: $limit, offset: $offset, upcomingOnly: $upcomingOnly) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			organizer {
				id
				displayName
				email
			}
			status
			color
			isPublic
			createdAt
			updatedAt
			attendees(limit: 100) {
				id
				employeeId
				responseStatus
				reminderTime
				employee {
					id
					displayName
					email
				}
			}
		}
	}
`;

/**
 * Query: Get single event by ID with attendees
 * Migration: ✅ Uses event(id:), organizer, attendees(limit:)
 */
export const GET_EVENT_BY_ID = gql`
	query GetEventById($id: UUID!) {
		event(id: $id) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			organizer {
				id
				displayName
				email
			}
			status
			color
			isPublic
			createdAt
			updatedAt
			attendees(limit: 100) {
				id
				employeeId
				responseStatus
				isRequired
				reminderTime
				createdAt
				employee {
					id
					displayName
					email
				}
			}
		}
	}
`;

/**
 * Query: Get user's events with RSVP status
 * Migration: ✅ Idiomatic pattern
 * Note: Backend gap - userId filter not available, must filter client-side
 */
export const GET_USER_EVENTS = gql`
	query GetUserEvents($limit: Int = 50, $offset: Int = 0) {
		events(limit: $limit, offset: $offset) {
			id
			title
			description
			eventType
			startTime
			endTime
			isAllDay
			location
			organizerId
			status
			color
			attendees(limit: 100) {
				id
				employeeId
				responseStatus
				isRequired
				createdAt
			}
		}
	}
`;

/**
 * Query: Get upcoming events (next 30 days)
 * Migration: ✅ Uses upcomingOnly filter
 */
export const GET_UPCOMING_EVENTS = gql`
	query GetUpcomingEvents($limit: Int = 10, $upcomingOnly: Boolean) {
		events(limit: $limit, upcomingOnly: $upcomingOnly) {
			id
			title
			startTime
			endTime
			location
			status
			isPublic
		}
	}
`;

/**
 * Query: Get pending event reminders for scheduler
 * Migration: ✅ Uses eventAttendees query
 * Note: Backend gap - responseStatus filter not available, filter client-side
 */
export const GET_PENDING_REMINDERS = gql`
	query GetPendingReminders($limit: Int) {
		eventAttendees(reminderTimeIsNull: false, limit: $limit) {
			id
			employeeId
			eventId
			reminderTime
			responseStatus
			event {
				id
				title
				startTime
				endTime
				status
			}
			employee {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get event comments
 * Migration: ✅ Updated to idiomatic Rust pattern
 */
export const GET_EVENT_COMMENTS = gql`
	query GetEventComments($eventId: UUID!, $limit: Int = 50, $offset: Int = 0) {
		eventComments(eventId: $eventId, limit: $limit, offset: $offset) {
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
 * Query: Get event history
 * Migration: ✅ Updated to idiomatic Rust pattern
 */
export const GET_EVENT_HISTORY = gql`
	query GetEventHistory($eventId: UUID!, $limit: Int = 50) {
		eventHistories(eventId: $eventId, limit: $limit) {
			id
			eventId
			changedById
			changeType
			oldValues
			newValues
			createdAt
			changedBy {
				id
				displayName
				email
			}
		}
	}
`;

/**
 * Query: Get user waitlist status for an event
 * Migration: ✅ Updated to idiomatic Rust pattern
 */
export const GET_USER_WAITLIST_STATUS = gql`
	query GetUserWaitlistStatus($eventId: UUID!, $userId: UUID!) {
		eventWaitlists(eventId: $eventId, userId: $userId, limit: 1) {
			id
			position
			promoted
		}
	}
`;
