-- Migration: Add metadata column to notifications table
-- Created: 2025-09-15
-- Description: Add JSONB metadata column to support workflow-generated notifications

-- Add metadata column to store additional notification data
ALTER TABLE hr_public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_workflow_instance 
ON hr_public.notifications 
USING GIN (metadata) 
WHERE metadata ? 'workflow_instance_id';

-- Update table comment for PostGraphile
COMMENT ON TABLE hr_public.notifications IS '@name Notification
User notifications with metadata support for workflow integration';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.notifications TO hr_employee, hr_manager, hr_admin, hr_super_admin;