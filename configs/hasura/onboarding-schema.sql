-- Onboarding Workflow System Schema
-- Extends the existing schema with onboarding workflow capabilities

-- Onboarding workflow templates (predefined workflows for different roles/departments)
CREATE TABLE onboarding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(id),
    role_id UUID REFERENCES user_roles(id),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    estimated_duration_days INTEGER DEFAULT 30,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual onboarding instances (one per new employee)
CREATE TABLE onboarding_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES onboarding_templates(id),
    status onboarding_status DEFAULT 'PreHire',
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    assigned_buddy_id UUID REFERENCES users(id),
    hr_contact_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    notes TEXT,
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding task templates (tasks that are part of a workflow template)
CREATE TABLE onboarding_task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    task_type VARCHAR(100) NOT NULL, -- 'Document', 'Meeting', 'Training', 'System', 'Review', 'Custom'
    category VARCHAR(100), -- 'HR', 'IT', 'Security', 'Training', 'Equipment', 'Documentation'
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT true,
    due_days_from_start INTEGER DEFAULT 0, -- Days from onboarding start date
    estimated_hours DECIMAL(4,2),
    assigned_role VARCHAR(100), -- 'HR', 'Manager', 'IT', 'Buddy', 'Employee'
    prerequisite_task_ids UUID[], -- Array of task template IDs that must be completed first
    documents_required TEXT[], -- Array of document names/types required
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(template_id, order_index)
);

