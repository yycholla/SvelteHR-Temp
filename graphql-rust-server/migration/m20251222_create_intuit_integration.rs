//! # Intuit QuickBooks Integration - OAuth 2.0 Connection Management
//!
//! This migration establishes the foundational infrastructure for integrating with
//! Intuit QuickBooks Online API. It creates tables and indexes to manage OAuth 2.0
//! authentication tokens, employee synchronization mappings, and detailed sync audit logs.
//!
//! ## SeaORM Builder Usage
//! **Conversion: 100% SeaORM Builders**
//! - Uses SeaORM `.if_not_exists()` for idempotent table creation
//! - Uses SeaORM `.if_exists()` for safe table/index cleanup
//! - All operations use type-safe builder patterns
//!
//! ## Operations Summary
//! 1. **intuit_connections table** - Stores OAuth 2.0 tokens and company metadata
//!    - UUID primary key with auto-generation
//!    - realm_id: QuickBooks company identifier
//!    - access_token/refresh_token: OAuth 2.0 credentials (encrypted at app level)
//!    - token_expires_at: Token expiration tracking for automatic refresh
//!    - is_active: Soft-disable connections without deletion
//!    - Timestamps: created_at, updated_at, deleted_at (soft delete support)
//!
//! 2. **users.intuit_employee_id column** - Maps internal users to QuickBooks employees
//!    - Nullable string to support gradual rollout
//!    - Indexed for efficient bidirectional lookups
//!
//! 3. **intuit_sync_log table** - Comprehensive audit trail for sync operations
//!    - Records every sync attempt (success or failure)
//!    - Captures direction (push to QB vs. pull from QB)
//!    - Stores error messages and full payload for debugging
//!    - Foreign key to users for employee-specific syncs
//!
//! 4. **Performance indexes**
//!    - idx_users_intuit_employee_id: Fast user lookups by QuickBooks ID
//!    - idx_intuit_sync_log_user_id: Efficient per-user audit log queries
//!    - idx_intuit_sync_log_created_at: Time-based log filtering and cleanup
//!
//! ## Migration Strategy
//! - **Idempotent**: All operations use IF NOT EXISTS/IF EXISTS guards
//! - **Zero Downtime**: All columns nullable, indexes created online
//! - **Rollback Safe**: Down migration cleans up in reverse dependency order
//! - **Audit Compliant**: Complete sync history with payload storage
//!
//! ## Integration Flow
//! 1. Admin connects QuickBooks via OAuth 2.0 (stored in intuit_connections)
//! 2. Sync service maps users ↔ QB employees (via intuit_employee_id)
//! 3. All sync operations logged to intuit_sync_log with full context
//! 4. Tokens refreshed automatically before expiration
//!
//! ## Security Considerations
//! - Tokens stored in database but encrypted at application layer
//! - Soft delete prevents accidental credential loss
//! - Audit log retains sync history even after user deletion (SET NULL FK)
//!
//! ## Related Migrations
//! - m20251222_002: Adds QuickBooks-specific employee fields (address, gender, etc.)
//! - m20251223_001: Adds department sync mapping (intuit_department_id)
//! - m20251226_001: Adds granular sync status tracking per entity

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification: Create intuit_connections table for OAuth 2.0 token storage
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, IntuitConnections::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(IntuitConnections::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(IntuitConnections::RealmId)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(IntuitConnections::AccessToken)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(IntuitConnections::RefreshToken)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(IntuitConnections::TokenExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(ColumnDef::new(IntuitConnections::CompanyName).string())
                    .col(
                        ColumnDef::new(IntuitConnections::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(IntuitConnections::LastSyncAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(IntuitConnections::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(IntuitConnections::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(ColumnDef::new(IntuitConnections::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Schema modification: Add intuit_employee_id column for QuickBooks employee mapping
        // Nullable to support gradual sync rollout and non-synced employees
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "intuit_employee_id VARCHAR",
        )
        .await?;

        // Performance index: Enable fast lookups by QuickBooks employee ID
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_users_intuit_employee_id",
            "hr_public.users",
            "intuit_employee_id",
        )
        .await?;

        // Schema modification: Create intuit_sync_log table for comprehensive audit trail
        // Tracks every sync operation with full payload and error details for debugging
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(IntuitSyncLog::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(ColumnDef::new(IntuitSyncLog::UserId).uuid())
                    .col(ColumnDef::new(IntuitSyncLog::SyncType).string().not_null())
                    .col(ColumnDef::new(IntuitSyncLog::Direction).string().not_null())
                    .col(ColumnDef::new(IntuitSyncLog::Status).string().not_null())
                    .col(ColumnDef::new(IntuitSyncLog::ErrorMessage).text())
                    .col(ColumnDef::new(IntuitSyncLog::Payload).json_binary())
                    .col(
                        ColumnDef::new(IntuitSyncLog::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    // Foreign key: SET NULL on user deletion to preserve audit history
                    .foreign_key(
                        ForeignKey::create()
                            .from(
                                (Schema::HrPublic, IntuitSyncLog::Table),
                                IntuitSyncLog::UserId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Performance index: Efficient per-user audit log queries
        manager
            .create_index(
                Index::create()
                    .name("idx_intuit_sync_log_user_id")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .col(IntuitSyncLog::UserId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Performance index: Time-based filtering and cleanup of old logs
        manager
            .create_index(
                Index::create()
                    .name("idx_intuit_sync_log_created_at")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .col(IntuitSyncLog::CreatedAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Drop tables in reverse dependency order (child tables first)

        // Drop intuit_sync_log table (has FK to users)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop index before dropping column
        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_users_intuit_employee_id")
            .await?;

        // Drop intuit_employee_id column from users table
        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "intuit_employee_id")
            .await?;

        // Drop intuit_connections table (no dependencies)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, IntuitConnections::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum IntuitConnections {
    Table,
    Id,
    RealmId,
    AccessToken,
    RefreshToken,
    TokenExpiresAt,
    CompanyName,
    IsActive,
    LastSyncAt,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    IntuitEmployeeId,
}

#[derive(DeriveIden)]
enum IntuitSyncLog {
    Table,
    Id,
    UserId,
    SyncType,
    Direction,
    Status,
    ErrorMessage,
    Payload,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}
