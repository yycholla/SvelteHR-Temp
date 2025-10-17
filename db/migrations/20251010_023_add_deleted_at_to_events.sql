-- Migration: Add deleted_at column to events table for soft delete support
-- Date: 2025-10-13

-- Add deleted_at column to events table
ALTER TABLE hr_public.events
    ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for performance on queries with deleted_at filter
CREATE INDEX idx_events_deleted_at ON hr_public.events(deleted_at)
    WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN hr_public.events.deleted_at IS 'Soft delete timestamp. NULL means the event is active, non-NULL means it has been deleted.';

-- Update RLS policies to exclude soft-deleted events
-- Drop existing policies that need updating
DROP POLICY IF EXISTS events_select_policy ON hr_public.events;
DROP POLICY IF EXISTS events_insert_policy ON hr_public.events;
DROP POLICY IF EXISTS events_update_policy ON hr_public.events;
DROP POLICY IF EXISTS events_delete_policy ON hr_public.events;

-- Recreate SELECT policy with deleted_at check
CREATE POLICY events_select_policy ON hr_public.events
    FOR SELECT
    USING (
        deleted_at IS NULL AND (
            -- Public events visible to all authenticated users
            is_public = true
            -- Events organized by the user
            OR organizer_id = current_setting('rls.user_id', true)::uuid
            -- Events user is invited to (via event_attendees)
            OR EXISTS (
                SELECT 1 FROM hr_public.event_attendees ea
                WHERE ea.event_id = events.id
                AND ea.employee_id = current_setting('rls.user_id', true)::uuid
            )
        )
    );

-- Recreate INSERT policy - only authenticated users can create events
CREATE POLICY events_insert_policy ON hr_public.events
    FOR INSERT
    WITH CHECK (
        current_setting('rls.user_id', true)::uuid IS NOT NULL
        AND organizer_id = current_setting('rls.user_id', true)::uuid
    );

-- Recreate UPDATE policy - only organizer can update
CREATE POLICY events_update_policy ON hr_public.events
    FOR UPDATE
    USING (
        deleted_at IS NULL
        AND organizer_id = current_setting('rls.user_id', true)::uuid
    )
    WITH CHECK (
        organizer_id = current_setting('rls.user_id', true)::uuid
    );

-- Recreate DELETE policy - only organizer can delete (soft delete)
CREATE POLICY events_delete_policy ON hr_public.events
    FOR UPDATE
    USING (
        organizer_id = current_setting('rls.user_id', true)::uuid
    )
    WITH CHECK (
        deleted_at IS NOT NULL
    );

-- Grant permissions
GRANT SELECT ON hr_public.events TO authenticated;
GRANT INSERT ON hr_public.events TO authenticated;
GRANT UPDATE ON hr_public.events TO authenticated;
