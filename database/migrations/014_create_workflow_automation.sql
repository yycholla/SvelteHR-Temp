-- Migration: Create Workflow Automation Engine
-- Created: 2025-09-15
-- Description: Event-driven workflow system for HR process automation

-- Create ENUM types for workflow system
CREATE TYPE hr_public.workflow_trigger_type AS ENUM (
    'USER_CREATED',
    'USER_UPDATED', 
    'EMPLOYEE_HIRED',
    'EMPLOYEE_TERMINATED',
    'TIME_OFF_REQUESTED',
    'TIME_OFF_APPROVED',
    'TIME_OFF_REJECTED',
    'REVIEW_CREATED',
    'REVIEW_COMPLETED',
    'GOAL_CREATED',
    'GOAL_COMPLETED',
    'DOCUMENT_UPLOADED',
    'DOCUMENT_SIGNED',
    'PAYROLL_PROCESSED',
    'MANUAL_TRIGGER',
    'SCHEDULED_TRIGGER'
);

CREATE TYPE hr_public.workflow_action_type AS ENUM (
    'SEND_NOTIFICATION',
    'SEND_EMAIL',
    'CREATE_TASK',
    'ASSIGN_ROLE',
    'UPDATE_STATUS',
    'CREATE_DOCUMENT',
    'SCHEDULE_MEETING',
    'SEND_APPROVAL_REQUEST',
    'EXECUTE_FUNCTION',
    'DELAY',
    'CONDITIONAL_BRANCH',
    'LOOP',
    'END_WORKFLOW'
);

CREATE TYPE hr_public.workflow_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE hr_public.workflow_instance_status AS ENUM (
    'PENDING',
    'RUNNING',
    'WAITING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'TIMEOUT'
);

-- Workflow definitions table
CREATE TABLE hr_public.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Workflow metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'ONBOARDING', 'OFFBOARDING', 'APPROVAL', 'NOTIFICATION', etc.
    
    -- Trigger configuration
    trigger_type hr_public.workflow_trigger_type NOT NULL,
    trigger_conditions JSONB, -- Conditions that must be met to trigger
    
    -- Workflow configuration
    definition JSONB NOT NULL, -- Complete workflow definition (steps, actions, conditions)
    is_template BOOLEAN DEFAULT false, -- Whether this can be used as a template
    
    -- Execution settings
    timeout_minutes INTEGER DEFAULT 1440, -- 24 hours default
    max_retries INTEGER DEFAULT 3,
    retry_delay_minutes INTEGER DEFAULT 5,
    
    -- Status and versioning
    status hr_public.workflow_status DEFAULT 'DRAFT',
    version INTEGER DEFAULT 1,
    parent_workflow_id UUID REFERENCES hr_public.workflow_definitions(id),
    
    -- Access control
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    department_id UUID REFERENCES hr_public.departments(id), -- Scope to department
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflow_name_version_unique UNIQUE(name, version),
    CONSTRAINT workflow_timeout_valid CHECK (timeout_minutes > 0),
    CONSTRAINT workflow_retries_valid CHECK (max_retries >= 0)
);

-- Workflow instances (executions)
CREATE TABLE hr_public.workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Workflow reference
    workflow_definition_id UUID NOT NULL REFERENCES hr_public.workflow_definitions(id),
    
    -- Instance metadata
    instance_name VARCHAR(255),
    
    -- Trigger information
    triggered_by_user_id UUID REFERENCES hr_public.users(id),
    triggered_by_event VARCHAR(100),
    trigger_data JSONB, -- Data that triggered the workflow
    
    -- Execution context
    context_data JSONB, -- Variables and data available throughout execution
    current_step_id VARCHAR(100), -- Current step being executed
    
    -- Status and timing
    status hr_public.workflow_instance_status DEFAULT 'PENDING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflow_instance_completion_logic CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL) OR
        (status != 'COMPLETED')
    )
);

-- Individual workflow step executions
CREATE TABLE hr_public.workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    workflow_instance_id UUID NOT NULL REFERENCES hr_public.workflow_instances(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL, -- Step identifier from workflow definition
    
    -- Step details
    step_name VARCHAR(255),
    action_type hr_public.workflow_action_type NOT NULL,
    action_config JSONB, -- Configuration for this specific action
    
    -- Execution details
    status hr_public.workflow_instance_status DEFAULT 'PENDING',
    input_data JSONB,
    output_data JSONB,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflow_step_completion_logic CHECK (
        (status IN ('COMPLETED', 'FAILED') AND completed_at IS NOT NULL) OR
        (status NOT IN ('COMPLETED', 'FAILED'))
    )
);

