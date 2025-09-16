-- Migration: Advanced Security Framework
-- Created: 2025-09-15
-- Description: Enterprise-grade security features including MFA, session management, and security monitoring

-- Create ENUM types for security framework
CREATE TYPE hr_public.mfa_method AS ENUM (
    'TOTP',
    'SMS', 
    'EMAIL',
    'BACKUP_CODE',
    'HARDWARE_TOKEN'
);

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

CREATE TYPE hr_public.session_status AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'TERMINATED',
    'SUSPENDED'
);

CREATE TYPE hr_public.device_trust_level AS ENUM (
    'TRUSTED',
    'RECOGNIZED',
    'UNKNOWN',
    'BLOCKED'
);

-- Multi-Factor Authentication setup
CREATE TABLE hr_public.user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    
    -- MFA configuration
    is_enabled BOOLEAN DEFAULT false,
    primary_method hr_public.mfa_method,
    backup_methods hr_public.mfa_method[] DEFAULT ARRAY[]::hr_public.mfa_method[],
    
    -- TOTP settings
    totp_secret VARCHAR(255), -- Encrypted
    totp_verified_at TIMESTAMPTZ,
    
    -- SMS settings  
    sms_phone_number VARCHAR(20), -- Encrypted
    sms_verified_at TIMESTAMPTZ,
    
    -- Email settings
    backup_email VARCHAR(255), -- Encrypted
    email_verified_at TIMESTAMPTZ,
    
    -- Backup codes
    backup_codes_encrypted TEXT[], -- Array of encrypted backup codes
    backup_codes_used INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    backup_codes_generated_at TIMESTAMPTZ,
    
    -- Recovery settings
    recovery_questions JSONB, -- Encrypted Q&A pairs
    recovery_updated_at TIMESTAMPTZ,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_mfa_unique UNIQUE(user_id),
    CONSTRAINT totp_secret_with_method CHECK (
        (primary_method = 'TOTP' AND totp_secret IS NOT NULL) OR 
        (primary_method != 'TOTP' OR primary_method IS NULL)
    ),
    CONSTRAINT sms_phone_with_method CHECK (
        (primary_method = 'SMS' AND sms_phone_number IS NOT NULL) OR 
        (primary_method != 'SMS' OR primary_method IS NULL)
    )
);

-- Enhanced session management
CREATE TABLE hr_public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and authentication
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL, -- JWT token hash
    refresh_token VARCHAR(255) UNIQUE, -- Refresh token hash
    
    -- Session metadata
    session_name VARCHAR(100), -- User-friendly name like "Chrome on MacBook"
    status hr_public.session_status DEFAULT 'ACTIVE',
    
    -- Device information
    device_id VARCHAR(255), -- Unique device fingerprint
    device_name VARCHAR(255), -- "MacBook Pro" or "iPhone 12"
    device_type VARCHAR(50), -- desktop, mobile, tablet
    device_trust_level hr_public.device_trust_level DEFAULT 'UNKNOWN',
    
    -- Location and network
    ip_address INET,
    user_agent TEXT,
    location_country VARCHAR(2), -- ISO country code
    location_region VARCHAR(100),
    location_city VARCHAR(100),
    
    -- Session lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    terminated_at TIMESTAMPTZ,
    termination_reason VARCHAR(100), -- 'manual', 'expired', 'security', 'admin'
    
    -- Security flags
    is_mfa_verified BOOLEAN DEFAULT false,
    mfa_verified_at TIMESTAMPTZ,
    requires_password_change BOOLEAN DEFAULT false,
    
    -- System fields
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT session_lifecycle CHECK (
        (status = 'TERMINATED' AND terminated_at IS NOT NULL) OR
        (status != 'TERMINATED')
    ),
    CONSTRAINT mfa_verification_logic CHECK (
        (is_mfa_verified = true AND mfa_verified_at IS NOT NULL) OR
        (is_mfa_verified = false)
    )
);

