-- Migration: Create Task Types Table
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)

CREATE TABLE IF NOT EXISTS hr_public.task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- TRUE for predefined types (Onboarding, Assessment, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NULL REFERENCES hr_public.users(id) ON DELETE SET NULL
);

-- Index for efficient name lookups
CREATE INDEX IF NOT EXISTS idx_task_types_name ON hr_public.task_types(name);

-- Seed predefined system task types
INSERT INTO hr_public.task_types (name, description, is_system) VALUES
  ('General', 'General purpose task', TRUE),
  ('Onboarding', 'Tasks related to employee onboarding', TRUE),
  ('Assessment', 'Performance assessment related tasks', TRUE),
  ('Training', 'Training and development tasks', TRUE)
ON CONFLICT (name) DO NOTHING;
