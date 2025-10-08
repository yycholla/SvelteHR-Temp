/**
 * PostGraphile Schema Extensions for Events
 * Feature: 025-events-flesh-out
 *
 * This file contains PostGraphile smart comments and computed columns
 * to enhance the GraphQL schema generated from the events tables.
 */

-- Smart comments for better GraphQL documentation

COMMENT ON TABLE events IS E'@omit create,update,delete\nCalendar events with support for single and recurring occurrences';
COMMENT ON TABLE event_attendees IS E'@omit create,update,delete\nEvent attendees with RSVP status tracking';
COMMENT ON TABLE event_waitlist IS E'@omit create,update,delete\nWaitlist entries for events at capacity';
COMMENT ON TABLE event_comments IS E'@omit create,update,delete\nUser comments and discussions on events';
COMMENT ON TABLE event_history IS E'@omit create,update,delete,many\nImmutable audit trail of event changes';
COMMENT ON TABLE event_notifications IS E'@omit create,update,delete\nNotifications for event-related activities';
COMMENT ON TABLE notification_preferences IS E'@omit create,delete\nUser-configurable notification settings';

-- Column documentation
COMMENT ON COLUMN events.rrule IS 'RFC 5545 RRULE string for recurring events';
COMMENT ON COLUMN events.recurrence_id IS 'Parent event ID if this is a recurring event exception';
COMMENT ON COLUMN events.max_capacity IS 'Maximum number of attendees (null = unlimited)';
COMMENT ON COLUMN events.waitlist_enabled IS 'Whether waitlist is enabled when capacity is reached';

COMMENT ON COLUMN event_attendees.rsvp_scope IS 'For recurring events: this_event, this_and_future, or all_events';
COMMENT ON COLUMN event_attendees.is_required IS 'Whether attendance is required';

COMMENT ON COLUMN event_waitlist.position IS 'Position in waitlist queue (FIFO)';

COMMENT ON COLUMN event_comments.mentions IS 'Array of employee IDs mentioned in comment';

COMMENT ON COLUMN notification_preferences.reminder_times IS 'Array of minutes before event to send reminders (e.g., [60, 1440] = 1 hour and 1 day)';

-- Computed columns for better GraphQL experience

/**
 * Computed field: attendeeCount
 * Total number of attendees (all RSVP statuses)
 */
CREATE OR REPLACE FUNCTION events_attendee_count(event events)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM event_attendees
  WHERE event_id = event.id;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_attendee_count(events) IS E'@sortable\nTotal number of attendees';

/**
 * Computed field: acceptedCount
 * Number of attendees who accepted
 */
CREATE OR REPLACE FUNCTION events_accepted_count(event events)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM event_attendees
  WHERE event_id = event.id AND rsvp_status = 'accepted';
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_accepted_count(events) IS E'@sortable\nNumber of attendees who accepted';

/**
 * Computed field: declinedCount
 * Number of attendees who declined
 */
CREATE OR REPLACE FUNCTION events_declined_count(event events)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM event_attendees
  WHERE event_id = event.id AND rsvp_status = 'declined';
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_declined_count(events) IS E'@sortable\nNumber of attendees who declined';

/**
 * Computed field: tentativeCount
 * Number of attendees who responded tentative
 */
CREATE OR REPLACE FUNCTION events_tentative_count(event events)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM event_attendees
  WHERE event_id = event.id AND rsvp_status = 'tentative';
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_tentative_count(events) IS E'@sortable\nNumber of tentative attendees';

/**
 * Computed field: pendingCount
 * Number of attendees with pending RSVP
 */
CREATE OR REPLACE FUNCTION events_pending_count(event events)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM event_attendees
  WHERE event_id = event.id AND rsvp_status = 'pending';
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_pending_count(events) IS E'@sortable\nNumber of pending RSVPs';

/**
 * Computed field: isFull
 * Whether event has reached capacity
 */
