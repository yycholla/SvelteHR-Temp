//! # QuickBooks Employee Fields Extension
//!
//! This migration extends the users table with QuickBooks-specific employee fields
//! to support comprehensive employee data synchronization between the HR system and
//! QuickBooks Online. These fields map directly to QuickBooks Employee entity properties.
//!
//! ## SeaORM Builder Usage
//! **Conversion: 100% MigrationHelpers (idempotent add_column_if_not_exists)**
//! - Uses MigrationHelpers::add_column_if_not_exists for all columns
//! - Uses MigrationHelpers::drop_column_if_exists for cleanup
//! - All operations are idempotent and can run multiple times safely
//!
//! ## Operations Summary
//! Adds 9 nullable columns to users table:
//!
//! 1. **employee_number** - QuickBooks employee identifier for payroll integration
//! 2. **gender** - Optional demographic data (Male/Female/Other)
//! 3. **street_address** - Primary street address from QuickBooks
//! 4. **city** - City component of address
//! 5. **state** - State/province component
//! 6. **postal_code** - ZIP/postal code
//! 7. **country** - Country component (defaults to US if not specified)
//! 8. **billable_time** - Whether employee tracks billable hours (default: false)
//! 9. **organization** - Department/organization name from QuickBooks (text field)
//!
//! ## Migration Strategy
//! - **All Nullable**: Supports gradual rollout without breaking existing data
//! - **No Indexes**: Address fields rarely used in WHERE clauses (read-heavy)
//! - **billable_time Default**: Defaults to false (most employees non-billable)
//! - **Zero Downtime**: ALTER TABLE ADD COLUMN is non-blocking in PostgreSQL
//!
//! ## QuickBooks Mapping
//! These fields map to QuickBooks Employee API properties:
//! - employee_number → EmployeeNumber (payroll identifier)
//! - gender → Gender (M/F/Other)
//! - street_address → PrimaryAddr.Line1
//! - city → PrimaryAddr.City
//! - state → PrimaryAddr.CountrySubDivisionCode
//! - postal_code → PrimaryAddr.PostalCode
//! - country → PrimaryAddr.Country
//! - billable_time → BillableTime (time tracking flag)
//! - organization → Organization (department text field)
//!
//! ## Data Flow
//! 1. Sync service fetches employee from QuickBooks API
//! 2. Maps QB properties to these fields
//! 3. Stores in users table for local HR operations
//! 4. Bidirectional sync: changes here can push back to QB
//!
//! ## Design Decisions
//! - **Flat Address Structure**: Avoids joins, simpler for most use cases
//! - **String Types**: Flexible for international formats (postal codes can be alphanumeric)
//! - **organization vs department_id**: organization is QB text field, department_id is FK
//! - **No Constraints**: QB data may be incomplete or in various formats
//!
//! ## Related Migrations
//! - m20251222_create_intuit_integration: Creates intuit_employee_id column
//! - m20251020_004_add_user_addresses: May have overlapping address fields (to be deduplicated)
//! - m20251226_001_add_sync_tracking: Adds sync status fields

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification: Add QuickBooks-specific employee fields for comprehensive sync

        // Payroll integration: Employee number from QuickBooks
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "employee_number VARCHAR",
        )
        .await?;

        // Demographics: Gender field (M/F/Other)
        MigrationHelpers::add_column_if_not_exists(manager, "hr_public.users", "gender VARCHAR")
            .await?;

        // Address components: Street address from QuickBooks PrimaryAddr
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "street_address VARCHAR",
        )
        .await?;

        // Address components: City
        MigrationHelpers::add_column_if_not_exists(manager, "hr_public.users", "city VARCHAR")
            .await?;

        // Address components: State/province
        MigrationHelpers::add_column_if_not_exists(manager, "hr_public.users", "state VARCHAR")
            .await?;

        // Address components: Postal/ZIP code (VARCHAR for international support)
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "postal_code VARCHAR",
        )
        .await?;

        // Address components: Country
        MigrationHelpers::add_column_if_not_exists(manager, "hr_public.users", "country VARCHAR")
            .await?;

        // Time tracking: Whether employee tracks billable hours
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "billable_time BOOLEAN NOT NULL DEFAULT false",
        )
        .await?;

        // Organization: Department/organization name from QuickBooks (text field, not FK)
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "organization VARCHAR",
        )
        .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Drop QuickBooks employee fields in reverse order

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "organization").await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "billable_time")
            .await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "country").await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "postal_code").await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "state").await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "city").await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "street_address")
            .await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "gender").await?;

        MigrationHelpers::drop_column_if_exists(manager, "hr_public.users", "employee_number")
            .await?;

        Ok(())
    }
}
