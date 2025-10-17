-- Create current_user function for PostGraphile
-- This function extracts the authenticated user from JWT claims

CREATE OR REPLACE FUNCTION hr_public.current_user()
RETURNS hr_public.users
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM hr_public.users
  WHERE id = current_setting('jwt.claims.user_id', true)::uuid;
$$;

COMMENT ON FUNCTION hr_public.current_user() IS 'Returns the currently authenticated user from JWT claims';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION hr_public.current_user() TO PUBLIC;
