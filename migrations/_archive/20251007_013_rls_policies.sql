-- Migration: Enable RLS and create security policies for events
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Enable Row-Level Security on all event-related tables
ALTER TABLE hr_public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- EVENTS POLICIES --

-- SELECT: Users see public events + private events they're invited to
DROP POLICY IF EXISTS events_select_policy ON hr_public.events;
CREATE POLICY events_select_policy ON hr_public.events
  FOR SELECT USING (
    is_public = TRUE OR
    id IN (
      SELECT event_id FROM hr_public.event_attendees
      WHERE employee_id = current_setting('app.current_user_id', true)::UUID
    ) OR
    organizer_id = current_setting('app.current_user_id', true)::UUID
  );

-- INSERT: Any authenticated user can create events
DROP POLICY IF EXISTS events_insert_policy ON hr_public.events;
CREATE POLICY events_insert_policy ON hr_public.events
  FOR INSERT WITH CHECK (
    organizer_id = current_setting('app.current_user_id', true)::UUID
  );

-- UPDATE: Event organizers can update their own events
DROP POLICY IF EXISTS events_update_policy ON hr_public.events;
CREATE POLICY events_update_policy ON hr_public.events
  FOR UPDATE USING (
    organizer_id = current_setting('app.current_user_id', true)::UUID
  );

-- DELETE: Event organizers can delete their own events
DROP POLICY IF EXISTS events_delete_policy ON hr_public.events;
CREATE POLICY events_delete_policy ON hr_public.events
  FOR DELETE USING (
    organizer_id = current_setting('app.current_user_id', true)::UUID
  );

-- EVENT_ATTENDEES POLICIES --

-- SELECT: Users can view attendees of events they can see
DROP POLICY IF EXISTS attendees_select_policy ON hr_public.event_attendees;
CREATE POLICY attendees_select_policy ON hr_public.event_attendees
  FOR SELECT USING (
    event_id IN (SELECT id FROM hr_public.events) -- Leverages events RLS policy
  );

-- INSERT: Event creators can add attendees, users can RSVP themselves
DROP POLICY IF EXISTS attendees_insert_policy ON hr_public.event_attendees;
CREATE POLICY attendees_insert_policy ON hr_public.event_attendees
  FOR INSERT WITH CHECK (
    employee_id = current_setting('app.current_user_id', true)::UUID OR
    event_id IN (
      SELECT id FROM hr_public.events WHERE organizer_id = current_setting('app.current_user_id', true)::UUID
    )
  );

-- UPDATE: Users can only modify their own RSVP
DROP POLICY IF EXISTS attendees_update_policy ON hr_public.event_attendees;
CREATE POLICY attendees_update_policy ON hr_public.event_attendees
  FOR UPDATE USING (
    employee_id = current_setting('app.current_user_id', true)::UUID
  );

-- DELETE: Event creators can remove attendees, users can remove themselves
DROP POLICY IF EXISTS attendees_delete_policy ON hr_public.event_attendees;
CREATE POLICY attendees_delete_policy ON hr_public.event_attendees
  FOR DELETE USING (
    employee_id = current_setting('app.current_user_id', true)::UUID OR
    event_id IN (
      SELECT id FROM hr_public.events WHERE organizer_id = current_setting('app.current_user_id', true)::UUID
    )
  );

-- EVENT_WAITLIST POLICIES --

-- SELECT: Users can view waitlist for events they can see
DROP POLICY IF EXISTS waitlist_select_policy ON hr_public.event_waitlist;
CREATE POLICY waitlist_select_policy ON hr_public.event_waitlist
  FOR SELECT USING (
    event_id IN (SELECT id FROM hr_public.events)
  );

-- INSERT: Users can add themselves to waitlist
DROP POLICY IF EXISTS waitlist_insert_policy ON hr_public.event_waitlist;
CREATE POLICY waitlist_insert_policy ON hr_public.event_waitlist
  FOR INSERT WITH CHECK (
    employee_id = current_setting('app.current_user_id', true)::UUID
  );

-- DELETE: Users can remove themselves from waitlist
DROP POLICY IF EXISTS waitlist_delete_policy ON hr_public.event_waitlist;
CREATE POLICY waitlist_delete_policy ON hr_public.event_waitlist
  FOR DELETE USING (
    employee_id = current_setting('app.current_user_id', true)::UUID
  );

-- EVENT_COMMENTS POLICIES --

-- SELECT: Users can view comments on events they can see
DROP POLICY IF EXISTS comments_select_policy ON hr_public.event_comments;
CREATE POLICY comments_select_policy ON hr_public.event_comments
  FOR SELECT USING (
    event_id IN (SELECT id FROM hr_public.events)
  );

-- INSERT: Users can comment on events they can see
DROP POLICY IF EXISTS comments_insert_policy ON hr_public.event_comments;
CREATE POLICY comments_insert_policy ON hr_public.event_comments
  FOR INSERT WITH CHECK (
    user_id = current_setting('app.current_user_id', true)::UUID AND
    event_id IN (SELECT id FROM hr_public.events)
  );

-- UPDATE: Users can edit only their own comments
DROP POLICY IF EXISTS comments_update_policy ON hr_public.event_comments;
CREATE POLICY comments_update_policy ON hr_public.event_comments
  FOR UPDATE USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

-- DELETE: Users can delete only their own comments
DROP POLICY IF EXISTS comments_delete_policy ON hr_public.event_comments;
CREATE POLICY comments_delete_policy ON hr_public.event_comments
  FOR DELETE USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

-- EVENT_NOTIFICATIONS POLICIES --

-- SELECT: Users can only see their own notifications
DROP POLICY IF EXISTS notifications_select_policy ON hr_public.event_notifications;
CREATE POLICY notifications_select_policy ON hr_public.event_notifications
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

-- UPDATE: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS notifications_update_policy ON hr_public.event_notifications;
CREATE POLICY notifications_update_policy ON hr_public.event_notifications
  FOR UPDATE USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

-- NOTIFICATION_PREFERENCES POLICIES --

-- SELECT: Users can view their own preferences
DROP POLICY IF EXISTS prefs_select_policy ON hr_public.notification_preferences;
CREATE POLICY prefs_select_policy ON hr_public.notification_preferences
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

-- INSERT: Users can create their own preferences
DROP POLICY IF EXISTS prefs_insert_policy ON hr_public.notification_preferences;
CREATE POLICY prefs_insert_policy ON hr_public.notification_preferences
  FOR INSERT WITH CHECK (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

-- UPDATE: Users can update their own preferences
DROP POLICY IF EXISTS prefs_update_policy ON hr_public.notification_preferences;
CREATE POLICY prefs_update_policy ON hr_public.notification_preferences
  FOR UPDATE USING (
    user_id = current_setting('app.current_user_id', true)::UUID
  );

COMMIT;
