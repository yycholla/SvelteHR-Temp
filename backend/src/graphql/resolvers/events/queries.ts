/**
 * GraphQL Query Resolvers for Events
 * Feature: 025-events-flesh-out
 *
 * Implements query resolvers for events, myEvents, recurringEventInstances, and conflictingEvents.
 */

import { RRuleService } from '../../../../../src/lib/services/rrule-service';
import type { Pool } from 'pg';

interface Context {
	pgPool: Pool;
	currentUserId?: string;
}

interface EventsQueryArgs {
	start?: string;
	end?: string;
	visibility?: 'public' | 'private';
	type?: 'meeting' | 'training' | 'social' | 'conference' | 'other';
	limit?: number;
	offset?: number;
}

interface MyEventsQueryArgs {
	start?: string;
	end?: string;
	rsvpStatus?: 'pending' | 'accepted' | 'declined' | 'tentative';
}

interface RecurringEventInstancesArgs {
	eventId: string;
	start: string;
	end: string;
}

interface ConflictingEventsArgs {
	checkStartTime: string;
	checkEndTime: string;
}

/**
 * Query: events
 * Returns all events visible to the current user (public + invited private events)
 */
export async function events(
	parent: any,
	args: EventsQueryArgs,
	context: Context
): Promise<any[]> {
	const { pgPool, currentUserId } = context;
	const { start, end, visibility, type, limit = 50, offset = 0 } = args;

	try {
		let query = `
			SELECT DISTINCT e.*
			FROM events e
			LEFT JOIN event_attendees ea ON ea.event_id = e.id
			WHERE (
				e.visibility = 'public'
				OR (e.visibility = 'private' AND ea.employee_id = $1)
				OR e.created_by = $1
			)
		`;

		const params: any[] = [currentUserId];
		let paramIndex = 2;

		// Add filters
		if (start) {
			query += ` AND e.start_time >= $${paramIndex}`;
			params.push(start);
			paramIndex++;
		}

		if (end) {
			query += ` AND e.end_time <= $${paramIndex}`;
			params.push(end);
			paramIndex++;
		}

		if (visibility) {
			query += ` AND e.visibility = $${paramIndex}`;
			params.push(visibility);
			paramIndex++;
		}

		if (type) {
			query += ` AND e.type = $${paramIndex}`;
			params.push(type);
			paramIndex++;
		}

		// Order by start time
		query += ` ORDER BY e.start_time ASC`;

		// Pagination
		query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(limit, offset);

		const result = await pgPool.query(query, params);
		return result.rows;
	} catch (error) {
		console.error('Error fetching events:', error);
		throw new Error('Failed to fetch events');
	}
}

/**
 * Query: myEvents
 * Returns events where the current user is an attendee
 */
export async function myEvents(
	parent: any,
	args: MyEventsQueryArgs,
	context: Context
): Promise<any[]> {
	const { pgPool, currentUserId } = context;
	const { start, end, rsvpStatus } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	try {
		let query = `
			SELECT e.*
			FROM events e
			INNER JOIN event_attendees ea ON ea.event_id = e.id
			WHERE ea.employee_id = $1
		`;

		const params: any[] = [currentUserId];
		let paramIndex = 2;

		// Add filters
		if (start) {
			query += ` AND e.start_time >= $${paramIndex}`;
			params.push(start);
			paramIndex++;
		}

		if (end) {
			query += ` AND e.end_time <= $${paramIndex}`;
			params.push(end);
			paramIndex++;
		}

		if (rsvpStatus) {
			query += ` AND ea.rsvp_status = $${paramIndex}`;
			params.push(rsvpStatus);
			paramIndex++;
		}

		query += ` ORDER BY e.start_time ASC`;

		const result = await pgPool.query(query, params);
		return result.rows;
	} catch (error) {
		console.error('Error fetching my events:', error);
		throw new Error('Failed to fetch your events');
	}
}

/**
 * Query: recurringEventInstances
 * Expands a recurring event into individual instances using RRULE
 */
export async function recurringEventInstances(
	parent: any,
	args: RecurringEventInstancesArgs,
	context: Context
): Promise<any[]> {
	const { pgPool } = context;
	const { eventId, start, end } = args;

	try {
		// Fetch the recurring event
		const eventResult = await pgPool.query(
			'SELECT * FROM events WHERE id = $1 AND rrule IS NOT NULL',
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			throw new Error('Recurring event not found');
		}

		const event = eventResult.rows[0];

		// Expand recurring event using RRULE service
		const instances = RRuleService.expandRecurringEvent(
			{
				id: event.id,
				title: event.title,
				description: event.description,
				startTime: new Date(event.start_time),
				endTime: new Date(event.end_time),
				location: event.location,
				visibility: event.visibility,
				type: event.type,
				rrule: event.rrule
			},
			new Date(start),
			new Date(end),
			100 // Max 100 occurrences
		);

		return instances.map(instance => ({
			...event,
			id: instance.id,
			start_time: instance.startTime.toISOString(),
			end_time: instance.endTime.toISOString(),
			occurrence_index: instance.occurrenceIndex,
			is_recurring_instance: true,
			parent_event_id: event.id
		}));
	} catch (error) {
		console.error('Error expanding recurring event:', error);
		throw new Error('Failed to expand recurring event');
	}
}

/**
 * Query: conflictingEvents
 * Returns events that overlap with the given time range for the current user
 */
export async function conflictingEvents(
	parent: any,
	args: ConflictingEventsArgs,
	context: Context
): Promise<any[]> {
	const { pgPool, currentUserId } = context;
	const { checkStartTime, checkEndTime } = args;

	if (!currentUserId) {
		throw new Error('Authentication required');
	}

	// Validate time range
	if (new Date(checkStartTime) >= new Date(checkEndTime)) {
		throw new Error('checkEndTime must be after checkStartTime');
	}

	try {
		// Use PostgreSQL tsrange for efficient temporal overlap detection
		const query = `
			SELECT DISTINCT e.*
			FROM events e
			INNER JOIN event_attendees ea ON ea.event_id = e.id
			WHERE ea.employee_id = $1
				AND ea.rsvp_status IN ('accepted', 'tentative')
				AND tsrange(e.start_time, e.end_time) && tsrange($2::timestamptz, $3::timestamptz)
			ORDER BY e.start_time ASC
		`;

		const result = await pgPool.query(query, [currentUserId, checkStartTime, checkEndTime]);
		return result.rows;
	} catch (error) {
		console.error('Error checking conflicts:', error);
		throw new Error('Failed to check for conflicting events');
	}
}

/**
 * Export all query resolvers
 */
export const queryResolvers = {
	events,
	myEvents,
	recurringEventInstances,
	conflictingEvents
};
