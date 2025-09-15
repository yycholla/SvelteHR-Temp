-- Drop views
DROP VIEW IF EXISTS departments_with_stats;

-- Drop triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
DROP TRIGGER IF EXISTS update_job_information_updated_at ON job_information;
DROP TRIGGER IF EXISTS update_contact_information_updated_at ON contact_information;
DROP TRIGGER IF EXISTS update_personal_information_updated_at ON personal_information;
DROP TRIGGER IF EXISTS update_compensation_updated_at ON compensation;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS compensation CASCADE;
DROP TABLE IF EXISTS personal_information CASCADE;
DROP TABLE IF EXISTS contact_information CASCADE;
DROP TABLE IF EXISTS job_information CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS employment_type;
DROP TYPE IF EXISTS onboarding_status;

-- Drop extensions (optional, might be used by other schemas)
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- DROP EXTENSION IF EXISTS "uuid-ossp";