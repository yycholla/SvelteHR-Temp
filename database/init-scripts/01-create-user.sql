-- Create PostGraphile application user
-- This script runs automatically when the PostgreSQL container starts

-- Create the application user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgraphile_app') THEN
        CREATE USER postgraphile_app WITH PASSWORD 'secure_password_postgraphile_2025';
    END IF;
END
$$;

-- Grant database connection privileges
GRANT CONNECT ON DATABASE svelteHR_postgraphile TO postgraphile_app;

-- Create schemas will be handled by the migration files
-- Role hierarchy will be handled by the grants scripts