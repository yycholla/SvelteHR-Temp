-- Migration: Create employee_certifications table
-- Date: 2025-10-10
-- Purpose: Track employee certifications with expiration tracking and renewal management
--          Priority: P2 (Medium - Feature Tables)

BEGIN;

-- ========================================
-- Create employee_certifications table
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  certification_name VARCHAR(255) NOT NULL,
  issuer VARCHAR(255) NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE,
  credential_id VARCHAR(255),
  verification_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, certification_name, issuer),
  CHECK (expiry_date IS NULL OR expiry_date > issued_date)
);

COMMENT ON TABLE hr_public.employee_certifications IS
'Employee certifications with expiration tracking and renewal management';

COMMENT ON COLUMN hr_public.employee_certifications.expiry_date IS
'Certification expiry date. NULL for certifications with no expiration (permanent).';

COMMENT ON COLUMN hr_public.employee_certifications.verification_url IS
'URL to verify certification authenticity (e.g., badge verification link)';

-- ========================================
-- Create indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_employee_certifications_user_id
ON hr_public.employee_certifications(user_id);

CREATE INDEX IF NOT EXISTS idx_employee_certifications_expiry
ON hr_public.employee_certifications(expiry_date)
WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_certifications_search
ON hr_public.employee_certifications USING GIN (
  to_tsvector('english', certification_name || ' ' || issuer)
);

-- ========================================
-- Computed status function
-- ========================================

CREATE OR REPLACE FUNCTION hr_public.get_certification_status(expiry DATE)
RETURNS TEXT AS $$
BEGIN
  IF expiry IS NULL THEN RETURN 'PERMANENT';
  ELSIF expiry < CURRENT_DATE THEN RETURN 'EXPIRED';
  ELSIF expiry <= CURRENT_DATE + INTERVAL '30 days' THEN RETURN 'EXPIRING_SOON';
  ELSE RETURN 'ACTIVE';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION hr_public.get_certification_status IS
'Compute certification status based on expiry date: PERMANENT, ACTIVE, EXPIRING_SOON (within 30 days), or EXPIRED';

-- ========================================
-- Create updated_at trigger
-- ========================================

DROP TRIGGER IF EXISTS update_employee_certifications_updated_at ON hr_public.employee_certifications;
CREATE TRIGGER update_employee_certifications_updated_at
BEFORE UPDATE ON hr_public.employee_certifications
FOR EACH ROW EXECUTE FUNCTION hr_public.update_updated_at_column();

-- ========================================
-- RLS policies
-- ========================================

ALTER TABLE hr_public.employee_certifications ENABLE ROW LEVEL SECURITY;

-- All users can view certifications
CREATE POLICY employee_certifications_select ON hr_public.employee_certifications
FOR SELECT USING (true);

-- Users can manage their own certifications
CREATE POLICY employee_certifications_manage ON hr_public.employee_certifications
FOR ALL USING (user_id = current_setting('jwt.claims.user_id', true)::UUID);

-- Update table statistics
ANALYZE hr_public.employee_certifications;

COMMIT;
