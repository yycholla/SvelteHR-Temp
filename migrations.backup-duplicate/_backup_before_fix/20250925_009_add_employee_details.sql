-- Migration: Add employee contact, emergency contact, vehicle, and pay information
-- Created: 2025-10-02
-- Purpose: Extend users table with comprehensive employee information

-- Add contact information to users table
ALTER TABLE hr_public.users
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state_province VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'United States';

-- Add comments for contact fields
COMMENT ON COLUMN hr_public.users.phone_number IS 'Primary phone number';
COMMENT ON COLUMN hr_public.users.mobile_number IS 'Mobile/cell phone number';
COMMENT ON COLUMN hr_public.users.address_line1 IS 'Street address line 1';
COMMENT ON COLUMN hr_public.users.address_line2 IS 'Street address line 2 (apartment, suite, etc.)';
COMMENT ON COLUMN hr_public.users.city IS 'City';
COMMENT ON COLUMN hr_public.users.state_province IS 'State or province';
COMMENT ON COLUMN hr_public.users.postal_code IS 'Postal or ZIP code';
COMMENT ON COLUMN hr_public.users.country IS 'Country';

-- Create emergency contacts table
CREATE TABLE IF NOT EXISTS hr_public.emergency_contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_primary BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT emergency_contacts_name_not_empty CHECK (length(trim(full_name)) > 0),
    CONSTRAINT emergency_contacts_phone_not_empty CHECK (length(trim(phone_number)) > 0)
);

COMMENT ON TABLE hr_public.emergency_contacts IS 'Emergency contact information for employees';
COMMENT ON COLUMN hr_public.emergency_contacts.is_primary IS 'Indicates primary emergency contact';

-- Create index for quick lookup by employee
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_employee_id
ON hr_public.emergency_contacts(employee_id);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS hr_public.employee_vehicles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    color VARCHAR(50),
    license_plate VARCHAR(20) NOT NULL,
    state_province VARCHAR(100),
    parking_spot VARCHAR(20),
    insurance_company VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_expiry DATE,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_vehicles_license_plate_unique UNIQUE (license_plate),
    CONSTRAINT employee_vehicles_year_valid CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2)
);

COMMENT ON TABLE hr_public.employee_vehicles IS 'Vehicle information for employee parking and security';
COMMENT ON COLUMN hr_public.employee_vehicles.parking_spot IS 'Assigned parking spot number/identifier';

-- Create index for quick lookup by employee
CREATE INDEX IF NOT EXISTS idx_employee_vehicles_employee_id
ON hr_public.employee_vehicles(employee_id);

-- Create compensation records table (sensitive data - should have RLS policies)
CREATE TABLE IF NOT EXISTS hr_private.compensation_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    salary_amount NUMERIC(12,2) NOT NULL,
    salary_currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    pay_frequency VARCHAR(20) DEFAULT 'monthly' NOT NULL, -- weekly, bi-weekly, semi-monthly, monthly, annually
    pay_type VARCHAR(20) DEFAULT 'salary' NOT NULL, -- salary, hourly, contract
    hourly_rate NUMERIC(8,2),
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    bank_name VARCHAR(255),
    bank_account_type VARCHAR(20), -- checking, savings
    bank_account_number_last4 VARCHAR(4), -- Only store last 4 digits
    bank_routing_number VARCHAR(20),
    payment_method VARCHAR(20) DEFAULT 'direct_deposit' NOT NULL, -- direct_deposit, check, wire
    tax_id_last4 VARCHAR(4), -- Only store last 4 digits of SSN/tax ID
    notes TEXT,
    created_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT compensation_records_salary_positive CHECK (salary_amount > 0),
    CONSTRAINT compensation_records_dates_valid CHECK (end_date IS NULL OR end_date >= effective_date),
    CONSTRAINT compensation_records_pay_frequency_valid CHECK (pay_frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'annually')),
    CONSTRAINT compensation_records_pay_type_valid CHECK (pay_type IN ('salary', 'hourly', 'contract')),
    CONSTRAINT compensation_records_payment_method_valid CHECK (payment_method IN ('direct_deposit', 'check', 'wire'))
);

COMMENT ON TABLE hr_private.compensation_records IS 'Sensitive compensation and payment information (private schema)';
COMMENT ON COLUMN hr_private.compensation_records.bank_account_number_last4 IS 'Last 4 digits of bank account for verification';
COMMENT ON COLUMN hr_private.compensation_records.tax_id_last4 IS 'Last 4 digits of SSN/tax ID for verification';

