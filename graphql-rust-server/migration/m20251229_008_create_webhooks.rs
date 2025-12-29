use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create webhook_subscriptions table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WebhookSubscriptions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::WebhookId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::RealmId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::EventTypes)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::EntityNames)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::VerifierToken)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::LastDeliveredAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::FailureCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(WebhookSubscriptions::DeletedAt).timestamp_with_time_zone().null())
                    .to_owned(),
            )
            .await?;

        // Create webhook_events table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WebhookEvents::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::SubscriptionId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::RealmId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::EventType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::EntityName)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::EntityId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Payload)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Status)
                            .string_len(50)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ProcessedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ProcessingAttempts)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::LastError)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ReceivedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_webhook_events_subscription")
                    .from((Schema::HrPublic, WebhookEvents::Table), WebhookEvents::SubscriptionId)
                    .to((Schema::HrPublic, WebhookSubscriptions::Table), WebhookSubscriptions::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Add indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_subscriptions_realm_id")
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
                    .col(WebhookSubscriptions::RealmId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_subscriptions_webhook_id")
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
                    .col(WebhookSubscriptions::WebhookId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_subscription_id")
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .col(WebhookEvents::SubscriptionId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_status")
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .col(WebhookEvents::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_webhook_events_entity")
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .col(WebhookEvents::EntityName)
                    .col(WebhookEvents::EntityId)
                    .to_owned(),
            )
            .await?;

        // Add check constraints
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.webhook_events
                ADD CONSTRAINT check_webhook_event_status
                CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying'));

                ALTER TABLE hr_public.webhook_events
                ADD CONSTRAINT check_webhook_event_type
                CHECK (event_type IN ('create', 'update', 'delete', 'merge', 'void'));
                "#
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Schema {
    HrPublic,
}

#[derive(DeriveIden)]
enum WebhookSubscriptions {
    Table,
    Id,
    WebhookId,
    RealmId,
    EventTypes,
    EntityNames,
    VerifierToken,
    IsActive,
    LastDeliveredAt,
    FailureCount,
    Metadata,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(DeriveIden)]
enum WebhookEvents {
    Table,
    Id,
    SubscriptionId,
    RealmId,
    EventType,
    EntityName,
    EntityId,
    Payload,
    Status,
    ProcessedAt,
    ProcessingAttempts,
    LastError,
    Metadata,
    ReceivedAt,
    CreatedAt,
}
