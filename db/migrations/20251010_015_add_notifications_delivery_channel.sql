-- Migration: Add delivery channel and expand notification types
-- Date: 2025-10-10
-- Purpose: Add delivery_channel field and expand notification_type ENUM values
--          Priority: P2 (Medium - Feature Tables)

BEGIN;

-- ========================================
-- Add delivery_channel field
-- ========================================

ALTER TABLE hr_public.notifications
ADD COLUMN IF NOT EXISTS delivery_channel VARCHAR(20)
  CHECK (delivery_channel IN ('email', 'in_app', 'sms', 'push', 'webhook'));

COMMENT ON COLUMN hr_public.notifications.delivery_channel IS
'Notification delivery method: email (email), in_app (application notification center), sms (text message), push (browser/mobile push), webhook (HTTP POST to configured endpoint)';

-- ========================================
-- Expand notification_type ENUM values
-- ========================================

-- Add new notification types to support expanded use cases
-- Using DO block to handle "value already exists" gracefully

DO $$
BEGIN
  -- Add goal_milestone if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'goal_milestone'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE hr_public.notification_type ADD VALUE 'goal_milestone';
  END IF;

  -- Add document_uploaded if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'document_uploaded'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE hr_public.notification_type ADD VALUE 'document_uploaded';
  END IF;

  -- Add certification_expiring if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'certification_expiring'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE hr_public.notification_type ADD VALUE 'certification_expiring';
  END IF;

  -- Add birthday_reminder if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'birthday_reminder'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE hr_public.notification_type ADD VALUE 'birthday_reminder';
  END IF;

  -- Add anniversary if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'anniversary'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE hr_public.notification_type ADD VALUE 'anniversary';
  END IF;

  -- Add onboarding_task if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'onboarding_task'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE hr_public.notification_type ADD VALUE 'onboarding_task';
  END IF;

  -- Add offboarding_checklist if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'offboarding_checklist'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE hr_public.notification_type ADD VALUE 'offboarding_checklist';
  END IF;
END $$;

-- ========================================
-- Create index for delivery channel queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_notifications_channel
ON hr_public.notifications(delivery_channel, delivered_at)
WHERE delivery_channel IS NOT NULL;

-- Update table statistics
ANALYZE hr_public.notifications;

COMMIT;
