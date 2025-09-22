-- Migration: User Preferences System
-- Description: Add user preferences table to store customizable settings
-- Date: 2024-12-22

-- Create user preferences table
CREATE TABLE hr_public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,

  -- Appearance preferences
  theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),

  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  leave_reminders BOOLEAN DEFAULT true,
  performance_updates BOOLEAN DEFAULT true,

  -- Profile change requests (pending approval)
  pending_first_name VARCHAR(100),
  pending_last_name VARCHAR(100),
  pending_email VARCHAR(255),
  pending_phone VARCHAR(20),
  pending_changes_requested_at TIMESTAMPTZ,
  pending_changes_approved_by UUID REFERENCES hr_public.users(id),
  pending_changes_approved_at TIMESTAMPTZ,
  pending_changes_rejected_at TIMESTAMPTZ,
  pending_changes_rejection_reason TEXT,

  -- Contact information that users can update directly
  phone VARCHAR(20),

  -- Additional preferences (extensible)
  custom_preferences JSONB DEFAULT '{}',

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_preferences_user_id ON hr_public.user_preferences(user_id);
CREATE INDEX idx_user_preferences_pending_changes ON hr_public.user_preferences(pending_changes_requested_at) WHERE pending_changes_requested_at IS NOT NULL;
CREATE UNIQUE INDEX idx_user_preferences_user_unique ON hr_public.user_preferences(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION hr_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON hr_public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION hr_private.update_updated_at_column();

-- Create function to get or create user preferences
CREATE OR REPLACE FUNCTION hr_public.get_user_preferences(target_user_id UUID)
RETURNS hr_public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  prefs hr_public.user_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO prefs
  FROM hr_public.user_preferences
  WHERE user_id = target_user_id;

  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO hr_public.user_preferences (user_id)
    VALUES (target_user_id)
    RETURNING * INTO prefs;
  END IF;

  RETURN prefs;
END;
$$;

-- Create function to update user preferences
CREATE OR REPLACE FUNCTION hr_public.update_user_preferences(
  target_user_id UUID,
  new_theme VARCHAR(20) DEFAULT NULL,
  new_email_notifications BOOLEAN DEFAULT NULL,
  new_push_notifications BOOLEAN DEFAULT NULL,
  new_leave_reminders BOOLEAN DEFAULT NULL,
  new_performance_updates BOOLEAN DEFAULT NULL,
  new_phone VARCHAR(20) DEFAULT NULL,
  new_custom_preferences JSONB DEFAULT NULL
)
RETURNS hr_public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  prefs hr_public.user_preferences;
  current_user_id UUID;
BEGIN
  -- Get current user from JWT
  current_user_id := current_setting('jwt.claims.user_id', true)::UUID;

  -- Check if user can update these preferences (only own preferences)
  IF current_user_id != target_user_id THEN
    RAISE EXCEPTION 'You can only update your own preferences';
  END IF;

  -- Get or create preferences
  SELECT * INTO prefs FROM hr_public.get_user_preferences(target_user_id);

  -- Update only the provided fields
  UPDATE hr_public.user_preferences
  SET
    theme = COALESCE(new_theme, theme),
    email_notifications = COALESCE(new_email_notifications, email_notifications),
    push_notifications = COALESCE(new_push_notifications, push_notifications),
    leave_reminders = COALESCE(new_leave_reminders, leave_reminders),
    performance_updates = COALESCE(new_performance_updates, performance_updates),
    phone = COALESCE(new_phone, phone),
    custom_preferences = COALESCE(new_custom_preferences, custom_preferences)
  WHERE user_id = target_user_id
  RETURNING * INTO prefs;

  RETURN prefs;
END;
$$;

-- Create function to request profile changes (requires approval)
CREATE OR REPLACE FUNCTION hr_public.request_profile_changes(
  target_user_id UUID,
  new_first_name VARCHAR(100) DEFAULT NULL,
  new_last_name VARCHAR(100) DEFAULT NULL,
  new_email VARCHAR(255) DEFAULT NULL,
  new_phone VARCHAR(20) DEFAULT NULL
)
RETURNS hr_public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  prefs hr_public.user_preferences;
  current_user_id UUID;
BEGIN
  -- Get current user from JWT
  current_user_id := current_setting('jwt.claims.user_id', true)::UUID;

  -- Check if user can request changes (only own profile)
  IF current_user_id != target_user_id THEN
    RAISE EXCEPTION 'You can only request changes to your own profile';
  END IF;

  -- Get or create preferences
  SELECT * INTO prefs FROM hr_public.get_user_preferences(target_user_id);

  -- Clear any previous rejections and set new pending changes
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
  WHERE user_id = target_user_id
  RETURNING * INTO prefs;

  -- Create a simple notification for HR/Admin about pending changes
  INSERT INTO hr_public.user_preferences (user_id, phone, custom_preferences)
  VALUES (
    target_user_id,
    NULL,
    jsonb_build_object(
      'notification_type', 'profile_change_request',
      'notification_title', 'Profile Change Request',
      'notification_message', 'A user has requested changes to their profile information.',
      'requested_by', current_user_id,
      'requested_at', NOW(),
      'changes_summary', jsonb_build_object(
        'first_name', new_first_name,
        'last_name', new_last_name,
        'email', new_email,
        'phone', new_phone
      )
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN prefs;
END;
$$;

-- Create function for HR/Admin to approve profile changes
CREATE OR REPLACE FUNCTION hr_public.approve_profile_changes(
  target_user_id UUID,
  approve BOOLEAN DEFAULT true,
  rejection_reason TEXT DEFAULT NULL
)
RETURNS hr_public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  prefs hr_public.user_preferences;
  current_user_id UUID;
  user_role_level INTEGER;
BEGIN
  -- Get current user from JWT
  current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
  user_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;

  -- Check if user has permission to approve changes (HR level 80+ or Admin 100)
  IF user_role_level < 80 THEN
    RAISE EXCEPTION 'Insufficient permissions to approve profile changes';
  END IF;

  -- Get preferences
  SELECT * INTO prefs
  FROM hr_public.user_preferences
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No preferences found for user';
  END IF;

  IF prefs.pending_changes_requested_at IS NULL THEN
    RAISE EXCEPTION 'No pending changes to approve';
  END IF;

  IF approve THEN
    -- Apply the changes to the actual user record
    UPDATE hr_public.users
    SET
      display_name = CASE
        WHEN prefs.pending_first_name IS NOT NULL AND prefs.pending_last_name IS NOT NULL
        THEN prefs.pending_first_name || ' ' || prefs.pending_last_name
        WHEN prefs.pending_first_name IS NOT NULL
        THEN prefs.pending_first_name || ' ' || COALESCE(SPLIT_PART(display_name, ' ', 2), '')
        WHEN prefs.pending_last_name IS NOT NULL
        THEN COALESCE(SPLIT_PART(display_name, ' ', 1), '') || ' ' || prefs.pending_last_name
        ELSE display_name
      END,
      email = COALESCE(prefs.pending_email, email)
    WHERE id = target_user_id;

    -- Update phone in preferences if provided
    UPDATE hr_public.user_preferences
    SET
      phone = COALESCE(prefs.pending_phone, phone),
      pending_first_name = NULL,
      pending_last_name = NULL,
      pending_email = NULL,
      pending_phone = NULL,
      pending_changes_requested_at = NULL,
      pending_changes_approved_by = current_user_id,
      pending_changes_approved_at = NOW()
    WHERE user_id = target_user_id
    RETURNING * INTO prefs;
  ELSE
    -- Reject the changes
    UPDATE hr_public.user_preferences
    SET
      pending_first_name = NULL,
      pending_last_name = NULL,
      pending_email = NULL,
      pending_phone = NULL,
      pending_changes_requested_at = NULL,
      pending_changes_rejected_at = NOW(),
      pending_changes_rejection_reason = rejection_reason
    WHERE user_id = target_user_id
    RETURNING * INTO prefs;
  END IF;

  RETURN prefs;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.user_preferences TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_user_preferences(UUID) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.update_user_preferences(UUID, VARCHAR, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, VARCHAR, JSONB) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.request_profile_changes(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.approve_profile_changes(UUID, BOOLEAN, TEXT) TO hr_manager, hr_admin, hr_super_admin;

-- Add comments for documentation
COMMENT ON TABLE hr_public.user_preferences IS 'User customizable preferences and profile change requests';
COMMENT ON FUNCTION hr_public.get_user_preferences(UUID) IS 'Get user preferences, creating defaults if none exist';
COMMENT ON FUNCTION hr_public.update_user_preferences(UUID, VARCHAR, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, VARCHAR, JSONB) IS 'Update user preferences (users can only update their own)';
COMMENT ON FUNCTION hr_public.request_profile_changes(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) IS 'Request profile changes that require HR approval';
COMMENT ON FUNCTION hr_public.approve_profile_changes(UUID, BOOLEAN, TEXT) IS 'Approve or reject profile change requests (HR/Admin only)';

-- Enable RLS
ALTER TABLE hr_public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY user_preferences_select ON hr_public.user_preferences
  FOR SELECT
  USING (
    user_id = current_setting('jwt.claims.user_id', true)::UUID
    OR current_setting('jwt.claims.role_level', true)::INTEGER >= 80
  );

CREATE POLICY user_preferences_insert ON hr_public.user_preferences
  FOR INSERT
  WITH CHECK (
    user_id = current_setting('jwt.claims.user_id', true)::UUID
  );

CREATE POLICY user_preferences_update ON hr_public.user_preferences
  FOR UPDATE
  USING (
    user_id = current_setting('jwt.claims.user_id', true)::UUID
    OR current_setting('jwt.claims.role_level', true)::INTEGER >= 80
  );