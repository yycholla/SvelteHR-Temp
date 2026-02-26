//! # Add Comprehensive Sync Tracking Fields
//!
//! This migration adds granular synchronization tracking fields to both users and
//! departments tables, enabling precise tracking of sync state, conflict detection,
//! and incremental sync optimization with QuickBooks Online.
//!
//! ## SeaORM Builder Usage
//! **Conversion: 100% MigrationHelpers (idempotent operations)**
//! - Uses MigrationHelpers::add_columns_if_not_exist for batch column additions
//! - Uses MigrationHelpers::create_index_if_not_exists for performance indexes
//! - Uses MigrationHelpers::drop_index_if_exists for cleanup
//! - Uses MigrationHelpers::execute_idempotent for batch column drops
//!
//! ## Operations Summary
//!
//! ### Users Table (4 new columns):
//! 1. **last_synced_at** - Timestamp of last successful sync with QuickBooks
//! 2. **last_modified_at** - Timestamp of last local modification (NOT NULL, default NOW())
//! 3. **quickbooks_sync_token** - QuickBooks sync token for optimistic locking
//! 4. **sync_status** - Current sync state (synced/pending/error, default: synced)
//!
//! ### Departments Table (4 new columns):
//! Same fields as users table for consistent sync tracking
//!
//! ### Performance Indexes (6 total):
//! **Users:**
//! - idx_users_last_synced_at: Find users needing sync
//! - idx_users_sync_status: Filter by sync state
//! - idx_users_intuit_id_sync_status: Composite for QB ID + status queries
//!
//! **Departments:**
//! - idx_departments_last_synced_at: Find departments needing sync
//! - idx_departments_sync_status: Filter by sync state
//! - idx_departments_intuit_id_sync_status: Composite for QB ID + status queries
//!
//! ## Migration Strategy
//! - **Idempotent**: All operations use IF NOT EXISTS/IF EXISTS guards
//! - **Batch Operations**: Multiple columns added in single ALTER TABLE (performance)
//! - **Zero Downtime**: All nullable except last_modified_at (has default)
//! - **Rollback Safe**: Down migration drops indexes before columns
//!
//! ## Sync Workflows Enabled
//!
//! ### Incremental Sync (Performance Optimization):
//! ```sql
//! -- Find users modified since last sync
//! SELECT * FROM users
//! WHERE last_modified_at > last_synced_at
//! OR last_synced_at IS NULL;
//! ```
//!
//! ### Conflict Detection:
//! ```sql
//! -- Detect conflicts (modified both locally and in QB)
//! SELECT * FROM users
//! WHERE last_modified_at > last_synced_at
//! AND intuit_employee_id IS NOT NULL;
//! ```
//!
//! ### Error Recovery:
//! ```sql
//! -- Retry failed syncs
//! SELECT * FROM users
//! WHERE sync_status = 'error'
//! ORDER BY last_modified_at DESC
//! LIMIT 100;
//! ```
//!
//! ### Optimistic Locking:
//! - quickbooks_sync_token stores QB SyncToken value
//! - Prevents lost updates in concurrent sync scenarios
//! - QB API rejects updates with stale sync tokens
//!
//! ## Sync Status Values
//! - **synced**: In sync with QuickBooks (default)
//! - **pending**: Local changes not yet pushed to QB
//! - **error**: Last sync attempt failed (see intuit_sync_log for details)
//! - **conflict**: Requires manual resolution (modified in both systems)
//!
//! ## Design Decisions
//! - **last_modified_at NOT NULL**: Always track when entity was last changed
//! - **Default NOW()**: Automatically set on row creation
//! - **Composite Indexes**: Optimize common query patterns (QB ID + status)
//! - **sync_status TEXT**: Flexible for future status additions
//! - **quickbooks_sync_token TEXT**: QB uses string tokens (version numbers)
//!
//! ## Related Migrations
//! - m20251222_create_intuit_integration: Creates intuit_employee_id column
//! - m20251223_001_add_intuit_department_id: Adds intuit_department_id column
//! - m20251226_002_enhance_sync_log: Extends sync logging capabilities
//!
//! ## Performance Impact
//! - **6 New Indexes**: Minimal write overhead, significant read performance gains
//! - **Composite Indexes**: Cover common JOIN patterns (QB ID + status)
//! - **Partial Indexes**: Future optimization opportunity (index only non-synced rows)

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification: Add sync tracking fields to users table
        // Enables incremental sync, conflict detection, and error recovery
        MigrationHelpers::add_columns_if_not_exist(
            manager,
            "hr_public.users",
            &[
                "last_synced_at TIMESTAMPTZ", // Nullable: NULL means never synced
                "last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()", // Auto-tracks changes
                "quickbooks_sync_token TEXT", // QB optimistic lock token
                "sync_status TEXT NOT NULL DEFAULT 'synced'", // synced/pending/error/conflict
            ],
        )
        .await?;

        // Schema modification: Add sync tracking fields to departments table
        // Same fields as users for consistent sync tracking across entities
        MigrationHelpers::add_columns_if_not_exist(
            manager,
            "hr_public.departments",
            &[
                "last_synced_at TIMESTAMPTZ",
                "last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
                "quickbooks_sync_token TEXT",
                "sync_status TEXT NOT NULL DEFAULT 'synced'",
            ],
        )
        .await?;

        // Performance index: Find users needing sync (modified since last sync)
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_users_last_synced_at",
            "hr_public.users",
            "last_synced_at",
        )
        .await?;

        // Performance index: Filter users by sync status (error recovery)
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_users_sync_status",
            "hr_public.users",
            "sync_status",
        )
        .await?;

        // Performance index: Composite for QB ID + status queries (common pattern)
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_users_intuit_id_sync_status",
            "hr_public.users",
            "intuit_employee_id, sync_status",
        )
        .await?;

        // Performance index: Find departments needing sync
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_departments_last_synced_at",
            "hr_public.departments",
            "last_synced_at",
        )
        .await?;

        // Performance index: Filter departments by sync status
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_departments_sync_status",
            "hr_public.departments",
            "sync_status",
        )
        .await?;

        // Performance index: Composite for QB department ID + status queries
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_departments_intuit_id_sync_status",
            "hr_public.departments",
            "intuit_department_id, sync_status",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Drop indexes before columns (proper dependency order)

        // Drop department indexes
        MigrationHelpers::drop_index_if_exists(
            manager,
            "hr_public.idx_departments_intuit_id_sync_status",
        )
        .await?;

        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_departments_sync_status")
            .await?;

        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_departments_last_synced_at")
            .await?;

        // Drop user indexes
        MigrationHelpers::drop_index_if_exists(
            manager,
            "hr_public.idx_users_intuit_id_sync_status",
        )
        .await?;

        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_users_sync_status").await?;

        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_users_last_synced_at")
            .await?;

        // Cleanup: Drop sync tracking columns from departments table
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.departments
                DROP COLUMN IF EXISTS sync_status,
                DROP COLUMN IF EXISTS quickbooks_sync_token,
                DROP COLUMN IF EXISTS last_modified_at,
                DROP COLUMN IF EXISTS last_synced_at",
            "Drop sync tracking columns from departments",
        )
        .await?;

        // Cleanup: Drop sync tracking columns from users table
        // NOTE: Does NOT drop employee_number (belongs to m20251222_002_add_quickbooks_employee_fields)
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.users
                DROP COLUMN IF EXISTS sync_status,
                DROP COLUMN IF EXISTS quickbooks_sync_token,
                DROP COLUMN IF EXISTS last_modified_at,
                DROP COLUMN IF EXISTS last_synced_at",
            "Drop sync tracking columns from users",
        )
        .await?;

        Ok(())
    }
}
