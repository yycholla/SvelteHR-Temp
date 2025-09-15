-- Migration: Create Core Tables
-- Created: 2025-01-16
-- Description: Creates core HR tables (departments, employees, employee_account)

-- Departments table
CREATE TABLE hr_public.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_department_id INTEGER REFERENCES hr_public.departments(id),
    manager_id INTEGER, -- Forward reference to employees table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT departments_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT departments_no_self_parent CHECK (id != parent_department_id)
);

-- Employees table
CREATE TABLE hr_public.employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department_id INTEGER NOT NULL REFERENCES hr_public.departments(id),
    manager_id INTEGER REFERENCES hr_public.employees(id),
    role_level INTEGER NOT NULL DEFAULT 20,
    status hr_public.employee_status DEFAULT 'ACTIVE',
    hire_date DATE NOT NULL,
    termination_date DATE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT employees_names_not_empty CHECK (
        LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0
    ),
    CONSTRAINT employees_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT employees_role_level_valid CHECK (role_level IN (0, 20, 60, 80, 100)),
    CONSTRAINT employees_hire_date_not_future CHECK (hire_date <= CURRENT_DATE),
    CONSTRAINT employees_termination_after_hire CHECK (
        termination_date IS NULL OR termination_date >= hire_date
    ),
    CONSTRAINT employees_no_self_manager CHECK (id != manager_id)
);

-- Add foreign key constraint for department manager (now that employees table exists)
ALTER TABLE hr_public.departments 
ADD CONSTRAINT fk_departments_manager 
FOREIGN KEY (manager_id) REFERENCES hr_public.employees(id);

-- Employee accounts table (private schema for sensitive authentication data)
CREATE TABLE hr_private.employee_account (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    refresh_token_hash TEXT,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT employee_account_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT employee_account_failed_attempts_positive CHECK (failed_attempts >= 0),
    CONSTRAINT employee_account_locked_until_future CHECK (
        locked_until IS NULL OR locked_until > CURRENT_TIMESTAMP
    ),
    CONSTRAINT employee_account_refresh_token_expiry CHECK (
        (refresh_token_hash IS NULL AND refresh_token_expires_at IS NULL) OR
        (refresh_token_hash IS NOT NULL AND refresh_token_expires_at IS NOT NULL)
    )
);

-- Indexes for performance optimization
-- Critical for PostGraphile performance: always index foreign keys
CREATE INDEX idx_departments_parent_id ON hr_public.departments(parent_department_id);
CREATE INDEX idx_departments_manager_id ON hr_public.departments(manager_id);

CREATE INDEX idx_employees_department_id ON hr_public.employees(department_id);
CREATE INDEX idx_employees_manager_id ON hr_public.employees(manager_id);
CREATE INDEX idx_employees_email ON hr_public.employees(email);
CREATE INDEX idx_employees_status ON hr_public.employees(status);
CREATE INDEX idx_employees_role_level ON hr_public.employees(role_level);
CREATE INDEX idx_employees_hire_date ON hr_public.employees(hire_date);

-- Composite indexes for common query patterns
CREATE INDEX idx_employees_dept_status ON hr_public.employees(department_id, status);
CREATE INDEX idx_employees_dept_role ON hr_public.employees(department_id, role_level);
CREATE INDEX idx_employees_status_role ON hr_public.employees(status, role_level);

-- Employee account indexes
CREATE INDEX idx_employee_account_employee_id ON hr_private.employee_account(employee_id);
CREATE INDEX idx_employee_account_email ON hr_private.employee_account(email);
CREATE INDEX idx_employee_account_last_login ON hr_private.employee_account(last_login);
CREATE INDEX idx_employee_account_locked_until ON hr_private.employee_account(locked_until) 
WHERE locked_until IS NOT NULL;

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION hr_hidden.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to tables
CREATE TRIGGER tr_departments_updated_at
    BEFORE UPDATE ON hr_public.departments
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_employees_updated_at
    BEFORE UPDATE ON hr_public.employees
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_employee_account_updated_at
    BEFORE UPDATE ON hr_private.employee_account
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

-- Comments for documentation
COMMENT ON TABLE hr_public.departments IS 'Organizational departments with hierarchical structure';
COMMENT ON TABLE hr_public.employees IS 'Employee records with role-based access control';
COMMENT ON TABLE hr_private.employee_account IS 'Sensitive authentication data for employees';

COMMENT ON COLUMN hr_public.employees.role_level IS 'Permission level: 0=Guest, 20=Employee, 60=Manager, 80=HR Admin, 100=Super Admin';
COMMENT ON COLUMN hr_private.employee_account.failed_attempts IS 'Failed login attempts counter for security';
COMMENT ON COLUMN hr_private.employee_account.locked_until IS 'Account locked until this timestamp after failed attempts';