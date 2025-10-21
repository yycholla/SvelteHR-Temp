-- Migration: Create Task System Enums
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)

-- Task status enum
DO $$ BEGIN
  CREATE TYPE task_status_enum AS ENUM (
    'To Do',
    'In Progress',
    'Blocked',
    'Deferred',
    'Completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Task priority enum
DO $$ BEGIN
  CREATE TYPE task_priority_enum AS ENUM (
    'Low',
    'Medium',
    'High',
    'Urgent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Resource type enum for linked resources
DO $$ BEGIN
  CREATE TYPE resource_type_enum AS ENUM (
    'assessment',
    'document',
    'training',
    'event',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Availability status enum for linked resources
DO $$ BEGIN
  CREATE TYPE availability_status_enum AS ENUM (
    'available',
    'unavailable'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Audit action type enum for task audit entries
DO $$ BEGIN
  CREATE TYPE audit_action_type_enum AS ENUM (
    'created',
    'edited',
    'reassigned',
    'deleted',
    'status_changed',
    'org_change'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
