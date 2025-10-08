-- Migration: Create event_comments table
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Create comments table
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES employees(id),
  content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0 AND LENGTH(content) <= 5000),
  mentions UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Add indexes for comment queries
CREATE INDEX idx_comments_event ON event_comments(event_id);
CREATE INDEX idx_comments_user ON event_comments(user_id);
CREATE INDEX idx_comments_created_at ON event_comments(created_at DESC);

-- Add table comment
COMMENT ON TABLE event_comments IS 'User comments and discussions on events';
COMMENT ON COLUMN event_comments.mentions IS 'Array of employee IDs mentioned in comment with @ syntax';
COMMENT ON COLUMN event_comments.content IS 'Comment text (1-5000 characters after trimming)';

COMMIT;
