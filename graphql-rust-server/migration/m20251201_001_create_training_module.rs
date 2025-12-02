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
                    .col(ColumnDef::new(TrainingContents::TrainingId).uuid().not_null())
                    .col(ColumnDef::new(TrainingContents::Title).string().not_null())
                    .col(ColumnDef::new(TrainingContents::Type).string().not_null()) // TEXT, VIDEO, URL
                    .col(ColumnDef::new(TrainingContents::Data).text().not_null())
                    .col(ColumnDef::new(TrainingContents::SequenceOrder).integer().not_null().default(0))
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
                            .from((Schema::HrPublic, TrainingContents::Table), TrainingContents::TrainingId)
                            .to((Schema::HrPublic, Trainings::Table), Trainings::Id)
                            .on_delete(ForeignKeyAction::Cascade)
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
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_assignments_training_id")
                            .from((Schema::HrPublic, Assignments::Table), Assignments::TrainingId)
                            .to((Schema::HrPublic, Trainings::Table), Trainings::Id)
                            .on_delete(ForeignKeyAction::Cascade)
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
                    .col(ColumnDef::new(Progress::TrainingContentId).uuid().not_null())
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
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_progress_training_content_id")
                            .from((Schema::HrPublic, Progress::Table), Progress::TrainingContentId)
                            .to((Schema::HrPublic, TrainingContents::Table), TrainingContents::Id)
                            .on_delete(ForeignKeyAction::Cascade)
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
            .drop_table(Table::drop().table((Schema::HrPublic, Progress::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Assignments::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, TrainingContents::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, Trainings::Table)).to_owned())
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
