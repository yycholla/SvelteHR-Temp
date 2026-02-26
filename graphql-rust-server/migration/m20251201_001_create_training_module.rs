//! Migration: Create training module with content, assignments, and progress tracking
//!
//! This migration creates a comprehensive training/learning management system:
//! - Training courses with start/end dates and active status
//! - Training content (text, video, URL) with sequence ordering
//! - Training assignments to users with due dates
//! - Progress tracking per user per content item
//!
//! ## SeaORM Builder Usage: 100% Converted (10/10 operations)
//!
//! All schema operations use SeaORM builders.
//!
//! ### Operations (SeaORM Builders - 10 operations):
//!
//! **Up Migration:**
//! 1. CREATE TABLE trainings
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 8 columns: id, title, description, start_date, end_date, is_active, audit fields
//!    - IF NOT EXISTS for idempotency
//!
//! 2. CREATE TABLE training_contents
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 8 columns: id, training_id, title, type (TEXT/VIDEO/URL), data, sequence_order, audit fields
//!    - Foreign key to trainings with CASCADE delete
//!
//! 3. CREATE TABLE assignments
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 5 columns: id, user_id, training_id, assigned_at, due_date
//!    - 2 foreign keys (user_id, training_id) with CASCADE delete
//!
//! 4. CREATE INDEX idx_assignments_user_id
//!    - Using: `manager.create_index()` with Index::create() builder
//!    - Optimizes queries for user's assigned trainings
//!
//! 5. CREATE TABLE progress
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 6 columns: id, user_id, training_content_id, status, completed_at, last_accessed_at
//!    - 2 foreign keys (user_id, training_content_id) with CASCADE delete
//!
//! 6. CREATE UNIQUE INDEX idx_progress_user_content
//!    - Using: `manager.create_index()` with Index::create() builder
//!    - Composite unique index on (user_id, training_content_id)
//!    - Ensures one progress record per user per content item
//!
//! **Down Migration:**
//! 7. DROP TABLE progress
//!    - Using: `manager.drop_table()` with Table::drop() builder
//!    - Dropped first due to foreign key dependencies
//!
//! 8. DROP TABLE assignments
//!    - Using: `manager.drop_table()` with Table::drop() builder
//!
//! 9. DROP TABLE training_contents
//!    - Using: `manager.drop_table()` with Table::drop() builder
//!
//! 10. DROP TABLE trainings
//!     - Using: `manager.drop_table()` with Table::drop() builder
//!     - Dropped last (no dependencies on it after others removed)
//!
//! ### Migration Strategy
//!
//! This is a **feature module migration** that:
//! - Creates complete training/LMS system (4 tables, 6 foreign keys, 2 indexes)
//! - Supports multiple content types (text, video, URL)
//! - Tracks assignments to users with due dates
//! - Records granular progress per content item (not_started, in_progress, completed)
//! - Enforces referential integrity with CASCADE deletes
//!
//! **Training Workflow:**
//! 1. Create training course (trainings table)
//! 2. Add content items with sequence ordering (training_contents table)
//! 3. Assign training to users with due dates (assignments table)
//! 4. Users progress through content items (progress table tracks status per item)
//!
//! **Status Values:**
//! - Progress status: not_started, in_progress, completed
//! - Training is_active: true (available) or false (archived)
//!
//! **Foreign Key CASCADE Strategy:**
//! - Delete training → cascades to contents, assignments, progress
//! - Delete user → cascades to assignments, progress
//! - Delete content → cascades to progress records
//!
//! ## Migration Type: Feature Module (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for complex multi-table
//! schemas with foreign keys, unique constraints, and query optimization indexes.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create trainings table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Trainings::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Trainings::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Trainings::Title).string().not_null())
                    .col(ColumnDef::new(Trainings::Description).text())
                    .col(ColumnDef::new(Trainings::StartDate).timestamp_with_time_zone())
                    .col(ColumnDef::new(Trainings::EndDate).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(Trainings::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Trainings::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Trainings::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create training_contents table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, TrainingContents::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TrainingContents::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(TrainingContents::TrainingId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(TrainingContents::Title).string().not_null())
                    .col(ColumnDef::new(TrainingContents::Type).string().not_null()) // TEXT, VIDEO, URL
                    .col(ColumnDef::new(TrainingContents::Data).text().not_null())
                    .col(
                        ColumnDef::new(TrainingContents::SequenceOrder)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(TrainingContents::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TrainingContents::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_training_contents_training_id")
                            .from(
                                (Schema::HrPublic, TrainingContents::Table),
                                TrainingContents::TrainingId,
                            )
                            .to((Schema::HrPublic, Trainings::Table), Trainings::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create assignments table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Assignments::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Assignments::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Assignments::UserId).uuid().not_null())
                    .col(ColumnDef::new(Assignments::TrainingId).uuid().not_null())
                    .col(
                        ColumnDef::new(Assignments::AssignedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Assignments::DueDate).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assignments_user_id")
                            .from((Schema::HrPublic, Assignments::Table), Assignments::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assignments_training_id")
                            .from(
                                (Schema::HrPublic, Assignments::Table),
                                Assignments::TrainingId,
                            )
                            .to((Schema::HrPublic, Trainings::Table), Trainings::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Index for user assignments
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_assignments_user_id")
                    .table((Schema::HrPublic, Assignments::Table))
                    .col(Assignments::UserId)
                    .to_owned(),
            )
            .await?;

        // Create progress table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Progress::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Progress::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Progress::UserId).uuid().not_null())
                    .col(
                        ColumnDef::new(Progress::TrainingContentId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Progress::Status)
                            .string()
                            .not_null()
                            .default("not_started"), // not_started, in_progress, completed
                    )
                    .col(ColumnDef::new(Progress::CompletedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(Progress::LastAccessedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_progress_user_id")
                            .from((Schema::HrPublic, Progress::Table), Progress::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_progress_training_content_id")
                            .from(
                                (Schema::HrPublic, Progress::Table),
                                Progress::TrainingContentId,
                            )
                            .to(
                                (Schema::HrPublic, TrainingContents::Table),
                                TrainingContents::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint: One progress record per user per content
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_progress_user_content")
                    .table((Schema::HrPublic, Progress::Table))
                    .col(Progress::UserId)
                    .col(Progress::TrainingContentId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, Progress::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, Assignments::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, TrainingContents::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, Trainings::Table))
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
    Title,
    Description,
    StartDate,
    EndDate,
    IsActive,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum TrainingContents {
    Table,
    Id,
    TrainingId,
    Title,
    Type,
    Data,
    SequenceOrder,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Assignments {
    Table,
    Id,
    UserId,
    TrainingId,
    AssignedAt,
    DueDate,
}

#[derive(Iden)]
enum Progress {
    Table,
    Id,
    UserId,
    TrainingContentId,
    Status,
    CompletedAt,
    LastAccessedAt,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
