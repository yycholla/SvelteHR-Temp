-- Migration: Profile Change Requests Management
-- Description: Add requests management system for profile changes and HR workflow
-- Date: 2024-12-22

-- Create profile change requests table
CREATE TABLE hr_public.profile_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,

  -- Requested changes
  requested_first_name VARCHAR(100),
  requested_last_name VARCHAR(100),
  requested_email VARCHAR(255),
  requested_phone VARCHAR(20),

  -- Request metadata
  request_reason TEXT,
  request_status VARCHAR(20) DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'rejected')),

  -- Approval workflow
  requested_by UUID NOT NULL REFERENCES hr_public.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES hr_public.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profile_change_requests_user_id ON hr_public.profile_change_requests(user_id);
CREATE INDEX idx_profile_change_requests_status ON hr_public.profile_change_requests(request_status, requested_at DESC);
CREATE INDEX idx_profile_change_requests_reviewer ON hr_public.profile_change_requests(reviewed_by, reviewed_at DESC);

-- Create updated_at trigger
CREATE TRIGGER trigger_profile_change_requests_updated_at
    BEFORE UPDATE ON hr_public.profile_change_requests
    FOR EACH ROW
    EXECUTE FUNCTION hr_private.update_updated_at_column();

-- Create function to submit profile change request
CREATE OR REPLACE FUNCTION hr_public.submit_profile_change_request(
  target_user_id UUID,
  new_first_name VARCHAR(100) DEFAULT NULL,
  new_last_name VARCHAR(100) DEFAULT NULL,
  new_email VARCHAR(255) DEFAULT NULL,
  new_phone VARCHAR(20) DEFAULT NULL,
  reason TEXT DEFAULT NULL
)
RETURNS hr_public.profile_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  request_record hr_public.profile_change_requests;
  current_user_id UUID;
