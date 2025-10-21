-- Migration: Add review tracking to leave_requests
-- Date: 2025-10-10
-- Purpose: Track which manager reviewed leave requests and when
--          Priority: P3 (Low - Enhancements)

BEGIN;

-- ========================================
-- Add review tracking fields
-- ========================================

ALTER TABLE hr_public.leave_requests
ADD COLUMN IF NOT EXISTS reviewed_by UUID
  REFERENCES hr_public.users(id) ON DELETE SET NULL;

ALTER TABLE hr_public.leave_requests
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ========================================
-- Add column comments
-- ========================================

COMMENT ON COLUMN hr_public.leave_requests.reviewed_by IS
'User ID of manager who reviewed (approved/rejected) the leave request. NULL for pending requests.';

COMMENT ON COLUMN hr_public.leave_requests.reviewed_at IS
'Timestamp when leave request was reviewed. Auto-set when status changes to approved/rejected.';

-- ========================================
-- Create index for review queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_by
ON hr_public.leave_requests(reviewed_by)
WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leave_requests_reviewed_at
ON hr_public.leave_requests(reviewed_at DESC)
WHERE reviewed_at IS NOT NULL;

-- Update table statistics
ANALYZE hr_public.leave_requests;

COMMIT;
