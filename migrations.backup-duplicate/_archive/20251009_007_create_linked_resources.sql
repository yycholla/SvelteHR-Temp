-- Migration: Create Linked Resources Table
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)

CREATE TABLE IF NOT EXISTS linked_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  resource_type resource_type_enum NOT NULL,
  resource_id UUID NOT NULL,
  resource_title VARCHAR(255) NOT NULL,
  availability_status availability_status_enum DEFAULT 'available',
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint to prevent duplicate links
  CONSTRAINT unique_task_resource UNIQUE (task_id, resource_type, resource_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_linked_resources_task ON linked_resources(task_id);
CREATE INDEX IF NOT EXISTS idx_linked_resources_type ON linked_resources(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_linked_resources_status ON linked_resources(availability_status)
  WHERE availability_status = 'unavailable';
