-- Migration: PostgreSQL ENUM Types
-- Created: 2025-10-17
-- Description: All ENUM types used across the HR system

BEGIN;

-- Task Management ENUMs
CREATE TYPE hr_public.task_status AS ENUM ('todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled');
CREATE TYPE hr_public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Event Management ENUMs
CREATE TYPE hr_public.event_type AS ENUM ('meeting', 'training', 'social', 'company_event', 'holiday', 'interview', 'review', 'team_building', 'other');
CREATE TYPE hr_public.event_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE hr_public.event_visibility AS ENUM ('public', 'private', 'department', 'team');
CREATE TYPE hr_public.rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative');
CREATE TYPE hr_public.rsvp_scope AS ENUM ('this_event', 'all_events');

-- Leave Management ENUMs
CREATE TYPE hr_public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Performance Review ENUMs
CREATE TYPE hr_public.review_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Employee Status ENUM
CREATE TYPE hr_public.employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE');

-- Document Management ENUMs
CREATE TYPE hr_public.document_status AS ENUM ('draft', 'published', 'archived', 'deleted');
CREATE TYPE hr_public.assignment_status AS ENUM ('assigned', 'read', 'acknowledged', 'completed');

-- Notification ENUMs
CREATE TYPE hr_public.notification_type AS ENUM (
    'event_invite',
    'event_change',
    'event_cancel',
    'event_comment',
    'event_mention',
    'event_waitlist',
    'event_reminder',
    'task_assigned',
    'task_updated',
    'task_completed',
    'leave_request',
    'leave_approved',
    'leave_rejected',
    'document_assigned',
    'review_scheduled',
    'system_alert'
);

CREATE TYPE hr_public.notification_category AS ENUM (
    'event',
    'task',
    'leave',
    'document',
    'review',
    'system'
);

-- Resource Type ENUM for linked resources
CREATE TYPE hr_public.resource_type AS ENUM (
    'task',
    'event',
    'document',
    'review',
    'leave_request',
    'employee_goal',
    'department'
);

-- Report Status ENUM
CREATE TYPE hr_public.report_status AS ENUM ('draft', 'active', 'scheduled', 'completed', 'failed');

-- Rollback Status ENUM
CREATE TYPE hr_public.rollback_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Bulk Rollback Item Status ENUM
CREATE TYPE hr_public.rollback_item_status AS ENUM ('pending', 'success', 'failed', 'skipped');

COMMIT;
