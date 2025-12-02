//! Migration: Add recurrence support to trainings
//!
//! Adds fields to trainings table:
//! - rrule: RRULE string in RFC 5545 format
//! - recurrence_id: Self-referential FK to parent training
//! - recurrence_end_date: 5-year limit enforcement

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add rrule column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column(ColumnDef::new(Trainings::Rrule).text())
                    .to_owned(),
            )
            .await?;

        // Add recurrence_id column (self-referential FK)
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column(ColumnDef::new(Trainings::RecurrenceId).uuid())
                    .to_owned(),
            )
            .await?;

        // Add recurrence_end_date column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column(ColumnDef::new(Trainings::RecurrenceEndDate).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint for recurrence_id
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

        // Add index for recurrence_id for faster lookups
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
        // Drop index first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_trainings_recurrence_id")
                    .table((Schema::HrPublic, Trainings::Table))
                    .to_owned(),
            )
            .await?;

        // Drop foreign key
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_foreign_key(Alias::new("fk_trainings_recurrence_id"))
                    .to_owned(),
            )
            .await?;

        // Drop columns
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column(Trainings::RecurrenceEndDate)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column(Trainings::RecurrenceId)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column(Trainings::Rrule)
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
