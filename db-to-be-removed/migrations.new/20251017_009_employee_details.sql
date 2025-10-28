-- Migration: Employee Details
-- Created: 2025-10-17
-- Description: emergency_contacts, employee_skills, employee_certifications, employee_vehicles, employee_goals

BEGIN;

-- ============================================================================
-- EMERGENCY_CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone_primary VARCHAR(50) NOT NULL,
    phone_secondary VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT emergency_contacts_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT emergency_contacts_phone_not_empty CHECK (LENGTH(TRIM(phone_primary)) > 0),
    CONSTRAINT emergency_contacts_relationship_not_empty CHECK (LENGTH(TRIM(relationship)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON hr_public.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_primary ON hr_public.emergency_contacts(user_id, is_primary) WHERE is_primary = TRUE;

COMMENT ON TABLE hr_public.emergency_contacts IS 'Emergency contact information for employees';
COMMENT ON COLUMN hr_public.emergency_contacts.is_primary IS 'Primary emergency contact to be notified first';

-- ============================================================================
-- EMPLOYEE_SKILLS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    proficiency_level VARCHAR(50) NOT NULL DEFAULT 'intermediate',
    years_of_experience INTEGER,
    is_primary_skill BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_date DATE,
    endorsed_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT employee_skills_user_skill_unique UNIQUE (user_id, skill_name),
    CONSTRAINT employee_skills_skill_not_empty CHECK (LENGTH(TRIM(skill_name)) > 0),
    CONSTRAINT employee_skills_proficiency_valid CHECK (proficiency_level IN (
        'beginner', 'intermediate', 'advanced', 'expert'
    )),
    CONSTRAINT employee_skills_years_non_negative CHECK (
        years_of_experience IS NULL OR years_of_experience >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_employee_skills_user ON hr_public.employee_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON hr_public.employee_skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_employee_skills_proficiency ON hr_public.employee_skills(proficiency_level);
CREATE INDEX IF NOT EXISTS idx_employee_skills_primary ON hr_public.employee_skills(user_id, is_primary_skill) WHERE is_primary_skill = TRUE;

COMMENT ON TABLE hr_public.employee_skills IS 'Employee skills and competencies with proficiency tracking';
COMMENT ON COLUMN hr_public.employee_skills.proficiency_level IS 'Skill level: beginner, intermediate, advanced, expert';

-- ============================================================================
-- EMPLOYEE_CERTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.employee_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    certification_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    credential_id VARCHAR(255),
    credential_url VARCHAR(500),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT employee_certifications_name_not_empty CHECK (LENGTH(TRIM(certification_name)) > 0),
    CONSTRAINT employee_certifications_org_not_empty CHECK (LENGTH(TRIM(issuing_organization)) > 0),
    CONSTRAINT employee_certifications_dates_valid CHECK (
        expiry_date IS NULL OR expiry_date >= issue_date
    )
);

CREATE INDEX IF NOT EXISTS idx_employee_certifications_user ON hr_public.employee_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_name ON hr_public.employee_certifications(certification_name);
CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiry ON hr_public.employee_certifications(expiry_date)
WHERE expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_employee_certifications_verified ON hr_public.employee_certifications(is_verified);

COMMENT ON TABLE hr_public.employee_certifications IS 'Professional certifications and credentials with expiry tracking';
COMMENT ON COLUMN hr_public.employee_certifications.is_verified IS 'Whether certification has been verified by HR';

-- ============================================================================
-- EMPLOYEE_VEHICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.employee_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    license_plate VARCHAR(50) NOT NULL,
    vin VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT employee_vehicles_user_plate_unique UNIQUE (user_id, license_plate),
    CONSTRAINT employee_vehicles_make_not_empty CHECK (LENGTH(TRIM(make)) > 0),
    CONSTRAINT employee_vehicles_model_not_empty CHECK (LENGTH(TRIM(model)) > 0),
    CONSTRAINT employee_vehicles_year_valid CHECK (year >= 1900 AND year <= 2100),
    CONSTRAINT employee_vehicles_plate_not_empty CHECK (LENGTH(TRIM(license_plate)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_employee_vehicles_user ON hr_public.employee_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_vehicles_plate ON hr_public.employee_vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_employee_vehicles_primary ON hr_public.employee_vehicles(user_id, is_primary) WHERE is_primary = TRUE;

COMMENT ON TABLE hr_public.employee_vehicles IS 'Employee vehicle registration for parking and security';
COMMENT ON COLUMN hr_public.employee_vehicles.is_primary IS 'Primary vehicle regularly used for work';

-- ============================================================================
-- EMPLOYEE_GOALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.employee_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    target_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    progress_percentage INTEGER DEFAULT 0,
    created_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT employee_goals_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT employee_goals_progress_range CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT employee_goals_status_valid CHECK (status IN (
        'not_started', 'in_progress', 'at_risk', 'completed', 'cancelled'
    ))
);

CREATE INDEX IF NOT EXISTS idx_employee_goals_user ON hr_public.employee_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_status ON hr_public.employee_goals(status);
CREATE INDEX IF NOT EXISTS idx_employee_goals_category ON hr_public.employee_goals(category);
CREATE INDEX IF NOT EXISTS idx_employee_goals_target_date ON hr_public.employee_goals(target_date)
WHERE status != 'completed' AND status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_employee_goals_created_by ON hr_public.employee_goals(created_by);

COMMENT ON TABLE hr_public.employee_goals IS 'Personal and professional goals for employees with progress tracking';
COMMENT ON COLUMN hr_public.employee_goals.status IS 'Goal status: not_started, in_progress, at_risk, completed, cancelled';
COMMENT ON COLUMN hr_public.employee_goals.category IS 'Goal category (e.g., professional_development, performance, career_advancement)';

COMMIT;