BEGIN
  -- Get current user from JWT
  current_user_id := current_setting('jwt.claims.user_id', true)::UUID;

  -- Check if user can request changes (only own profile)
  IF current_user_id != target_user_id THEN
    RAISE EXCEPTION 'You can only request changes to your own profile';
  END IF;

  -- Check if there's already a pending request
  IF EXISTS (
    SELECT 1 FROM hr_public.profile_change_requests
    WHERE user_id = target_user_id
    AND request_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending profile change request';
  END IF;

  -- Create the request
  INSERT INTO hr_public.profile_change_requests (
    user_id,
    requested_first_name,
    requested_last_name,
    requested_email,
    requested_phone,
    request_reason,
    requested_by
  )
  VALUES (
    target_user_id,
    new_first_name,
    new_last_name,
    new_email,
    new_phone,
    reason,
    current_user_id
  )
  RETURNING * INTO request_record;

  -- Also update user_preferences table to maintain compatibility
  UPDATE hr_public.user_preferences
  SET
    pending_first_name = new_first_name,
    pending_last_name = new_last_name,
    pending_email = new_email,
    pending_phone = new_phone,
    pending_changes_requested_at = NOW(),
    pending_changes_approved_by = NULL,
    pending_changes_approved_at = NULL,
    pending_changes_rejected_at = NULL,
    pending_changes_rejection_reason = NULL
  WHERE user_id = target_user_id;

  RETURN request_record;
END;
$$;

-- Create function to approve/reject profile change request
CREATE OR REPLACE FUNCTION hr_public.review_profile_change_request(
  request_id UUID,
  approve BOOLEAN DEFAULT true,
  review_notes TEXT DEFAULT NULL
)
RETURNS hr_public.profile_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  request_record hr_public.profile_change_requests;
  current_user_id UUID;
  user_role_level INTEGER;
BEGIN
  -- Get current user from JWT
  current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
  user_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;

  -- Check if user has permission to review changes (HR level 80+ or Admin 100)
  IF user_role_level < 80 THEN
    RAISE EXCEPTION 'Insufficient permissions to review profile changes';
  END IF;

  -- Get the request
  SELECT * INTO request_record
  FROM hr_public.profile_change_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile change request not found';
  END IF;

  IF request_record.request_status != 'pending' THEN
    RAISE EXCEPTION 'Request has already been reviewed';
  END IF;

  -- Update request status
  UPDATE hr_public.profile_change_requests
  SET
    request_status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = current_user_id,
    reviewed_at = NOW(),
    review_notes = review_notes
  WHERE id = request_id
  RETURNING * INTO request_record;

  IF approve THEN
    -- Apply the changes to the actual user record
    UPDATE hr_public.users
    SET
      display_name = CASE
        WHEN request_record.requested_first_name IS NOT NULL AND request_record.requested_last_name IS NOT NULL
        THEN request_record.requested_first_name || ' ' || request_record.requested_last_name
        WHEN request_record.requested_first_name IS NOT NULL
        THEN request_record.requested_first_name || ' ' || COALESCE(SPLIT_PART(display_name, ' ', 2), '')
        WHEN request_record.requested_last_name IS NOT NULL
        THEN COALESCE(SPLIT_PART(display_name, ' ', 1), '') || ' ' || request_record.requested_last_name
        ELSE display_name
      END,
      email = COALESCE(request_record.requested_email, email)
    WHERE id = request_record.user_id;

    -- Update user_preferences to reflect approval
    UPDATE hr_public.user_preferences
    SET
      phone = COALESCE(request_record.requested_phone, phone),
      pending_first_name = NULL,
      pending_last_name = NULL,
      pending_email = NULL,
      pending_phone = NULL,
      pending_changes_requested_at = NULL,
      pending_changes_approved_by = current_user_id,
      pending_changes_approved_at = NOW()
    WHERE user_id = request_record.user_id;
  ELSE
    -- Update user_preferences to reflect rejection
    UPDATE hr_public.user_preferences
    SET
      pending_first_name = NULL,
      pending_last_name = NULL,
      pending_email = NULL,
      pending_phone = NULL,
      pending_changes_requested_at = NULL,
      pending_changes_rejected_at = NOW(),
      pending_changes_rejection_reason = review_notes
    WHERE user_id = request_record.user_id;
  END IF;

  RETURN request_record;
END;
$$;

-- Query to get all pending requests for HR/Admin
CREATE OR REPLACE VIEW hr_public.pending_profile_change_requests AS
SELECT
  pcr.*,
  u.email as user_email,
  u.display_name as user_display_name,
  reviewer.display_name as reviewer_name
FROM hr_public.profile_change_requests pcr
JOIN hr_public.users u ON pcr.user_id = u.id
LEFT JOIN hr_public.users reviewer ON pcr.reviewed_by = reviewer.id
WHERE pcr.request_status = 'pending'
ORDER BY pcr.requested_at ASC;

-- Grant permissions
GRANT SELECT, INSERT ON hr_public.profile_change_requests TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT UPDATE ON hr_public.profile_change_requests TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.pending_profile_change_requests TO hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.submit_profile_change_request(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.review_profile_change_request(UUID, BOOLEAN, TEXT) TO hr_manager, hr_admin, hr_super_admin;

-- Enable RLS
ALTER TABLE hr_public.profile_change_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY profile_change_requests_select ON hr_public.profile_change_requests
  FOR SELECT
  USING (
    user_id = current_setting('jwt.claims.user_id', true)::UUID
    OR current_setting('jwt.claims.role_level', true)::INTEGER >= 60
  );

CREATE POLICY profile_change_requests_insert ON hr_public.profile_change_requests
  FOR INSERT
  WITH CHECK (
    user_id = current_setting('jwt.claims.user_id', true)::UUID
  );

CREATE POLICY profile_change_requests_update ON hr_public.profile_change_requests
  FOR UPDATE
  USING (
    current_setting('jwt.claims.role_level', true)::INTEGER >= 80
  );

-- Add comments for documentation
COMMENT ON TABLE hr_public.profile_change_requests IS 'Profile change requests requiring HR approval';
COMMENT ON FUNCTION hr_public.submit_profile_change_request(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) IS 'Submit a profile change request for HR approval';
COMMENT ON FUNCTION hr_public.review_profile_change_request(UUID, BOOLEAN, TEXT) IS 'Approve or reject profile change requests (HR/Admin only)';
COMMENT ON VIEW hr_public.pending_profile_change_requests IS 'View of all pending profile change requests for HR review';