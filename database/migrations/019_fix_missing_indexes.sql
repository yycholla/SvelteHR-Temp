-- Migration: Fix Missing Foreign Key Indexes
-- Created: 2025-09-15  
-- Description: Add missing indexes for PostGraphile foreign key optimization

-- Workflow system foreign key indexes
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_by ON hr_public.workflow_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_department_id ON hr_public.workflow_definitions(department_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_parent_workflow_id ON hr_public.workflow_definitions(parent_workflow_id);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_triggered_by_user_id ON hr_public.workflow_instances(triggered_by_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_definition_id ON hr_public.workflow_instances(workflow_definition_id);

CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_workflow_instance_id ON hr_public.workflow_step_executions(workflow_instance_id);

CREATE INDEX IF NOT EXISTS idx_workflow_approvals_workflow_instance_id ON hr_public.workflow_approvals(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_step_execution_id ON hr_public.workflow_approvals(step_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_approver_id ON hr_public.workflow_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_escalated_to_id ON hr_public.workflow_approvals(escalated_to_id);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow_instance_id ON hr_public.workflow_tasks(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_step_execution_id ON hr_public.workflow_tasks(step_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_to_id ON hr_public.workflow_tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_by_id ON hr_public.workflow_tasks(assigned_by_id);

-- Notification system foreign key indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON hr_public.notification_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_templates_previous_version_id ON hr_public.notification_templates(previous_version_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON hr_public.notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification_id ON hr_public.notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_id ON hr_public.notification_deliveries(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON hr_public.notification_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_digests_user_id ON hr_public.notification_digests(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON hr_public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_parent_notification_id ON hr_public.notifications(parent_notification_id);

-- Event log foreign key indexes  
CREATE INDEX IF NOT EXISTS idx_workflow_event_log_workflow_instance_id ON hr_hidden.workflow_event_log(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_event_log_step_execution_id ON hr_hidden.workflow_event_log(step_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_event_log_user_id ON hr_hidden.workflow_event_log(user_id);