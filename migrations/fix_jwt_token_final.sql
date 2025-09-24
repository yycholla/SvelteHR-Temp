-- Fix JWT token type and authentication functions
-- This makes the JWT work correctly with PostGraphile

-- Drop the old authenticate functions
DROP FUNCTION IF EXISTS hr_private.authenticate(text,text,inet,text) CASCADE;
DROP FUNCTION IF EXISTS hr_public.authenticate(text,text) CASCADE;

-- Recreate authenticate with proper return type
CREATE OR REPLACE FUNCTION hr_public.authenticate(
  email TEXT,
  password TEXT
)
RETURNS hr_public.jwt_token
LANGUAGE plpgsql
STRICT
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  user_record hr_public.users%ROWTYPE;
  role_record hr_public.user_roles%ROWTYPE;
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- Check if user exists and is active
  SELECT * INTO user_record
  FROM hr_public.users
  WHERE users.email = authenticate.email AND is_active = true;

  IF NOT FOUND THEN
    -- Log failed attempt
    INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
    VALUES (authenticate.email, NULL, false, NULL, 'USER_NOT_FOUND');

    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Check if account is locked
  IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
    INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
    VALUES (authenticate.email, NULL, false, NULL, 'ACCOUNT_LOCKED');

    RAISE EXCEPTION 'Account temporarily locked';
  END IF;

  -- Verify password
  IF NOT hr_private.verify_password(password, user_record.password_hash) THEN
    -- Increment failed attempts
    UPDATE hr_public.users
    SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
            WHEN failed_login_attempts + 1 >= max_attempts THEN NOW() + lockout_duration
            ELSE NULL
        END
    WHERE id = user_record.id;

    -- Log failed attempt
    INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
    VALUES (authenticate.email, NULL, false, NULL, 'INVALID_PASSWORD');

    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Get user's highest active role
  SELECT ur.* INTO role_record
  FROM hr_public.user_roles ur
  JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
  WHERE ura.user_id = user_record.id
    AND ura.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
  ORDER BY ur.level DESC
  LIMIT 1;

  -- Reset failed attempts and update last login
  UPDATE hr_public.users
  SET failed_login_attempts = 0,
      locked_until = NULL,
      last_login = NOW()
  WHERE id = user_record.id;

  -- Log successful login
  INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent)
  VALUES (authenticate.email, NULL, true, NULL);

  -- Return JWT token
  RETURN ROW(
    CASE
      WHEN role_record.level >= 100 THEN 'hr_super_admin'
      WHEN role_record.level >= 80 THEN 'hr_admin'
      WHEN role_record.level >= 60 THEN 'hr_manager'
      WHEN role_record.level >= 20 THEN 'hr_employee'
      ELSE 'hr_guest'
    END,
    user_record.id,
    EXTRACT(epoch FROM (NOW() + INTERVAL '15 minutes'))::INTEGER,
    EXTRACT(epoch FROM NOW())::INTEGER,
    COALESCE(role_record.level, 20),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(role_record.permissions, '[]'::jsonb)))
  )::hr_public.jwt_token;
END;
$$;

-- Grant execute permission to guest role
GRANT EXECUTE ON FUNCTION hr_public.authenticate(TEXT, TEXT) TO hr_guest;

-- Add comment for GraphQL documentation
COMMENT ON FUNCTION hr_public.authenticate(TEXT, TEXT) IS 'Authenticates a user and returns a JWT token for use with GraphQL requests.';