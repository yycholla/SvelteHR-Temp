//! Migration: Add expiry_date and version_number to documents table
//!
//! Adds document expiration tracking and version tracking to main documents table.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add expiry_date column to documents table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Documents::Table))
                    .add_column(
                        ColumnDef::new(Documents::ExpiryDate)
                            .timestamp_with_time_zone()
                            .null()
                    )
                    .to_owned(),
            )
            .await?;

        // Add version_number column to documents table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Documents::Table))
                    .add_column(
                        ColumnDef::new(Documents::VersionNumber)
                            .integer()
                            .not_null()
                            .default(1)
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on expiry_date for efficient queries
        manager
            .create_index(
                Index::create()
                    .name("idx_documents_expiry_date")
                    .table((Schema::HrPublic, Documents::Table))
                    .col(Documents::ExpiryDate)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop index
        manager
            .drop_index(
                Index::drop()
                    .name("idx_documents_expiry_date")
                    .table((Schema::HrPublic, Documents::Table))
                    .to_owned(),
            )
            .await?;

        // Remove version_number column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Documents::Table))
                    .drop_column(Documents::VersionNumber)
                    .to_owned(),
            )
            .await?;

        // Remove expiry_date column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Documents::Table))
                    .drop_column(Documents::ExpiryDate)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema { HrPublic }

#[derive(Iden)]
enum Documents {
    Table,
    ExpiryDate,
    VersionNumber
}
