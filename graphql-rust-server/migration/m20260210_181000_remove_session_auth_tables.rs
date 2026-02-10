//! Migration: Remove session-based authentication tables
//!
//! Drops tables that are no longer needed after migration to JWT authentication:
//! - user_sessions
//! - sessions
//!
//! These tables were used for session-based authentication which has been
//! replaced with JWT token-based authentication.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop user_sessions first (has FK to sessions)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, UserSessions::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop sessions table
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, Sessions::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Recreate sessions table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Sessions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Sessions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(Sessions::SessionToken).string().not_null().unique_key())
                    .col(ColumnDef::new(Sessions::ExpiresAt).timestamp_with_time_zone().not_null())
                    .col(
                        ColumnDef::new(Sessions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Recreate user_sessions table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, UserSessions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserSessions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(UserSessions::UserId).uuid().not_null())
                    .col(ColumnDef::new(UserSessions::SessionId).uuid().not_null())
                    .col(
                        ColumnDef::new(UserSessions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(UserSessions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_sessions_user_id")
                            .from((Schema::HrPublic, UserSessions::Table), UserSessions::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_sessions_session_id")
                            .from((Schema::HrPublic, UserSessions::Table), UserSessions::SessionId)
                            .to((Schema::HrPublic, Sessions::Table), Sessions::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

// Schema enum
#[derive(Iden)]
enum Schema {
    HrPublic,
}

// Table enums
#[derive(Iden)]
enum Sessions {
    Table,
    Id,
    SessionToken,
    ExpiresAt,
    CreatedAt,
}

#[derive(Iden)]
enum UserSessions {
    Table,
    Id,
    UserId,
    SessionId,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
