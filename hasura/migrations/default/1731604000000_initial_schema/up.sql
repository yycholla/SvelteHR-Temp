-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE onboarding_status AS ENUM ('PreHire', 'Onboarding', 'Active', 'Terminated');
CREATE TYPE employment_type AS ENUM ('FullTime', 'PartTime', 'Contract', 'Intern', 'Consultant');

-- =============================================================================
-- Core Tables
-- =============================================================================

-- Users table (combines authentication and employee data)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    display_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    onboarding_status onboarding_status DEFAULT 'PreHire',
    job_title VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    budget DECIMAL(15, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Role Assignments (many-to-many)
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Job Information table
CREATE TABLE IF NOT EXISTS job_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    job_title VARCHAR(255),
    hire_date DATE,
    termination_date DATE,
    employment_type employment_type DEFAULT 'FullTime',
    work_location VARCHAR(255),
    work_schedule VARCHAR(100),
    is_remote BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Information table
CREATE TABLE IF NOT EXISTS contact_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone_number VARCHAR(50),
    work_phone_number VARCHAR(50),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_zip VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'USA',
    emergency_contact_name VARCHAR(255),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal Information table (PII - encrypted in production)
CREATE TABLE IF NOT EXISTS personal_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(50),
    marital_status VARCHAR(50),
    nationality VARCHAR(100),
    social_security_number VARCHAR(50), -- Should be encrypted
    passport_number VARCHAR(100),
    drivers_license_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compensation table
CREATE TABLE IF NOT EXISTS compensation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pay_type VARCHAR(50),
    pay_rate DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    effective_date DATE,
    end_date DATE,
    bank_name VARCHAR(255),
    bank_account_type VARCHAR(50),
    bank_account_number VARCHAR(100), -- Should be encrypted
    bank_routing_number VARCHAR(100), -- Should be encrypted
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_onboarding_status ON users(onboarding_status);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_manager ON departments(manager_id);
CREATE INDEX idx_departments_is_active ON departments(is_active);

CREATE INDEX idx_job_info_employee ON job_information(employee_id);
CREATE INDEX idx_job_info_department ON job_information(department_id);
CREATE INDEX idx_job_info_manager ON job_information(manager_id);

CREATE INDEX idx_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX idx_role_assignments_active ON user_role_assignments(is_active);

-- =============================================================================
-- Views for Common Queries
-- =============================================================================

-- Department statistics view
CREATE OR REPLACE VIEW departments_with_stats AS
SELECT 
    d.*,
    COUNT(DISTINCT ji.employee_id) as employee_count,
    COUNT(DISTINCT sd.id) as subdepartment_count,
    COUNT(DISTINCT CASE WHEN u.onboarding_status = 'Active' THEN ji.employee_id END) as active_employee_count,
    CASE 
        WHEN COUNT(DISTINCT ji.employee_id) > 0 THEN d.budget / COUNT(DISTINCT ji.employee_id)
        ELSE 0
    END as budget_per_employee
FROM departments d
LEFT JOIN job_information ji ON ji.department_id = d.id
LEFT JOIN users u ON u.id = ji.employee_id
LEFT JOIN departments sd ON sd.parent_department_id = d.id
GROUP BY d.id;

-- =============================================================================
-- Triggers for Updated Timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_information_updated_at BEFORE UPDATE ON job_information
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_information_updated_at BEFORE UPDATE ON contact_information
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_information_updated_at BEFORE UPDATE ON personal_information
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compensation_updated_at BEFORE UPDATE ON compensation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Initial Data
-- =============================================================================

-- Insert default roles
INSERT INTO user_roles (name, description, level, is_system) VALUES
    ('admin', 'System Administrator', 100, true),
    ('hr_manager', 'HR Manager', 80, true),
    ('hr_specialist', 'HR Specialist', 60, true),
    ('manager', 'Department Manager', 50, true),
    ('employee', 'Regular Employee', 10, true),
    ('viewer', 'Read-only Access', 5, true)
ON CONFLICT (name) DO NOTHING;

-- Insert test admin user (password: admin123)
INSERT INTO users (email, password_hash, display_name, first_name, last_name, onboarding_status, job_title) VALUES
    ('admin@svelteHR.com', '$2a$10$rBV2JDeWW3.vKyeQcM8fFO4777l4bVeQgDL6VIkxJ9dhPaLHOxTOu', 'Admin User', 'Admin', 'User', 'Active', 'System Administrator')
ON CONFLICT (email) DO NOTHING;

-- Assign admin role to admin user
INSERT INTO user_role_assignments (user_id, role_id, is_active)
SELECT u.id, r.id, true
FROM users u, user_roles r
WHERE u.email = 'admin@svelteHR.com' AND r.name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;