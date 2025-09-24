-- Fix authentication function to work with PostGraphile mutations
-- This creates the proper function signature that PostGraphile expects

-- First, create a simple authenticate function that returns just the JWT token
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
  auth_result RECORD;
BEGIN
  -- Call the private authenticate function
  SELECT * INTO auth_result
  FROM hr_private.authenticate(
    email,
    password,
    NULL,  -- client_ip
    NULL   -- user_agent
  );

  IF NOT auth_result.success THEN
    RAISE EXCEPTION 'Authentication failed: %', COALESCE(auth_result.error_message, 'Invalid credentials');
  END IF;

  -- Return the JWT token directly
  RETURN auth_result.jwt_claims;
END;
$$;

-- Grant execute permission to anonymous/guest role
GRANT EXECUTE ON FUNCTION hr_public.authenticate(TEXT, TEXT) TO hr_guest;

-- Add comment for GraphQL documentation
COMMENT ON FUNCTION hr_public.authenticate(TEXT, TEXT) IS 'Authenticates a user and returns a JWT token for use with GraphQL requests.';