//! Migration: Fix document_assignments schema
//!
//! Adds missing columns and makes user_id nullable to support department-level assignments

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Make user_id nullable (assignments can be to users OR departments)
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .modify_column(ColumnDef::new(DocumentAssignments::UserId).uuid().null())
                    .to_owned(),
            )
            .await?;

        // Add department_id column (nullable, for department-level assignments)
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .add_column(ColumnDef::new(DocumentAssignments::DepartmentId).uuid().null())
                    .add_foreign_key(
                        TableForeignKey::new()
                            .name("fk_document_assignments_department_id")
                            .from_tbl((Schema::HrPublic, DocumentAssignments::Table))
                            .from_col(DocumentAssignments::DepartmentId)
                            .to_tbl((Schema::HrPublic, Departments::Table))
                            .to_col(Departments::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Add access_level column (read/write/admin)
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .add_column(
                        ColumnDef::new(DocumentAssignments::AccessLevel)
                            .string()
                            .not_null()
                            .default("read")
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove access_level column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .drop_column(DocumentAssignments::AccessLevel)
                    .to_owned(),
            )
            .await?;

        // Remove department_id column and foreign key
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .drop_foreign_key(Alias::new("fk_document_assignments_department_id"))
                    .drop_column(DocumentAssignments::DepartmentId)
                    .to_owned(),
            )
            .await?;

        // Make user_id not null again
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .modify_column(ColumnDef::new(DocumentAssignments::UserId).uuid().not_null())
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
enum DocumentAssignments {
    Table,
    UserId,
    DepartmentId,
    AccessLevel,
}

#[derive(Iden)]
enum Departments {
    Table,
    Id,
}
