/**
 * GraphQL Mutation Resolvers for Events
 * Feature: 025-events-flesh-out
 *
 * Implements mutation resolvers for event CRUD, RSVP, waitlist, and comments.
 */

import { RRuleService } from '../../../../../src/lib/services/rrule-service';
import { NotificationService } from '../../../../../src/lib/services/notification-service';
import type { Pool } from 'pg';

interface Context {
	pgPool: Pool;
	currentUserId?: string;
}

interface EventInput {
	title: string;
	description?: string;
	startTime: string;
	endTime: string;
	location?: string;
	visibility: 'public' | 'private';
	type: 'meeting' | 'training' | 'social' | 'conference' | 'other';
	rrule?: string;
	maxCapacity?: number;
	waitlistEnabled?: boolean;
	attendeeIds?: string[];
}

interface UpdateRsvpStatusArgs {
	eventId: string;
	status: 'pending' | 'accepted' | 'declined' | 'tentative';
	scope?: 'this_event' | 'this_and_future' | 'all_events';
}

interface JoinWaitlistArgs {
	eventId: string;
}

interface AddAttendeesArgs {
	eventId: string;
	employeeIds: string[];
}

interface CreateEventCommentArgs {
	eventId: string;
	content: string;
	mentions?: string[];
}

interface UpdateEventCommentArgs {
	id: string;
	content: string;
}

/**
 * Mutation: createEvent
 * Creates a new event
 */
export async function createEvent(
	parent: any,
	args: { input: EventInput },
	context: Context
): Promise<any> {
	const { pgPool, currentUserId } = context;
	const { input } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	// Validation
	if (!input.title || input.title.trim().length === 0 || input.title.length > 255) {
		throw new Error('Title is required and must be 1-255 characters');
	}

	if (new Date(input.startTime) >= new Date(input.endTime)) {
		throw new Error('End time must be after start time');
	}

	if (input.maxCapacity && input.maxCapacity <= 0) {
		throw new Error('Max capacity must be a positive integer');
	}

	const client = await pgPool.connect();

	try {
		await client.query('BEGIN');

		// Insert event
		const eventResult = await client.query(
			`INSERT INTO events (
				title, description, start_time, end_time, location,
				visibility, type, created_by, rrule, max_capacity, waitlist_enabled
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING *`,
			[
				input.title,
				input.description,
				input.startTime,
				input.endTime,
				input.location,
				input.visibility,
				input.type,
				currentUserId,
				input.rrule,
				input.maxCapacity,
				input.waitlistEnabled || false
			]
		);

		const event = eventResult.rows[0];

		// Add attendees if provided (for private events)
		if (input.attendeeIds && input.attendeeIds.length > 0) {
			for (const employeeId of input.attendeeIds) {
				await client.query(
					`INSERT INTO event_attendees (event_id, employee_id, rsvp_status)
					VALUES ($1, $2, 'pending')`,
					[event.id, employeeId]
				);

				// Send invitation notification
				await NotificationService.notifyEventInvite(
					employeeId,
					event.id,
					event.title,
					currentUserId
				);
			}
		}

		await client.query('COMMIT');
		return event;
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error creating event:', error);
		throw new Error('Failed to create event');
	} finally {
		client.release();
	}
}

/**
 * Mutation: createRecurringEvent
 * Creates a recurring event with RRULE validation
 */
export async function createRecurringEvent(
	parent: any,
	args: { input: EventInput },
	context: Context
): Promise<any> {
	const { input } = args;

	// Validate RRULE
	if (!input.rrule) {
		throw new Error('RRULE is required for recurring events');
	}

	const validation = RRuleService.validateRRule(input.rrule);
	if (!validation.isValid) {
		throw new Error(`Invalid RRULE format. ${validation.error}`);
	}

	// Create event using createEvent mutation
	return createEvent(parent, args, context);
}

/**
 * Mutation: updateRsvpStatus
 * Updates RSVP status for an event
 */
