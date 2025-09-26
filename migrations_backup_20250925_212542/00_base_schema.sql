--
-- PostgreSQL database dump
--

\restrict hxOYWwcytKvgKZ9PreDSILRN2g0T1lAcF0EWmp09NHl6UIR4SUhMrzztoJM0pnI

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: hr_hidden; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hr_hidden;


--
-- Name: SCHEMA hr_hidden; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA hr_hidden IS 'Hidden HR schema for internal functions and utilities';


--
-- Name: hr_private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hr_private;


--
-- Name: SCHEMA hr_private; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA hr_private IS 'Private HR schema for sensitive data (compensation, authentication)';


--
-- Name: hr_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hr_public;


--
-- Name: SCHEMA hr_public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA hr_public IS 'Public HR schema exposed through PostGraphile GraphQL API';


--
-- Name: jwt_claims; Type: TYPE; Schema: hr_hidden; Owner: -
--

CREATE TYPE hr_hidden.jwt_claims AS (
	employee_id integer,
	department_id integer,
	role_level integer,
	email text,
	full_name text,
	is_admin boolean,
	permissions text[]
);


--
-- Name: TYPE jwt_claims; Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON TYPE hr_hidden.jwt_claims IS 'JWT claims extracted for internal use';


--
-- Name: role_mapping; Type: TYPE; Schema: hr_hidden; Owner: -
--

CREATE TYPE hr_hidden.role_mapping AS (
	role_level integer,
	postgresql_role text,
	role_name text,
	permissions text[]
);


--
-- Name: session_info; Type: TYPE; Schema: hr_hidden; Owner: -
--

CREATE TYPE hr_hidden.session_info AS (
	employee_id integer,
	session_token text,
	refresh_token text,
	expires_at timestamp with time zone,
	created_at timestamp with time zone
);


--
-- Name: access_level; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.access_level AS ENUM (
    'PUBLIC',
    'EMPLOYEE',
    'MANAGER',
    'HR_ADMIN',
    'CONFIDENTIAL'
);


--
-- Name: accrual_frequency; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.accrual_frequency AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'ANNUALLY',
    'PER_PAY_PERIOD'
);


--
-- Name: anonymization_level; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.anonymization_level AS ENUM (
    'NONE',
    'PARTIAL',
    'FULL',
    'STATISTICAL'
);


--
-- Name: audit_action_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.audit_action_type AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'IMPORT',
    'APPROVAL',
    'REJECTION'
);


--
-- Name: employee_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.employee_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'TERMINATED',
    'ON_LEAVE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: employees; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.employees (
    id integer NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    department_id integer NOT NULL,
    manager_id integer,
    role_level integer DEFAULT 20 NOT NULL,
    status hr_public.employee_status DEFAULT 'ACTIVE'::hr_public.employee_status,
    hire_date date NOT NULL,
    termination_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employees_email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT employees_hire_date_not_future CHECK ((hire_date <= CURRENT_DATE)),
    CONSTRAINT employees_names_not_empty CHECK (((length(TRIM(BOTH FROM first_name)) > 0) AND (length(TRIM(BOTH FROM last_name)) > 0))),
    CONSTRAINT employees_no_self_manager CHECK ((id <> manager_id)),
    CONSTRAINT employees_role_level_valid CHECK ((role_level = ANY (ARRAY[0, 20, 60, 80, 100]))),
    CONSTRAINT employees_termination_after_hire CHECK (((termination_date IS NULL) OR (termination_date >= hire_date)))
);


--
-- Name: TABLE employees; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.employees IS 'Employee master records';


--
-- Name: auth_result; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.auth_result AS (
	jwt_token text,
	refresh_token text,
	expires_at timestamp with time zone,
	employee hr_public.employees
);


--
-- Name: TYPE auth_result; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TYPE hr_public.auth_result IS 'Authentication result with tokens and employee data';


--
-- Name: compensation_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.compensation_type AS ENUM (
    'SALARY',
    'HOURLY',
    'COMMISSION',
    'BONUS',
    'EQUITY'
);


--
-- Name: competency_level; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.competency_level AS ENUM (
    'NEEDS_IMPROVEMENT',
    'MEETS_EXPECTATIONS',
    'EXCEEDS_EXPECTATIONS',
    'OUTSTANDING'
);


--
-- Name: consent_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.consent_status AS ENUM (
    'GIVEN',
    'WITHDRAWN',
    'PENDING',
    'EXPIRED',
    'NOT_REQUIRED'
);


--
-- Name: data_classification; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.data_classification AS ENUM (
    'PUBLIC',
    'INTERNAL',
    'CONFIDENTIAL',
    'RESTRICTED',
    'TOP_SECRET'
);


--
-- Name: data_lineage_action; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.data_lineage_action AS ENUM (
    'CREATED',
    'ACCESSED',
    'MODIFIED',
    'COPIED',
    'EXPORTED',
    'DELETED',
    'ARCHIVED',
    'ANONYMIZED'
);


--
-- Name: delivery_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.delivery_status AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'BOUNCED'
);


--
-- Name: device_trust_level; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.device_trust_level AS ENUM (
    'TRUSTED',
    'RECOGNIZED',
    'UNKNOWN',
    'BLOCKED'
);


--
-- Name: digest_frequency; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.digest_frequency AS ENUM (
    'NONE',
    'DAILY',
    'WEEKLY',
    'MONTHLY'
);


--
-- Name: document_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.document_status AS ENUM (
    'DRAFT',
    'UNDER_REVIEW',
    'APPROVED',
    'PUBLISHED',
    'ARCHIVED',
    'EXPIRED'
);


--
-- Name: document_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.document_type AS ENUM (
    'CONTRACT',
    'HANDBOOK',
    'POLICY',
    'FORM',
    'CERTIFICATE',
    'PERSONAL_DOCUMENT',
    'REPORT',
    'TEMPLATE'
);


--
-- Name: employment_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.employment_status AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERN',
    'CONSULTANT'
);


--
-- Name: encryption_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.encryption_status AS ENUM (
    'ENCRYPTED',
    'PLAIN_TEXT',
    'ANONYMIZED',
    'PSEUDONYMIZED'
);


--
-- Name: goal_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.goal_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'DEFERRED',
    'CANCELLED'
);


--
-- Name: jwt_token; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.jwt_token AS (
	role text,
	exp integer,
	employee_id integer,
	department_id integer,
	role_level integer,
	is_admin boolean,
	permissions text[],
	user_id integer
);


--
-- Name: TYPE jwt_token; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TYPE hr_public.jwt_token IS 'JWT token structure for PostGraphile authentication';


--
-- Name: mfa_method; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.mfa_method AS ENUM (
    'TOTP',
    'SMS',
    'EMAIL',
    'BACKUP_CODE',
    'HARDWARE_TOKEN'
);


--
-- Name: notification_category; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.notification_category AS ENUM (
    'SYSTEM',
    'HR_ACTION',
    'WORKFLOW',
    'REMINDER',
    'ANNOUNCEMENT',
    'SECURITY'
);


--
-- Name: notification_channel; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.notification_channel AS ENUM (
    'EMAIL',
    'SMS',
    'PUSH',
    'IN_APP',
    'SLACK',
    'TEAMS'
);


--
-- Name: notification_priority; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.notification_priority AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


--
-- Name: pay_frequency; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.pay_frequency AS ENUM (
    'WEEKLY',
    'BI_WEEKLY',
    'SEMI_MONTHLY',
    'MONTHLY'
);


--
-- Name: payroll_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.payroll_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'PROCESSED',
    'PAID',
    'CANCELLED'
);


--
-- Name: privacy_request_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.privacy_request_type AS ENUM (
    'ACCESS',
    'RECTIFICATION',
    'ERASURE',
    'PORTABILITY',
    'RESTRICT_PROCESSING',
    'OBJECT_PROCESSING',
    'COMPLAINT'
);


--
-- Name: request_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: retention_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.retention_status AS ENUM (
    'ACTIVE',
    'REVIEW_REQUIRED',
    'ELIGIBLE_FOR_DELETION',
    'PENDING_DELETION',
    'DELETED',
    'LEGAL_HOLD'
);


--
-- Name: review_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.review_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'OVERDUE'
);


--
-- Name: security_event_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.security_event_type AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGIN_BLOCKED',
    'PASSWORD_CHANGED',
    'MFA_ENABLED',
    'MFA_DISABLED',
    'MFA_CHALLENGE_SUCCESS',
    'MFA_CHALLENGE_FAILED',
    'SESSION_CREATED',
    'SESSION_EXPIRED',
    'SESSION_TERMINATED',
    'PERMISSION_DENIED',
    'SUSPICIOUS_ACTIVITY',
    'DATA_ACCESS',
    'DATA_EXPORT',
    'ADMIN_ACTION'
);


--
-- Name: session_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.session_status AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'TERMINATED',
    'SUSPENDED'
);


--
-- Name: time_off_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.time_off_type AS ENUM (
    'VACATION',
    'SICK_LEAVE',
    'PERSONAL',
    'BEREAVEMENT',
    'MATERNITY',
    'PATERNITY'
);


--
-- Name: workflow_action_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.workflow_action_type AS ENUM (
    'SEND_EMAIL',
    'CREATE_TASK',
    'UPDATE_RECORD',
    'GENERATE_DOCUMENT',
    'ASSIGN_REVIEWER',
    'SEND_NOTIFICATION'
);


--
-- Name: workflow_instance_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.workflow_instance_status AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


--
-- Name: workflow_status; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.workflow_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DRAFT'
);


--
-- Name: workflow_trigger_type; Type: TYPE; Schema: hr_public; Owner: -
--

CREATE TYPE hr_public.workflow_trigger_type AS ENUM (
    'EMPLOYEE_HIRED',
    'EMPLOYEE_TERMINATED',
    'TIMEOFF_REQUESTED',
    'REVIEW_DUE',
    'DOCUMENT_EXPIRING',
    'MANUAL_TRIGGER',
    'SCHEDULED_TRIGGER'
);