-- Individual task instances (actual tasks assigned to employees)
CREATE TABLE onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
    template_task_id UUID NOT NULL REFERENCES onboarding_task_templates(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    task_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    status task_status DEFAULT 'Pending',
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to_id UUID REFERENCES users(id),
    completed_by_id UUID REFERENCES users(id),
    estimated_hours DECIMAL(4,2),
    actual_hours DECIMAL(4,2),
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of file references
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding documents and forms
CREATE TABLE onboarding_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES onboarding_tasks(id),
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'Form', 'Agreement', 'Policy', 'Photo', 'Certificate'
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by_id UUID REFERENCES users(id),
    is_required BOOLEAN DEFAULT true,
    is_approved BOOLEAN DEFAULT false,
    approved_by_id UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding meetings and appointments
CREATE TABLE onboarding_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
    task_id UUID REFERENCES onboarding_tasks(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_type VARCHAR(100) NOT NULL, -- 'Welcome', 'Training', 'Introduction', 'Review', 'OneOnOne'
    scheduled_date TIMESTAMP WITH TIME ZONE,
    actual_date TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER DEFAULT 60,
    location VARCHAR(255),
    meeting_url VARCHAR(500), -- For virtual meetings
    organizer_id UUID NOT NULL REFERENCES users(id),
    attendee_ids UUID[] NOT NULL, -- Array of user IDs
    status VARCHAR(50) DEFAULT 'Scheduled', -- 'Scheduled', 'Completed', 'Cancelled', 'Rescheduled'
    meeting_notes TEXT,
    action_items TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding feedback and surveys
CREATE TABLE onboarding_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
    feedback_type VARCHAR(100) NOT NULL, -- 'Weekly', 'Milestone', 'Final', 'Exit'
    provided_by_id UUID NOT NULL REFERENCES users(id),
    feedback_for_id UUID NOT NULL REFERENCES users(id), -- Usually the new employee
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    suggestions TEXT,
    areas_of_improvement TEXT[],
    is_anonymous BOOLEAN DEFAULT false,
    feedback_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding equipment and asset tracking
CREATE TABLE onboarding_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(100) NOT NULL, -- 'Laptop', 'Phone', 'Monitor', 'Keyboard', 'Software', 'Access_Card'
    item_description TEXT,
    serial_number VARCHAR(100),
    asset_tag VARCHAR(100),
    assigned_date DATE,
    return_date DATE,
    status VARCHAR(50) DEFAULT 'Requested', -- 'Requested', 'Assigned', 'Returned', 'Damaged', 'Lost'
    assigned_by_id UUID REFERENCES users(id),
    cost DECIMAL(10,2),
    vendor VARCHAR(255),
    warranty_expiry DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_onboarding_instances_employee ON onboarding_instances(employee_id);
CREATE INDEX idx_onboarding_instances_status ON onboarding_instances(status);
CREATE INDEX idx_onboarding_instances_start_date ON onboarding_instances(start_date);

CREATE INDEX idx_onboarding_tasks_instance ON onboarding_tasks(instance_id);
CREATE INDEX idx_onboarding_tasks_status ON onboarding_tasks(status);
CREATE INDEX idx_onboarding_tasks_assigned_to ON onboarding_tasks(assigned_to_id);
CREATE INDEX idx_onboarding_tasks_due_date ON onboarding_tasks(due_date);

CREATE INDEX idx_onboarding_documents_employee ON onboarding_documents(employee_id);
CREATE INDEX idx_onboarding_documents_type ON onboarding_documents(document_type);

CREATE INDEX idx_onboarding_meetings_instance ON onboarding_meetings(instance_id);
CREATE INDEX idx_onboarding_meetings_scheduled ON onboarding_meetings(scheduled_date);
CREATE INDEX idx_onboarding_meetings_organizer ON onboarding_meetings(organizer_id);

CREATE INDEX idx_onboarding_feedback_instance ON onboarding_feedback(instance_id);
CREATE INDEX idx_onboarding_feedback_type ON onboarding_feedback(feedback_type);

CREATE INDEX idx_onboarding_equipment_instance ON onboarding_equipment(instance_id);
CREATE INDEX idx_onboarding_equipment_status ON onboarding_equipment(status);

-- Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_onboarding_completion_percentage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update completion percentage when task status changes
    UPDATE onboarding_instances 
    SET completion_percentage = (
        SELECT COALESCE(
            (COUNT(*) FILTER (WHERE status = 'Completed') * 100) / NULLIF(COUNT(*), 0),
            0
        )
        FROM onboarding_tasks 
        WHERE instance_id = NEW.instance_id
    ),
    updated_at = NOW()
    WHERE id = NEW.instance_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_completion
    AFTER UPDATE OF status ON onboarding_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_completion_percentage();

-- Auto-update onboarding status based on completion
CREATE OR REPLACE FUNCTION update_onboarding_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update employee onboarding status based on completion percentage
    IF NEW.completion_percentage = 100 AND OLD.completion_percentage < 100 THEN
        UPDATE users SET onboarding_status = 'Active', updated_at = NOW() 
        WHERE id = NEW.employee_id;
        
        UPDATE onboarding_instances 
        SET actual_completion_date = CURRENT_DATE 
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_onboarding_status
    AFTER UPDATE OF completion_percentage ON onboarding_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_status();

-- Insert default onboarding templates
INSERT INTO onboarding_templates (name, description, is_default, estimated_duration_days) VALUES
('General Employee Onboarding', 'Standard onboarding process for all employees', true, 30),
('Developer Onboarding', 'Specialized onboarding for software developers', false, 45),
('Manager Onboarding', 'Onboarding process for management positions', false, 60),
('Remote Employee Onboarding', 'Onboarding for remote workers', false, 35);

-- Get template IDs for inserting tasks
DO $$
DECLARE
    general_template_id UUID;
    developer_template_id UUID;
    manager_template_id UUID;
    remote_template_id UUID;
BEGIN
    SELECT id INTO general_template_id FROM onboarding_templates WHERE name = 'General Employee Onboarding';
    SELECT id INTO developer_template_id FROM onboarding_templates WHERE name = 'Developer Onboarding';
    SELECT id INTO manager_template_id FROM onboarding_templates WHERE name = 'Manager Onboarding';
    SELECT id INTO remote_template_id FROM onboarding_templates WHERE name = 'Remote Employee Onboarding';

    -- General Employee Onboarding Tasks
    INSERT INTO onboarding_task_templates (template_id, title, description, task_type, category, order_index, due_days_from_start, assigned_role, is_required) VALUES
    (general_template_id, 'Welcome Email and Introduction', 'Send welcome email with company overview and first-day information', 'Document', 'HR', 1, 0, 'HR', true),
    (general_template_id, 'Complete Employment Paperwork', 'Fill out tax forms, emergency contacts, and other required documents', 'Document', 'HR', 2, 1, 'Employee', true),
    (general_template_id, 'Office Tour and Workspace Setup', 'Tour of office facilities and assignment of workspace', 'Meeting', 'HR', 3, 1, 'HR', true),
    (general_template_id, 'IT Equipment Assignment', 'Assign laptop, phone, and other necessary equipment', 'System', 'IT', 4, 1, 'IT', true),
    (general_template_id, 'System Access Setup', 'Create accounts and provide access to necessary systems', 'System', 'IT', 5, 2, 'IT', true),
    (general_template_id, 'Security Badge and Building Access', 'Issue security badge and activate building access', 'System', 'Security', 6, 2, 'HR', true),
    (general_template_id, 'Meet Your Team', 'Introduction meeting with immediate team members', 'Meeting', 'HR', 7, 3, 'Manager', true),
    (general_template_id, 'Company Handbook Review', 'Review company policies, procedures, and culture guide', 'Training', 'HR', 8, 5, 'Employee', true),
    (general_template_id, 'Role-Specific Training Plan', 'Develop and begin role-specific training program', 'Training', 'Training', 9, 7, 'Manager', true),
    (general_template_id, 'First Week Check-in', 'Check-in meeting to address questions and feedback', 'Meeting', 'HR', 10, 7, 'Manager', true),
    (general_template_id, '30-Day Review Meeting', 'Formal review of progress and goal setting', 'Review', 'HR', 11, 30, 'Manager', true);

    -- Developer-specific tasks (includes general + specific)
    INSERT INTO onboarding_task_templates (template_id, title, description, task_type, category, order_index, due_days_from_start, assigned_role, is_required) VALUES
    (developer_template_id, 'Development Environment Setup', 'Install and configure development tools and environments', 'System', 'IT', 5, 2, 'IT', true),
    (developer_template_id, 'Code Repository Access', 'Grant access to version control systems and repositories', 'System', 'IT', 6, 2, 'IT', true),
    (developer_template_id, 'Technical Architecture Overview', 'Review system architecture and technology stack', 'Training', 'Training', 9, 5, 'Manager', true),
    (developer_template_id, 'Code Review Process Training', 'Learn code review procedures and quality standards', 'Training', 'Training', 10, 7, 'Manager', true),
    (developer_template_id, 'First Code Contribution', 'Complete first bug fix or small feature', 'Training', 'Training', 11, 14, 'Manager', true);

END $$;