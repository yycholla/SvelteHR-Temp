-- Migration: Create event_comments table
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Create comments table
CREATE TABLE IF NOT EXISTS hr_public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hr_public.users(id),
  content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0 AND LENGTH(content) <= 5000),
  mentions UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Add indexes for comment queries
CREATE INDEX idx_comments_event ON hr_public.event_comments(event_id);
CREATE INDEX idx_comments_user ON hr_public.event_comments(user_id);
CREATE INDEX idx_comments_created_at ON hr_public.event_comments(created_at DESC);

-- Add table comment
COMMENT ON TABLE hr_public.event_comments IS 'User comments and discussions on events';
COMMENT ON COLUMN hr_public.event_comments.mentions IS 'Array of employee IDs mentioned in comment with @ syntax';
COMMENT ON COLUMN hr_public.event_comments.content IS 'Comment text (1-5000 characters after trimming)';

COMMIT;
