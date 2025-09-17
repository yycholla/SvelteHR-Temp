-- Migration: Add PostGraphile Recommended Indexes
-- Created: 2025-09-16
-- Description: Add missing indexes for foreign key constraints as recommended by PostGraphile

-- Indexes for data_lineage table
CREATE INDEX IF NOT EXISTS idx_data_lineage_audit_reference ON hr_public.data_lineage(audit_reference);
CREATE INDEX IF NOT EXISTS idx_data_lineage_performed_by_session_id ON hr_public.data_lineage(performed_by_session_id);

-- Indexes for user_sessions table
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON hr_public.user_sessions(user_id);

-- Indexes for security_events table
CREATE INDEX IF NOT EXISTS idx_security_events_resolved_by ON hr_public.security_events(resolved_by);
CREATE INDEX IF NOT EXISTS idx_security_events_session_id ON hr_public.security_events(session_id);

-- Indexes for password_policies table
CREATE INDEX IF NOT EXISTS idx_password_policies_created_by ON hr_public.password_policies(created_by);

-- Indexes for data_retention_policies table
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_created_by ON hr_public.data_retention_policies(created_by);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_approved_by ON hr_public.data_retention_policies(approved_by);

-- Indexes for privacy_requests table
CREATE INDEX IF NOT EXISTS idx_privacy_requests_verified_by ON hr_public.privacy_requests(verified_by);

-- Indexes for processing_activities table
CREATE INDEX IF NOT EXISTS idx_processing_activities_reviewed_by ON hr_public.processing_activities(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_processing_activities_approved_by ON hr_public.processing_activities(approved_by);

-- Indexes for erasure_requests table
CREATE INDEX IF NOT EXISTS idx_erasure_requests_assigned_to ON hr_public.erasure_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_legal_reviewer_id ON hr_public.erasure_requests(legal_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_executed_by ON hr_public.erasure_requests(executed_by);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_privacy_request_id ON hr_public.erasure_requests(privacy_request_id);

-- Indexes for data_breach_incidents table
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_discovered_by ON hr_public.data_breach_incidents(discovered_by);
CREATE INDEX IF NOT EXISTS idx_data_breach_incidents_closed_by ON hr_public.data_breach_incidents(closed_by);

-- Indexes for privacy_impact_assessments table
CREATE INDEX IF NOT EXISTS idx_privacy_impact_assessments_conducted_by ON hr_public.privacy_impact_assessments(conducted_by);
CREATE INDEX IF NOT EXISTS idx_privacy_impact_assessments_reviewed_by ON hr_public.privacy_impact_assessments(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_privacy_impact_assessments_approved_by ON hr_public.privacy_impact_assessments(approved_by);

-- Indexes for user_password_history table
CREATE INDEX IF NOT EXISTS idx_user_password_history_created_by_session ON hr_public.user_password_history(created_by_session);
CREATE INDEX IF NOT EXISTS idx_user_password_history_password_policy_id ON hr_public.user_password_history(password_policy_id);

-- Indexes for consent_records table
CREATE INDEX IF NOT EXISTS idx_consent_records_previous_consent_id ON hr_public.consent_records(previous_consent_id);

-- Indexes for data_protection_metadata table
CREATE INDEX IF NOT EXISTS idx_data_protection_metadata_consent_record_id ON hr_public.data_protection_metadata(consent_record_id);
CREATE INDEX IF NOT EXISTS idx_data_protection_metadata_retention_policy_id ON hr_public.data_protection_metadata(retention_policy_id);

-- Add comments for documentation
COMMENT ON INDEX hr_public.idx_data_lineage_audit_reference IS 'PostGraphile optimization: Enable read permissions for audit_reference foreign key';
COMMENT ON INDEX hr_public.idx_user_sessions_user_id IS 'PostGraphile optimization: Enable read permissions for user_id foreign key';
COMMENT ON INDEX hr_public.idx_security_events_resolved_by IS 'PostGraphile optimization: Enable read permissions for resolved_by foreign key';
COMMENT ON INDEX hr_public.idx_password_policies_created_by IS 'PostGraphile optimization: Enable read permissions for created_by foreign key';