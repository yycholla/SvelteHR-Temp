-- Migration: Create encryption_keys table for client-side encryption key management
-- Feature: 024-we-need-to (Secure Employee Document Management)
-- Date: 2025-10-07
-- Purpose: Store server-encrypted encryption keys for client-side file encryption

-- Set search path
SET search_path TO hr_public, public;

-- Ensure pgcrypto extension is available for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption_keys table
CREATE TABLE IF NOT EXISTS hr_public.encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_identifier VARCHAR(255) NOT NULL UNIQUE,
    encrypted_key_data BYTEA NOT NULL,
    key_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-GCM-256' CHECK (key_algorithm IN ('AES-GCM-256', 'AES-CBC-256')),
    created_for_user UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Add table comment
COMMENT ON TABLE hr_public.encryption_keys IS 'Server-encrypted encryption keys for client-side document encryption (Feature 024)';

-- Add column comments
COMMENT ON COLUMN hr_public.encryption_keys.key_identifier IS 'Client-generated unique identifier for the key';
COMMENT ON COLUMN hr_public.encryption_keys.encrypted_key_data IS 'Encryption key encrypted with pg_crypto before storage';
COMMENT ON COLUMN hr_public.encryption_keys.key_algorithm IS 'Algorithm used: AES-GCM-256 (default) or AES-CBC-256';
COMMENT ON COLUMN hr_public.encryption_keys.created_for_user IS 'User who owns this encryption key';
COMMENT ON COLUMN hr_public.encryption_keys.rotated_at IS 'Timestamp when key was rotated (if applicable)';
COMMENT ON COLUMN hr_public.encryption_keys.is_active IS 'Whether key is currently active (false after rotation)';

-- Create indexes for performance
CREATE INDEX idx_encryption_keys_user_created ON hr_public.encryption_keys (created_for_user, created_at DESC);
CREATE INDEX idx_encryption_keys_identifier ON hr_public.encryption_keys (key_identifier);
CREATE INDEX idx_encryption_keys_active ON hr_public.encryption_keys (is_active) WHERE is_active = TRUE;

-- Now add foreign key to documents table (created in migration 001)
ALTER TABLE hr_public.documents
ADD CONSTRAINT fk_documents_encryption_key
FOREIGN KEY (encryption_key_id) REFERENCES hr_public.encryption_keys(id) ON DELETE RESTRICT;

-- Enable Row-Level Security
ALTER TABLE hr_public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own encryption keys
CREATE POLICY encryption_keys_owner_access ON hr_public.encryption_keys
    FOR SELECT
    USING (
        created_for_user = current_setting('jwt.claims.user_id', true)::uuid
    );

-- RLS Policy: Users can only create keys for themselves
CREATE POLICY encryption_keys_owner_create ON hr_public.encryption_keys
    FOR INSERT
    WITH CHECK (
        created_for_user = current_setting('jwt.claims.user_id', true)::uuid
    );

-- RLS Policy: Only Admins can view all encryption keys (for auditing)
CREATE POLICY encryption_keys_admin_view ON hr_public.encryption_keys
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- Grant permissions
GRANT SELECT, INSERT ON hr_public.encryption_keys TO authenticated;

-- Helper function to encrypt key data before storage (server-side encryption)
CREATE OR REPLACE FUNCTION encrypt_key_data(
    p_key_data BYTEA,
    p_key_identifier VARCHAR
)
RETURNS BYTEA AS $$
DECLARE
    encryption_password TEXT;
BEGIN
    -- Use key_identifier + server secret as encryption password
    -- In production, use environment variable for server secret
    encryption_password := p_key_identifier || '_SERVER_SECRET_KEY_PLACEHOLDER';

    -- Encrypt using pgcrypto's symmetric encryption (AES-256)
    RETURN pgp_sym_encrypt_bytea(p_key_data, encryption_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to decrypt key data (server-side decryption)
CREATE OR REPLACE FUNCTION decrypt_key_data(
    p_encrypted_key_data BYTEA,
    p_key_identifier VARCHAR
)
RETURNS BYTEA AS $$
DECLARE
    encryption_password TEXT;
BEGIN
    encryption_password := p_key_identifier || '_SERVER_SECRET_KEY_PLACEHOLDER';

    -- Decrypt using pgcrypto
    RETURN pgp_sym_decrypt_bytea(p_encrypted_key_data, encryption_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION encrypt_key_data(BYTEA, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_key_data(BYTEA, VARCHAR) TO authenticated;

-- Migration complete
COMMENT ON TABLE hr_public.encryption_keys IS 'Migration 20251007_005 complete: Encryption keys table with pgcrypto server-side encryption';
