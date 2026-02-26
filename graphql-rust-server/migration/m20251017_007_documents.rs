//! Migration: Document management tables
//!
//! Creates tables for comprehensive document management with encryption support.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create document_categories table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, DocumentCategories::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DocumentCategories::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(DocumentCategories::Name).string().not_null())
                    .col(ColumnDef::new(DocumentCategories::Description).text())
                    .col(
                        ColumnDef::new(DocumentCategories::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(DocumentCategories::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(DocumentCategories::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Create documents table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Documents::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Documents::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Documents::Title).string().not_null())
                    .col(ColumnDef::new(Documents::Description).text())
                    .col(ColumnDef::new(Documents::CategoryId).uuid())
                    .col(ColumnDef::new(Documents::UploadedBy).uuid().not_null())
                    .col(ColumnDef::new(Documents::FilePath).string().not_null())
                    .col(ColumnDef::new(Documents::FileSize).big_integer().not_null())
                    .col(ColumnDef::new(Documents::MimeType).string().not_null())
                    .col(
                        ColumnDef::new(Documents::AccessLevel)
                            .string()
                            .not_null()
                            .default("public"),
                    )
                    .col(
                        ColumnDef::new(Documents::IsEncrypted)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Documents::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Documents::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Documents::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_documents_category_id")
                            .from((Schema::HrPublic, Documents::Table), Documents::CategoryId)
                            .to(
                                (Schema::HrPublic, DocumentCategories::Table),
                                DocumentCategories::Id,
                            )
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_documents_uploaded_by")
                            .from((Schema::HrPublic, Documents::Table), Documents::UploadedBy)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create document_versions table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, DocumentVersions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DocumentVersions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(DocumentVersions::DocumentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DocumentVersions::VersionNumber)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DocumentVersions::FilePath)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DocumentVersions::UploadedBy)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(DocumentVersions::ChangeLog).text())
                    .col(
                        ColumnDef::new(DocumentVersions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_versions_document_id")
                            .from(
                                (Schema::HrPublic, DocumentVersions::Table),
                                DocumentVersions::DocumentId,
                            )
                            .to((Schema::HrPublic, Documents::Table), Documents::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_versions_uploaded_by")
                            .from(
                                (Schema::HrPublic, DocumentVersions::Table),
                                DocumentVersions::UploadedBy,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create document_assignments table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DocumentAssignments::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(DocumentAssignments::DocumentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DocumentAssignments::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DocumentAssignments::AssignedBy)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(DocumentAssignments::DueDate).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(DocumentAssignments::CompletedAt).timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(DocumentAssignments::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(DocumentAssignments::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(DocumentAssignments::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_assignments_document_id")
                            .from(
                                (Schema::HrPublic, DocumentAssignments::Table),
                                DocumentAssignments::DocumentId,
                            )
                            .to((Schema::HrPublic, Documents::Table), Documents::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_assignments_user_id")
                            .from(
                                (Schema::HrPublic, DocumentAssignments::Table),
                                DocumentAssignments::UserId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_assignments_assigned_by")
                            .from(
                                (Schema::HrPublic, DocumentAssignments::Table),
                                DocumentAssignments::AssignedBy,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create document_access_logs table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, DocumentAccessLogs::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DocumentAccessLogs::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(DocumentAccessLogs::DocumentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(DocumentAccessLogs::UserId).uuid().not_null())
                    .col(
                        ColumnDef::new(DocumentAccessLogs::AccessType)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(DocumentAccessLogs::IpAddress).string())
                    .col(
                        ColumnDef::new(DocumentAccessLogs::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_access_logs_document_id")
                            .from(
                                (Schema::HrPublic, DocumentAccessLogs::Table),
                                DocumentAccessLogs::DocumentId,
                            )
                            .to((Schema::HrPublic, Documents::Table), Documents::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_access_logs_user_id")
                            .from(
                                (Schema::HrPublic, DocumentAccessLogs::Table),
                                DocumentAccessLogs::UserId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create encrypted_file_storage table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EncryptedFileStorage::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EncryptedFileStorage::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(EncryptedFileStorage::DocumentId)
                            .uuid()
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(EncryptedFileStorage::EncryptedData)
                            .binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(EncryptedFileStorage::EncryptionKeyId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(EncryptedFileStorage::Iv).binary().not_null())
                    .col(
                        ColumnDef::new(EncryptedFileStorage::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_encrypted_file_storage_document_id")
                            .from(
                                (Schema::HrPublic, EncryptedFileStorage::Table),
                                EncryptedFileStorage::DocumentId,
                            )
                            .to((Schema::HrPublic, Documents::Table), Documents::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EncryptedFileStorage::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, DocumentAccessLogs::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, DocumentAssignments::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, DocumentVersions::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, Documents::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, DocumentCategories::Table))
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
enum DocumentCategories {
    Table,
    Id,
    Name,
    Description,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum Documents {
    Table,
    Id,
    Title,
    Description,
    CategoryId,
    UploadedBy,
    FilePath,
    FileSize,
    MimeType,
    AccessLevel,
    IsEncrypted,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum DocumentVersions {
    Table,
    Id,
    DocumentId,
    VersionNumber,
    FilePath,
    UploadedBy,
    ChangeLog,
    CreatedAt,
}

#[derive(Iden)]
enum DocumentAssignments {
    Table,
    Id,
    DocumentId,
    UserId,
    AssignedBy,
    DueDate,
    CompletedAt,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum DocumentAccessLogs {
    Table,
    Id,
    DocumentId,
    UserId,
    AccessType,
    IpAddress,
    CreatedAt,
}

#[derive(Iden)]
enum EncryptedFileStorage {
    Table,
    Id,
    DocumentId,
    EncryptedData,
    EncryptionKeyId,
    Iv,
    CreatedAt,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
