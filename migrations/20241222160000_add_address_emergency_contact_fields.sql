-- Migration: Add Address and Emergency Contact Fields to Profile Change Requests
-- Description: Add address and emergency contact fields to profile change requests system
-- Date: 2024-12-22

-- Add new fields to profile_change_requests table
ALTER TABLE hr_public.profile_change_requests
ADD COLUMN requested_address VARCHAR(255),
ADD COLUMN requested_city VARCHAR(100),
ADD COLUMN requested_state VARCHAR(100),
ADD COLUMN requested_zip_code VARCHAR(20),
ADD COLUMN requested_country VARCHAR(100),
ADD COLUMN requested_emergency_contact_first_name VARCHAR(100),
ADD COLUMN requested_emergency_contact_last_name VARCHAR(100),
ADD COLUMN requested_emergency_contact_phone VARCHAR(20),
ADD COLUMN requested_emergency_contact_email VARCHAR(255),
ADD COLUMN requested_emergency_contact_relation VARCHAR(100);

-- Add new fields to user_preferences table for current values
ALTER TABLE hr_public.user_preferences
ADD COLUMN address VARCHAR(255),
ADD COLUMN city VARCHAR(100),
ADD COLUMN state VARCHAR(100),
ADD COLUMN zip_code VARCHAR(20),
ADD COLUMN country VARCHAR(100),
ADD COLUMN emergency_contact_first_name VARCHAR(100),
ADD COLUMN emergency_contact_last_name VARCHAR(100),
ADD COLUMN emergency_contact_phone VARCHAR(20),
ADD COLUMN emergency_contact_email VARCHAR(255),
ADD COLUMN emergency_contact_relation VARCHAR(100),
ADD COLUMN pending_address VARCHAR(255),
ADD COLUMN pending_city VARCHAR(100),
ADD COLUMN pending_state VARCHAR(100),
ADD COLUMN pending_zip_code VARCHAR(20),
ADD COLUMN pending_country VARCHAR(100),
ADD COLUMN pending_emergency_contact_first_name VARCHAR(100),
ADD COLUMN pending_emergency_contact_last_name VARCHAR(100),
ADD COLUMN pending_emergency_contact_phone VARCHAR(20),
ADD COLUMN pending_emergency_contact_email VARCHAR(255),
ADD COLUMN pending_emergency_contact_relation VARCHAR(100);

