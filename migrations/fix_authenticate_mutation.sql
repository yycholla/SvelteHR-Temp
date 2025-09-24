-- Create public authenticate function for PostGraphile mutation
-- This wraps the private authenticate function and returns a JWT token

CREATE OR REPLACE FUNCTION hr_public.authenticate(
  input hr_public.authenticate_input
)
RETURNS hr_public.authenticate_payload
LANGUAGE plpgsql
STRICT
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  auth_result RECORD;
  jwt_token_result hr_public.jwt_token;
BEGIN
  -- Call the private authenticate function
  SELECT * INTO auth_result
  FROM hr_private.authenticate(
    input.email,
    input.password,
    NULL,  -- client_ip
    NULL   -- user_agent
  );

  IF NOT auth_result.success THEN
    RAISE EXCEPTION 'Authentication failed: %', COALESCE(auth_result.error_message, 'Invalid credentials');
  END IF;

  -- Return the JWT token
  RETURN ROW(auth_result.jwt_claims)::hr_public.authenticate_payload;
END;
$$;

-- Create input type for authentication
CREATE TYPE hr_public.authenticate_input AS (
  email TEXT,
  password TEXT
);

-- Create payload type for authentication response
CREATE TYPE hr_public.authenticate_payload AS (
  jwt_token hr_public.jwt_token
);

-- Grant execute permission to PostGraphile default role
GRANT EXECUTE ON FUNCTION hr_public.authenticate(hr_public.authenticate_input) TO hr_guest;

-- Add comment for GraphQL documentation
COMMENT ON FUNCTION hr_public.authenticate(hr_public.authenticate_input) IS 'Authenticates a user and returns a JWT token.';