--
-- Name: cleanup_old_auth_logs(integer); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.cleanup_old_auth_logs(retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM hr_private.auth_log
    WHERE created_at < (CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_old_auth_logs(retention_days integer); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.cleanup_old_auth_logs(retention_days integer) IS 'Cleanup auth logs older than specified days (default 90 days)';


--
-- Name: create_jwt_token(hr_public.employees, integer); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.create_jwt_token(p_employee hr_public.employees, p_expires_in_minutes integer DEFAULT 15) RETURNS hr_public.jwt_token
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    token hr_public.jwt_token;
    role_info hr_hidden.role_mapping;
BEGIN
    -- Get role mapping
    role_info := hr_hidden.get_role_mapping(p_employee.role_level);

    -- Build JWT token
    token.role := role_info.postgresql_role;
    token.exp := EXTRACT(epoch FROM (CURRENT_TIMESTAMP + (p_expires_in_minutes || ' minutes')::INTERVAL))::INTEGER;
    token.employee_id := p_employee.id;
    token.department_id := p_employee.department_id;
    token.role_level := p_employee.role_level;
    token.is_admin := (p_employee.role_level >= 80);
    token.permissions := role_info.permissions;

    RETURN token;
END;
$$;


--
-- Name: extract_jwt_claims(hr_public.jwt_token); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.extract_jwt_claims(token hr_public.jwt_token) RETURNS hr_hidden.jwt_claims
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    claims hr_hidden.jwt_claims;
    emp hr_public.employees;
BEGIN
    -- Validate token first
    IF NOT hr_hidden.validate_jwt_token(token) THEN
        RAISE EXCEPTION 'Invalid JWT token';
    END IF;

    -- Get employee details
    SELECT * INTO emp
    FROM hr_public.employees
    WHERE id = token.employee_id AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found or inactive';
    END IF;

    -- Build claims
    claims.employee_id := token.employee_id;
    claims.department_id := token.department_id;
    claims.role_level := token.role_level;
    claims.email := emp.email;
    claims.full_name := emp.first_name || ' ' || emp.last_name;
    claims.is_admin := token.is_admin;
    claims.permissions := token.permissions;

    RETURN claims;
END;
$$;


--
-- Name: generate_refresh_token(integer); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.generate_refresh_token(p_employee_id integer) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    refresh_token TEXT;
    token_hash TEXT;
BEGIN
    -- Generate random refresh token
    refresh_token := encode(gen_random_bytes(32), 'base64');

    -- Hash the token for storage
    token_hash := crypt(refresh_token, gen_salt('bf'));

    -- Store in employee account
    UPDATE hr_private.employee_account
    SET
        refresh_token_hash = token_hash,
        refresh_token_expires_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
    WHERE employee_id = p_employee_id;

    -- Return unhashed token to client
    RETURN refresh_token;
END;
$$;


--
-- Name: FUNCTION generate_refresh_token(p_employee_id integer); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.generate_refresh_token(p_employee_id integer) IS 'Generates and stores refresh token for employee';


--
-- Name: get_role_mapping(integer); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.get_role_mapping(p_role_level integer) RETURNS hr_hidden.role_mapping
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    result hr_hidden.role_mapping;
BEGIN
    SELECT
        rp.role_level,
        rp.postgresql_role,
        rp.role_name,
        rp.permissions
    INTO result
    FROM hr_hidden.role_permissions rp
    WHERE rp.role_level = p_role_level;

    IF NOT FOUND THEN
        -- Default to guest role
        SELECT
            rp.role_level,
            rp.postgresql_role,
            rp.role_name,
            rp.permissions
        INTO result
        FROM hr_hidden.role_permissions rp
        WHERE rp.role_level = 0;
    END IF;

    RETURN result;
END;
$$;


--
-- Name: log_account_lockout(integer, text, text); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.log_account_lockout(p_employee_id integer, p_email text, p_reason text DEFAULT 'excessive_failed_attempts'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO hr_private.auth_log (
        employee_id, action, result, details, ip_address, user_agent, created_at
    ) VALUES (
        p_employee_id,
        'ACCOUNT_LOCKED',
        'BLOCKED',
        jsonb_build_object(
            'email', p_email,
            'reason', p_reason,
            'locked_until', CURRENT_TIMESTAMP + INTERVAL '15 minutes',
            'timestamp', CURRENT_TIMESTAMP
        ),
        COALESCE(
            NULLIF(current_setting('request.headers.x-forwarded-for', true), ''),
            NULLIF(current_setting('request.headers.x-real-ip', true), ''),
            inet_client_addr()
        ),
        current_setting('request.headers.user-agent', true),
        CURRENT_TIMESTAMP
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log account lockout: %', SQLERRM;
END;
$$;


--
-- Name: FUNCTION log_account_lockout(p_employee_id integer, p_email text, p_reason text); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.log_account_lockout(p_employee_id integer, p_email text, p_reason text) IS 'Logs account lockout events for security monitoring';


--
-- Name: log_authentication_error(text, text); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.log_authentication_error(p_context text, p_error_message text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO hr_private.auth_log (
        employee_id, action, result, details, ip_address, user_agent, created_at
    ) VALUES (
        NULL,
        'AUTH_ERROR',
        'ERROR',
        jsonb_build_object(
            'context', p_context,
            'error', p_error_message,
            'timestamp', CURRENT_TIMESTAMP,
            'session_id', current_setting('application.session_id', true)
        ),
        COALESCE(
            NULLIF(current_setting('request.headers.x-forwarded-for', true), ''),
            NULLIF(current_setting('request.headers.x-real-ip', true), ''),
            inet_client_addr()
        ),
        current_setting('request.headers.user-agent', true),
        CURRENT_TIMESTAMP
    );
EXCEPTION WHEN OTHERS THEN
    -- Even if error logging fails, don't prevent the error from being handled
    RAISE WARNING 'Failed to log authentication error: %', SQLERRM;
END;
$$;


--
-- Name: FUNCTION log_authentication_error(p_context text, p_error_message text); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.log_authentication_error(p_context text, p_error_message text) IS 'Logs authentication system errors for debugging and monitoring';


--
-- Name: log_failed_login_attempt(text, text); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.log_failed_login_attempt(p_email text, p_reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO hr_private.auth_log (
        employee_id, action, result, details, ip_address, user_agent, created_at
    ) VALUES (
        NULL, -- No employee_id for failed attempts
        'LOGIN_ATTEMPT',
        'FAILED',
        jsonb_build_object(
            'email', p_email,
            'reason', p_reason,
            'timestamp', CURRENT_TIMESTAMP
        ),
        COALESCE(
            NULLIF(current_setting('request.headers.x-forwarded-for', true), ''),
            NULLIF(current_setting('request.headers.x-real-ip', true), ''),
            inet_client_addr()
        ),
        current_setting('request.headers.user-agent', true),
        CURRENT_TIMESTAMP
    );
EXCEPTION WHEN OTHERS THEN
    -- If logging fails, don't break authentication flow
    -- Could log to system log instead
    RAISE WARNING 'Failed to log authentication attempt: %', SQLERRM;
END;
$$;


--
-- Name: FUNCTION log_failed_login_attempt(p_email text, p_reason text); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.log_failed_login_attempt(p_email text, p_reason text) IS 'Logs failed login attempts for security monitoring with resilient error handling';


--
-- Name: log_logout(integer); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.log_logout(p_employee_id integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    employee_email TEXT;
BEGIN
    -- Get employee email for logging
    SELECT email INTO employee_email
    FROM hr_public.employees
    WHERE id = p_employee_id;

    INSERT INTO hr_private.auth_log (
        employee_id, action, result, details, ip_address, user_agent, created_at
    ) VALUES (
        p_employee_id,
        'LOGOUT',
        'SUCCESS',
        jsonb_build_object(
            'email', COALESCE(employee_email, 'unknown'),
            'logout_method', 'explicit',
            'timestamp', CURRENT_TIMESTAMP
        ),
        COALESCE(
            NULLIF(current_setting('request.headers.x-forwarded-for', true), ''),
            NULLIF(current_setting('request.headers.x-real-ip', true), ''),
            inet_client_addr()
        ),
        current_setting('request.headers.user-agent', true),
        CURRENT_TIMESTAMP
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log logout: %', SQLERRM;
END;
$$;


--
-- Name: FUNCTION log_logout(p_employee_id integer); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.log_logout(p_employee_id integer) IS 'Logs user logout events for session tracking';


--
-- Name: log_password_change(integer); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.log_password_change(p_employee_id integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    employee_email TEXT;
BEGIN
    -- Get employee email for logging
    SELECT email INTO employee_email
    FROM hr_public.employees
    WHERE id = p_employee_id;

    INSERT INTO hr_private.auth_log (
        employee_id, action, result, details, ip_address, user_agent, created_at
    ) VALUES (
        p_employee_id,
        'PASSWORD_CHANGE',
        'SUCCESS',
        jsonb_build_object(
            'email', COALESCE(employee_email, 'unknown'),
            'change_method', 'self_service',
            'timestamp', CURRENT_TIMESTAMP
        ),
        COALESCE(
            NULLIF(current_setting('request.headers.x-forwarded-for', true), ''),
            NULLIF(current_setting('request.headers.x-real-ip', true), ''),
            inet_client_addr()
        ),
        current_setting('request.headers.user-agent', true),
        CURRENT_TIMESTAMP
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log password change: %', SQLERRM;
END;
$$;


--
-- Name: FUNCTION log_password_change(p_employee_id integer); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.log_password_change(p_employee_id integer) IS 'Logs password change events for security auditing';


--
-- Name: log_successful_login(integer, text); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.log_successful_login(p_employee_id integer, p_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO hr_private.auth_log (
        employee_id, action, result, details, ip_address, user_agent, created_at
    ) VALUES (
        p_employee_id,
        'LOGIN',
        'SUCCESS',
        jsonb_build_object(
            'email', p_email,
            'login_method', 'password',
            'timestamp', CURRENT_TIMESTAMP
        ),
        COALESCE(
            NULLIF(current_setting('request.headers.x-forwarded-for', true), ''),
            NULLIF(current_setting('request.headers.x-real-ip', true), ''),
            inet_client_addr()
        ),
        current_setting('request.headers.user-agent', true),
        CURRENT_TIMESTAMP
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log successful login: %', SQLERRM;
END;
$$;


--
-- Name: FUNCTION log_successful_login(p_employee_id integer, p_email text); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.log_successful_login(p_employee_id integer, p_email text) IS 'Logs successful login events with client information';


--
-- Name: log_token_refresh(integer, text); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.log_token_refresh(p_employee_id integer, p_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO hr_private.auth_log (
        employee_id, action, result, details, ip_address, user_agent, created_at
    ) VALUES (
        p_employee_id,
        'TOKEN_REFRESH',
        'SUCCESS',
        jsonb_build_object(
            'email', p_email,
            'refresh_method', 'jwt_refresh',
            'timestamp', CURRENT_TIMESTAMP
        ),
        COALESCE(
            NULLIF(current_setting('request.headers.x-forwarded-for', true), ''),
            NULLIF(current_setting('request.headers.x-real-ip', true), ''),
            inet_client_addr()
        ),
        current_setting('request.headers.user-agent', true),
        CURRENT_TIMESTAMP
    );
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log token refresh: %', SQLERRM;
END;
$$;


--
-- Name: FUNCTION log_token_refresh(p_employee_id integer, p_email text); Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON FUNCTION hr_hidden.log_token_refresh(p_employee_id integer, p_email text) IS 'Logs JWT token refresh events for session tracking';


--
-- Name: sync_user_from_employee(); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.sync_user_from_employee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Create corresponding user when employee is created
        INSERT INTO hr_public.users (
            employee_id, email, password_hash, display_name,
            onboarding_status, is_active, created_at, updated_at, hire_date
        )
        SELECT
            NEW.id,
            NEW.email,
            ea.password_hash,
            (NEW.first_name || ' ' || NEW.last_name),
            CASE
                WHEN NEW.status = 'ACTIVE' THEN 'Active'
                ELSE 'Inactive'
            END,
            CASE WHEN NEW.status = 'ACTIVE' THEN true ELSE false END,
            NEW.created_at,
            NEW.updated_at,
            NEW.hire_date
        FROM hr_private.employee_account ea
        WHERE ea.employee_id = NEW.id;

        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Update corresponding user when employee is updated
        UPDATE hr_public.users
        SET
            email = NEW.email,
            display_name = (NEW.first_name || ' ' || NEW.last_name),
            onboarding_status = CASE
                WHEN NEW.status = 'ACTIVE' THEN 'Active'
                WHEN NEW.status = 'INACTIVE' THEN 'Inactive'
                WHEN NEW.status = 'TERMINATED' THEN 'Terminated'
                WHEN NEW.status = 'ON_LEAVE' THEN 'On Leave'
                ELSE 'Inactive'
            END,
            is_active = CASE WHEN NEW.status = 'ACTIVE' THEN true ELSE false END,
            updated_at = NEW.updated_at,
            hire_date = NEW.hire_date
        WHERE employee_id = NEW.id;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- User will be deleted by CASCADE
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: validate_jwt_token(hr_public.jwt_token); Type: FUNCTION; Schema: hr_hidden; Owner: -
--

CREATE FUNCTION hr_hidden.validate_jwt_token(token hr_public.jwt_token) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    -- Check required fields are present
    IF token.role IS NULL OR
       token.exp IS NULL OR
       token.employee_id IS NULL OR
       token.department_id IS NULL OR
       token.role_level IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check token hasn't expired
    IF token.exp < EXTRACT(epoch FROM CURRENT_TIMESTAMP) THEN
        RETURN FALSE;
    END IF;

    -- Check role level is valid
    IF token.role_level NOT IN (0, 20, 60, 80, 100) THEN
        RETURN FALSE;
    END IF;

    -- Check role matches role level
    DECLARE
        expected_role TEXT;
    BEGIN
        SELECT postgresql_role INTO expected_role
        FROM hr_hidden.role_permissions
        WHERE role_level = token.role_level;

        IF expected_role != token.role THEN
            RETURN FALSE;
        END IF;
    END;

    RETURN TRUE;
END;
$$;


--
-- Name: authenticate(text, text); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.authenticate(email text, password text) RETURNS hr_public.jwt_token
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'hr_public', 'hr_private', 'public', 'pg_temp'
    AS $$
DECLARE
    account hr_private.employee_account;
    employee_record hr_public.employees;
    jwt_claims hr_public.jwt_token;
    pg_role TEXT;
BEGIN
    -- Input validation
    IF email IS NULL OR email = '' THEN
        RAISE EXCEPTION 'Email cannot be empty';
    END IF;

    IF password IS NULL OR password = '' THEN
        RAISE EXCEPTION 'Password cannot be empty';
    END IF;

    -- Get employee and account
    SELECT ea.* INTO account
    FROM hr_private.employee_account ea
    JOIN hr_public.employees e ON ea.employee_id = e.id
    WHERE ea.email = authenticate.email;

    SELECT e.* INTO employee_record
    FROM hr_public.employees e
    WHERE e.email = authenticate.email;

    -- Check if account exists
    IF account.employee_id IS NULL THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;

    -- Check if employee is active
    IF employee_record.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Account is not active';
    END IF;

    -- Verify password using public.crypt
    IF account.password_hash != public.crypt(password, account.password_hash) THEN
        RAISE EXCEPTION 'Invalid credentials';
    END IF;

    -- Update last login
    UPDATE hr_private.employee_account
    SET last_login = NOW(), updated_at = NOW()
    WHERE employee_id = account.employee_id;

    -- Determine PostgreSQL role based on role level
    CASE
        WHEN employee_record.role_level >= 100 THEN pg_role := 'hr_admin';
        WHEN employee_record.role_level >= 80 THEN pg_role := 'hr_manager';
        WHEN employee_record.role_level >= 20 THEN pg_role := 'hr_employee';
        ELSE pg_role := 'hr_guest';
    END CASE;

    -- Create JWT token with available fields only
    jwt_claims.employee_id := employee_record.id;
    jwt_claims.user_id := employee_record.id; -- For Hasura compatibility
    jwt_claims.role := pg_role;
    jwt_claims.role_level := COALESCE(employee_record.role_level, 20);
    jwt_claims.department_id := employee_record.department_id;
    jwt_claims.is_admin := (employee_record.role_level >= 100);
    jwt_claims.permissions := ARRAY['basic_access']; -- Basic permissions
    jwt_claims.exp := extract(epoch from (now() + interval '8 hours'));

    RETURN jwt_claims;
END;
$$;


--
-- Name: time_off_balances; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.time_off_balances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id integer NOT NULL,
    policy_id uuid NOT NULL,
    balance_year integer NOT NULL,
    opening_balance numeric(6,2) DEFAULT 0,
    accrued_this_year numeric(6,2) DEFAULT 0,
    used_this_year numeric(6,2) DEFAULT 0,
    pending_requests numeric(6,2) DEFAULT 0,
    carried_forward numeric(6,2) DEFAULT 0,
    current_balance numeric(6,2) GENERATED ALWAYS AS ((((opening_balance + accrued_this_year) - used_this_year) + carried_forward)) STORED,
    available_balance numeric(6,2) GENERATED ALWAYS AS (((((opening_balance + accrued_this_year) - used_this_year) + carried_forward) - pending_requests)) STORED,
    last_accrual_date date,
    last_calculated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_off_balances_non_negative CHECK (((opening_balance >= (0)::numeric) AND (accrued_this_year >= (0)::numeric) AND (used_this_year >= (0)::numeric) AND (pending_requests >= (0)::numeric) AND (carried_forward >= (0)::numeric))),
    CONSTRAINT time_off_balances_year_valid CHECK (((balance_year >= 2020) AND (balance_year <= 2100)))
);


--
-- Name: calculate_time_off_balance(integer, uuid, integer); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.calculate_time_off_balance(p_employee_id integer, p_policy_id uuid, p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer) RETURNS hr_public.time_off_balances
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    balance_record hr_public.time_off_balances;
    policy_record hr_public.time_off_policies;
    used_days DECIMAL(6,2) := 0;
    pending_days DECIMAL(6,2) := 0;
BEGIN
    -- Get policy details
    SELECT * INTO policy_record
    FROM hr_public.time_off_policies
    WHERE id = p_policy_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Policy not found or inactive: %', p_policy_id;
    END IF;

    -- Calculate used days from approved requests
    SELECT COALESCE(SUM(days_requested), 0) INTO used_days
    FROM hr_public.time_off_requests
    WHERE employee_id = p_employee_id
      AND request_type = policy_record.time_off_type
      AND status = 'APPROVED'
      AND EXTRACT(YEAR FROM start_date) = p_year;

    -- Calculate pending days from pending requests
    SELECT COALESCE(SUM(days_requested), 0) INTO pending_days
    FROM hr_public.time_off_requests
    WHERE employee_id = p_employee_id
      AND request_type = policy_record.time_off_type
      AND status = 'PENDING'
      AND EXTRACT(YEAR FROM start_date) = p_year;

    -- Get or create balance record
    SELECT * INTO balance_record
    FROM hr_public.time_off_balances
    WHERE employee_id = p_employee_id AND policy_id = p_policy_id AND balance_year = p_year;

    IF NOT FOUND THEN
        -- Create new balance record with calculated values
        INSERT INTO hr_public.time_off_balances (
            employee_id, policy_id, balance_year,
            opening_balance, accrued_this_year, used_this_year, pending_requests
        ) VALUES (
            p_employee_id, p_policy_id, p_year,
            0, policy_record.accrual_rate * 12, used_days, pending_days -- Simplified annual accrual
        ) RETURNING * INTO balance_record;
    ELSE
        -- Update existing record
        UPDATE hr_public.time_off_balances
        SET used_this_year = used_days,
            pending_requests = pending_days,
            last_calculated_at = CURRENT_TIMESTAMP
        WHERE id = balance_record.id
        RETURNING * INTO balance_record;
    END IF;

    RETURN balance_record;
END;
$$;


--
-- Name: FUNCTION calculate_time_off_balance(p_employee_id integer, p_policy_id uuid, p_year integer); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.calculate_time_off_balance(p_employee_id integer, p_policy_id uuid, p_year integer) IS '@name calculateTimeOffBalance
Calculate and return current time-off balance for employee and policy';


--
-- Name: change_password(text, text); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.change_password(current_password text, new_password text) RETURNS boolean
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'hr_public', 'hr_private', 'hr_hidden', 'public'
    AS $$
DECLARE
    current_employee_id INTEGER;
    account hr_private.employee_account;
    password_hash_new TEXT;
BEGIN
    -- Get current employee ID
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;

    -- Input validation
    IF current_password IS NULL OR current_password = '' THEN
        RAISE EXCEPTION 'Current password is required';
    END IF;

    IF new_password IS NULL OR LENGTH(new_password) < 8 THEN
        RAISE EXCEPTION 'New password must be at least 8 characters';
    END IF;

    -- Get account
    SELECT a.* INTO account
    FROM hr_private.employee_account a
    WHERE a.employee_id = current_employee_id;

    -- Verify current password
    IF account.password_hash != crypt(current_password, account.password_hash) THEN
        RAISE EXCEPTION 'Current password is incorrect';
    END IF;

    -- Generate new password hash
    password_hash_new := crypt(new_password, gen_salt('bf'));

    -- Update password
    UPDATE hr_private.employee_account
    SET
        password_hash = password_hash_new,
        password_changed_at = CURRENT_TIMESTAMP,
        failed_attempts = 0,
        locked_until = NULL,
        -- Invalidate refresh token for security
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL
    WHERE employee_id = current_employee_id;

    -- Log password change
    PERFORM hr_hidden.log_password_change(current_employee_id);

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        PERFORM hr_hidden.log_authentication_error('password_change', SQLERRM);
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        ELSE
            RAISE EXCEPTION 'Password change failed';
        END IF;
END;
$$;


--
-- Name: FUNCTION change_password(current_password text, new_password text); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.change_password(current_password text, new_password text) IS '@name changePassword
Changes user password with current password verification';


--
-- Name: establish_user_session(uuid, inet, character varying); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.establish_user_session(p_user_id uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent character varying DEFAULT NULL::character varying) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    session_id UUID;
    session_token VARCHAR(255);
BEGIN
    -- Generate session ID and token
    session_id := uuid_generate_v4();
    session_token := encode(gen_random_bytes(32), 'hex');

    -- Create session
    INSERT INTO hr_public.user_sessions (
        id, user_id, session_token,
        ip_address, user_agent,
        created_at, expires_at, is_active
    ) VALUES (
        session_id, p_user_id::INTEGER, session_token,
        p_ip_address, p_user_agent,
        NOW(), NOW() + INTERVAL '8 hours', true
    );

    RETURN session_id;
END;
$$;


--
-- Name: FUNCTION establish_user_session(p_user_id uuid, p_ip_address inet, p_user_agent character varying); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.establish_user_session(p_user_id uuid, p_ip_address inet, p_user_agent character varying) IS '@name establishUserSession
@resultFieldName userSessionId
Establish a new user session with authentication';


--
-- Name: initiate_privacy_assessment(character varying, character varying, text, text[], text[], character varying, uuid); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.initiate_privacy_assessment(p_assessment_title character varying, p_project_name character varying, p_process_description text, p_personal_data_categories text[], p_processing_purposes text[], p_legal_basis character varying, p_conducted_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    assessment_id UUID;
    assessment_reference VARCHAR(100);
    current_user_id UUID;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := COALESCE(p_conducted_by, current_setting('session.user_id')::UUID);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := p_conducted_by;
    END;

    -- Generate assessment reference
    assessment_reference := 'DPIA-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                           LPAD(NEXTVAL('hr_hidden.assessment_sequence')::TEXT, 4, '0');

    -- Note: This requires the privacy_impact_assessments table from compliance migrations
    -- For now, we'll create a placeholder UUID and handle this in later migrations
    assessment_id := uuid_generate_v4();

    RETURN assessment_id;
END;
$$;


--
-- Name: FUNCTION initiate_privacy_assessment(p_assessment_title character varying, p_project_name character varying, p_process_description text, p_personal_data_categories text[], p_processing_purposes text[], p_legal_basis character varying, p_conducted_by uuid); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.initiate_privacy_assessment(p_assessment_title character varying, p_project_name character varying, p_process_description text, p_personal_data_categories text[], p_processing_purposes text[], p_legal_basis character varying, p_conducted_by uuid) IS '@name initiatePrivacyAssessment
@resultFieldName privacyAssessmentId
Initiate GDPR Article 35 Data Protection Impact Assessment';


--
-- Name: logout(); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.logout() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'hr_public', 'hr_private', 'hr_hidden', 'public'
    AS $$
DECLARE
    current_employee_id INTEGER;
BEGIN
    -- Get current employee ID from session variables
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;

    -- Clear refresh token
    UPDATE hr_private.employee_account
    SET
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL
    WHERE employee_id = current_employee_id;

    -- Log logout
    PERFORM hr_hidden.log_logout(current_employee_id);

    RETURN TRUE;

EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;


--
-- Name: FUNCTION logout(); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.logout() IS '@name logout
Logs out current user by invalidating refresh token';


--
-- Name: refresh_token(text); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.refresh_token(refresh_token text) RETURNS hr_public.jwt_token
    LANGUAGE plpgsql STRICT SECURITY DEFINER
    SET search_path TO 'hr_public', 'hr_private', 'hr_hidden', 'public'
    AS $$
DECLARE
    account hr_private.employee_account;
    employee hr_public.employees;
    token hr_public.jwt_token;
BEGIN
    -- Input validation
    IF refresh_token IS NULL OR refresh_token = '' THEN
        RAISE EXCEPTION 'Refresh token is required';
    END IF;

    -- Find account by refresh token hash
    SELECT a.* INTO account
    FROM hr_private.employee_account a
    WHERE a.refresh_token_hash = crypt(refresh_token, a.refresh_token_hash)
      AND a.refresh_token_expires_at > CURRENT_TIMESTAMP;

    -- Check if refresh token is valid
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired refresh token';
    END IF;

    -- Get employee details
    SELECT e.* INTO employee
    FROM hr_public.employees e
    WHERE e.id = account.employee_id;

    -- Check if employee is still active
    IF employee.status != 'ACTIVE' THEN
        -- Clear refresh token for inactive employee
        UPDATE hr_private.employee_account
        SET refresh_token_hash = NULL, refresh_token_expires_at = NULL
        WHERE id = account.id;

        RAISE EXCEPTION 'Employee account is not active';
    END IF;

    -- Create new JWT token
    token := hr_hidden.create_jwt_token(employee, 15); -- 15 minute expiry

    -- Log token refresh
    PERFORM hr_hidden.log_token_refresh(employee.id, employee.email);

    RETURN token;

EXCEPTION
    WHEN OTHERS THEN
        PERFORM hr_hidden.log_authentication_error('refresh_token', SQLERRM);
        IF SQLSTATE = 'P0001' THEN
            RAISE;
        ELSE
            RAISE EXCEPTION 'Token refresh failed';
        END IF;
END;
$$;


--
-- Name: FUNCTION refresh_token(refresh_token text); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.refresh_token(refresh_token text) IS '@name refreshToken
Refreshes JWT token using refresh token';


--
-- Name: report_data_breach(character varying, character varying, character varying, text[], integer, text, uuid); Type: FUNCTION; Schema: hr_public; Owner: -
--

CREATE FUNCTION hr_public.report_data_breach(p_incident_title character varying, p_severity character varying, p_breach_type character varying, p_affected_data_categories text[], p_estimated_affected_records integer, p_root_cause text DEFAULT NULL::text, p_discovered_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    incident_id UUID;
    incident_number VARCHAR(50);
    current_user_id UUID;
    notification_required BOOLEAN := false;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := COALESCE(p_discovered_by, current_setting('session.user_id')::UUID);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := p_discovered_by;
    END;

    -- Generate incident number
    incident_number := 'BR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                      LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');

    -- Determine if regulatory notification is required
    IF p_severity IN ('HIGH', 'CRITICAL') OR p_estimated_affected_records > 250 THEN
        notification_required := true;
    END IF;

    -- Note: This requires the data_breach_incidents table from security migrations
    -- For now, we'll create a placeholder UUID and handle this in later migrations
    incident_id := uuid_generate_v4();

    RETURN incident_id;
END;
$$;


--
-- Name: FUNCTION report_data_breach(p_incident_title character varying, p_severity character varying, p_breach_type character varying, p_affected_data_categories text[], p_estimated_affected_records integer, p_root_cause text, p_discovered_by uuid); Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON FUNCTION hr_public.report_data_breach(p_incident_title character varying, p_severity character varying, p_breach_type character varying, p_affected_data_categories text[], p_estimated_affected_records integer, p_root_cause text, p_discovered_by uuid) IS '@name reportDataBreach
@resultFieldName breachIncidentId
Report and manage data breach incidents';


--
-- Name: assessment_sequence; Type: SEQUENCE; Schema: hr_hidden; Owner: -
--

CREATE SEQUENCE hr_hidden.assessment_sequence
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions; Type: TABLE; Schema: hr_hidden; Owner: -
--

CREATE TABLE hr_hidden.role_permissions (
    id integer NOT NULL,
    role_level integer NOT NULL,
    postgresql_role text NOT NULL,
    role_name text NOT NULL,
    permissions text[] NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_permissions_level_valid CHECK ((role_level = ANY (ARRAY[0, 20, 60, 80, 100])))
);


--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON TABLE hr_hidden.role_permissions IS 'Role level definitions and permissions mapping';


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: hr_hidden; Owner: -
--

CREATE SEQUENCE hr_hidden.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_hidden; Owner: -
--

ALTER SEQUENCE hr_hidden.role_permissions_id_seq OWNED BY hr_hidden.role_permissions.id;


--
-- Name: time_off_balances; Type: TABLE; Schema: hr_hidden; Owner: -
--

CREATE TABLE hr_hidden.time_off_balances (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    year integer NOT NULL,
    vacation_days_total numeric(4,2) DEFAULT 0,
    vacation_days_used numeric(4,2) DEFAULT 0,
    sick_days_total numeric(4,2) DEFAULT 0,
    sick_days_used numeric(4,2) DEFAULT 0,
    personal_days_total numeric(4,2) DEFAULT 0,
    personal_days_used numeric(4,2) DEFAULT 0,
    last_calculated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_off_balances_non_negative CHECK (((vacation_days_total >= (0)::numeric) AND (vacation_days_used >= (0)::numeric) AND (sick_days_total >= (0)::numeric) AND (sick_days_used >= (0)::numeric) AND (personal_days_total >= (0)::numeric) AND (personal_days_used >= (0)::numeric))),
    CONSTRAINT time_off_balances_usage_not_exceed_total CHECK (((vacation_days_used <= vacation_days_total) AND (sick_days_used <= sick_days_total) AND (personal_days_used <= personal_days_total))),
    CONSTRAINT time_off_balances_year_valid CHECK (((year >= 2020) AND (year <= 2050)))
);


--
-- Name: TABLE time_off_balances; Type: COMMENT; Schema: hr_hidden; Owner: -
--

COMMENT ON TABLE hr_hidden.time_off_balances IS 'Calculated time-off balances cache for performance';


--
-- Name: time_off_balances_id_seq; Type: SEQUENCE; Schema: hr_hidden; Owner: -
--

CREATE SEQUENCE hr_hidden.time_off_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_off_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_hidden; Owner: -
--

ALTER SEQUENCE hr_hidden.time_off_balances_id_seq OWNED BY hr_hidden.time_off_balances.id;


--
-- Name: auth_log; Type: TABLE; Schema: hr_private; Owner: -
--

CREATE TABLE hr_private.auth_log (
    id integer NOT NULL,
    employee_id integer,
    action character varying(50) NOT NULL,
    result character varying(20) NOT NULL,
    ip_address inet,
    user_agent text,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_log_action_valid CHECK (((action)::text = ANY ((ARRAY['LOGIN_ATTEMPT'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying, 'TOKEN_REFRESH'::character varying, 'PASSWORD_CHANGE'::character varying, 'PASSWORD_RESET'::character varying, 'AUTH_ERROR'::character varying, 'ACCOUNT_LOCKED'::character varying, 'ACCOUNT_UNLOCKED'::character varying])::text[]))),
    CONSTRAINT auth_log_result_valid CHECK (((result)::text = ANY ((ARRAY['SUCCESS'::character varying, 'FAILED'::character varying, 'ERROR'::character varying, 'BLOCKED'::character varying])::text[])))
);


--
-- Name: TABLE auth_log; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON TABLE hr_private.auth_log IS 'Authentication and security event logging table';


--
-- Name: COLUMN auth_log.employee_id; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.auth_log.employee_id IS 'Employee involved in the auth event (null for failed login attempts)';


--
-- Name: COLUMN auth_log.action; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.auth_log.action IS 'Type of authentication action performed';


--
-- Name: COLUMN auth_log.result; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.auth_log.result IS 'Result of the authentication action';


--
-- Name: COLUMN auth_log.ip_address; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.auth_log.ip_address IS 'IP address of the client making the request';


--
-- Name: COLUMN auth_log.user_agent; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.auth_log.user_agent IS 'User agent string from the client';


--
-- Name: COLUMN auth_log.details; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.auth_log.details IS 'Additional details about the auth event (JSON)';


--
-- Name: COLUMN auth_log.created_at; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON COLUMN hr_private.auth_log.created_at IS 'Timestamp when the auth event occurred';


--
-- Name: auth_log_id_seq; Type: SEQUENCE; Schema: hr_private; Owner: -
--

CREATE SEQUENCE hr_private.auth_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_log_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_private; Owner: -
--

ALTER SEQUENCE hr_private.auth_log_id_seq OWNED BY hr_private.auth_log.id;


--
-- Name: employee_account; Type: TABLE; Schema: hr_private; Owner: -
--

CREATE TABLE hr_private.employee_account (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    last_login timestamp with time zone,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    password_changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    refresh_token_hash text,
    refresh_token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_account_email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT employee_account_failed_attempts_positive CHECK ((failed_attempts >= 0)),
    CONSTRAINT employee_account_locked_until_future CHECK (((locked_until IS NULL) OR (locked_until > CURRENT_TIMESTAMP))),
    CONSTRAINT employee_account_refresh_token_expiry CHECK ((((refresh_token_hash IS NULL) AND (refresh_token_expires_at IS NULL)) OR ((refresh_token_hash IS NOT NULL) AND (refresh_token_expires_at IS NOT NULL))))
);


--
-- Name: TABLE employee_account; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON TABLE hr_private.employee_account IS 'Employee authentication accounts';


--
-- Name: employee_account_id_seq; Type: SEQUENCE; Schema: hr_private; Owner: -
--

CREATE SEQUENCE hr_private.employee_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_account_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_private; Owner: -
--

ALTER SEQUENCE hr_private.employee_account_id_seq OWNED BY hr_private.employee_account.id;


--
-- Name: employee_compensation; Type: TABLE; Schema: hr_private; Owner: -
--

CREATE TABLE hr_private.employee_compensation (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    base_salary numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    salary_type character varying(20) DEFAULT 'ANNUAL'::character varying,
    effective_date date NOT NULL,
    end_date date,
    bonus_eligible boolean DEFAULT true,
    equity_grants numeric(12,2) DEFAULT 0,
    benefits_package character varying(100),
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT compensation_currency_valid CHECK (((currency)::text ~* '^[A-Z]{3}$'::text)),
    CONSTRAINT compensation_dates_valid CHECK (((end_date IS NULL) OR (end_date >= effective_date))),
    CONSTRAINT compensation_equity_non_negative CHECK ((equity_grants >= (0)::numeric)),
    CONSTRAINT compensation_salary_positive CHECK ((base_salary > (0)::numeric)),
    CONSTRAINT compensation_salary_reasonable CHECK (((((salary_type)::text = 'ANNUAL'::text) AND ((base_salary >= (20000)::numeric) AND (base_salary <= (10000000)::numeric))) OR (((salary_type)::text = 'HOURLY'::text) AND ((base_salary >= 7.25) AND (base_salary <= (5000)::numeric))))),
    CONSTRAINT compensation_salary_type_valid CHECK (((salary_type)::text = ANY ((ARRAY['ANNUAL'::character varying, 'HOURLY'::character varying])::text[])))
);


--
-- Name: TABLE employee_compensation; Type: COMMENT; Schema: hr_private; Owner: -
--

COMMENT ON TABLE hr_private.employee_compensation IS 'Employee compensation and salary information';


--
-- Name: employee_compensation_id_seq; Type: SEQUENCE; Schema: hr_private; Owner: -
--

CREATE SEQUENCE hr_private.employee_compensation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_compensation_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_private; Owner: -
--

ALTER SEQUENCE hr_private.employee_compensation_id_seq OWNED BY hr_private.employee_compensation.id;


--
-- Name: access_log; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.access_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id integer,
    action character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id character varying(255),
    ip_address inet NOT NULL,
    user_agent character varying(500),
    request_method character varying(10),
    request_path character varying(1000),
    response_status integer,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    duration_ms integer,
    session_id uuid,
    authentication_method character varying(50),
    risk_score integer DEFAULT 0,
    CONSTRAINT access_log_action_not_empty CHECK ((length(TRIM(BOTH FROM action)) > 0)),
    CONSTRAINT access_log_response_status_valid CHECK (((response_status >= 100) AND (response_status <= 599))),
    CONSTRAINT access_log_risk_score_check CHECK (((risk_score >= 0) AND (risk_score <= 100)))
);


--
-- Name: audit_log; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name character varying(255) NOT NULL,
    record_id character varying(255) NOT NULL,
    action hr_public.audit_action_type NOT NULL,
    old_values jsonb,
    new_values jsonb,
    changed_fields text[],
    performed_by integer,
    performed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent character varying(500),
    session_id uuid,
    data_classification hr_public.data_classification DEFAULT 'INTERNAL'::hr_public.data_classification,
    retention_date date,
    CONSTRAINT audit_log_record_id_not_empty CHECK ((length(TRIM(BOTH FROM record_id)) > 0)),
    CONSTRAINT audit_log_table_name_not_empty CHECK ((length(TRIM(BOTH FROM table_name)) > 0))
);


--
-- Name: compensation_bands; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.compensation_bands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    band_name character varying(255) NOT NULL,
    job_level character varying(100) NOT NULL,
    department_id integer,
    min_salary numeric(12,2) NOT NULL,
    max_salary numeric(12,2) NOT NULL,
    target_salary numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    effective_date date NOT NULL,
    end_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    CONSTRAINT compensation_bands_dates_valid CHECK (((end_date IS NULL) OR (end_date > effective_date))),
    CONSTRAINT compensation_bands_name_not_empty CHECK ((length(TRIM(BOTH FROM band_name)) > 0)),
    CONSTRAINT compensation_bands_salary_order CHECK (((min_salary <= target_salary) AND (target_salary <= max_salary))),
    CONSTRAINT compensation_bands_salary_positive CHECK ((min_salary > (0)::numeric))
);


--
-- Name: departments; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.departments (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    parent_department_id integer,
    manager_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT departments_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT departments_no_self_parent CHECK ((id <> parent_department_id))
);


--
-- Name: TABLE departments; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.departments IS 'Organizational departments within the company';


--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: hr_public; Owner: -
--

CREATE SEQUENCE hr_public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_public; Owner: -
--

ALTER SEQUENCE hr_public.departments_id_seq OWNED BY hr_public.departments.id;


--
-- Name: employee_goals; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.employee_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id integer NOT NULL,
    goal_title character varying(255) NOT NULL,
    goal_description text,
    target_completion_date date,
    status hr_public.goal_status DEFAULT 'NOT_STARTED'::hr_public.goal_status,
    progress_percentage integer DEFAULT 0,
    milestones jsonb DEFAULT '[]'::jsonb,
    review_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    CONSTRAINT employee_goals_completion_future CHECK (((target_completion_date IS NULL) OR (target_completion_date >= CURRENT_DATE))),
    CONSTRAINT employee_goals_progress_percentage_check CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100))),
    CONSTRAINT employee_goals_title_not_empty CHECK ((length(TRIM(BOTH FROM goal_title)) > 0))
);


--
-- Name: employee_time_off_policies; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.employee_time_off_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id integer NOT NULL,
    policy_id uuid NOT NULL,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    custom_accrual_rate numeric(5,2),
    custom_max_accrual numeric(6,2),
    custom_carry_forward numeric(6,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    CONSTRAINT employee_policies_custom_accrual_valid CHECK (((custom_accrual_rate IS NULL) OR (custom_accrual_rate >= (0)::numeric))),
    CONSTRAINT employee_policies_custom_carry_valid CHECK (((custom_carry_forward IS NULL) OR ((custom_carry_forward >= (0)::numeric) AND ((custom_max_accrual IS NULL) OR (custom_carry_forward <= custom_max_accrual))))),
    CONSTRAINT employee_policies_custom_max_valid CHECK (((custom_max_accrual IS NULL) OR (custom_max_accrual >= (0)::numeric))),
    CONSTRAINT employee_policies_dates_valid CHECK (((end_date IS NULL) OR (end_date >= effective_date)))
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: hr_public; Owner: -
--

CREATE SEQUENCE hr_public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_public; Owner: -
--

ALTER SEQUENCE hr_public.employees_id_seq OWNED BY hr_public.employees.id;


--
-- Name: payroll_records; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.payroll_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id integer NOT NULL,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    pay_date date NOT NULL,
    base_salary_amount numeric(12,2) NOT NULL,
    overtime_hours numeric(5,2) DEFAULT 0,
    overtime_amount numeric(10,2) DEFAULT 0,
    bonus_amount numeric(10,2) DEFAULT 0,
    commission_amount numeric(10,2) DEFAULT 0,
    tax_deductions numeric(10,2) DEFAULT 0,
    benefit_deductions numeric(10,2) DEFAULT 0,
    other_deductions numeric(10,2) DEFAULT 0,
    gross_pay numeric(12,2) GENERATED ALWAYS AS ((((base_salary_amount + overtime_amount) + bonus_amount) + commission_amount)) STORED,
    total_deductions numeric(12,2) GENERATED ALWAYS AS (((tax_deductions + benefit_deductions) + other_deductions)) STORED,
    net_pay numeric(12,2) GENERATED ALWAYS AS (((((((base_salary_amount + overtime_amount) + bonus_amount) + commission_amount) - tax_deductions) - benefit_deductions) - other_deductions)) STORED,
    status hr_public.payroll_status DEFAULT 'DRAFT'::hr_public.payroll_status,
    processed_at timestamp with time zone,
    processed_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    CONSTRAINT payroll_records_amounts_non_negative CHECK (((base_salary_amount >= (0)::numeric) AND (overtime_hours >= (0)::numeric) AND (overtime_amount >= (0)::numeric) AND (bonus_amount >= (0)::numeric) AND (commission_amount >= (0)::numeric) AND (tax_deductions >= (0)::numeric) AND (benefit_deductions >= (0)::numeric) AND (other_deductions >= (0)::numeric))),
    CONSTRAINT payroll_records_period_valid CHECK ((pay_period_end >= pay_period_start))
);


--
-- Name: performance_reviews; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.performance_reviews (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    reviewer_id integer NOT NULL,
    review_period character varying(50) NOT NULL,
    status hr_public.review_status DEFAULT 'NOT_STARTED'::hr_public.review_status,
    overall_rating numeric(3,2),
    goals text,
    achievements text,
    areas_for_improvement text,
    feedback text,
    employee_comments text,
    next_review_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    CONSTRAINT performance_review_completion_logic CHECK ((((status = 'COMPLETED'::hr_public.review_status) AND (completed_at IS NOT NULL) AND (overall_rating IS NOT NULL)) OR (status <> 'COMPLETED'::hr_public.review_status))),
    CONSTRAINT performance_review_no_self_review CHECK ((employee_id <> reviewer_id)),
    CONSTRAINT performance_review_period_format CHECK (((review_period)::text ~* '^[0-9]{4}-(Q[1-4]|Annual|Mid-Year)$'::text)),
    CONSTRAINT performance_review_rating_valid CHECK (((overall_rating IS NULL) OR ((overall_rating >= 1.00) AND (overall_rating <= 5.00))))
);


--
-- Name: TABLE performance_reviews; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.performance_reviews IS 'Performance review cycles with ratings and feedback';


--
-- Name: performance_reviews_id_seq; Type: SEQUENCE; Schema: hr_public; Owner: -
--

CREATE SEQUENCE hr_public.performance_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: performance_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_public; Owner: -
--

ALTER SEQUENCE hr_public.performance_reviews_id_seq OWNED BY hr_public.performance_reviews.id;


--
-- Name: review_templates; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.review_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name character varying(255) NOT NULL,
    description text,
    competencies jsonb DEFAULT '[]'::jsonb NOT NULL,
    goals_structure jsonb DEFAULT '{}'::jsonb,
    rating_scale jsonb DEFAULT '{"max": 5, "min": 1, "labels": {}}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    applicable_roles text[] DEFAULT ARRAY[]::text[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer NOT NULL,
    CONSTRAINT review_templates_name_not_empty CHECK ((length(TRIM(BOTH FROM template_name)) > 0))
);


--
-- Name: time_off_policies; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.time_off_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    policy_name character varying(255) NOT NULL,
    time_off_type hr_public.time_off_type NOT NULL,
    description text,
    accrual_frequency hr_public.accrual_frequency DEFAULT 'MONTHLY'::hr_public.accrual_frequency,
    accrual_rate numeric(5,2) DEFAULT 0 NOT NULL,
    max_accrual numeric(6,2) DEFAULT 240,
    max_carry_forward numeric(6,2) DEFAULT 40,
    min_increment numeric(4,2) DEFAULT 0.5,
    max_consecutive_days integer DEFAULT 30,
    advance_notice_days integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    CONSTRAINT time_off_policies_accrual_rate_valid CHECK ((accrual_rate >= (0)::numeric)),
    CONSTRAINT time_off_policies_carry_forward_valid CHECK (((max_carry_forward >= (0)::numeric) AND (max_carry_forward <= max_accrual))),
    CONSTRAINT time_off_policies_consecutive_days_valid CHECK (((max_consecutive_days > 0) AND (max_consecutive_days <= 365))),
    CONSTRAINT time_off_policies_max_accrual_valid CHECK ((max_accrual >= (0)::numeric)),
    CONSTRAINT time_off_policies_min_increment_valid CHECK (((min_increment > (0)::numeric) AND (min_increment <= (8)::numeric))),
    CONSTRAINT time_off_policies_name_not_empty CHECK ((length(TRIM(BOTH FROM policy_name)) > 0)),
    CONSTRAINT time_off_policies_notice_days_valid CHECK (((advance_notice_days >= 0) AND (advance_notice_days <= 365)))
);


--
-- Name: time_off_requests; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.time_off_requests (
    id integer NOT NULL,
    employee_id integer NOT NULL,
    request_type hr_public.time_off_type NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_requested numeric(4,2) NOT NULL,
    reason text,
    status hr_public.request_status DEFAULT 'PENDING'::hr_public.request_status,
    approved_by integer,
    approved_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT time_off_approval_logic CHECK ((((status = 'APPROVED'::hr_public.request_status) AND (approved_by IS NOT NULL) AND (approved_at IS NOT NULL)) OR ((status = 'REJECTED'::hr_public.request_status) AND (approved_by IS NOT NULL) AND (approved_at IS NOT NULL) AND (rejection_reason IS NOT NULL)) OR (status = ANY (ARRAY['PENDING'::hr_public.request_status, 'CANCELLED'::hr_public.request_status])))),
    CONSTRAINT time_off_dates_valid CHECK ((start_date <= end_date)),
    CONSTRAINT time_off_days_positive CHECK ((days_requested > (0)::numeric)),
    CONSTRAINT time_off_days_reasonable CHECK ((days_requested <= (365)::numeric)),
    CONSTRAINT time_off_future_dates CHECK ((start_date >= (CURRENT_DATE - '1 year'::interval)))
);


--
-- Name: TABLE time_off_requests; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.time_off_requests IS 'Employee time-off requests with approval workflow';


--
-- Name: time_off_requests_id_seq; Type: SEQUENCE; Schema: hr_public; Owner: -
--

CREATE SEQUENCE hr_public.time_off_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: time_off_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_public; Owner: -
--

ALTER SEQUENCE hr_public.time_off_requests_id_seq OWNED BY hr_public.time_off_requests.id;


--
-- Name: user_role_assignments; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.user_role_assignments (
    id integer NOT NULL,
    user_id integer,
    role_id integer,
    assigned_by integer,
    is_active boolean DEFAULT true,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_role_assignments_id_seq; Type: SEQUENCE; Schema: hr_public; Owner: -
--

CREATE SEQUENCE hr_public.user_role_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_role_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_public; Owner: -
--

ALTER SEQUENCE hr_public.user_role_assignments_id_seq OWNED BY hr_public.user_role_assignments.id;


--
-- Name: user_sessions; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    session_token character varying(255) NOT NULL,
    ip_address inet,
    user_agent character varying(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '08:00:00'::interval),
    is_active boolean DEFAULT true,
    last_activity_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_sessions_expires_future CHECK ((expires_at > created_at)),
    CONSTRAINT user_sessions_token_not_empty CHECK ((length(TRIM(BOTH FROM session_token)) > 0))
);


--
-- Name: TABLE user_sessions; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.user_sessions IS 'Active user sessions for authentication tracking';


--
-- Name: users; Type: TABLE; Schema: hr_public; Owner: -
--

CREATE TABLE hr_public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    onboarding_status text DEFAULT 'Active'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hire_date date,
    employee_id integer
);


--
-- Name: TABLE users; Type: COMMENT; Schema: hr_public; Owner: -
--

COMMENT ON TABLE hr_public.users IS 'Users table providing Hasura-style API compatibility with full CRUD operations';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: hr_public; Owner: -
--

CREATE SEQUENCE hr_public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: hr_public; Owner: -
--

ALTER SEQUENCE hr_public.users_id_seq OWNED BY hr_public.users.id;


--
-- Name: role_permissions id; Type: DEFAULT; Schema: hr_hidden; Owner: -
--

ALTER TABLE ONLY hr_hidden.role_permissions ALTER COLUMN id SET DEFAULT nextval('hr_hidden.role_permissions_id_seq'::regclass);


--
-- Name: time_off_balances id; Type: DEFAULT; Schema: hr_hidden; Owner: -
--

ALTER TABLE ONLY hr_hidden.time_off_balances ALTER COLUMN id SET DEFAULT nextval('hr_hidden.time_off_balances_id_seq'::regclass);


--
-- Name: auth_log id; Type: DEFAULT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.auth_log ALTER COLUMN id SET DEFAULT nextval('hr_private.auth_log_id_seq'::regclass);


--
-- Name: employee_account id; Type: DEFAULT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_account ALTER COLUMN id SET DEFAULT nextval('hr_private.employee_account_id_seq'::regclass);


--
-- Name: employee_compensation id; Type: DEFAULT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_compensation ALTER COLUMN id SET DEFAULT nextval('hr_private.employee_compensation_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments ALTER COLUMN id SET DEFAULT nextval('hr_public.departments_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employees ALTER COLUMN id SET DEFAULT nextval('hr_public.employees_id_seq'::regclass);


--
-- Name: performance_reviews id; Type: DEFAULT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.performance_reviews ALTER COLUMN id SET DEFAULT nextval('hr_public.performance_reviews_id_seq'::regclass);


--
-- Name: time_off_requests id; Type: DEFAULT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_requests ALTER COLUMN id SET DEFAULT nextval('hr_public.time_off_requests_id_seq'::regclass);


--
-- Name: user_role_assignments id; Type: DEFAULT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments ALTER COLUMN id SET DEFAULT nextval('hr_public.user_role_assignments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users ALTER COLUMN id SET DEFAULT nextval('hr_public.users_id_seq'::regclass);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: hr_hidden; Owner: -
--

ALTER TABLE ONLY hr_hidden.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_level_key; Type: CONSTRAINT; Schema: hr_hidden; Owner: -
--

ALTER TABLE ONLY hr_hidden.role_permissions
    ADD CONSTRAINT role_permissions_role_level_key UNIQUE (role_level);


--
-- Name: time_off_balances time_off_balances_employee_id_year_key; Type: CONSTRAINT; Schema: hr_hidden; Owner: -
--

ALTER TABLE ONLY hr_hidden.time_off_balances
    ADD CONSTRAINT time_off_balances_employee_id_year_key UNIQUE (employee_id, year);


--
-- Name: time_off_balances time_off_balances_pkey; Type: CONSTRAINT; Schema: hr_hidden; Owner: -
--

ALTER TABLE ONLY hr_hidden.time_off_balances
    ADD CONSTRAINT time_off_balances_pkey PRIMARY KEY (id);


--
-- Name: auth_log auth_log_pkey; Type: CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.auth_log
    ADD CONSTRAINT auth_log_pkey PRIMARY KEY (id);


--
-- Name: employee_account employee_account_email_key; Type: CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_account
    ADD CONSTRAINT employee_account_email_key UNIQUE (email);


--
-- Name: employee_account employee_account_pkey; Type: CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_account
    ADD CONSTRAINT employee_account_pkey PRIMARY KEY (id);


--
-- Name: employee_compensation employee_compensation_pkey; Type: CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_compensation
    ADD CONSTRAINT employee_compensation_pkey PRIMARY KEY (id);


--
-- Name: access_log access_log_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.access_log
    ADD CONSTRAINT access_log_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: compensation_bands compensation_bands_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.compensation_bands
    ADD CONSTRAINT compensation_bands_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: employee_goals employee_goals_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_goals
    ADD CONSTRAINT employee_goals_pkey PRIMARY KEY (id);


--
-- Name: employee_time_off_policies employee_time_off_policies_employee_id_policy_id_effective__key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_time_off_policies
    ADD CONSTRAINT employee_time_off_policies_employee_id_policy_id_effective__key UNIQUE (employee_id, policy_id, effective_date);


--
-- Name: employee_time_off_policies employee_time_off_policies_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_time_off_policies
    ADD CONSTRAINT employee_time_off_policies_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: performance_reviews performance_reviews_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.performance_reviews
    ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: review_templates review_templates_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_templates
    ADD CONSTRAINT review_templates_pkey PRIMARY KEY (id);


--
-- Name: time_off_balances time_off_balances_employee_id_policy_id_balance_year_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_employee_id_policy_id_balance_year_key UNIQUE (employee_id, policy_id, balance_year);


--
-- Name: time_off_balances time_off_balances_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_pkey PRIMARY KEY (id);


--
-- Name: time_off_policies time_off_policies_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_policies
    ADD CONSTRAINT time_off_policies_pkey PRIMARY KEY (id);


--
-- Name: time_off_requests time_off_requests_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_requests
    ADD CONSTRAINT time_off_requests_pkey PRIMARY KEY (id);


--
-- Name: user_role_assignments user_role_assignments_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_session_token_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_sessions
    ADD CONSTRAINT user_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_employee_id_key; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_role_permissions_postgresql_role; Type: INDEX; Schema: hr_hidden; Owner: -
--

CREATE INDEX idx_role_permissions_postgresql_role ON hr_hidden.role_permissions USING btree (postgresql_role);


--
-- Name: idx_role_permissions_role_level; Type: INDEX; Schema: hr_hidden; Owner: -
--

CREATE INDEX idx_role_permissions_role_level ON hr_hidden.role_permissions USING btree (role_level);


--
-- Name: idx_time_off_balances_employee_year; Type: INDEX; Schema: hr_hidden; Owner: -
--

CREATE INDEX idx_time_off_balances_employee_year ON hr_hidden.time_off_balances USING btree (employee_id, year);


--
-- Name: idx_time_off_balances_year; Type: INDEX; Schema: hr_hidden; Owner: -
--

CREATE INDEX idx_time_off_balances_year ON hr_hidden.time_off_balances USING btree (year);


--
-- Name: idx_auth_log_action; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_action ON hr_private.auth_log USING btree (action);


--
-- Name: idx_auth_log_action_result; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_action_result ON hr_private.auth_log USING btree (action, result);


--
-- Name: idx_auth_log_created_at; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_created_at ON hr_private.auth_log USING btree (created_at);


--
-- Name: idx_auth_log_employee_action; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_employee_action ON hr_private.auth_log USING btree (employee_id, action);


--
-- Name: idx_auth_log_employee_created_at; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_employee_created_at ON hr_private.auth_log USING btree (employee_id, created_at DESC);


--
-- Name: idx_auth_log_employee_id; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_employee_id ON hr_private.auth_log USING btree (employee_id);


--
-- Name: idx_auth_log_errors; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_errors ON hr_private.auth_log USING btree (created_at, action) WHERE ((result)::text = 'ERROR'::text);


--
-- Name: idx_auth_log_failed_attempts; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_failed_attempts ON hr_private.auth_log USING btree (created_at, ip_address) WHERE ((result)::text = 'FAILED'::text);


--
-- Name: idx_auth_log_ip_address; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_ip_address ON hr_private.auth_log USING btree (ip_address);


--
-- Name: idx_auth_log_result; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_auth_log_result ON hr_private.auth_log USING btree (result);


--
-- Name: idx_employee_account_email; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_employee_account_email ON hr_private.employee_account USING btree (email);


--
-- Name: idx_employee_account_employee_id; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_employee_account_employee_id ON hr_private.employee_account USING btree (employee_id);


--
-- Name: idx_employee_account_last_login; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_employee_account_last_login ON hr_private.employee_account USING btree (last_login);


--
-- Name: idx_employee_compensation_active; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_employee_compensation_active ON hr_private.employee_compensation USING btree (employee_id, effective_date) WHERE (end_date IS NULL);


--
-- Name: idx_employee_compensation_created_by; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_employee_compensation_created_by ON hr_private.employee_compensation USING btree (created_by);


--
-- Name: idx_employee_compensation_effective_date; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_employee_compensation_effective_date ON hr_private.employee_compensation USING btree (effective_date);


--
-- Name: idx_employee_compensation_employee_id; Type: INDEX; Schema: hr_private; Owner: -
--

CREATE INDEX idx_employee_compensation_employee_id ON hr_private.employee_compensation USING btree (employee_id);


--
-- Name: compensation_bands_created_by_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX compensation_bands_created_by_idx ON hr_public.compensation_bands USING btree (created_by);


--
-- Name: employee_goals_created_by_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX employee_goals_created_by_idx ON hr_public.employee_goals USING btree (created_by);


--
-- Name: idx_access_log_action; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_access_log_action ON hr_public.access_log USING btree (action);


--
-- Name: idx_access_log_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_access_log_employee_id ON hr_public.access_log USING btree (employee_id);


--
-- Name: idx_access_log_ip_address; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_access_log_ip_address ON hr_public.access_log USING btree (ip_address);


--
-- Name: idx_access_log_resource; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_access_log_resource ON hr_public.access_log USING btree (resource_type, resource_id);


--
-- Name: idx_access_log_session_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_access_log_session_id ON hr_public.access_log USING btree (session_id);


--
-- Name: idx_access_log_timestamp; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_access_log_timestamp ON hr_public.access_log USING btree ("timestamp");


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_audit_log_action ON hr_public.audit_log USING btree (action);


--
-- Name: idx_audit_log_data_classification; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_audit_log_data_classification ON hr_public.audit_log USING btree (data_classification);


--
-- Name: idx_audit_log_performed_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_audit_log_performed_at ON hr_public.audit_log USING btree (performed_at);


--
-- Name: idx_audit_log_performed_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_audit_log_performed_by ON hr_public.audit_log USING btree (performed_by);


--
-- Name: idx_audit_log_retention_date; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_audit_log_retention_date ON hr_public.audit_log USING btree (retention_date);


--
-- Name: idx_audit_log_table_record; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_audit_log_table_record ON hr_public.audit_log USING btree (table_name, record_id);


--
-- Name: idx_compensation_bands_department_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_compensation_bands_department_id ON hr_public.compensation_bands USING btree (department_id);


--
-- Name: idx_compensation_bands_effective; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_compensation_bands_effective ON hr_public.compensation_bands USING btree (effective_date, end_date);


--
-- Name: idx_compensation_bands_level; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_compensation_bands_level ON hr_public.compensation_bands USING btree (job_level);


--
-- Name: idx_departments_manager_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_departments_manager_id ON hr_public.departments USING btree (manager_id);


--
-- Name: idx_departments_parent_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_departments_parent_id ON hr_public.departments USING btree (parent_department_id);


--
-- Name: idx_employee_goals_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_goals_employee_id ON hr_public.employee_goals USING btree (employee_id);


--
-- Name: idx_employee_goals_review_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_goals_review_id ON hr_public.employee_goals USING btree (review_id);


--
-- Name: idx_employee_goals_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_goals_status ON hr_public.employee_goals USING btree (status);


--
-- Name: idx_employee_time_off_policies_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_time_off_policies_employee_id ON hr_public.employee_time_off_policies USING btree (employee_id);


--
-- Name: idx_employee_time_off_policies_policy_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employee_time_off_policies_policy_id ON hr_public.employee_time_off_policies USING btree (policy_id);


--
-- Name: idx_employees_department_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_department_id ON hr_public.employees USING btree (department_id);


--
-- Name: idx_employees_dept_role; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_dept_role ON hr_public.employees USING btree (department_id, role_level);


--
-- Name: idx_employees_dept_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_dept_status ON hr_public.employees USING btree (department_id, status);


--
-- Name: idx_employees_email; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_email ON hr_public.employees USING btree (email);


--
-- Name: idx_employees_hire_date; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_hire_date ON hr_public.employees USING btree (hire_date);


--
-- Name: idx_employees_manager_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_manager_id ON hr_public.employees USING btree (manager_id);


--
-- Name: idx_employees_role_level; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_role_level ON hr_public.employees USING btree (role_level);


--
-- Name: idx_employees_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_status ON hr_public.employees USING btree (status);


--
-- Name: idx_employees_status_role; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_employees_status_role ON hr_public.employees USING btree (status, role_level);


--
-- Name: idx_payroll_records_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_payroll_records_employee_id ON hr_public.payroll_records USING btree (employee_id);


--
-- Name: idx_payroll_records_period; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_payroll_records_period ON hr_public.payroll_records USING btree (pay_period_start, pay_period_end);


--
-- Name: idx_payroll_records_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_payroll_records_status ON hr_public.payroll_records USING btree (status);


--
-- Name: idx_performance_reviews_completed_at; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_completed_at ON hr_public.performance_reviews USING btree (completed_at);


--
-- Name: idx_performance_reviews_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_employee_id ON hr_public.performance_reviews USING btree (employee_id);


--
-- Name: idx_performance_reviews_period; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_period ON hr_public.performance_reviews USING btree (review_period);


--
-- Name: idx_performance_reviews_reviewer_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_reviewer_id ON hr_public.performance_reviews USING btree (reviewer_id);


--
-- Name: idx_performance_reviews_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_performance_reviews_status ON hr_public.performance_reviews USING btree (status);


--
-- Name: idx_review_templates_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_review_templates_active ON hr_public.review_templates USING btree (is_active);


--
-- Name: idx_review_templates_default; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_review_templates_default ON hr_public.review_templates USING btree (is_default);


--
-- Name: idx_time_off_balances_employee_policy_year; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_balances_employee_policy_year ON hr_public.time_off_balances USING btree (employee_id, policy_id, balance_year);


--
-- Name: idx_time_off_policies_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_policies_active ON hr_public.time_off_policies USING btree (is_active);


--
-- Name: idx_time_off_policies_type; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_policies_type ON hr_public.time_off_policies USING btree (time_off_type);


--
-- Name: idx_time_off_requests_approved_by; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_requests_approved_by ON hr_public.time_off_requests USING btree (approved_by);


--
-- Name: idx_time_off_requests_dates; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_requests_dates ON hr_public.time_off_requests USING btree (start_date, end_date);


--
-- Name: idx_time_off_requests_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_requests_employee_id ON hr_public.time_off_requests USING btree (employee_id);


--
-- Name: idx_time_off_requests_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_requests_status ON hr_public.time_off_requests USING btree (status);


--
-- Name: idx_time_off_requests_status_start_date; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_requests_status_start_date ON hr_public.time_off_requests USING btree (status, start_date) WHERE (status = 'PENDING'::hr_public.request_status);


--
-- Name: idx_time_off_requests_type_status; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_time_off_requests_type_status ON hr_public.time_off_requests USING btree (request_type, status);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_sessions_active ON hr_public.user_sessions USING btree (is_active, expires_at);


--
-- Name: idx_user_sessions_token; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_sessions_token ON hr_public.user_sessions USING btree (session_token);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON hr_public.user_sessions USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_active ON hr_public.users USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_users_email; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_email ON hr_public.users USING btree (email);


--
-- Name: idx_users_employee_id; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_employee_id ON hr_public.users USING btree (employee_id);


--
-- Name: idx_users_view_active; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_view_active ON hr_public.employees USING btree (status) WHERE (status = 'ACTIVE'::hr_public.employee_status);


--
-- Name: idx_users_view_email; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX idx_users_view_email ON hr_public.employees USING btree (email);


--
-- Name: payroll_records_created_by_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX payroll_records_created_by_idx ON hr_public.payroll_records USING btree (created_by);


--
-- Name: payroll_records_processed_by_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX payroll_records_processed_by_idx ON hr_public.payroll_records USING btree (processed_by);


--
-- Name: review_templates_created_by_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX review_templates_created_by_idx ON hr_public.review_templates USING btree (created_by);


--
-- Name: time_off_balances_policy_id_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX time_off_balances_policy_id_idx ON hr_public.time_off_balances USING btree (policy_id);


--
-- Name: user_role_assignments_assigned_by_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX user_role_assignments_assigned_by_idx ON hr_public.user_role_assignments USING btree (assigned_by);


--
-- Name: user_role_assignments_user_id_idx; Type: INDEX; Schema: hr_public; Owner: -
--

CREATE INDEX user_role_assignments_user_id_idx ON hr_public.user_role_assignments USING btree (user_id);


--
-- Name: employee_account tr_employee_account_updated_at; Type: TRIGGER; Schema: hr_private; Owner: -
--

CREATE TRIGGER tr_employee_account_updated_at BEFORE UPDATE ON hr_private.employee_account FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: employee_compensation tr_employee_compensation_updated_at; Type: TRIGGER; Schema: hr_private; Owner: -
--

CREATE TRIGGER tr_employee_compensation_updated_at BEFORE UPDATE ON hr_private.employee_compensation FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: employees sync_user_from_employee_trigger; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER sync_user_from_employee_trigger AFTER INSERT OR DELETE OR UPDATE ON hr_public.employees FOR EACH ROW EXECUTE FUNCTION hr_hidden.sync_user_from_employee();


--
-- Name: departments tr_departments_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER tr_departments_updated_at BEFORE UPDATE ON hr_public.departments FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: employee_goals tr_employee_goals_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER tr_employee_goals_updated_at BEFORE UPDATE ON hr_public.employee_goals FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: employees tr_employees_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER tr_employees_updated_at BEFORE UPDATE ON hr_public.employees FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: performance_reviews tr_performance_reviews_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER tr_performance_reviews_updated_at BEFORE UPDATE ON hr_public.performance_reviews FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: review_templates tr_review_templates_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER tr_review_templates_updated_at BEFORE UPDATE ON hr_public.review_templates FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: time_off_policies tr_time_off_policies_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER tr_time_off_policies_updated_at BEFORE UPDATE ON hr_public.time_off_policies FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: time_off_requests tr_time_off_requests_updated_at; Type: TRIGGER; Schema: hr_public; Owner: -
--

CREATE TRIGGER tr_time_off_requests_updated_at BEFORE UPDATE ON hr_public.time_off_requests FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();


--
-- Name: time_off_balances time_off_balances_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_hidden; Owner: -
--

ALTER TABLE ONLY hr_hidden.time_off_balances
    ADD CONSTRAINT time_off_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: auth_log auth_log_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.auth_log
    ADD CONSTRAINT auth_log_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: employee_account employee_account_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_account
    ADD CONSTRAINT employee_account_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: employee_compensation employee_compensation_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_compensation
    ADD CONSTRAINT employee_compensation_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.employees(id);


--
-- Name: employee_compensation employee_compensation_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_private; Owner: -
--

ALTER TABLE ONLY hr_private.employee_compensation
    ADD CONSTRAINT employee_compensation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: access_log access_log_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.access_log
    ADD CONSTRAINT access_log_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: audit_log audit_log_performed_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.audit_log
    ADD CONSTRAINT audit_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES hr_public.employees(id);


--
-- Name: compensation_bands compensation_bands_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.compensation_bands
    ADD CONSTRAINT compensation_bands_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.employees(id);


--
-- Name: compensation_bands compensation_bands_department_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.compensation_bands
    ADD CONSTRAINT compensation_bands_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id);


--
-- Name: departments departments_parent_department_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments
    ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES hr_public.departments(id);


--
-- Name: employee_goals employee_goals_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_goals
    ADD CONSTRAINT employee_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.employees(id);


--
-- Name: employee_goals employee_goals_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_goals
    ADD CONSTRAINT employee_goals_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_goals employee_goals_review_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_goals
    ADD CONSTRAINT employee_goals_review_id_fkey FOREIGN KEY (review_id) REFERENCES hr_public.performance_reviews(id);


--
-- Name: employee_time_off_policies employee_time_off_policies_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_time_off_policies
    ADD CONSTRAINT employee_time_off_policies_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_time_off_policies employee_time_off_policies_policy_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employee_time_off_policies
    ADD CONSTRAINT employee_time_off_policies_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES hr_public.time_off_policies(id) ON DELETE CASCADE;


--
-- Name: employees employees_department_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employees
    ADD CONSTRAINT employees_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id);


--
-- Name: employees employees_manager_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.employees
    ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES hr_public.employees(id);


--
-- Name: departments fk_departments_manager; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.departments
    ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES hr_public.employees(id);


--
-- Name: payroll_records payroll_records_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.employees(id);


--
-- Name: payroll_records payroll_records_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: payroll_records payroll_records_processed_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.payroll_records
    ADD CONSTRAINT payroll_records_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES hr_public.employees(id);


--
-- Name: performance_reviews performance_reviews_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.performance_reviews
    ADD CONSTRAINT performance_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: performance_reviews performance_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.performance_reviews
    ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES hr_public.employees(id);


--
-- Name: review_templates review_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.review_templates
    ADD CONSTRAINT review_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.employees(id);


--
-- Name: time_off_balances time_off_balances_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id) ON DELETE CASCADE;


--
-- Name: time_off_balances time_off_balances_policy_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_balances
    ADD CONSTRAINT time_off_balances_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES hr_public.time_off_policies(id);


--
-- Name: time_off_requests time_off_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_requests
    ADD CONSTRAINT time_off_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES hr_public.employees(id);


--
-- Name: time_off_requests time_off_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.time_off_requests
    ADD CONSTRAINT time_off_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id);


--
-- Name: user_role_assignments user_role_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES hr_public.employees(id);


--
-- Name: user_role_assignments user_role_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.employees(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.employees(id) ON DELETE CASCADE;


--
-- Name: users users_employee_id_fkey; Type: FK CONSTRAINT; Schema: hr_public; Owner: -
--

ALTER TABLE ONLY hr_public.users
    ADD CONSTRAINT users_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.employees(id) ON DELETE CASCADE;


--
-- Name: auth_log; Type: ROW SECURITY; Schema: hr_private; Owner: -
--

ALTER TABLE hr_private.auth_log ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_log auth_log_admin_full_access; Type: POLICY; Schema: hr_private; Owner: -
--

CREATE POLICY auth_log_admin_full_access ON hr_private.auth_log TO hr_admin, hr_super_admin USING (true);


--
-- Name: auth_log auth_log_employee_own; Type: POLICY; Schema: hr_private; Owner: -
--

CREATE POLICY auth_log_employee_own ON hr_private.auth_log FOR SELECT TO hr_employee, hr_manager USING ((employee_id = (current_setting('jwt.claims.employee_id'::text, true))::integer));


--
-- Name: auth_log auth_log_system_insert; Type: POLICY; Schema: hr_private; Owner: -
--

CREATE POLICY auth_log_system_insert ON hr_private.auth_log FOR INSERT TO postgraphile_app WITH CHECK (true);


--
-- Name: users; Type: ROW SECURITY; Schema: hr_public; Owner: -
--

ALTER TABLE hr_public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_delete_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY users_delete_policy ON hr_public.users FOR DELETE USING (((current_setting('jwt.claims.role_level'::text, true))::integer >= 100));


--
-- Name: users users_insert_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY users_insert_policy ON hr_public.users FOR INSERT WITH CHECK (((current_setting('jwt.claims.role_level'::text, true))::integer >= 100));


--
-- Name: users users_select_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY users_select_policy ON hr_public.users FOR SELECT USING ((((employee_id)::text = current_setting('jwt.claims.employee_id'::text, true)) OR ((current_setting('jwt.claims.role_level'::text, true))::integer >= 80)));


--
-- Name: users users_update_policy; Type: POLICY; Schema: hr_public; Owner: -
--

CREATE POLICY users_update_policy ON hr_public.users FOR UPDATE USING ((((employee_id)::text = current_setting('jwt.claims.employee_id'::text, true)) OR ((current_setting('jwt.claims.role_level'::text, true))::integer >= 80)));


--
-- PostgreSQL database dump complete
--

\unrestrict hxOYWwcytKvgKZ9PreDSILRN2g0T1lAcF0EWmp09NHl6UIR4SUhMrzztoJM0pnI

