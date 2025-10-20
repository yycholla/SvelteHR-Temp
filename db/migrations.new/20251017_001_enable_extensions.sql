-- Migration: Enable PostgreSQL Extensions
-- Created: 2025-10-17
-- Description: Enable required PostgreSQL extensions for UUID generation

BEGIN;

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS hr_hidden;
COMMENT ON SCHEMA hr_hidden IS 'Hidden HR schema for internal functions and utilities';

CREATE SCHEMA IF NOT EXISTS hr_private;
COMMENT ON SCHEMA hr_private IS 'Private HR schema for sensitive data (compensation, authentication)';

CREATE SCHEMA IF NOT EXISTS hr_public;
COMMENT ON SCHEMA hr_public IS 'Public HR schema exposed through GraphQL API';

COMMIT;
