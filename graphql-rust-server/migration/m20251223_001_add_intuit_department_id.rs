//! # Add QuickBooks Department ID Mapping
//!
//! This migration extends the departments table with QuickBooks Online department
//! mapping to enable bidirectional synchronization of organizational structure between
//! the HR system and QuickBooks.
//!
//! ## SeaORM Builder Usage
//! **Conversion: 100% MigrationHelpers (idempotent operations)**
//! - Uses MigrationHelpers::add_column_if_not_exists for column addition
//! - Uses MigrationHelpers::create_index_if_not_exists for index creation
//! - Uses MigrationHelpers::drop_index_if_exists for cleanup
//! - Uses MigrationHelpers::drop_column_if_exists for column removal
//!
//! ## Operations Summary
//! 1. **intuit_department_id column** - Maps internal departments to QuickBooks departments
//!    - Nullable VARCHAR to support gradual rollout
//!    - Stores QuickBooks Department.Id (unique identifier)
//!    - Enables bidirectional sync (create/update/delete)
//!
//! 2. **Performance index** - idx_departments_intuit_department_id
//!    - Enables fast lookups by QuickBooks department ID
//!    - Used during sync to match QB departments to local departments
//!    - Non-unique (theoretically multiple local depts could map to same QB dept)
//!
//! ## Migration Strategy
//! - **Idempotent**: All operations use IF NOT EXISTS/IF EXISTS guards
//! - **Zero Downtime**: Nullable column, non-blocking index creation
//! - **Gradual Rollout**: Existing departments work without QB mapping
//! - **Rollback Safe**: Down migration cleans up in correct order (index then column)
//!
//! ## QuickBooks Integration
//! QuickBooks Department entity properties:
//! - Id: Unique identifier (stored in intuit_department_id)
//! - Name: Department name (stored in departments.name)
//! - Active: Whether department is active (mapped to departments.deleted_at)
//! - SubDepartment: Whether it's a sub-department (mapped to departments.parent_id)
//!
//! ## Sync Workflows
//!
//! **Initial Sync (QB → HR System):**
//! 1. Fetch all departments from QuickBooks API
//! 2. Match by name or create new departments
//! 3. Store QB Department.Id in intuit_department_id
//!
//! **Ongoing Sync (Bidirectional):**
//! - HR System → QB: Use intuit_department_id to update existing QB department
//! - QB → HR System: Use intuit_department_id to find matching local department
//!
//! **Orphan Handling:**
//! - Department deleted in QB: Set departments.deleted_at (soft delete)
//! - Department deleted in HR: Delete from QB (if intuit_department_id exists)
//!
//! ## Design Decisions
//! - **Nullable Column**: Not all departments need QB mapping (manual-only departments)
//! - **No UNIQUE Constraint**: Allows flexibility for testing/staging environments
//! - **VARCHAR Type**: QB IDs are numeric strings but stored as VARCHAR for flexibility
//! - **Indexed**: Critical for sync performance (lookup by QB ID during webhook processing)
//!
//! ## Related Migrations
//! - m20251222_create_intuit_integration: Creates intuit_employee_id for user mapping
//! - m20251226_001_add_sync_tracking: Adds sync status tracking to departments
//! - m20251017_004_hr_core: Original departments table creation

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification: Add QuickBooks department ID mapping column
        // Nullable to support departments that don't sync with QuickBooks
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.departments",
            "intuit_department_id VARCHAR",
        )
        .await?;

        // Performance index: Enable fast lookups by QuickBooks department ID
        // Used during sync to match QB departments to local departments
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_departments_intuit_department_id",
            "hr_public.departments",
            "intuit_department_id",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Drop index before column (proper dependency order)
        MigrationHelpers::drop_index_if_exists(
            manager,
            "hr_public.idx_departments_intuit_department_id",
        )
        .await?;

        // Cleanup: Drop QuickBooks department ID mapping column
        MigrationHelpers::drop_column_if_exists(
            manager,
            "hr_public.departments",
            "intuit_department_id",
        )
        .await?;

        Ok(())
    }
}
