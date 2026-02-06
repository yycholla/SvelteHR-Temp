//! # Enforce Department Names with Database Constraints
//!
//! This migration adds a CHECK constraint to the departments table to enforce
//! non-empty department names at the database level, preventing organizational
//! structure corruption from application bugs or direct database modifications.
//!
//! ## SeaORM Builder Usage
//! **Conversion: 0% (Appropriate - CHECK constraints require raw SQL)**
//! - Uses raw SQL for CHECK constraint (SeaORM doesn't provide constraint builders)
//! - Uses IF EXISTS guard for idempotent down migration
//!
//! ## Operations Summary
//!
//! ### CHECK Constraint (1 constraint):
//! 1. **chk_departments_name_not_empty** - Ensures name is NOT NULL and not empty/whitespace
//!
//! ## Constraint Rules
//! The constraint enforces two conditions:
//! 1. **NOT NULL**: Department name must have a value
//! 2. **Not Empty**: After trimming whitespace, name must have length > 0
//!
//! ## Migration Strategy
//! - **Raw SQL Required**: CHECK constraints not supported by SeaORM builders
//! - **Add Constraint**: Uses raw SQL with execute_unprepared
//! - **Idempotent Down**: Uses DROP CONSTRAINT IF EXISTS guard
//! - **Data Safety**: Migration will fail if existing data violates constraint
//!
//! ## Data Validation Examples
//!
//! ### Valid Department Names (allowed):
//! ```sql
//! -- Normal department names
//! 'Engineering'
//! 'Human Resources'
//! 'Sales & Marketing'
//!
//! -- Names with surrounding whitespace (trimmed)
//! '  Finance  '
//! ```
//!
//! ### Invalid Department Names (rejected):
//! ```sql
//! -- NULL name
//! NULL
//!
//! -- Empty string
//! ''
//!
//! -- Whitespace only
//! '   '
//! '	'  -- tab character
//! ' \n '  -- mixed whitespace
//! ```
//!
//! ## Pre-Migration Validation Query
//! Run this before migration to find violating records:
//! ```sql
//! -- Find departments with invalid names
//! SELECT id, name, parent_department_id, created_at
//! FROM hr_public.departments
//! WHERE name IS NULL
//! OR length(trim(name)) = 0;
//! ```
//!
//! ## Error Handling
//! If migration fails due to existing invalid data:
//! 1. Use validation query above to identify problem records
//! 2. Fix or delete invalid records:
//!    ```sql
//!    -- Option 1: Delete invalid departments (check dependencies first!)
//!    DELETE FROM hr_public.departments
//!    WHERE name IS NULL OR length(trim(name)) = 0;
//!
//!    -- Option 2: Set placeholder name
//!    UPDATE hr_public.departments
//!    SET name = 'Unnamed Department ' || id::text
//!    WHERE name IS NULL OR length(trim(name)) = 0;
//!    ```
//! 3. Re-run migration
//!
//! ## Constraint Enforcement
//! - **INSERT**: New departments must have valid name
//! - **UPDATE**: Cannot set name to NULL or empty
//! - **Application Layer**: Should validate before database to provide better errors
//! - **Database Layer**: Final safety net for organizational data integrity
//!
//! ## Impact on Organizational Structure
//! - **Department Hierarchy**: Prevents invalid nodes in org tree
//! - **Employee Assignment**: Ensures all employees belong to validly-named departments
//! - **QuickBooks Sync**: Prevents sync errors from empty department names
//! - **Reporting**: Eliminates unnamed departments in organizational reports
//!
//! ## Design Decisions
//! - **trim() function**: Prevents whitespace-only department names
//! - **length() > 0**: Explicit empty string check
//! - **NOT NULL check**: Explicit NULL value prevention
//! - **Both checks**: Defense in depth (application + database validation)
//! - **Similar to users.email**: Consistent validation pattern across entities
//!
//! ## Related Migrations
//! - m20251017_004_hr_core: Creates departments table with name column
//! - m20251223_001_add_intuit_department_id: QuickBooks sync integration
//! - m20251226_002_enforce_email_rules: Similar constraint pattern for emails
//! - m20260205_001_add_department_ancestor_ids: Department hierarchy tracking
//!
//! ## Performance Impact
//! - **Constraint Overhead**: Minimal (simple length check on writes)
//! - **No Index Required**: Constraint doesn't need supporting index
//! - **Write Performance**: Negligible impact (<1ms per INSERT/UPDATE)
//! - **Read Performance**: No impact (constraints only enforced on writes)
//! - **Hierarchy Queries**: No impact on recursive department tree queries

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Data integrity constraint: Prevent empty or NULL department names
        // Ensures organizational structure always has valid department identifiers
        // Note: Raw SQL required (CHECK constraints not in SeaORM builders)
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.departments
             ADD CONSTRAINT chk_departments_name_not_empty
             CHECK (name IS NOT NULL AND length(trim(name)) > 0)",
            "Add CHECK constraint for non-empty department names",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Remove department name validation constraint
        // Uses IF EXISTS guard for idempotent rollback
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.departments
             DROP CONSTRAINT IF EXISTS chk_departments_name_not_empty",
            "Drop department name validation constraint",
        )
        .await?;

        Ok(())
    }
}
