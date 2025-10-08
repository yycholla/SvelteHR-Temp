-- Migration: Create full-text search indexes
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Full-text search index for event comments
-- Enables queries like: WHERE to_tsvector('english', content) @@ to_tsquery('english', $1)
CREATE INDEX IF NOT EXISTS idx_comments_fulltext
ON event_comments
USING GIN(to_tsvector('english', content));

-- Full-text search index for event titles and descriptions
CREATE INDEX IF NOT EXISTS idx_events_title_fulltext
ON events
USING GIN(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_events_description_fulltext
ON events
USING GIN(to_tsvector('english', COALESCE(description, '')));

-- Composite full-text index for combined search
CREATE INDEX IF NOT EXISTS idx_events_combined_fulltext
ON events
USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

COMMIT;
