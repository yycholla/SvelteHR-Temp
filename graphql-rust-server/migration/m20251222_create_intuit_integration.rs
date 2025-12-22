use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create intuit_connections table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, IntuitConnections::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(IntuitConnections::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(ColumnDef::new(IntuitConnections::RealmId).string().not_null())
                    .col(ColumnDef::new(IntuitConnections::AccessToken).text().not_null())
                    .col(ColumnDef::new(IntuitConnections::RefreshToken).text().not_null())
                    .col(
                        ColumnDef::new(IntuitConnections::TokenExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(ColumnDef::new(IntuitConnections::CompanyName).string())
                    .col(
                        ColumnDef::new(IntuitConnections::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(IntuitConnections::LastSyncAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(IntuitConnections::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(IntuitConnections::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(ColumnDef::new(IntuitConnections::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Add intuit_employee_id to users table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(ColumnDef::new(Users::IntuitEmployeeId).string())
                    .to_owned(),
            )
            .await?;

        // Create index on intuit_employee_id
        manager
            .create_index(
                Index::create()
                    .name("idx_users_intuit_employee_id")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::IntuitEmployeeId)
                    .to_owned(),
            )
            .await?;

        // Create intuit_sync_log table for debugging
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(IntuitSyncLog::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(ColumnDef::new(IntuitSyncLog::UserId).uuid())
                    .col(ColumnDef::new(IntuitSyncLog::SyncType).string().not_null())
                    .col(ColumnDef::new(IntuitSyncLog::Direction).string().not_null())
                    .col(ColumnDef::new(IntuitSyncLog::Status).string().not_null())
                    .col(ColumnDef::new(IntuitSyncLog::ErrorMessage).text())
                    .col(ColumnDef::new(IntuitSyncLog::Payload).json_binary())
                    .col(
                        ColumnDef::new(IntuitSyncLog::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .from((Schema::HrPublic, IntuitSyncLog::Table), IntuitSyncLog::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on sync log for querying
        manager
            .create_index(
                Index::create()
                    .name("idx_intuit_sync_log_user_id")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .col(IntuitSyncLog::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_intuit_sync_log_created_at")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .col(IntuitSyncLog::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, IntuitSyncLog::Table)).to_owned())
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_intuit_employee_id")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::IntuitEmployeeId)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, IntuitConnections::Table)).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum IntuitConnections {
    Table,
    Id,
    RealmId,
    AccessToken,
    RefreshToken,
    TokenExpiresAt,
    CompanyName,
    IsActive,
    LastSyncAt,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    IntuitEmployeeId,
}

#[derive(DeriveIden)]
enum IntuitSyncLog {
    Table,
    Id,
    UserId,
    SyncType,
    Direction,
    Status,
    ErrorMessage,
    Payload,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}
