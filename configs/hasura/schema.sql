-- SvelteHR PostgreSQL Schema
-- Converted from GelDB/EdgeQL schema to PostgreSQL for Hasura GraphQL

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enums (equivalent to EdgeQL scalar types)
CREATE TYPE onboarding_status AS ENUM ('PreHire', 'Onboarding', 'Active', 'Terminated');
CREATE TYPE time_entry_type AS ENUM ('ClockIn', 'ClockOut', 'BreakStart', 'BreakEnd');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'LeftEarly', 'Holiday');
CREATE TYPE approval_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Skipped', 'Escalated');
CREATE TYPE expense_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected', 'Reimbursed');
CREATE TYPE compliance_status AS ENUM ('Active', 'ExpiringSoon', 'Expired', 'PendingReview');
CREATE TYPE renewal_period AS ENUM ('None', 'Monthly', 'Quarterly', 'SemiAnnually', 'Yearly', 'BiYearly');
CREATE TYPE task_status AS ENUM ('Pending', 'InProgress', 'Completed', 'Blocked');
CREATE TYPE notification_type AS ENUM ('Info', 'Success', 'Warning', 'Error', 'Reminder');
CREATE TYPE pay_type AS ENUM ('Hourly', 'Salary', 'Commission', 'Contractor');
CREATE TYPE bank_account_type AS ENUM ('Checking', 'Savings');

-- Users table (replacing rbac::User from GelDB)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    onboarding_status onboarding_status DEFAULT 'PreHire',
    job_title VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User role assignments
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    budget DECIMAL(15,2),
    is_active BOOLEAN DEFAULT true,
    parent_department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Information
CREATE TABLE contact_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(50),
    work_phone_number VARCHAR(50),
    address_street TEXT,
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_zip VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personal Information
CREATE TABLE personal_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(50),
    marital_status VARCHAR(50),
    nationality VARCHAR(100),
    social_security_number VARCHAR(255), -- encrypted
    passport_number VARCHAR(100),
    drivers_license_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Information
CREATE TABLE job_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    job_title VARCHAR(255),
    hire_date DATE,
    employment_type VARCHAR(100),
    work_location VARCHAR(255),
    work_schedule TEXT,
    manager_id UUID REFERENCES users(id),
    termination_date DATE,
    is_remote BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compensation
CREATE TABLE compensation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pay_type pay_type,
    pay_rate DECIMAL(15,2),
    currency VARCHAR(10) DEFAULT 'USD',
    bank_name VARCHAR(255),
    bank_account_type bank_account_type,
    bank_account_number VARCHAR(255), -- encrypted
    bank_routing_number VARCHAR(255), -- encrypted
    direct_deposit_enabled BOOLEAN DEFAULT false,
    salary_review_date DATE,
    bonus_eligible BOOLEAN DEFAULT false,
    overtime_eligible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Authentication sessions (replacing GelDB auth system)
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_token_hash VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth connections
CREATE TABLE oauth_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    provider_name VARCHAR(255),
    access_token_hash TEXT,
    refresh_token_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_onboarding_status ON users(onboarding_status);
CREATE INDEX idx_users_active ON users(is_active);

CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_active ON departments(is_active);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);

CREATE INDEX idx_contact_info_email ON contact_information(email);
CREATE INDEX idx_job_info_department ON job_information(department_id);
CREATE INDEX idx_job_info_hire_date ON job_information(hire_date);
CREATE INDEX idx_job_info_employment_type ON job_information(employment_type);

CREATE INDEX idx_compensation_pay_type ON compensation(pay_type);
CREATE INDEX idx_compensation_salary_review ON compensation(salary_review_date);

CREATE INDEX idx_auth_sessions_token ON auth_sessions(token_hash);
CREATE INDEX idx_auth_sessions_user_active ON auth_sessions(user_id, is_active);
CREATE INDEX idx_auth_sessions_expires ON auth_sessions(expires_at, is_active);

-- Create views for computed properties (similar to GelDB computed properties)
CREATE VIEW departments_with_stats AS
SELECT 
    d.*,
    COALESCE(emp_count.employee_count, 0) as employee_count,
    COALESCE(subdept_count.subdepartment_count, 0) as subdepartment_count,
    COALESCE(active_emp_count.active_employee_count, 0) as active_employee_count,
    CASE 
        WHEN d.budget IS NOT NULL AND COALESCE(emp_count.employee_count, 0) > 0 
        THEN d.budget / GREATEST(COALESCE(emp_count.employee_count, 0), 1)
        ELSE 0 
    END as budget_per_employee
FROM departments d
LEFT JOIN (
    SELECT ji.department_id, COUNT(*) as employee_count
    FROM job_information ji
    JOIN users u ON ji.employee_id = u.id
    WHERE u.is_active = true
    GROUP BY ji.department_id
) emp_count ON d.id = emp_count.department_id
LEFT JOIN (
    SELECT parent_department_id, COUNT(*) as subdepartment_count
    FROM departments
    WHERE is_active = true
    GROUP BY parent_department_id
) subdept_count ON d.id = subdept_count.parent_department_id
LEFT JOIN (
    SELECT ji.department_id, COUNT(*) as active_employee_count
    FROM job_information ji
    JOIN users u ON ji.employee_id = u.id
    WHERE u.is_active = true AND u.onboarding_status = 'Active'
    GROUP BY ji.department_id
) active_emp_count ON d.id = active_emp_count.department_id;

-- Create view for users with roles
CREATE VIEW users_with_roles AS
SELECT 
    u.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', ur.id,
                'name', ur.name,
                'level', ur.level,
                'description', ur.description
            )
        ) FILTER (WHERE ur.id IS NOT NULL), 
        '[]'::json
    ) as roles
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = true
LEFT JOIN user_roles ur ON ura.role_id = ur.id
GROUP BY u.id, u.email, u.password_hash, u.display_name, u.onboarding_status, u.job_title, u.is_active, u.created_at, u.updated_at;

-- Insert sample data
INSERT INTO user_roles (name, level, description) VALUES
('Admin', 100, 'System Administrator'),
('HR Manager', 80, 'Human Resources Manager'),
('Manager', 60, 'Department Manager'),
('Employee', 20, 'Regular Employee'),
('Contractor', 10, 'External Contractor');

-- Insert sample department
INSERT INTO departments (name, description, budget, is_active) VALUES
('Engineering', 'Software Engineering Department', 1000000.00, true),
('Human Resources', 'HR Department', 500000.00, true),
('Marketing', 'Marketing and Sales', 750000.00, true);

-- Insert sample user
INSERT INTO users (email, password_hash, display_name, onboarding_status, job_title) VALUES
('admin@svelteHR.com', '$2b$10$k8Y4WlZvnVBzG4p5R6M8HOfYlqMhNV5wP3ZWJXvTwmJ8Qk2Hn7vxS', 'Admin User', 'Active', 'System Administrator');

-- Get the admin user ID and admin role ID
DO $$ 
DECLARE 
    admin_user_id UUID;
    admin_role_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@svelteHR.com';
    SELECT id INTO admin_role_id FROM user_roles WHERE name = 'Admin';
    
    INSERT INTO user_role_assignments (user_id, role_id, is_active) 
    VALUES (admin_user_id, admin_role_id, true);
END $$;

-- Functions for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_information_updated_at BEFORE UPDATE ON contact_information FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personal_information_updated_at BEFORE UPDATE ON personal_information FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_information_updated_at BEFORE UPDATE ON job_information FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compensation_updated_at BEFORE UPDATE ON compensation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auth_sessions_updated_at BEFORE UPDATE ON auth_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON oauth_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();