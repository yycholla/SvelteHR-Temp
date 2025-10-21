-- Seed Data: Test events for development and E2E testing
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Insert test events (assumes test employee exists with known IDs)
-- Note: Adjust employee IDs based on your test data

-- Get a test employee ID for created_by (use first employee)
DO $$
DECLARE
  test_employee_id UUID;
  test_employee_id_2 UUID;
  event1_id UUID;
  event2_id UUID;
  event3_id UUID;
  event4_id UUID;
  event5_id UUID;
BEGIN
  -- Get test employee IDs
  SELECT id INTO test_employee_id FROM employees ORDER BY created_at LIMIT 1;
  SELECT id INTO test_employee_id_2 FROM employees ORDER BY created_at LIMIT 1 OFFSET 1;

  IF test_employee_id IS NULL THEN
    RAISE NOTICE 'No employees found. Skipping event seed data.';
    RETURN;
  END IF;

  -- Event 1: Public meeting (no capacity limit)
  INSERT INTO events (
    id, title, description, start_time, end_time, location, visibility, type, created_by
  ) VALUES (
    gen_random_uuid(),
    'All Hands Meeting',
    'Monthly company-wide meeting to discuss Q4 goals and achievements.',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '1 hour',
    'Conference Room A',
    'public',
    'meeting',
    test_employee_id
  ) RETURNING id INTO event1_id;

  -- Event 2: Private training with capacity limit and waitlist
  INSERT INTO events (
    id, title, description, start_time, end_time, location, visibility, type, created_by, max_capacity, waitlist_enabled
  ) VALUES (
    gen_random_uuid(),
    'Advanced Leadership Training',
    'Intensive workshop for managers focusing on team building and conflict resolution.',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days' + INTERVAL '4 hours',
    'Training Room B',
    'private',
    'training',
    test_employee_id,
    15,
    TRUE
  ) RETURNING id INTO event2_id;

  -- Event 3: Recurring event (weekly team standup)
  INSERT INTO events (
    id, title, description, start_time, end_time, location, visibility, type, created_by, rrule
  ) VALUES (
    gen_random_uuid(),
    'Engineering Team Standup',
    'Weekly sync-up for the engineering team.',
    DATE_TRUNC('week', NOW() + INTERVAL '1 week') + TIME '09:00:00',
    DATE_TRUNC('week', NOW() + INTERVAL '1 week') + TIME '09:30:00',
    'Zoom Meeting',
    'public',
    'meeting',
    test_employee_id,
    'FREQ=WEEKLY;BYDAY=MO;COUNT=12' -- Every Monday for 12 weeks
  ) RETURNING id INTO event3_id;

  -- Event 4: Social event with image
  INSERT INTO events (
    id, title, description, start_time, end_time, location, visibility, type, created_by, max_capacity, waitlist_enabled, image_url
  ) VALUES (
    gen_random_uuid(),
    'Summer Company Picnic',
    'Join us for food, games, and team bonding! Bring your family.',
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days' + INTERVAL '6 hours',
    'Central Park Pavilion',
    'public',
    'social',
    test_employee_id,
    100,
    TRUE,
    '/uploads/events/picnic-placeholder.jpg'
  ) RETURNING id INTO event4_id;

  -- Event 5: Conference (multi-day)
  INSERT INTO events (
    id, title, description, start_time, end_time, location, visibility, type, created_by
  ) VALUES (
    gen_random_uuid(),
    'Tech Summit 2025',
    'Annual technology conference featuring keynotes from industry leaders.',
    NOW() + INTERVAL '60 days',
    NOW() + INTERVAL '62 days',
    'Convention Center',
    'public',
    'conference',
    test_employee_id
  ) RETURNING id INTO event5_id;

  -- Add test attendees with various RSVP statuses
  IF test_employee_id_2 IS NOT NULL THEN
    -- Event 1: Accepted
    INSERT INTO event_attendees (event_id, employee_id, rsvp_status, is_required)
    VALUES (event1_id, test_employee_id_2, 'accepted', FALSE);

    -- Event 2: Pending
    INSERT INTO event_attendees (event_id, employee_id, rsvp_status, is_required)
    VALUES (event2_id, test_employee_id_2, 'pending', TRUE);

    -- Event 3: Tentative
    INSERT INTO event_attendees (event_id, employee_id, rsvp_status, is_required)
    VALUES (event3_id, test_employee_id_2, 'tentative', FALSE);

    -- Event 4: Declined
    INSERT INTO event_attendees (event_id, employee_id, rsvp_status, is_required)
    VALUES (event4_id, test_employee_id_2, 'declined', FALSE);
  END IF;

  -- Add test comment
  INSERT INTO event_comments (event_id, user_id, content)
  VALUES (
    event1_id,
    test_employee_id,
    'Looking forward to this meeting! Will the slides be shared beforehand?'
  );

  -- Add notification preferences for test employee
  INSERT INTO notification_preferences (user_id)
  VALUES (test_employee_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF test_employee_id_2 IS NOT NULL THEN
    INSERT INTO notification_preferences (user_id, event_reminders, reminder_times)
    VALUES (test_employee_id_2, TRUE, ARRAY[30, 60, 1440]) -- 30 min, 1 hour, 1 day
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Event seed data inserted successfully';
END $$;

COMMIT;
