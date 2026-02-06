//! # Enforce Email Rules with Database Constraints
//!
//! This migration adds a CHECK constraint to the users table to enforce
//! non-empty email addresses at the database level, preventing data integrity
//! issues from application bugs or direct database modifications.
//!
//! ## SeaORM Builder Usage
//! **Conversion: 0% (Appropriate - CHECK constraints require raw SQL)**
//! - Uses raw SQL for CHECK constraint (SeaORM doesn't provide constraint builders)
//! - Uses IF EXISTS guard for idempotent down migration
//!
//! ## Operations Summary
//!
//! ### CHECK Constraint (1 constraint):
//! 1. **chk_users_email_not_empty** - Ensures email is NOT NULL and not empty/whitespace
//!
//! ## Constraint Rules
//! The constraint enforces two conditions:
//! 1. **NOT NULL**: Email field must have a value
//! 2. **Not Empty**: After trimming whitespace, email must have length > 0
//!
//! ## Migration Strategy
//! - **Raw SQL Required**: CHECK constraints not supported by SeaORM builders
//! - **Add Constraint**: Uses raw SQL with execute_unprepared
//! - **Idempotent Down**: Uses DROP CONSTRAINT IF EXISTS guard
//! - **Data Safety**: Migration will fail if existing data violates constraint
//!
//! ## Data Validation Examples
//!
//! ### Valid Emails (allowed):
//! ```sql
//! -- Normal email
//! 'user@example.com'
//!
//! -- Email with whitespace (trimmed)
//! '  user@example.com  '
//! ```
//!
//! ### Invalid Emails (rejected):
//! ```sql
//! -- NULL email
//! NULL
//!
//! -- Empty string
//! ''
//!
//! -- Whitespace only
//! '   '
//! '	'  -- tab character
//! ```
//!
//! ## Pre-Migration Validation Query
//! Run this before migration to find violating records:
//! ```sql
//! -- Find users with invalid emails
//! SELECT id, email, created_at
//! FROM hr_public.users
//! WHERE email IS NULL
//! OR length(trim(email)) = 0;
//! ```
//!
//! ## Error Handling
//! If migration fails due to existing invalid data:
//! 1. Use validation query above to identify problem records
//! 2. Fix or delete invalid records:
//!    ```sql
//!    -- Option 1: Delete invalid records
//!    DELETE FROM hr_public.users
//!    WHERE email IS NULL OR length(trim(email)) = 0;
//!
//!    -- Option 2: Set placeholder email
//!    UPDATE hr_public.users
//!    SET email = 'invalid_' || id::text || '@placeholder.local'
//!    WHERE email IS NULL OR length(trim(email)) = 0;
//!    ```
//! 3. Re-run migration
//!
//! ## Constraint Enforcement
//! - **INSERT**: New users must have valid email
//! - **UPDATE**: Cannot set email to NULL or empty
//! - **Application Layer**: Should validate before database to provide better errors
//! - **Database Layer**: Final safety net for data integrity
//!
//! ## Design Decisions
//! - **trim() function**: Prevents whitespace-only emails
//! - **length() > 0**: Explicit empty string check
//! - **NOT NULL check**: Explicit NULL value prevention
//! - **Both checks**: Defense in depth (application + database validation)
//!
//! ## Related Migrations
//! - m20251017_003_auth: Creates users table with email column
//! - m20251118_002_fix_email_unique_constraint_for_soft_delete: Email uniqueness
//!
//! ## Performance Impact
//! - **Constraint Overhead**: Minimal (simple length check on writes)
//! - **No Index Required**: Constraint doesn't need supporting index
//! - **Write Performance**: Negligible impact (<1ms per INSERT/UPDATE)
//! - **Read Performance**: No impact (constraints only enforced on writes)

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Data integrity constraint: Prevent empty or NULL emails
        // Ensures email field always contains a valid non-empty value
        // Note: Raw SQL required (CHECK constraints not in SeaORM builders)
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.users
             ADD CONSTRAINT chk_users_email_not_empty
             CHECK (email IS NOT NULL AND length(trim(email)) > 0)",
            "Add CHECK constraint for non-empty emails",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Remove email validation constraint
        // Uses IF EXISTS guard for idempotent rollback
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.users
             DROP CONSTRAINT IF EXISTS chk_users_email_not_empty",
            "Drop email validation constraint",
        )
        .await?;

        Ok(())
    }
}
