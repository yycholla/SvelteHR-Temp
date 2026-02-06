//! Migration: Add recurrence support to trainings
//!
//! This migration enables recurring training sessions with RFC 5545 RRULE support:
//! - rrule: Recurrence rule in RFC 5545 format (e.g., "FREQ=WEEKLY;BYDAY=MO,WE")
//! - recurrence_id: Self-referential FK to parent training (tracks recurrence instances)
//! - recurrence_end_date: Maximum end date (5-year limit enforcement)
//!
//! ## SeaORM Builder Usage: 100% Converted (10/10 operations)
//!
//! All schema operations use idempotent SeaORM builders where supported.
//!
//! ### Operations (SeaORM Builders - 10 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE trainings ADD COLUMN rrule
//!    - Using: `add_column_if_not_exists()` (idempotent)
//!    - Type: TEXT, nullable
//!    - Format: RFC 5545 RRULE string (e.g., "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10")
//!
//! 2. ALTER TABLE trainings ADD COLUMN recurrence_id
//!    - Using: `add_column_if_not_exists()` (idempotent)
//!    - Type: UUID, nullable
//!    - Purpose: Self-referential FK to parent training
//!
//! 3. ALTER TABLE trainings ADD COLUMN recurrence_end_date
//!    - Using: `add_column_if_not_exists()` (idempotent)
//!    - Type: TIMESTAMPTZ, nullable
//!    - Purpose: Maximum end date for recurrence (5-year limit)
//!
//! 4. ALTER TABLE trainings ADD CONSTRAINT fk_trainings_recurrence_id
//!    - Using: `add_foreign_key()` with existence check
//!    - Self-referential FK (recurrence_id → trainings.id)
//!    - ON DELETE SET NULL (preserve instances when parent deleted)
//!
//! 5. CREATE INDEX idx_trainings_recurrence_id
//!    - Using: `create_index()` with IF NOT EXISTS (idempotent)
//!    - Optimizes queries for recurring training instances
//!
//! **Down Migration:**
//! 6. DROP INDEX idx_trainings_recurrence_id
//!    - Using: `drop_index()` with IF EXISTS (idempotent)
//!
//! 7. ALTER TABLE trainings DROP CONSTRAINT fk_trainings_recurrence_id
//!    - Using: `drop_foreign_key()` with existence check
//!
//! 8. ALTER TABLE trainings DROP COLUMN recurrence_end_date
//!    - Using: `drop_column_if_exists()` (idempotent)
//!
//! 9. ALTER TABLE trainings DROP COLUMN recurrence_id
//!    - Using: `drop_column_if_exists()` (idempotent)
//!
//! 10. ALTER TABLE trainings DROP COLUMN rrule
//!     - Using: `drop_column_if_exists()` (idempotent)
//!
//! ### Migration Strategy
//!
//! This is a **recurrence support migration** that:
//! - Enables RFC 5545 RRULE support for recurring trainings
//! - Self-referential FK tracks parent-child relationship
//! - SET NULL cascade preserves instances when parent deleted
//! - Index optimizes queries for recurring training instances
//! - 5-year limit enforced via recurrence_end_date
//!
//! **Recurrence Pattern:**
//! 1. Parent training has rrule and recurrence_end_date
//! 2. Generated instances have recurrence_id pointing to parent
//! 3. Deleting parent sets recurrence_id to NULL (preserves instances)
//! 4. Query instances: WHERE recurrence_id = parent_id
//!
//! **RRULE Examples:**
//! - Weekly: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10"
//! - Monthly: "FREQ=MONTHLY;BYMONTHDAY=1;UNTIL=20261231T000000Z"
//! - Yearly: "FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=15"
//!
//! **Foreign Key Strategy:**
//! - Self-referential FK (trainings.recurrence_id → trainings.id)
//! - ON DELETE SET NULL (not CASCADE)
//! - Preserves training instances if parent deleted
//! - Allows historical tracking of recurring series
//!
//! ## Migration Type: Schema Enhancement (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of self-referential foreign keys
//! and RFC 5545 RRULE support for calendar event recurrence patterns.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // 1. Add rrule column (RFC 5545 RRULE format) with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column_if_not_exists(ColumnDef::new(Trainings::Rrule).text())
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // 2. Add recurrence_id column (self-referential FK) with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column_if_not_exists(ColumnDef::new(Trainings::RecurrenceId).uuid())
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // 3. Add recurrence_end_date column (5-year limit) with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column_if_not_exists(ColumnDef::new(Trainings::RecurrenceEndDate).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // 4. Add self-referential foreign key constraint (recurrence_id → trainings.id)
        // Check if constraint exists before adding (manual idempotency)
        let constraint_exists = manager
            .get_connection()
            .query_one(sea_orm::Statement::from_string(
                manager.get_database_backend(),
                format!(
                    "SELECT 1 FROM information_schema.table_constraints
                     WHERE constraint_name = 'fk_trainings_recurrence_id'
                     AND table_schema = 'hr_public' AND table_name = 'trainings'"
                ),
            ))
            .await?;

        if constraint_exists.is_none() {
            let fk = TableForeignKey::new()
                .name("fk_trainings_recurrence_id")
                .from_tbl((Schema::HrPublic, Trainings::Table))
                .from_col(Trainings::RecurrenceId)
                .to_tbl((Schema::HrPublic, Trainings::Table))
                .to_col(Trainings::Id)
                .on_delete(ForeignKeyAction::SetNull)
                .to_owned();

            manager
                .alter_table(
                    Table::alter()
                        .table((Schema::HrPublic, Trainings::Table))
                        .add_foreign_key(&fk)
                        .to_owned(),
                )
                .await?;
        }

        // Schema modification operation - Using SeaORM builder (CREATE INDEX)
        // 5. Add index on recurrence_id for faster instance queries with IF NOT EXISTS
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_trainings_recurrence_id")
                    .table((Schema::HrPublic, Trainings::Table))
                    .col(Trainings::RecurrenceId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification operation - Using SeaORM builder (DROP INDEX)
        // 6. Drop index with IF EXISTS for idempotency
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_trainings_recurrence_id")
                    .table((Schema::HrPublic, Trainings::Table))
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // 7. Drop foreign key constraint (check existence before dropping for idempotency)
        let constraint_exists = manager
            .get_connection()
            .query_one(sea_orm::Statement::from_string(
                manager.get_database_backend(),
                format!(
                    "SELECT 1 FROM information_schema.table_constraints
                     WHERE constraint_name = 'fk_trainings_recurrence_id'
                     AND table_schema = 'hr_public' AND table_name = 'trainings'"
                ),
            ))
            .await?;

        if constraint_exists.is_some() {
            manager
                .alter_table(
                    Table::alter()
                        .table((Schema::HrPublic, Trainings::Table))
                        .drop_foreign_key(Alias::new("fk_trainings_recurrence_id"))
                        .to_owned(),
                )
                .await?;
        }

        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // 8-10. Drop columns with IF EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column_if_exists(Trainings::RecurrenceEndDate)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column_if_exists(Trainings::RecurrenceId)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column_if_exists(Trainings::Rrule)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Trainings {
    Table,
    Id,
    Rrule,
    RecurrenceId,
    RecurrenceEndDate,
}
