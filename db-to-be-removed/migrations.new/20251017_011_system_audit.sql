-- Migration: System Audit & Settings
-- Created: 2025-10-17
-- Description: activity_logs, rollback_requests, bulk_rollback_batches, bulk_rollback_items,
--              payroll_records, compensation_bands, hr_reports, encryption_keys,
--              linked_resources, notifications, system_settings

BEGIN;

-- ============================================================================
-- ENCRYPTION_KEYS TABLE (must come first - referenced by encrypted_file_storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) NOT NULL UNIQUE,
    key_hash VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,

    CONSTRAINT encryption_keys_name_not_empty CHECK (LENGTH(TRIM(key_name)) > 0),
    CONSTRAINT encryption_keys_hash_valid CHECK (LENGTH(key_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON hr_public.encryption_keys(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE hr_public.encryption_keys IS 'Encryption key metadata for document encryption (keys stored in secure vault, not database)';
COMMENT ON COLUMN hr_public.encryption_keys.key_hash IS 'SHA-256 hash of encryption key for verification (NOT the key itself)';

-- ============================================================================
-- ACTIVITY_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    employee_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    ip_address VARCHAR(100),
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    response_status INTEGER,
    error_message TEXT,
    duration_ms INTEGER,
    metadata JSONB,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT activity_logs_action_not_empty CHECK (LENGTH(TRIM(action)) > 0),
    CONSTRAINT activity_logs_resource_not_empty CHECK (LENGTH(TRIM(resource_type)) > 0),
    CONSTRAINT activity_logs_duration_non_negative CHECK (duration_ms IS NULL OR duration_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON hr_public.activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON hr_public.activity_logs(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON hr_public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON hr_public.activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON hr_public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_ip ON hr_public.activity_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON hr_public.activity_logs(response_status);

COMMENT ON TABLE hr_public.activity_logs IS 'Comprehensive system activity audit log with request/response tracking';
COMMENT ON COLUMN hr_public.activity_logs.duration_ms IS 'Request processing duration in milliseconds';

-- ============================================================================
-- ROLLBACK_REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.rollback_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    status hr_public.rollback_status NOT NULL DEFAULT 'pending',
    reason TEXT NOT NULL,
    snapshot_before JSONB,
    snapshot_after JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT rollback_requests_reason_not_empty CHECK (LENGTH(TRIM(reason)) > 0),
    CONSTRAINT rollback_requests_resource_not_empty CHECK (LENGTH(TRIM(resource_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_rollback_requests_resource ON hr_public.rollback_requests(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_rollback_requests_requested_by ON hr_public.rollback_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_rollback_requests_status ON hr_public.rollback_requests(status, created_at DESC);

COMMENT ON TABLE hr_public.rollback_requests IS 'Data rollback requests with approval workflow and snapshots';
COMMENT ON COLUMN hr_public.rollback_requests.snapshot_before IS 'JSONB snapshot of data before rollback';
COMMENT ON COLUMN hr_public.rollback_requests.snapshot_after IS 'JSONB snapshot of data after rollback';

-- ============================================================================
-- BULK_ROLLBACK_BATCHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.bulk_rollback_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name VARCHAR(255) NOT NULL,
    description TEXT,
    requested_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    status hr_public.rollback_status NOT NULL DEFAULT 'pending',
    total_items INTEGER NOT NULL DEFAULT 0,
    successful_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bulk_rollback_batches_name_not_empty CHECK (LENGTH(TRIM(batch_name)) > 0),
    CONSTRAINT bulk_rollback_batches_counts_non_negative CHECK (
        total_items >= 0 AND successful_items >= 0 AND failed_items >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_bulk_rollback_batches_requested_by ON hr_public.bulk_rollback_batches(requested_by);
CREATE INDEX IF NOT EXISTS idx_bulk_rollback_batches_status ON hr_public.bulk_rollback_batches(status, created_at DESC);

COMMENT ON TABLE hr_public.bulk_rollback_batches IS 'Bulk rollback operations grouping multiple rollback items';

-- ============================================================================
-- BULK_ROLLBACK_ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.bulk_rollback_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES hr_public.bulk_rollback_batches(id) ON DELETE CASCADE,
    rollback_request_id UUID NOT NULL REFERENCES hr_public.rollback_requests(id) ON DELETE CASCADE,
    status hr_public.rollback_item_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bulk_rollback_items_batch_request_unique UNIQUE (batch_id, rollback_request_id)
);

CREATE INDEX IF NOT EXISTS idx_bulk_rollback_items_batch ON hr_public.bulk_rollback_items(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_rollback_items_request ON hr_public.bulk_rollback_items(rollback_request_id);

COMMENT ON TABLE hr_public.bulk_rollback_items IS 'Individual rollback items within a bulk rollback batch';

-- ============================================================================
-- COMPENSATION_BANDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.compensation_bands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    min_salary DECIMAL(12,2) NOT NULL,
    max_salary DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT compensation_bands_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT compensation_bands_salary_range CHECK (max_salary > min_salary),
    CONSTRAINT compensation_bands_min_positive CHECK (min_salary > 0),
    CONSTRAINT compensation_bands_currency_valid CHECK (LENGTH(currency) = 3)
);

CREATE INDEX IF NOT EXISTS idx_compensation_bands_title ON hr_public.compensation_bands(title);
CREATE INDEX IF NOT EXISTS idx_compensation_bands_salary_range ON hr_public.compensation_bands(min_salary, max_salary);

COMMENT ON TABLE hr_public.compensation_bands IS 'Salary bands for job levels and positions';

-- ============================================================================
-- PAYROLL_RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    gross_pay DECIMAL(12,2) NOT NULL,
    net_pay DECIMAL(12,2) NOT NULL,
    deductions DECIMAL(12,2) DEFAULT 0.0,
    bonuses DECIMAL(12,2) DEFAULT 0.0,
    processed_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT payroll_records_pay_period_valid CHECK (pay_period_end >= pay_period_start),
    CONSTRAINT payroll_records_gross_positive CHECK (gross_pay > 0),
    CONSTRAINT payroll_records_net_positive CHECK (net_pay > 0),
    CONSTRAINT payroll_records_deductions_non_negative CHECK (deductions >= 0),
    CONSTRAINT payroll_records_bonuses_non_negative CHECK (bonuses >= 0)
);

CREATE INDEX IF NOT EXISTS idx_payroll_records_user ON hr_public.payroll_records(user_id, pay_period_end DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON hr_public.payroll_records(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_records_processed_by ON hr_public.payroll_records(processed_by);

COMMENT ON TABLE hr_public.payroll_records IS 'Payroll records with gross pay, net pay, deductions, and bonuses';

-- ============================================================================
-- HR_REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.hr_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    parameters JSONB,
    file_path VARCHAR(1000),
    created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT hr_reports_name_not_empty CHECK (LENGTH(TRIM(report_name)) > 0),
    CONSTRAINT hr_reports_type_not_empty CHECK (LENGTH(TRIM(report_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_hr_reports_created_by ON hr_public.hr_reports(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_reports_type ON hr_public.hr_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_hr_reports_created_at ON hr_public.hr_reports(created_at DESC);

COMMENT ON TABLE hr_public.hr_reports IS 'Generated HR reports with parameters and file storage';

-- ============================================================================
-- LINKED_RESOURCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.linked_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type hr_public.resource_type NOT NULL,
    resource_id UUID NOT NULL,
    linked_resource_type hr_public.resource_type NOT NULL,
    linked_resource_id UUID NOT NULL,
    relationship_type VARCHAR(100),
    created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    description TEXT,
    metadata JSONB,
    is_bidirectional BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT linked_resources_no_self_reference CHECK (
        resource_type != linked_resource_type OR resource_id != linked_resource_id
    )
);

CREATE INDEX IF NOT EXISTS idx_linked_resources_resource ON hr_public.linked_resources(resource_type, resource_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_linked_resources_linked ON hr_public.linked_resources(linked_resource_type, linked_resource_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_linked_resources_relationship ON hr_public.linked_resources(relationship_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_linked_resources_created_by ON hr_public.linked_resources(created_by) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.linked_resources IS 'Generic many-to-many resource linking (tasks, events, documents, etc.)';
COMMENT ON COLUMN hr_public.linked_resources.is_bidirectional IS 'If true, link is visible from both resource perspectives';

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    type hr_public.notification_type NOT NULL,
    category hr_public.notification_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT notifications_message_valid CHECK (LENGTH(TRIM(message)) BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON hr_public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON hr_public.notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON hr_public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON hr_public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_resource ON hr_public.notifications(resource_type, resource_id);

COMMENT ON TABLE hr_public.notifications IS 'User notifications for events, tasks, leave requests, documents, and system alerts';
COMMENT ON COLUMN hr_public.notifications.type IS 'Notification type (event_invite, task_assigned, leave_approved, etc.)';
COMMENT ON COLUMN hr_public.notifications.category IS 'Category grouping (event, task, leave, document, review, system)';

-- ============================================================================
-- SYSTEM_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT system_settings_key_not_empty CHECK (LENGTH(TRIM(key)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON hr_public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_public ON hr_public.system_settings(is_public) WHERE is_public = TRUE;

COMMENT ON TABLE hr_public.system_settings IS 'System-wide configuration settings stored as key-value pairs';
COMMENT ON COLUMN hr_public.system_settings.is_public IS 'Whether setting can be accessed by non-admin users';

COMMIT;