CREATE OR REPLACE FUNCTION events_is_full(event events)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN event.max_capacity IS NULL THEN FALSE
    ELSE (
      SELECT COUNT(*) >= event.max_capacity
      FROM event_attendees
      WHERE event_id = event.id AND rsvp_status = 'accepted'
    )
  END;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_is_full(events) IS 'Whether event has reached capacity';

/**
 * Computed field: currentUserRsvp
 * Current user's RSVP status for this event
 */
CREATE OR REPLACE FUNCTION events_current_user_rsvp(event events)
RETURNS TEXT AS $$
  SELECT rsvp_status
  FROM event_attendees
  WHERE event_id = event.id
    AND employee_id = current_setting('app.current_user_id', true)::UUID
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_current_user_rsvp(events) IS 'Current user''s RSVP status';

/**
 * Computed field: waitlistPosition
 * Current user's position in waitlist (null if not waitlisted)
 */
CREATE OR REPLACE FUNCTION events_waitlist_position(event events)
RETURNS INT AS $$
  SELECT position
  FROM event_waitlist
  WHERE event_id = event.id
    AND employee_id = current_setting('app.current_user_id', true)::UUID
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION events_waitlist_position(events) IS 'Current user''s waitlist position';

/**
 * Custom query: myEvents
 * Returns events the current user is attending or invited to
 */
CREATE OR REPLACE FUNCTION my_events(
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL,
  rsvp_status_filter TEXT DEFAULT NULL
)
RETURNS SETOF events AS $$
  SELECT e.*
  FROM events e
  INNER JOIN event_attendees ea ON ea.event_id = e.id
  WHERE ea.employee_id = current_setting('app.current_user_id', true)::UUID
    AND (start_time IS NULL OR e.start_time >= start_time)
    AND (end_time IS NULL OR e.end_time <= end_time)
    AND (rsvp_status_filter IS NULL OR ea.rsvp_status = rsvp_status_filter)
  ORDER BY e.start_time ASC;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION my_events IS 'Events the current user is attending or invited to';

/**
 * Custom query: conflictingEvents
 * Returns events that overlap with the given time range for current user
 */
CREATE OR REPLACE FUNCTION conflicting_events(
  check_start_time TIMESTAMPTZ,
  check_end_time TIMESTAMPTZ
)
RETURNS SETOF events AS $$
  SELECT DISTINCT e.*
  FROM events e
  INNER JOIN event_attendees ea ON ea.event_id = e.id
  WHERE ea.employee_id = current_setting('app.current_user_id', true)::UUID
    AND ea.rsvp_status IN ('accepted', 'tentative')
    AND tsrange(e.start_time, e.end_time) && tsrange(check_start_time, check_end_time)
  ORDER BY e.start_time ASC;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION conflicting_events IS 'Events that conflict with the given time range';

/**
 * Custom query: upcomingEvents
 * Returns upcoming events (public + user's private events)
 */
CREATE OR REPLACE FUNCTION upcoming_events(
  days_ahead INT DEFAULT 30,
  limit_count INT DEFAULT 50
)
RETURNS SETOF events AS $$
  SELECT e.*
  FROM events e
  WHERE e.start_time >= NOW()
    AND e.start_time <= NOW() + (days_ahead || ' days')::INTERVAL
    AND (
      e.visibility = 'public' OR
      e.id IN (
        SELECT event_id FROM event_attendees
        WHERE employee_id = current_setting('app.current_user_id', true)::UUID
      )
    )
  ORDER BY e.start_time ASC
  LIMIT limit_count;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION upcoming_events IS 'Upcoming events visible to current user';

-- Grant execute permissions to PostGraphile roles
GRANT EXECUTE ON FUNCTION events_attendee_count(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION events_accepted_count(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION events_declined_count(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION events_tentative_count(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION events_pending_count(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION events_is_full(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION events_current_user_rsvp(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION events_waitlist_position(events) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION my_events TO postgraphile_user;
GRANT EXECUTE ON FUNCTION conflicting_events TO postgraphile_user;
GRANT EXECUTE ON FUNCTION upcoming_events TO postgraphile_user;
