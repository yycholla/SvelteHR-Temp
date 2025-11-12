use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // pgcrypto extension already created in m20251017_001_schemas

        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(NotificationChannels::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::ChannelType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::ConfigJson)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for common query patterns
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_enabled")
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .col(NotificationChannels::Enabled)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_type")
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .col(NotificationChannels::ChannelType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_enabled_type")
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .col(NotificationChannels::Enabled)
                    .col(NotificationChannels::ChannelType)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, NotificationChannels::Table))
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
enum NotificationChannels {
    Table,
    Id,
    ChannelType,
    Enabled,
    ConfigJson,
    CreatedAt,
    UpdatedAt,
}