export async function updateRsvpStatus(
	parent: any,
	args: UpdateRsvpStatusArgs,
	context: Context
): Promise<any> {
	const { pgPool, currentUserId } = context;
	const { eventId, status, scope } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	const client = await pgPool.connect();

	try {
		await client.query('BEGIN');

		// Check if event exists and is accessible
		const eventResult = await client.query(
			`SELECT * FROM events WHERE id = $1`,
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			throw new Error('Event not found');
		}

		const event = eventResult.rows[0];

		// For private events, check if user is invited
		if (event.visibility === 'private') {
			const inviteCheck = await client.query(
				`SELECT id FROM event_attendees WHERE event_id = $1 AND employee_id = $2`,
				[eventId, currentUserId]
			);

			if (inviteCheck.rows.length === 0) {
				throw new Error('You must be invited to RSVP to private events');
			}
		}

		// Check capacity if accepting
		if (status === 'accepted') {
			const capacityCheck = await client.query(
				`SELECT
					e.max_capacity,
					COUNT(ea.id) FILTER (WHERE ea.rsvp_status = 'accepted') as accepted_count
				FROM events e
				LEFT JOIN event_attendees ea ON ea.event_id = e.id
				WHERE e.id = $1
				GROUP BY e.id, e.max_capacity`,
				[eventId]
			);

			const { max_capacity, accepted_count } = capacityCheck.rows[0];

			if (max_capacity && parseInt(accepted_count) >= max_capacity) {
				throw new Error('Event capacity reached. Join the waitlist instead.');
			}
		}

		// Update or insert RSVP
		const rsvpResult = await client.query(
			`INSERT INTO event_attendees (event_id, employee_id, rsvp_status, rsvp_scope)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (event_id, employee_id)
			DO UPDATE SET rsvp_status = $3, rsvp_scope = $4, updated_at = NOW()
			RETURNING *`,
			[eventId, currentUserId, status, scope]
		);

		await client.query('COMMIT');
		return rsvpResult.rows[0];
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error updating RSVP:', error);
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Mutation: joinWaitlist
 * Adds user to event waitlist
 */
export async function joinWaitlist(
	parent: any,
	args: JoinWaitlistArgs,
	context: Context
): Promise<any> {
	const { pgPool, currentUserId } = context;
	const { eventId } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	const client = await pgPool.connect();

	try {
		await client.query('BEGIN');

		// Check event exists and has waitlist enabled
		const eventResult = await client.query(
			`SELECT max_capacity, waitlist_enabled FROM events WHERE id = $1`,
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			throw new Error('Event not found');
		}

		const { max_capacity, waitlist_enabled } = eventResult.rows[0];

		if (!max_capacity) {
			throw new Error('This event has no capacity limit. RSVP directly.');
		}

		if (!waitlist_enabled) {
			throw new Error('Waitlist is not enabled for this event');
		}

		// Check if already on waitlist
		const existingEntry = await client.query(
			`SELECT id FROM event_waitlist WHERE event_id = $1 AND employee_id = $2`,
			[eventId, currentUserId]
		);

		if (existingEntry.rows.length > 0) {
			throw new Error('You are already on the waitlist for this event');
		}

		// Calculate next position (FIFO)
		const positionResult = await client.query(
			`SELECT COALESCE(MAX(position), 0) + 1 as next_position
			FROM event_waitlist
			WHERE event_id = $1`,
			[eventId]
		);

		const nextPosition = positionResult.rows[0].next_position;

		// Add to waitlist
		const waitlistResult = await client.query(
			`INSERT INTO event_waitlist (event_id, employee_id, position)
			VALUES ($1, $2, $3)
			RETURNING *`,
			[eventId, currentUserId, nextPosition]
		);

		await client.query('COMMIT');
		return waitlistResult.rows[0];
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error joining waitlist:', error);
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Mutation: leaveWaitlist
 * Removes user from event waitlist
 */
export async function leaveWaitlist(
	parent: any,
	args: JoinWaitlistArgs,
	context: Context
): Promise<boolean> {
	const { pgPool, currentUserId } = context;
	const { eventId } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	const client = await pgPool.connect();

	try {
		await client.query('BEGIN');

		// Get user's position before removing
		const positionResult = await client.query(
			`SELECT position FROM event_waitlist
			WHERE event_id = $1 AND employee_id = $2`,
			[eventId, currentUserId]
		);

		if (positionResult.rows.length === 0) {
			throw new Error('You are not on the waitlist for this event');
		}

		const userPosition = positionResult.rows[0].position;

		// Remove from waitlist
		await client.query(
			`DELETE FROM event_waitlist WHERE event_id = $1 AND employee_id = $2`,
			[eventId, currentUserId]
		);

		// Reorder remaining positions
		await client.query(
			`UPDATE event_waitlist
			SET position = position - 1
			WHERE event_id = $1 AND position > $2`,
			[eventId, userPosition]
		);

		await client.query('COMMIT');
		return true;
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error leaving waitlist:', error);
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Mutation: addAttendees
 * Adds attendees to a private event
 */
export async function addAttendees(
	parent: any,
	args: AddAttendeesArgs,
	context: Context
): Promise<any[]> {
	const { pgPool, currentUserId } = context;
	const { eventId, employeeIds } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	const client = await pgPool.connect();

	try {
		await client.query('BEGIN');

		// Check if user is event creator
		const eventResult = await client.query(
			`SELECT title, created_by, visibility FROM events WHERE id = $1`,
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			throw new Error('Event not found');
		}

		const event = eventResult.rows[0];

		if (event.created_by !== currentUserId) {
			throw new Error('Only the event creator can add attendees');
		}

		const attendees = [];

		// Add each attendee
		for (const employeeId of employeeIds) {
			const result = await client.query(
				`INSERT INTO event_attendees (event_id, employee_id, rsvp_status)
				VALUES ($1, $2, 'pending')
				ON CONFLICT (event_id, employee_id) DO NOTHING
				RETURNING *`,
				[eventId, employeeId]
			);

			if (result.rows.length > 0) {
				attendees.push(result.rows[0]);

				// Send notification
				await NotificationService.notifyEventInvite(
					employeeId,
					eventId,
					event.title,
					currentUserId
				);
			}
		}

		await client.query('COMMIT');
		return attendees;
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error adding attendees:', error);
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Mutation: createEventComment
 * Creates a comment on an event
 */
export async function createEventComment(
	parent: any,
	args: CreateEventCommentArgs,
	context: Context
): Promise<any> {
	const { pgPool, currentUserId } = context;
	const { eventId, content, mentions = [] } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	// Validate content
	const trimmedContent = content.trim();
	if (trimmedContent.length === 0 || trimmedContent.length > 5000) {
		throw new Error('Comment content must be 1-5000 characters after trimming');
	}

	const client = await pgPool.connect();

	try {
		await client.query('BEGIN');

		// Check if event is accessible to user
		const accessCheck = await client.query(
			`SELECT id FROM events WHERE id = $1`,
			[eventId]
		);

		if (accessCheck.rows.length === 0) {
			throw new Error('Event not found');
		}

		// Insert comment
		const commentResult = await client.query(
			`INSERT INTO event_comments (event_id, user_id, content, mentions)
			VALUES ($1, $2, $3, $4)
			RETURNING *`,
			[eventId, currentUserId, content, mentions]
		);

		const comment = commentResult.rows[0];

		// Send notifications to mentioned users
		for (const mentionedUserId of mentions) {
			await NotificationService.notifyCommentMention(
				mentionedUserId,
				eventId,
				'Event', // Event title would be fetched
				currentUserId,
				trimmedContent.substring(0, 50)
			);
		}

		await client.query('COMMIT');
		return comment;
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Error creating comment:', error);
		throw error;
	} finally {
		client.release();
	}
}

/**
 * Mutation: updateEventComment
 * Updates a comment (own comments only)
 */
export async function updateEventComment(
	parent: any,
	args: UpdateEventCommentArgs,
	context: Context
): Promise<any> {
	const { pgPool, currentUserId } = context;
	const { id, content } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	// Validate content
	const trimmedContent = content.trim();
	if (trimmedContent.length === 0 || trimmedContent.length > 5000) {
		throw new Error('Comment content must be 1-5000 characters after trimming');
	}

	try {
		const result = await pgPool.query(
			`UPDATE event_comments
			SET content = $1, updated_at = NOW()
			WHERE id = $2 AND user_id = $3
			RETURNING *`,
			[content, id, currentUserId]
		);

		if (result.rows.length === 0) {
			throw new Error('You can only edit your own comments');
		}

		return result.rows[0];
	} catch (error) {
		console.error('Error updating comment:', error);
		throw error;
	}
}

/**
 * Mutation: deleteEventComment
 * Deletes a comment (own comments only)
 */
export async function deleteEventComment(
	parent: any,
	args: { id: string },
	context: Context
): Promise<boolean> {
	const { pgPool, currentUserId } = context;
	const { id } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	try {
		const result = await pgPool.query(
			`DELETE FROM event_comments WHERE id = $1 AND user_id = $2`,
			[id, currentUserId]
		);

		if (result.rowCount === 0) {
			throw new Error('You can only delete your own comments');
		}

		return true;
	} catch (error) {
		console.error('Error deleting comment:', error);
		throw error;
	}
}

/**
 * Export all mutation resolvers
 */
export const mutationResolvers = {
	createEvent,
	createRecurringEvent,
	updateRsvpStatus,
	joinWaitlist,
	leaveWaitlist,
	addAttendees,
	createEventComment,
	updateEventComment,
	deleteEventComment
};
