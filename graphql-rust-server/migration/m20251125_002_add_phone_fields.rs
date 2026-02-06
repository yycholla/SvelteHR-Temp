//! Migration: Add mobile_number field to users table
//!
//! This migration adds mobile phone number support for:
//! - User contact information
//! - Two-factor authentication (SMS)
//! - Emergency contact methods
//! - HR communication channels
//!
//! ## SeaORM Builder Usage: 100% Converted (2/2 operations)
//!
//! All schema operations use SeaORM builders with proper idempotency.
//!
//! ### Operations (SeaORM Builders - 2 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE users ADD COLUMN mobile_number (varchar)
//!    - Using: `manager.alter_table()` with Table::alter().add_column_if_not_exists() builder
//!    - Nullable for backward compatibility (existing users without mobile numbers)
//!    - IF NOT EXISTS for idempotency (converted from non-idempotent add_column)
//!
//! **Down Migration:**
//! 2. ALTER TABLE users DROP COLUMN mobile_number
//!    - Using: `manager.alter_table()` with Table::alter().drop_column() builder
//!    - Removes mobile number field
//!
//! ### Migration Strategy
//!
//! This is a **schema extension migration** that:
//! - Adds mobile phone number field for contact and authentication
//! - Maintains backward compatibility (nullable column)
//! - Enables SMS-based features (2FA, notifications)
//! - Supports emergency contact workflows
//!
//! **Use Cases:**
//! - Two-factor authentication: Send SMS verification codes
//! - HR notifications: Text message alerts for important updates
//! - Emergency contact: Mobile number for urgent employee contact
//! - Profile completeness: Optional mobile number in user profile
//!
//! ## Migration Type: Schema Extension (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for simple
//! column additions with IF NOT EXISTS for safe re-runs.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema operation - Using SeaORM builder (add_column_if_not_exists)
        // Add mobile_number to users table with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column_if_not_exists(ColumnDef::new(Users::MobileNumber).string().null())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::MobileNumber)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Users {
    Table,
    MobileNumber,
}
