-- PostGraphile HR System - Initial Database Setup
-- This script creates the database, schemas, and basic user for PostGraphile

-- Create database (run as postgres superuser)
-- CREATE DATABASE svelteHR_postgraphile;

-- Connect to the new database
-- \c svelteHR_postgraphile;

-- Create schemas for PostGraphile
CREATE SCHEMA IF NOT EXISTS hr_public;
CREATE SCHEMA IF NOT EXISTS hr_private;  
CREATE SCHEMA IF NOT EXISTS hr_hidden;

-- Create application user for PostGraphile
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgraphile_app') THEN
        CREATE USER postgraphile_app WITH PASSWORD 'secure_password_postgraphile_2025';
    END IF;
END
$$;

-- Grant schema permissions to application user
GRANT USAGE ON SCHEMA hr_public TO postgraphile_app;
GRANT USAGE ON SCHEMA hr_private TO postgraphile_app;
GRANT USAGE ON SCHEMA hr_hidden TO postgraphile_app;

-- Grant table permissions (will be inherited by future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON TABLES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON SEQUENCES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON FUNCTIONS TO postgraphile_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr_private GRANT ALL ON TABLES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_private GRANT ALL ON SEQUENCES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_private GRANT ALL ON FUNCTIONS TO postgraphile_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr_hidden GRANT ALL ON TABLES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_hidden GRANT ALL ON SEQUENCES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_hidden GRANT ALL ON FUNCTIONS TO postgraphile_app;

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE hr_public.employee_status AS ENUM (
    'ACTIVE',
    'INACTIVE', 
    'TERMINATED',
    'ON_LEAVE'
);

CREATE TYPE hr_public.time_off_type AS ENUM (
    'VACATION',
    'SICK_LEAVE',
    'PERSONAL',
    'BEREAVEMENT',
    'MATERNITY',
    'PATERNITY'
);

CREATE TYPE hr_public.request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE hr_public.review_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'OVERDUE'
);

-- Set search path for PostGraphile
ALTER DATABASE svelteHR_postgraphile SET search_path = hr_public, hr_private, hr_hidden, public;