-- Security events and audit log
CREATE TABLE hr_public.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event identification
    event_type hr_public.security_event_type NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- authentication, authorization, data_access, etc.
    
    -- Context
    user_id UUID REFERENCES hr_public.users(id),
    session_id UUID REFERENCES hr_public.user_sessions(id),
    
    -- Event details
    event_message TEXT NOT NULL,
    event_data JSONB, -- Structured event data
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100), -- For tracing requests
    
    -- Risk assessment
    risk_score INTEGER DEFAULT 0, -- 0-100 risk score
    is_suspicious BOOLEAN DEFAULT false,
    requires_investigation BOOLEAN DEFAULT false,
    
    -- Response actions
    action_taken VARCHAR(100), -- 'none', 'blocked', 'challenged', 'suspended'
    auto_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES hr_public.users(id),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT risk_score_valid CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT resolution_logic CHECK (
        (resolved_at IS NOT NULL AND resolved_by IS NOT NULL) OR
        (resolved_at IS NULL AND resolved_by IS NULL) OR
        (auto_resolved = true)
    )
);

-- Failed login attempts tracking
CREATE TABLE hr_public.failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Attempt details
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    
    -- Failure details
    failure_reason VARCHAR(100) NOT NULL, -- 'invalid_password', 'invalid_email', 'mfa_failed', 'account_locked'
    attempt_count INTEGER DEFAULT 1,
    
    -- Blocking information
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMPTZ,
    block_reason VARCHAR(100),
    
    -- Timing
    first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT attempt_count_valid CHECK (attempt_count > 0),
    CONSTRAINT blocking_logic CHECK (
        (is_blocked = true AND blocked_until IS NOT NULL) OR
        (is_blocked = false)
    )
);

-- Device registration and trust management
CREATE TABLE hr_public.user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and device identification
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL, -- Unique device fingerprint
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50), -- desktop, mobile, tablet
    
    -- Trust and verification
    trust_level hr_public.device_trust_level DEFAULT 'UNKNOWN',
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verification_method VARCHAR(50), -- 'email_link', 'sms_code', 'admin_approval'
    
    -- Device metadata
    device_fingerprint JSONB, -- Browser/device characteristics
    last_seen_ip INET,
    last_seen_location JSONB, -- Country, region, city
    
    -- Activity tracking
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    session_count INTEGER DEFAULT 0,
    
    -- Management
    is_blocked BOOLEAN DEFAULT false,
    blocked_at TIMESTAMPTZ,
    blocked_reason TEXT,
    notes TEXT, -- Admin notes about this device
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_device_unique UNIQUE(user_id, device_id),
    CONSTRAINT verification_logic CHECK (
        (is_verified = true AND verified_at IS NOT NULL) OR
        (is_verified = false)
    ),
    CONSTRAINT blocking_logic CHECK (
        (is_blocked = true AND blocked_at IS NOT NULL) OR
        (is_blocked = false)
    )
);

-- Password security policies
CREATE TABLE hr_public.password_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Policy identification
    policy_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Password requirements
    min_length INTEGER DEFAULT 8,
    max_length INTEGER DEFAULT 128,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_special_chars BOOLEAN DEFAULT true,
    special_chars_allowed VARCHAR(50) DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',
    
    -- History and rotation
    password_history_count INTEGER DEFAULT 5, -- Remember last N passwords
    max_age_days INTEGER DEFAULT 90, -- Force change after N days
    min_age_hours INTEGER DEFAULT 24, -- Prevent rapid changes
    
    -- Account lockout
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    progressive_lockout BOOLEAN DEFAULT true, -- Increase lockout time with repeated failures
    
    -- Complexity scoring
    min_complexity_score INTEGER DEFAULT 60, -- 0-100 complexity score required
    dictionary_check BOOLEAN DEFAULT true,
    personal_info_check BOOLEAN DEFAULT true, -- Block passwords containing name, email, etc.
    
    -- System fields
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT password_length_valid CHECK (min_length > 0 AND max_length >= min_length),
    CONSTRAINT complexity_score_valid CHECK (min_complexity_score >= 0 AND min_complexity_score <= 100),
    CONSTRAINT failed_attempts_valid CHECK (max_failed_attempts > 0),
    CONSTRAINT lockout_duration_valid CHECK (lockout_duration_minutes > 0)
);

-- User password history
CREATE TABLE hr_public.user_password_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    
    -- Password information
    password_hash VARCHAR(255) NOT NULL, -- Historical password hash
    algorithm VARCHAR(50) DEFAULT 'bcrypt', -- Hashing algorithm used
    salt VARCHAR(255), -- Salt if applicable
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_session UUID REFERENCES hr_public.user_sessions(id),
    password_policy_id UUID REFERENCES hr_public.password_policies(id),
    
    -- Security flags
    was_compromised BOOLEAN DEFAULT false, -- Mark if password found in breach
    compromise_detected_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT compromise_logic CHECK (
        (was_compromised = true AND compromise_detected_at IS NOT NULL) OR
        (was_compromised = false)
    )
);

