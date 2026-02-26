//! Migration: Performance review tables

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // review_cycles
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, ReviewCycles::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReviewCycles::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(ReviewCycles::Name).string().not_null())
                    .col(
                        ColumnDef::new(ReviewCycles::StartDate)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ReviewCycles::EndDate)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ReviewCycles::Status)
                            .string()
                            .not_null()
                            .default("draft"),
                    )
                    .col(
                        ColumnDef::new(ReviewCycles::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ReviewCycles::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(ReviewCycles::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // review_templates
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, ReviewTemplates::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReviewTemplates::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(ReviewTemplates::Name).string().not_null())
                    .col(ColumnDef::new(ReviewTemplates::Description).text())
                    .col(ColumnDef::new(ReviewTemplates::Questions).json().not_null())
                    .col(
                        ColumnDef::new(ReviewTemplates::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(ReviewTemplates::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ReviewTemplates::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(ReviewTemplates::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // performance_reviews
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, PerformanceReviews::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(PerformanceReviews::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(PerformanceReviews::EmployeeId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(PerformanceReviews::ReviewerId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(PerformanceReviews::CycleId).uuid())
                    .col(ColumnDef::new(PerformanceReviews::TemplateId).uuid())
                    .col(
                        ColumnDef::new(PerformanceReviews::Status)
                            .string()
                            .not_null()
                            .default("draft"),
                    )
                    .col(ColumnDef::new(PerformanceReviews::OverallRating).integer())
                    .col(ColumnDef::new(PerformanceReviews::SubmittedAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(PerformanceReviews::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(PerformanceReviews::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(PerformanceReviews::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_performance_reviews_employee_id")
                            .from(
                                (S::HrPublic, PerformanceReviews::Table),
                                PerformanceReviews::EmployeeId,
                            )
                            .to((S::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_performance_reviews_reviewer_id")
                            .from(
                                (S::HrPublic, PerformanceReviews::Table),
                                PerformanceReviews::ReviewerId,
                            )
                            .to((S::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_performance_reviews_cycle_id")
                            .from(
                                (S::HrPublic, PerformanceReviews::Table),
                                PerformanceReviews::CycleId,
                            )
                            .to((S::HrPublic, ReviewCycles::Table), ReviewCycles::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_performance_reviews_template_id")
                            .from(
                                (S::HrPublic, PerformanceReviews::Table),
                                PerformanceReviews::TemplateId,
                            )
                            .to((S::HrPublic, ReviewTemplates::Table), ReviewTemplates::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // review_goals
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, ReviewGoals::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReviewGoals::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(ReviewGoals::ReviewId).uuid().not_null())
                    .col(ColumnDef::new(ReviewGoals::Goal).text().not_null())
                    .col(ColumnDef::new(ReviewGoals::TargetDate).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(ReviewGoals::Status)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(ReviewGoals::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ReviewGoals::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(ReviewGoals::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_review_goals_review_id")
                            .from((S::HrPublic, ReviewGoals::Table), ReviewGoals::ReviewId)
                            .to(
                                (S::HrPublic, PerformanceReviews::Table),
                                PerformanceReviews::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // review_feedback
        manager
            .create_table(
                Table::create()
                    .table((S::HrPublic, ReviewFeedback::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReviewFeedback::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(ReviewFeedback::ReviewId).uuid().not_null())
                    .col(
                        ColumnDef::new(ReviewFeedback::QuestionId)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ReviewFeedback::Answer).text())
                    .col(ColumnDef::new(ReviewFeedback::Rating).integer())
                    .col(
                        ColumnDef::new(ReviewFeedback::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ReviewFeedback::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(ReviewFeedback::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_review_feedback_review_id")
                            .from(
                                (S::HrPublic, ReviewFeedback::Table),
                                ReviewFeedback::ReviewId,
                            )
                            .to(
                                (S::HrPublic, PerformanceReviews::Table),
                                PerformanceReviews::Id,
                            )
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
                    .table((S::HrPublic, ReviewFeedback::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((S::HrPublic, ReviewGoals::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((S::HrPublic, PerformanceReviews::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((S::HrPublic, ReviewTemplates::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((S::HrPublic, ReviewCycles::Table))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum S {
    HrPublic,
}
#[derive(Iden)]
enum ReviewCycles {
    Table,
    Id,
    Name,
    StartDate,
    EndDate,
    Status,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum ReviewTemplates {
    Table,
    Id,
    Name,
    Description,
    Questions,
    IsActive,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum PerformanceReviews {
    Table,
    Id,
    EmployeeId,
    ReviewerId,
    CycleId,
    TemplateId,
    Status,
    OverallRating,
    SubmittedAt,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum ReviewGoals {
    Table,
    Id,
    ReviewId,
    Goal,
    TargetDate,
    Status,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum ReviewFeedback {
    Table,
    Id,
    ReviewId,
    QuestionId,
    Answer,
    Rating,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}
#[derive(Iden)]
enum Users {
    Table,
    Id,
}