-- Create index for current compensation lookup
CREATE INDEX IF NOT EXISTS idx_compensation_records_employee_current
ON hr_private.compensation_records(employee_id, effective_date DESC)
WHERE end_date IS NULL;

-- Create function to get current compensation for an employee
CREATE OR REPLACE FUNCTION hr_public.get_current_compensation(emp_id UUID)
RETURNS TABLE (
    salary_amount NUMERIC(12,2),
    salary_currency VARCHAR(3),
    pay_frequency VARCHAR(20),
    pay_type VARCHAR(20),
    effective_date DATE
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only HR managers and admins can access compensation data
    IF NOT (
        current_setting('jwt.claims.role', true) IN ('super_admin', 'admin', 'hr_manager')
        OR current_setting('jwt.claims.user_id', true)::uuid = emp_id
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions to view compensation data';
    END IF;

    RETURN QUERY
    SELECT
        cr.salary_amount,
        cr.salary_currency,
        cr.pay_frequency,
        cr.pay_type,
        cr.effective_date
    FROM hr_private.compensation_records cr
    WHERE cr.employee_id = emp_id
        AND (cr.end_date IS NULL OR cr.end_date >= CURRENT_DATE)
    ORDER BY cr.effective_date DESC
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION hr_public.get_current_compensation IS 'Get current compensation for an employee (restricted by RBAC)';

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION hr_hidden.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to new tables
CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON hr_public.emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION hr_hidden.update_updated_at_column();

CREATE TRIGGER update_employee_vehicles_updated_at
    BEFORE UPDATE ON hr_public.employee_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION hr_hidden.update_updated_at_column();

CREATE TRIGGER update_compensation_records_updated_at
    BEFORE UPDATE ON hr_private.compensation_records
    FOR EACH ROW
    EXECUTE FUNCTION hr_hidden.update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.emergency_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.employee_vehicles TO authenticated;

-- Only HR managers and admins can access compensation records
GRANT SELECT, INSERT, UPDATE ON hr_private.compensation_records TO hr_manager, admin, super_admin;

-- Add RLS policies for emergency contacts (employees can view/edit their own)
ALTER TABLE hr_public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY emergency_contacts_view_own ON hr_public.emergency_contacts
    FOR SELECT
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::uuid
        OR current_setting('jwt.claims.role', true) IN ('hr_manager', 'admin', 'super_admin')
    );

CREATE POLICY emergency_contacts_manage_own ON hr_public.emergency_contacts
    FOR ALL
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::uuid
        OR current_setting('jwt.claims.role', true) IN ('hr_manager', 'admin', 'super_admin')
    );

-- Add RLS policies for vehicles (employees can view/edit their own)
ALTER TABLE hr_public.employee_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_vehicles_view_own ON hr_public.employee_vehicles
    FOR SELECT
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::uuid
        OR current_setting('jwt.claims.role', true) IN ('hr_manager', 'admin', 'super_admin')
    );

CREATE POLICY employee_vehicles_manage_own ON hr_public.employee_vehicles
    FOR ALL
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::uuid
        OR current_setting('jwt.claims.role', true) IN ('hr_manager', 'admin', 'super_admin')
    );

-- Add RLS policies for compensation (only HR can view, employees can view their own summary)
ALTER TABLE hr_private.compensation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY compensation_records_hr_full_access ON hr_private.compensation_records
    FOR ALL
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_manager', 'admin', 'super_admin')
    );

CREATE POLICY compensation_records_employee_view_own ON hr_private.compensation_records
    FOR SELECT
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::uuid
    );

-- Create helpful views
CREATE OR REPLACE VIEW hr_public.employees_with_contacts AS
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.display_name,
    u.role,
    u.department_id,
    u.phone_number,
    u.mobile_number,
    u.address_line1,
    u.address_line2,
    u.city,
    u.state_province,
    u.postal_code,
    u.country,
    u.hire_date,
    u.is_active,
    COUNT(DISTINCT ec.id) as emergency_contact_count,
    COUNT(DISTINCT ev.id) as vehicle_count
FROM hr_public.users u
LEFT JOIN hr_public.emergency_contacts ec ON u.id = ec.employee_id
LEFT JOIN hr_public.employee_vehicles ev ON u.id = ev.employee_id
GROUP BY u.id;

COMMENT ON VIEW hr_public.employees_with_contacts IS 'Employee information with contact counts';

-- Refresh PostGraphile schema cache hint
COMMENT ON TABLE hr_public.emergency_contacts IS 'Emergency contact information for employees - updated 2025-10-02';
COMMENT ON TABLE hr_public.employee_vehicles IS 'Vehicle information for employee parking - updated 2025-10-02';
