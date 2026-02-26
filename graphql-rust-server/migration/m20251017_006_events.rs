//! Migration: Events and calendar tables
//!
//! Creates tables for:
//! - events (with recurring event support via RRULE)
//! - event_attendees (RSVP tracking)
//! - event_waitlist (capacity management)
//! - event_comments
//! - event_history

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create events table with recurring event support
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Events::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Events::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Events::Title).string().not_null())
                    .col(ColumnDef::new(Events::Description).text())
                    .col(
                        ColumnDef::new(Events::EventType)
                            .string()
                            .not_null()
                            .default("other"),
                    )
                    .col(ColumnDef::new(Events::Location).string())
                    .col(
                        ColumnDef::new(Events::StartTime)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Events::EndTime)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Events::AllDay)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Events::Status)
                            .string()
                            .not_null()
                            .default("draft"),
                    )
                    .col(
                        ColumnDef::new(Events::IsPublic)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(Events::Color).string())
                    .col(ColumnDef::new(Events::OrganizerId).uuid().not_null())
                    .col(ColumnDef::new(Events::Rrule).text()) // RRULE format (RFC 5545)
                    .col(ColumnDef::new(Events::RecurrenceId).uuid()) // Parent event ID for recurring series
                    .col(ColumnDef::new(Events::RecurrenceEndDate).timestamp_with_time_zone()) // 5-year limit
                    .col(ColumnDef::new(Events::MaxCapacity).integer())
                    .col(ColumnDef::new(Events::ImageUrl).string())
                    .col(ColumnDef::new(Events::ImageAspectRatio).string()) // "16:9" or "9:16"
                    .col(
                        ColumnDef::new(Events::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Events::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(Events::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_events_organizer_id")
                            .from((Schema::HrPublic, Events::Table), Events::OrganizerId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_events_recurrence_id")
                            .from((Schema::HrPublic, Events::Table), Events::RecurrenceId)
                            .to((Schema::HrPublic, Events::Table), Events::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for events
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_events_start_time")
                    .table((Schema::HrPublic, Events::Table))
                    .col(Events::StartTime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_events_status")
                    .table((Schema::HrPublic, Events::Table))
                    .col(Events::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_events_organizer_id")
                    .table((Schema::HrPublic, Events::Table))
                    .col(Events::OrganizerId)
                    .to_owned(),
            )
            .await?;

        // Create event_attendees table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EventAttendees::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EventAttendees::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(EventAttendees::EventId).uuid().not_null())
                    .col(ColumnDef::new(EventAttendees::EmployeeId).uuid().not_null())
                    .col(
                        ColumnDef::new(EventAttendees::ResponseStatus)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(EventAttendees::IsRequired)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(EventAttendees::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(EventAttendees::ReminderTime).integer())
                    .col(ColumnDef::new(EventAttendees::Scope).string()) // "this_event" or "all_events"
                    .col(
                        ColumnDef::new(EventAttendees::IsOrganizer)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_attendees_event_id")
                            .from(
                                (Schema::HrPublic, EventAttendees::Table),
                                EventAttendees::EventId,
                            )
                            .to((Schema::HrPublic, Events::Table), Events::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_attendees_employee_id")
                            .from(
                                (Schema::HrPublic, EventAttendees::Table),
                                EventAttendees::EmployeeId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint on (event_id, employee_id)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_event_attendees_event_employee")
                    .table((Schema::HrPublic, EventAttendees::Table))
                    .col(EventAttendees::EventId)
                    .col(EventAttendees::EmployeeId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create event_waitlist table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EventWaitlist::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EventWaitlist::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(EventWaitlist::EventId).uuid().not_null())
                    .col(ColumnDef::new(EventWaitlist::UserId).uuid().not_null())
                    .col(ColumnDef::new(EventWaitlist::Position).integer().not_null())
                    .col(
                        ColumnDef::new(EventWaitlist::Promoted)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(EventWaitlist::PromotedAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(EventWaitlist::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_waitlist_event_id")
                            .from(
                                (Schema::HrPublic, EventWaitlist::Table),
                                EventWaitlist::EventId,
                            )
                            .to((Schema::HrPublic, Events::Table), Events::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_waitlist_user_id")
                            .from(
                                (Schema::HrPublic, EventWaitlist::Table),
                                EventWaitlist::UserId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Unique constraint on (event_id, user_id)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_event_waitlist_event_user")
                    .table((Schema::HrPublic, EventWaitlist::Table))
                    .col(EventWaitlist::EventId)
                    .col(EventWaitlist::UserId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create event_comments table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EventComments::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EventComments::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(EventComments::EventId).uuid().not_null())
                    .col(ColumnDef::new(EventComments::UserId).uuid().not_null())
                    .col(ColumnDef::new(EventComments::Comment).text().not_null())
                    .col(
                        ColumnDef::new(EventComments::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(EventComments::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(EventComments::DeletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_comments_event_id")
                            .from(
                                (Schema::HrPublic, EventComments::Table),
                                EventComments::EventId,
                            )
                            .to((Schema::HrPublic, Events::Table), Events::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_comments_user_id")
                            .from(
                                (Schema::HrPublic, EventComments::Table),
                                EventComments::UserId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create event_history table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EventHistory::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EventHistory::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(EventHistory::EventId).uuid().not_null())
                    .col(ColumnDef::new(EventHistory::UserId).uuid().not_null())
                    .col(ColumnDef::new(EventHistory::Action).string().not_null())
                    .col(ColumnDef::new(EventHistory::Changes).json())
                    .col(
                        ColumnDef::new(EventHistory::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_history_event_id")
                            .from(
                                (Schema::HrPublic, EventHistory::Table),
                                EventHistory::EventId,
                            )
                            .to((Schema::HrPublic, Events::Table), Events::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_event_history_user_id")
                            .from(
                                (Schema::HrPublic, EventHistory::Table),
                                EventHistory::UserId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
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
                    .table((Schema::HrPublic, EventHistory::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EventComments::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EventWaitlist::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EventAttendees::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, Events::Table))
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
enum Events {
    Table,
    Id,
    Title,
    Description,
    EventType,
    Location,
    StartTime,
    EndTime,
    AllDay,
    Status,
    IsPublic,
    Color,
    OrganizerId,
    Rrule,
    RecurrenceId,
    RecurrenceEndDate,
    MaxCapacity,
    ImageUrl,
    ImageAspectRatio,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum EventAttendees {
    Table,
    Id,
    EventId,
    EmployeeId,
    ResponseStatus,
    IsRequired,
    CreatedAt,
    ReminderTime,
    Scope,
    IsOrganizer,
}

#[derive(Iden)]
enum EventWaitlist {
    Table,
    Id,
    EventId,
    UserId,
    Position,
    Promoted,
    PromotedAt,
    CreatedAt,
}

#[derive(Iden)]
enum EventComments {
    Table,
    Id,
    EventId,
    UserId,
    Comment,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum EventHistory {
    Table,
    Id,
    EventId,
    UserId,
    Action,
    Changes,
    CreatedAt,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