-- Workflow approvals
CREATE TABLE hr_public.workflow_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    workflow_instance_id UUID NOT NULL REFERENCES hr_public.workflow_instances(id) ON DELETE CASCADE,
    step_execution_id UUID REFERENCES hr_public.workflow_step_executions(id),
    
    -- Approval details
    approval_type VARCHAR(100) NOT NULL, -- 'TIME_OFF', 'DOCUMENT', 'EXPENSE', etc.
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Approver information
    approver_id UUID NOT NULL REFERENCES hr_public.users(id),
    approver_role VARCHAR(100), -- Role at time of approval
    
    -- Approval chain
    approval_level INTEGER DEFAULT 1,
    required_approvals INTEGER DEFAULT 1, -- How many approvals needed at this level
    
    -- Decision
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'DELEGATED'
    decision_reason TEXT,
    decided_at TIMESTAMPTZ,
    
    -- Escalation
    escalation_after_hours INTEGER DEFAULT 24,
    escalated_to_id UUID REFERENCES hr_public.users(id),
    escalated_at TIMESTAMPTZ,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflow_approval_decision_logic CHECK (
        (status IN ('APPROVED', 'REJECTED') AND decided_at IS NOT NULL) OR
        (status NOT IN ('APPROVED', 'REJECTED'))
    ),
    CONSTRAINT workflow_approval_level_valid CHECK (approval_level > 0),
    CONSTRAINT workflow_escalation_hours_valid CHECK (escalation_after_hours > 0)
);

-- Workflow tasks (generated by workflows)
CREATE TABLE hr_public.workflow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    workflow_instance_id UUID NOT NULL REFERENCES hr_public.workflow_instances(id) ON DELETE CASCADE,
    step_execution_id UUID REFERENCES hr_public.workflow_step_executions(id),
    
    -- Task details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(100), -- 'ACTION_REQUIRED', 'INFORMATION', 'APPROVAL', 'DOCUMENT_REVIEW'
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    
    -- Assignment
    assigned_to_id UUID NOT NULL REFERENCES hr_public.users(id),
    assigned_by_id UUID REFERENCES hr_public.users(id),
    
    -- Task data
    task_data JSONB, -- Any data needed to complete the task
    completion_criteria JSONB, -- What constitutes completion
    
    -- Status and timing
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT workflow_task_completion_logic CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL) OR
        (status != 'COMPLETED')
    ),
    CONSTRAINT workflow_task_priority_valid CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);

-- Workflow event log for debugging and auditing
CREATE TABLE hr_hidden.workflow_event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    workflow_instance_id UUID REFERENCES hr_public.workflow_instances(id),
    step_execution_id UUID REFERENCES hr_public.workflow_step_executions(id),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_message TEXT,
    event_data JSONB,
    
    -- Context
    user_id UUID REFERENCES hr_public.users(id),
    ip_address INET,
    user_agent TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default workflow templates
INSERT INTO hr_public.workflow_definitions (
    name, description, category, trigger_type, definition, is_template, created_by
) VALUES 
(
    'Employee Onboarding',
    'Standard onboarding workflow for new employees',
    'ONBOARDING',
    'EMPLOYEE_HIRED',
    '{
        "steps": [
            {
                "id": "welcome_email",
                "name": "Send Welcome Email",
                "action": "SEND_EMAIL",
                "config": {
                    "template": "welcome_new_employee",
                    "to": "{{employee.email}}",
                    "data": {"employee_name": "{{employee.display_name}}"}
                }
            },
            {
                "id": "create_accounts",
                "name": "Create IT Accounts",
                "action": "CREATE_TASK",
                "config": {
                    "title": "Set up IT accounts for {{employee.display_name}}",
                    "assigned_to": "it_admin",
                    "due_hours": 24
                }
            },
            {
                "id": "handbook_acknowledgment",
                "name": "Employee Handbook",
                "action": "CREATE_DOCUMENT",
                "config": {
                    "template_id": "handbook_acknowledgment",
                    "requires_signature": true
                }
            },
            {
                "id": "tax_forms",
                "name": "Tax Documentation",
                "action": "CREATE_DOCUMENT",
                "config": {
                    "template_id": "w4_tax_form",
                    "requires_signature": true
                }
            },
            {
                "id": "benefits_enrollment",
                "name": "Benefits Enrollment",
                "action": "CREATE_TASK",
                "config": {
                    "title": "Complete benefits enrollment",
                    "assigned_to": "{{employee.id}}",
                    "due_days": 30
                }
            }
        ]
    }',
    true,
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
),
(
    'Time Off Approval',
    'Multi-level approval workflow for time-off requests',
    'APPROVAL',
    'TIME_OFF_REQUESTED',
    '{
        "steps": [
            {
                "id": "manager_approval",
                "name": "Manager Approval",
                "action": "SEND_APPROVAL_REQUEST",
                "config": {
                    "approver": "{{request.employee.manager_id}}",
                    "subject": "Time-off request approval needed",
                    "escalation_hours": 48
                }
            },
            {
                "id": "hr_review",
                "name": "HR Review",
                "action": "CONDITIONAL_BRANCH",
                "config": {
                    "condition": "{{request.hours_requested}} > 80",
                    "true_action": {
                        "action": "SEND_APPROVAL_REQUEST",
                        "config": {
                            "approver_role": "hr_admin",
                            "subject": "Extended time-off request review"
                        }
                    }
                }
            },
            {
                "id": "notify_approval",
                "name": "Notify Employee",
                "action": "SEND_NOTIFICATION",
                "config": {
                    "to": "{{request.user_id}}",
                    "title": "Time-off request {{approval.status}}",
                    "message": "Your time-off request has been {{approval.status}}"
                }
            }
        ]
    }',
    true,
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
),
(
    'Employee Offboarding',
    'Comprehensive offboarding workflow for departing employees',
    'OFFBOARDING', 
    'EMPLOYEE_TERMINATED',
    '{
        "steps": [
            {
                "id": "revoke_access",
                "name": "Revoke System Access",
                "action": "CREATE_TASK",
                "config": {
                    "title": "Revoke all system access for {{employee.display_name}}",
                    "assigned_to": "it_admin",
                    "priority": "HIGH",
                    "due_hours": 2
                }
            },
            {
                "id": "final_payroll",
                "name": "Process Final Payroll",
                "action": "CREATE_TASK",
                "config": {
                    "title": "Calculate final payroll for {{employee.display_name}}",
                    "assigned_to": "payroll_admin",
                    "due_days": 3
                }
            },
            {
                "id": "return_equipment",
                "name": "Equipment Return",
                "action": "CREATE_TASK",
                "config": {
                    "title": "Collect company equipment from {{employee.display_name}}",
                    "assigned_to": "facilities_admin",
                    "due_days": 5
                }
            },
            {
                "id": "exit_interview",
                "name": "Schedule Exit Interview",
                "action": "CREATE_TASK",
                "config": {
                    "title": "Conduct exit interview with {{employee.display_name}}",
                    "assigned_to": "hr_admin",
                    "due_days": 7
                }
            }
        ]
    }',
    true,
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
);

