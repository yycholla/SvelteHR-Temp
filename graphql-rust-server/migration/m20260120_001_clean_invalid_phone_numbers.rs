//! Migration: Clean Invalid Phone Numbers
//!
//! Data quality migration to clean up invalid phone numbers in the users table.
//!
//! **Context**: The fake crate intentionally generates varied data (including addresses)
//! to test validation logic. While this is useful for testing, existing seed data may
//! contain invalid phone formats that should be cleaned up.
//!
//! Invalid formats found:
//! - Addresses: "1805 E Overland Rd Apt 3224, Meridian, ID 83642-6891"
//! - Extensions: "280.766.3038 x335"
//!
//! Valid format (domain constraint): /^\+?[1-9]\d{9,14}$/
//!
//! Strategy: Set invalid phone_number values to NULL
//! - Preserves user records
//! - Flags bad data for manual review
//! - Maintains data integrity
//!
//! **Note**: The adapter layer now validates phone numbers at the boundary,
//! so new invalid data will be flagged and rejected automatically.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Clean phone_number column - set invalid values to NULL
        // Invalid if contains letters (likely an address) or commas
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                UPDATE hr_public.users
                SET phone_number = NULL
                WHERE phone_number IS NOT NULL
                  AND (
                    phone_number ~ '[a-zA-Z]'  -- Contains letters (likely address)
                    OR phone_number ~ ','       -- Contains comma (likely address)
                    OR LENGTH(phone_number) > 25 -- Too long to be a phone number
                  );
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // This is a data cleanup migration - cannot reverse
        // Original invalid data is lost (intentionally)
        // Log warning that this migration cannot be reversed
        tracing::warn!(
            "Migration m20260120_001_clean_invalid_phone_numbers cannot be reversed - \
             original invalid phone data has been cleaned"
        );

        Ok(())
    }
}