-- Create indexes for performance
CREATE INDEX idx_user_mfa_settings_user_id ON hr_public.user_mfa_settings(user_id);
CREATE INDEX idx_user_mfa_settings_enabled ON hr_public.user_mfa_settings(user_id) WHERE is_enabled = true;

CREATE INDEX idx_user_sessions_user_active ON hr_public.user_sessions(user_id, status) WHERE status = 'ACTIVE';
CREATE INDEX idx_user_sessions_token ON hr_public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_device ON hr_public.user_sessions(device_id, user_id);
CREATE INDEX idx_user_sessions_expires ON hr_public.user_sessions(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_user_sessions_last_activity ON hr_public.user_sessions(last_activity_at DESC);

CREATE INDEX idx_security_events_user_type ON hr_public.security_events(user_id, event_type, created_at DESC);
CREATE INDEX idx_security_events_suspicious ON hr_public.security_events(created_at DESC) WHERE is_suspicious = true;
CREATE INDEX idx_security_events_investigation ON hr_public.security_events(created_at DESC) WHERE requires_investigation = true;
CREATE INDEX idx_security_events_risk ON hr_public.security_events(risk_score DESC, created_at DESC);

CREATE INDEX idx_failed_login_attempts_email ON hr_public.failed_login_attempts(email, created_at DESC);
CREATE INDEX idx_failed_login_attempts_ip ON hr_public.failed_login_attempts(ip_address, created_at DESC);
CREATE INDEX idx_failed_login_attempts_blocked ON hr_public.failed_login_attempts(blocked_until) WHERE is_blocked = true;

CREATE INDEX idx_user_devices_user_trust ON hr_public.user_devices(user_id, trust_level);
CREATE INDEX idx_user_devices_device_id ON hr_public.user_devices(device_id);
CREATE INDEX idx_user_devices_last_seen ON hr_public.user_devices(last_seen_at DESC);

CREATE INDEX idx_password_policies_active ON hr_public.password_policies(policy_name) WHERE is_active = true;

CREATE INDEX idx_user_password_history_user ON hr_public.user_password_history(user_id, created_at DESC);
CREATE INDEX idx_user_password_history_compromised ON hr_public.user_password_history(user_id) WHERE was_compromised = true;

-- Insert default password policy
INSERT INTO hr_public.password_policies (
    policy_name, description, min_length, require_uppercase, require_lowercase, 
    require_numbers, require_special_chars, password_history_count, max_age_days,
    max_failed_attempts, lockout_duration_minutes, min_complexity_score,
    created_by
) VALUES (
    'default_enterprise',
    'Default enterprise security policy for HR system',
    12, true, true, true, true, 8, 90, 5, 30, 70,
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
);

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.user_mfa_settings IS '@name UserMfaSetting
Multi-factor authentication configuration for users';

COMMENT ON TABLE hr_public.user_sessions IS '@name UserSession  
Active user sessions with device and security tracking';

COMMENT ON TABLE hr_public.security_events IS '@name SecurityEvent
Security events and audit log for monitoring and compliance';

COMMENT ON TABLE hr_public.failed_login_attempts IS '@name FailedLoginAttempt
Failed login attempt tracking for security monitoring';

COMMENT ON TABLE hr_public.user_devices IS '@name UserDevice
Registered user devices with trust level management';

COMMENT ON TABLE hr_public.password_policies IS '@name PasswordPolicy
Password security policies and requirements';

COMMENT ON TABLE hr_public.user_password_history IS '@name UserPasswordHistory
Historical password hashes for preventing reuse';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.user_mfa_settings TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.user_mfa_settings TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.user_sessions TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.user_sessions TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT ON hr_public.security_events TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT UPDATE, DELETE ON hr_public.security_events TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.failed_login_attempts TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.failed_login_attempts TO hr_manager;

GRANT SELECT, INSERT, UPDATE ON hr_public.user_devices TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.user_devices TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.password_policies TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.password_policies TO hr_super_admin;

GRANT SELECT, INSERT ON hr_public.user_password_history TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT UPDATE, DELETE ON hr_public.user_password_history TO hr_super_admin;