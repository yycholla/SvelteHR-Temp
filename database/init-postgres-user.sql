-- Initialize PostgreSQL user for PostGraphile
-- This script runs during PostgreSQL initialization

-- Create the postgraphile_app user with proper password
CREATE USER postgraphile_app WITH PASSWORD 'dev_password_change_in_production';

-- Grant connect privilege to the database
GRANT CONNECT ON DATABASE hr_system TO postgraphile_app;