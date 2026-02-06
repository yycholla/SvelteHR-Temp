//! Migration: Create media_assets table
//!
//! Creates a table for storing media asset metadata (images, documents, etc.)
//! Used by the media library feature for asset management.
//!
//! Table: hr_public.media_assets
//! Columns:
//!   - id: UUID primary key (auto-generated)
//!   - filename: Original filename
//!   - storage_path: Path to stored file
//!   - mime_type: File MIME type
//!   - size_bytes: File size in bytes
//!   - uploaded_by: FK to users (nullable, SET NULL on delete)
//!   - created_at: Creation timestamp
//!   - updated_at: Last update timestamp

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, MediaAssets::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(MediaAssets::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(MediaAssets::Filename)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MediaAssets::StoragePath)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MediaAssets::MimeType)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MediaAssets::SizeBytes)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MediaAssets::UploadedBy)
                            .uuid()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(MediaAssets::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()"),
                    )
                    .col(
                        ColumnDef::new(MediaAssets::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_media_assets_uploaded_by")
                            .from((Schema::HrPublic, MediaAssets::Table), MediaAssets::UploadedBy)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, MediaAssets::Table))
                    .if_exists()
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
enum MediaAssets {
    Table,
    Id,
    Filename,
    StoragePath,
    MimeType,
    SizeBytes,
    UploadedBy,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}