-- Create indexes for performance
CREATE INDEX idx_workflow_definitions_trigger ON hr_public.workflow_definitions(trigger_type, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_workflow_definitions_category ON hr_public.workflow_definitions(category, is_template);

CREATE INDEX idx_workflow_instances_status ON hr_public.workflow_instances(status, created_at DESC);
CREATE INDEX idx_workflow_instances_triggered_by ON hr_public.workflow_instances(triggered_by_user_id);
CREATE INDEX idx_workflow_instances_definition ON hr_public.workflow_instances(workflow_definition_id);

CREATE INDEX idx_workflow_step_executions_instance ON hr_public.workflow_step_executions(workflow_instance_id, step_id);
CREATE INDEX idx_workflow_step_executions_status ON hr_public.workflow_step_executions(status, created_at);

CREATE INDEX idx_workflow_approvals_approver ON hr_public.workflow_approvals(approver_id, status) WHERE status = 'PENDING';
CREATE INDEX idx_workflow_approvals_escalation ON hr_public.workflow_approvals(escalation_after_hours, created_at) WHERE status = 'PENDING';

CREATE INDEX idx_workflow_tasks_assigned ON hr_public.workflow_tasks(assigned_to_id, status) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_workflow_tasks_due ON hr_public.workflow_tasks(due_date) WHERE status IN ('PENDING', 'IN_PROGRESS') AND due_date IS NOT NULL;

CREATE INDEX idx_workflow_event_log_instance ON hr_hidden.workflow_event_log(workflow_instance_id, created_at DESC);
CREATE INDEX idx_workflow_event_log_type ON hr_hidden.workflow_event_log(event_type, created_at DESC);

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.workflow_definitions IS '@name WorkflowDefinition
Configurable workflow templates for HR process automation';

COMMENT ON TABLE hr_public.workflow_instances IS '@name WorkflowInstance
Active workflow executions with state tracking';

COMMENT ON TABLE hr_public.workflow_step_executions IS '@name WorkflowStepExecution
Individual step executions within workflow instances';

COMMENT ON TABLE hr_public.workflow_approvals IS '@name WorkflowApproval
Approval requests generated by workflows with escalation support';

COMMENT ON TABLE hr_public.workflow_tasks IS '@name WorkflowTask
Tasks assigned to users as part of workflow execution';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.workflow_definitions TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.workflow_definitions TO hr_manager, hr_employee;

GRANT SELECT, INSERT, UPDATE ON hr_public.workflow_instances TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.workflow_instances TO hr_manager, hr_employee;

GRANT SELECT, INSERT, UPDATE ON hr_public.workflow_step_executions TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.workflow_step_executions TO hr_manager;

GRANT SELECT, INSERT, UPDATE ON hr_public.workflow_approvals TO hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.workflow_approvals TO hr_employee;

GRANT SELECT, INSERT, UPDATE ON hr_public.workflow_tasks TO hr_employee, hr_manager, hr_admin, hr_super_admin;