-- Update the submit_profile_change_request function to handle new fields
DROP FUNCTION IF EXISTS hr_public.submit_profile_change_request(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION hr_public.submit_profile_change_request(
  target_user_id UUID,
  new_first_name VARCHAR(100) DEFAULT NULL,
  new_last_name VARCHAR(100) DEFAULT NULL,
  new_email VARCHAR(255) DEFAULT NULL,
  new_phone VARCHAR(20) DEFAULT NULL,
  new_address VARCHAR(255) DEFAULT NULL,
  new_city VARCHAR(100) DEFAULT NULL,
  new_state VARCHAR(100) DEFAULT NULL,
  new_zip_code VARCHAR(20) DEFAULT NULL,
  new_country VARCHAR(100) DEFAULT NULL,
  new_emergency_contact_first_name VARCHAR(100) DEFAULT NULL,
  new_emergency_contact_last_name VARCHAR(100) DEFAULT NULL,
  new_emergency_contact_phone VARCHAR(20) DEFAULT NULL,
  new_emergency_contact_email VARCHAR(255) DEFAULT NULL,
  new_emergency_contact_relation VARCHAR(100) DEFAULT NULL,
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
    requested_address,
    requested_city,
    requested_state,
    requested_zip_code,
    requested_country,
    requested_emergency_contact_first_name,
    requested_emergency_contact_last_name,
    requested_emergency_contact_phone,
    requested_emergency_contact_email,
    requested_emergency_contact_relation,
    request_reason,
    requested_by
  )
  VALUES (
    target_user_id,
    new_first_name,
    new_last_name,
    new_email,
    new_phone,
    new_address,
    new_city,
    new_state,
    new_zip_code,
    new_country,
    new_emergency_contact_first_name,
    new_emergency_contact_last_name,
    new_emergency_contact_phone,
    new_emergency_contact_email,
    new_emergency_contact_relation,
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
    pending_address = new_address,
    pending_city = new_city,
    pending_state = new_state,
    pending_zip_code = new_zip_code,
    pending_country = new_country,
    pending_emergency_contact_first_name = new_emergency_contact_first_name,
    pending_emergency_contact_last_name = new_emergency_contact_last_name,
    pending_emergency_contact_phone = new_emergency_contact_phone,
    pending_emergency_contact_email = new_emergency_contact_email,
    pending_emergency_contact_relation = new_emergency_contact_relation,
    pending_changes_requested_at = NOW(),
    pending_changes_approved_by = NULL,
    pending_changes_approved_at = NULL,
    pending_changes_rejected_at = NULL,
    pending_changes_rejection_reason = NULL
  WHERE user_id = target_user_id;

  RETURN request_record;
END;
$$;

-- Update the review function to handle approval of new fields
DROP FUNCTION IF EXISTS hr_public.review_profile_change_request(UUID, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION hr_public.review_profile_change_request(
  request_id UUID,
  approve BOOLEAN DEFAULT true,
  review_notes_param TEXT DEFAULT NULL
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
    review_notes = review_notes_param
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
      address = COALESCE(request_record.requested_address, address),
      city = COALESCE(request_record.requested_city, city),
      state = COALESCE(request_record.requested_state, state),
      zip_code = COALESCE(request_record.requested_zip_code, zip_code),
      country = COALESCE(request_record.requested_country, country),
      emergency_contact_first_name = COALESCE(request_record.requested_emergency_contact_first_name, emergency_contact_first_name),
      emergency_contact_last_name = COALESCE(request_record.requested_emergency_contact_last_name, emergency_contact_last_name),
      emergency_contact_phone = COALESCE(request_record.requested_emergency_contact_phone, emergency_contact_phone),
      emergency_contact_email = COALESCE(request_record.requested_emergency_contact_email, emergency_contact_email),
      emergency_contact_relation = COALESCE(request_record.requested_emergency_contact_relation, emergency_contact_relation),
      pending_first_name = NULL,
      pending_last_name = NULL,
      pending_email = NULL,
      pending_phone = NULL,
      pending_address = NULL,
      pending_city = NULL,
      pending_state = NULL,
      pending_zip_code = NULL,
      pending_country = NULL,
      pending_emergency_contact_first_name = NULL,
      pending_emergency_contact_last_name = NULL,
      pending_emergency_contact_phone = NULL,
      pending_emergency_contact_email = NULL,
      pending_emergency_contact_relation = NULL,
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
      pending_address = NULL,
      pending_city = NULL,
      pending_state = NULL,
      pending_zip_code = NULL,
      pending_country = NULL,
      pending_emergency_contact_first_name = NULL,
      pending_emergency_contact_last_name = NULL,
      pending_emergency_contact_phone = NULL,
      pending_emergency_contact_email = NULL,
      pending_emergency_contact_relation = NULL,
      pending_changes_requested_at = NULL,
      pending_changes_rejected_at = NOW(),
      pending_changes_rejection_reason = review_notes_param
    WHERE user_id = request_record.user_id;
  END IF;

  RETURN request_record;
END;
$$;

-- Grant permissions for the updated functions
GRANT EXECUTE ON FUNCTION hr_public.submit_profile_change_request(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.review_profile_change_request(UUID, BOOLEAN, TEXT) TO hr_manager, hr_admin, hr_super_admin;

-- Update comments
COMMENT ON FUNCTION hr_public.submit_profile_change_request(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT) IS 'Submit a profile change request including address and emergency contact information for HR approval';